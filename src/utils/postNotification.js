// Utility to post a notification to Firestore
// Usage: node src/utils/postNotification.js "Title" "Message" "type" "YYYY-MM-DD"
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "../firebase";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function postNotification(title, message, type, date) {
  await addDoc(collection(db, "notifications"), {
    title,
    message,
    type,
    date,
    createdAt: serverTimestamp(),
    target: "all"
  });
  console.log("Notification posted:", title);
}

const [,, title, message, type, date] = process.argv;
if (title && message && type && date) {
  postNotification(title, message, type, date).then(() => process.exit(0));
} else {
  console.log("Usage: node src/utils/postNotification.js 'Title' 'Message' 'type' 'YYYY-MM-DD'");
  process.exit(1);
}
