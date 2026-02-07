/**
 * 评分逻辑单元测试 - 模拟云函数内部逻辑
 * 运行方法：在终端执行 node test_logic.js
 */

function processResult(content) {
    let replyContent = content
    let userScore = 0
    let aiScore = 100 // 默认攻击力

    // 1. 匹配并提取用户【战斗力/破防】相关标签
    const userScoreMatch = replyContent.match(/[（(][^）()]*?(?:战斗力|破防|对线|对方破防)[:：]\s*(\d+)[）)]/)
    if (userScoreMatch) {
        userScore = parseInt(userScoreMatch[1], 10)
        // 从回复内容中移除标签
        replyContent = replyContent.replace(userScoreMatch[0], '').trim()
    }

    // 2. 匹配并提取 AI【攻击力/杀伤力】相关标签
    const aiScoreMatch = replyContent.match(/[（(][^）()]*?(?:攻击力|杀伤力|我的攻击力)[:：]\s*(\d+)[）)]/)
    if (aiScoreMatch) {
        aiScore = parseInt(aiScoreMatch[1], 10)
        // 从回复内容中移除标签
        replyContent = replyContent.replace(aiScoreMatch[0], '').trim()
    } else {
        // 3. 兜底逻辑：如果 AI 没返回攻击力标签，根据用户战斗力随机生成
        aiScore = Math.floor(Math.random() * 41) + 60
        if (userScore > 80) {
            aiScore = Math.floor(Math.random() * 41) + 20
        }
    }

    return { replyContent, userScore, aiScore }
}

// 定义测试用例
const testCases = [
    {
        name: "场景 1: 双重评分均存在",
        input: "你太厉害了！(攻击力：30) (战斗力：95)",
    },
    {
        name: "场景 2: 仅有用户战斗力 (判定 AI 破防)",
        input: "哎呀，我输了。(战斗力：90)",
    },
    {
        name: "场景 3: 仅有用户战斗力 (判定 AI 正常输出)",
        input: "一般般吧。(战斗力：20)",
    },
    {
        name: "场景 4: 仅有 AI 攻击力存在",
        input: "呵呵，你还嫩了点。(攻击力：99)",
    },
    {
        name: "场景 5: 全无评分标签 (使用预设兜底逻辑)",
        input: "今年发奖金了吗？二姨听说你们那边流行发年终奖。",
    },
    {
        name: "场景 6: 复杂文案与多余符号匹配",
        input: "今年发奖金了吗？二姨听说你们那边流行发年终奖。（我的攻击力：95)（对方破防：0）",
    },
    {
        name: "场景 6: 复杂文案与多余符号匹配",
        input: "今年发奖金了吗？二姨听说你们那边流行发年终奖。（我的攻击力: 95)(对方破防:0)",
    }
]

console.log("====================================")
console.log("   🚀 评分逻辑自动化测试工具 🚀   ")
console.log("====================================\n")

testCases.forEach((tc, index) => {
    console.log(`[测试用例 ${index + 1}] ${tc.name}`)
    console.log(`输入内容: "${tc.input}"`)

    const result = processResult(tc.input)

    console.log(`解析回复: "${result.replyContent}"`)
    console.log(`用户战斗力: ${result.userScore}`)
    console.log(`AI 攻击力: ${result.aiScore}`)
    console.log(`结论: ${result.userScore > 0 ? '💥 触发用户破防特效' : '🛡️ 正常对线'}`)
    console.log("------------------------------------\n")
})

console.log("测试完毕！你可以随时修改此文件来增加更多场景。✅")
