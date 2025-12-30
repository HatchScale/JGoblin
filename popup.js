import * as pdfjsLib from './lib/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdf.worker.mjs';

document.addEventListener('DOMContentLoaded', function() {
  // UI Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  const generateButton = document.getElementById('generate');
  const jobDescription = document.getElementById('jobDescription');
  const companyName = document.getElementById('companyName');
  const jobRole = document.getElementById('jobRole'); // New
  const customInstructions = document.getElementById('customInstructions');
  const questionsInput = document.getElementById('questions');
  const toneSelect = document.getElementById('toneSelect');
  const addToneBtn = document.getElementById('addToneBtn');
  
  const resumeInput = document.getElementById('resume');
  const readResumeButton = document.getElementById('readResume');
  const clearResumeButton = document.getElementById('clearResume');
  const resumeContentDiv = document.getElementById('resume-content');
  const resumeTextDiv = document.getElementById('resume-text');
  const resumeStatusDiv = document.getElementById('resume-status');
  
  const answersContainer = document.getElementById('answers-container');

  // Cover Letter Elements
  const generateCoverLetterButton = document.getElementById('generateCoverLetter');
  const coverLetterOutput = document.getElementById('cover-letter-output');
  const coverLetterStatus = document.getElementById('cover-letter-status');
  const copyCoverLetterButton = document.getElementById('copyCoverLetter');
  const exportPdfButton = document.getElementById('exportPdf');
  const exportDocButton = document.getElementById('exportDoc');

  // Settings Elements
  const settingsButton = document.getElementById('settings-button');
  const settingsPanel = document.getElementById('settings-panel');
  const saveSettingsButton = document.getElementById('saveSettings');
  const apiKeyInput = document.getElementById('apiKey');
  const openaiApiKeyInput = document.getElementById('openaiApiKey'); // New
  const modelSelect = document.getElementById('modelSelect');
  const storageOptions = document.querySelectorAll('input[name="storage"]');
  const googleSheetsConfig = document.getElementById('google-sheets-config');
  const googleSheetUrlInput = document.getElementById('googleSheetUrl');
  const exportCsvButton = document.getElementById('exportCsv');
  const clearJobButton = document.getElementById('clearJob');
  
  const historyContainer = document.getElementById('history-container');
  const toggleHistoryTitle = document.getElementById('toggleHistory');
  const clearHistoryButton = document.getElementById('clearHistory');

  // --- 0. Tab Logic ---
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => {
            c.classList.remove('active'); 
            c.style.display = 'none'; // Ensure display none is toggled
        });

        // Add active to clicked
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        const content = document.getElementById(tabId);
        content.classList.add('active');
        content.style.display = 'block';
    });
  });

  // --- 1. Load Data from Storage on Startup ---
    chrome.storage.local.get([
      'apiKey', 
      'openaiApiKey', // New
      'modelName',
      'companyName', 
      'jobRole',
      'jobDescription', 
      'questions', 
      'customInstructions', 
      'googleSheetUrl',
      'resumeText',
      'storageType',
      'tone',
      'customTonesMap', // Stored as { name: instruction }
      'history'
    ], function(result) {
      if (result.apiKey) apiKeyInput.value = result.apiKey;
      if (result.openaiApiKey) openaiApiKeyInput.value = result.openaiApiKey; // New
      if (result.modelName) {
        modelSelect.value = result.modelName;
    } else {
        modelSelect.value = "gemini-1.5-flash";
    }
    if (result.companyName) companyName.value = result.companyName;
    if (result.jobRole) jobRole.value = result.jobRole;
    if (result.jobDescription) jobDescription.value = result.jobDescription;
    if (result.questions) questionsInput.value = result.questions;
    if (result.customInstructions) customInstructions.value = result.customInstructions;
    if (result.googleSheetUrl) googleSheetUrlInput.value = result.googleSheetUrl;
    
    // Populate Custom Tones
    if (result.customTonesMap) {
        Object.keys(result.customTonesMap).forEach(toneName => {
            addToneOption(toneName);
        });
    }

    if (result.tone) toneSelect.value = result.tone;
    
    if (result.storageType) {
        const radio = document.querySelector(`input[name="storage"][value="${result.storageType}"]`);
        if (radio) {
          radio.checked = true;
          if (result.storageType === 'google_sheets') {
              googleSheetsConfig.style.display = 'block';
          }
        }
    }

    if (result.resumeText) {
      resumeTextDiv.innerText = result.resumeText;
      resumeStatusDiv.style.display = 'block';
      resumeContentDiv.style.display = 'block';
    }

    if (result.history) {
        renderHistory(result.history);
    }
  });

  // --- 1.5 Listen for Storage Changes ---
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        ['jobDescription', 'companyName', 'questions', 'jobRole'].forEach(key => {
            if (changes[key]) {
                const newValue = changes[key].newValue;
                const element = document.getElementById(key === 'questions' ? 'questions' : key);
                if (element) {
                    if (newValue !== undefined) {
                        element.value = newValue;
                        highlightField(element);
                    } else {
                        element.value = '';
                    }
                }
            }
        });
    }
  });

  function highlightField(element) {
      element.style.borderColor = '#2ecc71';
      setTimeout(() => { element.style.borderColor = '#d1d5da'; }, 1000);
  }

  // --- 2. Add Custom Tone Logic ---
  addToneBtn.addEventListener('click', () => {
      const toneName = prompt("Enter a label for this tone (e.g., 'STAR Method'):");
      if (!toneName) return;

      const toneInstruction = prompt(`Enter instructions for the tone "${toneName}":\n(e.g., 'Write in bullet points' or 'Use the STAR method')`);
      if (!toneInstruction) return;

      addToneOption(toneName.trim());
      toneSelect.value = toneName.trim();
      
      chrome.storage.local.get({ customTonesMap: {} }, (result) => {
          const updatedMap = { ...result.customTonesMap, [toneName.trim()]: toneInstruction.trim() };
          chrome.storage.local.set({ customTonesMap: updatedMap, tone: toneName.trim() });
      });
  });

  function addToneOption(toneName) {
      for (let i = 0; i < toneSelect.options.length; i++) {
          if (toneSelect.options[i].value === toneName) return;
      }
      const option = document.createElement('option');
      option.value = toneName;
      option.textContent = toneName;
      toneSelect.appendChild(option);
  }

  // --- 2.5 New Application / Clear Job Logic ---
  clearJobButton.addEventListener('click', function() {
    if (confirm("Clear current application details (Company, Role, Job Description, Questions)?\n\nYour Resume, Custom Instructions, and Settings will be saved.")) {
      chrome.storage.local.remove(['companyName', 'jobRole', 'jobDescription', 'questions'], function() {
        companyName.value = '';
        jobRole.value = '';
        jobDescription.value = '';
        questionsInput.value = '';
        answersContainer.innerHTML = '';
        coverLetterOutput.innerText = '';
      });
    }
  });

  // --- 2.6 Clear Resume Logic ---
  clearResumeButton.addEventListener('click', function() {
    if (confirm("Clear resume data? This will remove the stored resume from memory.")) {
      resumeTextDiv.innerText = '';
      resumeContentDiv.style.display = 'none';
      resumeStatusDiv.style.display = 'none';
      resumeInput.value = '';
      chrome.storage.local.remove('resumeText');
    }
  });

  // --- 3. Auto-save ---
  const inputsToSave = {
    companyName: companyName,
    jobRole: jobRole,
    jobDescription: jobDescription,
    questions: questionsInput,
    customInstructions: customInstructions,
    tone: toneSelect
  };

  for (const [key, element] of Object.entries(inputsToSave)) {
    element.addEventListener('input', function() { 
      let data = {};
      data[key] = this.value;
      chrome.storage.local.set(data);
    });
    if (key === 'tone') { // Special case for select change
        element.addEventListener('change', function() {
            chrome.storage.local.set({ tone: this.value });
        });
    }
  }

  // --- 4. Settings ---
  settingsButton.addEventListener('click', function() {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    settingsButton.textContent = settingsPanel.style.display === 'none' ? 'Settings' : 'Hide Settings';
  });

  storageOptions.forEach(function(radio) {
    radio.addEventListener('change', function() {
      if (this.value === 'google_sheets') {
        googleSheetsConfig.style.display = 'block';
      } else {
        googleSheetsConfig.style.display = 'none';
      }
    });
  });

  saveSettingsButton.addEventListener('click', function() {
    const storageType = document.querySelector('input[name="storage"]:checked').value;
    chrome.storage.local.set({
      apiKey: apiKeyInput.value,
      openaiApiKey: openaiApiKeyInput.value, // New
      modelName: modelSelect.value,
      googleSheetUrl: googleSheetUrlInput.value,
      storageType: storageType
    }, function() {
      alert('Settings saved successfully!');
      settingsPanel.style.display = 'none';
      settingsButton.textContent = 'Settings';
    });
  });


  // --- 5. Resume ---
  readResumeButton.addEventListener('click', function() {
    const file = resumeInput.files[0];
    if (!file) {
      alert('Please select a resume file first.');
      return;
    }

    readResumeButton.textContent = "Processing...";
    readResumeButton.disabled = true;

    const reader = new FileReader();
    reader.onload = function(event) {
      const arrayBuffer = event.target.result;

      const handleText = (text) => {
        resumeTextDiv.innerText = text;
        resumeContentDiv.style.display = 'block';
        resumeStatusDiv.style.display = 'block';
        resumeStatusDiv.innerText = "New resume loaded and saved.";
        chrome.storage.local.set({ resumeText: text });
        readResumeButton.textContent = "Process Resume";
        readResumeButton.disabled = false;
      };

      if (file.type === 'application/pdf') {
        pdfjsLib.getDocument(arrayBuffer).promise.then(function(pdf) {
          let countPromises = [];
          for (let j = 1; j <= pdf.numPages; j++) {
            countPromises.push(pdf.getPage(j).then(page => {
              return page.getTextContent().then(text => {
                return text.items.map(s => s.str).join(' ');
              });
            }));
          }
          Promise.all(countPromises).then(texts => handleText(texts.join('\n\n')));
        }).catch(err => {
            console.error(err);
            alert("Error parsing PDF.");
            readResumeButton.textContent = "Process Resume";
            readResumeButton.disabled = false;
        });
      } else if (file.name.endsWith('.docx')) {
        mammoth.extractRawText({arrayBuffer: arrayBuffer})
          .then(result => handleText(result.value))
          .catch(err => {
            console.error(err);
            alert('Error reading docx file.');
            readResumeButton.textContent = "Process Resume";
            readResumeButton.disabled = false;
          });
      } else {
        const textReader = new FileReader();
        textReader.onload = (e) => handleText(e.target.result);
        textReader.readAsText(file);
      }
    };

    if (file.type === 'application/pdf' || file.name.endsWith('.docx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });

  // --- 6. API Helper ---
  async function callAIAPI(prompt, modelName) {
    const isOpenAI = modelName.startsWith('gpt-');
    
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['apiKey', 'openaiApiKey'], async (result) => {
        const apiKey = isOpenAI ? result.openaiApiKey : result.apiKey;
        
        if (!apiKey) {
            return reject(new Error(`Please enter your ${isOpenAI ? 'OpenAI' : 'Gemini'} API key in Settings.`));
        }

        try {
            if (isOpenAI) {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error?.message || 'OpenAI API Error');
                resolve(data.choices[0].message.content);
            } else {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const responseText = await response.text();
                if (!response.ok) {
                    let msg = `HTTP ${response.status}`;
                    try { msg = JSON.parse(responseText).error.message; } catch(e){}
                    throw new Error(msg);
                }
                const data = JSON.parse(responseText);
                resolve(data.candidates[0].content.parts[0].text);
            }
        } catch (error) {
            reject(error);
        }
      });
    });
  }

  // --- 7. Interview Answers Generation ---
  generateButton.addEventListener('click', async function() {
    const jobDesc = jobDescription.value;
    const company = companyName.value;
    const instructions = customInstructions.value;
    const selectedToneName = toneSelect.value;
    const resume = resumeTextDiv.innerText;
    const modelName = modelSelect.value;
    const storageType = document.querySelector('input[name="storage"]:checked').value;
    const googleSheetUrl = googleSheetUrlInput.value;
    const questions = questionsInput.value.split('\n').filter(q => q.trim() !== '');

    if (!resume) return alert('Please upload and process your resume first.');
    if (questions.length === 0) return alert('Please enter at least one question.');

    answersContainer.innerHTML = "<p>Talking to AI...</p>";
    generateButton.disabled = true;

    // Get specific instruction for the selected tone
    const res = await new Promise(resolve => chrome.storage.local.get(['customTonesMap'], resolve));
    const toneInstruction = (res.customTonesMap && res.customTonesMap[selectedToneName]) 
                            ? res.customTonesMap[selectedToneName] 
                            : selectedToneName;

    const applicationData = {
      company: company,
      applicationDate: new Date().toLocaleDateString(),
      questions: []
    };
    let newHistoryItems = [];

    for (const question of questions) {
        const tempId = 'temp-' + Date.now();
        answersContainer.insertAdjacentHTML('beforeend', `<p id="${tempId}">Generating answer for: <em>${question}</em>...</p>`);
        
        const prompt = `
Context: I am applying for a job.
My Resume:
${resume}

Target Company: ${company}
Job Description:
${jobDesc}

Tone/Style Instruction: ${toneInstruction}
Custom Instructions:
${instructions}

Task: Write a concise, professional, and tailored answer to the following interview question based on my resume and the job description, strictly following the Tone/Style Instruction provided above.
Question: "${question}"
`;
        
        try {
            const answer = await callAIAPI(prompt, modelName);
            const tempEl = document.getElementById(tempId);
            if(tempEl) tempEl.remove();
            
            const formattedAnswer = answer.replace(/\n/g, '<br>');
            const answerCard = createAnswerCard(question, formattedAnswer, answer);
            answersContainer.appendChild(answerCard);

            applicationData.questions.push({ question, answer });
            newHistoryItems.push({ date: new Date().toLocaleDateString(), company: company || "Unknown Company", question, answer });
        } catch (e) {
             const tempEl = document.getElementById(tempId);
             if(tempEl) tempEl.innerText = `Error: ${e.message}`;
             if (e.message.includes("API key")) {
                 settingsPanel.style.display = 'block';
                 settingsButton.textContent = 'Hide Settings';
                 break; 
             }
        }
    }

    generateButton.disabled = false;
    // ... rest of saving logic

    // Save History & Data
    chrome.storage.local.get({ history: [] }, (result) => {
        let history = [...newHistoryItems, ...result.history].slice(0, 10);
        chrome.storage.local.set({ history }, () => renderHistory(history));
    });

    if (storageType === 'local') {
      chrome.storage.local.get({ applications: [] }, function(result) {
        const applications = [...result.applications, applicationData];
        chrome.storage.local.set({ applications });
      });
    } else if (storageType === 'google_sheets' && googleSheetUrl) {
      chrome.identity.getAuthToken({ interactive: true }, function(token) {
        if (!chrome.runtime.lastError) writeToGoogleSheet(token, googleSheetUrl, applicationData);
      });
    }
  });

  // --- 8. Cover Letter Generation ---
  generateCoverLetterButton.addEventListener('click', async function() {
      const modelName = modelSelect.value;
      const isOpenAI = modelName.startsWith('gpt-');
      const resume = resumeTextDiv.innerText;
      const jobDesc = jobDescription.value;
      const company = companyName.value;
      const role = jobRole.value;

      if (!resume) return alert('Please upload and process your resume first.');
      if (!jobDesc || !company || !role) {
          alert('Please fill in Company Name, Job Role, and Job Description.');
          return;
      }
      
      // Check for appropriate API key based on selected model
      const apiKeyResult = await new Promise(resolve => {
        chrome.storage.local.get(['apiKey', 'openaiApiKey'], resolve);
      });
      const apiKey = isOpenAI ? apiKeyResult.openaiApiKey : apiKeyResult.apiKey;
      if (!apiKey) {
          alert(`Please enter your ${isOpenAI ? 'OpenAI' : 'Gemini'} API key in Settings.`);
          settingsPanel.style.display = 'block';
          settingsButton.textContent = 'Hide Settings';
          return;
      }

      generateCoverLetterButton.disabled = true;
      coverLetterOutput.innerText = "";
      
      try {
          // PROMPT 1: Role Deep Dive
          coverLetterStatus.innerText = "Step 1/3: Analyzing role and company...";
          const prompt1 = `
You are a career analyst helping a job seeker deeply understand a role before applying.

**Job Description:**
${jobDesc}

**Job Role:**
${role}

**Company Name:**
${company}

Analyze this opportunity and provide:
1. **A Day in the Life**
2. **What Makes This Role Exciting**
3. **Core Requirements vs. Transferable Skills**
4. **The Ideal Candidate Profile**
5. **Company Context**

Be specific and grounded. Avoid generic statements that could apply to any job.
`;
          const analysisOutput = await callAIAPI(prompt1, modelName);

          // PROMPT 2: Profile Analysis + Cover Letter Draft
          coverLetterStatus.innerText = "Step 2/3: Drafting tailored cover letter...";
          const prompt2 = `
You are a cover letter specialist who writes authentic, compelling applications that stand out.

**Candidate Resume:**
${resume}

**Role Analysis (from previous prompt):**
${analysisOutput}

**Job Role:**
${role}

**Company Name:**
${company}

**Instructions:**
First, analyze the candidate silently.
Then write a cover letter following these principles:

**Structure (4 paragraphs, under 400 words total):**
**Paragraph 1 - The Hook:** Open with something specific.
**Paragraph 2 - The Proof:** One or two concrete examples.
**Paragraph 3 - The Bridge:** Connect trajectory to their needs.
**Paragraph 4 - The Close:** Express genuine interest.

**Writing Style:**
- First person, conversational but professional
- Vary sentence length naturally
- No buzzwords or filler phrases
- Sound like a real person wrote this, not a template
`;
          const draftOutput = await callAIAPI(prompt2, modelName);

          // PROMPT 3: Human Polish Pass
          coverLetterStatus.innerText = "Step 3/3: Polishing to sound authentically human...";
          const prompt3 = `
You are an editor who makes writing sound authentically human.

**Draft Cover Letter:**
${draftOutput}

**Your Task:**
Review this cover letter and revise it to sound completely natural and human-written.

**Find and Fix:**
1. **AI Giveaways:** Remove em dashes, "I am excited to", "I am confident that", "leverage", "utilize", "passionate about".
2. **Overly Formal Language:** Use "I have" instead of "I possess", "I want to help" instead of "seeking to contribute".
3. **Filler and Fluff:** Cut sentences that don't add info.
4. **Flow Check:** Ensure it sounds like one voice.

**Output:**
The revised cover letter only. Keep it under 400 words. Preserve specific details.
`;
          const finalOutput = await callAIAPI(prompt3, modelName);

          coverLetterOutput.innerText = finalOutput;
          coverLetterStatus.innerText = "Done! You can edit the text above.";

      } catch (error) {
          coverLetterStatus.innerText = "Error encountered.";
          coverLetterOutput.innerText = `Error: ${error.message}`;
      } finally {
          generateCoverLetterButton.disabled = false;
      }
  });

  copyCoverLetterButton.addEventListener('click', () => {
      const text = coverLetterOutput.innerText;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
          copyCoverLetterButton.textContent = "Copied!";
          setTimeout(() => copyCoverLetterButton.textContent = "Copy Text", 2000);
      });
  });

  exportPdfButton.addEventListener('click', () => {
      const text = coverLetterOutput.innerText;
      if (!text) return alert("Generate a cover letter first.");
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFont("helvetica");
      doc.setFontSize(11);
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxLineWidth = pageWidth - (margin * 2);
      
      const splitText = doc.splitTextToSize(text, maxLineWidth);
      doc.text(splitText, margin, margin);
      
      doc.save("Cover_Letter.pdf");
  });

  exportDocButton.addEventListener('click', () => {
      const text = coverLetterOutput.innerText;
      if (!text) return alert("Generate a cover letter first.");

      const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Cover Letter</title></head><body><p style='font-family: Arial; font-size: 11pt; line-height: 1.5; white-space: pre-wrap;'>";
      const postHtml = "</p></body></html>";
      const html = preHtml + text + postHtml;

      const blob = new Blob(['\ufeff', html], {
          type: 'application/msword'
      });
      
      const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Cover_Letter.doc';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  });

  // --- Helpers ---
  function createAnswerCard(question, formattedAnswer, rawAnswer) {
    const card = document.createElement('div');
    card.className = 'answer';
    const header = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <h4 style="margin: 0; color: #4a90e2; flex: 1; padding-right: 10px;">${question}</h4>
        <button class="copy-btn" style="width: auto; padding: 4px 12px; font-size: 0.8em; background-color: #f0f2f5; color: #333; border: 1px solid #d1d5da; cursor: pointer; border-radius: 4px;">Copy</button>
      </div>`;
    card.innerHTML = header + `<div><p>${formattedAnswer}</p></div>`;
    
    card.querySelector('.copy-btn').addEventListener('click', (e) => {
        navigator.clipboard.writeText(rawAnswer).then(() => {
            const btn = e.target;
            btn.textContent = 'Copied!';
            btn.style.backgroundColor = '#2ecc71';
            btn.style.color = 'white';
            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.style.backgroundColor = '#f0f2f5';
                btn.style.color = '#333';
            }, 2000);
        });
    });
    return card;
  }

  function renderHistory(history) {
      historyContainer.innerHTML = '';
      if (!history || history.length === 0) {
          historyContainer.innerHTML = '<p style="color: #666; font-size: 0.9em; font-style: italic; text-align: center;">No history yet.</p>';
          return;
      }
      history.forEach(item => {
          const div = document.createElement('div');
          div.style.cssText = "border-bottom: 1px solid #eee; padding: 10px 0; margin-bottom: 10px;";
          div.innerHTML = `
            <div style="font-size: 0.75em; color: #999; margin-bottom: 4px;">${item.date} - ${item.company}</div>
            <div style="font-weight: 600; font-size: 0.9em; margin-bottom: 6px;">${item.question}</div>
            <details>
                <summary style="font-size: 0.8em; color: #4a90e2; cursor: pointer;">Show Answer</summary>
                <div style="font-size: 0.9em; color: #444; margin-top: 8px; background: #fcfcfc; padding: 10px; border-radius: 4px; line-height: 1.5;">${item.answer.replace(/\n/g, '<br>')}</div>
                <button class="copy-hist" style="font-size: 0.75em; padding: 4px 8px; margin-top: 8px; width: auto; background: #eee;">Copy Answer</button>
            </details>`;
          div.querySelector('.copy-hist').addEventListener('click', () => navigator.clipboard.writeText(item.answer));
          historyContainer.appendChild(div);
      });
  }
  
  toggleHistoryTitle.addEventListener('click', () => {
      historyContainer.style.display = historyContainer.style.display === 'none' ? 'block' : 'none';
  });

  clearHistoryButton.addEventListener('click', () => {
      if (confirm("Clear all history?")) {
          chrome.storage.local.remove('history', () => renderHistory([]));
      }
  });

  function writeToGoogleSheet(token, sheetUrl, data) {
    const matches = sheetUrl.match(/d\/([a-zA-Z0-9-_]+)/);
    if (!matches) return;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${matches[1]}/values/A1:append?valueInputOption=USER_ENTERED`;
    const values = data.questions.map(q => [data.company, data.applicationDate, q.question, q.answer]);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ values })
    });
  }

  exportCsvButton.addEventListener('click', function() {
    chrome.storage.local.get({ applications: [] }, function(result) {
      if (!result.applications.length) return alert('No data to export.');
      const headers = ['Company', 'Date', 'Question', 'Answer'];
      const rows = result.applications.flatMap(app => app.questions.map(q => [app.company, app.applicationDate, q.question, q.answer]));
      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", "JGoblin_History.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });
});