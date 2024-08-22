const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { TextServiceClient } = require('@google-ai/generativelanguage').v1beta2;
const { GoogleAuth } = require('google-auth-library');
const pdfParse = require('pdf-parse');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

const MODEL_NAME = 'models/text-bison-001';
const API_KEY = 'AIzaSyB5E49ClaNYKfiUpdWBpdWR5PTVVUnlAPU'; // Replace with your actual API key

const client = new TextServiceClient({
  authClient: new GoogleAuth().fromAPIKey(API_KEY),
});

const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

const extractKeywords = (text) => {
  try {
    // Define a more comprehensive list of common words to exclude
    const commonWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 
      'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 
      'with', 'i', 'you', 'your', 'we', 'they', 'them', 'their', 'this', 'these', 
      'those', 'am', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'or', 'because', 
      'as', 'until', 'while', 'about', 'against', 'between', 'into', 'through', 
      'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 
      'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 
      'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 
      'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 
      'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 
      'should', 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', 'couldn', 
      'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'ma', 'mightn', 'mustn', 
      'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn'
    ]);
    
    // Use a more specific regex to match potential keywords
    const words = text.toLowerCase().match(/\b([a-z]+(?:-[a-z]+)*)\b/g) || [];
    
    const wordCounts = {};
    words.forEach(word => {
      // Ignore common words and very short words
      if (!commonWords.has(word) && word.length > 2) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    // Sort by frequency and get top 20
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(entry => entry[0]);
  } catch (error) {
    console.error('Error extracting keywords:', error);
    return []; // Return an empty array if keyword extraction fails
  }
};

const calculateMatchScore = (resumeKeywords, jobKeywords) => {
  const matchingKeywords = resumeKeywords.filter(keyword => jobKeywords.includes(keyword));
  return Math.round((matchingKeywords.length / jobKeywords.length) * 100);
};

const generateAnalysisReport = (analysisResults) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const pdfPath = path.join(__dirname, 'analysis_report.pdf');
    const writeStream = fs.createWriteStream(pdfPath);

    doc.pipe(writeStream);

    doc.fontSize(18).text('Resume Analysis Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Match Score: ${analysisResults.matchScore}%`);
    doc.moveDown();

    doc.fontSize(16).text('Strengths:');
    analysisResults.strengths.forEach((strength, index) => {
      doc.fontSize(12).text(`${index + 1}. ${strength}`);
    });
    doc.moveDown();

    doc.fontSize(16).text('Areas for Improvement:');
    analysisResults.areasForImprovement.forEach((area, index) => {
      doc.fontSize(12).text(`${index + 1}. ${area}`);
    });
    doc.moveDown();

    doc.fontSize(16).text('Key Matching Keywords:');
    doc.fontSize(12).text(analysisResults.keyMatchingKeywords.join(', '));
    doc.moveDown();

    doc.fontSize(16).text('Missing Keywords:');
    doc.fontSize(12).text(analysisResults.missingKeywords.join(', '));
    doc.moveDown();

    doc.fontSize(16).text('Explanation:');
    doc.fontSize(12).text(analysisResults.explanation);

    doc.end();

    writeStream.on('finish', () => {
      resolve(pdfPath);
    });

    writeStream.on('error', reject);
  });
};

app.post('/analyze-resume', upload.single('resume'), async (req, res) => {
  const { file } = req;
  const { jobDescription } = req.body;

  if (!file || !jobDescription) {
    return res.status(400).json({ error: 'Missing resume file or job description' });
  }

  try {
    const resumeText = await extractTextFromPDF(file.buffer);
    const resumeKeywords = extractKeywords(resumeText);
    const jobKeywords = extractKeywords(jobDescription);

    const matchScore = calculateMatchScore(resumeKeywords, jobKeywords);

    const prompt = `
      Analyze the following resume and job description. The match score is ${matchScore}%.
      Provide a detailed analysis including:
      1. Top 3 Strengths
      2. Top 2 Areas for Improvement
      3. Brief explanation of the match score

      Format your response EXACTLY as follows, including the headers:
      Strengths:
      1. [First strength]
      2. [Second strength]
      3. [Third strength]

      Areas for Improvement:
      1. [First area]
      2. [Second area]

      Explanation:
      [Brief explanation of the match score and overall assessment]

      Resume:
      ${resumeText}

      Job Description:
      ${jobDescription}
    `;

    console.log('Sending request to Gemini AI...');
    const result = await client.generateText({
      model: MODEL_NAME,
      prompt: { text: prompt },
    });
    console.log('Received response from Gemini AI:', JSON.stringify(result, null, 2));

    if (!result || !result[0] || !result[0].candidates || !result[0].candidates[0] || !result[0].candidates[0].output) {
      throw new Error('Unexpected response structure from Gemini AI');
    }

    const analysisResults = parseAIResponse(result[0].candidates[0].output, matchScore, resumeKeywords, jobKeywords);
    console.log('Parsed analysis results:', JSON.stringify(analysisResults, null, 2));

    const reportPath = await generateAnalysisReport(analysisResults);

    res.json({
      ...analysisResults,
      reportUrl: '/download-analysis-report'
    });
  } catch (error) {
    console.error('Error during analysis:', error);
    res.status(500).json({ error: 'An error occurred during analysis', details: error.message });
  }
});

const parseAIResponse = (response, matchScore, resumeKeywords, jobKeywords) => {
  const lines = response.split('\n');
  let result = {
    matchScore: matchScore,
    strengths: [],
    areasForImprovement: [],
    keyMatchingKeywords: [],
    missingKeywords: [],
    explanation: ''
  };

  let currentSection = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === 'Strengths:') {
      currentSection = 'strengths';
    } else if (trimmedLine === 'Areas for Improvement:') {
      currentSection = 'areasForImprovement';
    } else if (trimmedLine === 'Explanation:') {
      currentSection = 'explanation';
    } else if (trimmedLine && currentSection) {
      if (currentSection === 'explanation') {
        result.explanation += trimmedLine + ' ';
      } else if (/^\d+\./.test(trimmedLine)) {
        result[currentSection].push(trimmedLine.replace(/^\d+\.\s*/, ''));
      }
    }
  }

  result.keyMatchingKeywords = resumeKeywords.filter(keyword => jobKeywords.includes(keyword));
  result.missingKeywords = jobKeywords.filter(keyword => !resumeKeywords.includes(keyword));

  result.strengths = result.strengths.length ? result.strengths : ['No specific strengths identified'];
  result.areasForImprovement = result.areasForImprovement.length ? result.areasForImprovement : ['No specific areas for improvement identified'];
  result.keyMatchingKeywords = result.keyMatchingKeywords.length ? result.keyMatchingKeywords : ['No key matching keywords identified'];
  result.missingKeywords = result.missingKeywords.length ? result.missingKeywords : ['No missing important keywords identified'];
  result.explanation = result.explanation.trim() || 'No detailed explanation provided';

  return result;
};

app.get('/download-analysis-report', (req, res) => {
  const reportPath = path.join(__dirname, 'analysis_report.pdf');
  res.download(reportPath, 'analysis_report.pdf', (err) => {
    if (err) {
      res.status(500).send('Error downloading file');
    }
    fs.unlinkSync(reportPath);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});