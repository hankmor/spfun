const axios = require('axios')
const config = require('../ai-settings')

/**
 * Call DeepSeek AI Service
 * @param {string} systemPrompt 
 * @param {string} userMessage 
 * @returns {Promise<{content: string}>}
 */
/**
 * Call DeepSeek AI Service
 * @param {string} systemPrompt 
 * @param {Array} historyMessages 
 * @param {string} userMessage 
 * @returns {Promise<{content: string}>}
 */
async function generateReply(systemPrompt, historyMessages, userMessage) {
    const { apiKey, apiUrl, model, temperature } = config.deepseek

    if (!apiKey) {
        throw new Error('Missing DeepSeek API Key')
    }

    // specific handling for array/string mismatch
    const history = Array.isArray(historyMessages) ? historyMessages : []

    // Construct Messages
    const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage }
    ]

    try {
        const response = await axios.post(apiUrl, {
            model: model,
            messages: messages,
            temperature: temperature
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: config.deepseek.timeout || 20000
        })

        return {
            content: response.data.choices[0].message.content
        }
    } catch (error) {
        console.error('DeepSeek API Error:', error.response ? error.response.data : error.message)
        throw new Error('AI Service Unavailable')
    }
}

module.exports = {
    generateReply
}
