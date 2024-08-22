// src/components/Results.js
import React from 'react';

function Results({ results }) {
  return (
    <div className="results-section">
      <div className="result-card match-score">
        <h3>Match Score</h3>
        <div className="score-circle">
          <span>{results.matchScore}%</span>
        </div>
      </div>
      <div className="result-card strengths">
        <h3>Strengths</h3>
        <ul>
          {results.strengths.map((strength, index) => (
            <li key={index}>{strength}</li>
          ))}
        </ul>
      </div>
      <div className="result-card improvements">
        <h3>Areas for Improvement</h3>
        <ul>
          {results.areasForImprovement.map((area, index) => (
            <li key={index}>{area}</li>
          ))}
        </ul>
      </div>
      <div className="result-card keywords">
        <h3>Key Matching Keywords</h3>
        <p>{results.keyMatchingKeywords.join(', ')}</p>
      </div>
      <div className="result-card keywords">
        <h3>Missing Important Keywords</h3>
        <p>{results.missingKeywords.join(', ')}</p>
      </div>
      <div className="result-card explanation">
        <h3>Explanation</h3>
        <p>{results.explanation}</p>
      </div>
      {results.reportUrl && (
        <div className="result-card download-section">
          <a
            href={`http://localhost:3001${results.reportUrl}`}
            className="download-button"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Analysis Report
          </a>
        </div>
      )}
    </div>
  );
}

export default Results;
