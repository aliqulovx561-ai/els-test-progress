// This function will send results to our own API endpoint
// which then forwards to Telegram using environment variables

export async function sendResultToTelegram(resultData) {
    try {
        const response = await fetch('/api/send-result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(resultData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to send result');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error sending to Telegram:', error);
        // Don't throw the error to prevent breaking the user experience
        return { success: false, error: error.message };
    }
}

export function prepareTelegramData(studentData, unitId, exerciseType, score, total, correct, wrong) {
    const testName = exerciseType === 'grand' 
        ? 'Grand Test' 
        : `Unit ${unitId} - ${getExerciseDisplayName(exerciseType)}`;
    
    const percentage = Math.round((correct / total) * 100);
    const status = percentage >= 70 ? 'PASSED' : 'FAILED';
    const emoji = percentage >= 70 ? '✅' : '❌';
    
    const lines = [
        '📘 *ELS - English Through Reading*',
        '',
        `🧑‍🎓 *Student:* ${studentData.name} ${studentData.surname}`,
        `👥 *Group:* ${studentData.group}`,
        `📅 *Date:* ${new Date().toLocaleDateString()}`,
        `⏰ *Time:* ${new Date().toLocaleTimeString()}`,
        '',
        `📊 *Test Results:*`,
        `   Test: ${testName}`,
        `   Status: ${emoji} ${status}`,
        `   Score: ${correct}/${total} (${percentage}%)`,
        `   ✅ Correct: ${correct}`,
        `   ❌ Wrong: ${wrong}`,
        '',
        percentage >= 70 ? '🎉 *Congratulations! Keep up the good work!*' : '📝 *Keep practicing! You can do better next time!*'
    ];
    
    return {
        studentName: studentData.name,
        studentSurname: studentData.surname,
        group: studentData.group,
        unitId: unitId,
        exerciseType: exerciseType,
        score: percentage,
        correct: correct,
        total: total,
        wrong: wrong,
        message: lines.join('\n'),
        timestamp: new Date().toISOString()
    };
}

function getExerciseDisplayName(type) {
    const names = {
        'definition': 'Matching Definition',
        'engToUz': 'English → Uzbek',
        'uzToEng': 'Uzbek → English',
        'gapfill': 'Gap-Filling',
        'grammar': 'Grammar Practice',
        'grand': 'Grand Test'
    };
    return names[type] || type;
}
