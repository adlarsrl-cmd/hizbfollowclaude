# TODO - Améliorations et corrections

## Tajweed - Corrections à faire

### Problème avec les diacritiques silencieux (tanwin)
- **Problème** : Le tanwin (ً) dans "هُدًى" (sourate 2 verset 2) ne s'affiche pas en gris même avec le style inline `color: #AAAAAA !important`
- **Contexte** : Le tanwin est un caractère combinant Unicode qui doit être coloré en gris pour indiquer qu'il est silencieux dans le contexte de `idgham_wo_ghunnah`
- **Tentatives** : 
  - Utilisation de `<span>` avec style inline
  - Ajout de classe CSS `silent-diacritic`
  - CSS ciblant les caractères combinants
- **Status** : À investiguer - problème potentiel de rendu des caractères combinants par le navigateur
- **Solution possible** : Utiliser une approche différente (caractères Unicode alternatifs, SVG, ou autre méthode de rendu)

## UI/UX

### Bouton de connexion manquant sur la page Coran ✅
- **Problème** : Quand on est déconnecté, on peut voir le Coran mais il n'y a pas de bouton "Log in" visible
- **Status** : ✅ Corrigé - Bouton "Se connecter" ajouté dans le header de la page Coran

### Sauvegarde et suivi de la lecture dans le Coran ✅
- **Problème** : Quand on enregistre sa lecture, on perd la position quand on change de mode (Hizb/Page/Sourate)
- **Status** : ✅ Corrigé - La position est sauvegardée dans localStorage et restaurée automatiquement :
  - Sauvegarde de la position (verse_key, hizb, page, sourate) lors de l'enregistrement
  - Restauration automatique au chargement et lors du changement de mode
  - Mise en évidence visuelle du verset sauvegardé (fond bleu, bordure, icône ✓)
  - Scroll automatique vers le verset sauvegardé

