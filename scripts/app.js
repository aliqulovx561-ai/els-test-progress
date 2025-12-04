import { getAvailableUnits, loadUnit, getUnitGrammarInfo } from './units.js';
import { 
    getExerciseProgress, 
    saveExerciseProgress, 
    getUnitOverallProgress, 
    generateExerciseQuestions,
    getExerciseButtonClass,
    getExerciseDisplayName,
    generateGrammarQuestions 
} from './exercises.js';
import { sendResultToTelegram, prepareTelegramData } from './telegram.js';

// Global state
let studentData = {
    name: '',
    surname: '',
    group: '',
    entryTime: null
};

let currentUnit = null;
let currentCardIndex = 0;
let cardShuffled = [];
let currentExerciseType = '';
let currentQuestion = 0;
let exerciseQuestions = [];
let exerciseTimer = null;
let exerciseScore = { correct: 0, wrong: 0 };
let selectedTestSize = 50;
let isGrandTest = false;

// DOM elements
const welcomePage = document.getElementById('welcomePage');
const mainPage = document.getElementById('mainPage');
const unitPage = document.getElementById('unitPage');
const exercisePage = document.getElementById('exercisePage');
const resultsPage = document.getElementById('resultsPage');
const grandTestSetup = document.getElementById('grandTestSetup');
const globalHeader = document.getElementById('globalHeader');

// Initialize app
window.onload = function() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadSavedData();
    renderUnits();
    setupEventListeners();
};

// Set up event listeners
function setupEventListeners() {
    window.addEventListener('beforeunload', function() {
        sendIncompleteIfNeeded('Browser closed during exercise');
    });
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const display = document.getElementById('datetimeDisplay');
    if (display) {
        display.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Load saved name and surname
function loadSavedData() {
    const savedName = localStorage.getItem('elsName');
    const savedSurname = localStorage.getItem('elsSurname');
    if (savedName) document.getElementById('nameInput').value = savedName;
    if (savedSurname) document.getElementById('surnameInput').value = savedSurname;
}

// Enter app
window.enterApp = function(event) {
    event.preventDefault();
    const name = document.getElementById('nameInput').value.trim();
    const surname = document.getElementById('surnameInput').value.trim();
    const group = document.getElementById('groupInput').value.trim();

    if (!name || !surname || !group) {
        alert('Please fill all fields');
        return;
    }

    studentData.name = name;
    studentData.surname = surname;
    studentData.group = group;
    studentData.entryTime = new Date();

    // Save name and surname
    localStorage.setItem('elsName', name);
    localStorage.setItem('elsSurname', surname);

    welcomePage.classList.add('hidden');
    mainPage.classList.remove('hidden');
    globalHeader.classList.remove('hidden');
};

// Render units
async function renderUnits() {
    const grid = document.getElementById('unitsGrid');
    grid.innerHTML = '';
    
    const units = await getAvailableUnits();
    
    units.forEach(async unitInfo => {
        const overallProgress = getUnitOverallProgress(unitInfo.id);
        const progressPercent = overallProgress.completionRate;
        
        const card = document.createElement('div');
        card.className = `unit-card ${unitInfo.status === 'available' ? '' : 'coming-soon'}`;
        
        if (unitInfo.status === 'available') {
            card.onclick = () => openUnit(unitInfo.id);
        } else {
            card.style.cursor = 'not-allowed';
        }
        
        card.innerHTML = `
            <div class="unit-number">Unit ${unitInfo.id}</div>
            <div class="unit-title">${unitInfo.title}</div>
            ${unitInfo.status === 'available' ? 
                `<div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>` : 
                ''}
        `;
        
        grid.appendChild(card);
    });
}

// Filter units
window.filterUnits = function() {
    const search = document.getElementById('searchBar').value.toLowerCase();
    const cards = document.querySelectorAll('.unit-card');
    
    cards.forEach(card => {
        const title = card.querySelector('.unit-title').textContent.toLowerCase();
        card.style.display = title.includes(search) ? 'block' : 'none';
    });
};

// Open unit
async function openUnit(unitId) {
    currentUnit = await loadUnit(unitId);
    if (!currentUnit) {
        alert('This unit is not available yet.');
        return;
    }

    mainPage.classList.add('hidden');
    unitPage.classList.remove('hidden');
    document.getElementById('unitPageTitle').textContent = `Unit ${currentUnit.id}: ${currentUnit.title}`;
    document.getElementById('textContent').textContent = currentUnit.text;
    
    // Initialize cards
    cardShuffled = [...currentUnit.words].sort(() => Math.random() - 0.5);
    currentCardIndex = 0;
    showCard();
    
    document.getElementById('cardsCompleteButtons').classList.add('hidden');
    
    // Show grammar section if available
    if (currentUnit.grammarStructure) {
        const grammarSection = document.getElementById('grammarSection');
        grammarSection.classList.remove('hidden');
        document.getElementById('grammarStructure').textContent = currentUnit.grammarStructure;
        
        const examplesList = document.getElementById('grammarExamplesList');
        examplesList.innerHTML = '';
        currentUnit.grammarExamples.forEach(example => {
            const li = document.createElement('li');
            li.textContent = example;
            examplesList.appendChild(li);
        });
    }
    
    // Render exercise progress
    renderExerciseProgress();
}

// Show main page
window.showMainPage = function() {
    sendIncompleteIfNeeded('Returned to main page');
    unitPage.classList.add('hidden');
    exercisePage.classList.add('hidden');
    resultsPage.classList.add('hidden');
    grandTestSetup.classList.add('hidden');
    mainPage.classList.remove('hidden');
    renderUnits();
};

// Show card
function showCard() {
    if (currentCardIndex >= cardShuffled.length) {
        document.getElementById('cardsCompleteButtons').classList.remove('hidden');
        createFireworks();
        return;
    }

    const word = cardShuffled[currentCardIndex];
    document.getElementById('cardWord').textContent = word.word;
    document.getElementById('cardDefinition').textContent = word.definition;
    document.getElementById('cardTranslation').textContent = word.translation;
    document.getElementById('cardProgress').textContent = `Card ${currentCardIndex + 1} / ${cardShuffled.length}`;
    document.getElementById('flipCard').classList.remove('flipped');
}

// Flip card
window.flipCard = function() {
    document.getElementById('flipCard').classList.toggle('flipped');
};

// Next card
window.nextCard = function() {
    currentCardIndex++;
    showCard();
};

// Previous card
window.previousCard = function() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        showCard();
    }
};

// Reset cards
window.resetCards = function() {
    cardShuffled = [...currentUnit.words].sort(() => Math.random() - 0.5);
    currentCardIndex = 0;
    showCard();
    document.getElementById('cardsCompleteButtons').classList.add('hidden');
};

// Start unit exercises
window.startUnitExercises = function() {
    const el = document.getElementById('exerciseSection');
    el.scrollIntoView({ behavior: 'smooth' });
};

// Back to unit
window.backToUnit = function() {
    if (exerciseTimer) clearInterval(exerciseTimer);
    sendIncompleteIfNeeded('Returned to unit page');
    exercisePage.classList.add('hidden');
    unitPage.classList.remove('hidden');
};

// Render exercise progress
function renderExerciseProgress() {
    const grid = document.getElementById('exerciseProgressGrid');
    grid.innerHTML = '';
    
    const exerciseTypes = ['definition', 'engToUz', 'uzToEng', 'gapfill', 'grammar'];
    
    exerciseTypes.forEach(type => {
        const progress = getExerciseProgress(currentUnit.id, type);
        const btnClass = getExerciseButtonClass(progress);
        const displayName = getExerciseDisplayName(type);
        
        const button = document.createElement('button');
        button.className = `exercise-btn ${btnClass}`;
        button.onclick = () => startExercise(type);
        button.innerHTML = `
            <span>${displayName}</span>
            <span class="progress-text">
                ${progress.score > 0 ? `${progress.score}%` : 'Not started'}
                ${progress.completed ? ' ✓' : ''}
            </span>
        `;
        
        grid.appendChild(button);
    });
}

// Start exercise
window.startExercise = function(type) {
    currentExerciseType = type;
    isGrandTest = false;
    
    if (type === 'grammar') {
        // Generate grammar questions
        if (currentUnit.grammarStructure) {
            exerciseQuestions = generateGrammarQuestions(
                currentUnit.grammarStructure, 
                currentUnit.grammarExamples || [],
                5  // 5 grammar questions
            );
            exerciseScore = { correct: 0, wrong: 0 };
            
            showCountdown(() => {
                unitPage.classList.add('hidden');
                exercisePage.classList.remove('hidden');
                startExerciseTest();
            });
        } else {
            alert('Grammar exercises are not available for this unit yet.');
        }
        return;
    }
    
    // For word exercises
    const count = Math.min(currentUnit.words.length, 10); // Max 10 questions
    exerciseQuestions = generateExerciseQuestions(currentUnit.words, type, count);
    exerciseScore = { correct: 0, wrong: 0 };
    
    showCountdown(() => {
        unitPage.classList.add('hidden');
        exercisePage.classList.remove('hidden');
        startExerciseTest();
    });
};

// Submit grammar example
window.submitGrammarExample = function() {
    const userExample = document.getElementById('userGrammarExample').value.trim();
    
    if (!userExample) {
        alert('Please write your example before submitting.');
        return;
    }
    
    // Save grammar exercise as completed
    saveExerciseProgress(currentUnit.id, 'grammar', 100, true);
    
    // Send to Telegram
    const telegramData = prepareTelegramData(
        studentData,
        currentUnit.id,
        'grammar',
        100,
        1,
        1,
        0
    );
    
    telegramData.message += `\n📝 Student's Example: ${userExample}`;
    
    sendResultToTelegram(telegramData);
    
    alert('Thank you for your example! Grammar exercise completed.');
    
    // Update exercise progress display
    renderExerciseProgress();
    
    // Clear the textarea
    document.getElementById('userGrammarExample').value = '';
    
    // Mark grammar button as completed
    const grammarBtn = document.querySelector('.exercise-btn[onclick*="grammar"]');
    if (grammarBtn) {
        grammarBtn.classList.remove('pending', 'partial');
        grammarBtn.classList.add('completed');
        grammarBtn.innerHTML = `
            <span>📚 Grammar Practice</span>
            <span class="progress-text">100% ✓</span>
        `;
    }
};

// Start exercise test
function startExerciseTest() {
    currentQuestion = 0;
    questionAnswered = false;
    showQuestion();
}

// Show question
function showQuestion() {
    if (currentQuestion >= exerciseQuestions.length) {
        showResults();
        return;
    }

    const question = exerciseQuestions[currentQuestion];
    resetQuestionUI();
    
    // Calculate progress
    const progressPercent = ((currentQuestion + 1) / exerciseQuestions.length) * 100;
    
    // Update UI
    document.getElementById('questionCounter').textContent = `Question ${currentQuestion + 1} / ${exerciseQuestions.length}`;
    document.getElementById('exerciseProgress').style.width = progressPercent + '%';
    document.getElementById('questionText').textContent = question.text;
    
    // Clear previous options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    // Create new option buttons
    question.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = `${String.fromCharCode(65 + index)}. ${option}`; // A., B., C., D.
        btn.dataset.value = option;
        btn.onclick = () => checkAnswer(option, question.correct, btn);
        optionsContainer.appendChild(btn);
    });
    
    // Reset timer
    questionAnswered = false;
    startTimer();
}

// Start timer
function startTimer() {
    let timeLeft = 30;
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;
    
    timerEl.textContent = timeLeft + 's';
    timerEl.classList.remove('warning');
    
    if (exerciseTimer) clearInterval(exerciseTimer);
    
    exerciseTimer = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft + 's';
        
        if (timeLeft <= 10) {
            timerEl.classList.add('warning');
        }
        
        if (timeLeft <= 0) {
            clearInterval(exerciseTimer);
            if (!questionAnswered) {
                questionAnswered = true;
                exerciseScore.wrong++;
                
                // Highlight correct answer
                const correctAnswer = exerciseQuestions[currentQuestion].correct;
                const allButtons = document.querySelectorAll('.option-btn');
                allButtons.forEach(button => {
                    if (button.dataset.value === correctAnswer) {
                        button.classList.add('correct');
                    }
                });
                
                displayAnswerFeedback(false, correctAnswer, 'Time is up');
                enableNextButton();
            }
        }
    }, 1000);
}

// Check answer
function checkAnswer(selected, correct, btn) {
    if (questionAnswered) return;
    clearInterval(exerciseTimer);
    questionAnswered = true;
    
    const isCorrect = selected === correct;
    if (isCorrect) {
        exerciseScore.correct++;
    } else {
        exerciseScore.wrong++;
    }
    
    // Highlight correct and incorrect answers
    const allButtons = document.querySelectorAll('.option-btn');
    allButtons.forEach(button => {
        if (button.dataset.value === correct) {
            button.classList.add('correct');
        } else if (button === btn && !isCorrect) {
            button.classList.add('incorrect');
        }
        button.style.pointerEvents = 'none';
    });
    
    displayAnswerFeedback(isCorrect, correct);
    enableNextButton();
}

// Reset question UI
function resetQuestionUI() {
    questionAnswered = false;
    const feedbackEl = document.getElementById('answerFeedback');
    if (feedbackEl) {
        feedbackEl.classList.add('hidden');
        feedbackEl.textContent = '';
    }
    const nextBtn = document.getElementById('nextQuestionBtn');
    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.textContent = currentQuestion === exerciseQuestions.length - 1 ? 'See Results' : 'Next Question';
    }
}

// Display answer feedback
function displayAnswerFeedback(isCorrect, correctAnswer, reason = '') {
    const feedbackEl = document.getElementById('answerFeedback');
    if (!feedbackEl) return;
    feedbackEl.classList.remove('hidden');
    feedbackEl.style.color = isCorrect ? 'var(--success)' : 'var(--error)';
    if (isCorrect) {
        feedbackEl.textContent = '✅ Correct! Keep going.';
    } else {
        const reasonText = reason ? `${reason}. ` : '';
        feedbackEl.textContent = `❌ ${reasonText}Correct answer: ${correctAnswer}`;
    }
}

// Enable next button
function enableNextButton() {
    const nextBtn = document.getElementById('nextQuestionBtn');
    if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.textContent = currentQuestion === exerciseQuestions.length - 1 ? 'See Results' : 'Next Question';
    }
}

// Go to next question
window.goToNextQuestion = function() {
    if (!questionAnswered) return;
    currentQuestion++;
    showQuestion();
};

// Display exercise results
function displayExerciseResults() {
    const total = exerciseQuestions.length;
    const percentage = Math.round((exerciseScore.correct / total) * 100);
    
    // Save exercise progress
    saveExerciseProgress(currentUnit.id, currentExerciseType, percentage);
    
    // Send to Telegram
    const telegramData = prepareTelegramData(
        studentData,
        currentUnit.id,
        currentExerciseType,
        percentage,
        total,
        exerciseScore.correct,
        exerciseScore.wrong
    );
    
    sendResultToTelegram(telegramData);
    
    // Update display
    document.getElementById('scoreDisplay').textContent = `${exerciseScore.correct}/${total} (${percentage}%)`;
    document.getElementById('totalQuestions').textContent = total;
    document.getElementById('correctAnswers').textContent = exerciseScore.correct;
    document.getElementById('wrongAnswers').textContent = exerciseScore.wrong;
    
    // Celebrate if score is good
    if (percentage >= 70) {
        createFireworks();
    }
    
    // Update exercise progress display
    renderExerciseProgress();
}

// Show results
function showResults() {
    const total = exerciseQuestions.length;
    if (exerciseTimer) clearInterval(exerciseTimer);
    
    // Save progress and send results
    displayExerciseResults();
    
    // Show results page
    document.getElementById('exercisePage').classList.add('hidden');
    document.getElementById('resultsPage').classList.remove('hidden');
}

// Retake test
window.retakeTest = function() {
    if (isGrandTest) {
        resultsPage.classList.add('hidden');
        grandTestSetup.classList.remove('hidden');
    } else {
        const count = Math.min(currentUnit.words.length, 10);
        exerciseQuestions = generateExerciseQuestions(currentUnit.words, currentExerciseType, count);
        exerciseScore = { correct: 0, wrong: 0 };
        
        showCountdown(() => {
            resultsPage.classList.add('hidden');
            exercisePage.classList.remove('hidden');
            startExerciseTest();
        });
    }
};

// Back to unit from results
window.backToUnitFromResults = function() {
    resultsPage.classList.add('hidden');
    unitPage.classList.remove('hidden');
};

// Show countdown
function showCountdown(callback) {
    const overlay = document.createElement('div');
    overlay.className = 'countdown-overlay';
    document.body.appendChild(overlay);
    
    let count = 3;
    const numberEl = document.createElement('div');
    numberEl.className = 'countdown-number';
    numberEl.textContent = count;
    overlay.appendChild(numberEl);
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            numberEl.textContent = count;
            numberEl.style.animation = 'none';
            setTimeout(() => numberEl.style.animation = 'countdownAnim 1s ease-out', 10);
        } else {
            numberEl.textContent = 'Go!';
            numberEl.style.animation = 'none';
            setTimeout(() => numberEl.style.animation = 'countdownAnim 1s ease-out', 10);
            clearInterval(interval);
            setTimeout(() => {
                document.body.removeChild(overlay);
                callback();
            }, 1000);
        }
    }, 1000);
}

// Create fireworks
function createFireworks() {
    const container = document.createElement('div');
    container.className = 'fireworks';
    document.body.appendChild(container);
    
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight * 0.5;
            
            for (let j = 0; j < 20; j++) {
                const particle = document.createElement('div');
                particle.className = 'firework';
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                particle.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
                
                const angle = (Math.PI * 2 * j) / 20;
                const velocity = 30 + Math.random() * 70;
                particle.style.setProperty('--tx', Math.cos(angle) * velocity + 'px');
                particle.style.setProperty('--ty', Math.sin(angle) * velocity + 'px');
                
                container.appendChild(particle);
                
                setTimeout(() => particle.remove(), 1000);
            }
        }, i * 150);
    }
    
    setTimeout(() => container.remove(), 6000);
}

// Send incomplete if needed
function sendIncompleteIfNeeded(reason) {
    if (exerciseTimer && currentUnit && exerciseQuestions.length > 0) {
        const total = exerciseQuestions.length;
        const answered = currentQuestion + (questionAnswered ? 1 : 0);
        const percentage = total ? Math.round((exerciseScore.correct / total) * 100) : 0;
        
        const telegramData = prepareTelegramData(
            studentData,
            currentUnit.id,
            `${currentExerciseType} (Incomplete)`,
            percentage,
            total,
            exerciseScore.correct,
            exerciseScore.wrong
        );
        
        telegramData.message += `\n\n⚠️ Note: ${reason} - Test was not completed (answered ${answered}/${total} questions)`;
        
        sendResultToTelegram(telegramData);
    }
}

// Grand Test Functions
window.startGrandTest = function() {
    mainPage.classList.add('hidden');
    grandTestSetup.classList.remove('hidden');
};

window.selectTestSize = function(size) {
    selectedTestSize = size;
    document.querySelectorAll('.size-option').forEach(el => el.classList.remove('selected'));
    event.target.closest('.size-option').classList.add('selected');
};

window.beginGrandTest = async function() {
    isGrandTest = true;
    currentExerciseType = 'grand';
    
    // For now, just show a message since we only have one unit
    alert('Grand Test requires multiple units. Please add more units first.');
    showMainPage();
};

// Theme switching
window.cycleTheme = function() {
    const themes = ['light', 'soft-blue', 'dark'];
    const current = document.body.getAttribute('data-theme') || 'light';
    const currentIndex = themes.indexOf(current);
    const nextIndex = (currentIndex + 1) % themes.length;
    document.body.setAttribute('data-theme', themes[nextIndex]);
};

// Show progress
window.showProgress = async function() {
    const units = await getAvailableUnits();
    let html = '<h3>📊 Your Progress Dashboard</h3><div style="margin-top: 20px;">';
    
    units.forEach(unitInfo => {
        const progress = getUnitOverallProgress(unitInfo.id);
        
        html += `
            <div style="padding: 15px; margin-bottom: 10px; background: var(--secondary-bg); border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span><strong>Unit ${unitInfo.id}:</strong> ${unitInfo.title}</span>
                    <span style="color: ${progress.completionRate === 100 ? 'var(--success)' : progress.completionRate > 0 ? 'var(--warning)' : 'var(--text-color)'}">
                        ${progress.completionRate}% Complete
                    </span>
                </div>
                <div class="progress-bar" style="height: 8px;">
                    <div class="progress-fill" style="width: ${progress.completionRate}%"></div>
                </div>
                <div style="font-size: 12px; margin-top: 5px; color: var(--text-color); opacity: 0.8;">
                    ${progress.completedCount} of ${progress.totalExercises} exercises completed
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    showModal(html);
};

// Show modal
function showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close" onclick="this.closest('.modal').remove()">×</span>
            ${content}
        </div>
    `;
    document.body.appendChild(modal);
}

// Make showModal available globally
window.showModal = showModal;
