# HizbFollow — Feuille de route & améliorations

> Analyse complète des améliorations à apporter pour faire de HizbFollow une app prête à être publiée sur l'Apple App Store.

---

## Table des matières

1. [App Store (requis)](#-app-store-requis-pour-publication)
2. [Auth & Onboarding](#-auth--onboarding)
3. [Lecteur Coran](#-lecteur-coran)
4. [Suivi & Saisie](#-suivi--saisie)
5. [Communauté & Groupes](#-communauté--groupes)
6. [Analytics](#-analytics)
7. [Design & UI](#-design--ui)
8. [UX & Quality of Life](#-ux--quality-of-life)
9. [Notifications](#-notifications)
10. [Base de données & Backend](#-base-de-données--backend)
11. [Performance](#-performance)
12. [Accessibilité](#-accessibilité)
13. [Internationalisation](#-internationalisation)
14. [Monétisation](#-monétisation)
15. [Tech debt & Code quality](#-tech-debt--code-quality)
16. [Roadmap suggérée](#-roadmap-suggérée)

---

**Légende priorités**
- 🔴 Critique — bloquant pour l'App Store ou fonctionnalité essentielle
- 🟠 Important — amélioration significative attendue par les utilisateurs
- 🟡 Moyen — valeur ajoutée notable, à planifier
- 🟢 Nice to have — polish ou différenciateur optionnel

**Légende statut**
- ✅ Terminé — implémenté et pushé
- 🔄 En cours — partiellement implémenté ou en cours de développement
- (vide) — pas encore commencé

---

## 🍎 App Store (requis pour publication)

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 1 | **Capacitor / React Native Wrapper** — convertir le PWA en app native iOS via Capacitor.js (chemin le plus rapide depuis React) | 🔴 Critique | |
| 2 | **Privacy Policy** — page légale obligatoire (traitement des données, comptes utilisateurs) | 🔴 Critique | |
| 3 | **Terms of Service** — CGU accessibles depuis l'app | 🔴 Critique | |
| 4 | **Icône app** — 1024×1024px + toutes les tailles requises (20, 29, 40, 60, 76, 83.5px…) | 🔴 Critique | 🔄 En cours — icônes PWA ajoutées, tailles App Store natives pas encore générées |
| 5 | **Splash screen** — animé aux couleurs de l'app, avec logo centré | 🔴 Critique | |
| 6 | **Sign in with Apple** — obligatoire si un autre login tiers est proposé (règle App Store 4.8) | 🔴 Critique | |
| 7 | **App Store screenshots** — 6.7", 6.1", iPad Pro × 3 langues minimum (FR, AR, EN) | 🟠 Important | |
| 8 | **Deep links (Universal Links)** — pour les invitations par email et les liens de reset password | 🟠 Important | |
| 9 | **Conformité RGPD** — consentement explicite, suppression de compte effective en ≤ 30 jours | 🟠 Important | |
| 10 | **Safe area** — prise en compte du Dynamic Island, home indicator, notch sur tous les modèles | 🟠 Important | |

---

## 🔐 Auth & Onboarding

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 11 | **Onboarding 3 écrans** — "Suis ta lecture", "Rejoins un groupe", "Lis le Coran" avec illustrations et CTA | 🔴 Critique | |
| 12 | **Sign in with Apple / Google** — réduction de friction maximale au premier lancement | 🟠 Important | |
| 13 | **Vérification email non-bloquante** — permettre d'explorer l'app sans email vérifié, bloquer uniquement les actions sensibles | 🟡 Moyen | |
| 14 | **Avatar photo** — upload depuis la galerie photo via Capacitor Camera plugin | 🟡 Moyen | |
| 15 | **Biométrie** — Face ID / Touch ID pour déverrouiller l'app (connexion rapide au relancement) | 🟡 Moyen | |
| 16 | **Mode invité** — accéder au lecteur Coran sans compte, puis prompt de création contextuel | 🟡 Moyen | |

---

## 📖 Lecteur Coran

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 17 | **Marque-pages** — sauvegarder des versets favoris avec tag (mémorisation, référence, étude) | 🔴 Critique | |
| 18 | **Audio** — lecture audio verset par verset avec Mishary Alafasy (URL API déjà dans `quranApi.ts`) | 🔴 Critique | |
| 19 | **Mode mémorisation** — cacher une partie du texte progressivement, réciter puis révéler | 🟠 Important | |
| 20 | **Recherche dans le Coran** — l'endpoint `/search` est dans `quranApi.ts` mais sans UI | 🟠 Important | |
| 21 | **Mode nuit dédié** — fond sépia ou noir pur, luminosité adaptée à la lecture nocturne | 🟠 Important | |
| 22 | **Enregistrement de position automatique** — mémoriser la dernière page lue sans action manuelle | 🟠 Important | ✅ Terminé — sync lecture implémentée, position sauvegardée automatiquement à la lecture |
| 23 | **Translittération** — romanisation sous le texte arabe (utile pour les débutants) | 🟡 Moyen | |
| 24 | **Choix du récitateur** — Alafasy, Soudays, Abdul Basit, Minshawi (déjà dans les constantes API) | 🟡 Moyen | |
| 25 | **Mode plein écran** — cacher la nav pendant la lecture avec geste pour la faire réapparaître | 🟡 Moyen | |
| 26 | **Partage de verset** — image partageable (verset + numéro + fond islamique) via Share API native | 🟡 Moyen | |
| 27 | **Surah info** — afficher lieu de révélation, nombre de versets, thème avant de lire | 🟢 Nice | |
| 28 | **Annotations personnelles** — ajouter une note sur un verset (stockée en DB) | 🟢 Nice | |

---

## 📊 Suivi & Saisie

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 29 | **Widget iOS** — afficher le hizb actuel + objectif hebdo directement sur l'écran d'accueil (WidgetKit) | 🟠 Important | |
| 30 | **Streak** — compteur de semaines consécutives avec objectif atteint (motivation et gamification) | 🟠 Important | |
| 31 | **Objectif personnalisé** — chaque participant définit son propre rythme (7, 14, 30 hizb/sem) au lieu de 2 options fixes | 🟠 Important | |
| 32 | **Saisie rapide depuis la notif** — "Où en es-tu cette semaine ?" → saisir sans ouvrir l'app (Notification Content Extension) | 🟠 Important | |
| 33 | **Historique graphique par participant** — courbe de progression sur 6 mois cliquable | 🟠 Important | |
| 34 | **Khatma medals** — badge visuel à chaque khatma complétée, galerie de médailles personnelle | 🟡 Moyen | |
| 35 | **Import depuis le lecteur Coran** — bouton "Enregistrer ma position" qui pré-remplit la saisie hebdo | 🟡 Moyen | ✅ Terminé — position picker dans le lecteur + sync automatique vers `entries` à la sauvegarde |
| 36 | **Pause / absence** — marquer une semaine comme "pause" sans casser les stats et le streak | 🟡 Moyen | |
| 37 | **Saisie en page** — basculer entre hizb et page dans la saisie perso (DB prête, UX incomplète) | 🟡 Moyen | |
| 38 | **Prédiction de fin de khatma** — "À ce rythme tu finiras dans X semaines" basé sur la moyenne glissante | 🟢 Nice | |

---

## 👥 Communauté & Groupes

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 39 | **Envoi d'invitation par email** — le `// TODO: Send email with join code` dans `useAppStore.ts` est prioritaire | 🔴 Critique | |
| 40 | **Classement (leaderboard)** — tableau de progression avec rang et delta hebdo visible par tous les membres | 🟠 Important | |
| 41 | **Félicitations automatiques** — notification push "🌟 Untel vient de terminer une khatma !" dans le groupe | 🟠 Important | |
| 42 | **Chat / commentaire de groupe** — fil de discussion léger (1 message type "résumé hebdo du groupe") | 🟡 Moyen | |
| 43 | **Groupes multiples** — un utilisateur peut appartenir à plusieurs groupes (famille + mosquée) | 🟡 Moyen | ✅ Terminé — sync cross-groupes complète via `user_id` sur `entries` et `ramadan_entries` ; RLS et calculs de stats adaptés |
| 44 | **Profil public** — page profil visible par les membres du groupe (stats, khatmas, streak) | 🟡 Moyen | |
| 45 | **Rappel collectif** — le manager peut envoyer un rappel push/email aux membres qui n'ont pas saisi | 🟡 Moyen | |
| 46 | **Khatma collective** — objectif de groupe (ex : "finir 1 Coran à 10 ensemble pour le Ramadan") | 🟢 Nice | |

---

## 📈 Analytics

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 47 | **Vue mobile Analytics** — la page est cramped sur mobile, refaire en cards scrollables empilées | 🟠 Important | |
| 48 | **Rapport PDF hebdo** — générer un résumé PDF du groupe (nom, progression, khatmas) | 🟠 Important | |
| 49 | **Graphique de tendance** — ligne de tendance sur 12 semaines glissantes | 🟡 Moyen | |
| 50 | **Comparaison Ramadan vs période normale** — différencier les périodes dans les stats | 🟡 Moyen | |
| 51 | **Stats personnelles enrichies** — moyenne/semaine, meilleure semaine, total de pages lues à vie | 🟡 Moyen | |
| 52 | **Heatmap annuelle** — calendrier type GitHub avec cases colorées par intensité de lecture | 🟢 Nice | |

---

## 🎨 Design & UI

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 53 | **Design system cohérent** — palette de couleurs, espacements et typographies centralisés dans un fichier de tokens | 🔴 Critique | |
| 54 | **Loading states** — squelettes animés sur toutes les pages (Analytics et MonthlyEntries ont des spinners bruts) | 🟠 Important | |
| 55 | **Empty states** — illustrations SVG pour les états vides (pas de groupe, pas de participants, pas d'entrées) | 🟠 Important | |
| 56 | **Micro-animations** — transitions de page (fade), feedback tactile sur les boutons, confetti sur khatma | 🟠 Important | |
| 57 | **Illustrations onboarding** — visuels custom pour les 3 écrans d'introduction | 🟠 Important | |
| 58 | **Icône app** — logo professionnel (voir prompt ChatGPT dans le repo) | 🔴 Critique | |
| 59 | **Dashboard redesign** — cartes KPI plus expressives, hiérarchie visuelle claire, graphique plus lisible | 🟡 Moyen | |
| 60 | **Légende tajweed enrichie** — afficher les mots arabes correspondant à chaque règle, pas seulement le nom FR | 🟡 Moyen | |
| 61 | **Mode paysage Coran** — layout optimisé en orientation landscape sur iPad et iPhone Plus | 🟡 Moyen | |
| 62 | **Typographie système** — SF Pro pour les textes FR (via `-apple-system`), Amiri Quran pour l'arabe | 🟢 Nice | |

---

## ✨ UX & Quality of Life

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 63 | **Haptic feedback** — vibration légère sur save, khatma, erreur (Capacitor Haptics plugin) | 🟠 Important | |
| 64 | **Pull-to-refresh** — geste natif pour actualiser les données (sur toutes les listes) | 🟠 Important | |
| 65 | **Undo sur suppression** — snackbar "Annuler" (5 sec) après avoir supprimé un participant ou une entrée | 🟠 Important | |
| 66 | **Confirmations de suppression** — modale de confirmation avant toute action irréversible | 🟠 Important | |
| 67 | **Animation de transition Coran** — page suivante glisse depuis la droite / gauche (RTL) | 🟡 Moyen | |
| 68 | **Mode hors-ligne explicite** — message clair + liste des fonctionnalités disponibles sans réseau | 🟡 Moyen | |
| 69 | **Recherche globale** — chercher un participant, un verset, une sourate depuis n'importe où | 🟡 Moyen | |
| 70 | **Raccourcis clavier iPad** — ⌘+N (nouveau), ⌘+S (sauvegarder), ⌘+F (rechercher) | 🟡 Moyen | |
| 71 | **Supprimer les `alert()` natifs** — remplacer par des modales intégrées avec design cohérent | 🟠 Important | |
| 72 | **Feedback sonore** — son discret sur khatma (optionnel, désactivable dans les réglages) | 🟢 Nice | |
| 73 | **Onboarding contextuel** — tooltips au premier accès de chaque section clé | 🟢 Nice | |

---

## 🔔 Notifications

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 74 | **Push notifications natives** — rappel hebdo "N'oublie pas ta saisie" (vendredi ou configurable) | 🔴 Critique | |
| 75 | **Notification khatma** — push immédiat quand un membre du groupe termine une khatma | 🟠 Important | |
| 76 | **Récapitulatif hebdo** — push dimanche soir avec le résumé de progression du groupe | 🟠 Important | |
| 77 | **Préférences notifs** — activer/désactiver chaque type de notification individuellement | 🟠 Important | |
| 78 | **Email digest** — email optionnel hebdo avec le tableau de progression du groupe (Resend / Supabase Edge Function) | 🟡 Moyen | |

---

## 🗄️ Base de données & Backend

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 79 | **Audit RLS complet** — vérifier que toutes les tables ont des Row Level Security policies correctes et exhaustives | 🔴 Critique | 🔄 En cours — policies `entries`, `ramadan_entries`, `group_members` revues et corrigées ; autres tables pas encore auditées |
| 80 | **Index DB** — ajouter des index sur `entries(participant_id, recorded_at)` et `weekly_snapshots(group_id, week_key_tuesday)` | 🟠 Important | |
| 81 | **Edge Functions** — déléguer au serveur les opérations sensibles (invitation email, calcul snapshots, push notifs) | 🟠 Important | |
| 82 | **Soft delete** — les suppressions marquent `deleted_at` au lieu de supprimer physiquement les lignes | 🟡 Moyen | |
| 83 | **Pagination** — `fetchEntries` et `fetchParticipants` ne sont pas paginés (problème à grande échelle) | 🟡 Moyen | |
| 84 | **Export complet** — l'owner peut exporter toutes les données de son groupe en JSON ou CSV | 🟡 Moyen | |
| 85 | **Audit log étendu** — `audit_weekly_snapshots` existe, l'étendre à toutes les mutations sensibles | 🟡 Moyen | |
| 86 | **Retry avec backoff** — retry automatique exponentiel sur les erreurs réseau côté client | 🟡 Moyen | |
| 87 | **Quotas par plan** — limiter à X participants / X groupes selon le tier (préparation monétisation) | 🟢 Nice | |

---

## ⚡ Performance

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 88 | **Code splitting** — lazy import de chaque page via `React.lazy()` (QuranReaderPage fait 2083 lignes) | 🟠 Important | |
| 89 | **Cache Quran API persisté** — stocker le cache `quranApi.ts` en IndexedDB plutôt qu'en mémoire vive | 🟠 Important | |
| 90 | **Virtualisation des longues listes** — `MonthlyEntriesPage` et `AnalyticsPage` avec `@tanstack/react-virtual` | 🟡 Moyen | |
| 91 | **Images optimisées** — WebP, lazy loading, srcset responsive pour les avatars | 🟡 Moyen | |
| 92 | **Bundle size audit** — analyser avec `vite-bundle-visualizer`, supprimer les dépendances inutiles | 🟡 Moyen | |
| 93 | **Prefetching Coran** — précharger la page suivante pendant que l'utilisateur lit la page courante | 🟢 Nice | |

---

## ♿ Accessibilité

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 94 | **Labels ARIA** — tous les boutons icônes doivent avoir un `aria-label` descriptif | 🟠 Important | |
| 95 | **Contraste couleurs** — vérifier le ratio de contraste WCAG AA sur tous les thèmes (light/dark) | 🟠 Important | |
| 96 | **Taille minimale des tap targets** — 44×44pt partout (Apple Human Interface Guidelines) | 🟠 Important | |
| 97 | **Support VoiceOver** — navigation complète au lecteur d'écran iOS (test sur device réel) | 🟡 Moyen | |
| 98 | **Dynamic Type** — respecter les préférences de taille de texte système iOS | 🟡 Moyen | |

---

## 🌍 Internationalisation

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 99 | **Arabe (UI)** — traduire l'interface en arabe avec layout RTL complet | 🟠 Important | |
| 100 | **Anglais (UI)** — traduction anglaise pour toucher la diaspora non-francophone | 🟠 Important | |
| 101 | **Framework i18n** — intégrer `react-i18next` pour gérer les traductions proprement | 🟠 Important | |
| 102 | **Calendrier hégirien** — afficher les dates en calendrier islamique (option dans les réglages) | 🟡 Moyen | |
| 103 | **Heures de prière** — intégrer l'API Aladhan pour afficher les heures locales (contextuel, optionnel) | 🟢 Nice | |

---

## 💰 Monétisation

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 104 | **Plan gratuit / Pro** — gratuit : 1 groupe, 10 participants / Pro : illimité + export + PDF | 🟡 Moyen | |
| 105 | **In-App Purchase** — abonnement mensuel / annuel via StoreKit (Capacitor Purchases plugin) | 🟡 Moyen | |
| 106 | **Groupe famille gratuit** — modèle freemium avec groupes familiaux (≤5 membres) toujours gratuits | 🟢 Nice | |

---

## 🔧 Tech debt & Code quality

| # | Amélioration | Priorité | Statut |
|---|---|---|---|
| 107 | **Tests unitaires** — `vitest` pour les fonctions critiques (utils, calculs hizb, khatma detection) | 🟠 Important | |
| 108 | **Tests E2E** — `Playwright` pour les flows critiques (login → saisie → khatma → analytics) | 🟡 Moyen | |
| 109 | **Découper `useAppStore`** — 1322 lignes à diviser en stores thématiques (authStore, groupStore, entryStore) | 🟡 Moyen | |
| 110 | **Découper `MonthlyEntriesPage`** — 1172 lignes à extraire en sous-composants réutilisables | 🟡 Moyen | |
| 111 | **Supprimer les `alert()` natifs** — remplacer par le système de toasts existant (déjà dans le codebase) | 🟠 Important | |
| 112 | **Typage strict** — éliminer les `as any` restants dans le code | 🟡 Moyen | |
| 113 | **Error boundaries par page** — wrapper chaque route dans un `ErrorBoundary` pour éviter les crashes silencieux | 🟠 Important | |

---

## 🗺️ Roadmap suggérée

### Phase 1 — MVP App Store *(~2 mois)*
> Objectif : app publiable sur l'App Store

- `#1` Wrapper Capacitor
- `#2–3` Privacy Policy + CGU
- `#4–6` Icône, splash, Sign in with Apple
- `#9–10` RGPD + Safe area
- `#11` Onboarding 3 écrans
- `#39` Envoi d'emails d'invitation
- `#53` Design system / tokens
- `#58` Icône professionnelle
- `#71, 111, 113` Nettoyage alerts + Error boundaries
- `#74` Push notifications natives
- `#79` Audit RLS complet

### Phase 2 — Engagement *(~1 mois)*
> Objectif : rétention et valeur perçue

- `#17–18` Audio + Marque-pages Coran
- `#30–31` Streak + objectif personnalisé
- `#40–41` Leaderboard + félicitations khatma
- `#47` Analytics mobile refactorisé
- `#54–56` Skeletons + empty states + micro-animations
- `#63–66` Haptic, pull-to-refresh, undo, confirmations

### Phase 3 — Scale & Polish *(~1 mois)*
> Objectif : croissance internationale + qualité production

- `#99–101` i18n (arabe + anglais)
- `#88–92` Performance (code splitting, cache, virtualisation)
- `#94–98` Accessibilité
- `#80–81` Index DB + Edge Functions
- `#104–105` Monétisation
- `#107–108` Tests unitaires + E2E

---

*Généré le 21 février 2026 — 113 améliorations identifiées — Mis à jour le 22 février 2026*
