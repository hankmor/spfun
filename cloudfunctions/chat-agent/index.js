
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
                reply: '累了吧？看个视频补充点能量，再来对线！',
                limitHit: true,
                action: 'show_ad',
                adUnitId: appConfig.ad_unit_id
            }
        } else {
            return {
                reply: '二姨忙着去打麻将了，今天不聊了，明天继续哦。',
                limitHit: true,
                action: 'stop'
            }
        }
    }

    try {
        // 2. Security Check (Mandatory for WeChat Mini Programs)
        try {
            const secResult = await cloud.openapi.security.msgSecCheck({
                content: message
            })
            if (secResult.errCode !== 0) {
                return {
                    reply: '含有违规内容，请文明发言。',
                    limitHit: true,
                    action: 'stop'
                }
            }
        } catch (secErr) {
            // Error 87014 means risky content
            if (secErr.errCode === 87014) {
                return {
                    reply: '含有违规内容，请文明发言。',
                    limitHit: true,
                    action: 'stop'
                }
            }
            // For other errors (limit exceeded etc), log and proceed (fail open) or block (fail closed)
            // Here we fail open to avoid blocking users on system error, but log it
            console.error('Security Check System Error:', secErr)
        }

        // 3. AI Generation
        let systemPrompt = ROLES[roleId].system

        // Inject User Profile if available
        if (event.userProfile) {
            const { gender, status } = event.userProfile
            const genderStr = gender === 'male' ? '男性' : (gender === 'female' ? '女性' : '')
            const statusStr = status === 'student' ? '学生' : (status === 'worker' ? '打工人' : '')

            if (genderStr || statusStr) {
                systemPrompt += `\n[当前对话者信息]\n性别：${genderStr || '未知'}\n身份：${statusStr || '未知'}\n请针对该身份进行有针对性的回复。`
            }
        }

        const result = await generateReply(systemPrompt, event.history || [], message)

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
