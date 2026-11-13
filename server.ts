import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PRODUCTS } from './src/data/products.ts';
import { SUBSCRIPTION_PLANS } from './src/data/subscriptions.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const OWNER_EMAIL = process.env.ADMIN_CONTACT_EMAIL || 'petitsandrino1@gmail.com';
const SUPPORT_WHATSAPP = '+228 92 39 57 27';

const DATA_DIR = path.resolve(__dirname, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog-products.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscription-plans.json');
const COVERS_DIR = path.resolve(__dirname, 'uploads', 'covers');
const PRIVATE_PRODUCTS_DIR = path.resolve(__dirname, 'uploads', 'private-products');
const TMP_UPLOADS_DIR = path.resolve(__dirname, 'uploads', 'tmp');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(COVERS_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_PRODUCTS_DIR, { recursive: true });
fs.mkdirSync(TMP_UPLOADS_DIR, { recursive: true });

function parseBase64Payload(input: unknown): Buffer {
  if (typeof input !== 'string' || !input.trim()) {
    return Buffer.alloc(0);
  }
  const commaIdx = input.indexOf(',');
  const clean = commaIdx !== -1 ? input.slice(commaIdx + 1) : input;
  return Buffer.from(clean.trim(), 'base64');
}

function resolveAllowedProductExt(safeName: string, mimeType: string): string | null {
  const allowedExt = new Set([
    '.pdf', '.epub', '.mobi', '.zip', '.rar', '.7z',
    '.mp4', '.mov', '.webm', '.mp3', '.wav', '.m4a',
    '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
    '.txt', '.csv', '.png', '.jpg', '.jpeg', '.webp'
  ]);
  const ext = path.extname(safeName).toLowerCase();
  if (allowedExt.has(ext)) return ext;

  const mimeMap: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/epub+zip': '.epub',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip',
    'application/x-rar-compressed': '.rar',
    'application/x-7z-compressed': '.7z',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/mp4': '.m4a',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-powerpoint': '.ppt',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
  };
  return mimeMap[mimeType.split(';')[0].trim().toLowerCase()] || null;
}

function sanitizeUploadName(name: string): string {
  return String(name || 'fichier')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

function readServerCatalog() {
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      const raw = fs.readFileSync(CATALOG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading server catalog:', err);
  }
  return PRODUCTS;
}

function writeServerCatalog(products: unknown[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(products, null, 2), 'utf-8');
}

function readServerPlansData(): { plans: unknown[]; updatedAt: string | null } {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { plans: parsed, updatedAt: null };
      }
      if (parsed && Array.isArray(parsed.plans) && parsed.plans.length > 0) {
        return {
          plans: parsed.plans,
          updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading server subscription plans:', err);
  }
  return { plans: SUBSCRIPTION_PLANS, updatedAt: null };
}

function readServerPlans() {
  return readServerPlansData().plans;
}

function writeServerPlans(plans: unknown[]) {
  const updatedAt = new Date().toISOString();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    SUBSCRIPTIONS_FILE,
    JSON.stringify({ updatedAt, plans }, null, 2),
    'utf-8'
  );
  return updatedAt;
}

type EmailProvider = 'resend' | 'sendgrid' | null;

function resolveEmailProvider(): EmailProvider {
  const explicit = (process.env.EMAIL_PROVIDER || '').toLowerCase().trim();
  if (explicit === 'resend' && process.env.RESEND_API_KEY) return 'resend';
  if (explicit === 'sendgrid' && process.env.SENDGRID_API_KEY) return 'sendgrid';
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  return null;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function verifyAdminCaller(
  authHeader: string | undefined,
  bodyToken?: unknown
): Promise<{ authorized: boolean; reason?: string }> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  // If Supabase is not configured on this server, allow local preview validation while enforcing payload checks
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project-id.supabase.co') {
    return { authorized: true };
  }

  const rawBodyToken = typeof bodyToken === 'string' ? bodyToken.trim() : '';
  const rawHeaderToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : '';
  const token = rawBodyToken || rawHeaderToken;

  if (!token) {
    return { authorized: false, reason: 'Jeton d’authentification administrateur manquant.' };
  }

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!userRes.ok) {
      return { authorized: false, reason: 'Session Supabase expirée ou invalide.' };
    }

    const userData = (await userRes.json()) as { id?: string; email?: string };
    if (!userData?.id) {
      return { authorized: false, reason: 'Utilisateur non reconnu.' };
    }

    if ((userData.email || '').toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      return { authorized: true };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userData.id)}&select=role`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey || token}`,
          apikey: serviceRoleKey || supabaseAnonKey,
        },
      }
    );

    if (!profileRes.ok) {
      return { authorized: false, reason: 'Impossible de vérifier le rôle administrateur.' };
    }

    const profiles = (await profileRes.json()) as Array<{ role?: string }>;
    if (profiles[0]?.role === 'admin') {
      return { authorized: true };
    }

    return { authorized: false, reason: 'Accès réservé aux administrateurs SANDRINO.' };
  } catch (err) {
    console.error('Admin verification error:', err);
    return { authorized: false, reason: 'Erreur lors de la vérification des droits.' };
  }
}

function buildPaymentConfirmationEmail(params: {
  recipientName: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  deliveredProducts: string[];
  activatedSubscription: string | null;
  validatedAt: string;
  appUrl: string;
}) {
  const formattedAmount = `${Number(params.totalAmount || 0).toLocaleString('fr-FR')} FCFA`;
  const formattedDate = new Date(params.validatedAt || Date.now()).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const methodLabel =
    params.paymentMethod === 'tmoney'
      ? 'T-Money (Togocom)'
      : params.paymentMethod === 'moov'
      ? 'Moov Money (Togo)'
      : params.paymentMethod || 'Mobile Money';

  const itemsListHtml: string[] = [];
  const itemsListText: string[] = [];

  for (const prod of params.deliveredProducts) {
    itemsListHtml.push(
      `<li style="margin-bottom:6px;color:#0B1730;"><strong>Produit numérique débloqué :</strong> ${escapeHtml(prod)}</li>`
    );
    itemsListText.push(`- Produit numérique débloqué : ${prod}`);
  }

  if (params.activatedSubscription) {
    itemsListHtml.push(
      `<li style="margin-bottom:6px;color:#0B1730;"><strong>Abonnement activé :</strong> ${escapeHtml(params.activatedSubscription)}</li>`
    );
    itemsListText.push(`- Abonnement activé : ${params.activatedSubscription}`);
  }

  if (itemsListHtml.length === 0) {
    itemsListHtml.push(`<li style="color:#0B1730;">Accès validé dans votre espace personnel</li>`);
    itemsListText.push(`- Accès validé dans votre espace personnel`);
  }

  const dashboardUrl = `${params.appUrl.replace(/\/$/, '')}/dashboard`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Confirmation de paiement SANDRINO</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F6F8;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0B1730;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#0B1730;padding:28px 32px;text-align:left;">
              <div style="color:#16A36A;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">SANDRINO · Confirmation Officielle</div>
              <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:800;line-height:1.3;">Votre paiement a été validé</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Bonjour <strong>${escapeHtml(params.recipientName)}</strong>,</p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#334155;">
                Nous avons le plaisir de vous confirmer que votre paiement Mobile Money a été vérifié et validé manuellement par l'administration SANDRINO. Vos accès sont désormais actifs dans votre espace personnel.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F4F6F8;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#64748B;">Numéro de commande</td>
                  <td align="right" style="padding:4px 0;font-size:13px;font-weight:700;font-family:monospace;color:#0B1730;">${escapeHtml(params.orderNumber)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#64748B;">Montant validé</td>
                  <td align="right" style="padding:4px 0;font-size:14px;font-weight:800;color:#16A36A;">${escapeHtml(formattedAmount)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#64748B;">Moyen de paiement</td>
                  <td align="right" style="padding:4px 0;font-size:13px;font-weight:600;color:#0B1730;">${escapeHtml(methodLabel)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#64748B;">Date de validation</td>
                  <td align="right" style="padding:4px 0;font-size:13px;color:#0B1730;">${escapeHtml(formattedDate)}</td>
                </tr>
              </table>

              <div style="margin-bottom:28px;">
                <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#16A36A;margin-bottom:10px;">Éléments activés sur votre compte</div>
                <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;">
                  ${itemsListHtml.join('')}
                </ul>
              </div>

              <div style="text-align:center;margin-bottom:28px;">
                <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background-color:#16A36A;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;">
                  Accéder à mon espace membre
                </a>
              </div>

              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;border-top:1px solid #E5E7EB;padding-top:20px;">
                Besoin d'aide ? Répondez directement à cet e-mail ou écrivez-nous à <a href="mailto:${escapeHtml(OWNER_EMAIL)}" style="color:#16A36A;font-weight:600;">${escapeHtml(OWNER_EMAIL)}</a> ou sur WhatsApp au <strong>${escapeHtml(SUPPORT_WHATSAPP)}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F8FAFC;padding:16px 32px;text-align:center;font-size:11px;color:#94A3B8;">
              © ${new Date().getFullYear()} SANDRINO par Pétit SANDRINO. Tous droits réservés.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Bonjour ${params.recipientName},

Votre paiement Mobile Money pour la commande ${params.orderNumber} (${formattedAmount} via ${methodLabel}) a été vérifié et validé le ${formattedDate}.

Éléments activés sur votre compte :
${itemsListText.join('\n')}

Accédez à votre espace membre : ${dashboardUrl}

Assistance SANDRINO :
E-mail : ${OWNER_EMAIL}
WhatsApp : ${SUPPORT_WHATSAPP}
`;

  return {
    subject: `[SANDRINO] Paiement validé — Commande ${params.orderNumber}`,
    html,
    text,
  };
}

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      reply_to: params.replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data?.message || data?.error?.message || `Resend HTTP ${response.status}`);
  }
  return { messageId: data?.id || null };
}

async function sendViaSendGrid(params: {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from: { email: params.fromEmail, name: params.fromName },
      reply_to: { email: params.replyTo, name: 'Support SANDRINO' },
      subject: params.subject,
      content: [
        { type: 'text/plain', value: params.text },
        { type: 'text/html', value: params.html },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(errText || `SendGrid HTTP ${response.status}`);
  }
  return { messageId: response.headers.get('x-message-id') || null };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/uploads/covers', express.static(COVERS_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/emails/status', (_req, res) => {
    const provider = resolveEmailProvider();
    res.json({
      configured: Boolean(provider),
      provider,
      replyTo: OWNER_EMAIL,
    });
  });

  app.get('/api/products', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({
      products: readServerCatalog(),
      isCustomCatalog: fs.existsSync(CATALOG_FILE),
    });
  });

  app.get('/api/subscriptions', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const data = readServerPlansData();
    res.json({
      plans: data.plans,
      updatedAt: data.updatedAt,
      isCustomPlans: fs.existsSync(SUBSCRIPTIONS_FILE),
    });
  });

  const handleSavePlans = async (req: express.Request, res: express.Response) => {
    const auth = await verifyAdminCaller(req.headers.authorization, req.body?.accessToken);
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.reason || 'Accès administrateur requis.' });
    }
    const { plans } = req.body || {};
    if (!Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ error: 'Liste de formules invalide.' });
    }
    try {
      const normalized = plans.map((p: any) => ({
        id: String(p.id),
        name: String(p.name || 'Formule').trim(),
        price: Math.max(0, Number(p.price) || 0),
        billingCycle: String(p.billingCycle || 'Mensuel').trim(),
        features: Array.isArray(p.features) ? p.features.map(String) : [],
        isHighlighted: Boolean(p.isHighlighted),
      }));
      const updatedAt = writeServerPlans(normalized);
      return res.json({ saved: true, count: normalized.length, plans: normalized, updatedAt });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Impossible d'enregistrer les formules." });
    }
  };

  app.put('/api/subscriptions', handleSavePlans);
  app.post('/api/subscriptions/save', handleSavePlans);

  app.put('/api/products', async (req, res) => {
    const auth = await verifyAdminCaller(req.headers.authorization, req.body?.accessToken);
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.reason || 'Accès administrateur requis.' });
    }
    const { products } = req.body || {};
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Liste de produits invalide.' });
    }
    try {
      writeServerCatalog(products);
      return res.json({ saved: true, count: products.length });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Impossible de sauvegarder le catalogue.' });
    }
  });

  app.post('/api/products/upsert', async (req, res) => {
    const auth = await verifyAdminCaller(req.headers.authorization, req.body?.accessToken);
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.reason || 'Accès administrateur requis.' });
    }
    const { product, isNew } = req.body || {};
    if (!product || typeof product !== 'object' || !product.id || !product.name) {
      return res.status(400).json({ error: 'Données produit invalides.' });
    }
    try {
      const current = readServerCatalog() as Array<Record<string, unknown>>;
      const exists = current.some((p) => String(p.id) === String(product.id));
      const updated = exists
        ? current.map((p) => (String(p.id) === String(product.id) ? product : p))
        : isNew
        ? [product, ...current]
        : [product, ...current];
      writeServerCatalog(updated);
      return res.json({ saved: true, count: updated.length, product });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Impossible de sauvegarder le produit.' });
    }
  });

  app.post('/api/products/delete', async (req, res) => {
    const auth = await verifyAdminCaller(req.headers.authorization, req.body?.accessToken);
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.reason || 'Accès administrateur requis.' });
    }
    const { productId } = req.body || {};
    if (!productId) {
      return res.status(400).json({ error: 'Identifiant produit manquant.' });
    }
    try {
      const current = readServerCatalog() as Array<Record<string, unknown>>;
      const updated = current.filter((p) => String(p.id) !== String(productId));
      writeServerCatalog(updated);
      return res.json({ saved: true, count: updated.length });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Impossible de supprimer le produit.' });
    }
  });

  app.post('/api/uploads/product-cover', async (req, res) => {
    const auth = await verifyAdminCaller(req.headers.authorization, req.body?.accessToken);
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.reason || 'Accès administrateur requis.' });
    }

    const { productId: rawProductId, fileName: rawFileName, mimeType: rawMimeType, imageBase64 } = req.body || {};
    const imageBuf = parseBase64Payload(imageBase64);
    if (imageBuf.length === 0) {
      return res.status(400).json({ error: 'Aucune image reçue.' });
    }

    const rawName = String(rawFileName || 'cover.jpg');
    const mimeType = String(rawMimeType || '').toLowerCase();
    const productId = sanitizeUploadName(String(rawProductId || 'prod'));
    const safeName = sanitizeUploadName(rawName);
    const ext = path.extname(safeName).toLowerCase();
    const allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

    if (!allowedExt.has(ext) && !mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Format image non supporté (PNG, JPG, WEBP, GIF uniquement).' });
    }

    const finalExt = allowedExt.has(ext) ? ext : '.jpg';
    const baseName = path.basename(safeName, ext) || 'cover';
    const storedName = `${productId}_${Date.now()}_${baseName}${finalExt}`;
    const targetPath = path.join(COVERS_DIR, storedName);

    fs.mkdirSync(COVERS_DIR, { recursive: true });
    fs.writeFileSync(targetPath, imageBuf);

    return res.json({
      url: `/uploads/covers/${storedName}`,
      fileName: rawName,
      size: imageBuf.length,
    });
  });

  app.post('/api/uploads/product-file-chunk', async (req, res) => {
    const auth = await verifyAdminCaller(req.headers.authorization, req.body?.accessToken);
    if (!auth.authorized) {
      return res.status(403).json({ error: auth.reason || 'Accès administrateur requis.' });
    }

    const {
      uploadId: rawUploadId,
      chunkIndex: rawChunkIndex,
      totalChunks: rawTotalChunks,
      fileName: rawFileName,
      mimeType: rawMimeType,
      productId: rawProductId,
      chunkBase64,
    } = req.body || {};

    const chunkBuf = parseBase64Payload(chunkBase64);
    if (chunkBuf.length === 0) {
      return res.status(400).json({ error: 'Fragment de fichier vide ou illisible.' });
    }

    const uploadId = sanitizeUploadName(String(rawUploadId || '')).replace(/[^a-zA-Z0-9_-]/g, '');
    const chunkIndex = Number(rawChunkIndex);
    const totalChunks = Number(rawTotalChunks);
    const rawName = String(rawFileName || 'document.pdf');
    const mimeType = String(rawMimeType || '');
    const productId = sanitizeUploadName(String(rawProductId || `prod-${Date.now()}`));

    if (
      !uploadId ||
      !Number.isInteger(chunkIndex) ||
      !Number.isInteger(totalChunks) ||
      totalChunks < 1 ||
      chunkIndex < 0 ||
      chunkIndex >= totalChunks
    ) {
      return res.status(400).json({ error: 'Paramètres de transfert par fragments invalides.' });
    }

    let safeName = sanitizeUploadName(rawName);
    const validExt = resolveAllowedProductExt(safeName, mimeType);
    if (!validExt) {
      return res.status(400).json({
        error: 'Format de fichier non autorisé. Formats acceptés : PDF, EPUB, ZIP, MP4, MP3, DOCX, XLSX, PPTX, TXT.',
      });
    }
    if (!path.extname(safeName)) {
      safeName = `${safeName}${validExt}`;
    }

    const chunkDir = path.join(TMP_UPLOADS_DIR, uploadId);
    fs.mkdirSync(chunkDir, { recursive: true });
    fs.writeFileSync(path.join(chunkDir, `${chunkIndex}.part`), chunkBuf);

    if (chunkIndex < totalChunks - 1) {
      return res.json({ completed: false, chunkIndex });
    }

    // Assemble all chunks on the final chunk
    const productDir = path.join(PRIVATE_PRODUCTS_DIR, productId);
    fs.mkdirSync(productDir, { recursive: true });
    const targetPath = path.join(productDir, safeName);

    try {
      const writeStream = fs.createWriteStream(targetPath);
      let totalBytes = 0;
      for (let i = 0; i < totalChunks; i++) {
        const partPath = path.join(chunkDir, `${i}.part`);
        if (!fs.existsSync(partPath)) {
          writeStream.destroy();
          return res.status(400).json({ error: `Fragment ${i + 1}/${totalChunks} manquant lors de l'assemblage.` });
        }
        const partBuf = fs.readFileSync(partPath);
        totalBytes += partBuf.length;
        writeStream.write(partBuf);
      }
      await new Promise<void>((resolve, reject) => {
        writeStream.end(() => resolve());
        writeStream.on('error', reject);
      });

      fs.rmSync(chunkDir, { recursive: true, force: true });

      const detectedFormat = validExt.replace('.', '').toUpperCase() || 'PDF';
      return res.json({
        completed: true,
        filePath: `products/${productId}/${safeName}`,
        fileUrl: `/api/products/${encodeURIComponent(productId)}/download`,
        fileName: rawName,
        size: totalBytes,
        format: detectedFormat,
      });
    } catch (err: any) {
      fs.rmSync(chunkDir, { recursive: true, force: true });
      return res.status(500).json({ error: err?.message || "Erreur lors de l'assemblage du fichier." });
    }
  });

  app.get('/api/products/:id/download', async (req, res) => {
    const productId = sanitizeUploadName(String(req.params.id || ''));
    if (!productId) {
      return res.status(400).json({ error: 'Identifiant produit invalide.' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    // Enforce purchaser/admin check when Supabase is configured
    if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project-id.supabase.co') {
      const authHeader = req.headers.authorization;
      const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : queryToken;

      if (!token) {
        return res.status(401).json({ error: 'Authentification requise pour télécharger ce produit.' });
      }

      try {
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
        });
        if (!userRes.ok) {
          return res.status(401).json({ error: 'Session expirée ou invalide.' });
        }
        const userData = (await userRes.json()) as { id?: string; email?: string };
        const isOwner = (userData?.email || '').toLowerCase() === OWNER_EMAIL.toLowerCase();

        if (!isOwner && userData?.id) {
          const checkRes = await fetch(
            `${supabaseUrl}/rest/v1/purchased_products?user_id=eq.${encodeURIComponent(
              userData.id
            )}&product_id=eq.${encodeURIComponent(productId)}&file_available=eq.true&select=id`,
            { headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey } }
          );
          const rows = checkRes.ok ? ((await checkRes.json()) as Array<{ id: string }>) : [];
          if (rows.length === 0) {
            return res.status(403).json({ error: 'Accès refusé : vous devez acheter et faire valider ce produit.' });
          }
        }
      } catch {
        return res.status(500).json({ error: 'Erreur lors de la vérification des droits de téléchargement.' });
      }
    }

    const catalog = readServerCatalog() as Array<{ id: string; fileName?: string; filePath?: string }>;
    const matched = catalog.find((p) => sanitizeUploadName(p.id) === productId);
    const productDir = path.join(PRIVATE_PRODUCTS_DIR, productId);

    let fileToSend: string | null = null;
    if (matched?.filePath) {
      const candidate = path.join(productDir, path.basename(matched.filePath));
      if (fs.existsSync(candidate)) {
        fileToSend = candidate;
      }
    }
    if (!fileToSend && fs.existsSync(productDir)) {
      const files = fs.readdirSync(productDir);
      if (files.length > 0) {
        fileToSend = path.join(productDir, files[0]);
      }
    }

    if (!fileToSend) {
      return res.status(404).json({ error: 'Aucun fichier numérique joint à ce produit sur le serveur.' });
    }

    const downloadName = matched?.fileName || path.basename(fileToSend);
    return res.download(fileToSend, downloadName);
  });

  app.post('/api/orders/verify-price', (req, res) => {
    const { itemType, itemId } = req.body || {};
    if (!itemId || !itemType) {
      return res.status(400).json({ error: 'Paramètres itemType et itemId requis.' });
    }

    if (itemType === 'product') {
      const catalog = readServerCatalog() as typeof PRODUCTS;
      const product = catalog.find((p) => p.id === String(itemId));
      if (!product) {
        return res.status(404).json({ error: 'Produit introuvable dans le catalogue.' });
      }
      return res.json({
        verified: true,
        itemType: 'product',
        itemId: product.id,
        name: product.name,
        price: product.price,
      });
    }

    if (itemType === 'subscription') {
      const plans = readServerPlans() as typeof SUBSCRIPTION_PLANS;
      const plan = plans.find((p) => p.id === String(itemId));
      if (!plan) {
        return res.status(404).json({ error: "Formule d'abonnement introuvable." });
      }
      return res.json({
        verified: true,
        itemType: 'subscription',
        itemId: plan.id,
        name: plan.name,
        price: plan.price,
      });
    }

    return res.status(400).json({ error: 'Type de commande non reconnu.' });
  });

  app.post('/api/emails/payment-validated', async (req, res) => {
    const auth = await verifyAdminCaller(req.headers.authorization, req.body?.accessToken);
    if (!auth.authorized) {
      return res.status(403).json({
        sent: false,
        configured: Boolean(resolveEmailProvider()),
        error: auth.reason || 'Non autorisé.',
      });
    }

    const {
      recipientEmail,
      recipientName,
      orderNumber,
      totalAmount,
      paymentMethod,
      deliveredProducts,
      activatedSubscription,
      validatedAt,
    } = req.body || {};

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(recipientEmail).trim())) {
      return res.status(400).json({
        sent: false,
        configured: Boolean(resolveEmailProvider()),
        error: 'Adresse e-mail du destinataire absente ou invalide.',
      });
    }

    if (!orderNumber) {
      return res.status(400).json({
        sent: false,
        configured: Boolean(resolveEmailProvider()),
        error: 'Numéro de commande manquant.',
      });
    }

    const provider = resolveEmailProvider();
    if (!provider) {
      return res.status(200).json({
        sent: false,
        configured: false,
        provider: null,
        message:
          "Aucun service d'e-mail externe (RESEND_API_KEY ou SENDGRID_API_KEY) n'est encore configuré dans les variables d'environnement du serveur.",
      });
    }

    const appUrl =
      process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
        ? process.env.APP_URL
        : `${req.protocol}://${req.get('host')}`;

    const emailContent = buildPaymentConfirmationEmail({
      recipientName: String(recipientName || recipientEmail.split('@')[0] || 'Membre SANDRINO'),
      orderNumber: String(orderNumber),
      totalAmount: Number(totalAmount) || 0,
      paymentMethod: String(paymentMethod || 'Mobile Money'),
      deliveredProducts: Array.isArray(deliveredProducts) ? deliveredProducts.map(String) : [],
      activatedSubscription: activatedSubscription ? String(activatedSubscription) : null,
      validatedAt: String(validatedAt || new Date().toISOString()),
      appUrl,
    });

    try {
      if (provider === 'resend') {
        const fromAddress = process.env.EMAIL_FROM || `SANDRINO <onboarding@resend.dev>`;
        const result = await sendViaResend({
          apiKey: process.env.RESEND_API_KEY as string,
          from: fromAddress,
          to: String(recipientEmail).trim(),
          replyTo: OWNER_EMAIL,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
        return res.json({
          sent: true,
          configured: true,
          provider: 'resend',
          messageId: result.messageId,
          message: `E-mail de confirmation envoyé via Resend à ${recipientEmail}.`,
        });
      } else {
        const rawFrom = process.env.EMAIL_FROM || OWNER_EMAIL;
        const emailMatch = rawFrom.match(/<([^>]+)>/);
        const fromEmail = emailMatch ? emailMatch[1] : rawFrom;
        const result = await sendViaSendGrid({
          apiKey: process.env.SENDGRID_API_KEY as string,
          fromEmail,
          fromName: 'SANDRINO',
          to: String(recipientEmail).trim(),
          replyTo: OWNER_EMAIL,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
        return res.json({
          sent: true,
          configured: true,
          provider: 'sendgrid',
          messageId: result.messageId,
          message: `E-mail de confirmation envoyé via SendGrid à ${recipientEmail}.`,
        });
      }
    } catch (err: any) {
      console.error(`Email sending error (${provider}):`, err);
      return res.status(502).json({
        sent: false,
        configured: true,
        provider,
        error: err?.message || "Échec de l'envoi de l'e-mail par le fournisseur.",
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SANDRINO server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
