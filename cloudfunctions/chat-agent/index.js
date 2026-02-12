
const cloud = require('wx-server-sdk')
const { generateReply } = require('./lib/ai-service')
const { loadConfig } = require('./lib/config-loader')
const { checkDailyLimit } = require('./lib/rate-limit')
const ROLES = require('./prompts/roles')
const { getBlessingPrompt } = require('./prompts/blessing')

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

    // Handle Blessing Generator
    if (event.action === 'blessing') {
        const { target, vibe } = event
        const systemPrompt = getBlessingPrompt(target, vibe)

        try {
            const result = await generateReply(systemPrompt, [], "请为我生成一段祝福语：")
            return { blessing: result.content }
        } catch (e) {
            return { error: 'Blessing Generation Failed', debug: e.message }
        }
    }

    // Handle God Mode (AI Help)
    if (event.action === 'god_mode') {
        const { prompt, history, roleId } = event
        // Construct prompt for God Mode
        const systemPrompt = `你是一个${ROLES[roleId]?.system ? '春节嘴替角色' : '幽默助手'}。
请根据以下对话历史，帮用户（晚辈）生成一句绝杀金句，用来回怼长辈。
要求：${prompt || '幽默、犀利、一针见血，60字以内'}。`
        
        const historyText = history.map(m => `${m.role === 'user' ? '用户' : '长辈'}: ${m.content}`).join('\n')
        const fullPrompt = `[对话历史]\n${historyText}\n\n[任务]\n生成一句回怼：`

        try {
            const result = await generateReply(systemPrompt, [], fullPrompt)
            return { reply: result.content }
        } catch (e) {
            return { error: 'God Mode Failed', debug: e.message }
        }
    }

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
        const turnCount = historyList.length
        const recentHistory = historyList.slice(-4)
        
        // --- Defense Intelligence (Boss "Blood Bar" Logic) ---
        let defenseInstruction = ""
        const normalRoles = ['aunt_money', 'aunt_marriage']
        
        if (normalRoles.includes(roleId)) {
            if (turnCount < 5) {
                defenseInstruction = "【系统指令：当前处于对线初期。你的心理防线稳如老狗，绝对不能破防！不管用户说什么，你都要用长辈的威严回怼过去，彻底无视用户的任何逻辑。】\n"
            } else if (turnCount < 10) {
                defenseInstruction = "【系统指令：用户攻势变强了！你可以表现出一点气急败坏、转移话题、甚至胡搅蛮缠，但绝对不能认输，你的嘴要像钢铁一样坚硬！】\n"
            } else {
                defenseInstruction = "【系统指令：如果你觉得用户这一句回怼得一针见血且极其精彩，现在允许你展现出破防或语塞的状态了。】\n"
            }
        }

        let finalUserMessage = message
        if (recentHistory.length > 0) {
            const historyText = recentHistory.map(m => {
                const roleName = m.role === 'user' ? '用户' : '你'
                return `${roleName}: ${m.content}`
            }).join('\n')
            finalUserMessage = `[前情提要 - 最近4句对话]\n${historyText}\n\n${defenseInstruction}[用户当前回复]\n${message}`
        } else {
            // First message
            finalUserMessage = `${defenseInstruction}[用户当前回复]\n${message}`
        }

        const result = await generateReply(systemPrompt, [], finalUserMessage)

        // 4. Score Parsing & Response Cleaning
        let replyContent = result.content
        let userScore = 0
        let aiScore = 100

        // Regex to match (战斗力：85) or (对方破防：85) etc.
        const userScoreMatch = replyContent.match(/[（(][^）()]*?(?:战斗力|破防|对线|对方破防)[:：]\s*(\d+)[）)]/)
        if (userScoreMatch) {
            userScore = parseInt(userScoreMatch[1], 10)
            // Remove the score tag from reply
            replyContent = replyContent.replace(userScoreMatch[0], '').trim()
        }
        
        // Regex to match (攻击力：95) or (我的攻击力：95) etc.
        const aiScoreMatch = replyContent.match(/[（(][^）()]*?(?:攻击力|杀伤力|我的攻击力)[:：]\s*(\d+)[）)]/)
        if (aiScoreMatch) {
            aiScore = parseInt(aiScoreMatch[1], 10)
            // Remove the score tag from reply
            replyContent = replyContent.replace(aiScoreMatch[0], '').trim()
        } else {
            // 5. AI Lethality Score fallback (Random)
            aiScore = Math.floor(Math.random() * 41) + 60
            if (userScore > 80) {
                aiScore = Math.floor(Math.random() * 41) + 20
            }
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
