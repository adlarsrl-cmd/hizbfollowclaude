# Guide de Migration - Système Multi-utilisateurs + Groupes

## 🚀 Vue d'ensemble

Cette migration transforme HizbFollow d'une application mono-utilisateur vers un système multi-utilisateurs avec groupes, permissions granulaires et saisie personnelle.

## 📋 Ordre d'exécution

### 1. Migrations SQL (OBLIGATOIRE)

```sql
-- 1. Créer le système de groupes
\i supabase/migrations/patch_groups_system_complete.sql
```

### 2. Variables d'environnement

Aucune nouvelle variable requise. Les feature flags sont dans le code :

```typescript
// Dans useAppStore
enableGroups: true,
enableInvites: true, 
enablePersonalEntry: true
```

### 3. Redémarrage de l'application

```bash
npm run dev
```

## 🔧 Feature Flags

### Désactiver temporairement les nouvelles fonctionnalités

Si vous rencontrez des problèmes, vous pouvez désactiver les nouvelles fonctionnalités :

```typescript
// Dans src/stores/useAppStore.ts, ligne ~50
enableGroups: false,        // Désactive le système de groupes
enableInvites: false,       // Désactive les invitations
enablePersonalEntry: false, // Désactive la saisie personnelle
```

## 🔄 Rollback (Urgence uniquement)

⚠️ **ATTENTION** : Le rollback supprime TOUTES les données de groupes !

```sql
\i supabase/migrations/rollback_groups_system.sql
```

## 👥 Comptes de test

### Compte principal (Admin)
- **Email** : Votre compte actuel
- **Rôle** : Owner du groupe "Mardi" (créé automatiquement)
- **Permissions** : Toutes

### Créer des comptes de test

1. **Inscription normale** via l'interface
2. **Invitation** : Utilisez la page "Groupes" pour inviter par email
3. **Code d'accès** : Partagez le code généré lors de l'invitation

## 🏗️ Architecture

### Hiérarchie des rôles

1. **Owner** : Propriétaire du groupe
   - Peut tout faire dans le groupe
   - Ne peut pas être rétrogradé
   - Créé automatiquement à la création du groupe

2. **Manager** : Gestionnaire
   - Peut inviter/gérer les membres
   - Peut créer/modifier tous les participants
   - Peut voir toutes les données du groupe

3. **Member** : Membre
   - Peut voir les données du groupe
   - Peut saisir uniquement pour ses propres participants (si `can_write_self = true`)
   - Ne peut pas gérer les autres membres

4. **Viewer** : Observateur
   - Lecture seule
   - Ne peut rien modifier

### Système de permissions

```sql
-- Exemple de vérification RLS
SELECT * FROM participants 
WHERE group_id IN (
  SELECT group_id FROM group_members 
  WHERE user_id = auth.uid()
);
```

## 📊 Migration des données

### Données préservées

✅ **Tous les participants existants** → Groupe "Mardi"  
✅ **Toutes les entrées existantes** → Groupe "Mardi"  
✅ **Tous les snapshots** → Groupe "Mardi"  
✅ **Paramètres** → Groupe "Mardi"  
✅ **Historique complet** → Préservé  

### Nouvelles données

🆕 **Groupe "Mardi"** → Créé automatiquement  
🆕 **Vous êtes Owner** → Du groupe "Mardi"  
🆕 **Profil utilisateur** → Créé à la première connexion  

## 🧪 Tests de validation

### Test 1 : Connexion et groupes
1. Connectez-vous avec votre compte existant
2. Vérifiez que le groupe "Mardi" est sélectionné
3. Vérifiez que vous êtes "Propriétaire"

### Test 2 : Données existantes
1. Allez sur Dashboard → Vérifiez les stats
2. Allez sur Participants → Vérifiez la liste
3. Allez sur Analytics → Vérifiez les graphiques

### Test 3 : Nouveau groupe
1. Allez sur "Groupes"
2. Créez un groupe "Jeudi"
3. Basculez entre les groupes
4. Vérifiez que les données sont bien séparées

### Test 4 : Invitations
1. Dans un groupe, cliquez "Inviter"
2. Saisissez un email et choisissez un rôle
3. Copiez le code généré
4. Testez avec un autre compte

### Test 5 : Saisie personnelle
1. Créez un participant lié à votre compte
2. Allez sur "Ma saisie"
3. Saisissez une progression
4. Vérifiez dans Analytics

## 🚨 Problèmes connus et solutions

### Problème : "No active group"
**Cause** : Aucun groupe sélectionné  
**Solution** : Allez sur `/groups` et sélectionnez un groupe

### Problème : "Aucun participant" dans Ma saisie
**Cause** : Aucun participant lié à votre compte  
**Solution** : Demandez à un Manager de lier un participant à votre compte

### Problème : RLS bloque les requêtes
**Cause** : Permissions insuffisantes  
**Solution** : Vérifiez votre rôle dans le groupe

### Problème : Données manquantes après migration
**Cause** : Migration incomplète  
**Solution** : Re-exécutez `patch_groups_system_complete.sql`

## 📱 Nouvelles fonctionnalités

### Pages ajoutées
- `/groups` - Gestion des groupes
- `/me/entry` - Saisie personnelle

### Composants ajoutés
- `GroupSelector` - Sélecteur de groupe dans le header
- `GroupsPage` - Page de gestion des groupes
- `PersonalEntryPage` - Page de saisie personnelle

### Fonctionnalités
- **Multi-groupes** : Créez plusieurs groupes (Mardi, Jeudi, etc.)
- **Invitations** : Invitez par email avec code d'accès
- **Permissions** : Rôles granulaires par groupe
- **Saisie perso** : Chaque utilisateur peut saisir ses propres données
- **Isolation** : Données complètement séparées par groupe

## 🔐 Sécurité

### RLS (Row Level Security)
- ✅ Activée sur toutes les tables
- ✅ Policies par groupe et rôle
- ✅ Isolation complète des données
- ✅ Pas d'accès cross-groupe

### Validation
- ✅ Rôles validés côté base
- ✅ Permissions vérifiées à chaque requête
- ✅ Tokens d'invitation sécurisés
- ✅ Expiration des invitations (7 jours)

## 📞 Support

En cas de problème :

1. **Vérifiez les logs** : Console navigateur + logs Supabase
2. **Testez les permissions** : Vérifiez votre rôle dans le groupe
3. **Rollback si nécessaire** : Utilisez le script de rollback
4. **Feature flags** : Désactivez temporairement les nouvelles fonctionnalités

## ✅ Checklist de déploiement

- [ ] Migrations SQL exécutées
- [ ] Application redémarrée
- [ ] Connexion testée
- [ ] Groupe "Mardi" visible
- [ ] Données existantes présentes
- [ ] Nouveau groupe créé et testé
- [ ] Invitation testée
- [ ] Saisie personnelle testée
- [ ] Analytics fonctionnels
- [ ] Rollback testé (optionnel)

---

**🎉 Migration terminée !** Votre HizbFollow est maintenant multi-utilisateurs avec système de groupes complet.