import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

const UNIVERSITY_DOMAIN = "@istic.ucar.tn"; // Domaine mis à jour

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    return email.endsWith(UNIVERSITY_DOMAIN);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!validateEmail(email)) {
      setError(`Only university emails (${UNIVERSITY_DOMAIN}) allowed.`);
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        // Crée le profil utilisateur dans Firestore
        await setDoc(doc(db, "users", userCred.user.uid), {
          email: email,
          university: "", // À remplir lors de l'onboarding
          classroom: "",  // À remplir lors de l'onboarding
          avatar: "",     // À remplir lors de l'onboarding
          verified: false,
          createdAt: serverTimestamp(),
          role: "student"
        });
        await sendEmailVerification(userCred.user);
        setMessage("Verification email sent. Please verify before logging in.");
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        if (!userCred.user.emailVerified) {
          setError("Email not verified. Please check your inbox.");
          await sendEmailVerification(userCred.user);
          setMessage("Verification email resent.");
          auth.signOut();
        } else {
          // Vérifie le profil utilisateur dans Firestore
          const userDocRef = doc(db, "users", userCred.user.uid);
          const userSnap = await getDoc(userDocRef);
          const userData = userSnap.data();
          if (!userData || !userData.university || !userData.classroom || !userData.avatar) {
            setMessage("Profil incomplet. Redirection vers l'onboarding...");
            setTimeout(() => navigate("/onboarding"), 1000);
          } else {
            setMessage("Login successful! Redirecting...");
            setTimeout(() => navigate("/"), 1000);
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2>{isRegister ? "Sign Up" : "Login"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder={`Email (must end with ${UNIVERSITY_DOMAIN})`}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: "100%", marginBottom: 12, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: "100%", marginBottom: 12, padding: 8 }}
        />
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Please wait..." : isRegister ? "Sign Up" : "Login"}
        </button>
      </form>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => { setIsRegister(r => !r); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer" }}>
          {isRegister ? "Already have an account? Login" : "Don't have an account? Sign Up"}
        </button>
      </div>
      {error && <div style={{ color: "#c00", marginTop: 10 }}>{error}</div>}
      {message && <div style={{ color: "#090", marginTop: 10 }}>{message}</div>}
    </div>
  );
}
