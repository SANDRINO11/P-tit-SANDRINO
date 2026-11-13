# GUIDE DE MISE EN LIGNE ET D'EXPLOITATION — SANDRINO

Ce document décrit les étapes essentielles pour configurer, sécuriser et mettre en production la plateforme **SANDRINO**.

---

## 1. Variables d'environnement requises

Créez un fichier `.env` (en local ou dans les variables d'environnement de votre hébergeur) sur la base du fichier `.env.example`, sans jamais exposer de clés secrètes dans le code source :

### Frontend (Vite)
- `VITE_SUPABASE_URL` : URL de votre projet Supabase (ex. `https://votre-projet.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` : Clé publique `anon` de votre projet Supabase

### Backend (Serveur Express — ne jamais préfixer par `VITE_`)
- `PORT` : Port du serveur Node/Express (`3000` par défaut)
- `APP_URL` : URL publique du site en production (utilisée dans les liens des e-mails de confirmation)
- `ADMIN_CONTACT_EMAIL` : Adresse e-mail officielle de support et de réponse (`petitsandrino1@gmail.com`)
- `EMAIL_PROVIDER` : Fournisseur d'e-mails transactionnels (`resend` ou `sendgrid`)
- `RESEND_API_KEY` : Clé API privée Resend (si `EMAIL_PROVIDER=resend`)
- `SENDGRID_API_KEY` : Clé API privée SendGrid (si `EMAIL_PROVIDER=sendgrid`)
- `EMAIL_FROM` : Adresse expéditrice vérifiée auprès de Resend ou SendGrid (ex. `SANDRINO <no-reply@votredomaine.com>`)

> **Important sécurité :** Ne placez jamais `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` ou `SENDGRID_API_KEY` dans le code frontend ni dans des variables `VITE_*`.

---

## 2. Configuration de Supabase (Base de données, Auth et RLS)

1. Créez un projet sur [Supabase](https://supabase.com).
2. Ouvrez **SQL Editor** dans le tableau de bord Supabase.
3. Copiez et exécutez l'intégralité du fichier `supabase-schema.sql` situé à la racine du projet.
   Ce script crée automatiquement :
   - Les 10 tables nécessaires (`profiles`, `orders`, `payment_declarations`, `purchased_products`, `subscriptions`, `member_notifications`, `payment_settings`, `admin_audit_logs`, `support_tickets`, `support_messages`).
   - La fonction sécurisée `public.is_admin()` (sans récursion RLS).
   - Les déclencheurs de sécurité : `protect_profile_role_on_update` (empêche toute élévation de rôle par un membre), `sync_order_on_declaration` et `handle_new_user`.
   - Les politiques Row Level Security (RLS) sur toutes les tables.
   - Les deux buckets privés Storage (`digital-products` et `private_receipts`) et leurs règles d'accès.
4. Dans **Authentication → URL Configuration**, renseignez :
   - **Site URL** : votre URL de production (ex. `https://sandrino.example.com`)
   - **Redirect URLs** : ajoutez `https://sandrino.example.com/reset-password` et `https://sandrino.example.com/dashboard`.

---

## 3. Création du premier compte Administrateur

1. Inscrivez-vous normalement depuis la page `/register` avec l'adresse propriétaire **`petitsandrino1@gmail.com`**.
2. Le trigger `handle_new_user()` attribue automatiquement le rôle `admin` à cette adresse lors de l'inscription.
3. Si le compte existait déjà avant l'exécution du script SQL, vérifiez ou forcez le rôle dans **SQL Editor** :
   ```sql
   update public.profiles
   set role = 'admin'
   where lower(email) = 'petitsandrino1@gmail.com';
   ```

---

## 4. Configuration des numéros Mobile Money (T-Money & Moov Money)

1. Connectez-vous en tant qu'administrateur et accédez à `/admin`.
2. Ouvrez l'onglet **Paramètres Mobile Money**.
3. Renseignez pour **T-Money (Togocom)** et **Moov Money (Togo)** :
   - Le numéro de réception réel ;
   - Le nom exact du bénéficiaire affiché lors du transfert ;
   - Les instructions USSD ou remarques destinées au client ;
   - Activez ou désactivez chaque moyen de paiement selon votre disponibilité.
4. Dans la section **Paramètres de communication** du même onglet, vérifiez le numéro WhatsApp officiel (`+22892395727`), l'e-mail d'assistance (`petitsandrino1@gmail.com`) et les catégories de demandes.
5. Enregistrez les paramètres.

---

## 5. Ajout d'un produit numérique

- Le catalogue de base des produits numériques est défini dans `src/data/products.ts` (avec identifiant unique `id`, titre, catégorie, prix en FCFA, description et image).
- Vous pouvez également gérer les fiches depuis l'onglet **Produits numériques** de l'administration `/admin`.
- **Important :** Le backend (`/api/orders/verify-price`) vérifie le prix canonique des produits à partir de `src/data/products.ts` et des abonnements à partir de `src/data/subscriptions.ts` lors de la création de commande. Toute modification permanente d'un tarif doit donc être mise à jour dans ces fichiers avant redéploiement.

---

## 6. Dépôt sécurisé des fichiers numériques dans le Storage privé

1. Dans Supabase, ouvrez **Storage → digital-products** (bucket privé créé par `supabase-schema.sql`).
2. Déposez chaque fichier numérique sous le chemin exact :
   `products/<productId>.pdf` (ex. `products/1.pdf`, `products/2.pdf`, etc.).
3. Le bucket étant **privé**, aucun visiteur non autorisé ne peut y accéder par URL publique.
4. Lorsqu'un paiement est validé, une ligne est insérée dans `purchased_products` avec `file_available = true` et `file_path = 'products/<productId>.pdf'`. La politique RLS de Storage autorise alors uniquement l'acheteur légitime à générer une URL signée temporaire (60 secondes) depuis son espace **Mes produits numériques**.

---

## 7. Procédure de validation manuelle des paiements & e-mails automatiques

1. Le client commande un produit ou un abonnement, effectue son transfert manuel (T-Money ou Moov Money) et déclare son paiement dans `/checkout`.
2. La commande passe au statut `payment_declared` (`Paiement déclaré`). Aucun accès payant n'est débloqué à ce stade.
3. L'administrateur consulte l'onglet **Paiements à vérifier** dans `/admin`, vérifie personnellement la réception réelle des fonds sur son téléphone Mobile Money (montant exact, numéro expéditeur, référence SMS / justificatif).
4. L'administrateur clique sur **Valider et activer les accès** (ou **Refuser** avec un motif explicite).
5. Lors de la validation :
   - La commande et la déclaration passent à `paid_validated` ;
   - Le produit numérique est débloqué dans **Mes produits numériques** ou l'abonnement est activé avec sa date d'expiration ;
   - Une notification interne est créée pour le membre ;
   - Un e-mail officiel de confirmation est envoyé automatiquement au client via **Resend** ou **SendGrid** (si `RESEND_API_KEY` ou `SENDGRID_API_KEY` est configurée sur le serveur), avec `petitsandrino1@gmail.com` en adresse de réponse.

---

## 8. Checklist complète avant mise en ligne

- [ ] `npm run build` et `npm run lint` passent sans erreur.
- [ ] Toutes les variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `RESEND_API_KEY` ou `SENDGRID_API_KEY`, `EMAIL_FROM`, `APP_URL`, `ADMIN_CONTACT_EMAIL`) sont définies sur l'hébergeur.
- [ ] Le script `supabase-schema.sql` a été exécuté avec succès dans Supabase.
- [ ] Les Redirect URLs Supabase Auth incluent le domaine final en HTTPS.
- [ ] Le compte administrateur `petitsandrino1@gmail.com` possède bien `role = 'admin'`.
- [ ] Les numéros réels T-Money et Moov Money sont enregistrés dans **Paramètres Mobile Money**.
- [ ] Les fichiers numériques finaux sont déposés dans le bucket privé `digital-products` (`products/<id>.pdf`).
- [ ] Un parcours complet (Inscription → Commande → Déclaration → Validation Admin → Réception e-mail & téléchargement produit) a été testé en conditions réelles.
