// Script utilitaire pour insérer des exemples de questions/réponses dans Firestore
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

// Utilitaire pour promouvoir un utilisateur en admin
export async function promoteToAdmin(email) {
  // Cherche l'utilisateur par email dans la collection users
  const usersSnap = await getDocs(query(collection(db, "users"), where("email", "==", email)));
  if (usersSnap.empty) throw new Error("Utilisateur non trouvé");
  const userDoc = usersSnap.docs[0];
  await setDoc(userDoc.ref, { role: "admin" }, { merge: true });
  return true;
}

export async function seedQuestions() {
  const questions = [
    {
      text: "Quelle est la capitale de la Tunisie ?",
      choices: ["Tunis", "Sfax", "Sousse", "Bizerte"],
      answer: 0, // index du choix correct
      difficulty: "facile",
      category: "culture générale"
    },
    {
      text: "Combien y a-t-il de bits dans un octet ?",
      choices: ["4", "8", "16", "32"],
      answer: 1,
      difficulty: "facile",
      category: "informatique"
    },
    {
      text: "Qui a inventé le World Wide Web ?",
      choices: ["Bill Gates", "Tim Berners-Lee", "Steve Jobs", "Elon Musk"],
      answer: 1,
      difficulty: "moyen",
      category: "informatique"
    }
  ];
  for (const q of questions) {
    // Vérifie si une question identique existe déjà (même texte)
    const qSnap = await getDocs(query(collection(db, "questions"), where("text", "==", q.text)));
    if (qSnap.empty) {
      await addDoc(collection(db, "questions"), q);
    }
  }
  return true;
}
