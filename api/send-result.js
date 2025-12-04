export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const resultData = req.body;
        
        // Get Telegram credentials from environment variables
        const BOT_TOKEN = process.env.BOT_TOKEN;
        const CHAT_ID = process.env.CHAT_ID;
        
        if (!BOT_TOKEN || !CHAT_ID) {
            console.error('Telegram credentials not configured');
            return res.status(500).json({ 
                error: 'Server configuration error',
                success: false 
            });
        }
        
        // Format the message for Telegram
        const telegramMessage = `ELS Test Result\n\n${resultData.message}`;
        
        // Send to Telegram
        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: telegramMessage,
                parse_mode: 'Markdown'
            })
        });
        
        const telegramResult = await telegramResponse.json();
        
        if (telegramResult.ok) {
            return res.status(200).json({ 
                success: true,
                message: 'Result sent to Telegram successfully'
            });
        } else {
            console.error('Telegram API error:', telegramResult);
            return res.status(500).json({ 
                success: false,
                error: 'Failed to send to Telegram',
                details: telegramResult.description
            });
        }
        
    } catch (error) {
        console.error('Error in send-result API:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            details: error.message 
        });
    }
}
