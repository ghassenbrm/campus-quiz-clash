// Utility to compute the MVP (Most Valuable Player) of the week
// Run this script manually (node src/utils/computeMVP.js) at the end of each week (Sunday 18:00)
// It will store the MVP in Firestore at 'mvp/current' and append to 'mvp/history'

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "../firebase";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function computeMVP() {
  // Get all leaderboard entries for the past 7 days
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000);
    weekDates.push(d.toISOString().slice(0, 10));
  }
  const snap = await getDocs(collection(db, "leaderboards"));
  const all = snap.docs.map(doc => doc.data()).filter(d => weekDates.includes(d.date));
  // Aggregate scores per user
  const userMap = {};
  all.forEach(entry => {
    if (!userMap[entry.uid]) userMap[entry.uid] = { ...entry, total: 0, days: 0 };
    userMap[entry.uid].total += entry.score;
    userMap[entry.uid].days += 1;
  });
  const users = Object.values(userMap);
  users.sort((a, b) => b.total - a.total);
  const mvp = users[0];
  if (!mvp) {
    console.log("No MVP found for this week.");
    return;
  }
  // Store MVP in Firestore
  await setDoc(doc(db, "mvp", "current"), {
    uid: mvp.uid,
    email: mvp.email,
    avatar: mvp.avatar,
    university: mvp.university,
    classroom: mvp.classroom,
    totalScore: mvp.total,
    daysPlayed: mvp.days,
    weekStart: weekDates[0],
    weekEnd: weekDates[6],
    createdAt: serverTimestamp()
  });
  // Optionally, append to history
  await setDoc(doc(db, "mvp_history", weekDates[0] + "_" + weekDates[6]), {
    ...mvp,
    weekStart: weekDates[0],
    weekEnd: weekDates[6],
    createdAt: serverTimestamp()
  });
  console.log("MVP computed and stored:", mvp.email, mvp.total);
}

computeMVP();
