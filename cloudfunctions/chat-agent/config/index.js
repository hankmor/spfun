// Configuration Management
// Best Practice: Use environment variables for secrets.
// In WeChat Cloud Console -> Cloud Functions -> chat-agent -> Configuration -> Environment Variables

module.exports = {
    deepseek: {
        // Priority: Env Var > Config Default (Should not commit real keys)
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
        temperature: 1.3
    },
    defaults: {
        minScore: 60,
        scoreRange: 40
    }
}
