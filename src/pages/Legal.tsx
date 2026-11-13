import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, FileText, Lock, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Legal = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.replace('#', ''));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [hash]);

  return (
    <div className="bg-brand-grey min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-brand-navy/50 hover:text-brand-green font-bold text-xs uppercase tracking-widest mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour à l'accueil
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-brand-grey shadow-sm p-6 sm:p-10 md:p-12 space-y-12"
        >
          <div className="border-b border-brand-grey pb-8">
            <span className="text-brand-green font-bold tracking-[0.25em] uppercase text-xs block mb-3">
              Informations Réglementaires
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-brand-navy uppercase tracking-tight">
              Mentions Légales, Confidentialité & Conditions
            </h1>
            <p className="text-sm text-brand-navy/60 mt-3 leading-relaxed">
              Transparence, protection des données et règles d'utilisation de la plateforme SANDRINO.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <a
                href="#mentions"
                className="px-4 py-2 rounded-xl bg-brand-grey text-xs font-bold text-brand-navy hover:bg-brand-green hover:text-white transition-colors"
              >
                Mentions légales
              </a>
              <a
                href="#confidentialite"
                className="px-4 py-2 rounded-xl bg-brand-grey text-xs font-bold text-brand-navy hover:bg-brand-green hover:text-white transition-colors"
              >
                Politique de confidentialité
              </a>
              <a
                href="#conditions"
                className="px-4 py-2 rounded-xl bg-brand-grey text-xs font-bold text-brand-navy hover:bg-brand-green hover:text-white transition-colors"
              >
                Conditions d'utilisation
              </a>
            </div>
          </div>

          {/* 1. Mentions légales */}
          <section id="mentions" className="scroll-mt-28 space-y-4">
            <div className="flex items-center gap-3 text-brand-navy">
              <div className="h-10 w-10 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">1. Mentions légales</h2>
            </div>
            <div className="text-sm text-brand-navy/75 leading-relaxed space-y-3 pl-0 sm:pl-13">
              <p>
                <strong>Éditeur de la plateforme :</strong> SANDRINO, dirigé par Pétit SANDRINO.
              </p>
              <p>
                <strong>Activité :</strong> Plateforme d'apprentissage, d'entrepreneuriat, de développement personnel, de distribution de ressources numériques et d'accompagnement.
              </p>
              <p>
                <strong>Adresse e-mail officielle :</strong>{' '}
                <a href="mailto:petitsandrino1@gmail.com" className="text-brand-green font-bold hover:underline">
                  petitsandrino1@gmail.com
                </a>
              </p>
              <p>
                <strong>Contact WhatsApp officiel :</strong> +228 92 39 57 27 (Togo)
              </p>
              <p>
                <strong>Propriété intellectuelle :</strong> L'ensemble des contenus (textes, guides numériques, formations, ressources visuelles et documents) proposés sur SANDRINO sont protégés et destinés à un usage strictement personnel par l'acheteur ou le membre abonné.
              </p>
            </div>
          </section>

          <hr className="border-brand-grey" />

          {/* 2. Politique de confidentialité */}
          <section id="confidentialite" className="scroll-mt-28 space-y-4">
            <div className="flex items-center gap-3 text-brand-navy">
              <div className="h-10 w-10 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">2. Politique de confidentialité</h2>
            </div>
            <div className="text-sm text-brand-navy/75 leading-relaxed space-y-3 pl-0 sm:pl-13">
              <p>
                <strong>Données collectées :</strong> Nous collectons uniquement les informations nécessaires à la création de votre compte membre, à la gestion de vos commandes, à la vérification de vos paiements Mobile Money (numéro d'expéditeur, référence de transaction, justificatif éventuel) et au traitement de vos demandes d'assistance.
              </p>
              <p>
                <strong>Confidentialité et accès :</strong> Vos justificatifs de paiement et vos fichiers numériques achetés sont stockés dans des espaces privés et sécurisés par des règles d'accès strictes (RLS). Seuls vous-même et l'administration autorisée de SANDRINO pouvez consulter vos justificatifs et commandes.
              </p>
              <p>
                <strong>Conservation et droits :</strong> Vos données ne sont jamais vendues ni partagées à des tiers commerciaux. Pour toute demande de modification ou de suppression de compte, contactez{' '}
                <a href="mailto:petitsandrino1@gmail.com" className="text-brand-green font-bold hover:underline">
                  petitsandrino1@gmail.com
                </a>
                .
              </p>
            </div>
          </section>

          <hr className="border-brand-grey" />

          {/* 3. Conditions d'utilisation */}
          <section id="conditions" className="scroll-mt-28 space-y-4">
            <div className="flex items-center gap-3 text-brand-navy">
              <div className="h-10 w-10 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">3. Conditions d'utilisation & Paiements</h2>
            </div>
            <div className="text-sm text-brand-navy/75 leading-relaxed space-y-3 pl-0 sm:pl-13">
              <p>
                <strong>Processus de commande et validation manuelle :</strong> Les paiements sur SANDRINO s'effectuent manuellement par Mobile Money (T-Money Togocom ou Moov Money Togo). Après avoir effectué votre transfert et déclaré votre paiement avec exactitude, l'administration vérifie personnellement la réception des fonds avant de valider votre commande.
              </p>
              <p>
                <strong>Livraison des produits et abonnements :</strong> L'accès aux produits numériques payants et l'activation des formules d'abonnement interviennent exclusivement après validation manuelle par un administrateur. Un e-mail de confirmation et une notification dans votre espace personnel vous informent dès l'activation.
              </p>
              <p>
                <strong>Usage personnel :</strong> Le partage non autorisé, la revente ou la redistribution publique des produits numériques acquis sur SANDRINO sont interdits et peuvent entraîner la suspension du compte membre.
              </p>
            </div>
          </section>

          <div className="pt-6 border-t border-brand-grey flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-brand-navy/60">
              Une question concernant ces conditions ou vos données personnelles ?
            </p>
            <Link to="/contact">
              <Button variant="secondary" size="sm" className="rounded-xl">
                <Mail size={16} className="mr-2" />
                Contacter SANDRINO
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
