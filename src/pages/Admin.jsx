import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { FaTrash, FaEdit, FaPlus, FaSearch, FaTimes, FaCheck, FaUser, FaQuestionCircle, FaListUl, FaFilePdf } from "react-icons/fa";
import "../styles/admin.css";
import "../styles/pdf-uploader.css";
import PdfUploader from "../components/PdfUploader";

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    text: "",
    choices: ["", "", "", ""],
    answer: 0,
    type: "mcq",
    difficulty: "easy",
    category: ""
  });
  const [notification, setNotification] = useState({ message: "", type: "" });

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

  if (loadingUser) return <div className="card text-center p-4">Vérification des droits d'administrateur...</div>;
  if (!isAdmin) return <div className="card text-center p-4">Accès refusé. Vous n'avez pas les droits d'administrateur.</div>;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChoiceChange = (index, value) => {
    const newChoices = [...formData.choices];
    newChoices[index] = value;
    setFormData(prev => ({
      ...prev,
      choices: newChoices
    }));
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { text, choices, answer, category, difficulty } = formData;
    
    if (!text.trim() || choices.some(c => !c.trim())) {
      showNotification("Tous les champs sont obligatoires.", "error");
      return;
    }
    
    setFormLoading(true);
    try {
      await addDoc(collection(db, "questions"), {
        text: text.trim(),
        choices: choices.map(c => c.trim()),
        answer: Number(answer),
        category: category.trim(),
        difficulty: difficulty.trim(),
        createdAt: new Date().toISOString()
      });
      
      // Refresh questions
      const snap = await getDocs(collection(db, "questions"));
      setQuestions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Reset form
      setFormData({
        text: "",
        choices: ["", "", "", ""],
        answer: 0,
        type: "mcq",
        difficulty: "easy",
        category: ""
      });
      
      showNotification("Question ajoutée avec succès !");
    } catch (e) {
      console.error("Error adding question:", e);
      showNotification("Erreur lors de l'ajout de la question: " + e.message, "error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQ(question.id);
    setFormData({
      text: question.text,
      choices: [...question.choices],
      answer: question.answer,
      type: question.type || "mcq",
      difficulty: question.difficulty || "easy",
      category: question.category || ""
    });
    // Scroll to form
    document.getElementById('question-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingQ(null);
    setFormData({
      text: "",
      choices: ["", "", "", ""],
      answer: 0,
      type: "mcq",
      difficulty: "easy",
      category: ""
    });
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    const { text, choices, answer, category, difficulty } = formData;
    
    if (!text.trim() || choices.some(c => !c.trim())) {
      showNotification("Tous les champs sont obligatoires.", "error");
      return;
    }
    
    setFormLoading(true);
    try {
      await updateDoc(doc(db, "questions", editingQ), {
        text: text.trim(),
        choices: choices.map(c => c.trim()),
        answer: Number(answer),
        category: category.trim(),
        difficulty: difficulty.trim(),
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setQuestions(questions.map(q => 
        q.id === editingQ 
          ? { 
              ...q, 
              text: text.trim(),
              choices: choices.map(c => c.trim()),
              answer: Number(answer),
              category: category.trim(),
              difficulty: difficulty.trim()
            } 
          : q
      ));
      
      showNotification("Question mise à jour avec succès !");
      handleCancelEdit();
    } catch (e) {
      console.error("Error updating question:", e);
      showNotification("Erreur lors de la mise à jour de la question: " + e.message, "error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette question ? Cette action est irréversible.")) {
      try {
        await deleteDoc(doc(db, "questions", id));
        setQuestions(questions.filter(q => q.id !== id));
        showNotification("Question supprimée avec succès !");
      } catch (e) {
        console.error("Error deleting question:", e);
        showNotification("Erreur lors de la suppression de la question: " + e.message, "error");
      }
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  // Filter questions based on search term
  const filteredQuestions = questions.filter(q => {
    const search = searchTerm.toLowerCase();
    return (
      (q.text && q.text.toLowerCase().includes(search)) ||
      (q.category && q.category.toLowerCase().includes(search)) ||
      (q.difficulty && q.difficulty.toLowerCase().includes(search))
    );
  });

  // Filter users based on search term
  const filteredUsers = users.filter(u => {
    const search = searchTerm.toLowerCase();
    return (
      (u.email && u.email.toLowerCase().includes(search)) ||
      (u.displayName && u.displayName.toLowerCase().includes(search))
    );
  });

  return (
    <div className="admin-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Tableau de bord Admin</h1>
        <div className="search-box">
          <input
            type="text"
            className="form-control"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {notification.message && (
        <div className={`alert alert-${notification.type === 'error' ? 'danger' : 'success'} mb-4`}>
          {notification.message}
        </div>
      )}

      <div className="admin-tabs">
        <button 
          className={`tab-button ${tab === 'questions' ? 'active' : ''}`}
          onClick={() => setTab('questions')}
        >
          <FaQuestionCircle className="me-2" />
          Gestion des questions
        </button>
        <button 
          className={`tab-button ${tab === 'import' ? 'active' : ''}`}
          onClick={() => setTab('import')}
        >
          <FaFilePdf className="me-2" />
          Importer des questions
        </button>
        <button 
          className={`tab-button ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          <FaUser className="me-2" />
          Gestion des utilisateurs
        </button>
      </div>
      {tab === 'questions' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">
              <FaListUl className="me-2" />
              Liste des questions
              <span className="text-muted ms-2">({filteredQuestions.length})</span>
            </h2>
            <button 
              className="btn btn-primary"
              onClick={() => {
                handleCancelEdit();
                document.getElementById('question-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <FaPlus className="me-1" /> Nouvelle question
            </button>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="card text-center p-4">
              <p className="text-muted mb-0">Aucune question trouvée</p>
            </div>
          ) : (
            <div className="question-list">
              {filteredQuestions.map((q, index) => (
                <div key={q.id} className="question-card">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h4 className="mb-2">{q.text}</h4>
                      <ul className="mb-2">
                        {q.choices.map((choice, i) => (
                          <li key={i} className={i === q.answer ? 'text-success fw-bold' : ''}>
                            {i + 1}. {choice}
                            {i === q.answer && <FaCheck className="ms-2" />}
                          </li>
                        ))}
                      </ul>
                      <div className="question-meta">
                        <span className="badge bg-primary">{q.category || 'Non catégorisé'}</span>
                        <span className="badge bg-secondary">Difficulté: {q.difficulty || 'Non spécifiée'}</span>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-sm btn-outline-primary" 
                        onClick={() => handleEditQuestion(q)}
                        aria-label="Modifier"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger" 
                        onClick={() => handleDeleteQuestion(q.id)}
                        aria-label="Supprimer"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div id="question-form" className="card mt-4">
            <div className="card-body">
              <h3 className="card-title mb-4">
                {editingQ ? 'Modifier la question' : 'Ajouter une nouvelle question'}
              </h3>
              
              <form onSubmit={editingQ ? handleUpdateQuestion : handleSubmit}>
                <div className="form-group">
                  <label>Question</label>
                  <input
                    type="text"
                    name="text"
                    className="form-control"
                    value={formData.text}
                    onChange={handleInputChange}
                    placeholder="Entrez la question"
                    required
                  />
                </div>

                <div className="form-group mt-4">
                  <label>Options de réponse</label>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="input-group mb-2">
                      <div className="input-group-text">
                        <input
                          type="radio"
                          name="answer"
                          value={i}
                          checked={Number(formData.answer) === i}
                          onChange={handleInputChange}
                          className="form-check-input mt-0 me-2"
                          required
                        />
                        {i + 1}.
                      </div>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.choices[i] || ''}
                        onChange={(e) => handleChoiceChange(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Catégorie</label>
                      <input
                        type="text"
                        name="category"
                        className="form-control"
                        value={formData.category}
                        onChange={handleInputChange}
                        placeholder="Ex: Culture générale"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Difficulté</label>
                      <select
                        name="difficulty"
                        className="form-select"
                        value={formData.difficulty}
                        onChange={handleInputChange}
                      >
                        <option value="facile">Facile</option>
                        <option value="moyen">Moyen</option>
                        <option value="difficile">Difficile</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 mt-4">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : editingQ ? (
                      <FaEdit className="me-1" />
                    ) : (
                      <FaPlus className="me-1" />
                    )}
                    {editingQ ? 'Mettre à jour' : 'Ajouter la question'}
                  </button>
                  
                  {editingQ && (
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={handleCancelEdit}
                      disabled={formLoading}
                    >
                      <FaTimes className="me-1" /> Annuler
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {tab === 'import' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">
              <FaFilePdf className="me-2" />
              Importer des questions depuis un PDF
            </h2>
          </div>
          
          <div className="row">
            <div className="col-md-8">
              <PdfUploader onQuestionsImported={() => {
                // Refresh questions list after import
                const fetchQuestions = async () => {
                  try {
                    const snap = await getDocs(collection(db, "questions"));
                    setQuestions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                  } catch (e) {
                    console.error("Error fetching questions:", e);
                  }
                };
                fetchQuestions();
              }} />
              
              <div className="card mt-4">
                <div className="card-body">
                  <h5 className="card-title">Instructions pour le format du PDF</h5>
                  <p className="card-text">
                    Pour de meilleurs résultats, veuillez suivre ce format :
                  </p>
                  <ol>
                    <li>Commencez par la catégorie : <code>Category: Nom de la catégorie</code></li>
                    <li>Ajoutez la difficulté : <code>Difficulty: easy/medium/hard</code></li>
                    <li>Écrivez la question avec son numéro : <code>1. Votre question ?</code></li>
                    <li>Listez les options (A, B, C, D) avec une option par ligne</li>
                    <li>Terminez par la réponse : <code>Answer: A</code> (ou B, C, D)</li>
                    <li>Laissez une ligne vide entre chaque question</li>
                  </ol>
                  <button 
                    className="btn btn-outline-primary mt-2"
                    onClick={() => {
                      const template = `Category: Mathématiques
Difficulty: easy

1. Quelle est la racine carrée de 16 ?
   A) 2
   B) 4
   C) 8
   D) 16
   Answer: B

Category: Géographie
Difficulty: medium

2. Quelle est la capitale de la France ?
   A) Londres
   B) Berlin
   C) Paris
   D) Madrid
   Answer: C`;
                      
                      const blob = new Blob([template], { type: 'text/plain;charset=utf-8' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = 'modele_questions.txt';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    Télécharger un modèle
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">Conseils</h5>
                </div>
                <div className="card-body">
                  <h6>Format recommandé :</h6>
                  <pre className="bg-light p-2 rounded">
{`Category: Mathématiques
Difficulty: easy

1. Question texte ?
   A) Option 1
   B) Option 2
   C) Option 3
   D) Option 4
   Answer: B`}
                  </pre>
                  <div className="alert alert-info mt-3">
                    <strong>Astuce :</strong> Vous pouvez créer un document texte (.txt) avec ce format, 
                    puis le convertir en PDF pour l'importation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {tab === 'users' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">
              <FaUser className="me-2" />
              Liste des utilisateurs
              <span className="text-muted ms-2">({filteredUsers.length})</span>
            </h2>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="card text-center p-4">
              <p className="text-muted mb-0">Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <div className="user-list">
              {filteredUsers.map(user => (
                <div key={user.id} className="user-card">
                  <div className="user-avatar">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="user-email" title={user.email}>
                    {user.email}
                  </div>
                  <div className="text-muted small">
                    {user.role === 'admin' && <span className="badge bg-primary me-2">Admin</span>}
                    Inscrit le: {new Date(user.createdAt?.toDate() || new Date()).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
