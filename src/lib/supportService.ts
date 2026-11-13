import { supabase, isSupabaseConfigured } from './supabase';
import { deliveryService } from './deliveryService';

export type SupportCategory = string;

export const SUPPORT_CATEGORIES: string[] = [
  'Question sur un produit',
  'Question sur une commande',
  'Problème de paiement',
  "Problème d'accès à un produit",
  'Question sur un abonnement',
  'Autre demande'
];

export type TicketStatus = 'new' | 'in_progress' | 'answered' | 'closed';

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId?: string;
  senderRole: 'visitor' | 'member' | 'admin';
  senderName: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId?: string | null;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  category: SupportCategory;
  subject: string;
  orderId?: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  lastReplyAt?: string;
  lastReplyBy?: 'visitor' | 'member' | 'admin';
  messages?: SupportMessage[];
}

export interface CommunicationSettings {
  whatsappNumber: string;
  whatsappEnabled: boolean;
  supportEmail: string;
  workingHours?: string;
  categories: string[];
}

const LOCAL_TICKETS_KEY = 'sandrino_support_tickets';
const LOCAL_MESSAGES_KEY = 'sandrino_support_messages';
const LOCAL_COMM_SETTINGS_KEY = 'sandrino_communication_settings';

// Default official contact settings
// Initialized with the owner's official number (+22892395727) and email (petitsandrino1@gmail.com)
export const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettings = {
  whatsappNumber: '+22892395727',
  whatsappEnabled: true,
  supportEmail: 'petitsandrino1@gmail.com',
  workingHours: 'Lundi au Samedi : 08h00 - 19h00 (GMT)',
  categories: SUPPORT_CATEGORIES
};

function generateTicketNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `TK-${year}-${rand}`;
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const supportService = {
  // 1. GET COMMUNICATION SETTINGS (WhatsApp & Support Email)
  async getSettings(): Promise<CommunicationSettings> {
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('payment_settings')
          .select('settings')
          .eq('id', 'communication')
          .maybeSingle();

        if (data?.settings) {
          return {
            ...DEFAULT_COMMUNICATION_SETTINGS,
            ...data.settings
          };
        }
      } catch (e) {
        // Fallback to local
      }
    }

    try {
      const stored = localStorage.getItem(LOCAL_COMM_SETTINGS_KEY);
      if (stored) {
        return {
          ...DEFAULT_COMMUNICATION_SETTINGS,
          ...JSON.parse(stored)
        };
      }
    } catch (e) {}

    return DEFAULT_COMMUNICATION_SETTINGS;
  },

  // 2. UPDATE COMMUNICATION SETTINGS (Admin Only)
  async updateSettings(settings: Partial<CommunicationSettings>, adminUser?: { id: string; email: string }): Promise<CommunicationSettings> {
    const current = await this.getSettings();
    const updated: CommunicationSettings = {
      ...current,
      ...settings
    };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('payment_settings')
          .upsert({
            id: 'communication',
            settings: updated,
            updated_at: new Date().toISOString(),
            updated_by: adminUser?.email || 'admin'
          });
      } catch (e) {
        console.warn('Notice saving communication settings to Supabase:', e);
      }
    }

    try {
      localStorage.setItem(LOCAL_COMM_SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {}

    return updated;
  },

  // 3. CREATE A TICKET (From Public Contact Page or Member Space)
  async createTicket(params: {
    senderName: string;
    senderEmail: string;
    senderPhone?: string;
    category: SupportCategory;
    subject: string;
    message: string;
    orderId?: string;
    userId?: string | null;
  }): Promise<{ ticket: SupportTicket; message: SupportMessage }> {
    const now = new Date().toISOString();
    const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ticketNumber = generateTicketNumber();

    const role: 'member' | 'visitor' = params.userId ? 'member' : 'visitor';

    const newTicket: SupportTicket = {
      id: ticketId,
      ticketNumber,
      userId: params.userId || null,
      senderName: params.senderName.trim(),
      senderEmail: params.senderEmail.trim().toLowerCase(),
      senderPhone: params.senderPhone?.trim() || undefined,
      category: params.category,
      subject: params.subject.trim(),
      orderId: params.orderId?.trim() || undefined,
      status: 'new',
      createdAt: now,
      updatedAt: now,
      lastReplyAt: now,
      lastReplyBy: role
    };

    const firstMessage: SupportMessage = {
      id: messageId,
      ticketId,
      senderId: params.userId || undefined,
      senderRole: role,
      senderName: params.senderName.trim(),
      message: params.message.trim(),
      createdAt: now
    };

    // A. Attempt database insert in Supabase
    if (isSupabaseConfigured) {
      try {
        const canUseUserUuid = isValidUuid(params.userId);
        const { data: dbTicket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert([{
            ticket_number: ticketNumber,
            user_id: canUseUserUuid ? params.userId : null,
            sender_name: newTicket.senderName,
            sender_email: newTicket.senderEmail,
            sender_phone: newTicket.senderPhone || null,
            category: newTicket.category,
            subject: newTicket.subject,
            order_id: newTicket.orderId || null,
            status: 'new',
            created_at: now,
            updated_at: now
          }])
          .select()
          .single();

        if (!ticketError && dbTicket) {
          newTicket.id = dbTicket.id;
          firstMessage.ticketId = dbTicket.id;

          await supabase
            .from('support_messages')
            .insert([{
              ticket_id: dbTicket.id,
              sender_id: canUseUserUuid ? params.userId : null,
              sender_role: role,
              sender_name: firstMessage.senderName,
              message: firstMessage.message,
              created_at: now
            }]);
        }
      } catch (err) {
        console.warn('Notice inserting support ticket in Supabase:', err);
      }
    }

    // B. Save in localStorage fallback
    try {
      const storedTickets = localStorage.getItem(LOCAL_TICKETS_KEY);
      const tickets: SupportTicket[] = storedTickets ? JSON.parse(storedTickets) : [];
      tickets.unshift(newTicket);
      localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(tickets));

      const storedMessages = localStorage.getItem(LOCAL_MESSAGES_KEY);
      const messages: SupportMessage[] = storedMessages ? JSON.parse(storedMessages) : [];
      messages.push(firstMessage);
      localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
    } catch (e) {}

    return { ticket: newTicket, message: firstMessage };
  },

  // 4. GET TICKETS FOR A SPECIFIC MEMBER (RLS Enforced: only member's tickets)
  async getMemberTickets(userId: string, userEmail?: string): Promise<SupportTicket[]> {
    if (!userId) return [];
    let list: SupportTicket[] = [];

    if (isSupabaseConfigured && isValidUuid(userId)) {
      try {
        const { data: dbTickets, error } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (!error && dbTickets) {
          list = dbTickets.map((t: any) => ({
            id: t.id,
            ticketNumber: t.ticket_number,
            userId: t.user_id,
            senderName: t.sender_name,
            senderEmail: t.sender_email,
            senderPhone: t.sender_phone,
            category: t.category,
            subject: t.subject,
            orderId: t.order_id,
            status: t.status,
            createdAt: t.created_at,
            updatedAt: t.updated_at
          }));
        }
      } catch (e) {
        console.warn('Notice fetching member tickets from Supabase:', e);
      }
    }

    // Fallback/merge with local storage
    try {
      const stored = localStorage.getItem(LOCAL_TICKETS_KEY);
      if (stored) {
        const localList: SupportTicket[] = JSON.parse(stored);
        const filteredLocal = localList.filter(
          t => t.userId === userId || (userEmail && t.senderEmail.toLowerCase() === userEmail.toLowerCase())
        );

        for (const loc of filteredLocal) {
          if (!list.some(t => t.ticketNumber === loc.ticketNumber || t.id === loc.id)) {
            list.push(loc);
          }
        }
      }
    } catch (e) {}

    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  // 5. GET ALL TICKETS FOR ADMIN
  async getAllTickets(): Promise<SupportTicket[]> {
    let list: SupportTicket[] = [];

    if (isSupabaseConfigured) {
      try {
        const { data: dbTickets, error } = await supabase
          .from('support_tickets')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!error && dbTickets) {
          list = dbTickets.map((t: any) => ({
            id: t.id,
            ticketNumber: t.ticket_number,
            userId: t.user_id,
            senderName: t.sender_name,
            senderEmail: t.sender_email,
            senderPhone: t.sender_phone,
            category: t.category,
            subject: t.subject,
            orderId: t.order_id,
            status: t.status,
            createdAt: t.created_at,
            updatedAt: t.updated_at
          }));
        }
      } catch (e) {
        console.warn('Notice fetching all tickets for admin from Supabase:', e);
      }
    }

    // Merge with local storage
    try {
      const stored = localStorage.getItem(LOCAL_TICKETS_KEY);
      if (stored) {
        const localList: SupportTicket[] = JSON.parse(stored);
        for (const loc of localList) {
          if (!list.some(t => t.ticketNumber === loc.ticketNumber || t.id === loc.id)) {
            list.push(loc);
          }
        }
      }
    } catch (e) {}

    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  // 6. GET CONVERSATION MESSAGES FOR A TICKET
  async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    if (!ticketId) return [];
    let list: SupportMessage[] = [];

    if (isSupabaseConfigured && isValidUuid(ticketId)) {
      try {
        const { data: dbMsgs, error } = await supabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (!error && dbMsgs) {
          list = dbMsgs.map((m: any) => ({
            id: m.id,
            ticketId: m.ticket_id,
            senderId: m.sender_id,
            senderRole: m.sender_role,
            senderName: m.sender_name,
            message: m.message,
            createdAt: m.created_at
          }));
        }
      } catch (e) {
        console.warn('Notice fetching ticket messages from Supabase:', e);
      }
    }

    // Merge with local storage
    try {
      const stored = localStorage.getItem(LOCAL_MESSAGES_KEY);
      if (stored) {
        const localList: SupportMessage[] = JSON.parse(stored);
        const filtered = localList.filter(m => m.ticketId === ticketId);
        for (const loc of filtered) {
          if (!list.some(m => m.id === loc.id)) {
            list.push(loc);
          }
        }
      }
    } catch (e) {}

    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  // 7. SEND A REPLY (MEMBER OR ADMIN)
  async replyToTicket(params: {
    ticketId: string;
    ticketNumber: string;
    senderRole: 'visitor' | 'member' | 'admin';
    senderName: string;
    senderId?: string;
    message: string;
    targetUserId?: string | null;
    ticketSubject?: string;
  }): Promise<SupportMessage> {
    const now = new Date().toISOString();
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newMsg: SupportMessage = {
      id: messageId,
      ticketId: params.ticketId,
      senderId: params.senderId,
      senderRole: params.senderRole,
      senderName: params.senderName,
      message: params.message.trim(),
      createdAt: now
    };

    const nextStatus: TicketStatus = params.senderRole === 'admin' ? 'answered' : 'in_progress';

    // A. Update ticket & insert message in Supabase
    if (isSupabaseConfigured) {
      try {
        if (isValidUuid(params.ticketId)) {
          await supabase
            .from('support_messages')
            .insert([{
              ticket_id: params.ticketId,
              sender_id: isValidUuid(params.senderId) ? params.senderId : null,
              sender_role: params.senderRole,
              sender_name: params.senderName,
              message: params.message.trim(),
              created_at: now
            }]);

          await supabase
            .from('support_tickets')
            .update({
              status: nextStatus,
              updated_at: now
            })
            .eq('id', params.ticketId);
        }
      } catch (e) {
        console.warn('Notice saving support reply in Supabase:', e);
      }
    }

    // B. Save in local storage
    try {
      const storedMessages = localStorage.getItem(LOCAL_MESSAGES_KEY);
      const messages: SupportMessage[] = storedMessages ? JSON.parse(storedMessages) : [];
      messages.push(newMsg);
      localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));

      const storedTickets = localStorage.getItem(LOCAL_TICKETS_KEY);
      if (storedTickets) {
        const tickets: SupportTicket[] = JSON.parse(storedTickets);
        const index = tickets.findIndex(t => t.id === params.ticketId || t.ticketNumber === params.ticketNumber);
        if (index !== -1) {
          tickets[index].status = nextStatus;
          tickets[index].updatedAt = now;
          tickets[index].lastReplyAt = now;
          tickets[index].lastReplyBy = params.senderRole;
          localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(tickets));
        }
      }
    } catch (e) {}

    // C. INTERNAL NOTIFICATION FOR MEMBER (When Admin Replies)
    if (params.senderRole === 'admin' && params.targetUserId) {
      await deliveryService.createNotification({
        userId: params.targetUserId,
        orderId: params.ticketNumber,
        type: 'support',
        title: "Nouvelle réponse de l'administration",
        message: `L'administration SANDRINO a répondu à votre demande ${params.ticketNumber} (${params.ticketSubject || 'Assistance'}). Consultez la rubrique Assistance de votre espace personnel.`,
        createdAt: now
      });
    }

    return newMsg;
  },

  // 8. UPDATE TICKET STATUS (Admin)
  async updateTicketStatus(ticketId: string, status: TicketStatus, adminUser?: { id: string; email: string }): Promise<void> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured && isValidUuid(ticketId)) {
      try {
        await supabase
          .from('support_tickets')
          .update({
            status,
            updated_at: now
          })
          .eq('id', ticketId);
      } catch (e) {
        console.warn('Notice updating ticket status in Supabase:', e);
      }
    }

    try {
      const stored = localStorage.getItem(LOCAL_TICKETS_KEY);
      if (stored) {
        const list: SupportTicket[] = JSON.parse(stored);
        const idx = list.findIndex(t => t.id === ticketId);
        if (idx !== -1) {
          list[idx].status = status;
          list[idx].updatedAt = now;
          localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(list));
        }
      }
    } catch (e) {}
  }
};
