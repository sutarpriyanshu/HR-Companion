// src/App.js
import React, { useState } from 'react';
import axios from 'axios';
import ResumeUpload from './components/ResumeUpload';
import JobDescription from './components/JobDescription';
import Results from './components/Results';
import './App.css';

function App() {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeResume = async () => {
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await axios.post('http://localhost:3001/analyze-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResults(response.data);
    } catch (err) {
      setError('An error occurred during analysis. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Resume Analyzer Dashboard</h1>
      </header>
      <main className="app-main">
        <div className="input-section">
          <ResumeUpload setResume={setResume} />
          <JobDescription setJobDescription={setJobDescription} />
          <button
            className="analyze-button"
            onClick={analyzeResume}
            disabled={!resume || !jobDescription || isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>
        {results && <Results results={results} />}
      </main>
    </div>
  );
}

export default App;