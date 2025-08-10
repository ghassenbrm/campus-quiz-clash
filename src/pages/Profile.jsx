import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setError("Utilisateur non connecté");
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setProfile(snap.data());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{margin: 40}}>Chargement du profil...</div>;
  if (error) return <div style={{color: '#c00', margin: 40}}>Erreur : {error}</div>;

  const accuracy = profile && profile.totalAnswered ? ((profile.totalCorrect || 0) / profile.totalAnswered * 100).toFixed(1) : '0.0';
  const streak = profile?.currentStreak || 0;
  const bestStreak = profile?.bestStreak || 0;
  const unlockedAvatars = profile?.unlockedAvatars || [];

  return (
    <div style={{margin: 40, maxWidth: 500}}>
      <h1>Profil Joueur</h1>
      <div style={{background: '#f7f7ff', borderRadius: 16, boxShadow: '0 2px 12px #0001', padding: 32, margin: '32px 0 24px 0'}}>
        <div style={{fontSize: 18, marginBottom: 16}}>
          <div><b>Email :</b> {profile?.email || (auth.currentUser && auth.currentUser.email)}</div>
          <div><b>Universit :</b> {profile?.university}</div>
          <div><b>Classe :</b> {profile?.classroom}</div>
        </div>
        <div style={{fontSize: 16, marginBottom: 12}}>
          <div><b>Total questions répondues :</b> {profile?.totalAnswered || 0}</div>
          <div><b>Bonnes réponses :</b> {profile?.totalCorrect || 0}</div>
          <div><b>Précision :</b> {accuracy}%</div>
          <div><b>Série actuelle :</b> {streak} jour(s)</div>
          <div><b>Meilleure série :</b> {bestStreak} jour(s)</div>
        </div>
        <div style={{marginTop: 16}}>
          <b>Avatars débloqués (streaks) :</b>
          <div style={{display: 'flex', gap: 12, marginTop: 8}}>
            {unlockedAvatars.length === 0 && <span>Aucun débloqué</span>}
            {unlockedAvatars.map(a => (
              <div key={a} style={{textAlign: 'center'}}>
                <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${a}`} alt={a} style={{width: 48, height: 48, borderRadius: '50%', border: '2px solid #aaf'}} />
                <div style={{fontSize: 12}}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
