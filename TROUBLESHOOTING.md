# 🔧 Guide de Dépannage - Erreur de Connexion Supabase

## ❌ Problème : "Failed to fetch" / "ERR_NAME_NOT_RESOLVED" en localhost

### 🔍 Diagnostic

L'erreur indique que votre ordinateur ne peut pas résoudre le nom de domaine Supabase :
```
Could not resolve host: kpzfzqxhtnevdojfhors.supabase.co
```

### ✅ Solutions à essayer

#### 1. **Vérifier votre connexion Internet**
```bash
ping google.com
```

#### 2. **Vérifier que le projet Supabase existe toujours**
- Allez sur https://supabase.com/dashboard
- Vérifiez que le projet `kpzfzqxhtnevdojfhors` existe toujours
- Si le projet a été supprimé ou renommé, l'URL a changé

#### 3. **Vérifier l'URL Supabase dans votre dashboard**
- Dans Supabase Dashboard → Settings → API
- Comparez l'URL avec celle dans votre `.env`
- Si différente, mettez à jour le `.env`

#### 4. **Tester la résolution DNS**
```bash
ping kpzfzqxhtnevdojfhors.supabase.co
# ou
nslookup kpzfzqxhtnevdojfhors.supabase.co
```

#### 5. **Vérifier les variables d'environnement**
```bash
# Vérifier que le fichier .env existe
cat .env

# Redémarrer le serveur de développement après modification du .env
npm run dev
```

#### 6. **Problème de proxy/VPN**
- Si vous êtes sur un réseau d'entreprise avec proxy
- Désactivez temporairement le proxy/VPN
- Ou configurez le proxy dans votre terminal

#### 7. **Vérifier le fichier hosts (macOS/Linux)**
```bash
cat /etc/hosts | grep supabase
# Si vous voyez une entrée qui bloque Supabase, commentez-la
```

#### 8. **Utiliser l'IP directement (temporaire)**
Si le DNS ne fonctionne pas, vous pouvez essayer de trouver l'IP :
```bash
dig kpzfzqxhtnevdojfhors.supabase.co
# Puis utiliser l'IP dans le .env (non recommandé pour la production)
```

### 🆘 Si rien ne fonctionne

1. **Vérifier l'URL Supabase en production**
   - Regardez dans les variables d'environnement de votre déploiement
   - Comparez avec votre `.env` local

2. **Créer un nouveau projet Supabase de test**
   - Créez un nouveau projet dans Supabase
   - Utilisez les nouvelles credentials dans `.env`

3. **Contacter le support Supabase**
   - Si le projet existe mais n'est pas accessible

### 📝 Notes

- Les variables d'environnement doivent commencer par `VITE_` pour être accessibles dans Vite
- Après modification du `.env`, **redémarrer le serveur de développement** est obligatoire
- Le fichier `.env` ne doit **jamais** être commité dans Git (déjà dans `.gitignore`)

