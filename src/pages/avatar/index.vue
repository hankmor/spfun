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

        <!-- Main Stage -->
        <view class="stage-area">
            <view class="lion-decor anim-bounce">🦁</view>

            <!-- Mirror Frame -->
            <view class="mirror-frame shadow-xl">
                <view class="frame-border">
                    <!-- Canvas (Hidden/Offscreen for logic) -->
                    <canvas canvas-id="avatarCanvas" id="avatarCanvas" class="avatar-canvas"></canvas>

                    <!-- Preview Layer (Visual) -->
                    <view class="preview-layer" @click="chooseImage" v-if="!generated">
                        <!-- 1. Base Avatar (Centered & Circular) -->
                        <view class="avatar-mask">
                            <image class="user-photo" :src="userAvatar || ''" mode="aspectFill"></image>
                        </view>

                        <!-- 2. Atmosphere Filter (Optional) -->
                        <view class="atmosphere-layer"></view>

                        <!-- 3. Frame Layer (Supports overflow) -->
                        <image v-if="selectedLayers.frame" class="layer-image layer-frame"
                            :src="selectedLayers.frame.url" mode="aspectFit"></image>

                        <!-- 4. Sticker Layer -->
                        <image v-if="selectedLayers.sticker" class="layer-image layer-sticker"
                            :class="getActionClass(selectedLayers.sticker)" :src="selectedLayers.sticker.url"
                            mode="aspectFit"></image>

                        <!-- 5. Tag Layer -->
                        <image v-if="selectedLayers.tag" class="layer-image layer-tag"
                            :class="getActionClass(selectedLayers.tag)" :src="selectedLayers.tag.url" mode="aspectFit">
                        </image>

                        <!-- Placeholder -->
                        <view class="photo-placeholder" v-if="!userAvatar">
                            <text class="plus-icon">📷</text>
                            <text class="hint-text">点击上传照片</text>
                        </view>
                    </view>
                </view>
            </view>

            <!-- Floating Reset Button -->
            <view class="floating-reset hover-scale" @click="resetAll">
                <text class="reset-icon">重置</text>
            </view>
        </view>

        <!-- Controls Dock -->
        <view class="dock-panel glass-effect anim-slide-up">
            <!-- Tabs -->
            <view class="tabs">
                <view class="tab-item" :class="{ active: activeTab === 'frame' }" @click="switchTab('frame')">相框</view>
                <view class="tab-item" :class="{ active: activeTab === 'sticker' }" @click="switchTab('sticker')">贴纸
                </view>
                <view class="tab-item" :class="{ active: activeTab === 'tag' }" @click="switchTab('tag')">状态</view>
            </view>

            <!-- Asset Grid -->
            <scroll-view scroll-x class="sticker-scroll" :show-scrollbar="false">
                <view class="sticker-list">
                    <view class="sticker-item" v-for="(item, index) in currentAssets" :key="item._id || index"
                        :class="{ active: isSelected(item), locked: item.isLocked && !isUnlocked(item._id) }"
                        @click="selectAsset(item)">

                        <view class="sticker-icon-3d">
                            <image :src="item.thumbnail" class="asset-thumb" mode="aspectFit"></image>
                            <view v-if="item.isLocked && !isUnlocked(item._id)" class="lock-overlay">🔒</view>
                        </view>
                        <text class="sticker-name">{{ item.name }}</text>
                    </view>

                    <!-- Empty State Hint -->
                    <view v-if="currentAssets.length === 0" class="empty-hint">
                        <text>暂无素材</text>
                    </view>
                </view>
            </scroll-view>

            <!-- Actions Row -->
            <view class="actions-row">
                <button class="magic-btn hover-scale" @click="generateAvatar">
                    <text class="magic-icon">✨</text>
                    <text>生成开运大片</text>
                </button>
            </view>
        </view>
    </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AdManager from '../../utils/adManager'

// Canvas Constant
const CANVAS_SCALE = 2

// State
const userAvatar = ref('')
const generated = ref(false)
const activeTab = ref('frame') // frame, sticker, tag

// Assets Data (Mocked initially, will load from DB)
const assetsMap = reactive({
    frame: [],
    sticker: [],
    tag: []
})

// Selection State
const selectedLayers = reactive({
    frame: null,
    sticker: null,
    tag: null
})

const unlockedAssets = ref(new Set()) // Store IDs

onLoad(async () => {
    await AdManager.init()
    fetchAssets()
    // Load local unlocked history
    const stored = uni.getStorageSync('unlocked_avatar_assets')
    if (stored) {
        unlockedAssets.value = new Set(JSON.parse(stored))
    }
})

// Mock Fetch (To be replaced by Cloud DB)
const fetchAssets = async () => {
    uni.showLoading({ title: '加载素材...' })
    try {
        const db = uni.cloud.database()

        // 小程序端直接查询默认限制 20 条，且无法通过 limit() 突破（最高 20）
        // 我们的素材总数 (41) 已经超过限制，因此采用分分类拉取
        const [resFrame, resSticker, resTag] = await Promise.all([
            db.collection('avatar_assets').where({ category: 'frame' }).orderBy('order', 'asc').get(),
            db.collection('avatar_assets').where({ category: 'sticker' }).orderBy('order', 'asc').get(),
            db.collection('avatar_assets').where({ category: 'tag' }).orderBy('order', 'asc').get()
        ])

        assetsMap.frame = resFrame.data || []
        assetsMap.sticker = resSticker.data || []
        assetsMap.tag = resTag.data || []

        console.log("Loaded Assets:", {
            frames: assetsMap.frame.length,
            stickers: assetsMap.sticker.length,
            tags: assetsMap.tag.length
        })

        // Default selection
        if (assetsMap.frame.length > 0) selectedLayers.frame = assetsMap.frame[0]

    } catch (e) {
        console.error('Fetch assets failed', e)
        uni.showToast({ title: '素材加载失败', icon: 'none' })
    } finally {
        uni.hideLoading()
    }
}

const currentAssets = computed(() => {
    return assetsMap[activeTab.value] || []
})

const switchTab = (tab) => {
    activeTab.value = tab
}

const isSelected = (item) => {
    return selectedLayers[item.category] && selectedLayers[item.category]._id === item._id
}

const isUnlocked = (id) => {
    if (!id) return true
    return unlockedAssets.value.has(id)
}

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

const selectAsset = (item) => {
    // 1. Toggle Logic: If already selected, unselect it
    if (selectedLayers[item.category] && selectedLayers[item.category]._id === item._id) {
        selectedLayers[item.category] = null
        return
    }

    // 2. Check Lock
    if (item.isLocked && !isUnlocked(item._id)) {
        uni.showModal({
            title: '解锁高级素材',
            content: '观看视频即可永久解锁该素材？',
            confirmText: '解锁',
            success: (res) => {
                if (res.confirm) {
                    AdManager.showRewardedVideoAd({
                        onSuccess: () => {
                            unlockAsset(item._id)
                            selectedLayers[item.category] = item
                        },
                        onFail: () => { }
                    })
                }
            }
        })
        return
    }

    selectedLayers[item.category] = item
}

const resetAll = () => {
    uni.showModal({
        title: '确认重置',
        content: '将清空所有选择和已上传的照片',
        success: (res) => {
            if (res.confirm) {
                selectedLayers.frame = null
                selectedLayers.sticker = null
                selectedLayers.tag = null
                userAvatar.value = ''
                generated.value = false
                uni.showToast({ title: '已全部重置', icon: 'none' })
            }
        }
    })
}

const unlockAsset = (id) => {
    unlockedAssets.value.add(id)
    uni.setStorageSync('unlocked_avatar_assets', JSON.stringify([...unlockedAssets.value]))
    uni.showToast({ title: '解锁成功' })
}

const getActionClass = (item) => {
    if (!item || !item.position) return ''
    // Map DB position to CSS class
    // e.g. 'bottom-right' -> 'pos-br'
    const map = {
        'center': 'pos-center',
        'bottom-right': 'pos-br',
        'bottom-left': 'pos-bl',
        'bottom-center': 'pos-bc',
        'top-right': 'pos-tr',
        'top-left': 'pos-tl'
    }
    return map[item.position] || 'pos-center'
}

// --- Canvas Logic ---

// Helper: Download File
const downloadFile = (url) => new Promise((resolve) => {
    if (!url) return resolve(null)
    if (url.startsWith('http') || url.startsWith('cloud:')) {
        uni.downloadFile({
            url,
            success: (res) => {
                if (res.statusCode === 200) resolve(res.tempFilePath)
                else resolve(null)
            },
            fail: () => resolve(null)
        })
    } else {
        resolve(url) // Local path
    }
})

const generateAvatar = async () => {
    const avatarPath = userAvatar.value
    if (!avatarPath) {
        uni.showToast({ title: '请先选择照片' })
        return false
    }

    uni.showLoading({ title: '好运生成中...' })
    generated.value = true

    // 1. Prepare resources
    const [userImg, frameImg, stickerImg, tagImg] = await Promise.all([
        downloadFile(avatarPath),
        downloadFile(selectedLayers.frame?.url),
        downloadFile(selectedLayers.sticker?.url),
        downloadFile(selectedLayers.tag?.url)
    ])

    const ctx = uni.createCanvasContext('avatarCanvas')
    const size = 300 // CSS size
    const W = size * CANVAS_SCALE
    const H = size * CANVAS_SCALE

    // Clear
    ctx.clearRect(0, 0, W, H)

    // 2. Base Avatar (Circular Clip & Scaled to fit hole)
    // Most decorative frames have a hole size around 74-78% of the total width
    const photoScale = 0.74
    const photoSize = W * photoScale
    const offset = (W - photoSize) / 2

    ctx.save()
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, photoSize / 2, 0, 2 * Math.PI)
    ctx.clip()
    // Draw white bg first
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(offset, offset, photoSize, photoSize)
    // Draw user image
    ctx.drawImage(userImg, offset, offset, photoSize, photoSize)

    // 3. Atmosphere Layer (Gradient Mask)
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, 'rgba(255, 154, 158, 0.2)')
    grad.addColorStop(1, 'rgba(254, 207, 239, 0.2)')
    ctx.fillStyle = grad
    ctx.fillRect(offset, offset, photoSize, photoSize)
    ctx.restore() // End clip

    // 4. Frame Layer (Full size overlay)
    if (frameImg) {
        ctx.drawImage(frameImg, 0, 0, W, H)
    }

    // 5. Sticker Layer
    if (stickerImg && selectedLayers.sticker) {
        drawAssetAtPosition(ctx, stickerImg, selectedLayers.sticker.position, W, H)
    }

    // 6. Tag Layer
    if (tagImg && selectedLayers.tag) {
        drawAssetAtPosition(ctx, tagImg, selectedLayers.tag.position, W, H)
    }

    // Draw
    ctx.draw(false, () => {
        setTimeout(() => {
            saveToAlbum()
            uni.hideLoading()
        }, 500)
    })
}

const drawAssetAtPosition = (ctx, img, pos, W, H) => {
    // Define sizes (relative to canvas)
    const iconSize = 100 * CANVAS_SCALE // Sticker default size
    const tagW = 160 * CANVAS_SCALE     // Tag default width
    const tagH = 60 * CANVAS_SCALE

    let x = 0, y = 0, w = 0, h = 0

    // Logic based on position type (sticker vs tag)
    // Simplified logic: stickers are square-ish, tags are rect
    // Better: Rely on aspect fit via drawing, but we need rect coordinates

    // Default Padding
    const p = 10 * CANVAS_SCALE

    switch (pos) {
        case 'bottom-right':
            w = iconSize; h = iconSize;
            x = W - w - p; y = H - h - p;
            break;
        case 'bottom-left':
            w = iconSize; h = iconSize;
            x = p; y = H - h - p;
            break;
        case 'top-right':
            w = iconSize; h = iconSize;
            x = W - w - p; y = p;
            break;
        case 'bottom-center':
            // Usually for tags
            w = tagW; h = tagH;
            x = (W - w) / 2; y = H - h - p * 2;
            break;
        case 'center':
        default:
            w = iconSize; h = iconSize;
            x = (W - w) / 2; y = (H - h) / 2;
    }

    ctx.drawImage(img, x, y, w, h)
}

const saveToAlbum = () => {
    uni.canvasToTempFilePath({
        canvasId: 'avatarCanvas',
        width: 300, height: 300,
        destWidth: 600, destHeight: 600,
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
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
}

/* Reusing Header Styles */
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
}

.subtitle {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 10rpx;
    background: rgba(0, 0, 0, 0.2);
    padding: 4rpx 20rpx;
    border-radius: 20rpx;
    display: inline-block;
}

.lanterns {
    position: absolute;
    top: -20rpx;
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 40rpx;
    pointer-events: none;
    z-index: 2;
}

.lantern {
    font-size: 60rpx;
    animation: swing 3s ease-in-out infinite;
}

.l-right {
    animation-delay: 1s;
}

.lion-decor {
    position: absolute;
    top: 40rpx;
    right: 80rpx;
    font-size: 100rpx;
    z-index: 20;
    transform: rotate(15deg);
    filter: drop-shadow(0 10rpx 20rpx rgba(0, 0, 0, 0.3));
}

/* Stage */
.stage-area {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    padding-bottom: 250rpx;
}

.floating-reset {
    position: absolute;
    position: absolute;
    bottom: 380rpx;
    right: 30rpx;
    width: 80rpx;
    width: 80rpx;
    height: 80rpx;
    background: rgba(255, 236, 179, 0.8);
    border: 4rpx solid #FFD700;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.2);
    z-index: 50;
    backdrop-filter: blur(4px);
}

.mirror-frame {
    width: 600rpx;
    /* Increased to allow overflow check */
    height: 600rpx;
    background: transparent;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
}

.frame-border {
    width: 500rpx;
    height: 500rpx;
    background: transparent;
    position: relative;
}

/* Canvas & Preview */
.avatar-canvas {
    width: 300px;
    height: 300px;
    position: absolute;
    top: 0;
    left: 0;
    transform: scale(0.5);
    transform-origin: top left;
    opacity: 0;
    pointer-events: none;
}

.preview-layer {
    width: 100%;
    height: 100%;
    position: relative;
}

.avatar-mask {
    position: absolute;
    top: 13%;
    /* Center inside wreath */
    left: 13%;
    width: 74%;
    height: 74%;
    border-radius: 50%;
    overflow: hidden;
    background: #FFF;
    z-index: 5;
}

.user-photo {
    width: 100%;
    height: 100%;
}

.atmosphere-layer {
    position: absolute;
    top: 13%;
    left: 13%;
    width: 74%;
    height: 74%;
    border-radius: 50%;
    background: linear-gradient(45deg, rgba(255, 154, 158, 0.2) 0%, rgba(254, 207, 239, 0.2) 99%);
    pointer-events: none;
    z-index: 6;
}

.layer-image {
    position: absolute;
    pointer-events: none;
}

.layer-frame {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
}

.layer-sticker {
    width: 35%;
    height: 35%;
    z-index: 20;
}

.layer-tag {
    width: 60%;
    height: 25%;
    z-index: 15;
}

/* Positions */
.pos-br {
    bottom: 10rpx;
    right: 10rpx;
}

.pos-bl {
    bottom: 10rpx;
    left: 10rpx;
}

.pos-tr {
    top: 10rpx;
    right: 10rpx;
}

.pos-bc {
    bottom: 20rpx;
    left: 20%;
    right: 20%;
    margin: 0 auto;
}

.pos-center {
    top: 25%;
    left: 25%;
    width: 50%;
    height: 50%;
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
    color: #c0c0c0;
    background: rgba(0, 0, 0, 0.05);
    z-index: 999;
}

.plus-icon {
    font-size: 60rpx;
    margin-bottom: 20rpx;
}

/* Controls Dock */
.dock-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #FFF8E1;
    border-radius: 40rpx 40rpx 0 0;
    padding: 40rpx 30rpx calc(40rpx + constant(safe-area-inset-bottom));
    box-shadow: 0 -10rpx 40rpx rgba(0, 0, 0, 0.1);
    z-index: 100;
}

.tabs {
    display: flex;
    justify-content: center;
    margin-bottom: 30rpx;
    gap: 40rpx;
}

.tab-item {
    font-size: 28rpx;
    color: #888;
    font-weight: bold;
    padding-bottom: 10rpx;
    position: relative;
}

.tab-item.active {
    color: #D32F2F;
    transform: scale(1.1);
}

.tab-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20%;
    width: 60%;
    height: 4rpx;
    background: #D32F2F;
    border-radius: 4rpx;
}

.sticker-scroll {
    white-space: nowrap;
    width: 100%;
    margin-bottom: 40rpx;
    height: 140rpx;
}

.sticker-list {
    display: flex;
    gap: 20rpx;
    padding: 0 10rpx;
}

.sticker-item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    opacity: 0.6;
    transition: all 0.2s;
    transform: scale(0.95);
    position: relative;
}

.sticker-item.active {
    opacity: 1;
    transform: scale(1.05);
}

.sticker-icon-3d {
    width: 110rpx;
    height: 110rpx;
    background: #FFF;
    border-radius: 20rpx;
    border: 2rpx solid #EEE;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
}

.sticker-item.active .sticker-icon-3d {
    border-color: #FFD700;
    box-shadow: 0 4rpx 10rpx rgba(255, 215, 0, 0.3);
}

.asset-thumb {
    width: 80%;
    height: 80%;
}

.lock-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    color: #FFF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
    backdrop-filter: blur(2px);
}

.sticker-name {
    font-size: 20rpx;
    color: #666;
    margin-top: 8rpx;
    max-width: 110rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.empty-hint {
    width: 100%;
    text-align: center;
    color: #999;
    font-size: 24rpx;
    padding-top: 40rpx;
}

.actions-row {
    display: flex;
    align-items: center;
    gap: 20rpx;
}

.reset-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 120rpx;
    height: 100rpx;
    background: #FFECB3;
    border-radius: 30rpx;
    border: 2rpx solid #FFD700;
}

.reset-icon {
    font-size: 26rpx;
    color: #666;
}

.reset-text {
    font-size: 20rpx;
    color: #D32F2F;
    font-weight: bold;
    margin-top: 4rpx;
}

.magic-btn {
    flex: 1;
    background: linear-gradient(135deg, #FFD700 0%, #FFA000 100%);
    color: #D32F2F;
    border-radius: 60rpx;
    height: 100rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    font-weight: 900;
    box-shadow: 0 10rpx 20rpx rgba(255, 160, 0, 0.4);
    border: 2rpx solid #FFECB3;
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
</style>
