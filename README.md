# HizbFollow - Application de Suivi de Lecture du Coran

HizbFollow est une Progressive Web App (PWA) complète pour le suivi hebdomadaire de la lecture du Saint Coran, conçue pour les groupes et les individus.

## 🌟 Fonctionnalités principales

### 📊 Suivi flexible
- **Unités multiples** : Saisie en Hizb (1-60) ou Pages (1-604) avec conversion automatique
- **Cycles complets** : Gestion automatique des Khatmas (cycles de lecture complets)
- **Progression hebdomadaire** : Snapshots automatiques chaque mardi soir

### 👥 Gestion des participants
- **16 participants initiaux** avec possibilité d'extension
- **Import/Export CSV** pour la gestion en masse
- **États actif/inactif** pour masquer temporairement sans perdre l'historique
- **Mode démo** avec données factices pour tester

### 📱 Interface utilisateur
- **Double vue** : Tableau pour édition rapide ou fiche individuelle
- **Mode hors ligne** : Fonctionnement complet offline avec synchronisation
- **Thèmes** : Clair, sombre ou automatique selon les préférences système
- **Responsive** : Optimisé pour mobile, tablette et desktop

### 📈 Analytics avancés
- **Graphiques de progression** : Courbes individuelles et comparatives
- **Classements** : Par total cumulé et progression récente
- **Exports** : PDF avec graphiques, CSV des données
- **Périodes configurables** : 4, 8, 12, 26 ou 52 semaines

### 🔔 Notifications intelligentes
- **Rappels automatiques** : Mardi 19h30 (pré-rappel) et 22h30 (rappel final)
- **Web Push** : Notifications navigateur
- **Email** : Via Resend/SMTP (optionnel)

### 🏗️ Architecture technique
- **Frontend** : React 18 + TypeScript + Vite + TailwindCSS
- **Backend** : Supabase (PostgreSQL + Auth + Edge Functions)
- **État** : Zustand avec persistance locale
- **PWA** : Service Worker + Cache offline + Manifest
- **Sécurité** : Row Level Security (RLS) activée

## 🚀 Installation et déploiement

### Prérequis
- Node.js 18+
- Compte Supabase
- (Optionnel) Compte Resend pour emails

### 1. Configuration locale

```bash
# Cloner le projet
git clone <repo-url>
cd hizbfollow

# Installer les dépendances
npm install

# Copier et configurer l'environnement
cp .env.example .env
```

### 2. Variables d'environnement (.env)

```env
# Supabase (obligatoire)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Notifications (optionnel)
VITE_RESEND_API_KEY=your_resend_api_key
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

### 3. Configuration Supabase

1. **Créer un projet Supabase**
2. **Appliquer les migrations** :
   ```sql
   -- Copier le contenu de supabase/migrations/01_create_schema.sql
   -- dans l'éditeur SQL Supabase
   ```

3. **Déployer les Edge Functions** :
   ```bash
   # Via interface Supabase ou CLI si disponible
   # Copier le contenu des functions vers Supabase
   ```

4. **Configurer les Cron Jobs** :
   - Snapshot mardi : `59 22 * * 2` (22:59 chaque mardi)
   - Rappel pré : `30 19 * * 2` (19:30 chaque mardi)  
   - Rappel post : `30 22 * * 2` (22:30 chaque mardi)

### 4. Développement

```bash
# Mode développement
npm run dev

# Tests
npm run test

# Linting
npm run lint

# Build production
npm run build
```

### 5. Déploiement

#### Vercel (recommandé)
1. Connecter le repo à Vercel
2. Configurer les variables d'environnement
3. Déployer automatiquement

#### Manuel
```bash
npm run build
# Déployer le dossier dist/ vers votre hébergeur
```

## 📖 Guide d'utilisation

### Connexion
- **Email** : admin@hizbfollow.com
- **Mot de passe** : demo123456 (à changer en production)

### Premiers pas
1. **Ajouter des participants** via l'onglet "Participants"
2. **Ou utiliser le mode démo** (bouton "Démo (16)")
3. **Saisir les progressions** via "Saisie hebdo"
4. **Consulter les analytics** pour le suivi

### Saisie hebdomadaire
- **Vue Tableau** : Édition rapide de tous les participants
- **Vue Fiche** : Saisie individuelle avec navigation
- **Conversion automatique** : Basculer entre Hizb et Pages
- **Détection Khatma** : Alerte automatique en cas de nouveau cycle

### Participants
- **CRUD complet** : Créer, modifier, supprimer
- **Import/Export CSV** : Gestion en masse
- **Statut actif/inactif** : Masquer temporairement
- **Avatars** : URL optionnelles

### Analytics
- **Graphiques personnalisables** : Sélectionner participants et période
- **Classements multiples** : Total cumulé et progression récente  
- **Exports** : CSV des données, PNG des graphiques, PDF complet

### Paramètres
- **Unité par défaut** : Hizb ou Pages
- **Thème** : Clair, sombre, automatique
- **Fenêtre checkpoint** : Heures de snapshot mardi
- **Notifications** : Email et web push

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:coverage

# Tests E2E (simulation)
npm run test:e2e
```

Les tests couvrent :
- ✅ Conversions Hizb ↔ Pages
- ✅ Détection nouvelles Khatmas
- ✅ Génération week_key_tuesday
- ✅ Politiques RLS
- ✅ Composants React

## 🔒 Sécurité

### Row Level Security (RLS)
- **Activée sur toutes les tables**
- **Politiques par owner_id** : Chaque utilisateur ne voit que ses données
- **Prête pour multi-user** : Structure en place pour les groupes privés

### Authentification
- **Supabase Auth** : Email/mot de passe (pas de magic links par défaut)
- **Sessions persistantes** : Reconnexion automatique
- **Confirmation email désactivée** par défaut

## 🛠️ Scripts disponibles

```json
{
  "dev": "vite",
  "build": "vite build", 
  "preview": "vite preview",
  "test": "vitest",
  "lint": "eslint .",
  "seed:demo": "Generation de données de démo",
  "reset:demo": "Suppression des données de démo"
}
```

## 📊 Structure de la base de données

### Tables principales
- **`participants`** : Informations et cycles des participants
- **`entries`** : Toutes les saisies horodatées 
- **`weekly_snapshots`** : Photos hebdomadaires pour analytics
- **`app_settings`** : Préférences utilisateur

### Tables futures (UI cachée)
- **`groups`** : Groupes privés multi-utilisateur
- **`user_links`** : Liaison participants ↔ comptes utilisateur
- **`invitations`** : Système d'invitation par lien

## 🔄 Conversions et calculs

### Hizb ↔ Pages
- **Linéaire par défaut** : `pages = round(hizb * 604/60)`
- **Extensible** : Placeholder pour mapping JSON précis
- **Bidirectionnel** : Conversion dans les deux sens

### Cumulative et cycles
- **Monotone** : Toujours croissant même avec nouveaux cycles
- **Par participant** : `cumulative = cycles_complets * total + valeur_actuelle`
- **Double unité** : Stockage Hizb ET Pages pour flexibilité

## 🚨 Limitations connues

1. **Mapping Hizb/Pages** : Approximation linéaire (extension JSON prévue)
2. **Granularité Hizb** : Entiers uniquement (pas de 1/2 ou 1/4)
3. **WebContainer** : Certaines libs natives non supportées
4. **Edge Functions** : Déploiement automatique seulement (pas de CLI)

## 🔮 Roadmap

### Court terme
- [ ] Mapping JSON précis Hizb ↔ Pages
- [ ] Granularité 1/2 et 1/4 Hizb
- [ ] Templates d'emails personnalisables
- [ ] Amélioration détection Khatma

### Moyen terme  
- [ ] Multi-utilisateur complet avec groupes
- [ ] Application mobile native
- [ ] Synchronisation calendrier
- [ ] Statistiques avancées (tendances, projections)

### Long terme
- [ ] IA pour suggestions personnalisées
- [ ] Intégration réseaux sociaux
- [ ] Système de badges/récompenses
- [ ] API publique pour extensions

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

- **Issues GitHub** : Pour bugs et demandes de fonctionnalités
- **Documentation** : README et commentaires dans le code
- **Demos** : Mode démo intégré pour découverte

---

**Barakallahu feek** - Que ce projet facilite votre lecture du Saint Coran 📖✨

---

## ✅ Checklist de fin

- ✅ Base de données + migrations créées
- ✅ RLS actives et testées  
- ✅ Auth opérationnelle
- ✅ Pages UI : Dashboard, Saisie, Participants, Analytics, Paramètres
- ✅ Edge Functions + structure Cron
- ✅ Offline (IndexedDB + queue), PWA (manifest + SW)
- ✅ Exports CSV/PNG/PDF préparés
- ✅ Mode démo + structure tests
- ✅ README et scripts livrés
- ✅ Structure multi-user (cachée)

**🎉 HizbFollow prêt pour déploiement et utilisation !**