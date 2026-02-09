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

            <!-- Bottom Spacer to prevent overlap with input area -->
            <view class="bottom-spacer" :style="{ marginBottom: keyboardHeight + 'px' }"></view>
            <view id="bottom-anchor" class="anchor"></view>
        </scroll-view>

        <!-- Reset Button (Floating) - REMOVED -->

        <!-- God Mode Button (Floating) -->
        <view class="god-mode-floating-btn anim-pop" @click.stop="useGodMode"
            :style="{ transform: `translateY(${-keyboardHeight}px)` }">
            <text class="god-text">助力</text>
        </view>

        <!-- SOS Button (Floating) -->
        <view class="sos-btn anim-pop" @click.stop="openChatShare"
            :style="{ transform: `translateY(${-keyboardHeight}px)` }">
            <text class="sos-icon">求救</text>
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
            :style="{ width: (canvasWidth * CANVAS_SCALE) + 'px', height: (canvasHeight * CANVAS_SCALE) + 'px' }"></canvas>

        <!-- Input Area -->
        <view class="input-area glass-panel safe-area-bottom"
            :style="{ transform: `translateY(${-keyboardHeight}px)` }">
            <!-- Energy Progress Bar -->
            <view class="energy-status-bar" v-if="adEnabled" @click="showEnergyModal">
                <view class="energy-progress-bg">
                    <view class="energy-progress-fill" :style="{ width: (energy / maxEnergy * 100) + '%' }"></view>
                </view>
                <text class="energy-status-text">体力值 {{ energy }}/{{ maxEnergy }}</text>
            </view>

            <view class="input-row">
                <input class="chat-input" confirm-type="send" v-model="inputValue" :placeholder="inputPlaceholder"
                    :adjust-position="false" @keyboardheightchange="onKeyboardHeightChange"
                    @confirm="sendMessage" />
                <button class="send-btn" :class="{ 'btn-disabled': !inputValue.trim() }" @click="sendMessage">
                    <text class="btn-icon">↑</text>
                </button>
                <button class="reset-icon-btn" @click="confirmReset">
                    <text class="btn-icon">↻</text>
                </button>
            </view>
        </view>

        <!-- Energy Depleted Modal -->
        <view class="modal-mask" v-if="showEnergyModalState && adEnabled" @click="closeEnergyModal">
            <view class="modal-content" @click.stop>
                <view class="modal-header header-energy">
                    <text class="modal-title">⚡ 体力耗尽</text>
                    <view class="close-btn" @click="closeEnergyModal">✕</view>
                </view>
                <view class="modal-body">
                    <text class="energy-desc">和亲戚对线太累了，歇会儿吧！或者...</text>
                    <button class="ad-btn" @click="watchAdForEnergy">
                        看视频回血 (+{{ energyReward }})
                    </button>
                    <text class="sub-text">每日免费恢复至 {{ maxEnergy }} 点</text>

                    <view class="promo-section">
                        <view class="promo-title">去别处逛逛？</view>
                        <view class="promo-grid">
                            <view class="promo-item" @click="navTo('/pages/bank/index')">
                                <view class="promo-icon">🧧</view>
                                <text class="promo-text">妈妈存单</text>
                            </view>
                            <view class="promo-item" @click="navTo('/pages/avatar/index')">
                                <view class="promo-icon">🦁</view>
                                <text class="promo-text">开运头像</text>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </view>
    </view>

    <!-- Hit Effect Overlay -->
    <view class="hit-effect" v-if="showHitEffect">
        <!-- User Win Style -->
        <view v-if="effectType === 'user_win'" class="hit-content anim-hit user-win">
            <text class="hit-icon">💥</text>
            <text class="hit-title">{{ currentHitTitle || '亲戚破防了！' }}</text>
            <text class="hit-score">战斗力 {{ hitScore }}</text>
        </view>
        <!-- AI Win Style -->
        <view v-else class="hit-content anim-hit ai-win">
            <text class="hit-icon">😰</text>
            <text class="hit-title">{{ currentHitTitle || '你被怼得无语了...' }}</text>
            <text class="hit-score">杀伤力 {{ aiHitScore }}</text>
        </view>
    </view>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue'
import { onLoad, onUnload, onShareAppMessage } from '@dcloudio/uni-app'
import { AUNT_MONEY_PIC, AUNT_MARRIAGE_PIC, NEIGHBOR_SHOWOFF_PIC, UNCLE_STRICT_PIC, LOGO_PIC, QR_PIC } from '../../constants/roles'
import AdManager from '../../utils/adManager'

const roleId = ref('')
const roleName = ref('')
const roleAvatar = ref('')
const roleTheme = ref('') // theme-red, theme-coral
const messages = ref([])
const inputValue = ref('')
const inputPlaceholder = ref('输了什么都别输了气势...')
const loading = ref(false)
const scrollTarget = ref('')
const userProfile = ref(null)

// Keyboard Logic
const keyboardHeight = ref(0)
const onKeyboardHeightChange = (e) => {
    keyboardHeight.value = e.detail.height || 0
    if (keyboardHeight.value > 0) {
        scrollToBottom()
    }
}

// Ad & Energy Logic
const energy = ref(15)
const maxEnergy = ref(15)
const energyReward = ref(10)
const showEnergyModalState = ref(false)
const adEnabled = ref(false)
const godModePrompt = ref('')

const initAds = async () => {
    await AdManager.init()
    adEnabled.value = AdManager.config.ad_enabled
    maxEnergy.value = AdManager.config.chat_energy
    energyReward.value = AdManager.config.chat_energy_num_after_ad
    godModePrompt.value = AdManager.config.ai_help_prompt

    console.log("adEnabled: ", adEnabled.value)

    loadEnergy()
}

const loadEnergy = () => {
    const today = new Date().toISOString().split('T')[0]
    const lastDate = uni.getStorageSync('energy_last_date')
    const storedEnergy = uni.getStorageSync('user_energy')

    if (lastDate !== today) {
        // New day: Reset energy
        energy.value = maxEnergy.value
        saveEnergy()
    } else {
        // Same day: Use stored energy or default
        energy.value = (storedEnergy !== '') ? parseInt(storedEnergy) : maxEnergy.value
    }
}

const saveEnergy = () => {
    const today = new Date().toISOString().split('T')[0]
    uni.setStorageSync('user_energy', energy.value)
    uni.setStorageSync('energy_last_date', today)
}

const checkEnergy = () => {
    // 如果广告关闭，直接通过（无限体力）
    if (!AdManager.config.ad_enabled) return true

    if (energy.value <= 0) {
        showEnergyModalState.value = true
        return false
    }
    return true
}

const showEnergyModal = () => {
    showEnergyModalState.value = true
}

const closeEnergyModal = () => {
    showEnergyModalState.value = false
}

const navTo = (url) => {
    uni.navigateTo({ url })
}

const watchAdForEnergy = () => {
    AdManager.showRewardedVideoAd({
        onSuccess: () => {
            energy.value += energyReward.value
            // maxEnergy.value += energyReward.value
            saveEnergy()
            uni.showToast({ title: `体力 +${energyReward.value}`, icon: 'success' })
            closeEnergyModal()
        },
        onFail: (err) => {
            uni.showToast({ title: err || '观看失败', icon: 'none' })
        }
    })
}

const fetchGodModeReply = async () => {
    uni.showLoading({ title: 'AI 思考中...' })
    try {
        const history = messages.value.slice(-6) // Context
        const res = await uni.cloud.callFunction({
            name: 'chat-agent',
            data: {
                action: 'god_mode',
                prompt: godModePrompt.value,
                history: history,
                roleId: roleId.value
            }
        })
        if (res.result && res.result.reply) {
            inputValue.value = res.result.reply
        }
    } catch (e) {
        console.log("error: ", e)
        uni.showToast({ title: 'AI 罢工了', icon: 'none' })
    } finally {
        uni.hideLoading()
    }
}

const useGodMode = () => {
    // 优先判断全局广告开关
    if (!AdManager.config.ad_enabled) {
        fetchGodModeReply()
        return
    }

    uni.showModal({
        title: '🤖 AI 嘴替',
        content: '看个视频，让 AI 帮你生成一句绝杀金句？',
        success: (res) => {
            if (res.confirm) {
                AdManager.showRewardedVideoAd({
                    onSuccess: fetchGodModeReply,
                    onFail: () => { }
                })
            }
        }
    })
}

// Share State
const showSingleModal = ref(false)
const showChatModal = ref(false)
const singleSharePath = ref('')
const chatSharePath = ref('')
const currentShareText = ref('')
// Canvas dimensions
const CANVAS_SCALE = 2
const canvasWidth = ref(300)
const canvasHeight = ref(500)

// Hit Effect State
const showHitEffect = ref(false)
const effectType = ref('user_win') // 'user_win' | 'ai_win'
const currentHitTitle = ref('')
const hitScore = ref(0)
const aiHitScore = ref(0)

const USER_WIN_TITLES = [
    '亲戚被怼得没词了！',
    '漂亮！亲戚当场破防',
    'CPU烧了，亲戚愣住了',
    '怼得好！全场为你点赞',
    '亲戚正尴尬地抠脚...',
    '战术喝茶，亲戚慌了',
    'K.O.！亲戚血条空了',
    '亲戚正在尝试重启大脑',
    '绝杀！亲戚想找借口开溜',
    '一击穿心！亲戚哑口无言',
    '反杀成功！亲戚气势全无',
    '亲戚自乱阵脚，开始结巴',
    '攻守逆转！亲戚落荒而逃',
    '亲戚的CPU直接过载了',
    '怼得亲戚怀疑人生！'
]

const AI_WIN_TITLES = [
    '你被怼得想钻地缝...',
    '惨烈！你受到了暴击',
    '哑火了，你半天没憋出词',
    '被怼得怀疑人生...',
    '杀伤力拉满！你沉默了',
    '亲戚发力，你落荒而逃',
    '防御崩了，你被破防',
    '你感到一阵窒息的压迫感',
    '彻底败北！你正在生闷气',
    '对方输出了成吨的伤害',
    '逻辑死锁！你彻底没词了',
    '被亲戚降维打击了...',
    '你感受到中老年的压迫感',
    '回怼失败！气势被压制',
    '心脏漏跳一拍，你输了'
]

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
    "哎，这也太扎心了...",
    "听听，这是人话吗？",
    "求神评！怎么怼回去？",
    "由于语言过激，已被踢出群聊",
    "来自长辈们的“亲切问候”",
    "别人过年，我渡劫...",
    "大过年的，还能愉快的玩耍吗？",
]

const HELP_GUIDES = [
    "谁有妙招？在线等挺急的！",
    "长按扫码，救救孩子吧！",
    "别光看，快来帮我怼！",
    "你的神评，能救我一命",
    "亲戚太强，请求火力支援",
    "扫码支招，功德无量，求救",
    "会说话就多说点，帮帮我",
    "一人一句，帮我怼赢这局"
]

const getRandomTitle = (type) => {
    const arr = type === 'chat' ? HELP_GUIDES : SINGLE_TITLES
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

    // Load History or Init
    initAds()
    loadHistory()
})

const getHistoryKey = () => `chat_history_${roleId.value}`

const loadHistory = () => {
    try {
        const history = uni.getStorageSync(getHistoryKey())
        if (history && Array.isArray(history) && history.length > 0) {
            messages.value = history
        } else {
            // New chat
            messages.value = [{ role: 'ai', content: getGreeting(roleId.value) }]
            saveHistory()
        }
    } catch (e) {
        messages.value = [{ role: 'ai', content: getGreeting(roleId.value) }]
    }
    scrollToBottom()
}

const saveHistory = () => {
    try {
        uni.setStorageSync(getHistoryKey(), messages.value)
    } catch (e) {
        console.error('Save storage fail:', e)
    }
}

const confirmReset = () => {
    uni.showModal({
        title: '重新开始',
        content: '确定要清除所有聊天记录并重新开始吗？',
        confirmColor: '#d32f2f',
        success: (res) => {
            if (res.confirm) {
                clearHistory()
            }
        }
    })
}

const clearHistory = () => {
    messages.value = [{ role: 'ai', content: getGreeting(roleId.value) }]
    saveHistory()
    uni.showToast({ title: '已重新开始', icon: 'none' })
}

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
            '回来啦？别光顾着玩，今年赚了几个子儿啊？给家里买了啥？',
            '在外面大城市混，一个月能剩多少钱？回村盖房够不？',
            '你那工作稳当不？我看新闻说大厂都在裁剪，你可得留神。',
            '今年发奖金了吗？二姨听说你们那边流行发什么年终大奖。',
            '看你买这包，得好几千吧？赚钱不容易，别都花在虚荣上。',
            '今年打算给家里包多少红包？工作这么久了，可不能小气。'
        ],
        'aunt_marriage': [
            '多大了还不找对象？隔壁王阿姨孙子都会打酱油了！',
            '你也不小了，怎么还单着？是不是眼光太高了？',
            '过完年又长一岁，还不着急？再挑就真成剩下的了！',
            '姑姑给你物色了几个对象，初三必须去见见，别想跑！',
            '看着你长大的，现在大家都抱孙子了，就你让我们操心。',
            '在大城市谈恋爱没？别被那些花言巧语的小年轻给骗了。',
            '一个人在外面多孤单啊，还是回来找个安稳的结婚。',
            '你说你要求啥样子的？姑姑手里资源多得是，保准你满意。',
            '再不结婚，好的都被挑走了，到时候只能找二婚的了。',
            '姑姑像你这么大的时候，你哥都能下地跑了。'
        ],
        'neighbor_showoff': [
            '哎呀，我女儿刚给我买了去欧洲的机票，你呢？',
            '我看你朋友圈也没发啥，我刚从三亚度假回来，那边紫外线太强了。',
            '我儿子刚换了辆宝马，说是怕我坐着不舒服，其实我不讲究这些的。',
            '你这衣服挺朴素的，不像我女儿，非要给我买那个什么大牌，太浪费钱。',
            '哎，带孙子太累了，虽然请了两个保姆，但还得我亲自盯着才放心。',
            '我家Lucy在伦敦读硕士，去年刚拿了全额奖学金。',
            '今年年货都是女婿送的，燕窝花胶堆得厨房都没地儿放。',
            '我看你还没买车？哎呀，现在没车出门多不方便，哪怕随便买个代步也行。',
            '我刚在市中心置办了套商铺，打算收收租给孙子买玩具。',
            '人生啊，还是得拼搏，你看我家现在这生活，都是拼出来的。'
        ],
        'uncle_strict': [
            '工作怎么样？考公了吗？编制才是铁饭碗！',
            '还在那家私企干呢？不稳当啊，趁年轻赶紧考个编。',
            '现在的年轻人太浮躁，只有体制内才是正道，你复习得咋样了？',
            '二舅是过来人，外面的工作都是青春饭，进了单位才是一辈子的保障。',
            '别整天搞那些花里胡哨的，踏踏实实考个公务员，比啥都强。',
            '今年公考报名没？我认识几个朋友可以给你指指路。',
            '那种私企能干一辈子？万一公司倒了大半年都没地儿哭。',
            '做人要讲奉献，要讲稳定。你现在的工资五险一金交满没？',
            '别整天想那些创业发财的梦，安安稳稳才是福。',
            '听说你年后要换工作？可得往体制内看，别在外面瞎折腾。'
        ]
    }
    const list = greetings[id] || ['哎哟，你回来啦。']
    return list[Math.floor(Math.random() * list.length)]
}

const sendMessage = async () => {
    if (!inputValue.value.trim()) return
    if (loading.value) return

    // Check Energy
    if (!checkEnergy()) return

    const content = inputValue.value
    inputValue.value = '' // Clear input

    // Deduct Energy
    energy.value--
    saveEnergy()

    messages.value.push({ role: 'user', content })
    saveHistory()
    loading.value = true
    scrollToBottom()

    try {
        const history = messages.value.slice(-6).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))
        const res = await uni.cloud.callFunction({
            name: 'chat-agent',
            data: { message: content, roleId: roleId.value, userProfile: userProfile.value, history }
        })

        console.log("response: ", res)

        if (res.result && res.result.reply) {
            messages.value.push({
                role: 'ai',
                content: res.result.reply,
                aiScore: res.result.aiScore,
                userScore: res.result.userScore
            })
            saveHistory()

            // Trigger Hit Effect
            if (res.result.userScore > 0) {
                // User breaks defense
                hitScore.value = res.result.userScore
                effectType.value = 'user_win'
                currentHitTitle.value = USER_WIN_TITLES[Math.floor(Math.random() * USER_WIN_TITLES.length)]
                showHitEffect.value = true
                setTimeout(() => { showHitEffect.value = false }, 2500)
            } else if (res.result.aiScore > 85) {
                // AI breaks defense
                aiHitScore.value = res.result.aiScore
                effectType.value = 'ai_win'
                currentHitTitle.value = AI_WIN_TITLES[Math.floor(Math.random() * AI_WIN_TITLES.length)]
                showHitEffect.value = true
                setTimeout(() => { showHitEffect.value = false }, 2500)
            }
        }
    } catch (e) {
        console.log("error: ", e)
        messages.value.push({ role: 'ai', content: '（亲戚正在喝水...）' })
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
    if (loading.value) {
        console.log('Share blocked: AI is loading')
        return
    }
    console.log('openSingleShare triggered')
    currentShareText.value = text
    showSingleModal.value = true
    singleSharePath.value = ''
    canvasWidth.value = 300
    canvasHeight.value = 450 // Single card height
    setTimeout(() => { drawSingleCard(text) }, 300)
}

const openChatShare = () => {
    if (loading.value) {
        console.log('Share blocked: AI is loading (SOS)')
        return
    }
    console.log('openChatShare (SOS) triggered')
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

    // 尝试展示插屏广告（不阻塞保存）
    AdManager.showInterstitialAd()

    uni.saveImageToPhotosAlbum({
        filePath: path,
        success: () => uni.showToast({ title: '保存成功', icon: 'success' }),
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
    const SCALE = CANVAS_SCALE
    const w = canvasWidth.value * SCALE
    const h = canvasHeight.value * SCALE
    const avatarSrc = roleAvatar.value || AUNT_MONEY_PIC
    const logoSrc = QR_PIC // Use Logo as QR placeholder

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
    ctx.font = (20 * SCALE) + 'px serif'
    for (let i = 0; i < w; i += 60 * SCALE) {
        for (let j = 0; j < h; j += 60 * SCALE) {
            if ((i / (60 * SCALE) + j / (60 * SCALE)) % 2 === 0) ctx.fillText('福', i, j)
        }
    }
    ctx.setGlobalAlpha(1.0)

    // 2. Title
    const title = getRandomTitle('single')
    ctx.setFontSize(16 * SCALE)
    ctx.setFillStyle('#FFEBEE')
    ctx.setTextAlign('center')
    ctx.fillText(title, w / 2, 40 * SCALE)

    // 3. Avatar (Circle with border)
    const avatarY = 90 * SCALE
    const avatarR = 40 * SCALE

    // Glow behind avatar
    ctx.save()
    ctx.shadowBlur = 20 * SCALE
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)'
    ctx.beginPath()
    ctx.arc(w / 2, avatarY, avatarR + 2 * SCALE, 0, 2 * Math.PI)
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
    ctx.setFontSize(18 * SCALE)
    ctx.setFillStyle('#FFFFFF')
    ctx.setTextAlign('center')
    ctx.font = `bold ${18 * SCALE}px sans-serif`
    ctx.fillText(roleName.value, w / 2, avatarY + 60 * SCALE)

    // 5. Quote Box
    const boxY = avatarY + 80 * SCALE
    const boxW = w - 40 * SCALE
    const boxH = h - boxY - 140 * SCALE // Reserve space for footer/QR

    ctx.fillStyle = '#FFF8E1'
    ctx.beginPath()
    // Rounded corners
    const r = 10 * SCALE
    const bx_left = 20 * SCALE
    ctx.moveTo(bx_left + r, boxY)
    ctx.lineTo(bx_left + boxW - r, boxY)
    ctx.arcTo(bx_left + boxW, boxY, bx_left + boxW, boxY + r, r)
    ctx.lineTo(bx_left + boxW, boxY + boxH - r)
    ctx.arcTo(bx_left + boxW, boxY + boxH, bx_left + boxW - r, boxY + boxH, r)
    ctx.lineTo(bx_left + r, boxY + boxH)
    ctx.arcTo(bx_left, boxY + boxH, bx_left, boxY + boxH - r, r)
    ctx.lineTo(bx_left, boxY + r)
    ctx.arcTo(bx_left, boxY, bx_left + r, boxY, r)
    ctx.fill()

    // Quote Marks
    ctx.font = `bold ${60 * SCALE}px serif`
    ctx.fillStyle = 'rgba(211, 47, 47, 0.1)'
    ctx.fillText('“', 40 * SCALE, boxY + 60 * SCALE)
    ctx.fillText('”', w - 40 * SCALE, boxY + boxH + 20 * SCALE)

    // Text Handling (Wrap & Truncate)
    ctx.font = `normal ${18 * SCALE}px sans-serif`
    ctx.fillStyle = '#333'
    ctx.setTextAlign('left')
    const textX = 40 * SCALE
    const maxWidth = boxW - 40 * SCALE
    const lineHeight = 26 * SCALE
    const maxLines = Math.floor((boxH - 40 * SCALE) / lineHeight)

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
    let textY = boxY + (boxH - textBlockH) / 2 + 20 * SCALE

    wrapTextLines.forEach((l) => {
        ctx.fillText(l, textX, textY)
        textY += lineHeight
    })

    // 6. Footer & QR Code
    // QR Code (Logo)
    const qrSize = 80 * SCALE
    const qrX = w / 2 - qrSize / 2
    const qrY = h - 95 * SCALE

    // Draw QR Background
    ctx.fillStyle = '#FFF'
    ctx.fillRect(qrX - 5 * SCALE, qrY - 5 * SCALE, qrSize + 10 * SCALE, qrSize + 10 * SCALE)

    if (logoPath) {
        ctx.drawImage(logoPath, qrX, qrY, qrSize, qrSize)
    } else {
        ctx.fillStyle = '#EEE'
        ctx.fillRect(qrX, qrY, qrSize, qrSize)
        ctx.fillStyle = '#999'
        ctx.font = `${10 * SCALE}px sans-serif`
        ctx.setTextAlign('center')
        ctx.fillText('Logo', w / 2, qrY + qrSize / 2)
    }

    ctx.font = `bold ${14 * SCALE}px sans-serif`
    ctx.fillStyle = '#FFC107'
    ctx.setTextAlign('center')
    const guideText = HELP_GUIDES[Math.floor(Math.random() * HELP_GUIDES.length)]
    ctx.fillText(guideText, w / 2, h - 105 * SCALE)

    ctx.draw(false, () => {
        uni.canvasToTempFilePath({
            canvasId: 'shareCanvas',
            destWidth: w,
            destHeight: h,
            success: (res) => singleSharePath.value = res.tempFilePath
        })
    })
}

// Draw Chat History Card (Focus on Battle)
const drawChatCard = async () => {
    const SCALE = CANVAS_SCALE
    const w = canvasWidth.value * SCALE
    const h = canvasHeight.value * SCALE
    const msgs = messages.value.slice(-4) // Last 4 messages
    console.log("last 4 msg: ", msgs)

    const userAvatarSrc = userProfile.value?.avatarUrl || '/static/logo.webp'
    const roleAvatarSrc = roleAvatar.value || AUNT_MONEY_PIC
    const logoSrc = QR_PIC

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
    const headerH = 60 * SCALE
    ctx.fillStyle = '#D32F2F'
    ctx.fillRect(0, 0, w, headerH)

    // Title
    ctx.fillStyle = '#FFF'
    ctx.font = `bold ${20 * SCALE}px sans-serif`
    ctx.setTextAlign('center')
    ctx.fillText('春节嘴替现场实录', w / 2, 38 * SCALE)

    // 3. Draw Messages
    let cursorY = headerH + 15 * SCALE // 从 30 减小到 15，给消息腾出顶部空间
    const bubbleMaxW = 200 * SCALE // 从 180 增加到 200，让气泡宽一些，从而降低高度
    const avatarSize = 35 * SCALE
    // Footer height reservation
    const footerH = 115 * SCALE // 从 130 减小到 115，给消息腾出底部空间
    const maxContentY = h - footerH

    ctx.font = `${14 * SCALE}px sans-serif`

    for (const msg of msgs) {
        // 这里的快速判断可以放宽一点，或者直接移除，后面有更精确的 cursorY + bubbleH 判断
        if (cursorY > maxContentY - 30 * SCALE) break 

        const isUser = msg.role === 'user'
        const avatarImg = isUser ? userPath : rolePath

        // Avatar X - 边距从 20 减小到 10
        const ax = isUser ? w - 10 * SCALE - avatarSize : 10 * SCALE

        // Calculate Text Wrap
        const text = msg.content
        let lines = []
        let line = ''
        const maxTextW = bubbleMaxW - 20 * SCALE // Padding

        for (let i = 0; i < text.length; i++) {
            if (ctx.measureText(line + text[i]).width > maxTextW) {
                lines.push(line)
                line = ''
            }
            line += text[i]
        }
        if (line) lines.push(line)

        // Limit max lines per bubble
        if (lines.length > 5) {
            lines = lines.slice(0, 5)
            lines[4] = lines[4].substring(0, lines[4].length - 1) + '...'
        }

        const bubbleH = Math.max(lines.length * 20 * SCALE + 16 * SCALE, 40 * SCALE)
        const bubbleW = lines.length > 1 ? bubbleMaxW : (ctx.measureText(lines[0]).width + 30 * SCALE)

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

        // Bubble Rect - 气泡离头像的间距从 10 减小到 8
        const bx = isUser ? (ax - 8 * SCALE - bubbleW) : (ax + avatarSize + 8 * SCALE)

        // Draw Bubble and Arrow
        ctx.beginPath()
        if (isUser) {
            ctx.fillStyle = '#FFCDD2'
            ctx.rect(bx, cursorY, bubbleW, bubbleH)
            ctx.moveTo(bx + bubbleW, cursorY + 10 * SCALE)
            ctx.lineTo(bx + bubbleW + 6 * SCALE, cursorY + 15 * SCALE)
            ctx.lineTo(bx + bubbleW, cursorY + 20 * SCALE)
            ctx.fill()
        } else {
            ctx.fillStyle = '#FFFFFF'
            ctx.setStrokeStyle('#FFF59D')
            ctx.setLineWidth(1 * SCALE)
            ctx.moveTo(bx, cursorY)
            ctx.lineTo(bx + bubbleW, cursorY)
            ctx.lineTo(bx + bubbleW, cursorY + bubbleH)
            ctx.lineTo(bx, cursorY + bubbleH)
            ctx.lineTo(bx, cursorY + 20 * SCALE)
            ctx.lineTo(bx - 6 * SCALE, cursorY + 15 * SCALE)
            ctx.lineTo(bx, cursorY + 10 * SCALE)
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
        }

        // Text
        ctx.fillStyle = isUser ? '#B71C1C' : '#333'
        ctx.setTextAlign('left')
        lines.forEach((l, idx) => {
            ctx.fillText(l, bx + 10 * SCALE, cursorY + 20 * SCALE + idx * 20 * SCALE)
        })

        cursorY += bubbleH + 12 * SCALE // 气泡间距从 20 减小到 12
    }

    // 4. Footer & QR
    const qrSize = 80 * SCALE
    const qrY = h - 95 * SCALE
    const qrX = w / 2 - qrSize / 2

    // Urgency Text
    const urgencyTitle = getRandomTitle('chat')
    ctx.fillStyle = '#D32F2F' // Red text for urgency on light bg
    ctx.font = `bold ${16 * SCALE}px sans-serif`
    ctx.setTextAlign('center')
    ctx.fillText(urgencyTitle, w / 2, h - 110 * SCALE)

    // QR Code (Logo)
    if (logoPath) {
        ctx.drawImage(logoPath, qrX, qrY, qrSize, qrSize)
    } else {
        ctx.fillStyle = '#FFF'
        ctx.fillRect(qrX, qrY, qrSize, qrSize)
        ctx.strokeRect(qrX, qrY, qrSize, qrSize)
    }

    ctx.fillStyle = '#999'
    ctx.font = `${12 * SCALE}px sans-serif`
    // ctx.fillText('扫码加入战场 · 帮帮孩子', w / 2, h - 10) // Below QR

    ctx.draw(false, () => {
        uni.canvasToTempFilePath({
            canvasId: 'shareCanvas',
            destWidth: w,
            destHeight: h,
            success: (res) => {
                chatSharePath.value = res.tempFilePath
            }
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
    /* padding-bottom: 20rpx; */
}

.bottom-spacer {
    width: 100%;
    /* Base height should cover the input area (approx 180rpx) plus safe area */
    height: 180rpx;
    padding-bottom: env(safe-area-inset-bottom);
    box-sizing: content-box;
    transition: height 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.padding-top {
    height: 20rpx;
}

/* System Msg */
.system-msg {
    text-align: center;
    margin-bottom: 30rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10rpx;
}

.time-tag {
    font-size: 24rpx;
    color: #999;
    background: rgba(0, 0, 0, 0.05);
    padding: 4rpx 16rpx;
    border-radius: 8rpx;
}

.energy-tag {
    font-size: 24rpx;
    color: #FFF;
    background: #FF9800;
    /* Orange */
    padding: 4rpx 16rpx;
    border-radius: 20rpx;
    font-weight: bold;
    box-shadow: 0 2rpx 6rpx rgba(255, 152, 0, 0.3);
}

/* Energy Modal */
.header-energy {
    /* background: linear-gradient(135deg, #D32F2F, #D32F2F); */
    /* color: #FFF!important; */
}

.energy-desc {
    font-size: 30rpx;
    color: #666;
    text-align: center;
    margin-bottom: 40rpx;
    line-height: 1.5;
}

.ad-btn {
    background: #D32F2F;
    color: #FFF;
    border-radius: 50rpx;
    font-size: 32rpx;
    font-weight: bold;
    padding: 10rpx 0;
    margin: 40rpx 20rpx 10rpx 0;
}

.sub-text {
    font-size: 22rpx;
    color: #AAA;
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

/* Energy Progress Bar */
.energy-status-bar {
    width: 100%;
    margin-bottom: 0rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    padding: 10rpx 0;
}

.energy-progress-bg {
    width: 100%;
    height: 12rpx;
    background: #FFEBEE;
    border-radius: 6rpx;
    overflow: hidden;
    position: relative;
    border: 1rpx solid rgba(211, 47, 47, 0.1);
}

.energy-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #FFCDD2, #D32F2F);
    border-radius: 6rpx;
    transition: width 0.3s ease;
}

.energy-statu.sub-text {
    font-size: 20rpx;
    color: #999;
    margin-top: 20rpx;
    display: block;
}

.promo-section {
    margin-top: 40rpx;
    width: 100%;
    border-top: 1rpx solid #f0f0f0;
    padding-top: 30rpx;
}

.promo-title {
    font-size: 24rpx;
    color: #666;
    margin-bottom: 20rpx;
}

.promo-grid {
    display: flex;
    justify-content: space-around;
    gap: 20rpx;
}

.promo-item {
    flex: 1;
    background: #f8f8f8;
    padding: 20rpx;
    border-radius: 20rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: all 0.2s;
}

.promo-item:active {
    background: #f0f0f0;
    transform: scale(0.95);
}

.promo-icon {
    font-size: 48rpx;
    margin-bottom: 10rpx;
}

.promo-text {
    font-size: 24rpx;
    color: #333;
    font-weight: bold;
}

.energy-status-text {
    font-size: 20rpx;
    color: #D32F2F;
    margin-top: 6rpx;
    font-weight: 500;
    opacity: 0.8;
}

/* Input Area */
.input-area {
    position: fixed;
    /* Use fixed to ensure it stays at the bottom above other content */
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 20rpx 20rpx;
    /* Base padding */
    padding-bottom: calc(0rpx + constant(safe-area-inset-bottom));
    /* iOS 11.0 fallback */
    padding-bottom: calc(0rpx + env(safe-area-inset-bottom));
    /* iOS 11.2+ */
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-top: 1rpx solid rgba(0, 0, 0, 0.05);
    z-index: 100;
    box-sizing: border-box;
    transition: transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.tool-bar {
    display: flex;
    justify-content: flex-start;
}

.input-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    width: 100%;
}

.chat-input {
    flex: 1;
    height: 80rpx;
    background: #F5F5F5;
    border-radius: 40rpx;
    padding: 0 30rpx;
    font-size: 30rpx;
    color: #333;
}

.send-btn,
.reset-icon-btn {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin: 0;
    transition: all 0.2s;
}

.send-btn {
    background: #D32F2F;
    color: #FFF;
}

.reset-icon-btn {
    background: #f0f0f0;
    color: #666;
    border: 1rpx solid #ddd;
}

.btn-icon {
    font-size: 40rpx;
    line-height: 1;
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
/* --- Floating Action Buttons (Chinese Red Theme) --- */
.sos-btn,
.reset-btn,
.god-mode-floating-btn {
    position: fixed;
    right: 30rpx;
    width: 96rpx;
    /* Slightly larger for a premium feel */
    height: 96rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99;
    border: 4rpx solid #FFD700;
    /* Gold Border */
    box-shadow: 0 6rpx 16rpx rgba(183, 28, 28, 0.4);
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.sos-btn:active,
.reset-btn:active,
.god-mode-floating-btn:active {
    transform: scale(0.9);
}

/* SOS Button (Primary Red) */
.sos-btn {
    bottom: 260rpx;
    background: linear-gradient(135deg, #ee2323 0%, #ba0f0f 100%);
}

/* God Mode Button (Vibrant Red) */
.god-mode-floating-btn {
    bottom: 380rpx;
    /* Adjusted spacing */
    background: linear-gradient(135deg, #FF5252 0%, #D32F2F 100%);
}

/* Reset Button (Darker Red/Brown) */
.reset-btn {
    bottom: 460rpx;
    /* Adjusted spacing */
    background: linear-gradient(135deg, #dcdcdc 0%, #9f9f9f 100%);
    border-color: rgba(255, 215, 0, 0.5);
    /* Slower gold for reset */
    opacity: 0.9;
}

.sos-text,
.reset-text,
.god-text {
    color: #FFF;
    font-size: 26rpx;
    /* Slightly larger */
    font-weight: 900;
    text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
}

/* Icon style for SOS */
.sos-icon {
    font-size: 26rpx;
    color: #FFF;
    font-weight: 900;
}

/* Stack Positions Override (Already handled in refined styles above, but ensuring clean-up) */
.sos-btn {
    right: 30rpx;
}

.god-mode-floating-btn {
    right: 30rpx;
}

.reset-btn {
    right: 30rpx;
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
    align-content: center;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.3);
    gap: 20rpx;
}

.modal-header {
    width: 100%;
    height: 60rpx;
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

.modal-body {
    width: 90%;
    text-align: center;
}

.close-btn {
    font-size: 30rpx;
    color: #666;
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
    background: rgba(0, 0, 0, 0.85);
    padding: 50rpx 70rpx;
    border-radius: 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    backdrop-filter: blur(10px);
}

.user-win {
    border: 4rpx solid #FFC107;
    box-shadow: 0 0 60rpx rgba(255, 193, 7, 0.6);
}

.ai-win {
    border: 4rpx solid #FF5252;
    box-shadow: 0 0 60rpx rgba(255, 82, 82, 0.6);
}

.hit-icon {
    font-size: 100rpx;
    margin-bottom: 30rpx;
}

.user-win .hit-title {
    color: #FFC107;
    text-shadow: 0 2rpx 10rpx rgba(255, 193, 7, 0.4);
}

.ai-win .hit-title {
    color: #FF5252;
    text-shadow: 0 2rpx 10rpx rgba(255, 82, 82, 0.4);
}

.hit-title {
    font-size: 44rpx;
    font-weight: bold;
    margin-bottom: 15rpx;
}

.hit-score {
    color: #FFF;
    font-size: 36rpx;
    font-weight: bold;
    opacity: 0.9;
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