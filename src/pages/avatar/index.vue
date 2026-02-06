<template>
    <view class="container">
        <!-- Header Decor -->
        <view class="lanterns">
            <view class="lantern l-left">🏮</view>
            <view class="lantern l-right">🏮</view>
        </view>

        <!-- Header Text -->
        <view class="header-section">
            <text class="title">开运头像馆</text>
            <text class="subtitle">2026 LUCKY AVATAR</text>
        </view>

        <!-- Main Stage: Mirror Frame -->
        <view class="stage-area">
            <!-- Lion Dance Head Decoration -->
            <view class="lion-decor anim-bounce">🦁</view>

            <!-- The Mirror Frame -->
            <view class="mirror-frame shadow-xl">
                <view class="frame-border">
                    <!-- Canvas for Export (Hidden or overlaid) -->
                    <canvas canvas-id="avatarCanvas" id="avatarCanvas" class="avatar-canvas"></canvas>

                    <!-- Interactive Preview -->
                    <view class="preview-layer" @click="chooseImage" v-if="!generated">
                        <image class="user-photo" :src="userAvatar || '/static/logo.webp'" mode="aspectFill">
                        </image>

                        <view class="photo-placeholder" v-if="!userAvatar">
                            <text class="plus-icon">📷</text>
                            <text class="hint-text">点击上传照片</text>
                        </view>

                        <!-- Selected Frame Overlay -->
                        <view class="frame-overlay" :class="currentFrame.class" v-if="currentFrame">
                            <view class="sticker-badge">
                                <text class="sticker-icon">{{ currentFrame.icon }}</text>
                                <text class="sticker-text">{{ currentFrame.text }}</text>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <!-- Controls Dock -->
        <view class="dock-panel glass-effect anim-slide-up">

            <!-- Frame Selector -->
            <view class="selector-label">选择你的好运贴纸</view>
            <scroll-view scroll-x class="sticker-scroll" :show-scrollbar="false">
                <view class="sticker-list">
                    <view class="sticker-item" v-for="(item, index) in frames" :key="index"
                        :class="{ active: currentFrameIndex === index }" @click="selectFrame(index)">
                        <view class="sticker-icon-3d">{{ item.icon }}</view>
                        <text class="sticker-name">{{ item.name }}</text>
                        <view class="active-dot" v-if="currentFrameIndex === index"></view>
                    </view>
                </view>
            </scroll-view>

            <!-- Generate Button -->
            <button class="magic-btn hover-scale" @click="generateAvatar">
                <text class="magic-icon">🪄</text>
                <text>一键生成</text>
            </button>
        </view>
    </view>
</template>

<script setup>
import { ref, reactive } from 'vue'

const userAvatar = ref('')
const generated = ref(false)
const currentFrameIndex = ref(0)

const frames = [
    { name: '暴富', text: '暴富', class: 'theme-gold', icon: '💰', color: '#FFD700' },
    { name: '桃花', text: '脱单', class: 'theme-pink', icon: '🌸', color: '#FF69B4' },
    { name: '上岸', text: '上岸', class: 'theme-green', icon: '🎋', color: '#4CAF50' },
    { name: '锦鲤', text: '好运', class: 'theme-red', icon: '🐠', color: '#F44336' },
    { name: '平安', text: '平安', class: 'theme-blue', icon: '🍎', color: '#2196F3' }
]
const currentFrame = ref(frames[0])

const chooseImage = () => {
    uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
            userAvatar.value = res.tempFilePaths[0]
            generated.value = false
        }
    })
}

const selectFrame = (index) => {
    currentFrameIndex.value = index
    currentFrame.value = frames[index]
    generated.value = false
}

const generateAvatar = async () => {
    // Allow generation with default avatar if user hasn't uploaded one
    const avatarToUse = userAvatar.value || '/static/logo.webp'

    uni.showLoading({ title: '施法中...' })
    generated.value = true

    const context = uni.createCanvasContext('avatarCanvas')
    const size = 300

    // 1. Bg
    context.setFillStyle('#FFFFFF')
    context.fillRect(0, 0, size, size)

    // 2. Avatar
    context.drawImage(avatarToUse, 0, 0, size, size)

    // 3. Border (Frame)
    const frame = currentFrame.value
    context.setStrokeStyle(frame.color)
    context.setLineWidth(12)
    context.strokeRect(6, 6, size - 12, size - 12)

    // 4. Sticker Badge (Bottom Right)
    // Draw circle bg
    context.beginPath()
    context.arc(size - 45, size - 45, 36, 0, 2 * Math.PI)
    context.setFillStyle(frame.color)
    context.fill()
    context.setStrokeStyle('#FFF')
    context.setLineWidth(3)
    context.stroke()

    // Text
    context.setFontSize(24)
    context.setFillStyle('#FFF')
    context.setTextAlign('center')
    context.setTextBaseline('middle')
    context.fillText(frame.text, size - 45, size - 45 + 12) // Slightly down

    // Icon (Emoji) - Note: Canvas text baseline for emoji can be tricky
    context.setFontSize(30)
    context.fillText(frame.icon, size - 45, size - 45 - 15)

    context.draw(false, () => {
        setTimeout(() => {
            saveToAlbum()
            uni.hideLoading()
        }, 500)
    })
}

const saveToAlbum = () => {
    uni.canvasToTempFilePath({
        canvasId: 'avatarCanvas',
        width: 300, height: 300,
        destWidth: 900, destHeight: 900,
        success: (res) => {
            uni.saveImageToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => uni.showToast({ title: '已保存到相册' }),
                fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
            })
        }
    })
}
</script>

<style scoped>
.container {
    min-height: 100vh;
    background: linear-gradient(180deg, #D32F2F 0%, #FF8F00 100%);
        /* Red to Orange */
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
}

/* Header */
.header-section {
    text-align: center;
    padding-top: 60rpx;
    z-index: 5;
}

.title {
    font-size: 48rpx;
    font-weight: 900;
    color: #FFF;
    text-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.2);
    letter-spacing: 4rpx;
    display: block;
}

.subtitle {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 6rpx;
    background: rgba(0, 0, 0, 0.2);
    padding: 4rpx 20rpx;
    border-radius: 20rpx;
    display: inline-block;
    margin-top: 10rpx;
}

.lanterns {
    position: absolute;
    top: -20rpx;
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 40rpx;
    box-sizing: border-box;
    pointer-events: none;
    z-index: 2;
}
.lantern {
    font-size: 60rpx;
    animation: swing 3s ease-in-out infinite;
}

.l-left {
    animation-delay: 0s;
    transform-origin: top center;
}

.l-right {
    animation-delay: 1s;
    transform-origin: top center;
}

/* Main Stage */
.stage-area {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    padding-bottom: 200rpx;
        /* Space for dock */
}

/* Lion Decor */
.lion-decor {
    position: absolute;
    top: 40rpx;
        /* Adjust based on frame position */
    right: 80rpx;
    font-size: 100rpx;
    z-index: 20;
    transform: rotate(15deg);
    filter: drop-shadow(0 10rpx 20rpx rgba(0, 0, 0, 0.3));
}

/* Mirror Frame */
.mirror-frame {
    width: 500rpx;
    height: 500rpx;
    background: linear-gradient(135deg, #B71C1C 0%, #D32F2F 50%, #FF5252 100%);
    border-radius: 40rpx;
    padding: 20rpx;
    box-shadow: 0 20rpx 50rpx rgba(0, 0, 0, 0.4), inset 0 0 0 2rpx rgba(255, 255, 255, 0.2);
    position: relative;
    border: 4rpx solid #FFD700;
        /* Gold Border */
}

.frame-border {
    width: 97%;
    height: 97%;
    background: #000;
    border-radius: 30rpx;
    overflow: hidden;
    position: relative;
    background: #FFF;
    border: 8rpx solid #FFD700;
        /* Gold Inner Border */
}

/* Canvas & Preview */
.avatar-canvas {
    width: 300px;
    height: 300px;
    position: absolute;
    top: 0;
        left: 0;
        transform: scale(0.5);
        /* Hide or scale down visually */
    transform-origin: top left;
    opacity: 0;
        /* Hide from view, logic uses it */
    pointer-events: none;
}

/* If generated, maybe show canvas image on top? Simplified: Just keep preview visible always until saved */

.preview-layer {
    width: 100%;
        height: 100%;
    position: relative;
    background: #F0F0F0;
}
.user-photo {
    width: 100%;
    height: 100%;
}

.photo-placeholder {
    position: absolute;
    top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.05);
    color: #999;
}
.plus-icon {
    font-size: 60rpx;
    margin-bottom: 20rpx;
}

/* Frame Overlay (CSS Preview) */
.frame-overlay {
    position: absolute;
    top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 10rpx solid currentColor;
        /* Dynamic color */
    box-sizing: border-box;
    border-radius: 20rpx;
    pointer-events: none;
}

.sticker-badge {
    position: absolute;
    bottom: 20rpx;
    right: 20rpx;
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background: currentColor;
    border: 4rpx solid #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.2);
}
.sticker-icon {
    font-size: 40rpx;
    line-height: 1;
}

.sticker-text {
    color: #fff;
    font-size: 20rpx;
    font-weight: bold;
}

/* Theme Colors */
.theme-gold {
    color: #FFD700;
}

.theme-pink {
    color: #FF69B4;
}

.theme-green {
    color: #4CAF50;
}

.theme-red {
    color: #F44336;
}

.theme-blue {
    color: #2196F3;
}

/* Controls Dock */
.dock-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #FFF8E1;
        /* Creamy Beige */
    border-radius: 40rpx 40rpx 0 0;
    padding: 40rpx 30rpx calc(40rpx + constant(safe-area-inset-bottom));
    box-sizing: border-box;
    box-shadow: 0 -10rpx 40rpx rgba(0, 0, 0, 0.1);
    z-index: 100;
}

.selector-label {
    text-align: center;
    font-size: 24rpx;
    color: #B71C1C;
    margin-bottom: 20rpx;
    font-weight: bold;
}

.sticker-scroll {
    white-space: nowrap;
    width: 100%;
    margin-bottom: 40rpx;
}

.sticker-list {
    display: flex;
    gap: 30rpx;
    padding: 10rpx 20rpx;
}

.sticker-item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    opacity: 0.6;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    transform: scale(0.9);
}

.sticker-item.active {
    opacity: 1;
    transform: scale(1.1);
}

.sticker-icon-3d {
    width: 100rpx;
    height: 100rpx;
    background: #FFF;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 50rpx;
    box-shadow: 0 8rpx 0 rgba(0, 0, 0, 0.1);
        /* 3D effect */
    border: 4rpx solid #B71C1C;
    margin-bottom: 10rpx;
}

.sticker-item.active .sticker-icon-3d {
    background: #FFF9C4;
    border-color: #FFD54F;
    box-shadow: 0 8rpx 0 #FFD54F;
    transform: translateY(-4rpx);
}

.sticker-name {
    font-size: 22rpx;
    color: #333;
    font-weight: bold;
}

.magic-btn {
    background: linear-gradient(135deg, #FFD700 0%, #FFA000 100%);
        color: #D32F2F;
    border-radius: 60rpx;
    height: 100rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    font-weight: 900;
    box-shadow: 0 10rpx 20rpx rgba(255, 160, 0, 0.4), inset 0 2rpx 4rpx rgba(255, 255, 255, 0.5);
    border: 2rpx solid #FFECB3;
    margin-bottom: 40rpx;
        /* background: linear-gradient(135deg, #FF5252 0%, #D32F2F 100%);
                    box-shadow: 0 8rpx 16rpx rgba(0,0,0,0.15), inset 0 2rpx 4rpx rgba(255,255,255,0.3);
                    border: 2rpx solid #FFCDD2; */
}
.magic-icon {
    font-size: 40rpx;
    margin-right: 16rpx;
}

@keyframes swing {
0%,
    100% {
        transform: rotate(-5deg);
    }
50% {
    transform: rotate(5deg);
}
}
@keyframes bounce {
0%,
    100% {
        transform: translateY(0) rotate(15deg);
    }

    50% {
        transform: translateY(-10rpx) rotate(15deg);
    }
}
</style>
