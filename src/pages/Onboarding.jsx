import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function Onboarding() {
  const [university, setUniversity] = useState("");
  const [classroom, setClassroom] = useState("");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();
        if (data && data.university && data.classroom && data.avatar) {
          navigate("/");
        }
      } catch (err) {
        setError("Erreur lors de la vérification du profil.");
      } finally {
        setLoading(false);
      }
    };
    checkProfile();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!university || !classroom || !avatar) {
      setError("Merci de remplir tous les champs.");
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Utilisateur non connecté");
      await setDoc(doc(db, "users", user.uid), {
        university,
        classroom,
        avatar
      }, { merge: true });
      setMessage("Profil complété ! Redirection...");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: 40 }}>Chargement...</div>;
  }

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2>Onboarding</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Université"
          value={university}
          onChange={e => setUniversity(e.target.value)}
          style={{ width: "100%", marginBottom: 12, padding: 8 }}
          required
        />
        <input
          type="text"
          placeholder="Classe"
          value={classroom}
          onChange={e => setClassroom(e.target.value)}
          style={{ width: "100%", marginBottom: 12, padding: 8 }}
          required
        />
        <input
          type="text"
          placeholder="Avatar (ex: lion, panda...)"
          value={avatar}
          onChange={e => setAvatar(e.target.value)}
          style={{ width: "100%", marginBottom: 12, padding: 8 }}
          required
        />
        <button type="submit" style={{ width: "100%", padding: 10 }}>
          Valider
        </button>
      </form>
      {error && <div style={{ color: "#c00", marginTop: 10 }}>{error}</div>}
      {message && <div style={{ color: "#090", marginTop: 10 }}>{message}</div>}
    </div>
  );
}

