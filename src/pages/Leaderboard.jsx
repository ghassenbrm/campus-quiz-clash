import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import { FaTrophy, FaMedal, FaCrown, FaUniversity, FaUsers, FaUserAlt, FaInfoCircle } from "react-icons/fa";
import "../styles/leaderboard.css";

export default function Leaderboard() {
  const [tab, setTab] = useState('personal');
  const [personal, setPersonal] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [classRank, setClassRank] = useState(null);
  const [uniRank, setUniRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [mvp, setMvp] = useState(null);

  useEffect(() => {
    // Fetch MVP
    const fetchMVP = async () => {
      try {
        const mvpSnap = await getDoc(doc(db, "mvp", "current"));
        if (mvpSnap.exists()) setMvp(mvpSnap.data());
      } catch (err) {}
    };
    fetchMVP();
    const fetchAll = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        // Fetch all today's scores
        const snap = await getDocs(collection(db, "leaderboards"));
        const all = snap.docs.map(doc => doc.data()).filter(d => d.date === today);
        // --- Personal leaderboard ---
        const sorted = [...all].sort((a, b) => b.score - a.score);
        setPersonal(sorted.slice(0, 10));
        // Find current user
        const user = auth.currentUser;
        let userRow = null;
        if (user) {
          userRow = sorted.find((s) => s.uid === user.uid);
          setUserProfile(userRow);
          if (userRow) setUserRank(sorted.findIndex(s => s.uid === user.uid) + 1);
        }
        // --- Classroom leaderboard ---
        const classMap = {};
        all.forEach(s => {
          if (!classMap[s.classroom]) classMap[s.classroom] = [];
          classMap[s.classroom].push(s);
        });
        const classScores = Object.entries(classMap).map(([classroom, arr]) => {
          // Sum of top 5
          const top5 = arr.sort((a, b) => b.score - a.score).slice(0, 5);
          return {
            classroom,
            university: arr[0]?.university || '',
            total: top5.reduce((sum, s) => sum + s.score, 0),
            members: top5
          };
        });
        classScores.sort((a, b) => b.total - a.total);
        setClassrooms(classScores.slice(0, 10));
        if (userRow) {
          const userClass = classScores.find(c => c.classroom === userRow.classroom);
          setClassRank(classScores.findIndex(c => c.classroom === userRow.classroom) + 1);
        }
        // --- University leaderboard ---
        const uniMap = {};
        classScores.forEach(c => {
          if (!uniMap[c.university]) uniMap[c.university] = [];
          uniMap[c.university].push(c);
        });
        const uniScores = Object.entries(uniMap).map(([university, arr]) => {
          // Sum of top 3 classrooms
          const top3 = arr.sort((a, b) => b.total - a.total).slice(0, 3);
          return {
            university,
            total: top3.reduce((sum, c) => sum + c.total, 0),
            classrooms: top3
          };
        });
        uniScores.sort((a, b) => b.total - a.total);
        setUniversities(uniScores.slice(0, 10));
        if (userRow) {
          setUniRank(uniScores.findIndex(u => u.university === userRow.university) + 1);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="loading-state">Chargement du classement...</div>;
  if (error) return <div className="error-state">Erreur : {error}</div>;

  const renderRankBadge = (index) => {
    if (index === 0) return <span className="rank-1"><FaCrown /></span>;
    if (index === 1) return <span className="rank-2">2</span>;
    if (index === 2) return <span className="rank-3">3</span>;
    return <span className="rank-number">{index + 1}</span>;
  };

  return (
    <div className="leaderboard-container">
      {mvp && (
        <div className="mvp-banner">
          <img 
            src={mvp.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${mvp.email || 'user'}`} 
            alt="MVP" 
            className="mvp-avatar" 
          />
          <div className="mvp-content">
            <h2><FaTrophy /> MVP de la semaine</h2>
            <p style={{ fontSize: '1.1rem', margin: '0.5rem 0', fontWeight: 600 }}>{mvp.email}</p>
            <div className="mvp-details">
              <p className="mvp-detail"><span>Université :</span> {mvp.university || 'Non spécifiée'}</p>
              <p className="mvp-detail"><span>Classe :</span> {mvp.classroom || 'Non spécifiée'}</p>
              <p className="mvp-detail"><span>Score :</span> {mvp.totalScore || 0} points</p>
              <p className="mvp-detail"><span>Période :</span> {mvp.weekStart} → {mvp.weekEnd}</p>
            </div>
          </div>
        </div>
      )}
      
      <h1 style={{ color: '#2d3748', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FaTrophy style={{ color: '#f6ad55' }} /> Classements
      </h1>
      
      <div className="tabs-container">
        <button 
          onClick={() => setTab('personal')} 
          className={`tab-button ${tab === 'personal' ? 'active' : ''}`}
        >
          <FaUserAlt style={{ marginRight: '8px' }} /> Individuel
        </button>
        <button 
          onClick={() => setTab('classroom')} 
          className={`tab-button ${tab === 'classroom' ? 'active' : ''}`}
        >
          <FaUsers style={{ marginRight: '8px' }} /> Classe
        </button>
        <button 
          onClick={() => setTab('university')} 
          className={`tab-button ${tab === 'university' ? 'active' : ''}`}
        >
          <FaUniversity style={{ marginRight: '8px' }} /> Université
        </button>
      </div>
      {tab === 'personal' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Top 10 Joueurs du jour</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#718096', fontSize: '0.9rem' }}>
              <FaInfoCircle /> 
              <span>Mis à jour en temps réel</span>
            </div>
          </div>
          
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Joueur</th>
                <th>Score</th>
                <th>Université</th>
                <th>Classe</th>
              </tr>
            </thead>
            <tbody>
              {personal.map((s, i) => (
                <tr key={i} className={i < 3 ? 'top-three' : ''}>
                  <td>
                    {i === 0 ? (
                      <span className="rank-1"><FaCrown /></span>
                    ) : i === 1 ? (
                      <span className="rank-2">2</span>
                    ) : i === 2 ? (
                      <span className="rank-3">3</span>
                    ) : (
                      <span className="rank-number">{i + 1}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img 
                        src={s.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${s.email || 'user'}`} 
                        alt={s.email} 
                        className="avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.email || 'U')}&background=4a6cf7&color=fff`;
                        }}
                      />
                      <span>{s.email}</span>
                    </div>
                  </td>
                  <td><strong>{s.score || 0}</strong> pts</td>
                  <td>{s.university || '-'}</td>
                  <td>{s.classroom || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {userRank && userRank > 10 && userProfile && (
            <div className="user-rank">
              <div className="user-rank-content">
                <div>
                  <h3 className="user-rank-title">
                    <FaUserAlt /> Votre classement
                  </h3>
                  <ul className="user-rank-stats">
                    <li className="user-rank-stat">
                      <span className="user-rank-stat-label">
                        <FaMedal /> Position :
                      </span>
                      <span className="user-rank-stat-value">#{userRank}</span>
                    </li>
                    <li className="user-rank-stat">
                      <span className="user-rank-stat-label">
                        <FaStar /> Score :
                      </span>
                      <span className="user-rank-stat-value">{userProfile.score || 0} points</span>
                    </li>
                    <li className="user-rank-stat">
                      <span className="user-rank-stat-label">
                        <FaUsers /> Classe :
                      </span>
                      <span className="user-rank-stat-value">{userProfile.classroom || 'Non spécifiée'}</span>
                    </li>
                    <li className="user-rank-stat">
                      <span className="user-rank-stat-label">
                        <FaUniversity /> Université :
                      </span>
                      <span className="user-rank-stat-value">{userProfile.university || 'Non spécifiée'}</span>
                    </li>
                  </ul>
                </div>
                <div className="user-rank-actions">
                  <button 
                    className="user-rank-button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  >
                    <FaTrophy /> Voir le classement
                  </button>
                  <button 
                    className="user-rank-button secondary"
                    onClick={() => setTab('personal')}
                  >
                    <FaChartLine /> Voir ma progression
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {tab === 'classroom' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Top 10 Classes du jour</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#718096', fontSize: '0.9rem' }}>
              <FaInfoCircle /> 
              <span>Basé sur la somme des 5 meilleurs scores</span>
            </div>
          </div>
          
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Classe</th>
                <th>Université</th>
                <th>Score</th>
                <th>Membres</th>
              </tr>
            </thead>
            <tbody>
              {classrooms.map((c, i) => (
                <tr key={i}>
                  <td>{renderRankBadge(i)}</td>
                  <td><strong>{c.classroom || 'Non spécifiée'}</strong></td>
                  <td>{c.university || 'Non spécifiée'}</td>
                  <td><strong>{c.total || 0}</strong> pts</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {c.members.slice(0, 3).map((m, idx) => (
                        <img 
                          key={idx}
                          src={m.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${m.email || 'user'}`}
                          alt={m.email}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: '1px solid #e2e8f0'
                          }}
                          title={m.email}
                        />
                      ))}
                      {c.members.length > 3 && (
                        <span style={{ marginLeft: '4px' }}>+{c.members.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {classRank && classRank > 10 && userProfile && (
            <div className="user-rank">
              <p>
                <strong>Votre classe :</strong> {userProfile.classroom || 'Non spécifiée'} | 
                <strong>Rang :</strong> #{classRank}
              </p>
            </div>
          )}
        </>
      )}
      {tab === 'university' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Top 10 Universités du jour</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#718096', fontSize: '0.9rem' }}>
              <FaInfoCircle /> 
              <span>Basé sur la somme des 3 meilleures classes</span>
            </div>
          </div>
          
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Université</th>
                <th>Score</th>
                <th>Meilleure classe</th>
              </tr>
            </thead>
            <tbody>
              {universities.map((u, i) => {
                const topClass = u.classrooms && u.classrooms[0];
                return (
                  <tr key={i}>
                    <td>{renderRankBadge(i)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #4a6cf7, #6c5ce7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}>
                          {u.university ? u.university.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span>{u.university || 'Non spécifiée'}</span>
                      </div>
                    </td>
                    <td><strong>{u.total || 0}</strong> pts</td>
                    <td>
                      {topClass ? (
                        <div>
                          <div>{topClass.classroom || 'Classe inconnue'}</div>
                          <div style={{ fontSize: '0.85em', color: '#718096' }}>{topClass.total} points</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {uniRank && uniRank > 10 && userProfile && (
            <div className="user-rank">
              <p>
                <strong>Votre université :</strong> {userProfile.university || 'Non spécifiée'} | 
                <strong>Rang :</strong> #{uniRank}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
