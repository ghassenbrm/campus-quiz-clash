import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaUserGraduate, FaUniversity, FaChalkboardTeacher, FaTrophy, FaChartLine, FaCheckCircle, FaAward, FaStar } from "react-icons/fa";
import { MdEmail, MdSchool, MdEmojiEvents, MdTimeline } from "react-icons/md";
import "./../styles/profile.css";

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
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        <img 
          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${profile?.email || 'user'}`} 
          alt="Profile" 
          className="profile-avatar"
        />
        <h1 className="profile-name">
          {profile?.displayName || 'Joueur'}
        </h1>
        <div className="profile-email">
          {profile?.email || (auth.currentUser && auth.currentUser.email)}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-value">{profile?.totalAnswered || 0}</div>
          <div className="stat-label">Questions répondues</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{accuracy}%</div>
          <div className="stat-label">Précision</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{streak}</div>
          <div className="stat-label">Série actuelle</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{bestStreak}</div>
          <div className="stat-label">Meilleure série</div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="profile-section">
        <h2 className="section-title">
          <FaUserGraduate style={{ marginRight: '0.5rem' }} />
          Informations personnelles
        </h2>
        <div className="profile-details">
          <div className="detail-item">
            <div className="detail-icon">
              <MdEmail size={20} />
            </div>
            <div className="detail-content">
              <h4>Email</h4>
              <p>{profile?.email || (auth.currentUser && auth.currentUser.email)}</p>
            </div>
          </div>
          
          <div className="detail-item">
            <div className="detail-icon">
              <FaUniversity size={18} />
            </div>
            <div className="detail-content">
              <h4>Université</h4>
              <p>{profile?.university || 'Non spécifiée'}</p>
            </div>
          </div>
          
          <div className="detail-item">
            <div className="detail-icon">
              <FaChalkboardTeacher size={18} />
            </div>
            <div className="detail-content">
              <h4>Classe</h4>
              <p>{profile?.classroom || 'Non spécifiée'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Section */}
      <div className="profile-section">
        <h2 className="section-title">
          <FaChartLine style={{ marginRight: '0.5rem' }} />
          Performance
        </h2>
        <div className="profile-details">
          <div className="detail-item">
            <div className="detail-icon">
              <FaCheckCircle size={18} />
            </div>
            <div className="detail-content">
              <h4>Bonnes réponses</h4>
              <p>{profile?.totalCorrect || 0} / {profile?.totalAnswered || 0}</p>
            </div>
          </div>
          
          <div className="detail-item">
            <div className="detail-icon">
              <FaTrophy size={18} />
            </div>
            <div className="detail-content">
              <h4>Score total</h4>
              <p>{profile?.totalScore || 0} points</p>
            </div>
          </div>
          
          <div className="detail-item">
            <div className="detail-icon">
              <FaAward size={18} />
            </div>
            <div className="detail-content">
              <h4>Niveau</h4>
              <p>{(profile?.level || 1).toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="profile-section">
        <h2 className="section-title">
          <FaStar style={{ marginRight: '0.5rem' }} />
          Avatars débloqués
        </h2>
        {unlockedAvatars.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Aucun avatar débloqué pour le moment. Continuez à jouer pour en débloquer !
          </p>
        ) : (
          <div className="avatar-grid">
            {unlockedAvatars.map((avatar, index) => (
              <div key={index} className="avatar-item">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatar}`} 
                  alt={`Avatar ${index + 1}`} 
                  className="avatar-img"
                />
                <div className="avatar-name">Niveau {index + 1}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
