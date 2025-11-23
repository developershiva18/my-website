// Global Variables
let currentSection = 'home';
let selectedSubject, selectedTopic, selectedDifficulty;
let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timerInterval, startTime;
let quizHistory = JSON.parse(localStorage.getItem('quizHistory')) || {};
let userName = localStorage.getItem('userName') || 'Anonymous';
let currentQuizData = null; // For analyze mode
let questionsData = {}; // Loaded from questions.json

// Load and parse questions.json into nested structure
async function loadQuestionsData() {
    try {
        const response = await fetch('questions.json'); // Adjust path if needed (e.g., './data/questions.json')
        if (!response.ok) throw new Error('Failed to load questions.json');
        const rawData = await response.json(); // Assumes array of objects
        questionsData = { subjects: {} };
        
        // Transform flat array into nested structure
        rawData.forEach(item => {
            const subject = item.subject.charAt(0).toUpperCase() + item.subject.slice(1).toLowerCase(); // Normalize case
            const topic = item.topic.charAt(0).toUpperCase() + item.topic.slice(1).toLowerCase();
            const difficulty = item.difficulty.toLowerCase();
            
            if (!questionsData.subjects[subject]) {
                questionsData.subjects[subject] = { topics: {} };
            }
            if (!questionsData.subjects[subject].topics[topic]) {
                questionsData.subjects[subject].topics[topic] = {};
            }
            if (!questionsData.subjects[subject].topics[topic][difficulty]) {
                questionsData.subjects[subject].topics[topic][difficulty] = [];
            }
            
            // Add question object
            questionsData.subjects[subject].topics[topic][difficulty].push({
                text: item.question,
                options: item.options,
                correct: item.correct
            });
        });
        
        console.log('Questions loaded and parsed successfully');
    } catch (error) {
        console.error('Error loading/parsing questions.json:', error);
        alert('Could not load questions. Using fallback data.');
        // Fallback mock data in your format
        const fallbackRaw = [
            {
                "subject": "c programming",
                "topic": "nested for loop",
                "difficulty": "medium",
                "question": "Predict the output:\nfor(int i=1;i<=4;i++) {\n    for(int j=1;j<=4;j++) {\n        if(i+j==5) printf(\"X\");\n        else printf(\"O\");\n    }\n    printf(\"\\n\");\n}",
                "options": [
                    "OOOX\nOOXO\nOXOO\nXOOO",
                    "OOOX\nOOXO\nOXOO\nOXXX",
                    "OOXO\nOXOO\nXOOO\nOOOO",
                    "OXOO\nXOOO\nOOOO\nOOOX"
                ],
                "correct": 0
            }
        ];
        // Parse fallback the same way
        questionsData = { subjects: {} };
        fallbackRaw.forEach(item => {
            const subject = item.subject.charAt(0).toUpperCase() + item.subject.slice(1).toLowerCase();
            const topic = item.topic.charAt(0).toUpperCase() + item.topic.slice(1).toLowerCase();
            const difficulty = item.difficulty.toLowerCase();
            
            if (!questionsData.subjects[subject]) {
                questionsData.subjects[subject] = { topics: {} };
            }
            if (!questionsData.subjects[subject].topics[topic]) {
                questionsData.subjects[subject].topics[topic] = {};
            }
            if (!questionsData.subjects[subject].topics[topic][difficulty]) {
                questionsData.subjects[subject].topics[topic][difficulty] = [];
            }
            
            questionsData.subjects[subject].topics[topic][difficulty].push({
                text: item.question,
                options: item.options,
                correct: item.correct
            });
        });
    }
}

// Utility Functions
function showSection(sectionId, title = sectionId.charAt(0).toUpperCase() + sectionId.slice(1)) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    currentSection = sectionId;
    document.getElementById('section-title').textContent = title;
}

function loadHomePage() {
    document.getElementById('name-display').textContent = userName;
    const totalAttempted = Object.values(quizHistory).reduce((sum, subj) => sum + Object.values(subj).flat().length, 0);
    document.getElementById('total-attempted').textContent = totalAttempted;
    const totalCorrect = Object.values(quizHistory).reduce((sum, subj) => sum + Object.values(subj).flat().reduce((s, quiz) => s + quiz.correct, 0), 0);
    const overallPercentage = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
    document.getElementById('overall-percentage').textContent = `${overallPercentage}%`;
    
    const pastQuizzesEl = document.getElementById('past-quizzes');
    pastQuizzesEl.innerHTML = '';
    
    if (Object.keys(quizHistory).length === 0) {
        pastQuizzesEl.innerHTML = '<p>No past quizzes yet. Start a new one!</p>';
        return;
    }
    
    // Sort subjects by number of quizzes (most first)
    const sortedSubjects = Object.keys(quizHistory).sort((a, b) => {
        const countA = Object.values(quizHistory[a]).flat().length;
        const countB = Object.values(quizHistory[b]).flat().length;
        return countB - countA;
    });
    
    sortedSubjects.forEach(subject => {
        const subjectGroup = document.createElement('div');
        subjectGroup.className = 'subject-group';
        subjectGroup.innerHTML = `<h3>${subject}</h3>`;
        const quizCards = document.createElement('div');
        quizCards.className = 'quiz-cards';
        
        // Sort quizzes within subject by timestamp (newest first)
        const allQuizzes = [];
        Object.keys(quizHistory[subject]).forEach(topic => {
            quizHistory[subject][topic].forEach(quiz => {
                allQuizzes.push({ ...quiz, topic });
            });
        });
        allQuizzes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        allQuizzes.forEach(quiz => {
            const card = document.createElement('div');
            card.className = 'quiz-card';
            card.innerHTML = `
                <div class="topic-info">${quiz.topic} - ${quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}</div>
                <button class="btn secondary re-attempt" data-subject="${subject}" data-topic="${quiz.topic}" data-difficulty="${quiz.difficulty}">Re Attempt</button>
                <button class="btn primary analyze" data-quiz='${JSON.stringify(quiz)}'>Analyze</button>
            `;
            quizCards.appendChild(card);
        });
        
        subjectGroup.appendChild(quizCards);
        pastQuizzesEl.appendChild(subjectGroup);
    });
}

function loadSubjects() {
    const subjectsEl = document.getElementById('subjects');
    subjectsEl.innerHTML = '';
    Object.keys(questionsData.subjects).forEach(subject => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = subject;
        btn.addEventListener('click', () => {
            selectedSubject = subject;
            loadTopics();
            showSection('topic-select', 'Select Topic');
        });
        subjectsEl.appendChild(btn);
    });
}

function loadTopics() {
    const topicsEl = document.getElementById('topics');
    topicsEl.innerHTML = '';
    Object.keys(questionsData.subjects[selectedSubject].topics).forEach(topic => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = topic;
        btn.addEventListener('click', () => {
            selectedTopic = topic;
            loadDifficulties();
            showSection('difficulty-select', 'Select Difficulty');
        });
        topicsEl.appendChild(btn);
    });
}

function loadDifficulties() {
    const difficultiesEl = document.getElementById('difficulties');
    difficultiesEl.innerHTML = '';
    ['easy', 'medium', 'hard'].forEach(diff => {
        if (questionsData.subjects[selectedSubject].topics[selectedTopic][diff] && questionsData.subjects[selectedSubject].topics[selectedTopic][diff].length > 0) {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
            btn.dataset.difficulty = diff;
            btn.addEventListener('click', () => {
                selectedDifficulty = diff;
                startQuiz();
            });
            difficultiesEl.appendChild(btn);
        }
    });
}

function startQuiz() {
    quizQuestions = questionsData.subjects[selectedSubject].topics[selectedTopic][selectedDifficulty];
    if (quizQuestions.length === 0) {
        alert('No questions available for this selection.');
        return;
    }
    currentQuestionIndex = 0;
    userAnswers = new Array(quizQuestions.length).fill(null);
    startTime = Date.now();
    timerInterval = setInterval(updateStopwatch, 1000);
    loadQuestion();
    showSection('quiz', 'Quiz');
}

function updateStopwatch() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    document.getElementById('stopwatch').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function loadQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    document.getElementById('question-text').textContent = question.text;
    document.getElementById('current-q').textContent = currentQuestionIndex + 1;
    document.getElementById('total-q').textContent = quizQuestions.length;
    const optionsEl = document.getElementById('options');
    optionsEl.innerHTML = '';
    question.options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'option';
        if (userAnswers[currentQuestionIndex] === index) div.classList.add('selected');
        div.textContent = option;
        div.addEventListener('click', () => selectOption(index));
        optionsEl.appendChild(div);
    });
    document.getElementById('prev-q').disabled = currentQuestionIndex === 0;
    document.getElementById('next-q').style.display = currentQuestionIndex === quizQuestions.length - 1 ? 'none' : 'inline-block';
    document.getElementById('submit-quiz').style.display = currentQuestionIndex === quizQuestions.length - 1 ? 'inline-block' : 'none';
}

function selectOption(index) {
    userAnswers[currentQuestionIndex] = index;
    document.querySelectorAll('.option').forEach((opt, i) => {
        opt.classList.toggle('selected', i === index);
    });
}

function loadResults() {
    clearInterval(timerInterval);
    const totalQuestions = quizQuestions.length;
    const attempted = userAnswers.filter(a => a !== null).length;
    const correct = userAnswers.reduce((sum, ans, i) => sum + (ans === quizQuestions[i].correct ? 1 : 0), 0);
    const percentage = Math.round((correct / totalQuestions) * 100);
    const performance = percentage >= 80 ? 'Excellent 😊' : percentage >= 60 ? 'Good 🙂' : 'Poor 😞';
    
    document.getElementById('total-q-result').textContent = totalQuestions;
    document.getElementById('attempted-result').textContent = attempted;
    document.getElementById('not-attempted-result').textContent = totalQuestions - attempted;
    document.getElementById('correct-result').textContent = correct;
    document.getElementById('performance-result').textContent = performance;
    document.getElementById('percentage-result').textContent = `${percentage}%`;
    
    // Save to history
    if (!quizHistory[selectedSubject]) quizHistory[selectedSubject] = {};
    if (!quizHistory[selectedSubject][selectedTopic]) quizHistory[selectedSubject][selectedTopic] = [];
    quizHistory[selectedSubject][selectedTopic].push({
        difficulty: selectedDifficulty,
        timestamp: new Date().toISOString(),
        answers: userAnswers,
        correct: correct,
        total: totalQuestions
    });
    localStorage.setItem('quizHistory', JSON.stringify(quizHistory));
    
    showSection('result', 'Result');
}

function loadAnalyzeQuiz(quizData) {
    currentQuizData = quizData;
    quizQuestions = questionsData.subjects[quizData.subject || selectedSubject].topics[quizData.topic].easy; // Assuming easy for now; adjust if needed
    currentQuestionIndex = 0;
    loadAnalyzeQuestion();
    showSection('analyze', 'Analyze Quiz');
}

function loadAnalyzeQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    document.getElementById('analyze-question-text').textContent = question.text;
    document.getElementById('analyze-current-q').textContent = currentQuestionIndex + 1;
    document.getElementById('analyze-total-q').textContent = quizQuestions.length;
    const optionsEl = document.getElementById('analyze-options');
    optionsEl.innerHTML = '';
    question.options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'option';
        if (index === question.correct) div.classList.add('correct');
        if (currentQuizData.answers && currentQuizData.answers[currentQuestionIndex] === index && index !== question.correct) div.classList.add('incorrect');
        div.textContent = option;
        optionsEl.appendChild(div);
    });
    document.getElementById('analyze-prev').disabled = currentQuestionIndex === 0;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestionsData();
    loadHomePage();
});

document.getElementById('start-new-quiz').addEventListener('click', () => {
    loadSubjects();
    showSection('subject-select', 'Select Subject');
});

document.getElementById('back-to-home').addEventListener('click', () => {
    loadHomePage();
    showSection('home');
});

document.getElementById('back-to-subject').addEventListener('click', () => {
    loadSubjects();
    showSection('subject-select', 'Select Subject');
});

document.getElementById('back-to-topic').addEventListener('click', () => {
    loadTopics();
    showSection('topic-select', 'Select Topic');
});

document.getElementById('prev-q').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
});

document.getElementById('next-q').addEventListener('click', () => {
    if (userAnswers[currentQuestionIndex] === null) {
        alert('Please select an option.');
        return;
    }
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    }
});

document.getElementById('submit-quiz').addEventListener('click', () => {
    if (userAnswers[currentQuestionIndex] === null) {
        alert('Please select an option.');
        return;
    }
    loadResults();
});

document.getElementById('go-to-home').addEventListener('click', () => {
    loadHomePage();
    showSection('home');
});

document.getElementById('analyze-quiz').addEventListener('click', () => {
    loadAnalyzeQuiz(currentQuizData);
});

document.getElementById('back-to-result').addEventListener('click', () => {
    showSection('result', 'Result');
});

document.getElementById('analyze-prev').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadAnalyzeQuestion();
    }
});

document.getElementById('analyze-next').addEventListener('click', () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        loadAnalyzeQuestion();
    }
});

document.getElementById('dark-mode-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
});

document.getElementById('edit-name-icon').addEventListener('click', () => {
    const input = document.getElementById('name-input');
    input.style.display = 'inline';
    input.focus();
});

document.getElementById('name-input').addEventListener('blur', () => {
    const input = document.getElementById('name-input');
    const newName = input.value.trim();
    userName = newName || 'Anonymous';
    localStorage.setItem('userName', userName);
    document.getElementById('name-display').textContent = userName;
    input.style.display = 'none';
    input.value = '';
});

document.getElementById('name-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('name-input').blur();
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('re-attempt')) {
        selectedSubject = e.target.dataset.subject;
        selectedTopic = e.target.dataset.topic;
        selectedDifficulty = e.target.dataset.difficulty;
        startQuiz();
    } else if (e.target.classList.contains('analyze')) {
        const quizData = JSON.parse(e.target.dataset.quiz);
        loadAnalyzeQuiz(quizData);
    }
});

// Load dark mode on start
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
}