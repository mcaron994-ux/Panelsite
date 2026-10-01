# SITE — Création Expert | Studio

Site web professionel de style Discord pour la vente de services (serveurs Discord & bots).

## 🚀 Lancer le site
Ouvrez simplement `index.html` dans un navigateur. Aucun serveur requis.
(Pour une meilleure expérience : `python -m http.server` ou VS Code Live Server.)

## 📄 Pages
- `index.html` — Page d'accueil : hero, 3 offres (gratuit / $1 / $2), FAQ.
- `dashboard.html` — Espace utilisateur : mes commandes, paramètres du compte, panel admin.

## 🔐 Compte & Panel Admin
1. L'utilisateur **crée un compte** (données stockées en local via localStorage).
2. **Les commandes sont verrouillées** tant que l'utilisateur n'est pas connecté.
3. Dans **Paramètres du compte**, entrez le code **`admin45`** pour débloquer le **Panel Admin**.
   - Le panel liste toutes les soumissions avec option d'affichage dès soumission (formulaire + date + heure + détails complet).

## 💸 Paiements
- Paiement intégré via **PayPal** (boutons officiels du SDK PayPal).
- Configurez votre Client ID dans `js/paypal.js` → `Payments.config.clientId`.
- Offre 1 : gratuit (aucun paiement), Offre 2 : **$1.00**, Offre 3 : **$2.00**.
- Extensible : ajouter Stripe / crypto etc. en suivant le même modèle dans `js/paypal.js`.

## 🗂️ Structure
```
index.html          — page d'accueil
dashboard.html      — profil + panel admin
css/style.css       — thème Discord sombre
js/app.js           — auth, formulaires, soumissions
js/dashboard.js     — dashboard utilisateur + admin
js/paypal.js        — intégration PayPal
```
