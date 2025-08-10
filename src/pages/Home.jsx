import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { seedQuestions } from "../utils/seedFirestore";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
export default function Home() {
  // ...existing code
  const handleStartQuiz = async () => {
    try {
      const snap = await getDocs(collection(db, "questions"));
      const questions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      navigate('/quiz', { state: { questions } });
    } catch (e) {
      alert("Erreur lors du chargement des questions : " + e.message);
    }
  };
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seedMsg, setSeedMsg] = useState("");
  const [mvp, setMvp] = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const handleSeed = async () => {
    setSeedMsg("Ajout des questions...");
    try {
      await seedQuestions();
      setSeedMsg("Questions ajoutées avec succès !");
    } catch (e) {
      setSeedMsg("Erreur : " + e.message);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Utilisateur non connecté");
        const snap = await getDoc(doc(db, "users", user.uid));
        setProfile(snap.data());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    // Fetch MVP as well
    const fetchMVP = async () => {
      try {
        const mvpSnap = await getDoc(doc(db, "mvp", "current"));
        if (mvpSnap.exists()) setMvp(mvpSnap.data());
      } catch (err) {
        // ignore
      }
    };
    fetchProfile();
    fetchMVP();
    // Fetch today's notifications count
    const fetchNotifCount = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const snap = await getDocs(collection(db, "notifications"));
        const unread = snap.docs.filter(doc => (doc.data().date === today));
        setNotifCount(unread.length);
      } catch {}
    };
    fetchNotifCount();
  }, []);

  useEffect(() => {
    if (error === "Utilisateur non connecté") {
      navigate("/login");
    }
  }, [error, navigate]);

  if (loading) return <div style={{margin: 40}}>Chargement du profil...</div>;
  if (error) {
    return <div style={{margin: 40, color: '#c00'}}>{error}</div>;
  }

  return (
    <div style={{margin: 40}}>
      {mvp && (
        <div style={{background: '#fffbe6', border: '2px solid #ffe066', borderRadius: 12, padding: 20, marginBottom: 28, display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px #0001'}}>
          <img src={mvp.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${mvp.email || 'user'}`} alt="avatar" style={{width: 70, height: 70, borderRadius: '50%', border: '3px solid gold', marginRight: 24}} />
          <div>
            <div style={{fontSize: 22, fontWeight: 700, color: '#b8860b'}}>🏅 MVP de la semaine</div>
            <div style={{fontSize: 18}}><b>{mvp.email}</b></div>
            <div style={{fontSize: 15}}>Université : {mvp.university} | Classe : {mvp.classroom}</div>
            <div style={{fontSize: 15}}>Score hebdo : <b>{mvp.totalScore}</b> | Semaine : {mvp.weekStart} → {mvp.weekEnd}</div>
          </div>
        </div>
      )}
      <nav style={{marginBottom: 32, display: 'flex', alignItems: 'center'}}>
        {/* Ajout du lien Pratique */}
        <a href="/quiz" style={{marginRight: 20, fontWeight: 500}}>Quiz</a>
        <a href="/leaderboard" style={{marginRight: 20, fontWeight: 500}}>Leaderboard</a>
        <a href="/practice" style={{marginRight: 20, fontWeight: 500}}>Pratique</a>
        <a href="/profile" style={{marginRight: 20, fontWeight: 500}}>Profil</a>
        <span style={{marginLeft: 'auto', cursor: 'pointer', position: 'relative'}} onClick={() => navigate('/notifications')}>
          <span role="img" aria-label="bell" style={{fontSize: 26, color: '#2d1e6b'}}>🔔</span>
          {notifCount > 0 && <span style={{position: 'absolute', top: 0, right: -5, background: '#c00', color: '#fff', borderRadius: '50%', fontSize: 13, padding: '2px 6px', fontWeight: 700}}>{notifCount}</span>}
        </span>
        {profile?.role === "admin" && (
          <a href="/admin" style={{marginLeft: 20, fontWeight: 500, color: '#c00'}}>Admin</a>
        )}
      </nav>
      <h1>Campus Quiz Clash: Home</h1>
      {/* Ajout du lien Pratique dans la nav */}
      <div
        style={{
          background: '#f7f7ff',
          borderRadius: 16,
          boxShadow: '0 2px 12px #0001',
          padding: 32,
          margin: '32px 0 24px 0',
          display: 'flex',
          alignItems: 'center',
          maxWidth: 500
        }}
      >
        <img
          src={profile?.avatar || ("https://api.dicebear.com/7.x/identicon/svg?seed=" + (profile?.email || 'user'))}
          alt="avatar"
          style={{ width: 80, height: 80, borderRadius: '50%', marginRight: 32, border: '2px solid #aaf' }}
        />
        <div style={{ fontSize: 18 }}>
          <div><b>Email :</b> {profile?.email || (auth.currentUser && auth.currentUser.email)}</div>
          <div><b>Université :</b> {profile?.university}</div>
          <div><b>Classe :</b> {profile?.classroom}</div>
        </div>
      </div>
      {/* Debug user info */}
      <div style={{margin: '12px 0', fontSize: 15, color: '#888'}}>
        <div><b>UID :</b> {auth.currentUser && auth.currentUser.uid}</div>
        <div><b>Email (auth) :</b> {auth.currentUser && auth.currentUser.email}</div>
        <div><b>Rôle (profil Firestore) :</b> {profile?.role || '(non défini)'}</div>
      </div>
      <button onClick={handleLogout} style={{marginTop: 24, padding: 10, background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
        Déconnexion
      </button>
      <div style={{marginTop: 32}}>
        <button onClick={handleSeed} style={{padding: 8, background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'}}>
          Peupler Firestore avec des questions d'exemple
        </button>
        <div style={{marginTop: 8, color: '#006600'}}>{seedMsg}</div>
      </div>
      <div style={{marginTop: 32}}>
        <button onClick={handleStartQuiz} style={{padding: 12, background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, fontSize: 18, cursor: 'pointer'}}>
          Commencer le quiz
        </button>
      </div>
    </div>
  );
}
