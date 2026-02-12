<template>
    <view class="blessing-container">
        <!-- Navbar Header -->
        <view class="nav-header">
            <view class="back-btn" @click="goBack">✕</view>
            <text class="nav-title">神仙祝福生成器</text>
        </view>

        <!-- Main Scroll Content -->
        <scroll-view class="main-content" scroll-y>
            <!-- Area A: Target Selector -->
            <view class="section">
                <view class="section-title">
                    <text class="title-text">🧧 发送给谁？</text>
                    <text class="title-sub">选择对象，AI 会调整语气</text>
                </view>
                <view class="target-grid">
                    <view v-for="item in targets" :key="item.id" class="target-card"
                        :class="{ 'active': currentTarget === item.id }" @click="currentTarget = item.id">
                        <view class="target-icon">{{ item.icon }}</view>
                        <text class="target-name">{{ item.name }}</text>
                        <view class="check-mark" v-if="currentTarget === item.id">✓</view>
                    </view>
                </view>
            </view>

            <!-- Area B: Vibe Slider -->
            <view class="section">
                <view class="section-title">
                    <text class="title-text">🌈 想要什么味儿？</text>
                </view>
                <view class="vibe-selector">
                    <view v-for="vibe in vibes" :key="vibe.id" class="vibe-tag"
                        :class="{ 'active': currentVibe === vibe.id }" @click="currentVibe = vibe.id">
                        <text class="vibe-name">{{ vibe.name }}</text>
                        <text class="vibe-desc">{{ vibe.desc }}</text>
                    </view>
                </view>
            </view>

            <!-- Area C: Generate Action -->
            <view class="action-section">
                <button class="gen-btn" :loading="loading" @click="generateBlessing">
                    <text v-if="!loading">一键生成</text>
                    <text v-else>正在马不停蹄地构思...</text>
                </button>
            </view>

            <view class="bottom-spacer"></view>
        </scroll-view>

        <!-- Result Modal (Popup) -->
        <view class="modal-mask" v-if="showResultModal" @click="closeResultModal">
            <view class="modal-content result-modal anim-pop" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">✨ 生成结果</text>
                    <view class="close-btn" @click="closeResultModal">✕</view>
                </view>

                <view class="modal-body">
                    <!-- Mode 1: Text Content -->
                    <view class="tab-content anim-slide-up" v-if="!isPosterMode">
                        <view class="text-card shadow-lg">
                            <view class="quote-icon start">“</view>
                            <textarea class="blessing-textarea" v-model="blessingText" auto-height maxlength="200" />
                            <view class="quote-icon end">”</view>
                        </view>
                        <view class="tab-btns">
                            <button class="m-btn btn-copy" @click="copyText">📄 复制文字</button>
                            <button class="m-btn btn-make-poster" @click="handleMakePoster">🖼 制作海报</button>
                        </view>
                    </view>

                    <!-- Mode 2: Poster Content (Dynamic Templates) -->
                    <view class="tab-content anim-slide-up" v-else>
                        <view class="poster-preview-wrapper horizontal shadow-lg">
                            <!-- Show Generated Image directly for 100% WYSIWYG -->
                            <image v-if="posterPath" :src="posterPath" mode="aspectFit" class="poster-image-final" />

                            <!-- Loading State while drawing -->
                            <view v-else class="poster-drawing-loading">
                                <view class="loading-spinner"></view>
                                <text class="loading-text">正在雕琢高清海报...</text>
                            </view>
                        </view>

                        <view class="tab-btns">
                            <button class="m-btn btn-save" @click="savePoster">📥 保存图片海报</button>
                            <button class="m-btn btn-friend" open-type="share">🚀 直接转发好友</button>
                        </view>
                        <view class="back-text-link" @click="isPosterMode = false">← 返回修改文字</view>
                    </view>
                </view>
            </view>
        </view>

        <!-- Hidden Canvas for Paper Drawing (Horizontal 16:9) -->
        <canvas canvas-id="blessingCanvas" id="blessingCanvas" class="offscreen-canvas"
            :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"></canvas>
    </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AdManager from '../../utils/adManager'
import { getTemplateByTarget } from './posterTemplates'

const loading = ref(false)
const drawing = ref(false)
const isPosterMode = ref(false)
const currentTarget = ref('boss')
const currentVibe = ref('formal')
const blessingText = ref('')
const posterPath = ref('')
const sharePosterPath = ref('') // 5:4 分享专用图
const showResultModal = ref(false)

onMounted(() => {
    AdManager.init()
})

const currentTemplate = computed(() => {
    return getTemplateByTarget(currentTarget.value)
})

const canvasWidth = 800 // 横版宽度
const canvasHeight = ref(450) // 横版基准高度 (16:9 比例)

const targets = [
    { id: 'boss', name: '老板/甲方', icon: '👔' },
    { id: 'relatives', name: '七大姑八大姨', icon: '👵' },
    { id: 'bestie', name: '死党/闺蜜', icon: '🐷' },
    { id: 'crush', name: '对象/恋人', icon: '❤️' },
    { id: 'ex', name: '同学/前任', icon: '🎓' },
    { id: 'fri', name: '朋友/同事', icon: '🥤' }
]

const vibes = [
    { id: 'formal', name: '🍵 得体稳重', desc: '不卑不亢安全牌' },
    { id: 'horse', name: '🐴 马力全开', desc: '全是谐音梗' },
    { id: 'crazy', name: '🌪 精神出走', desc: '发疯抽象派' }
]

const goBack = () => {
    uni.navigateBack()
}

const generateBlessing = async () => {
    if (loading.value) return
    loading.value = true
    blessingText.value = ''
    posterPath.value = ''

    try {
        const res = await uni.cloud.callFunction({
            name: 'chat-agent',
            data: {
                action: 'blessing',
                target: currentTarget.value,
                vibe: currentVibe.value
            }
        })
        if (res.result && res.result.blessing) {
            blessingText.value = res.result.blessing
            // blessingText.value = "这只是一个测试文案这只是一个测试文案这只是一个测试文案这只是一个测试文案"
            isPosterMode.value = false
            showResultModal.value = true
        } else {
            uni.showToast({ title: 'AI 思考超时，再试一次', icon: 'none' })
        }
    } catch (e) {
        console.error("error: ", e)
        uni.showToast({ title: '生成失败', icon: 'none' })
    } finally {
        loading.value = false
    }
}

const closeResultModal = () => {
    showResultModal.value = false
}

const reGenerate = () => {
    generateBlessing()
}

const copyText = () => {
    uni.setClipboardData({
        data: blessingText.value,
        success: () => {
            // uni.showToast 有时会被 setClipboardData 的系统自带提示覆盖，所以延迟一下或干脆依赖系统提示
            setTimeout(() => {
                uni.showToast({ title: '文案已复制', icon: 'success' })
            }, 500)
        }
    })
}

const drawPoster = async () => {
    if (drawing.value) return
    drawing.value = true

    uni.showLoading({ title: '海报绘制中...' })

    try {
        console.log('AdManager: Starting drawPoster for template:', currentTemplate.value.id)
        const ctx = uni.createCanvasContext('blessingCanvas')

        // --- 1. 参数对齐与高度计算 ---
        const config = currentTemplate.value.canvasConfig
        console.log('Current Config TextColor:', config.textColor) // Debug log

        const templateId = currentTemplate.value.id
        const isDopamine = templateId === 'dopamine'
        const isCinematic = templateId === 'cinematic'
        const isNeo = templateId === 'neo-chinese'
        const isBusiness = templateId === 'business'
        const isSweet = templateId === 'sweet'

        // 字体与行高同步 CSS
        const bodyFontSize = isCinematic ? 34 : 38
        const bodyLineHeight = isCinematic ? 75 : 64
        ctx.setFontSize(bodyFontSize)

        // 核心：计算实际可绘制宽度 (对齐 CSS width + padding)
        // 用户要求两边各增加 20px padding，即 wrapWidth 总计减少 40px
        let wrapWidth = canvasWidth * 0.7 - 40 // Default
        if (isDopamine) wrapWidth = (canvasWidth * 0.82 * 0.85 - 40) - 80 // 缩窄后的背景块宽度 - 内部 Padding
        if (isCinematic) wrapWidth = canvasWidth * 0.9 - 120
        if (isNeo) wrapWidth = canvasWidth * 0.8 - 140

        const lines = calculateLines(ctx, blessingText.value, wrapWidth)
        const textHeight = lines.length * bodyLineHeight

        // 基准高度对齐
        const requiredHeight = textHeight + 400
        canvasHeight.value = Math.max(500, requiredHeight)

        await new Promise(resolve => setTimeout(resolve, 50))
        const currentH = canvasHeight.value

        // --- 2. 背景与纹理 ---
        // Get config from template

        if (isDopamine) {
            // Dopamine Style: Triple Radial Gradients (Using Circular for compat)
            ctx.setFillStyle(config.bgGradient[2]) // Main background
            ctx.fillRect(0, 0, canvasWidth, currentH)

            // Top Left Purple Glow
            if (ctx.createCircularGradient) {
                const g1 = ctx.createCircularGradient(canvasWidth * 0.2, currentH * 0.2, canvasWidth * 0.6)
                g1.addColorStop(0, config.bgGradient[0])
                g1.addColorStop(1, 'transparent')
                ctx.setFillStyle(g1)
                ctx.fillRect(0, 0, canvasWidth, currentH)

                // Bottom Right Yellow Glow
                const g2 = ctx.createCircularGradient(canvasWidth * 0.8, currentH * 0.8, canvasWidth * 0.6)
                g2.addColorStop(0, config.bgGradient[1])
                g2.addColorStop(1, 'transparent')
                ctx.setFillStyle(g2)
                ctx.fillRect(0, 0, canvasWidth, currentH)
            }

            // Background Blobs (Static)
            ctx.save()
            ctx.setGlobalAlpha(0.3)
            ctx.setFillStyle('#FFF200'); ctx.beginPath(); ctx.arc(100, 100, 80, 0, Math.PI * 2); ctx.fill()
            ctx.setFillStyle('#E056FD'); ctx.beginPath(); ctx.arc(canvasWidth - 100, currentH - 100, 100, 0, Math.PI * 2); ctx.fill()
            ctx.restore()
        } else if (isCinematic) {
            // Cinematic: Deep Background + Blurred Orbs
            ctx.setFillStyle(config.bgGradient[0])
            ctx.fillRect(0, 0, canvasWidth, currentH)

            // Draw Orbs (Atmosphere)
            if (config.orbs && ctx.createCircularGradient) {
                config.orbs.forEach(orb => {
                    const gradient = ctx.createCircularGradient(canvasWidth * orb.x, currentH * orb.y, orb.r)
                    gradient.addColorStop(0, orb.color)
                    gradient.addColorStop(1, 'transparent')
                    ctx.save()
                    ctx.setGlobalAlpha(0.25)
                    ctx.setFillStyle(gradient)
                    ctx.fillRect(0, 0, canvasWidth, currentH)
                    ctx.restore()
                })
            }
        } else {
            const bgGradient = ctx.createLinearGradient(0, 0, canvasWidth, currentH)
            bgGradient.addColorStop(0, config.bgGradient[0])
            bgGradient.addColorStop(1, config.bgGradient[1])
            ctx.fillStyle = bgGradient
            ctx.fillRect(0, 0, canvasWidth, currentH)
        }

        // Sweet 主题：绘制小清新装饰元素
        if (isSweet && config.decorations) {
            ctx.save()
            // 绘制爱心装饰
            if (config.decorations.hearts) {
                config.decorations.hearts.forEach(heart => {
                    ctx.setGlobalAlpha(heart.opacity)
                    ctx.setFillStyle(heart.color)
                    ctx.setFontSize(heart.size)
                    ctx.setTextAlign('center')
                    ctx.fillText('♥', canvasWidth * heart.x, currentH * heart.y)
                })
            }
            // 绘制花朵装饰
            if (config.decorations.flowers) {
                config.decorations.flowers.forEach(flower => {
                    ctx.setGlobalAlpha(flower.opacity)
                    ctx.setFillStyle(flower.color)
                    ctx.setFontSize(flower.size)
                    ctx.setTextAlign('center')
                    ctx.fillText('✿', canvasWidth * flower.x, currentH * flower.y)
                })
            }
            // 绘制气球装饰
            if (config.decorations.balloons) {
                config.decorations.balloons.forEach(balloon => {
                    ctx.setGlobalAlpha(balloon.opacity)
                    ctx.setFillStyle(balloon.color)
                    ctx.setFontSize(balloon.size)
                    ctx.setTextAlign('center')
                    ctx.fillText('🎈', canvasWidth * balloon.x, currentH * balloon.y)
                })
            }
            ctx.restore()
        }

        // Draw Watermark
        ctx.save()
        ctx.setFillStyle(config.watermarkColor)
        ctx.setFontSize(400)
        ctx.setTextAlign('center')
        ctx.fillText('马', canvasWidth / 2, currentH / 2 + 140)
        ctx.restore()

        // --- 3. 模拟盒模型 (Card / Sticker / Lines) ---
        const cardW = isCinematic ? canvasWidth * 0.9 : (isDopamine ? canvasWidth * 0.82 : canvasWidth * 0.8)
        const cardH = currentH * 0.82
        const cardX = (canvasWidth - cardW) / 2
        const cardY = (currentH - cardH) / 2

        ctx.save()
        if (isDopamine) {
            // Broken Grid Rotation: -2deg
            ctx.translate(canvasWidth / 2, currentH / 2)
            ctx.rotate(-2 * Math.PI / 180)
            ctx.translate(-canvasWidth / 2, -currentH / 2)

            // Card Base
            ctx.setFillStyle('rgba(255, 255, 255, 0.15)')
            ctx.setShadow(15, 15, 0, 'rgba(0,0,0,0.1)')
            ctx.fillRect(cardX, cardY, cardW, cardH)

            // White Sticker Border
            ctx.setStrokeStyle('#FFFFFF')
            ctx.setLineWidth(6)
            ctx.strokeRect(cardX, cardY, cardW, cardH)
        } else if (isCinematic) {
            // Cinematic Lines
            ctx.setStrokeStyle('rgba(255, 255, 255, 0.15)')
            ctx.setLineWidth(1)
            ctx.beginPath()
            ctx.moveTo(cardX, cardY + 30)
            ctx.lineTo(cardX + cardW, cardY + 30)
            ctx.moveTo(cardX, cardY + cardH - 30)
            ctx.lineTo(cardX + cardW, cardY + cardH - 30)
            ctx.stroke()
        } else {
            // Glassmorphism
            ctx.setFillStyle('rgba(255, 255, 255, 0.08)')
            ctx.setShadow(0, 10, 30, 'rgba(0,0,0,0.3)')
            ctx.fillRect(cardX, cardY, cardW, cardH)

            // Neo Gold Border
            if (isNeo) {
                ctx.setStrokeStyle('rgba(212, 175, 55, 0.3)')
                ctx.setLineWidth(1)
                ctx.strokeRect(cardX + 10, cardY + 10, cardW - 20, cardH - 20)
            }
        }
        ctx.restore()

        // --- 4. 标题 ---
        ctx.save()
        if (isDopamine) {
            ctx.translate(canvasWidth / 2, currentH / 2)
            ctx.rotate(-2 * Math.PI / 180)
            ctx.translate(-canvasWidth / 2, -currentH / 2)

            ctx.setFontSize(80)
            ctx.setTextAlign('center')
            // Retro 3D Shadow: Offset matches CSS text-shadow
            ctx.setFillStyle('#00008B')
            ctx.fillText(currentTemplate.value.defaultTitle, canvasWidth / 2 + 8, cardY + 128)
            ctx.setFillStyle('#FFFFFF')
            ctx.fillText(currentTemplate.value.defaultTitle, canvasWidth / 2, cardY + 120)
        } else if (isCinematic) {
            ctx.setFillStyle('#FFFFFF')
            ctx.setGlobalAlpha(0.8)
            const cinematicFontSize = 80
            ctx.setFontSize(cinematicFontSize)
            ctx.setTextAlign('center')
            // CSS letter-spacing: 0.2em -> spacing = fontSize * 0.2
            drawSpacedText(ctx, currentTemplate.value.defaultTitle, canvasWidth / 2 - 160, cardY + 140, cinematicFontSize * 0)
        } else {
            // 兼容纯色与渐变配置
            if (Array.isArray(config.titleGradient)) {
                const titleGrad = ctx.createLinearGradient(cardX, 0, cardX + cardW, 0)
                if (config.titleGradient.length > 2) {
                    titleGrad.addColorStop(0, config.titleGradient[0])
                    titleGrad.addColorStop(0.5, config.titleGradient[1])
                    titleGrad.addColorStop(1, config.titleGradient[2])
                } else {
                    titleGrad.addColorStop(0, config.titleGradient[0])
                    titleGrad.addColorStop(1, config.titleGradient[1])
                }
                ctx.setFillStyle(titleGrad)
            } else {
                // 纯色配置 (String) - 解决 iOS 真机渐变兼容问题
                ctx.setFillStyle(config.titleGradient)
            }

            ctx.setFontSize(72)
            ctx.setTextAlign('center')
            ctx.fillText(currentTemplate.value.defaultTitle, canvasWidth / 2, cardY + 120)
        }
        ctx.restore()

        // --- 5. 正文 ---
        ctx.save()
        if (isDopamine) { // 多巴胺
            ctx.translate(canvasWidth / 2, currentH / 2)
            ctx.rotate(-2 * Math.PI / 180)
            ctx.translate(-canvasWidth / 2, -currentH / 2)

            // Dopamine Text Background (White Block)
            const bodyW = cardW * 0.85 - 40 // 左右各缩窄 20px
            const bodyH = textHeight + 40
            const bodyX = (canvasWidth - bodyW) / 2
            const bodyY = cardY + 200

            ctx.setFillStyle('#FFFFFF')
            ctx.setShadow(6, 6, 0, 'rgba(0,0,0,0.1)')
            ctx.fillRect(bodyX, bodyY, bodyW, bodyH)

            ctx.setFillStyle(config.textColor) // 使用配置的颜色，不再硬编码
            ctx.setFontSize(38)
            ctx.setTextAlign('center')
            drawLines(ctx, lines, canvasWidth / 2, bodyY + 20, 64)
        } else {
            ctx.setFillStyle(config.textColor)
            ctx.setFontSize(bodyFontSize)
            ctx.setTextAlign('center')
            const startY = cardY + (isCinematic ? 220 : 220)
            drawLines(ctx, lines, canvasWidth / 2, startY, bodyLineHeight)
        }
        ctx.restore()

        // --- 6. 侧边纵向文字 ---
        ctx.save()
        if (isDopamine) {
            ctx.translate(canvasWidth / 2, currentH / 2)
            ctx.rotate(-2 * Math.PI / 180)
            ctx.translate(-canvasWidth / 2, -currentH / 2)
        }
        ctx.setFillStyle(config.coupletColor)
        ctx.setFontSize(22)
        ctx.setTextAlign('center')
        drawVerticalText(ctx, currentTemplate.value.couplets[0], cardX + 40, currentH / 2)
        drawVerticalText(ctx, currentTemplate.value.couplets[1], cardX + cardW - 40, currentH / 2)
        ctx.restore()

        // --- 7. 印章 & Marquee Strip (Canvas Version) ---
        if (isDopamine) {
            ctx.setFillStyle('#00008B')
            ctx.fillRect(0, currentH - 35, canvasWidth, 35)
            ctx.setFillStyle('#FFF200')
            ctx.setFontSize(18)
            ctx.setTextAlign('center')
            ctx.fillText('HAPPY CHINESE NEW YEAR 2026 ★ RIDE ON THE HORSE ★', canvasWidth / 2, currentH - 12)
        }

        // const stampX = cardX + cardW - 100
        // const stampY = cardY + cardH - 80
        // ctx.save()
        // if (isDopamine) {
        // ctx.translate(canvasWidth / 2, currentH / 2)
        // ctx.rotate(-2 * Math.PI / 180)
        // ctx.translate(-canvasWidth / 2, -currentH / 2)
        // }
        // ctx.translate(stampX, stampY)
        // ctx.rotate(5 * Math.PI / 180)
        // ctx.setStrokeStyle(config.stampColor)
        // ctx.setLineWidth(3)
        // ctx.strokeRect(0, 0, 80, 40)
        // ctx.setFillStyle(config.stampColor)
        // ctx.setFontSize(24)
        // ctx.fillText('嘴替', 40, 30)
        // ctx.restore()

        // Final Render
        ctx.draw(false, () => {
            setTimeout(async () => {
                try {
                    const res = await uni.canvasToTempFilePath({
                        canvasId: 'blessingCanvas',
                        destWidth: canvasWidth * 2,
                        destHeight: canvasHeight.value * 2,
                        fileType: 'jpg',
                        quality: 0.8
                    })
                    posterPath.value = res.tempFilePath
                    console.log("posterPath: ", posterPath.value)

                    // --- 生成分享专用图 (5:4 比例) ---
                    // 截取中间部分或顶部，确保核心内容可见
                    // 微信分享图最佳比例 5:4 (e.g. 500x400)
                    try {
                        const shareRes = await uni.canvasToTempFilePath({
                            canvasId: 'blessingCanvas',
                            x: 0,
                            y: 0, // 从顶部开始截取，通常包含标题和大部分内容
                            width: canvasWidth,
                            height: canvasWidth * 0.8, // 5:4 aspect ratio (h = w * 0.8)
                            destWidth: canvasWidth, // 不需要太高清，减小体积
                            destHeight: canvasWidth * 0.8,
                            fileType: 'jpg',
                            quality: 0.8
                        })
                        sharePosterPath.value = shareRes.tempFilePath
                        console.log("sharePosterPath: ", sharePosterPath.value)
                    } catch (shareErr) {
                        console.error('Share image generation failed:', shareErr)
                        // 降级使用长图
                        sharePosterPath.value = posterPath.value
                    }

                    uni.hideLoading()
                } catch (err) {
                    console.error('AdManager: canvasToTempFilePath failed', err)
                    uni.hideLoading()
                } finally {
                    drawing.value = false
                }
            }, 800)
        })

    } catch (e) {
        console.error('AdManager: drawPoster Error', e)
        uni.hideLoading()
        drawing.value = false
    }
}

// 辅助函数：绘制纵排文字
const drawVerticalText = (ctx, text, x, centerY) => {
    const chars = text.split('')
    const charHeight = 28
    const totalH = chars.length * charHeight
    let currentY = centerY - totalH / 2 + charHeight / 2
    chars.forEach(c => {
        ctx.fillText(c, x, currentY)
        currentY += charHeight
    })
}

// 辅助函数：计算行
const calculateLines = (ctx, text, maxWidth) => {
    const words = text.split('')
    let line = ''
    let lines = []

    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n]
        let metrics = ctx.measureText(testLine)
        let testWidth = metrics ? (metrics.width || 0) : 0
        if (testWidth > maxWidth && n > 0) {
            lines.push(line)
            line = words[n]
        } else {
            line = testLine
        }
    }
    lines.push(line)
    return lines
}

// 辅助函数：实际绘制行
const drawLines = (ctx, lines, x, startY, lineHeight) => {
    let currentY = startY + (lineHeight / 2)
    for (let k = 0; k < lines.length; k++) {
        ctx.fillText(lines[k], x, currentY)
        currentY += lineHeight
    }
}

// --- 分享功能 ---

onShareAppMessage(() => {
    console.log("share imagePath:", sharePosterPath.value || posterPath.value)
    return {
        title: `祝你${currentTemplate.value.defaultTitle}！${getRandomBlessing()}`,
        path: '/pages/blessing/index',
        imageUrl: sharePosterPath.value || posterPath.value || '/static/logo.webp'
    }
})

onShareTimeline(() => {
    console.log("share imagePath:", sharePosterPath.value || posterPath.value)
    return {
        title: `祝你${currentTemplate.value.defaultTitle}！${getRandomBlessing()}`,
        imageUrl: sharePosterPath.value || posterPath.value || '/static/logo.webp'
    }
})

const getRandomBlessing = () => {
    const list = currentTemplate.value.couplets
    return list[Math.floor(Math.random() * list.length)]
}

const handleMakePoster = () => {
    // 直接生成海报，不再前置广告
    isPosterMode.value = true
    drawPoster()
}

const savePoster = () => {
    // 广告逻辑后移到保存环节
    if (AdManager.config.ad_enabled) {
        uni.showModal({
            title: '保存高清海报',
            content: '观看完整视频即可免费保存这张精美海报？',
            confirmText: '去观看',
            success: (res) => {
                if (res.confirm) {
                    AdManager.showRewardedVideoAd({
                        onSuccess: () => {
                            performSave()
                        },
                        onFail: (err) => {
                            // 广告加载失败，降级允许保存
                            if (err) uni.showToast({ title: '广告加载失败，已为您自动跳过', icon: 'none' })
                            performSave()
                        }
                    })
                }
            }
        })
    } else {
        performSave()
    }
}

const performSave = async () => {
    if (!posterPath.value) {
        uni.showLoading({ title: '生成海报中...' })
        await drawPoster()
        uni.hideLoading()
    }

    uni.saveImageToPhotosAlbum({
        filePath: posterPath.value,
        success: () => uni.showToast({ title: '保存成功！', icon: 'success' }),
        fail: (err) => {
            if (err.errMsg.indexOf('auth deny') > -1) {
                uni.showModal({
                    title: '授权提示',
                    content: '需要您的相册授权才能保存海报',
                    success: (res) => {
                        if (res.confirm) uni.openSetting()
                    }
                })
            } else {
                uni.showToast({ title: '保存失败', icon: 'none' })
            }
        }
    })
}

onShareAppMessage(() => {
    return {
        title: blessingText.value ? blessingText.value.substring(0, 20) : '2026 马年神仙祝福',
        path: '/pages/blessing/index'
    }
})
const drawSpacedText = (ctx, text, x, y, spacing) => {
    if (!text) return
    const safeSpacing = spacing || 0
    const chars = text.split('')

    // 预先获取所有字符宽度
    const charWidths = chars.map(c => {
        const m = ctx.measureText(c)
        // 微信小程序 measureText 可能不稳定，如果返回 0 则按字体大小保底
        return (m && m.width > 0) ? m.width : (ctx.fontSize || 60)
    })

    // 关键修复：总宽度 = 所有字符宽度 + (n-1)个间距（最后一个字符后不加间距）
    const totalWidth = charWidths.reduce((a, b) => a + b, 0) + (chars.length - 1) * safeSpacing

    let startX = x
    if (ctx.textAlign === 'center') startX = x - totalWidth / 2
    else if (ctx.textAlign === 'right') startX = x - totalWidth

    ctx.save()
    ctx.setTextAlign('left') // 强制左对齐绘制单字
    let currentX = startX
    chars.forEach((char, i) => {
        ctx.fillText(char, currentX, y)
        // 最后一个字符后不添加间距
        currentX += charWidths[i] + (i < chars.length - 1 ? safeSpacing : 0)
    })
    ctx.restore()
}

</script>

<style scoped>
.blessing-container {
    min-height: 100vh;
    background-color: #FFF8F0;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    width: 100vw;
}

.nav-header {
    height: 120rpx;
    background: #D32F2F;
    display: flex;
    align-items: center;
    padding: 20rpx 30rpx 0;
    box-sizing: border-box;
}

.nav-title {
    color: #FFF;
    font-size: 34rpx;
    font-weight: bold;
    flex: 1;
    text-align: center;
}

.back-btn {
    color: #FFF;
    font-size: 44rpx;
    padding: 10rpx;
    width: 60rpx;
}

.main-content {
    flex: 1;
    padding: 30rpx;
    box-sizing: border-box;
    width: 100%;
}

.section {
    margin-bottom: 50rpx;
    width: 100%;
}

.target-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 15rpx;
    width: 100%;
    box-sizing: border-box;
}

.target-card {
    width: calc(33.33% - 10rpx);
    background: #FFF;
    border-radius: 20rpx;
    padding: 24rpx 10rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    border: 4rpx solid #EEE;
    box-sizing: border-box;
}

.target-card.active {
    border-color: #D32F2F;
    background: #FFF8F8;
    box-shadow: 0 4rpx 12rpx rgba(211, 47, 47, 0.1);
}

/* Modal styles */
.modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.result-modal {
    width: 680rpx;
    background: #FFF;
    border-radius: 40rpx;
    overflow: hidden;
}

.modal-header {
    background: #D32F2F;
    padding: 30rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #FFF;
}

.modal-title {
    font-size: 32rpx;
    font-weight: 800;
}

.close-btn {
    padding: 10rpx;
    font-size: 36rpx;
}

.modal-body {
    padding: 30rpx 40rpx 40rpx;
    max-height: 70vh;
    /* 防止文案过长超出屏幕 */
    overflow-y: auto;
}

.tabs {
    display: flex;
    background: #F8F8F8;
    border-radius: 50rpx;
    padding: 6rpx;
    margin-bottom: 40rpx;
}

.tab {
    flex: 1;
    text-align: center;
    height: 64rpx;
    line-height: 64rpx;
    font-size: 26rpx;
    border-radius: 32rpx;
    color: #999;
}

.tab.active {
    background: #FFF;
    color: #D32F2F;
    font-weight: bold;
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.text-card {
    background: #FFF9F0;
    padding: 80rpx 40rpx;
    /* 增加上下 Padding */
    border-radius: 24rpx;
    position: relative;
    margin-bottom: 40rpx;
    border: 2rpx dashed #EDC9AF;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 160rpx;
    /* 最小高度 */
}

.blessing-textarea {
    width: 100%;
    font-size: 34rpx;
    /* 稍微调大一点点 */
    line-height: 1.6;
    color: #4E342E;
    font-weight: 500;
    text-align: center;
    /* 取消 textarea 默认的一些边距 */
    margin: 0;
    padding: 0;
}

.quote-icon {
    position: absolute;
    font-size: 80rpx;
    color: #EDC9AF;
    opacity: 0.3;
    /* 稍微更淡一点 */
    line-height: 1;
}

.quote-icon.start {
    top: 20rpx;
    left: 20rpx;
}

.quote-icon.end {
    bottom: 10rpx;
    right: 20rpx;
}

.tab-btns {
    display: flex;
    gap: 20rpx;
}

.m-btn {
    flex: 1;
    height: 90rpx;
    border-radius: 45rpx;
    font-size: 28rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-copy {
    background: #F5F5F5;
    color: #666;
}

.btn-make-poster {
    background: linear-gradient(135deg, #FFC107 0%, #FF8F00 100%);
    color: #FFF;
}

.btn-save {
    background: #D32F2F;
    color: #FFF;
}

.btn-friend {
    background: #28a745;
    color: #FFF;
}

.back-text-link {
    text-align: center;
    color: #999;
    font-size: 24rpx;
    margin-top: 30rpx;
    text-decoration: underline;
}

.poster-preview-wrapper.horizontal {
    width: 100%;
    aspect-ratio: 16/10;
    /* 略微调整比例，适合展示 */
    background: #F8F8F8;
    border-radius: 20rpx;
    margin-bottom: 40rpx;
    overflow: hidden;
    position: relative;
    border: 2rpx solid #EEE;
    display: flex;
    align-items: center;
    justify-content: center;
}

.poster-image-final {
    width: 100%;
    /* height: 100%; */
}

.poster-drawing-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #999;
}

.loading-text {
    font-size: 24rpx;
    margin-top: 20rpx;
}

/* Theme 1: Neo-Chinese (Oxblood) */
.theme-neo {
    background: linear-gradient(135deg, #330000 0%, #990000 100%);
}

.theme-neo .dynamic-title {
    background: linear-gradient(to right, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fcf6ba 75%, #bf953f 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.theme-neo .poster-side-text {
    color: #FFD700;
}

.theme-neo .poster-body-text {
    color: #FFF0C4;
    /* Soft creamy gold */
    text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
    /* Stronger shadow for contrast */
}

.theme-neo .stamp-box {
    border-color: #d4af37;
    color: #d4af37;
}

/* Theme 2: Classic Red */
.theme-classic {
    background: linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%);
}

.theme-classic .dynamic-title {
    color: #FFD700;
}

.theme-classic .poster-side-text {
    color: rgba(255, 215, 0, 0.7);
}

.theme-classic .stamp-box {
    border-color: #FFD700;
    color: #FFD700;
}

/* Theme 3: Dopamine (Acid) */
.theme-dopamine {
    background: radial-gradient(circle at 20% 20%, #E056FD 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, #FFF200 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, #FF00CC 0%, #FF00CC 100%);
    background-color: #FF00CC;
}

.theme-dopamine .glass-card {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    border: 6rpx solid #FFF;
    /* White border for sticker look */
    transform: rotate(-2deg);
    /* Broken grid style */
    box-shadow: 15rpx 15rpx 0rpx rgba(0, 0, 0, 0.1);
    /* Pop shadow */
    width: 82%;
}

.theme-dopamine .card-border-gold {
    display: none;
}

.theme-dopamine .dynamic-title {
    color: #FFF;
    font-size: 80rpx;
    font-family: 'Arial Black', sans-serif;
    text-shadow: 8rpx 8rpx 0rpx #00008B;
    /* Retro 3D */
    letter-spacing: 0;
}

.theme-dopamine .poster-body-text {
    color: #00008B;
    background: #FFF;
    padding: 24rpx 80rpx;
    border-radius: 8rpx;
    font-weight: 800;
    box-shadow: 6rpx 6rpx 0rpx rgba(0, 0, 0, 0.1);
    width: 78%;
}

.theme-dopamine .poster-side-text {
    color: #00008B;
    font-weight: 900;
    font-size: 22rpx;
    opacity: 1;
}

.theme-dopamine .stamp-box {
    border-color: #00008B;
    color: #00008B;
    background: #FFF200;
}

/* Marquee Animation */
.poster-marquee {
    position: absolute;
    bottom: 0;
    width: 100%;
    background: #00008B;
    color: #FFF200;
    font-size: 20rpx;
    padding: 6rpx 0;
    overflow: hidden;
    white-space: nowrap;
    z-index: 10;
}

.marquee-content {
    display: inline-block;
    padding-left: 100%;
    animation: marquee 15s linear infinite;
    font-weight: bold;
}

@keyframes marquee {
    0% {
        transform: translateX(0);
    }

    100% {
        transform: translateX(-100%);
    }
}

/* Floating Elements */
.floating-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(30px);
    opacity: 0.6;
    z-index: 2;
}

.blob-1 {
    width: 200rpx;
    height: 200rpx;
    background: #FFF200;
    top: 10%;
    left: 10%;
    animation: float 6s ease-in-out infinite;
}

.blob-2 {
    width: 250rpx;
    height: 250rpx;
    background: #E056FD;
    bottom: 20%;
    right: 10%;
    animation: float 8s ease-in-out infinite reverse;
}

.blob-3 {
    width: 150rpx;
    height: 150rpx;
    background: #FFFFFF;
    top: 50%;
    left: 80%;
    animation: float 5s ease-in-out infinite;
}

@keyframes float {

    0%,
    100% {
        transform: translateY(0) scale(1);
    }

    50% {
        transform: translateY(-30rpx) scale(1.1);
    }
}

/* Theme 4: Cinematic (Editorial) */
.theme-cinematic {
    background: #2b0f0f;
}

.theme-cinematic .glass-card {
    background: transparent;
    backdrop-filter: none;
    border: none;
    box-shadow: none;
    width: 90%;
    padding: 60rpx 40rpx;
}

.theme-cinematic .card-border-gold {
    display: none;
}

.theme-cinematic .dynamic-title {
    color: #FFF;
    font-size: 80rpx;
    letter-spacing: 0rpx;
    font-weight: 300;
    margin-bottom: 100rpx;
    opacity: 0.8;
    text-align: center;
}

.theme-cinematic .poster-body-text {
    color: #FFF;
    font-size: 34rpx;
    line-height: 2.2;
    text-align: center;
    font-weight: 300;
    opacity: 0.95;
    letter-spacing: 0.1em;
}

.theme-cinematic .poster-side-text {
    color: rgba(255, 255, 255, 0.3);
    font-size: 16rpx;
    letter-spacing: 4rpx;
}

.theme-cinematic .stamp-box {
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.4);
}

/* Theme 5: Business (黑金商务) */
.theme-business {
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
}

.theme-business .glass-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 2rpx solid rgba(212, 175, 55, 0.3);
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.5);
}

.theme-business .card-border-gold {
    display: block;
}

.theme-business .dynamic-title {
    background: linear-gradient(to right, #d4af37 0%, #ffd700 50%, #d4af37 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-size: 72rpx;
    font-weight: 700;
    letter-spacing: 0.05em;
}

.theme-business .poster-body-text {
    color: rgba(255, 255, 255, 0.95);
    font-size: 32rpx;
    line-height: 1.8;
    font-weight: 400;
}

.theme-business .poster-side-text {
    color: rgba(212, 175, 55, 0.7);
    font-size: 18rpx;
    letter-spacing: 2rpx;
}

.theme-business .stamp-box {
    border-color: #d4af37;
    color: #d4af37;
    background: rgba(212, 175, 55, 0.1);
}

/* Theme 6: Sweet (甜蜜恋人) - 小清新风格 */
.theme-sweet {
    background: linear-gradient(135deg, #ffc4e1 0%, #ffd9ec 50%, #fff0f7 100%);
    position: relative;
    overflow: hidden;
}

/* 小清新装饰元素 */
.theme-sweet::before,
.theme-sweet::after {
    content: '♥';
    position: absolute;
    font-size: 60rpx;
    opacity: 0.15;
    color: #ff69b4;
    animation: float 6s ease-in-out infinite;
}

.theme-sweet::before {
    top: 10%;
    left: 5%;
    animation-delay: 0s;
}

.theme-sweet::after {
    bottom: 15%;
    right: 8%;
    font-size: 50rpx;
    animation-delay: 2s;
}

.theme-sweet .glass-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(8px);
    border: 2rpx solid rgba(255, 20, 147, 0.2);
    box-shadow: 0 4rpx 20rpx rgba(255, 105, 180, 0.15);
}

.theme-sweet .card-border-gold {
    display: none;
}

.theme-sweet .dynamic-title {
    background: linear-gradient(to right, #ff1493 0%, #ff69b4 50%, #ff1493 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-size: 76rpx;
    font-weight: 700;
    letter-spacing: 0.05em;
}

.theme-sweet .poster-body-text {
    color: #d81b60;
    font-size: 34rpx;
    line-height: 1.9;
    font-weight: 500;
}

.theme-sweet .poster-side-text {
    color: rgba(216, 27, 96, 0.7);
    font-size: 18rpx;
    letter-spacing: 2rpx;
}

.theme-sweet .stamp-box {
    border-color: #ff1493;
    color: #ff1493;
    background: rgba(255, 20, 147, 0.1);
}

.cinematic-orb {
    position: absolute;
    width: 300rpx;
    height: 300rpx;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.25;
    z-index: 1;
}

.orb-1 {
    background: #ff6b6b;
    top: 10%;
    left: 10%;
}

.orb-2 {
    background: #4ecdc4;
    bottom: 10%;
    right: 10%;
}

.card-line-top,
.card-line-bottom {
    width: 100%;
    height: 1rpx;
    background: rgba(255, 255, 255, 0.15);
    position: absolute;
    left: 0;
}

.card-line-top {
    top: 30rpx;
}

.card-line-bottom {
    bottom: 30rpx;
}

.neo-poster {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: serif, "Songti SC", "STSong", "SimSun";
}

.poster-placeholder {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #B71C1C;
    font-weight: bold;
}

.sub-text {
    font-size: 22rpx;
    color: #999;
    margin-top: 10rpx;
    font-weight: normal;
}

/* Original common styles */
.section-title {
    margin-bottom: 24rpx;
}

.title-text {
    font-size: 32rpx;
    font-weight: 900;
    color: #333;
}

.title-sub {
    font-size: 24rpx;
    color: #999;
}

.target-icon {
    font-size: 48rpx;
    margin-bottom: 10rpx;
}

.target-name {
    font-size: 24rpx;
    color: #666;
}

.check-mark {
    position: absolute;
    top: -10rpx;
    right: -10rpx;
    background: #D32F2F;
    color: #FFF;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    font-size: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.vibe-selector {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.vibe-tag {
    background: #FFF;
    padding: 24rpx 30rpx;
    border-radius: 20rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 3rpx solid #EEE;
}

.vibe-tag.active {
    border-color: #FF8F00;
    background: #FFFBE6;
}

.vibe-name {
    font-size: 28rpx;
    font-weight: bold;
}

.vibe-desc {
    font-size: 24rpx;
    color: #999;
}

.action-section {
    margin-top: 60rpx;
}

.gen-btn {
    background: linear-gradient(135deg, #FF5252 0%, #D32F2F 100%);
    color: #FFF;
    height: 100rpx;
    border-radius: 50rpx;
    font-weight: 900;
    box-shadow: 0 8rpx 20rpx rgba(211, 47, 47, 0.2);
}

.gen-btn:active {
    transform: scale(0.98);
}

.bottom-spacer {
    height: 60rpx;
}

.offscreen-canvas {
    position: fixed;
    left: 9999px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading-spinner {
    width: 44rpx;
    height: 44rpx;
    border: 4rpx solid #DDD;
    border-top-color: #D32F2F;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16rpx;
}

.anim-pop {
    animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes pop {
    from {
        opacity: 0;
        transform: scale(0.9);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}
</style>
