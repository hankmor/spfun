<template>
    <view class="container">
        <!-- Background: Red Envelope Theme -->
        <view class="bg-pattern"></view>

        <!-- Header -->
        <view class="header anim-slide-down">
            <view class="logo-text">MOM'S BANK</view>
            <view class="sub-text">妈妈银行 · 极速“存款”</view>
        </view>

        <!-- Main Form Card -->
        <view class="card form-card anim-slide-up" v-if="!showResult">
            <view class="card-header">
                <text class="title">🧧 压岁钱存入处</text>
            </view>

            <view class="form-body">
                <view class="input-group">
                    <text class="label">存户姓名 (谁是那个倒霉蛋)</text>
                    <input class="input" type="nickname" v-model="form.name" placeholder="点击填入你的名称"
                        placeholder-class="ph-style" />
                </view>

                <view class="input-group">
                    <text class="label">存入金额 (当年的那笔巨款)</text>
                    <view class="amount-wrapper">
                        <text class="currency">¥</text>
                        <input class="input amount-input" type="digit" v-model="form.amount" placeholder="1200"
                            placeholder-class="ph-style" />
                    </view>
                </view>

                <view class="input-group">
                    <text class="label">存入时间 (好怀念但回不去了)</text>
                    <view class="date-display">2010年春节</view>
                </view>

                <view class="input-group">
                    <text class="label">妈妈的理由</text>
                    <view class="picker-box" hover-class="picker-hover" @click="showReasonPicker">
                        <text class="picker-text">{{ form.reason || '点击选择理由...' }}</text>
                        <text class="arrow">▼</text>
                    </view>
                </view>
            </view>

            <view class="footer">
                <button class="btn-deposit hover-scale" @click="submitDeposit">
                    <text class="btn-main">确认上交</text>
                    <!-- <text class="btn-sub">盖章生效 · 概不退还</text> -->
                </button>
                <text class="disclaimer">本解释权归妈妈所有，如有异议，憋着。</text>
                <text class="entertainment-hint">仅供娱乐消遣，切勿当真</text>
            </view>
        </view>

        <!-- Result / Poster Preview Modal -->
        <view class="modal-mask anim-fade-in" v-if="showResult" @click="closeResult">
            <view class="modal-content" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">扎心了💔旧时光</text>
                    <view class="close-btn" @click="closeResult">✕</view>
                </view>

                <!-- Canvas Preview Area -->
                <view class="canvas-wrapper shadow-lg">
                    <image v-if="posterPath" :src="posterPath" class="poster-preview" mode="aspectFit"></image>
                    <view v-else class="generating">
                        <view class="loading-spinner"></view>
                        <text>正在计算“损失”...</text>
                    </view>
                </view>

                <view class="modal-btns">
                    <button class="m-btn btn-save" @click="savePoster">📥 保存证据</button>
                    <button class="m-btn btn-share" open-type="share">🔥 挂人曝光</button>
                </view>
            </view>
        </view>

        <!-- Hidden Canvas -->
        <canvas canvas-id="posterCanvas" id="posterCanvas" class="offscreen-canvas"
            :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"></canvas>

    </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import { LOGO_PIC } from '../../constants/roles' // Assume Logo is available

// Constants
const REASONS = [
    '先帮你存着，以后给你娶媳妇',
    '你还小，身上放钱不安全',
    '这钱是爸妈换出去的，得还',
    '正好凑个整，给你交学费',
    '帮你买了那个什么保险',
    '帮你存着，等你长大还给你'
]

const LIE_QUOTES = [
    '妈妈：先帮你存着。\n现实：第二天就变成了家里的排骨。',
    '妈妈：等你长大了就还给你。\n现实：长大后她问你“啥钱？”',
    '妈妈：这点钱我看不上。\n现实：连你的硬币罐都掏空了。',
    '妈妈：帮你交学费了。\n现实：九年义务教育明明免费！',
    '妈妈：那是人情往来。\n现实：往来只有出，没有进。',
    '妈妈：存银行吃利息。\n现实：利息没见着，本金也没了。',
    '妈妈：怕你乱花。\n现实：她花得比你开心多了。',
    '妈妈：以后给你买房。\n现实：首付还得你自己凑。'
]

const INVESTMENTS = [
    { name: '茅台股票', rate: 12.5, unit: '股', desc: '当年要是买了茅台...' },
    { name: '腾讯股票', rate: 9.8, unit: '股', desc: '当年要是买了腾讯...' },
    { name: '黄金', rate: 2.3, unit: '克', desc: '当年要是买了黄金...' },
    { name: '定期存款', rate: 1.5, unit: '元', desc: '就算老实存银行...' } // Low anchor
]

// State
const form = reactive({
    name: '',
    amount: '',
    reason: REASONS[0]
})
const showResult = ref(false)
const posterPath = ref('')
const canvasWidth = ref(325)
const canvasHeight = ref(600)

// Methods
const showReasonPicker = () => {
    uni.showActionSheet({
        itemList: REASONS,
        success: (res) => {
            form.reason = REASONS[res.tapIndex]
        }
    })
}

const submitDeposit = () => {
    if (!form.name) return uni.showToast({ title: '填个名字吧', icon: 'none' })
    if (!form.amount || parseFloat(form.amount) <= 0) return uni.showToast({ title: '金额不对哦', icon: 'none' })

    showResult.value = true
    posterPath.value = ''
    setTimeout(generatePoster, 200)
}

const closeResult = () => showResult.value = false

// Investment Logic
const getComparisons = (amount) => {
    // Pick one high performer (Gold/Moutai/Tencent) and always calculate Bank
    const highPerformers = INVESTMENTS.slice(0, 3)
    const target = highPerformers[Math.floor(Math.random() * highPerformers.length)]

    const bank = INVESTMENTS[3]
    const currentVal = Math.floor(amount * target.rate).toLocaleString()

    return {
        targetName: target.name,
        targetVal: currentVal,
        targetMultiplier: target.rate,
        targetDesc: target.desc
    }
}

// Helper: Download File (Supports http/https and cloud://)
const downloadFile = (url) => new Promise((resolve) => {
    if (!url) return resolve(null)
    if (url.startsWith('wxfile://') || url.startsWith('http://tmp/') || url.startsWith('data:')) return resolve(url)
    if (url.startsWith('cloud://')) {
        uni.cloud.downloadFile({
            fileID: url,
            success: (res) => resolve(res.statusCode === 200 ? res.tempFilePath : null),
            fail: () => resolve(null)
        })
        return
    }
    uni.downloadFile({
        url,
        success: (res) => resolve(res.statusCode === 200 ? res.tempFilePath : null),
        fail: () => resolve(null)
    })
})

// Canvas Painting
const generatePoster = async () => {
    const ctx = uni.createCanvasContext('posterCanvas')
    const W = canvasWidth.value
    const H = canvasHeight.value
    const logoSrc = LOGO_PIC

    // Pre-download assets
    const logoPath = await downloadFile(logoSrc)

    // 1. Background (Texture)
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#B71C1C')
    grad.addColorStop(1, '#880E4F')
    ctx.setFillStyle(grad)
    ctx.fillRect(0, 0, W, H)

    // 2. Receipt Paper (Top Half)
    const paperY = 80
    const paperW = W - 60
    const paperH = 300
    const paperX = 30

    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 5
    ctx.setFillStyle('#FFFDF5')
    ctx.fillRect(paperX, paperY, paperW, paperH)
    ctx.shadowColor = 'transparent' // Reset shadow

    // Receipt Decor - Red Border
    ctx.setStrokeStyle('#D32F2F')
    ctx.setLineWidth(4)
    ctx.strokeRect(paperX + 10, paperY + 10, paperW - 20, paperH - 20)

    // Receipt Content
    ctx.setFillStyle('#333')
    ctx.setTextAlign('center')

    // Title
    ctx.setFontSize(24)
    ctx.font = 'bold 24px serif'
    ctx.fillText("MOM'S BANK", W / 2, paperY + 50)
    ctx.setFontSize(14)
    ctx.font = 'normal 14px sans-serif'
    ctx.fillStyle = '#666'
    ctx.fillText("妈妈定期存单 (永久期)", W / 2, paperY + 74)

    // Divider
    ctx.setStrokeStyle('#E0E0E0')
    ctx.setLineWidth(1)
    ctx.beginPath()
    ctx.moveTo(paperX + 20, paperY + 90)
    ctx.lineTo(paperX + paperW - 20, paperY + 90)
    ctx.stroke()

    // Details
    ctx.setTextAlign('left')
    const startX = paperX + 40
    let cursorY = paperY + 130
    const labelColor = '#999'
    const valColor = '#000'

    // Name
    ctx.setFontSize(12)
    ctx.fillStyle = labelColor
    ctx.fillText("CLIENT / 存户", startX, cursorY)
    ctx.setFontSize(18)
    ctx.fillStyle = valColor
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(form.name, startX, cursorY + 25)

    // Amount & Date (Row)
    cursorY += 60
    ctx.setFontSize(12)
    ctx.fillStyle = labelColor
    ctx.font = 'normal 12px sans-serif'
    ctx.fillText("AMOUNT / 金额 (2010)", startX, cursorY)
    ctx.setFontSize(32)
    ctx.fillStyle = '#D32F2F' // Red amount
    ctx.font = 'bold 32px monospace'
    ctx.fillText(`¥${form.amount}`, startX, cursorY + 35)

    // Reason
    cursorY += 70
    ctx.setFontSize(12)
    ctx.fillStyle = labelColor
    ctx.font = 'normal 12px sans-serif'
    ctx.fillText("REASON / 理由", startX, cursorY)

    // Reason wrap
    ctx.fillStyle = '#333'
    ctx.font = 'normal 14px sans-serif'
    const reason = form.reason
    ctx.fillText(reason, startX, cursorY + 20)

    // Stamp
    ctx.save()
    ctx.translate(paperX + paperW - 60, paperY + paperH - 55)
    ctx.rotate(-25 * Math.PI / 180)
    ctx.beginPath()
    ctx.arc(0, 0, 40, 0, 2 * Math.PI)
    ctx.setStrokeStyle('rgba(211, 47, 47, 0.6)')
    ctx.setLineWidth(3)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, 36, 0, 2 * Math.PI)
    ctx.setLineWidth(1)
    ctx.stroke()
    ctx.fillStyle = 'rgba(211, 47, 47, 0.6)'
    ctx.setTextAlign('center')
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText("MOM BANK", 0, -5)
    ctx.fillText("保管专用", 0, 10)
    ctx.setFontSize(10)
    ctx.fillText("2026", 0, 30)
    ctx.restore()

    // 3. The "Truth" Section (Bottom Dark Area)
    const truthY = paperY + paperH + 20

    // Witty Quote (Top)
    const quote = LIE_QUOTES[Math.floor(Math.random() * LIE_QUOTES.length)]
    const quoteParts = quote.split('\n')

    ctx.fillStyle = '#FFEBEE'
    ctx.setTextAlign('center')
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText(quoteParts[0], W / 2, 40)
    ctx.fillStyle = '#FFC107' // Highlight reality
    ctx.fillText(quoteParts[1], W / 2, 64)

    // Investment Result (Bottom)
    const result = getComparisons(form.amount)

    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(20, truthY, W - 40, 100) // Dark box

    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFF'
    ctx.font = '14px sans-serif'
    ctx.fillText(result.targetDesc, W / 2, truthY + 30)

    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 36px monospace'
    ctx.fillText(`¥ ${result.targetVal}`, W / 2, truthY + 70)

    // Footer / QR
    const footerY = H - 90
    if (logoPath) {
        const qrSize = 60
        ctx.drawImage(logoPath, W / 2 - qrSize / 2, footerY, qrSize, qrSize)
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.setFontSize(10)
        ctx.fillText("扫码生成你的“童年账单”", W / 2, footerY + qrSize + 15)
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.setFontSize(10)
        ctx.fillText("扫码生成你的“童年账单”", W / 2, H - 30)
    }

    // Draw
    ctx.draw(false, () => {
        setTimeout(() => {
            uni.canvasToTempFilePath({
                canvasId: 'posterCanvas',
                destWidth: W * 3,
                destHeight: H * 3,
                success: (res) => posterPath.value = res.tempFilePath,
                fail: (e) => console.log(e)
            })
        }, 300)
    })
}

const savePoster = () => {
    if (!posterPath.value) return
    uni.saveImageToPhotosAlbum({
        filePath: posterPath.value,
        success: () => uni.showToast({ title: '保存成功' }),
        fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
    })
}

// Share Logic
onShareAppMessage(() => {
    return {
        title: `妈，当年那笔${form.amount || '压岁'}钱，现在值多少你知道吗？`,
        path: '/pages/bank/index',
        imageUrl: posterPath.value || ''
    }
})

</script>

<style scoped>
.container {
    min-height: 100vh;
    padding: 30rpx;
    background-color: #D32F2F;
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
}

.bg-pattern {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-image: radial-gradient(rgba(255, 215, 0, 0.1) 10%, transparent 10%);
    background-size: 40rpx 40rpx;
    pointer-events: none;
}

/* Header */
.header {
    text-align: center;
    margin: 40rpx 0 60rpx;
}

.logo-text {
    font-family: serif;
    font-size: 60rpx;
    font-weight: 900;
    color: #FFC107;
    letter-spacing: 4rpx;
    text-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.2);
}

.sub-text {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 10rpx;
    letter-spacing: 8rpx;
}

/* Form Card */
.card {
    background: #FFFDF5;
    border-radius: 20rpx;
    padding: 0;
    box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
    overflow: hidden;
    position: relative;
    z-index: 10;
}

.card-header {
    background: #FFECB3;
    padding: 24rpx;
    text-align: center;
    border-bottom: 2rpx dashed #FFC107;
}

.card-header .title {
    color: #8D6E63;
    font-weight: bold;
    font-size: 32rpx;
}

.form-body {
    padding: 40rpx;
}

.input-group {
    margin-bottom: 40rpx;
}

.label {
    display: block;
    font-size: 24rpx;
    color: #888;
    margin-bottom: 16rpx;
}

.input {
    height: 80rpx;
    border-bottom: 2rpx solid #E0E0E0;
    font-size: 32rpx;
    color: #333;
}

.amount-wrapper {
    display: flex;
    align-items: center;
    border-bottom: 2rpx solid #E0E0E0;
}

.currency {
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
    margin-right: 20rpx;
}

.amount-input {
    border: none;
    font-size: 48rpx;
    font-weight: bold;
    height: 90rpx;
}

.ph-style {
    color: #CCC;
    font-weight: normal;
    font-size: 30rpx;
}

.date-display {
    font-size: 32rpx;
    color: #333;
    font-weight: bold;
    padding: 20rpx 0;
    border-bottom: 2rpx solid #E0E0E0;
}

.picker-box {
    font-size: 30rpx;
    color: #333;
    padding: 24rpx 0;
    border-bottom: 2rpx solid #E0E0E0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.picker-text {
    flex: 1;
}

.picker-hover {
    background-color: rgba(0, 0, 0, 0.05);
}

.arrow {
    color: #999;
    font-size: 24rpx;
}

/* Footer */
.footer {
    padding: 40rpx;
    background: #FFF;
    text-align: center;
}

.btn-deposit {
    background: linear-gradient(135deg, #D32F2F, #B71C1C);
    color: #FFF;
    border-radius: 50rpx;
    padding: 20rpx 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10rpx 20rpx rgba(211, 47, 47, 0.3);
    border: none;
}

.btn-main {
    font-size: 36rpx;
    font-weight: bold;
    letter-spacing: 2rpx;
}

.btn-sub {
    font-size: 20rpx;
    opacity: 0.8;
    margin-top: 4rpx;
}

.disclaimer {
    font-size: 20rpx;
    color: #BBB;
    margin-top: 24rpx;
    display: block;
}

.entertainment-hint {
    font-size: 18rpx;
    color: rgba(0, 0, 0, 0.2);
    margin-top: 10rpx;
    display: block;
}

/* Modal */
.modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    width: 600rpx;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.modal-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.modal-title {
    color: #FFF;
    font-size: 36rpx;
    font-weight: bold;
}

.close-btn {
    color: #FFF;
    font-size: 40rpx;
    padding: 10rpx;
}

.canvas-wrapper {
    width: 100%;
    height: 800rpx;
    background: #FFF;
    border-radius: 20rpx;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.poster-preview {
    width: 100%;
    height: 100%;
}

.generating {
    text-align: center;
    color: #999;
    font-size: 28rpx;
}

.loading-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 6rpx solid #EEE;
    border-top-color: #D32F2F;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20rpx;
}

.modal-btns {
    width: 100%;
    display: flex;
    gap: 30rpx;
    margin-top: 40rpx;
}

.m-btn {
    flex: 1;
    border-radius: 50rpx;
    font-size: 30rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 90rpx;
}

.btn-save {
    background: #FFF;
    color: #333;
}

.btn-share {
    background: #FFC107;
    color: #333;
}

.offscreen-canvas {
    position: fixed;
    left: 9999px;
}

/* Animations */
.anim-slide-down {
    animation: slideDown 0.8s ease-out;
}

.anim-slide-up {
    animation: slideUp 0.8s ease-out;
}

.anim-fade-in {
    animation: fadeIn 0.3s ease-out;
}

@keyframes slideDown {
    from {
        transform: translateY(-50px);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}

@keyframes slideUp {
    from {
        transform: translateY(50px);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.hover-scale:active {
    transform: scale(0.98);
}
</style>
