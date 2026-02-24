# 📖 HizbFollow - Documentation Complète de l'Application

## 🎯 Vue d'ensemble

**HizbFollow** est une Progressive Web App (PWA) complète pour le suivi hebdomadaire de la lecture du Saint Coran. L'application permet aux groupes et aux individus de suivre leur progression de lecture en Hizb (1-60) ou en Pages (1-604), avec des fonctionnalités avancées d'analytics, de gestion de groupes, et même un lecteur de Coran intégré avec Tajweed.

---

## 🏗️ Architecture Technique

### Stack Frontend
- **React 18.3.1** - Framework UI
- **TypeScript 5.5.3** - Typage statique
- **Vite 5.4.2** - Build tool et dev server
- **TailwindCSS 3.4.1** - Styling utility-first
- **React Router 6.20.1** - Navigation
- **Zustand 4.4.7** - State management avec persistance
- **Recharts 2.8.0** - Graphiques et visualisations
- **Lucide React 0.344.0** - Icônes
- **React Hook Form 7.48.2** - Gestion de formulaires
- **date-fns 2.30.0** - Manipulation de dates
- **jsPDF 2.5.1** + **html2canvas 1.4.1** - Export PDF

### Stack Backend
- **Supabase** - Backend-as-a-Service
  - **PostgreSQL** - Base de données
  - **Supabase Auth** - Authentification
  - **Row Level Security (RLS)** - Sécurité au niveau des lignes
  - **Edge Functions** - Fonctions serverless
  - **Supabase Storage** - Stockage de fichiers (avatars)

### PWA Features
- **Service Worker** - Cache offline
- **Web App Manifest** - Installation sur mobile/desktop
- **IndexedDB** - Stockage local pour mode offline
- **Sync Queue** - Synchronisation différée

---

## 📁 Structure du Projet

```
project/
├── src/
│   ├── components/          # Composants réutilisables
│   │   ├── analytics/        # Composants analytics
│   │   ├── ui/              # Composants UI (Skeleton, etc.)
│   │   ├── Dashboard.tsx    # Tableau de bord principal
│   │   ├── Layout.tsx       # Layout avec sidebar/navigation
│   │   ├── Login.tsx        # Page de connexion
│   │   ├── GroupSelector.tsx # Sélecteur de groupe
│   │   ├── HizbPageConverter.tsx # Convertisseur Hizb ↔ Pages
│   │   └── ToastContainer.tsx # Notifications toast
│   ├── pages/              # Pages de l'application
│   │   ├── AnalyticsPage.tsx      # Analytics et graphiques
│   │   ├── EntryPage.tsx          # Saisie hebdomadaire
│   │   ├── MonthlyEntriesPage.tsx # Vue mensuelle
│   │   ├── ParticipantsPage.tsx   # Gestion participants
│   │   ├── PersonalEntryPage.tsx  # Saisie personnelle
│   │   ├── SettingsPage.tsx       # Paramètres utilisateur
│   │   ├── GroupsPage.tsx         # Gestion des groupes
│   │   ├── GroupSettingsPage.tsx  # Paramètres de groupe
│   │   ├── JoinGroupPage.tsx      # Rejoindre un groupe
│   │   ├── QuranReaderPage.tsx    # Lecteur de Coran avec Tajweed
│   │   ├── ForgotPasswordPage.tsx # Mot de passe oublié
│   │   └── ResetPasswordPage.tsx   # Réinitialisation mot de passe
│   ├── stores/             # State management (Zustand)
│   │   ├── useAppStore.ts  # Store principal (données, actions)
│   │   ├── useAuth.ts      # Store authentification
│   │   └── useToast.ts     # Store notifications
│   ├── lib/                # Utilitaires et services
│   │   ├── supabase.ts     # Client Supabase
│   │   ├── quranApi.ts     # API Quran.com
│   │   ├── constants.ts     # Constantes (Hizb, Pages, etc.)
│   │   ├── utils.ts        # Fonctions utilitaires
│   │   ├── validation.ts   # Validation de données
│   │   ├── getUserRole.ts  # Rôles utilisateur
│   │   ├── nameGenerator.ts # Génération de noms
│   │   └── snapshots.ts    # Gestion des snapshots
│   ├── types/              # Types TypeScript
│   │   └── index.ts        # Tous les types/interfaces
│   └── App.tsx             # Point d'entrée + routing
├── supabase/
│   ├── migrations/         # Migrations SQL (46 fichiers)
│   └── functions/          # Edge Functions
│       ├── process_pending_users/
│       ├── send_reminders/
│       └── snapshot_tuesday/
└── public/                 # Assets statiques
    ├── manifest.json       # PWA manifest
    └── icons/             # Icônes PWA
```

---

## 🔐 Système d'Authentification

### Fonctionnalités
- **Inscription** : Email + mot de passe
- **Connexion** : Email + mot de passe
- **Déconnexion** : Nettoyage de session
- **Vérification email** : Optionnelle (peut être désactivée)
- **Mot de passe oublié** : Flow complet avec email
- **Réinitialisation mot de passe** : Via lien sécurisé
- **Changement de mot de passe** : Dans les paramètres
- **Suppression de compte** : Avec confirmation

### Workflow Connexion
1. Utilisateur entre email + mot de passe
2. `signIn()` appelle `supabase.auth.signInWithPassword()`
3. Si succès → `refresh()` met à jour le store
4. Redirection vers Dashboard (`/`)
5. Chargement automatique des groupes et données

### Workflow Inscription
1. Utilisateur entre email + mot de passe
2. `signUp()` appelle `supabase.auth.signUp()`
3. Si email vérification activée → email envoyé
4. Sinon → connexion automatique
5. Création automatique d'un groupe par défaut (si groupes activés)

### Workflow Mot de Passe Oublié
1. Utilisateur entre son email sur `/forgot-password`
2. `supabase.auth.resetPasswordForEmail()` envoie un lien
3. Lien contient un token dans l'URL
4. Redirection vers `/reset-password?token=...`
5. Utilisateur entre nouveau mot de passe
6. `supabase.auth.updateUser()` met à jour le mot de passe

---

## 👥 Système de Groupes

### Concepts
- **Groupes** : Espaces de travail isolés
- **Membres** : Utilisateurs appartenant à un groupe
- **Rôles** : Permissions granulaires
- **Invitations** : Système d'invitation par email/code

### Rôles et Permissions

#### Owner (Propriétaire)
- ✅ Toutes les permissions
- ✅ Peut supprimer le groupe
- ✅ Peut modifier tous les membres
- ✅ Peut utiliser "Remplir auto" (remplissage automatique)
- ❌ Ne peut pas être rétrogradé
- ❌ Ne peut pas quitter le groupe (doit supprimer)

#### Manager (Gestionnaire)
- ✅ Peut inviter des membres
- ✅ Peut modifier les rôles (sauf Owner)
- ✅ Peut gérer les participants
- ✅ Peut créer/modifier/supprimer des entrées
- ❌ Ne peut pas supprimer le groupe

#### Member (Membre)
- ✅ Peut créer/modifier ses propres entrées (si `can_write_self`)
- ✅ Peut voir tous les participants et entrées
- ❌ Ne peut pas inviter
- ❌ Ne peut pas modifier les participants

#### Viewer (Observateur)
- ✅ Peut voir tous les participants et entrées
- ❌ Lecture seule (aucune modification)

### Workflow Création de Groupe
1. Utilisateur clique "Créer un groupe"
2. Entre nom + description (optionnel)
3. `createGroup()` crée le groupe dans Supabase
4. Utilisateur devient automatiquement Owner
5. Groupe sélectionné automatiquement

### Workflow Invitation
1. Owner/Manager va dans "Groupes" → sélectionne groupe
2. Clique "Inviter par email"
3. Entre email + rôle souhaité
4. `inviteByEmail()` crée une invitation
5. Code d'invitation généré automatiquement
6. Email envoyé (si configuré) avec code
7. Utilisateur peut rejoindre via `/join?code=...`

### Workflow Rejoindre un Groupe
1. Utilisateur va sur `/join`
2. Entre le code d'invitation
3. `joinGroupByCode()` vérifie le code
4. Si valide → ajout comme membre
5. Groupe sélectionné automatiquement

### Workflow Changement de Rôle
1. Owner/Manager va dans "Groupes" → "Membres"
2. Sélectionne un membre
3. Change le rôle via dropdown
4. `updateMemberRole()` met à jour dans Supabase
5. Permissions mises à jour immédiatement

---

## 📊 Gestion des Participants

### Structure de Données
```typescript
interface Participant {
  id: string;
  owner_id: string;        // ID du propriétaire (legacy)
  group_id: string;        // ID du groupe
  user_id?: string;        // ID utilisateur si lié
  name: string;           // Nom du participant
  email?: string;          // Email (optionnel)
  avatar_url?: string;     // URL avatar (optionnel)
  active: boolean;         // Actif/inactif
  weekly_target_hizb: 7 | 14; // Objectif hebdomadaire
  cycle_number: number;    // Numéro de cycle (Khatma)
  created_at: string;
  updated_at: string;
}
```

### Fonctionnalités
- **CRUD complet** : Créer, Lire, Modifier, Supprimer
- **Import CSV** : Import en masse depuis fichier CSV
- **Export CSV** : Export des participants
- **Statut actif/inactif** : Masquer temporairement sans perdre l'historique
- **Avatars** : URLs d'avatar (stockage Supabase Storage)
- **Liaison utilisateur** : Lier un participant à un compte utilisateur
- **Mode démo** : Génération de 16 participants factices

### Workflow Création Participant
1. Aller dans "Participants"
2. Cliquer "Ajouter un participant"
3. Modal s'ouvre avec formulaire
4. Entrer nom, email (optionnel), objectif hebdo
5. `addParticipant()` crée dans Supabase
6. Participant apparaît dans la liste

### Workflow Import CSV
1. Aller dans "Participants"
2. Cliquer "Importer CSV"
3. Sélectionner fichier CSV
4. Format attendu : `name,email,weekly_target_hizb`
5. Parsing du CSV
6. Création en masse via `addParticipant()`

### Workflow Export CSV
1. Aller dans "Participants"
2. Cliquer "Exporter CSV"
3. Génération du CSV avec tous les participants
4. Téléchargement automatique

---

## 📝 Système de Saisie (Entries)

### Structure de Données
```typescript
interface Entry {
  id: string;
  owner_id: string;
  group_id: string;
  participant_id: string;
  unit_type: 'hizb' | 'page';  // Unité utilisée
  value_int: number;           // Valeur (1-60 pour Hizb, 1-604 pour Pages)
  cycle_number: number;        // Numéro de cycle
  note?: string;              // Note optionnelle
  source: 'manual' | 'import' | 'seed' | 'app_reader' | 'starting_point';
  recorded_at: string;        // Date/heure de saisie
  created_at: string;
  updated_at: string;
  is_restart?: boolean;       // Indique un nouveau cycle
  previous_position?: number; // Position avant restart
}
```

### Types de Saisie
- **Saisie hebdomadaire** (`/entry`) : Saisie pour tous les participants
- **Saisie personnelle** (`/me/entry`) : Saisie pour soi-même uniquement
- **Saisie mensuelle** (`/monthly`) : Vue mensuelle avec tableau
- **Saisie depuis Coran** (`/quran`) : Enregistrer la position depuis le lecteur

### Sources d'Entrées
- **manual** : Saisie manuelle via interface
- **import** : Import depuis CSV
- **seed** : Génération de données de démo
- **app_reader** : Enregistrement depuis lecteur de Coran
- **starting_point** : Point de départ initial

### Workflow Saisie Hebdomadaire
1. Aller dans "Saisie Hebdo"
2. Sélectionner la semaine (mardi de référence)
3. Vue tableau : Tous les participants visibles
4. Cliquer sur une cellule → Modal de saisie
5. Entrer valeur (Hizb ou Pages)
6. Conversion automatique si nécessaire
7. `addEntry()` ou `updateEntry()` sauvegarde
8. Détection automatique de nouveau cycle (Khatma)

### Workflow Saisie Personnelle
1. Aller dans "Ma Saisie" (`/me/entry`)
2. Interface simplifiée pour saisie personnelle
3. Même workflow que saisie hebdo mais filtré

### Workflow Saisie Mensuelle
1. Aller dans "Saisie Mensuelle"
2. Sélectionner le mois
3. Vue tableau avec toutes les semaines du mois
4. Édition directe dans les cellules
5. **Remplir auto** (Owner uniquement) : Remplit les semaines manquantes avec moyenne des semaines adjacentes

### Détection de Nouveau Cycle (Khatma)
- Si `value_int` < `previous_entry.value_int` → Nouveau cycle détecté
- `cycle_number` incrémenté automatiquement
- `is_restart` = true
- `previous_position` = ancienne valeur

### Conversion Hizb ↔ Pages
- **Formule** : `pages = Math.ceil(hizb * 604 / 60)`
- **Bidirectionnel** : Conversion dans les deux sens
- **Arrondi** : Toujours arrondi vers le haut
- **Convertisseur flottant** : Composant `HizbPageConverter` disponible partout

---

## 📈 Analytics et Statistiques

### Fonctionnalités
- **Graphiques de progression** : Courbes individuelles et comparatives
- **Classements** : Par total cumulé et progression récente
- **Analyse mensuelle** : Vue mensuelle avec moyennes
- **Analyse individuelle** : Statistiques par participant
- **Mode comparaison** : Comparer deux mois
- **Exports** : CSV, PNG (graphiques), PDF complet

### Métriques Calculées
- **Total cumulé** : Somme de tous les cycles
- **Progression hebdomadaire** : Différence semaine N vs semaine N-1
- **Moyenne mensuelle** : Moyenne des valeurs du mois
- **Série actuelle** : Nombre de semaines consécutives avec progression
- **Meilleure série** : Plus longue série jamais atteinte
- **Hizb en retard** : Nombre de Hizb manqués par rapport à l'objectif

### Workflow Analytics
1. Aller dans "Analytics"
2. Sélectionner période (4, 8, 12, 26, 52 semaines)
3. Sélectionner participants à afficher
4. Graphiques générés automatiquement
5. Tableaux avec métriques calculées
6. Export possible (CSV, PNG, PDF)

### Graphiques Disponibles
- **Évolution par semaine** : Courbe de progression temporelle
- **Moyennes mensuelles** : Barres par mois
- **Analyse mensuelle** : Vue détaillée d'un mois
- **Lectures hebdomadaires** : Tableau avec toutes les semaines
- **Analyse individuelle** : Statistiques détaillées par participant

---

## 📖 Lecteur de Coran Intégré

### Fonctionnalités
- **Navigation** : Par Page (1-604), Sourate (1-114), ou Hizb (1-60)
- **Tajweed coloré** : Texte avec règles de Tajweed colorées
- **Traductions** : Français (Hamidullah) et autres langues
- **Modes d'affichage** : Arabe seul, Français seul, ou les deux
- **Tailles de police** : S, M, L, XL
- **Sauvegarde de position** : Enregistrer la position de lecture
- **Restauration automatique** : Retour à la dernière position sauvegardée
- **Enregistrer ma lecture** : Créer une entrée depuis le lecteur

### Règles de Tajweed Colorées
- **Silent letters** : Gris (#AAAAAA) - `slnt`, `ham_wasl`, `laam_shamsiyah`
- **Normal madd (2)** : Rose (#FFC1E0) - `madda_normal`, `madda_tabii`
- **Separated madd (2/4/6)** : Orange (#F49E38) - `madda_permissible`
- **Connected madd (4/5)** : Magenta (#CF3D9E) - `madda_obligatory`
- **Necessary madd (6)** : Rouge (#E04A5A) - `madda_necessary`
- **Ghunna/Ikhfa** : Vert (#39B578) - `ghunnah`, `ikhafa`, `idgham_ghunnah`
- **Idgham without Ghunna** : Gris clair (#9ea8b3) - `idgham_wo_ghunnah`
- **Qalqala** : Cyan (#49C1CE) - `qalaqah`
- **Tafkhim** : Bleu clair (#6DB1DB) - `tafkheem` (lettres lourdes)

### API Utilisée
- **Quran.com API v4** : `https://api.quran.com/api/v4`
- Endpoints :
  - `/chapters` : Liste des sourates
  - `/verses/by_chapter/{surah}` : Versets d'une sourate
  - `/verses/by_page/{page}` : Versets d'une page
  - `/verses/by_hizb/{hizb}` : Versets d'un Hizb
  - `/quran/translations/{translation_id}` : Traductions

### Workflow Lecture
1. Aller dans "Coran" (`/quran`)
2. Sélectionner mode de navigation (Page/Sourate/Hizb)
3. Naviguer avec "Précédent"/"Suivant"
4. Ajuster taille de police si nécessaire
5. Changer mode d'affichage (Arabe/Français/Les deux)
6. Cliquer sur un verset → Menu contextuel
7. "Enregistrer ma lecture" → Crée une entrée pour la semaine actuelle

### Workflow Sauvegarde Position
1. Lire le Coran
2. Cliquer sur un verset → "Enregistrer ma lecture"
3. Si connecté → Entrée créée avec `source: 'app_reader'`
4. Position sauvegardée dans `localStorage`
5. Au retour sur `/quran` → Position restaurée automatiquement

---

## 🎨 Interface Utilisateur

### Design System
- **Thème** : Clair, Sombre, ou Automatique (selon système)
- **Couleurs** :
  - Primary : Emerald-600 (#059669)
  - Secondary : Teal-700 (#0f766e)
  - Accent : Orange-600 (#ea580c)
  - Success : Green-600 (#16a34a)
  - Warning : Yellow-600 (#ca8a04)
  - Error : Red-600 (#dc2626)
- **Typographie** : Plus Jakarta Sans (Google Fonts)
- **Glassmorphism** : Effets de verre sur les panneaux
- **Animations** : Transitions fluides

### Composants UI
- **Glass Panel** : Panneaux avec effet de verre (`glass-panel`)
- **Card Hover** : Effet hover sur les cartes (`card-hover`)
- **Input Modern** : Inputs stylisés (`input-modern`)
- **Skeleton Loaders** : Chargement avec squelettes
- **Toast Notifications** : Notifications toast modernes
- **Modals** : Modales avec backdrop blur

### Responsive Design
- **Mobile** : Sidebar → Drawer (téléphone)
- **Tablet** : Sidebar collapsible
- **Desktop** : Sidebar fixe

### Navigation
- **Sidebar** : Navigation principale (desktop)
- **Drawer** : Navigation mobile (téléphone)
- **Breadcrumbs** : Fil d'Ariane (certaines pages)
- **Profile Dropdown** : Menu profil en haut à droite

---

## 💾 Mode Offline

### Fonctionnalités
- **Service Worker** : Cache des assets statiques
- **IndexedDB** : Stockage local des données
- **Sync Queue** : File d'attente pour synchronisation
- **Détection online/offline** : Badge de statut

### Workflow Offline
1. Application détecte perte de connexion
2. Badge "Hors ligne" affiché
3. Actions utilisateur → Ajoutées à la queue
4. Données mises en cache dans IndexedDB
5. Au retour en ligne → Synchronisation automatique
6. Queue vidée progressivement

### Sync Queue Actions
- `add_participant` : Création de participant
- `update_participant` : Modification de participant
- `delete_participant` : Suppression de participant
- `add_entry` : Création d'entrée
- `update_entry` : Modification d'entrée
- `delete_entry` : Suppression d'entrée
- `update_settings` : Modification de paramètres

---

## 🔔 Notifications

### Types de Notifications
- **Web Push** : Notifications navigateur
- **Email** : Via Resend/SMTP (optionnel)

### Rappels Automatiques
- **Pré-rappel** : Mardi 19:30
- **Rappel final** : Mardi 22:30
- **Snapshot** : Mardi 22:59 (création snapshot hebdomadaire)

### Edge Functions
- `send_reminders` : Envoie les rappels
- `snapshot_tuesday` : Crée les snapshots hebdomadaires
- `process_pending_users` : Traite les utilisateurs en attente

---

## 📊 Base de Données

### Tables Principales

#### `participants`
- Informations des participants
- Liens avec groupes et utilisateurs
- Cycles et objectifs

#### `entries`
- Toutes les saisies horodatées
- Sources multiples (manual, import, app_reader, etc.)
- Détection de nouveaux cycles

#### `weekly_snapshots`
- Photos hebdomadaires pour analytics
- Créées automatiquement chaque mardi
- Valeurs cumulatives calculées

#### `groups`
- Groupes de travail
- Codes d'invitation
- Paramètres de groupe

#### `group_members`
- Membres des groupes
- Rôles et permissions
- Liaison avec `user_profiles`

#### `user_profiles`
- Profils utilisateur
- Avatars, noms, emails
- Préférences

#### `group_invites`
- Invitations par email
- Codes d'accès
- Expiration

#### `app_settings`
- Paramètres par groupe
- Timezone, fenêtre checkpoint
- Unité par défaut

### Row Level Security (RLS)
- **Activée sur toutes les tables**
- **Politiques par groupe** : Chaque utilisateur ne voit que ses groupes
- **Politiques par rôle** : Permissions granulaires selon le rôle
- **Security Definer Functions** : Fonctions avec privilèges élevés pour certaines opérations

---

## 🔄 Workflows Principaux

### Workflow Initial (Premier Utilisateur)
1. Inscription → Création compte
2. Création automatique d'un groupe par défaut (si activé)
3. Utilisateur devient Owner du groupe
4. Redirection vers Dashboard
5. Option : Créer des participants ou utiliser mode démo

### Workflow Saisie Hebdomadaire
1. Mardi → Fenêtre checkpoint (20:00-23:00 par défaut)
2. Utilisateur va dans "Saisie Hebdo"
3. Sélectionne la semaine (mardi de référence)
4. Vue tableau avec tous les participants
5. Clique sur cellule → Modal de saisie
6. Entre valeur (Hizb ou Pages)
7. Sauvegarde → Entrée créée
8. Détection automatique de nouveau cycle si nécessaire
9. Snapshot automatique à 22:59

### Workflow Analytics
1. Utilisateur va dans "Analytics"
2. Sélectionne période (4-52 semaines)
3. Sélectionne participants à afficher
4. Graphiques générés automatiquement
5. Tableaux avec métriques
6. Export possible (CSV, PNG, PDF)

### Workflow Gestion de Groupe
1. Owner crée un groupe
2. Invite des membres par email
3. Membres rejoignent via code
4. Owner/Manager assigne des rôles
5. Membres peuvent créer leurs propres participants
6. Tous voient les mêmes données du groupe

---

## 🛠️ Configuration et Déploiement

### Variables d'Environnement
```env
# Supabase (obligatoire)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Notifications (optionnel)
VITE_RESEND_API_KEY=your-resend-key
VITE_VAPID_PUBLIC_KEY=your-vapid-key
```

### Migrations SQL
- **46 migrations** dans `supabase/migrations/`
- **Ordre chronologique** : Appliquer dans l'ordre
- **RLS Policies** : Configurées dans les migrations
- **Functions** : Créées dans les migrations

### Edge Functions
- Déployer via interface Supabase
- Ou via CLI Supabase (si disponible)
- Configurer les Cron Jobs pour automatisation

### Build Production
```bash
npm run build
# Déployer le dossier dist/ vers votre hébergeur
```

### PWA Configuration
- **Manifest** : `public/manifest.json`
- **Service Worker** : Généré automatiquement par Vite PWA
- **Icons** : 192x192 et 512x512 requis

---

## 🧪 Tests

### Tests Unitaires
- **Vitest** : Framework de test
- **Testing Library** : Tests React
- **Coverage** : `npm run test:coverage`

### Tests Couverts
- ✅ Conversions Hizb ↔ Pages
- ✅ Détection nouvelles Khatmas
- ✅ Génération week_key_tuesday
- ✅ Politiques RLS
- ✅ Composants React

---

## 📱 Fonctionnalités Mobile

### PWA Features
- **Installable** : Ajouter à l'écran d'accueil
- **Offline** : Fonctionnement complet hors ligne
- **Push Notifications** : Notifications navigateur
- **Responsive** : Interface adaptée mobile

### Optimisations Mobile
- **Touch-friendly** : Boutons et zones de touch optimisées
- **Drawer Navigation** : Menu latéral sur mobile
- **Swipe Gestures** : Navigation par swipe (certaines pages)
- **Viewport** : Meta tag viewport configuré

---

## 🔒 Sécurité

### Authentification
- **Supabase Auth** : Gestion sécurisée des sessions
- **JWT Tokens** : Tokens sécurisés
- **Password Hashing** : Hachage bcrypt automatique

### Row Level Security
- **Politiques par groupe** : Isolation des données
- **Politiques par rôle** : Permissions granulaires
- **Security Definer** : Fonctions avec privilèges pour certaines opérations

### Validation
- **Client-side** : Validation des formulaires
- **Server-side** : Validation dans les Edge Functions
- **SQL Constraints** : Contraintes au niveau base de données

---

## 🚀 Scripts Disponibles

```json
{
  "dev": "vite",                    // Serveur de développement
  "build": "vite build",            // Build production
  "preview": "vite preview",        // Preview build
  "lint": "eslint .",             // Linting
  "test": "vitest",                // Tests
  "test:coverage": "vitest --coverage", // Tests avec couverture
  "test:ui": "vitest --ui"         // Tests avec UI
}
```

---

## 📚 APIs Externes

### Quran.com API
- **Base URL** : `https://api.quran.com/api/v4`
- **Endpoints** :
  - `/chapters` : Liste des sourates
  - `/verses/by_chapter/{surah}` : Versets d'une sourate
  - `/verses/by_page/{page}` : Versets d'une page
  - `/verses/by_hizb/{hizb}` : Versets d'un Hizb
  - `/quran/translations/{id}` : Traductions
- **Cache** : Mise en cache côté client pour performance

---

## 🎯 Feature Flags

### Flags Disponibles
```typescript
enableGroups: boolean;        // Système de groupes
enableInvites: boolean;       // Système d'invitations
enablePersonalEntry: boolean; // Saisie personnelle
```

### Activation/Désactivation
- Modifier dans `src/stores/useAppStore.ts`
- Redémarrer l'application

---

## 📝 Notes Importantes

### Conversions Hizb ↔ Pages
- **Formule** : `pages = Math.ceil(hizb * 604 / 60)`
- **Approximation linéaire** : Pas de mapping JSON précis (pour l'instant)
- **Arrondi** : Toujours vers le haut

### Snapshots Hebdomadaires
- **Création automatique** : Chaque mardi à 22:59
- **Valeurs cumulatives** : Calculées automatiquement
- **Utilisation** : Pour analytics et graphiques

### Cycles (Khatmas)
- **Détection automatique** : Si nouvelle valeur < ancienne valeur
- **Incrémentation** : `cycle_number` incrémenté automatiquement
- **Cumulatif** : `cumulative = cycles_complets * total + valeur_actuelle`

---

## 🔮 Roadmap Future

### Court Terme
- [ ] Mapping JSON précis Hizb ↔ Pages
- [ ] Granularité 1/2 et 1/4 Hizb
- [ ] Templates d'emails personnalisables
- [ ] Amélioration détection Khatma

### Moyen Terme
- [ ] Application mobile native
- [ ] Synchronisation calendrier
- [ ] Statistiques avancées (tendances, projections)
- [ ] Système de badges/récompenses

### Long Terme
- [ ] IA pour suggestions personnalisées
- [ ] Intégration réseaux sociaux
- [ ] API publique pour extensions
- [ ] Mode multilingue complet

---

## 📞 Support et Contribution

### Documentation
- **README.md** : Documentation principale
- **MIGRATION_GUIDE.md** : Guide de migration
- **DEPLOYMENT_CHECKLIST.md** : Checklist de déploiement
- **TROUBLESHOOTING.md** : Guide de dépannage

### Contribution
1. Fork le projet
2. Créer une branche feature
3. Commit les changements
4. Push vers la branche
5. Ouvrir une Pull Request

---

**Barakallahu feek** - Que ce projet facilite votre lecture du Saint Coran 📖✨

---

*Documentation générée le 2025-01-11 - Version 1.0.0*

