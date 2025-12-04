// Exercise progress tracking
export function getExerciseProgress(unitId, exerciseType) {
    const key = `unit_${unitId}_exercise_${exerciseType}`;
    const data = localStorage.getItem(key);
    if (data) {
        return JSON.parse(data);
    }
    return { score: 0, completed: false, date: null };
}

export function saveExerciseProgress(unitId, exerciseType, score, completed = false) {
    const key = `unit_${unitId}_exercise_${exerciseType}`;
    const data = {
        score: score,
        completed: completed || score >= 70,
        date: new Date().toISOString(),
        unitId: unitId,
        exerciseType: exerciseType
    };
    localStorage.setItem(key, JSON.stringify(data));
    return data;
}

export function getUnitOverallProgress(unitId) {
    const exerciseTypes = ['definition', 'engToUz', 'uzToEng', 'gapfill', 'grammar'];
    let totalScore = 0;
    let completedCount = 0;
    let totalCount = 0;
    
    exerciseTypes.forEach(type => {
        const progress = getExerciseProgress(unitId, type);
        if (progress.score > 0) {
            totalScore += progress.score;
            totalCount++;
            if (progress.completed) completedCount++;
        }
    });
    
    const averageScore = totalCount > 0 ? Math.round(totalScore / totalCount) : 0;
    const completionRate = exerciseTypes.length > 0 ? Math.round((completedCount / exerciseTypes.length) * 100) : 0;
    
    return { averageScore, completionRate, completedCount, totalExercises: exerciseTypes.length };
}

export function generateExerciseQuestions(words, type, count) {
    const questions = [];
    
    // Ensure we don't request more words than available
    const availableWords = [...words];
    const questionCount = Math.min(count, availableWords.length);
    
    // Shuffle words for random selection
    const shuffledWords = [...availableWords].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < questionCount; i++) {
        const correctWord = shuffledWords[i];
        const wrongWords = shuffledWords
            .filter(w => w !== correctWord)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        
        const allOptions = [correctWord, ...wrongWords].sort(() => Math.random() - 0.5);
        
        let question;
        switch(type) {
            case 'definition':
                question = {
                    text: `What is the definition of "${correctWord.word}"?`,
                    options: allOptions.map(w => w.definition),
                    correct: correctWord.definition,
                    correctWord: correctWord.word
                };
                break;
            case 'engToUz':
                question = {
                    text: `Translate "${correctWord.word}" to Uzbek:`,
                    options: allOptions.map(w => w.translation),
                    correct: correctWord.translation,
                    correctWord: correctWord.word
                };
                break;
            case 'uzToEng':
                question = {
                    text: `Translate "${correctWord.translation}" to English:`,
                    options: allOptions.map(w => w.word),
                    correct: correctWord.word,
                    correctWord: correctWord.word
                };
                break;
            case 'gapfill':
                const sentence = `The word "${correctWord.word}" means "${correctWord.definition}".`;
                question = {
                    text: sentence.replace(correctWord.word, '______'),
                    options: allOptions.map(w => w.word),
                    correct: correctWord.word,
                    correctWord: correctWord.word
                };
                break;
            default:
                continue;
        }
        
        questions.push(question);
    }
    
    return questions;
}

export function getExerciseButtonClass(progress) {
    if (progress.completed) return 'completed';
    if (progress.score > 0) return 'partial';
    return 'pending';
}

export function getExerciseDisplayName(type) {
    const names = {
        'definition': 'Matching Definition',
        'engToUz': 'English → Uzbek',
        'uzToEng': 'Uzbek → English',
        'gapfill': 'Gap-Filling',
        'grammar': 'Grammar Practice'
    };
    return names[type] || type;
}
