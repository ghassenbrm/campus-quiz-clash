import React, { useState, useEffect } from 'react';
import { FaUpload, FaFilePdf, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';
import { saveAs } from 'file-saver';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
// Using global pdfjsLib loaded from CDN
let pdfjsLib;

// Wait for PDF.js to be loaded
const getPdfJs = async () => {
  // If already loaded, return it
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }
  
  // Wait for the PDF.js library to be ready using polling
  await new Promise((resolve) => {
    const checkPdfJs = () => {
      if (window.pdfjsLib) {
        // Set worker path
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
        resolve();
      } else {
        setTimeout(checkPdfJs, 100);
      }
    };
    checkPdfJs();
  });
  
  return window.pdfjsLib;
};

const PdfUploader = ({ onQuestionsImported }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [file, setFile] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
    } else {
      setMessage({ text: 'Please upload a valid PDF file', type: 'error' });
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      setMessage({ text: 'Please select a valid PDF file', type: 'error' });
    }
  };

  // Helper function to process a block of lines as a question
  const processQuestionBlock = (lines, questions, category, difficulty) => {
    // Check if this is a valid question block (starts with a question, has 4 options, and an answer)
    if (lines.length >= 6 &&
        !lines[0].match(/^(catégorie|category|difficulté|difficulty):/i) &&
        lines[1].match(/^[A-D]\)/) &&
        lines[2].match(/^[A-D]\)/) &&
        lines[3].match(/^[A-D]\)/) &&
        lines[4].match(/^[A-D]\)/) &&
        lines[5].match(/^(réponse|answer):?\s*[A-D]/i)) {
      
      const questionText = lines[0];
      const choices = [
        lines[1].substring(3), // Remove 'A) '
        lines[2].substring(3), // Remove 'B) '
        lines[3].substring(3), // Remove 'C) '
        lines[4].substring(3)  // Remove 'D) '
      ];
      
      // Extract answer (A, B, C, or D)
      const answerMatch = lines[5].match(/^(réponse|answer):?\s*([A-D])/i);
      if (answerMatch) {
        const answerLetter = answerMatch[2].toUpperCase();
        const answerIndex = answerLetter.charCodeAt(0) - 65; // A->0, B->1, etc.
        
        questions.push({
          question: questionText,
          choices: choices,
          answer: answerIndex,
          category: category,
          difficulty: difficulty
        });
      }
    }
  };

  const parsePdfContent = (text) => {
    console.log('Raw PDF text:', text);
    
    const questions = [];
    let currentCategory = 'Général';
    let currentDifficulty = 'moyen';
    
    // Split text into sections (each section is separated by one or more empty lines)
    const sections = text.split(/\n\s*\n/);
    
    for (const section of sections) {
      const lines = section.split('\n').map(line => line.trim()).filter(line => line !== '');
      if (lines.length === 0) continue;
      
      // Check for category
      const categoryMatch = lines[0].match(/^(catégorie|category):\s*(.+)/i);
      if (categoryMatch) {
        currentCategory = categoryMatch[2].trim();
        continue;
      }
      
      // Check for difficulty
      const difficultyMatch = lines[0].match(/^(difficulté|difficulty):\s*(.+)/i);
      if (difficultyMatch) {
        currentDifficulty = difficultyMatch[2].trim().toLowerCase();
        continue;
      }
      
      // If it's a question block, process it
      if (lines.length >= 6) {
        processQuestionBlock(lines, questions, currentCategory, currentDifficulty);
      }
    }
    
    console.log(`Parsed ${questions.length} questions:`, questions);
    return questions;
  };

  const uploadQuestionsToFirestore = async (questions) => {
    const batch = [];
    const questionsRef = collection(db, 'questions');
    
    for (const question of questions) {
      try {
        const docRef = await addDoc(questionsRef, {
          ...question,
          createdAt: new Date().toISOString()
        });
        batch.push(docRef.id);
      } catch (error) {
        console.error('Error adding question:', error);
      }
    }
    
    return batch.length;
  };

  const extractTextFromPdf = async (file) => {
    try {
      // Ensure PDF.js is loaded
      const pdfjsLib = await getPdfJs();
      
      // Create a FileReader to read the file as ArrayBuffer
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join('\n');
        fullText += pageText + '\n\n';
      }

      return fullText.trim();
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF: ' + error.message);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setMessage({ text: 'Traitement du PDF en cours...', type: 'info' });
    try {
      setIsUploading(true);
      setMessage({ text: '', type: '' });
      
      // Get the actual File object from the input
      const fileToProcess = file instanceof File ? file : file[0];
      
      if (!fileToProcess) {
        throw new Error('Aucun fichier valide sélectionné');
      }
      
      const text = await extractTextFromPdf(fileToProcess);
      const questions = await parsePdfContent(text);
      
      if (questions.length === 0) {
        throw new Error('Aucune question valide trouvée dans le PDF');
      }
      
      const successCount = await uploadQuestionsToFirestore(questions);
      
      setMessage({ 
        text: `${successCount} questions ont été importées avec succès`, 
        type: 'success' 
      });
      
      // Notify parent component
      if (onQuestionsImported) {
        onQuestionsImported();
      }
      
      // Reset file
      setFile(null);
      
    } catch (error) {
      console.error('Erreur lors du traitement du PDF:', error);
      setMessage({ 
        text: `Erreur: ${error.message || 'Échec du traitement du PDF'}`, 
        type: 'error' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `MATHEMATICS QUIZ
Category: Basic Arithmetic
Difficulty: Easy

1. What is 5 + 7?
   A) 10
   B) 11
   C) 12
   D) 13
   Answer: C

2. What is 15 - 8?
   A) 6
   B) 7
   C) 8
   D) 9
   Answer: B

Category: Fractions
Difficulty: Medium

3. What is 1/2 + 1/4?
   A) 1/8
   B) 2/6
   C) 3/4
   D) 2/4
   Answer: C`;

    const blob = new Blob([template], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'quiz_template.txt');
  };

  return (
    <div className="card p-4 mb-4">
      <h3 className="mb-3">
        <FaFilePdf className="me-2" />
        Import Questions from PDF
      </h3>
      
      <div 
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('pdf-upload').click()}
      >
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        {isUploading ? (
          <div className="text-center">
            <FaSpinner className="spinner mb-2" />
            <p>Processing PDF...</p>
          </div>
        ) : file ? (
          <div className="text-center">
            <FaFilePdf size={48} className="mb-2 text-primary" />
            <p className="mb-0">{file.name}</p>
            <small className="text-muted">
              {(file.size / 1024).toFixed(2)} KB
            </small>
          </div>
        ) : (
          <div className="text-center">
            <FaUpload size={48} className="mb-3 text-muted" />
            <p className="mb-1">Drag & drop a PDF file here</p>
            <p className="text-muted small mb-0">or click to browse files</p>
          </div>
        )}
      </div>
      
      <div className="d-flex justify-content-between mt-3">
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={downloadTemplate}
          disabled={isUploading}
        >
          Download Template
        </button>
        
        <button 
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <>
              <FaSpinner className="spinner-border spinner-border-sm me-2" />
              Uploading...
            </>
          ) : (
            'Upload & Process'
          )}
        </button>
      </div>
      
      {message.text && (
        <div 
          className={`alert alert-${message.type === 'error' ? 'danger' : 'success'} mt-3 mb-0`}
        >
          {message.text}
        </div>
      )}
      
      <div className="mt-3">
        <small className="text-muted">
          <strong>Note:</strong> Ensure your PDF follows the template format for best results.
        </small>
      </div>
    </div>
  );
};

export default PdfUploader;
