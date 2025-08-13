import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { FaPlay, FaUsers } from 'react-icons/fa';
import "../styles/home.css";
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
  const [mvp, setMvp] = useState(null);
  const navigate = useNavigate();



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
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Bienvenue sur Campus Quiz Clash</h1>
          <p className="hero-subtitle">Testez vos connaissances et montez dans le classement !</p>
          <div className="button-group">
            <button 
              onClick={handleStartQuiz} 
              className="start-quiz-btn"
            >
              <FaPlay className="btn-icon" />
              <span>Commencer le quiz</span>
            </button>
            <button 
              onClick={() => navigate('/multiplayer/lobby')} 
              className="multiplayer-btn"
            >
              <FaUsers className="btn-icon" />
              <span>Multijoueur</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
