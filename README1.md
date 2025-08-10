# Campus Quiz Clash – Documentation Complète

## 🎯 Objectif du projet
Campus Quiz Clash est une plateforme web de quiz universitaire permettant :
- L’authentification sécurisée par email universitaire
- La gestion de profils étudiants (université, classe, avatar)
- La participation à des quiz quotidiens
- Le classement (leaderboard) entre étudiants
- L’extension future vers la gestion d’équipes, la modération/admin, et les récompenses

---

## 🛠️ Fonctionnalités réalisées à ce jour

### 1. **Authentification Firebase**
- Inscription et connexion via email/mot de passe (Firebase Auth)
- Vérification obligatoire de l’email (envoi automatique d’email de vérification)
- Restriction : seuls les emails @istic.ucar.tn sont acceptés
- Blocage de la connexion tant que l’email n’est pas vérifié

### 2. **Gestion du profil utilisateur (Firestore)**
- Création automatique du document utilisateur à l’inscription
- Champs : email, university, classroom, avatar, role, createdAt, verified
- Onboarding obligatoire après inscription pour compléter le profil (sélection université, classe, avatar)
- Redirections automatiques selon l’état du profil (onboarding ou home)

### 3. **Sécurité et règles Firestore**
- Règles : lecture/écriture autorisée uniquement pour les utilisateurs authentifiés (`request.auth != null`)
- Les clés Firebase sont actuellement en dur (à sécuriser en prod)

### 4. **Expérience utilisateur**
- Formulaires d’inscription, connexion, onboarding ergonomiques
- Messages d’erreur et loaders
- Page Home affichant le profil connecté + bouton déconnexion

### 5. **Quiz**
- Bouton “Commencer le quiz” sur la page Home
- Page Quiz interactive :
  - Chargement dynamique des questions Firestore
  - Affichage question + choix multiples
  - Validation de la réponse, correction immédiate, passage à la suivante
  - Score final affiché à la fin
- Script de seed pour insérer des questions d’exemple sans doublons

### 6. **Structure Firestore**
- Collections : `users`, `questions` (+ prévu : `leaderboards`, `universities`, `classrooms`)
- Script utilitaire pour peupler la collection `questions`

---

## 📦 Stack technique
- **React** (Vite)
- **Firebase** (Auth, Firestore)
- **React Router v6**
- **ESLint** (configuration de base)

---

## 🚩 Prochaines étapes recommandées
1. **Sauvegarder le score utilisateur à la fin du quiz** (dans Firestore, collection `leaderboards`)
2. **Créer la page Leaderboard** (classement des meilleurs scores)
3. **Page Admin** (ajout/suppression de questions via l’interface)
4. **Gestion des équipes et des modes de jeu** (future extension)
5. **Sécuriser les clés Firebase via variables d’environnement**
6. **Renforcer les règles Firestore par rôle (admin/étudiant)**
7. **Améliorer l’UX/UI : avatars, transitions, feedbacks, etc.**

---

## 📖 Pour démarrer le projet
1. Cloner le repo, installer les dépendances (`npm install`)
2. Configurer les variables Firebase dans `src/firebase.js`
3. Lancer le projet (`npm run dev`)
4. Utiliser le bouton “Peupler Firestore avec des questions d’exemple” sur la page Home si besoin
5. Créer un compte avec un email universitaire valide (@istic.ucar.tn)
6. Compléter l’onboarding, puis commencer le quiz

---

## 📝 Notes importantes
- Le code est découpé par pages : `Login.jsx`, `Onboarding.jsx`, `Home.jsx`, `Quiz.jsx`, etc.
- Les hooks React doivent toujours être déclarés en haut des composants
- La seed des questions ne crée jamais de doublons
- Le projet est prêt à être étendu (admin, leaderboard, etc.)

---

## 👀 Pour aller plus loin
- Voir la feuille de route dans ce README pour les prochaines features
- Tout nouveau dev peut continuer à partir d’ici : le socle est stable et documenté
- Pour toute question, voir le code ou demander à l’équipe

---

*Document généré automatiquement pour garantir la reprise facile du projet par tout développeur.*
