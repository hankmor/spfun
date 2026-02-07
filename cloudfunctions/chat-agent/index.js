
const cloud = require('wx-server-sdk')
const { generateReply } = require('./lib/ai-service')
const { loadConfig } = require('./lib/config-loader')
const { checkDailyLimit } = require('./lib/rate-limit')
const ROLES = require('./prompts/roles')
const config = require('./config')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

const getUserDesc = (roleId, userProfile) => {
    const { status, gender } = userProfile
    let userDesc = ''
    switch (roleId) {
        case 'aunt_money':   // 二姨
        case 'uncle_strict': // 二舅
            const relation = gender === 'female' ? '外甥女' : '外甥'
            userDesc = (status === 'student' ? `正在上学的${relation}` : `正在上班的${relation}`)
            break
        case 'aunt_marriage': // 大姑
            const nephew = gender === 'female' ? '侄女' : '侄子'
            userDesc = (status === 'student' ? `正在上学的${nephew}` : `正在上班的${nephew}`)
            break
        case 'neighbor_showoff': // 王阿姨
            const suffix = gender === 'female' ? '女儿' : '儿子'
            userDesc = (status === 'student' ? `正在上学的邻居家${suffix}` : `正在上班的邻居家${suffix}`)
            break
        default:
            userDesc = (status === 'student' ? '正在上学的晚辈' : '正在上班的晚辈')
    }
    return userDesc
}

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
                reply: '催我打麻将了，不说了，明天再聊。',
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
                    reply: '可不敢跟长辈这么说话哦',
                    limitHit: true,
                    action: 'stop'
                }
            }
        } catch (secErr) {
            // Error 87014 means risky content
            if (secErr.errCode === 87014) {
                return {
                    reply: '可不敢跟长辈这么说话哦',
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
            const userDesc = getUserDesc(roleId, event.userProfile)
            systemPrompt += `
[当前对话者解析]
【身份画像】${userDesc}
【绝对指令】
1. 必须基于你是长辈、他是晚辈（无子女）的关系进行对线。
2. 只要对方回怼得有力，请务必遵守[动态响应逻辑]中的【模式B】，给予“对方战斗力”高分并表现出破防。`
        }

        // Context Construction (Inject History)
        const historyList = event.history || []
        const recentHistory = historyList.slice(-4)
        let finalUserMessage = message

        if (recentHistory.length > 0) {
            const historyText = recentHistory.map(m => {
                const roleName = m.role === 'user' ? '用户' : '你'
                return `${roleName}: ${m.content}`
            }).join('\n')
            finalUserMessage = `[前情提要 - 最近4句对话]\n${historyText}\n\n[用户当前回复]\n${message}`
        }

        const result = await generateReply(systemPrompt, [], finalUserMessage)

        // 4. Score Parsing & Response Cleaning
        let replyContent = result.content
        let userScore = 0

        // Regex to match (战斗力：85) or (战斗力: 85)
        const scoreMatch = replyContent.match(/[(（]战斗力[:：]\s*(\d+)[)）]/)
        if (scoreMatch) {
            userScore = parseInt(scoreMatch[1], 10)
            // Remove the score tag from reply
            replyContent = replyContent.replace(scoreMatch[0], '').trim()
        }

        // 5. AI Lethality Score (Random 60-100)
        // If user scored high (>80), AI lethality might be lower due to "broken defense"
        let aiScore = Math.floor(Math.random() * 41) + 60
        if (userScore > 80) {
            aiScore = Math.floor(Math.random() * 40) + 20 // Lower lethality if user won
        }

        return {
            reply: replyContent,
            userScore: userScore,
            aiScore: aiScore
        }

    } catch (e) {
        console.error('Handler Error:', e)
        // Return friendly error to frontend, log real error
        return {
            error: '对方网络状况不佳...', // User friendly message
            debug: e.message
        }
    }
}
