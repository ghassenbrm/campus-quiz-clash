import React, { useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function Practice() {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);

  const startPractice = async (ai = false) => {
    setLoading(true);
    setAiMode(ai);
    let qs = [];
    if (ai) {
      // Mock AI: just shuffle and pick 10 (future: fetch from backend)
      const snap = await getDocs(collection(db, "questions"));
      const arr = snap.docs.map(doc => doc.data());
      qs = arr.sort(() => 0.5 - Math.random()).slice(0, 10);
    } else {
      const snap = await getDocs(collection(db, "questions"));
      const arr = snap.docs.map(doc => doc.data());
      qs = arr.sort(() => 0.5 - Math.random()).slice(0, 10);
    }
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setLoading(false);
  };

  const handleSelect = i => {
    setSelected(i);
    if (questions[current].answer === i) setScore(score+1);
    setTimeout(() => {
      if (current === questions.length-1) setFinished(true);
      else {
        setCurrent(current+1);
        setSelected(null);
      }
    }, 700);
  };

  if (loading) return <div style={{margin: 40}}>Chargement du quiz...</div>;
  if (questions.length === 0) return (
    <div style={{margin: 40}}>
      <h1>Mode Pratique</h1>
      <button onClick={() => startPractice(false)} style={{margin: 12, padding: 12, fontSize: 17, borderRadius: 8, background: '#2d1e6b', color: '#fff'}}>Quiz classique</button>
      <button onClick={() => startPractice(true)} style={{margin: 12, padding: 12, fontSize: 17, borderRadius: 8, background: '#2d1e6b', color: '#fff'}}>Quiz IA (bientôt)</button>
    </div>
  );

  if (finished) return (
    <div style={{margin: 40}}>
      <h1>Résultat pratique</h1>
      <div style={{fontSize: 22, margin: 12}}>Score : {score} / {questions.length}</div>
      <button onClick={() => setQuestions([])} style={{padding: 10, borderRadius: 8, background: '#2d1e6b', color: '#fff'}}>Refaire un quiz</button>
      <ul style={{marginTop: 24}}>
        {questions.map((q, i) => (
          <li key={i} style={{marginBottom: 10}}>
            <b>Q{i+1}:</b> {q.text} <span style={{color: score>i && q.answer===selected?"green":"#888"}}>[Bonne réponse: {q.choices[q.answer]}]</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const q = questions[current];
  return (
    <div style={{margin: 40}}>
      <h1>Pratique {aiMode && <span style={{fontSize: 18, color: '#b8860b'}}>(Quiz IA)</span>}</h1>
      <div style={{fontSize: 20, margin: 18}}>{q.text}</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
        {q.choices.map((c, i) => (
          <button key={i} onClick={() => handleSelect(i)} disabled={selected!==null}
            style={{padding: 14, fontSize: 17, borderRadius: 8, background: selected===i ? (q.answer===i ? '#28a745' : '#c00') : '#eee', color: selected===i ? '#fff' : '#222', border: 'none', fontWeight: 600}}>{c}</button>
        ))}
      </div>
      <div style={{marginTop: 32, fontSize: 15}}>Question {current+1} / {questions.length}</div>
    </div>
  );
}
