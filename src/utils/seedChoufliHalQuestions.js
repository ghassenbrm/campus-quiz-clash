import { collection, addDoc, getFirestore } from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

const questions = [
  {
    text: "شكون يلعب دور السبوعي؟",
    choices: ["منى نور الدين", "سفيان الشعري", "كمال التواتي ", "جميلة الشيحي"],
    answer: 1,
    category: "choufli_hal",
    difficulty: "medium"
  },
  {
    text: "في أنا عام بدات سلسلة شوفلي حل؟",
    choices: ["2005", "2006", "2007", "2009"],
    answer: 0,
    category: "choufli_hal",
    difficulty: "easy"
  },
  // ... rest of the questions in the same format
  // I'll add the rest in the next step to avoid truncation
];

// Function to add questions to Firestore
const seedQuestions = async () => {
  try {
    const batch = [];
    
    for (const question of questions) {
      const docRef = await addDoc(collection(db, "questions"), question);
      console.log("Added question with ID: ", docRef.id);
    }
    
    console.log("All questions added successfully!");
  } catch (e) {
    console.error("Error adding questions: ", e);
  }
};

// Run the function
export default seedQuestions;
