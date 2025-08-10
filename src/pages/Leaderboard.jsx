import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";

import { doc, getDoc } from "firebase/firestore";

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

  if (loading) return <div style={{margin: 40}}>Chargement du classement...</div>;
  if (error) return <div style={{margin: 40, color: '#c00'}}>Erreur : {error}</div>;

  return (
    <div style={{margin: 40, maxWidth: 900}}>
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
      <h1 style={{color: '#2d1e6b'}}>🏆 Classements</h1>
      <div style={{display: 'flex', gap: 16, marginBottom: 24}}>
        <button onClick={() => setTab('personal')} style={{padding: 8, background: tab==='personal' ? '#2d1e6b' : '#eee', color: tab==='personal' ? '#fff' : '#222', border: 'none', borderRadius: 6, fontWeight: 600}}>Individuel</button>
        <button onClick={() => setTab('classroom')} style={{padding: 8, background: tab==='classroom' ? '#2d1e6b' : '#eee', color: tab==='classroom' ? '#fff' : '#222', border: 'none', borderRadius: 6, fontWeight: 600}}>Classe</button>
        <button onClick={() => setTab('university')} style={{padding: 8, background: tab==='university' ? '#2d1e6b' : '#eee', color: tab==='university' ? '#fff' : '#222', border: 'none', borderRadius: 6, fontWeight: 600}}>Université</button>
      </div>
      {tab === 'personal' && (
        <>
          <h2 style={{margin: '20px 0 10px'}}>Top 10 Joueurs du jour</h2>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 8, background: '#f7f7ff', borderRadius: 12, boxShadow: '0 2px 12px #0001', overflow: 'hidden'}}>
            <thead>
              <tr style={{background: '#e5e9fa'}}>
                <th style={{padding: 8}}>#</th>
                <th style={{padding: 8}}>Avatar</th>
                <th style={{padding: 8}}>Email</th>
                <th style={{padding: 8}}>Score</th>
                <th style={{padding: 8}}>Université</th>
                <th style={{padding: 8}}>Classe</th>
              </tr>
            </thead>
            <tbody>
              {personal.map((s, i) => (
                <tr key={i} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                  <td style={{padding: 8, textAlign: 'center'}}>{i + 1}</td>
                  <td style={{padding: 8, textAlign: 'center'}}>
                    <img src={s.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${s.email || 'user'}`} alt="avatar" style={{width: 40, height: 40, borderRadius: '50%', border: '2px solid #aaf'}} />
                  </td>
                  <td style={{padding: 8}}>{s.email}</td>
                  <td style={{padding: 8, textAlign: 'center'}}><b>{s.score}</b></td>
                  <td style={{padding: 8}}>{s.university}</td>
                  <td style={{padding: 8}}>{s.classroom}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {userRank && userRank > 10 && userProfile && (
            <div style={{marginTop: 24, background: '#eef', padding: 16, borderRadius: 8}}>
              <b>Votre rang :</b> #{userRank} | Score : {userProfile.score} | Classe : {userProfile.classroom} | Université : {userProfile.university}
            </div>
          )}
        </>
      )}
      {tab === 'classroom' && (
        <>
          <h2 style={{margin: '20px 0 10px'}}>Top 10 Classes du jour (somme des 5 meilleurs scores)</h2>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 8, background: '#f7f7ff', borderRadius: 12, boxShadow: '0 2px 12px #0001', overflow: 'hidden'}}>
            <thead>
              <tr style={{background: '#e5e9fa'}}>
                <th style={{padding: 8}}>#</th>
                <th style={{padding: 8}}>Classe</th>
                <th style={{padding: 8}}>Université</th>
                <th style={{padding: 8}}>Score (top 5)</th>
              </tr>
            </thead>
            <tbody>
              {classrooms.map((c, i) => (
                <tr key={i} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                  <td style={{padding: 8, textAlign: 'center'}}>{i + 1}</td>
                  <td style={{padding: 8}}>{c.classroom}</td>
                  <td style={{padding: 8}}>{c.university}</td>
                  <td style={{padding: 8, textAlign: 'center'}}>{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {classRank && classRank > 10 && userProfile && (
            <div style={{marginTop: 24, background: '#eef', padding: 16, borderRadius: 8}}>
              <b>Votre classe :</b> {userProfile.classroom} | Rang : #{classRank}
            </div>
          )}
        </>
      )}
      {tab === 'university' && (
        <>
          <h2 style={{margin: '20px 0 10px'}}>Top 10 Universités du jour (somme des 3 meilleures classes)</h2>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 8, background: '#f7f7ff', borderRadius: 12, boxShadow: '0 2px 12px #0001', overflow: 'hidden'}}>
            <thead>
              <tr style={{background: '#e5e9fa'}}>
                <th style={{padding: 8}}>#</th>
                <th style={{padding: 8}}>Université</th>
                <th style={{padding: 8}}>Score (top 3 classes)</th>
              </tr>
            </thead>
            <tbody>
              {universities.map((u, i) => (
                <tr key={i} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                  <td style={{padding: 8, textAlign: 'center'}}>{i + 1}</td>
                  <td style={{padding: 8}}>{u.university}</td>
                  <td style={{padding: 8, textAlign: 'center'}}>{u.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {uniRank && uniRank > 10 && userProfile && (
            <div style={{marginTop: 24, background: '#eef', padding: 16, borderRadius: 8}}>
              <b>Votre université :</b> {userProfile.university} | Rang : #{uniRank}
            </div>
          )}
        </>
      )}
    </div>
  );
}
