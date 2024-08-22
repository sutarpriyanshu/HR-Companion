import React from 'react';

function JobDescription({ setJobDescription }) {
  const handleInputChange = (event) => {
    setJobDescription(event.target.value);
  };

  return (
    <div className="job-description-section">
      <h2>Job Description</h2>
      <textarea
        rows="5"
        onChange={handleInputChange}
        placeholder="Enter job description here..."
        className="job-description-input"
      ></textarea>
    </div>
  );
}

export default JobDescription;