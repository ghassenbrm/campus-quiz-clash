import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map(d => d.data());
      const leaderSnap = await getDocs(collection(db, "leaderboards"));
      const leaders = leaderSnap.docs.map(d => d.data());
      // Total users
      const totalUsers = users.length;
      // Active users last 7 days
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000);
        weekDates.push(d.toISOString().slice(0, 10));
      }
      const activeUsers = new Set(leaders.filter(l => weekDates.includes(l.date)).map(l => l.uid)).size;
      // Quiz completions per day
      const completions = weekDates.map(date => ({
        date,
        count: leaders.filter(l => l.date === date).length
      }));
      // Average score
      const avgScore = leaders.length ? (leaders.reduce((a, b) => a + b.score, 0) / leaders.length).toFixed(2) : 0;
      // Top universities
      const uniMap = {};
      leaders.forEach(l => { if (l.university) uniMap[l.university] = (uniMap[l.university]||0) + l.score; });
      const topUnis = Object.entries(uniMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
      // Top classrooms
      const classMap = {};
      leaders.forEach(l => { if (l.classroom) classMap[l.classroom] = (classMap[l.classroom]||0) + l.score; });
      const topClasses = Object.entries(classMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
      setStats({ totalUsers, activeUsers, completions, avgScore, topUnis, topClasses });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div>Chargement analytics...</div>;
  return (
    <div style={{marginTop: 18}}>
      <div><b>Utilisateurs totaux :</b> {stats.totalUsers}</div>
      <div><b>Utilisateurs actifs (7j) :</b> {stats.activeUsers}</div>
      <div><b>Score moyen :</b> {stats.avgScore}</div>
      <div style={{marginTop: 20}}><b>Quiz quotidiens (7j) :</b>
        <table style={{marginTop: 4, background: '#fff', borderRadius: 8}}>
          <thead><tr><th>Date</th><th>Quiz terminés</th></tr></thead>
          <tbody>
            {stats.completions.map(c => <tr key={c.date}><td>{c.date}</td><td>{c.count}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div style={{marginTop: 20}}><b>Top universités :</b>
        <table style={{marginTop: 4, background: '#fff', borderRadius: 8}}>
          <thead><tr><th>Université</th><th>Score total</th></tr></thead>
          <tbody>
            {stats.topUnis.map(([u, s]) => <tr key={u}><td>{u}</td><td>{s}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div style={{marginTop: 20}}><b>Top classes :</b>
        <table style={{marginTop: 4, background: '#fff', borderRadius: 8}}>
          <thead><tr><th>Classe</th><th>Score total</th></tr></thead>
          <tbody>
            {stats.topClasses.map(([c, s]) => <tr key={c}><td>{c}</td><td>{s}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
