
const cloud = require('wx-server-sdk')
const { generateReply } = require('./lib/ai-service')
const { loadConfig } = require('./lib/config-loader')
const { checkDailyLimit } = require('./lib/rate-limit')
const ROLES = require('./prompts/roles')
const config = require('./config')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
    const { message, roleId } = event
    const { OPENID } = cloud.getWXContext()

    // 0. Load Dynamic Configuration
    const appConfig = await loadConfig()

    // 1. Validation
    if (!message || !roleId || !ROLES[roleId]) {
        return { error: 'Invalid parameters: roleId or message missing' }
    }

    // 2. Rate Limit Check (Dynamic)
    // Logic: 
    // - If under limit -> Pass
    // - If over limit AND Ad Enabled -> Return "show_ad" action
    // - If over limit AND Ad Disabled -> Return "stop" action
    const limitStatus = await checkDailyLimit(OPENID, appConfig.chat_daily_limit)

    if (!limitStatus.allowed) {
        if (appConfig.ad_enabled) {
            return {
                reply: '看个视频补充点能量，再来对线！',
                limitHit: true,
                action: 'show_ad',
                adUnitId: appConfig.ad_unit_id
            }
        } else {
            return {
                reply: '二姨去打麻将了，今天不聊了。（服务器维护中）',
                limitHit: true,
                action: 'stop'
            }
        }
    }

    try {
        // 2. Security Check (Optional placeholder)
        // const secResult = await cloud.openapi.security.msgSecCheck({ content: message })

        // 3. AI Generation
        const systemPrompt = ROLES[roleId].system
        const result = await generateReply(systemPrompt, message)

        // 4. Score Calculation (Business Logic)
        const { minScore, scoreRange } = config.defaults
        const score = Math.floor(Math.random() * scoreRange) + minScore

        return {
            reply: result.content,
            score: score
        }

    } catch (e) {
        console.error('Handler Error:', e)
        // Return friendly error to frontend, log real error
        return {
            error: '对方正在忙线中...', // User friendly message
            debug: e.message
        }
    }
}
