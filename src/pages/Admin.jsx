import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, orderBy } from "firebase/firestore";

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); // for data loading
  const [formLoading, setFormLoading] = useState(false); // for form submission
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newQ, setNewQ] = useState({ text: '', choices: ['', '', '', ''], answer: 0, type: 'mcq', difficulty: 'easy', category: '' });
  const [editingQ, setEditingQ] = useState(null);
  const [filter, setFilter] = useState('');
  const [text, setText] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoadingUser(false);
        navigate("/login");
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.data();
      if (data?.role === "admin") setIsAdmin(true);
      else navigate("/");
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const snap = await getDocs(collection(db, "questions"));
        setQuestions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setError("Erreur lors du chargement des questions : " + e.message);
      }
    };
    fetchQuestions();
  }, []);

  if (loadingUser) return <div style={{margin: 40}}>Vérification des droits...</div>;
  if (!isAdmin) return null;

  const handleChangeChoice = (i, val) => {
    const arr = [...choices];
    arr[i] = val;
    setChoices(arr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!text.trim() || choices.some(c => !c.trim())) {
      setMsg("Tous les champs sont obligatoires.");
      return;
    }
    setFormLoading(true);
    try {
      await addDoc(collection(db, "questions"), {
        text,
        choices,
        answer: Number(answer),
        category,
        difficulty
      });
      setMsg("Question ajoutée avec succès !");
      setText("");
      setChoices(["", "", "", ""]);
      setAnswer(0);
      setCategory("");
      setDifficulty("");
    } catch (e) {
      setMsg("Erreur : " + e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditQuestion = (q) => {
    setEditingQ(q.id);
    setText(q.text);
    setChoices([...q.choices]);
    setAnswer(q.answer);
    setCategory(q.category);
    setDifficulty(q.difficulty);
  };

  const handleCancelEdit = () => {
    setEditingQ(null);
    setText("");
    setChoices(["", "", "", ""]);
    setAnswer(0);
    setCategory("");
    setDifficulty("");
    setMsg("");
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!text.trim() || choices.some(c => !c.trim())) {
      setMsg("Tous les champs sont obligatoires.");
      return;
    }
    setFormLoading(true);
    try {
      await updateDoc(doc(db, "questions", editingQ), {
        text,
        choices,
        answer: Number(answer),
        category,
        difficulty
      });
      setQuestions(questions.map(q => q.id === editingQ ? { ...q, text, choices, answer: Number(answer), category, difficulty } : q));
      setMsg("Question mise à jour avec succès !");
      handleCancelEdit();
    } catch (e) {
      setMsg("Erreur : " + e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette question ?")) {
      await deleteDoc(doc(db, "questions", id));
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleFilterUsers = (e) => {
    setFilter(e.target.value);
  };

  return (
    <div style={{margin: 40, maxWidth: 600}}>
      <h1>Admin</h1>
      <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', justifyContent: 'space-between'}}>
        <li style={{marginRight: 20}}><button onClick={() => setTab('questions')} style={{background: tab === 'questions' ? '#007bff' : '#fff', color: tab === 'questions' ? '#fff' : '#333', border: 'none', padding: 10, borderRadius: 4, cursor: 'pointer'}}>Questions</button></li>
        <li><button onClick={() => setTab('users')} style={{background: tab === 'users' ? '#007bff' : '#fff', color: tab === 'users' ? '#fff' : '#333', border: 'none', padding: 10, borderRadius: 4, cursor: 'pointer'}}>Utilisateurs</button></li>
      </ul>
      {tab === 'questions' && (
        <div>
          <h2>Questions</h2>
          <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
            {questions.map(q => (
              <li key={q.id} style={{marginBottom: 20}}>
                <p>{q.text}</p>
                <p>Choix : {q.choices.join(', ')}</p>
                <p>Bonne réponse : {q.answer}</p>
                <p>Catégorie : {q.category}</p>
                <p>Difficulté : {q.difficulty}</p>
                <button onClick={() => handleEditQuestion(q)} style={{background: '#007bff', color: '#fff', border: 'none', padding: 10, borderRadius: 4, cursor: 'pointer'}}>Éditer</button>
                <button onClick={() => handleDeleteQuestion(q.id)} style={{background: '#c00', color: '#fff', border: 'none', padding: 10, borderRadius: 4, cursor: 'pointer'}}>Supprimer</button>
              </li>
            ))}
          </ul>
          <form onSubmit={editingQ ? handleUpdateQuestion : handleSubmit} style={{marginTop: 24}}>
            <div style={{marginBottom: 16}}>
              <label>Question :</label><br/>
              <input type="text" value={text} onChange={e => setText(e.target.value)} style={{width: '100%', padding: 8}} required />
            </div>
            {[0,1,2,3].map(i => (
              <div key={i} style={{marginBottom: 12}}>
                <label>Choix {i+1} :</label><br/>
                <input type="text" value={choices[i]} onChange={e => handleChangeChoice(i, e.target.value)} style={{width: '100%', padding: 8}} required />
              </div>
            ))}
            <div style={{marginBottom: 16}}>
              <label>Bonne réponse :</label><br/>
              <select value={answer} onChange={e => setAnswer(e.target.value)} style={{padding: 8}}>
                {[0,1,2,3].map(i => (
                  <option key={i} value={i}>Choix {i+1}</option>
                ))}
              </select>
            </div>
            <div style={{marginBottom: 16}}>
              <label>Catégorie :</label><br/>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)} style={{width: '100%', padding: 8}} />
            </div>
            <div style={{marginBottom: 16}}>
              <label>Difficulté :</label><br/>
              <input type="text" value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{width: '100%', padding: 8}} />
            </div>
            <button type="submit" disabled={formLoading} style={{padding: 12, background: editingQ ? '#28a745' : '#007bff', color: '#fff', border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer', marginRight: 8}}>
              {formLoading ? (editingQ ? "Sauvegarde..." : "Ajout...") : (editingQ ? "Sauvegarder les modifications" : "Ajouter la question")}
            </button>
            {editingQ && <button type="button" onClick={handleCancelEdit} style={{padding: 12, background: '#aaa', color: '#fff', border: 'none', borderRadius: 4, fontSize: 16}}>Annuler</button>}
            <div style={{marginTop: 20, color: msg.startsWith("Erreur") ? '#c00' : '#006600'}}>{msg}</div>
          </form>
        </div>
      )}
      {tab === 'users' && (
        <div>
          <h2>Utilisateurs</h2>
          <input type="text" value={filter} onChange={handleFilterUsers} style={{width: '100%', padding: 8, marginBottom: 20}} placeholder="Rechercher un utilisateur" />
          <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
            {users.filter(u => u.email.includes(filter)).map(u => (
              <li key={u.id} style={{marginBottom: 20}}>
                <p>{u.email}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
