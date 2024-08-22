import React from 'react';

function ResumeUpload({ setResume }) {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setResume(file);
  };

  return (
    <div className="upload-section">
      <h2>Upload Resume (PDF)</h2>
      <input type="file" accept=".pdf" onChange={handleFileUpload} className="file-input" />
    </div>
  );
}

export default ResumeUpload;