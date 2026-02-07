<template>
    <view class="chat-container">
        <!-- Chat List -->
        <scroll-view class="chat-content" scroll-y :scroll-into-view="scrollTarget" :scroll-with-animation="true"
            @scrolltolower="onScrollToBottom">
            <view class="padding-top"></view>

            <!-- Time/System Message Placeholder (Optional) -->
            <view class="system-msg">
                <text class="time-tag">{{ formatTime() }}</text>
            </view>

            <view v-for="(msg, index) in messages" :key="index" :id="'msg-' + index" class="msg-row"
                :class="msg.role === 'user' ? 'msg-row-user' : 'msg-row-ai'">
                <!-- Avatar -->
                <image class="avatar"
                    :src="msg.role === 'user' ? (userProfile?.avatarUrl || '/static/logo.webp') : roleAvatar"
                    mode="aspectFill"></image>

                <view class="msg-body">
                    <!-- Bubble -->
                    <view class="bubble-wrapper">
                        <view class="bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'"
                            @longpress="onCopy(msg.content)">
                            <text class="msg-text">{{ msg.content }}</text>
                            <!-- Arrow -->
                            <view class="arrow" :class="msg.role === 'user' ? 'arrow-user' : 'arrow-ai'"></view>
                        </view>

                        <!-- Tools (Share/Score) for AI only -->
                        <view v-if="msg.role === 'ai'" class="bubble-footer">
                            <view v-if="msg.aiScore" class="score-badge">🔥 杀伤力 {{ msg.aiScore }}</view>
                            <view class="action-btn" @click="openSingleShare(msg.content)">
                                <text class="action-icon">📣</text> 挂人
                            </view>
                        </view>
                    </view>
                </view>
            </view>

            <!-- Loading State -->
            <view v-if="loading" class="loading-row">
                <view class="loading-spinner"></view>
            </view>

            <view id="bottom-anchor" class="anchor"></view>
        </scroll-view>

        <!-- SOS Button (Floating) -->
        <view class="sos-btn" @click="openChatShare">
            <!-- <text class="sos-icon">📢</text> -->
            <text class="sos-text">求救</text>
        </view>

        <!-- Share Modal (Single Message) -->
        <view class="modal-mask" v-if="showSingleModal" @click="closeSingleModal">
            <view class="modal-content" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">🔥 挂人曝光</text>
                    <view class="close-btn" @click="closeSingleModal">✕</view>
                </view>

                <view class="canvas-wrapper shadow-lg">
                    <image v-if="singleSharePath" :src="singleSharePath" class="share-preview" mode="aspectFit"></image>
                    <view v-else class="generating">
                        <view class="loading-spinner"></view>
                        <text>正在生成“挂人”海报...</text>
                    </view>
                </view>

                <view class="modal-btns">
                    <button class="m-btn btn-save" @click="saveImage(singleSharePath)">📥 保存证据</button>
                    <button class="m-btn btn-friend" open-type="share">🔥 喊人围观</button>
                </view>
            </view>
        </view>

        <!-- Share Modal (Chat History) -->
        <view class="modal-mask" v-if="showChatModal" @click="closeChatModal">
            <view class="modal-content" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">🆘 紧急求救</text>
                    <view class="close-btn" @click="closeChatModal">✕</view>
                </view>

                <view class="canvas-wrapper-long shadow-lg">
                    <image v-if="chatSharePath" :src="chatSharePath" class="share-preview" mode="aspectFit"></image>
                    <view v-else class="generating">
                        <view class="loading-spinner"></view>
                        <text>正在生成“求救”战报...</text>
                    </view>
                </view>

                <view class="modal-btns">
                    <button class="m-btn btn-save" @click="saveImage(chatSharePath)">📥 保存战况</button>
                    <button class="m-btn btn-friend" open-type="share">💬 呼叫支援</button>
                </view>
            </view>
        </view>

        <!-- Hidden Canvas -->
        <!-- Use a large fixed size for canvas to ensure quality, we scale down in CSS if needed -->
        <canvas canvas-id="shareCanvas" id="shareCanvas" class="offscreen-canvas"
            :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"></canvas>

        <!-- Bottom Input Area (Simplified) -->
        <view class="input-panel safe-area-bottom">
            <view class="panel-top-border"></view>
            <view class="toolbar">
                <input class="chat-input" v-model="inputContent" :confirm-hold="true" confirm-type="send"
                    cursor-spacing="20" @confirm="sendMessage" placeholder="输了什么都别输了气势..." />

                <view class="send-btn" :class="{ 'btn-disabled': !inputContent.trim() }" @click="sendMessage">发送</view>
            </view>
        </view>
    </view>

    <!-- Hit Effect Overlay -->
    <view class="hit-effect" v-if="showHitEffect">
        <view class="hit-content anim-hit">
            <text class="hit-icon">💥</text>
            <text class="hit-title">亲戚破防了！</text>
            <text class="hit-score">战斗力 {{ hitScore }}</text>
        </view>
    </view>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { AUNT_MONEY_PIC, AUNT_MARRIAGE_PIC, NEIGHBOR_SHOWOFF_PIC, UNCLE_STRICT_PIC, LOGO_PIC } from '../../constants/roles'

const roleId = ref('')
const roleAvatar = ref('')
const roleName = ref('AI嘴替')
const messages = ref([])
const inputContent = ref('')
const loading = ref(false)
const scrollTarget = ref('')
const userProfile = ref(null)

// Share State
const showSingleModal = ref(false)
const showChatModal = ref(false)
const singleSharePath = ref('')
const chatSharePath = ref('')
const currentShareText = ref('')
// Canvas dimensions
const canvasWidth = ref(300)
const canvasHeight = ref(500)

// Hit Effect State
const showHitEffect = ref(false)
const hitScore = ref(0)

const ROLE_INFO = {
    'aunt_money': { avatar: AUNT_MONEY_PIC, name: '势利二姨' },
    'aunt_marriage': { avatar: AUNT_MARRIAGE_PIC, name: '催婚大姑' },
    'neighbor_showoff': { avatar: NEIGHBOR_SHOWOFF_PIC, name: '凡尔赛王姨' },
    'uncle_strict': { avatar: UNCLE_STRICT_PIC, name: '严肃二舅' }
}

const URGENCY_TITLES = [
    "前方高能！亲戚战力爆表！",
    "一级战备！请求火力覆盖！",
    "我快顶不住了！谁来救救我！",
    "过年渡劫现场，在线急求支招！",
    "这天没法聊了，快来帮我！",
    "年年都被怼，今年能不能发疯？",
    "不沉默中爆发，就在怒怼中发疯！",
    "又被怼哭了，这年没法过！"
]

const SINGLE_TITLES = [
    "这也太扎心了...",
    "听听，这是人话吗？",
    "求神评！怎么怼回去？",
    "由于语言过激，已被踢出群聊",
    "今日份的“亲切问候”",
    "别人过年，我渡劫...",
    "本是同根生，相煎何太急？",
    "还能愉快的玩耍吗？",
]

const HELP_GUIDES = [
    "谁有妙招？在线等挺急的！",
    "长按扫码，救救孩子吧！",
    "别光看，快来帮我怼！",
    "你的神评，能救我一命",
    "亲戚太强，请求火力支援",
    "扫码支招，功德无量",
    "会说话就多说点，帮帮我",
    "一人一句，怼赢这局"
]

const getRandomTitle = (type) => {
    const arr = type === 'chat' ? URGENCY_TITLES : SINGLE_TITLES
    return arr[Math.floor(Math.random() * arr.length)]
}

onLoad(async (options) => {
    roleId.value = options.role || 'aunt_money'
    const info = ROLE_INFO[roleId.value] || { avatar: AUNT_MONEY_PIC, name: '神秘亲戚' }
    roleAvatar.value = '' // Init empty, load via cloud
    roleName.value = info.name

    uni.setNavigationBarTitle({ title: info.name })
    uni.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: '#d32f2f' // Red Header
    })

    checkUserProfile()

    // Resolve Cloud URLs
    await resolveCloudUrls()

    if (messages.value.length === 0) {
        messages.value.push({ role: 'ai', content: getGreeting(roleId.value) })
    }
})

const resolveCloudUrls = async () => {
    const fileList = [AUNT_MONEY_PIC, AUNT_MARRIAGE_PIC, NEIGHBOR_SHOWOFF_PIC, UNCLE_STRICT_PIC, LOGO_PIC]
    try {
        const res = await uni.cloud.getTempFileURL({ fileList })
        if (res.fileList && res.fileList.length > 0) {
            const urlMap = {}
            res.fileList.forEach(item => { if (item.tempFileURL) urlMap[item.fileID] = item.tempFileURL })

            const currentId = ROLE_INFO[roleId.value]?.avatar
            if (currentId && urlMap[currentId]) roleAvatar.value = urlMap[currentId]

            // Update all roles
            Object.keys(ROLE_INFO).forEach(k => {
                const fid = ROLE_INFO[k].avatar
                if (urlMap[fid]) ROLE_INFO[k].realAvatar = urlMap[fid]
            })
        }
    } catch (e) { console.error(e) }
}

const formatTime = () => {
    const date = new Date()
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
}

const checkUserProfile = () => {
    try {
        const profile = uni.getStorageSync('user_profile')
        if (profile && typeof profile === 'object') {
            userProfile.value = profile
        } else {
            userProfile.value = { gender: 'unknown' }
        }
    } catch (e) {
        userProfile.value = { gender: 'unknown' }
    }
}

const getGreeting = (id) => {
    const greetings = {
        'aunt_money': [
            '哟，大忙人回来了？今年赚了多少啊，买房了吗？',
            '哎哟，看你这身行头，今年混得不错吧？年终奖拿了多少？',
            '听说城里开销大，你这一年存下钱了吗？够付首付不？',
            '二姨不是势利，就是关心你，现在工资多少了？有车了吗？',
            '回来啦？别光顾着玩，今年赚了几个子儿啊？给家里买了啥？'
        ],
        'aunt_marriage': [
            '多大了还不找对象？隔壁王阿姨孙子都会打酱油了！',
            '你也不小了，怎么还单着？是不是眼光太高了？',
            '过完年又长一岁，还不着急？再挑就真成剩下的了！',
            '姑姑给你物色了几个对象，初三必须去见见，别想跑！',
            '看着你长大的，现在大家都抱孙子了，就你让我们操心。'
        ],
        'neighbor_showoff': [
            '哎呀，我女儿刚给我买了去欧洲的机票，你呢？',
            '我看你朋友圈也没发啥，我刚从三亚度假回来，那边紫外线太强了。',
            '我儿子刚换了辆宝马，说是怕我坐着不舒服，其实我不讲究这些的。',
            '你这衣服挺朴素的，不像我女儿，非要给我买那个什么大牌，太浪费钱。',
            '哎，带孙子太累了，虽然请了两个保姆，但还得我亲自盯着才放心。'
        ],
        'uncle_strict': [
            '工作怎么样？考公了吗？编制才是铁饭碗！',
            '还在那家私企干呢？不稳当啊，趁年轻赶紧考个编。',
            '现在的年轻人太浮躁，只有体制内才是正道，你复习得咋样了？',
            '二舅是过来人，外面的工作都是青春饭，进了单位才是一辈子的保障。',
            '别整天搞那些花里胡哨的，踏踏实实考个公务员，比啥都强。'
        ]
    }
    const list = greetings[id] || ['哎哟，你回来啦。']
    return list[Math.floor(Math.random() * list.length)]
}

const sendMessage = async () => {
    if (!inputContent.value.trim() || loading.value) return
    const text = inputContent.value
    messages.value.push({ role: 'user', content: text })
    inputContent.value = ''
    scrollToBottom()
    loading.value = true

    try {
        const history = messages.value.slice(-6).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))
        const res = await uni.cloud.callFunction({
            name: 'chat-agent',
            data: { message: text, roleId: roleId.value, userProfile: userProfile.value, history }
        })

        if (res.result && res.result.reply) {
            messages.value.push({ 
                role: 'ai', 
                content: res.result.reply, 
                aiScore: res.result.aiScore,
                userScore: res.result.userScore 
            })
            
            // Trigger Hit Effect if userScore > 0 (High Combat Power)
            if (res.result.userScore > 0) {
                hitScore.value = res.result.userScore
                showHitEffect.value = true
                setTimeout(() => { showHitEffect.value = false }, 2500)
            }
        }
    } catch (e) {
        messages.value.push({ role: 'ai', content: '（亲戚正在喝水...请稍后再试）' })
    } finally {
        loading.value = false
        scrollToBottom()
    }
}

const scrollToBottom = () => {
    scrollTarget.value = ''
    nextTick(() => {
        scrollTarget.value = 'bottom-anchor'
    })
}

const onScrollToBottom = (e) => { }

const onCopy = (content) => {
    uni.setClipboardData({ data: content })
}

// --- Share Logic ---

const openSingleShare = (text) => {
    currentShareText.value = text
    showSingleModal.value = true
    singleSharePath.value = ''
    canvasWidth.value = 300
    canvasHeight.value = 450 // Single card height
    setTimeout(() => { drawSingleCard(text) }, 300)
}

const openChatShare = () => {
    showChatModal.value = true
    chatSharePath.value = ''
    canvasWidth.value = 300
    canvasHeight.value = 550 // Chat card height
    setTimeout(() => { drawChatCard() }, 300)
}

const closeSingleModal = () => showSingleModal.value = false
const closeChatModal = () => showChatModal.value = false

const saveImage = (path) => {
    if (!path) return
    uni.saveImageToPhotosAlbum({
        filePath: path,
        success: () => uni.showToast({ title: '保存成功' }),
        fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
    })
}

// Helper: Download File (Supports http/https and cloud://)
const downloadFile = (url) => new Promise((resolve) => {
    if (!url) return resolve(null)

    // 如果已经是本地路径或 base64
    if (url.startsWith('wxfile://') || url.startsWith('http://tmp/') || url.startsWith('data:')) {
        return resolve(url)
    }

    // 处理云文件 ID
    if (url.startsWith('cloud://')) {
        console.log('Canvas: 下载云文件', url)
        uni.cloud.downloadFile({
            fileID: url,
            success: (downRes) => {
                if (downRes.statusCode === 200) {
                    resolve(downRes.tempFilePath)
                } else {
                    console.error('云文件下载失败:', downRes)
                    resolve(null)
                }
            },
            fail: (err) => {
                console.error('云文件下载异常:', err)
                resolve(null)
            }
        })
        return
    }

    // 处理网络图片
    if (url.startsWith('http')) {
        uni.downloadFile({
            url,
            success: (res) => resolve(res.statusCode === 200 ? res.tempFilePath : null),
            fail: () => resolve(null)
        })
    } else {
        // 本地静态资源直接返回
        resolve(url)
    }
})

// Draw Single Message Card (Focus on Quote)
const drawSingleCard = async (text) => {
    const w = canvasWidth.value
    const h = canvasHeight.value
    const avatarSrc = roleAvatar.value || AUNT_MONEY_PIC
    const logoSrc = LOGO_PIC // Use Logo as QR placeholder

    // Parallel download
    const [avatarPath, logoPath] = await Promise.all([
        downloadFile(avatarSrc),
        downloadFile(logoSrc)
    ])

    const ctx = uni.createCanvasContext('shareCanvas')

    // 1. Background (Red Festive Gradient)
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#d32f2f') // Red
    grad.addColorStop(1, '#b71c1c') // Dark Red
    ctx.setFillStyle(grad)
    ctx.fillRect(0, 0, w, h)

    // Pattern (Subtle Fu)
    ctx.setGlobalAlpha(0.05)
    ctx.setFillStyle('#FFD700')
    ctx.font = '20px serif'
    for (let i = 0; i < w; i += 60) {
        for (let j = 0; j < h; j += 60) {
            if ((i + j) % 120 === 0) ctx.fillText('福', i, j)
        }
    }
    ctx.setGlobalAlpha(1.0)

    // 2. Title
    const title = getRandomTitle('single')
    ctx.setFontSize(16)
    ctx.setFillStyle('#FFEBEE')
    ctx.setTextAlign('center')
    ctx.fillText(title, w / 2, 40)

    // 3. Avatar (Circle with border)
    const avatarY = 90
    const avatarR = 40

    // Glow behind avatar
    ctx.save()
    ctx.shadowBlur = 20
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)'
    ctx.beginPath()
    ctx.arc(w / 2, avatarY, avatarR + 2, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFC107'
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.restore()

    if (avatarPath) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(w / 2, avatarY, avatarR, 0, 2 * Math.PI)
        ctx.clip()
        ctx.drawImage(avatarPath, w / 2 - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2)
        ctx.restore()
    } else {
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(w / 2, avatarY, avatarR, 0, 2 * Math.PI)
        ctx.fill()
    }

    // 4. Role Name
    ctx.setFontSize(18)
    ctx.setFillStyle('#FFFFFF')
    ctx.setTextAlign('center')
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(roleName.value, w / 2, avatarY + 60)

    // 5. Quote Box
    const boxY = avatarY + 80
    const boxW = w - 40
    const boxH = h - boxY - 140 // Reserve space for footer/QR

    ctx.fillStyle = '#FFF8E1'
    ctx.beginPath()
    // Rounded corners
    const r = 10
    ctx.moveTo(20 + r, boxY)
    ctx.lineTo(20 + boxW - r, boxY)
    ctx.arcTo(20 + boxW, boxY, 20 + boxW, boxY + r, r)
    ctx.lineTo(20 + boxW, boxY + boxH - r)
    ctx.arcTo(20 + boxW, boxY + boxH, 20 + boxW - r, boxY + boxH, r)
    ctx.lineTo(20 + r, boxY + boxH)
    ctx.arcTo(20, boxY + boxH, 20, boxY + boxH - r, r)
    ctx.lineTo(20, boxY + r)
    ctx.arcTo(20, boxY, 20 + r, boxY, r)
    ctx.fill()

    // Quote Marks
    ctx.font = 'bold 60px serif'
    ctx.fillStyle = 'rgba(211, 47, 47, 0.1)'
    ctx.fillText('“', 40, boxY + 50)
    ctx.fillText('”', w - 40, boxY + boxH - 10)

    // Text Handling (Wrap & Truncate)
    ctx.font = 'normal 18px sans-serif'
    ctx.fillStyle = '#333'
    ctx.setTextAlign('left')
    const textX = 40
    const maxWidth = boxW - 40
    const lineHeight = 26
    const maxLines = Math.floor((boxH - 40) / lineHeight)

    let wrapTextLines = []
    let currentLine = ''
    for (let i = 0; i < text.length; i++) {
        if (ctx.measureText(currentLine + text[i]).width > maxWidth) {
            wrapTextLines.push(currentLine)
            currentLine = ''
        }
        currentLine += text[i]
    }
    if (currentLine) wrapTextLines.push(currentLine)

    // Truncate if too long
    if (wrapTextLines.length > maxLines) {
        wrapTextLines = wrapTextLines.slice(0, maxLines)
        wrapTextLines[maxLines - 1] = wrapTextLines[maxLines - 1].substring(0, wrapTextLines[maxLines - 1].length - 1) + '...'
    }

    // Vertical center text
    const textBlockH = wrapTextLines.length * lineHeight
    let textY = boxY + (boxH - textBlockH) / 2 + 20

    wrapTextLines.forEach((l) => {
        ctx.fillText(l, textX, textY)
        textY += lineHeight
    })

    // 6. Footer & QR Code
    const footerY = h - 110

    // QR Code (Logo)
    const qrSize = 80
    const qrX = w / 2 - qrSize / 2
    const qrY = h - 95

    // Draw QR Background
    ctx.fillStyle = '#FFF'
    ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10)

    if (logoPath) {
        ctx.drawImage(logoPath, qrX, qrY, qrSize, qrSize)
    } else {
        ctx.fillStyle = '#EEE'
        ctx.fillRect(qrX, qrY, qrSize, qrSize)
        ctx.fillStyle = '#999'
        ctx.font = '10px sans-serif'
        ctx.setTextAlign('center')
        ctx.fillText('Logo', w / 2, qrY + qrSize / 2)
    }

    ctx.font = 'bold 14px sans-serif'
    ctx.fillStyle = '#FFC107'
    ctx.setTextAlign('center')
    const guideText = HELP_GUIDES[Math.floor(Math.random() * HELP_GUIDES.length)]
    ctx.fillText(guideText, w / 2, h - 105)

    ctx.draw(false, () => {
        uni.canvasToTempFilePath({
            canvasId: 'shareCanvas',
            success: (res) => singleSharePath.value = res.tempFilePath
        })
    })
}

// Draw Chat History Card (Focus on Battle)
const drawChatCard = async () => {
    const w = canvasWidth.value
    const h = canvasHeight.value
    const msgs = messages.value.slice(-4) // Last 4 messages

    const userAvatarSrc = userProfile.value?.avatarUrl || '/static/logo.webp'
    const roleAvatarSrc = roleAvatar.value || AUNT_MONEY_PIC
    const logoSrc = LOGO_PIC

    const [rolePath, userPath, logoPath] = await Promise.all([
        downloadFile(roleAvatarSrc),
        downloadFile(userAvatarSrc),
        downloadFile(logoSrc)
    ])

    const ctx = uni.createCanvasContext('shareCanvas')

    // 1. Background (Match Chat Page)
    ctx.fillStyle = '#FFF8E1' // Pale Peach/Cream
    ctx.fillRect(0, 0, w, h)

    // 2. Header
    // Simple festive header
    const headerH = 60
    ctx.fillStyle = '#D32F2F'
    ctx.fillRect(0, 0, w, headerH)

    // Title
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 20px sans-serif'
    ctx.setTextAlign('center')
    ctx.fillText('春节大作战现场实录', w / 2, 38)

    // 3. Draw Messages
    let cursorY = headerH + 30
    const bubbleMaxW = 180
    const avatarSize = 35
    // Footer height reservation
    const footerH = 130
    const maxContentY = h - footerH

    ctx.font = '14px sans-serif'

    for (const msg of msgs) {
        if (cursorY > maxContentY) break // Stop if out of space

        const isUser = msg.role === 'user'
        const avatarImg = isUser ? userPath : rolePath

        // Avatar X
        const ax = isUser ? w - 20 - avatarSize : 20

        // Calculate Text Wrap
        const text = msg.content
        let lines = []
        let line = ''
        const maxTextW = bubbleMaxW - 20 // Padding

        for (let i = 0; i < text.length; i++) {
            if (ctx.measureText(line + text[i]).width > maxTextW) {
                lines.push(line)
                line = ''
            }
            line += text[i]
        }
        if (line) lines.push(line)

        // Limit max lines per bubble to prevent one long message taking over
        if (lines.length > 5) {
            lines = lines.slice(0, 5)
            lines[4] = lines[4].substring(0, lines[4].length - 1) + '...'
        }

        const bubbleH = Math.max(lines.length * 20 + 16, 40)
        const bubbleW = lines.length > 1 ? bubbleMaxW : (ctx.measureText(lines[0]).width + 30)

        // Check vertical space for this message
        if (cursorY + bubbleH > maxContentY) break

        // Draw Avatar
        ctx.save()
        ctx.beginPath()
        ctx.arc(ax + avatarSize / 2, cursorY + avatarSize / 2, avatarSize / 2, 0, 2 * Math.PI)
        ctx.clip()
        if (avatarImg) {
            ctx.drawImage(avatarImg, ax, cursorY, avatarSize, avatarSize)
        } else {
            ctx.fillStyle = '#FFCDD2'
            ctx.fillRect(ax, cursorY, avatarSize, avatarSize)
        }
        ctx.restore()

        // Bubble Rect
        const bx = isUser ? (ax - 10 - bubbleW) : (ax + avatarSize + 10)

        ctx.beginPath()
        if (isUser) {
            ctx.fillStyle = '#FFCDD2' // User Bubble Bg
        } else {
            ctx.fillStyle = '#FFFFFF' // AI Bubble Bg
            ctx.setStrokeStyle('#FFF59D')
            ctx.lineWidth = 1
            ctx.strokeRect(bx, cursorY, bubbleW, bubbleH)
        }
        ctx.fillRect(bx, cursorY, bubbleW, bubbleH)

        // Text
        ctx.fillStyle = isUser ? '#B71C1C' : '#333'
        ctx.setTextAlign('left')
        lines.forEach((l, idx) => {
            ctx.fillText(l, bx + 10, cursorY + 20 + idx * 20)
        })

        cursorY += bubbleH + 20
    }

    // 4. Footer & QR
    const qrSize = 80
    const qrY = h - 95
    const qrX = w / 2 - qrSize / 2

    // Urgency Text
    const urgencyTitle = getRandomTitle('chat')
    ctx.fillStyle = '#D32F2F' // Red text for urgency on light bg
    ctx.font = 'bold 16px sans-serif'
    ctx.setTextAlign('center')
    ctx.fillText(urgencyTitle, w / 2, h - 110)

    // QR Code (Logo)
    if (logoPath) {
        ctx.drawImage(logoPath, qrX, qrY, qrSize, qrSize)
    } else {
        ctx.fillStyle = '#FFF'
        ctx.fillRect(qrX, qrY, qrSize, qrSize)
        ctx.strokeRect(qrX, qrY, qrSize, qrSize)
    }

    ctx.fillStyle = '#999'
    ctx.font = '12px sans-serif'
    // ctx.fillText('扫码加入战场 · 帮帮孩子', w / 2, h - 10) // Below QR

    ctx.draw(false, () => {
        uni.canvasToTempFilePath({
            canvasId: 'shareCanvas',
            success: (res) => chatSharePath.value = res.tempFilePath
        })
    })
}

onShareAppMessage((res) => {
    let title = '春节嘴替大作战：来战！'
    let path = `/pages/chat/index?role=${roleId.value}`
    let imageUrl = null

    if (showSingleModal.value && singleSharePath.value) {
        title = getRandomTitle('single')
        imageUrl = singleSharePath.value
    } else if (showChatModal.value && chatSharePath.value) {
        title = getRandomTitle('chat')
        imageUrl = chatSharePath.value
    }

    return { title, path, imageUrl }
})
</script>

<style scoped>
/* Container & Layout */
.chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #FFF8E1;
    /* Pale Peach/Cream */
}

.chat-content {
    flex: 1;
    overflow-y: scroll;
    padding-bottom: 20rpx;
}

.padding-top {
    height: 20rpx;
}

/* System Time */
.system-msg {
    text-align: center;
    margin-bottom: 30rpx;
}

.time-tag {
    background: rgba(0, 0, 0, 0.1);
    color: #999;
    font-size: 24rpx;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
}

/* Message Rows */
.msg-row {
    display: flex;
    margin-bottom: 40rpx;
    padding: 0 24rpx;
    width: 100%;
    box-sizing: border-box;
    align-items: flex-start;
}

.msg-row-user {
    flex-direction: row-reverse;
}

/* Avatar */
.avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 10rpx;
    background: #FFCDD2;
    flex-shrink: 0;
    border: 2rpx solid #FFF;
}

/* Message Body */
.msg-body {
    display: flex;
    flex-direction: column;
    max-width: 70%;
    margin: 0 20rpx;
}

.msg-row-user .msg-body {
    align-items: flex-end;
}

.msg-row-ai .msg-body {
    align-items: flex-start;
}

/* Bubbles */
.bubble-wrapper {
    position: relative;
}

.bubble {
    padding: 20rpx 24rpx;
    font-size: 32rpx;
    color: #333;
    line-height: 1.5;
    border-radius: 12rpx;
    position: relative;
    word-break: break-all;
    min-height: 40rpx;
    display: flex;
    align-items: center;
    box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
}

/* User Bubble: Soft Pink/Red */
.bubble-user {
    background-color: #FFCDD2;
    /* Light Red/Pink */
    color: #B71C1C;
}

/* AI Bubble: White */
.bubble-ai {
    background-color: #FFFFFF;
    color: #333;
    border: 1rpx solid #FFF59D;
    /* Subtle Gold Border */
}

/* Arrows */
.arrow {
    position: absolute;
    top: 26rpx;
    width: 0;
    height: 0;
    border-style: solid;
}

.arrow-user {
    right: -12rpx;
    border-width: 12rpx 0 12rpx 12rpx;
    border-color: transparent transparent transparent #FFCDD2;
}

.arrow-ai {
    left: -12rpx;
    border-width: 12rpx 12rpx 12rpx 0;
    border-color: transparent #FFFFFF transparent transparent;
    /* Arrow border logic is tricky, simplified */
}

/* Footer Actions */
.bubble-footer {
    display: flex;
    align-items: center;
    margin-top: 10rpx;
    padding-left: 4rpx;
}

.score-badge {
    font-size: 20rpx;
    color: #D32F2F;
    background: #FFEBEE;
    padding: 2rpx 8rpx;
    border-radius: 6rpx;
    margin-right: 16rpx;
    border: 1rpx solid #FFCDD2;
}

.action-btn {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    line-height: 1;
    font-size: 22rpx;
    color: #FF6F00;
    /* Amber Text */
    display: flex;
    align-items: center;
}

.action-btn::after {
    border: none;
}

.action-icon {
    margin-right: 4rpx;
    font-size: 24rpx;
}

/* Input Panel */
.input-panel {
    background: #FFF8E1;
    min-height: 110rpx;
    padding: 0 20rpx;
    padding-bottom: constant(safe-area-inset-bottom);
    padding-bottom: env(safe-area-inset-bottom);
    display: flex;
    flex-direction: column;
    border-top: 1rpx solid #FFE082;
}

.panel-top-border {
    display: none;
}

.toolbar {
    display: flex;
    align-items: center;
    height: 110rpx;
    padding: 0 10rpx;
}

.chat-input {
    flex: 1;
    background: #FFFFFF;
    height: 76rpx;
    border-radius: 12rpx;
    margin-right: 20rpx;
    padding: 0 20rpx;
    font-size: 32rpx;
    caret-color: #D32F2F;
    border: 1rpx solid #FFECB3;
}

.send-btn {
    width: 110rpx;
    height: 76rpx;
    background: #D32F2F;
    /* Red Button */
    color: #FFF;
    font-size: 30rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    transition: all 0.2s;
}

.btn-disabled {
    background: #FFCDD2;
    color: #FFF;
    opacity: 0.8;
}

/* Utilities */
.loading-row {
    display: flex;
    justify-content: center;
    padding: 20rpx;
}

.loading-spinner {
    width: 30rpx;
    height: 30rpx;
    border: 4rpx solid #FFCDD2;
    border-top-color: #D32F2F;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    100% {
        transform: rotate(360deg);
    }
}

.anchor {
    height: 1rpx;
    width: 100%;
}

/* SOS Button */
.sos-btn {
    position: fixed;
    right: 30rpx;
    bottom: 200rpx;
    background: #FF5252;
    color: #FFF;
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 16rpx rgba(211, 47, 47, 0.4);
    z-index: 100;
    border: 4rpx solid #FFF;
}

.sos-icon {
    font-size: 32rpx;
    margin-bottom: 0rpx;
    color: #FFF;
}

.sos-text {
    font-size: 24rpx;
    font-weight: bold;
}

/* Share Modal Common */
.modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
}

.modal-content {
    width: 600rpx;
    background: #FFF;
    border-radius: 24rpx;
    padding: 30rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.3);
}

.modal-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.modal-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #D32F2F;
}

.close-btn {
    font-size: 40rpx;
    color: #999;
    padding: 0 10rpx;
}

.canvas-wrapper {
    width: 300px;
    height: 450px;
    /* Taller for Single */
    background: #F5F5F5;
    margin-bottom: 30rpx;
    border-radius: 12rpx;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.canvas-wrapper-long {
    width: 300px;
    height: 550px;
    /* Tallest for Chat */
    background: #F5F5F5;
    margin-bottom: 30rpx;
    border-radius: 12rpx;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.share-preview {
    width: 100%;
    height: 100%;
}

.generating {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #999;
    font-size: 24rpx;
}

.modal-btns {
    display: flex;
    width: 100%;
    justify-content: space-between;
    gap: 20rpx;
}

.m-btn {
    flex: 1;
    font-size: 28rpx;
    border-radius: 40rpx;
    padding: 20rpx 0;
    line-height: 1.5;
    font-weight: bold;
}

.btn-save {
    background: #FFECB3;
    color: #FF6F00;
}

.btn-friend {
    background: #D32F2F;
    color: #FFF;
}

/* Hit Effect */
.hit-effect {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
}

.hit-content {
    background: rgba(0, 0, 0, 0.8);
    padding: 40rpx 60rpx;
    border-radius: 30rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 4rpx solid #FFC107;
    box-shadow: 0 0 50rpx rgba(255, 193, 7, 0.5);
}

.hit-icon {
    font-size: 80rpx;
    margin-bottom: 20rpx;
}

.hit-title {
    color: #FFC107;
    font-size: 40rpx;
    font-weight: bold;
    margin-bottom: 10rpx;
    text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

.hit-score {
    color: #FFF;
    font-size: 32rpx;
    font-weight: bold;
}

.anim-hit {
    animation: hitPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes hitPop {
    0% {
        transform: scale(0);
        opacity: 0;
    }

    60% {
        transform: scale(1.1);
        opacity: 1;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Hidden Canvas */
.offscreen-canvas {
    position: fixed;
    left: 9000px;
}
</style>