import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const user = auth.currentUser;
        let q = query(collection(db, "notifications"), orderBy("date", "desc"), orderBy("createdAt", "desc"));
        // Optionally filter by user/classroom/university
        const snap = await getDocs(q);
        setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  if (loading) return <div style={{margin: 40}}>Chargement des notifications...</div>;
  if (error) return <div style={{margin: 40, color: '#c00'}}>Erreur : {error}</div>;

  return (
    <div style={{margin: 40, maxWidth: 600}}>
      <h1>Notifications</h1>
      {notifications.length === 0 ? (
        <div style={{margin: 32, color: '#888'}}>Aucune notification pour l'instant.</div>
      ) : (
        <ul style={{listStyle: 'none', padding: 0}}>
          {notifications.map((n, i) => (
            <li key={n.id} style={{background: '#f7f7ff', borderRadius: 10, marginBottom: 18, padding: 16, boxShadow: '0 2px 8px #0001'}}>
              <div style={{fontSize: 16, fontWeight: 600, marginBottom: 6}}>{n.title}</div>
              <div style={{fontSize: 15}}>{n.message}</div>
              <div style={{fontSize: 13, color: '#888', marginTop: 4}}>{n.date}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
