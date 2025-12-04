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

// Generate exercise questions with proper tasks
export function generateExerciseQuestions(words, type, count) {
    const questions = [];
    
    // Ensure we don't request more words than available
    const availableWords = [...words];
    const questionCount = Math.min(count, availableWords.length);
    
    // Shuffle words for random selection
    const shuffledWords = [...availableWords].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < questionCount; i++) {
        const correctWord = shuffledWords[i];
        
        // Get wrong options from other words
        const wrongWords = shuffledWords
            .filter(w => w.word !== correctWord.word)
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
                    correctWord: correctWord.word,
                    type: 'definition'
                };
                break;
            case 'engToUz':
                question = {
                    text: `Translate "${correctWord.word}" to Uzbek:`,
                    options: allOptions.map(w => w.translation),
                    correct: correctWord.translation,
                    correctWord: correctWord.word,
                    type: 'engToUz'
                };
                break;
            case 'uzToEng':
                question = {
                    text: `What is the English word for "${correctWord.translation}"?`,
                    options: allOptions.map(w => w.word),
                    correct: correctWord.word,
                    correctWord: correctWord.word,
                    type: 'uzToEng'
                };
                break;
            case 'gapfill':
                // Create contextual sentences for gap-filling
                const sentences = [
                    `The word "${correctWord.word}" means "${correctWord.definition}".`,
                    `In the text, "${correctWord.word}" was used to describe a situation.`,
                    `The translation of "${correctWord.word}" is "${correctWord.translation}".`,
                    `To understand the passage, you need to know that "${correctWord.word}" means.`
                ];
                const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
                question = {
                    text: randomSentence.replace(correctWord.word, '______'),
                    options: allOptions.map(w => w.word),
                    correct: correctWord.word,
                    correctWord: correctWord.word,
                    type: 'gapfill'
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
        'definition': '📝 Matching Definition',
        'engToUz': '🌍 English → Uzbek',
        'uzToEng': '🌍 Uzbek → English',
        'gapfill': '✍️ Gap-Filling',
        'grammar': '📚 Grammar Practice'
    };
    return names[type] || type;
}

// Generate grammar questions
export function generateGrammarQuestions(grammarStructure, examples, count = 5) {
    const questions = [];
    
    // Create different types of grammar questions
    const questionTypes = [
        {
            type: 'multiple_choice',
            text: `Which sentence correctly uses "${grammarStructure}"?`,
            generator: (correctExample) => {
                const wrongOptions = [
                    correctExample.replace('was', 'were').replace('were', 'was'),
                    correctExample.replace('the', 'a').replace('a', 'the'),
                    correctExample.split(' ').reverse().join(' ')
                ];
                return {
                    text: `Which sentence correctly uses "${grammarStructure}"?`,
                    options: [correctExample, ...wrongOptions].sort(() => Math.random() - 0.5),
                    correct: correctExample,
                    type: 'grammar'
                };
            }
        },
        {
            type: 'complete_sentence',
            text: `Complete the sentence using "${grammarStructure}":`,
            generator: (correctExample) => {
                const words = correctExample.split(' ');
                const missingWord = words[Math.floor(words.length / 2)];
                const incomplete = correctExample.replace(missingWord, '______');
                const options = [missingWord, 'was', 'were', 'the', 'a'].sort(() => Math.random() - 0.5);
                
                return {
                    text: incomplete,
                    options: options,
                    correct: missingWord,
                    type: 'grammar'
                };
            }
        }
    ];
    
    // Use the provided examples or create sample ones
    const grammarExamples = examples && examples.length > 0 
        ? examples 
        : [
            `Example 1 with ${grammarStructure}`,
            `Example 2 with ${grammarStructure}`,
            `Example 3 with ${grammarStructure}`
        ];
    
    // Generate questions
    for (let i = 0; i < Math.min(count, grammarExamples.length); i++) {
        const example = grammarExamples[i];
        const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        questions.push(questionType.generator(example));
    }
    
    return questions;
}
