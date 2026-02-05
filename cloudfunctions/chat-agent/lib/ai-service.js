const axios = require('axios')
const config = require('../config')

/**
 * Call DeepSeek AI Service
 * @param {string} systemPrompt 
 * @param {string} userMessage 
 * @returns {Promise<{content: string}>}
 */
async function generateReply(systemPrompt, userMessage) {
    const { apiKey, apiUrl, model, temperature } = config.deepseek

    if (!apiKey) {
        throw new Error('Missing DeepSeek API Key. Please set DEEPSEEK_API_KEY in Cloud Function Env Vars.')
    }

    try {
        const response = await axios.post(apiUrl, {
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature: temperature
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10s timeout
        })

        return {
            content: response.data.choices[0].message.content
        }
    } catch (error) {
        console.error('DeepSeek API Error:', error.response ? error.response.data : error.message)
        throw new Error('AI Service Unavailable') // Mask error details from client
    }
}

module.exports = {
    generateReply
}
