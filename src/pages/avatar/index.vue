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
                    <!-- 1. Base Avatar -->
                    <view class="avatar-mask">
                        <image class="user-photo" :src="userAvatar || ''" :style="imgStyle" mode="aspectFill"></image>
                    </view>

                    <!-- 2. Atmosphere Filter (Optional) -->
                    <view class="atmosphere-layer"></view>

                    <!-- 3. Frame Layer (Supports overflow) -->
                    <image v-if="selectedLayers.frame" class="layer-image layer-frame" :src="selectedLayers.frame.url"
                        mode="aspectFit"></image>

                    <!-- 4. Sticker Layer -->
                    <image v-if="selectedLayers.sticker" class="layer-image layer-sticker"
                        :class="getActionClass(selectedLayers.sticker)" :src="selectedLayers.sticker.url"
                        mode="aspectFit"></image>

                    <!-- 5. Tag Layer -->
                    <image v-if="selectedLayers.tag" class="layer-image layer-tag"
                        :class="getActionClass(selectedLayers.tag)" :src="selectedLayers.tag.url" mode="aspectFit">
                    </image>

                    <!-- Gesture Handler (Invisible Top Layer) -->
                    <view class="gesture-handler" @touchstart="onTouchStart" @touchmove.stop.prevent="onTouchMove"
                        @touchend="onTouchEnd" v-if="userAvatar"></view>

                    <!-- Placeholder -->
                    <view class="photo-placeholder" v-if="!userAvatar" v-on:click="chooseImage">
                        <text class="plus-icon">📷</text>
                        <text class="hint-text">点击上传照片</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- Floating Actions -->
        <view class="floating-actions" v-if="userAvatar">
            <view class="floating-btn change-btn hover-scale" @click="chooseImage">
                <text class="btn-label">换图</text>
            </view>
            <view class="floating-btn reset-btn hover-scale" @click="resetAll">
                <text class="btn-label">重置</text>
            </view>
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
                    :class="{ active: isSelected(item), locked: AdManager.config.ad_enabled && item.isLocked && !isUnlocked(item._id) }"
                    @click="selectAsset(item)">

                    <view class="sticker-icon-3d">
                        <image :src="item.thumbnail" class="asset-thumb" mode="aspectFit"></image>
                        <view v-if="AdManager.config.ad_enabled && item.isLocked && !isUnlocked(item._id)" class="lock-overlay">🔒</view>
                    </view>
                    <!-- <text class="sticker-name">{{ item.name }}</text> -->
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
                <!-- <text class="magic-icon">✨</text> -->
                <text>生成开运大片</text>
            </button>
        </view>
    </view>

    <!-- Share Result Modal -->
    <view class="modal-mask" v-if="showResultModal" @click="closeResultModal">
        <view class="modal-content result-modal" @click.stop>
            <view class="modal-header">
                <text class="modal-title">🎉 开运大片制作成功</text>
                <view class="close-btn" @click="closeResultModal">✕</view>
            </view>
            <view class="modal-body">
                <view class="result-preview-wrapper shadow-lg">
                    <image :src="generatedImagePath" class="result-image" mode="aspectFit"></image>
                </view>
                <view class="result-tips">已同步预览，可保存到相册或分享给好友</view>
                <view class="modal-btns">
                    <button class="m-btn btn-save" @click="saveGeneratedImage">📥 保存到相册</button>
                    <button class="m-btn btn-share" open-type="share">🧧 分享好运</button>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import AdManager from '../../utils/adManager'

// Canvas Constant
// Canvas Constants & Dynamic Scaling
const sys = uni.getSystemInfoSync()
const windowWidth = sys.windowWidth
// 1 rpx always = 1.5 Canvas units (since 750 / 500 = 1.5)
const RPX_TO_CANVAS = 1.5
// 1 window px = (750 / windowWidth) * 1.5 Canvas units
const PX_TO_CANVAS = (750 / windowWidth) * RPX_TO_CANVAS

// State
const userAvatar = ref('')
const userImgRatio = ref(1) // width / height
const generated = ref(false)
const activeTab = ref('frame') // frame, sticker, tag

// Share Modal State
const showResultModal = ref(false)
const generatedImagePath = ref('')

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

// Gesture State
const imgTransform = reactive({
    x: 0,
    y: 0,
    scale: 1
})
let startTouches = [] // Track touch points

onLoad(async () => {
    // 显式开启分享菜单，确保 open-type="share" 能正确触发
    uni.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
    })

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
            const path = res.tempFilePaths[0]
            userAvatar.value = path
            generated.value = false

            // Get Image Info for UI AspectFill Simulation
            uni.getImageInfo({
                src: path,
                success: (info) => {
                    userImgRatio.value = info.width / info.height
                }
            })

            // Reset transform
            imgTransform.x = 0
            imgTransform.y = 0
            imgTransform.scale = 1
        }
    })
}

// --- Gesture Logic ---
const onTouchStart = (e) => {
    console.log("touch start: ", e.touches.length)
    if (e.touches.length === 1) {
        startTouches = [{ x: e.touches[0].clientX, y: e.touches[0].clientY }]
    } else if (e.touches.length === 2) {
        startTouches = [
            { x: e.touches[0].clientX, y: e.touches[0].clientY },
            { x: e.touches[1].clientX, y: e.touches[1].clientY }
        ]
    }
}

const onTouchMove = (e) => {
    if (e.touches.length === 1 && startTouches.length === 1) {
        // Pan
        const dx = e.touches[0].clientX - startTouches[0].x
        const dy = e.touches[0].clientY - startTouches[0].y
        imgTransform.x += dx
        imgTransform.y += dy
        startTouches[0] = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2 && startTouches.length === 2) {
        // Pinch
        const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }

        const currentDist = getDistance(p1, p2)
        const startDist = getDistance(startTouches[0], startTouches[1])

        if (startDist > 1) {
            const deltaScale = currentDist / startDist
            let newScale = imgTransform.scale * deltaScale

            // Limit scale between 0.5 and 5.0
            if (newScale < 0.5) newScale = 0.5
            if (newScale > 5.0) newScale = 5.0

            imgTransform.scale = newScale

            // Update start points to smooth zoom
            startTouches = [p1, p2]
        }
    }
}

const onTouchEnd = () => {
    startTouches = []
}

const getDistance = (p1, p2) => {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
}

const imgStyle = computed(() => {
    // Simulate aspectFill: one dimension is 100%, the other overflows
    let w = '100%', h = '100%'
    let baseTranslate = { x: 0, y: 0 }

    if (userImgRatio.value > 1) {
        // Wide image: height=100%, width overflows
        w = (userImgRatio.value * 100) + '%'
        h = '100%'
        // Center horizontally
        baseTranslate.x = (1 - userImgRatio.value) * 50 // in %
    } else {
        // Tall image: width=100%, height overflows
        w = '100%'
        h = (100 / userImgRatio.value) + '%'
        // Center vertically
        baseTranslate.y = (1 - (1 / userImgRatio.value)) * 50 // in %
    }

    return {
        width: w,
        height: h,
        // Combined: initial centering + user pan + user scale
        transform: `translate(calc(${baseTranslate.x}% + ${imgTransform.x}px), calc(${baseTranslate.y}% + ${imgTransform.y}px)) scale(${imgTransform.scale})`
    }
})

const selectAsset = (item) => {
    // 1. Toggle Logic: If already selected, unselect it
    if (selectedLayers[item.category] && selectedLayers[item.category]._id === item._id) {
        selectedLayers[item.category] = null
        return
    }

    // 2. Check Lock
    if (AdManager.config.ad_enabled && item.isLocked && !isUnlocked(item._id)) {
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
                // Reset Transform
                imgTransform.x = 0
                imgTransform.y = 0
                imgTransform.scale = 1
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
const downloadFile = (url) => new Promise(async (resolve) => {
    if (!url) return resolve(null)

    let downloadUrl = url

    // Handle Cloud storage path (cloud://...)
    if (url.startsWith('cloud:')) {
        try {
            const res = await uni.cloud.getTempFileURL({
                fileList: [url]
            })
            if (res.fileList && res.fileList[0].tempFileURL) {
                downloadUrl = res.fileList[0].tempFileURL
            } else {
                return resolve(null)
            }
        } catch (e) {
            console.error('Resolve cloud url failed', e)
            return resolve(null)
        }
    }

    if (downloadUrl.startsWith('http')) {
        uni.downloadFile({
            url: downloadUrl,
            success: (res) => {
                if (res.statusCode === 200) resolve(res.tempFilePath)
                else resolve(null)
            },
            fail: (err) => {
                console.error('Download failed', err)
                resolve(null)
            }
        })
    } else {
        resolve(downloadUrl) // Local path (temporary files etc)
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

    // Get asset info for ratio preservation
    const [userInfo, stickerInfo, tagInfo] = await Promise.all([
        userImg ? getImageInfo(userImg) : Promise.resolve(null),
        stickerImg ? getImageInfo(stickerImg) : Promise.resolve(null),
        tagImg ? getImageInfo(tagImg) : Promise.resolve(null)
    ])

    const ctx = uni.createCanvasContext('avatarCanvas')
    // Standardize to 750x750 for logical drawing
    const W = 750
    const H = 750

    // Clear
    ctx.clearRect(0, 0, W, H)

    // 2. Base Avatar (Circular Clip & Scaled to fit hole)
    // Most decorative frames have a hole size around 74-78% of the total width
    const photoScale = 0.74
    const photoSize = W * photoScale
    const offset = (W - photoSize) / 2

    // Draw user image
    // Apply Gesture Transform

    // Original base size calculation (Simulating mode="aspectFill")
    let baseW = photoSize
    let baseH = photoSize
    let baseTranslateX = 0  // in pixels
    let baseTranslateY = 0  // in pixels

    if (userInfo) {
        const ratio = userInfo.width / userInfo.height
        if (ratio > 1) {
            // Wide image: height=100%, width overflows
            baseW = photoSize * ratio
            baseH = photoSize
            // Center horizontally (match UI logic)
            baseTranslateX = (1 - ratio) * photoSize * 0.5
        } else {
            // Tall image: width=100%, height overflows
            baseW = photoSize
            baseH = photoSize / ratio
            // Center vertically (match UI logic)
            baseTranslateY = (1 - (1 / ratio)) * photoSize * 0.5
        }
    }

    // Base position (top-left corner of the image before scaling)
    const baseX = (W - baseW) / 2 + baseTranslateX
    const baseY = (H - baseH) / 2 + baseTranslateY

    // Apply user transform
    // Note: translate is relative to center if scale origin is center
    // Visual transform origin is center (default)

    const drawW = baseW * imgTransform.scale
    const drawH = baseH * imgTransform.scale

    // Center point of base rect: cx = baseX + baseW/2
    const cx = baseX + baseW / 2
    const cy = baseY + baseH / 2

    // Pan is in Window pixels, map to Canvas logical pixels via dynamic scale
    const panX = imgTransform.x * PX_TO_CANVAS
    const panY = imgTransform.y * PX_TO_CANVAS

    // Draw Order:
    // 1. User Photo + Atmosphere (both clipped in circle)
    // 2. Frame (Foreground overlay)
    // 3. Sticker & Tag (Topmost)

    // 1. User Photo with Atmosphere Layer
    ctx.save()
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, photoSize / 2, 0, 2 * Math.PI)
    ctx.clip()

    // Draw user image logic...
    const drawX = (cx + panX) - (drawW / 2)
    const drawY = (cy + panY) - (drawH / 2)
    ctx.drawImage(userImg, drawX, drawY, drawW, drawH)

    // Atmosphere gradient overlay (within circle)
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, 'rgba(255, 154, 158, 0.2)')
    grad.addColorStop(1, 'rgba(254, 207, 239, 0.2)')
    ctx.fillStyle = grad
    ctx.fillRect(offset, offset, photoSize, photoSize)

    ctx.restore() // End clip

    // 3. Frame Layer
    if (frameImg) {
        // Frame is full canvas size, draw at 0,0
        ctx.drawImage(frameImg, 0, 0, W, H)
    }

    // 4. Sticker Layer
    if (stickerImg && selectedLayers.sticker) {
        drawAssetAtPosition(ctx, stickerImg, stickerInfo, selectedLayers.sticker.position, W, H)
    }

    // 5. Tag Layer
    if (tagImg && selectedLayers.tag) {
        drawAssetAtPosition(ctx, tagImg, tagInfo, selectedLayers.tag.position, W, H)
    }

    // Draw
    ctx.draw(false, () => {
        setTimeout(() => {
            prepareResult()
            uni.hideLoading()
        }, 500)
    })
}

const prepareResult = () => {
    // We drew on 750x750 logical space
    const logicalSize = 750
    // Target 1000x1000 for actual saved image
    const destSize = 1000

    uni.canvasToTempFilePath({
        canvasId: 'avatarCanvas',
        width: logicalSize,
        height: logicalSize,
        destWidth: destSize,
        destHeight: destSize,
        success: (res) => {
            generatedImagePath.value = res.tempFilePath
            showResultModal.value = true
        },
        fail: (err) => {
            console.error('Canvas to path failed', err)
            uni.showToast({ title: '生成失败', icon: 'none' })
        }
    })
}

const closeResultModal = () => {
    showResultModal.value = false
}

const saveGeneratedImage = () => {
    if (!generatedImagePath.value) return

    uni.saveImageToPhotosAlbum({
        filePath: generatedImagePath.value,
        success: () => {
            uni.showToast({ title: '已保存到相册' })
        },
        fail: (err) => {
            if (err.errMsg.includes('auth deny')) {
                uni.showModal({
                    title: '提示',
                    content: '需要您的相册权限才能保存，请到设置中开启',
                    showCancel: false
                })
            } else {
                uni.showToast({ title: '保存失败', icon: 'none' })
            }
        }
    })
}

const getImageInfo = (src) => new Promise((resolve) => {
    uni.getImageInfo({
        src,
        success: (res) => resolve(res),
        fail: () => resolve(null)
    })
})

const drawAssetAtPosition = (ctx, img, info, pos, W, H) => {
    // UI container is 500rpx, Canvas is 750px. Conversion: 1rpx = 1.5px
    const rpxToPx = RPX_TO_CANVAS
    const containerSize = 500 * rpxToPx  // 500rpx → 750px

    // Base styles from CSS (128rpx for stickers, 160rpx for tags)
    const stickerW = 128 * rpxToPx
    const tagW = 160 * rpxToPx
    const p10 = 10 * rpxToPx
    const p20 = 20 * rpxToPx

    let x = 0, y = 0, w = 0, h = 0
    let containerW = 0, containerH = 0  // Container size from CSS

    // Define container size based on CSS position classes
    if (pos === 'bottom-center') {
        // CSS: width: 160rpx, height: auto (but constrained by bottom)
        containerW = tagW
        containerH = 80 * rpxToPx  // Reasonable max height
    } else if (pos === 'center') {
        // CSS: width: 50%, height: 50% of 500rpx container
        containerW = containerSize * 0.5  // 250rpx → 375px
        containerH = containerSize * 0.5  // 250rpx → 375px
    } else {
        // CSS: width: 128rpx (corner stickers), roughly square
        containerW = stickerW
        containerH = stickerW
    }

    // Calculate actual size using aspectFit logic (like CSS mode="aspectFit")
    if (info) {
        const imgRatio = info.width / info.height
        const containerRatio = containerW / containerH

        if (imgRatio > containerRatio) {
            // Image is wider: fit to width
            w = containerW
            h = w / imgRatio
        } else {
            // Image is taller: fit to height
            h = containerH
            w = h * imgRatio
        }
    } else {
        // Fallback if no image info
        w = containerW
        h = containerH
    }

    // Calculate position relative to Canvas center (W/2, H/2)
    // All positions are centered within the 750px canvas
    const canvasOffset = (W - containerSize) / 2

    // First, calculate container position (based on CSS positioning)
    let containerX = 0, containerY = 0

    switch (pos) {
        case 'bottom-right':
            containerX = canvasOffset + containerSize - containerW - p10
            containerY = canvasOffset + containerSize - containerH - p10
            break
        case 'bottom-left':
            containerX = canvasOffset + p10
            containerY = canvasOffset + containerSize - containerH - p10
            break
        case 'top-right':
            containerX = canvasOffset + containerSize - containerW - p10
            containerY = canvasOffset + p10
            break
        case 'bottom-center':
            containerX = canvasOffset + (containerSize - containerW) / 2
            containerY = canvasOffset + containerSize - containerH - p20
            break
        case 'center':
        default:
            containerX = canvasOffset + (containerSize - containerW) / 2
            containerY = canvasOffset + (containerSize - containerH) / 2
    }

    // Then, center the image within the container (aspectFit behavior)
    const offsetX = (containerW - w) / 2
    const offsetY = (containerH - h) / 2
    x = containerX + offsetX
    y = containerY + offsetY

    ctx.drawImage(img, x, y, w, h)
}

const avatarShareTitles = [
    '我的2026开运头像，快来领取你的好运！',
    '2026好运连连，从换头像开始！',
    '新年新气象，我的2026专属开运头像！',
    '换上这个头像，2026好运挡不住！',
    '2026开运头像已生成，快来一起沾沾喜气！',
    '定制你的2026开运头像，好运一整年！',
    '2026年，用这个头像开启你的好运之旅！',
    '新年换新颜，2026开运头像等你来领！',
    '我的2026开运头像，你也可以拥有！',
    '2026好运头像，让你的新年充满惊喜！'
]

const getRandomAvatarTitle = () => {
    const randomIndex = Math.floor(Math.random() * avatarShareTitles.length)
    return avatarShareTitles[randomIndex]
}

onShareAppMessage((res) => {
    const title = getRandomAvatarTitle()
    console.log("onShareAppMessage called with title:", title)
    return {
        title: title,
        path: '/pages/avatar/index',
        imageUrl: generatedImagePath.value || ''
    }
})

onShareTimeline(() => {
    return {
        title: '我的 2026 开运头像，快来领取你的好运！',
        imageUrl: generatedImagePath.value || ''
    }
})
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

.floating-actions {
    position: absolute;
    bottom: 420rpx;
    right: 30rpx;
    display: flex;
    flex-direction: column;
    gap: 20rpx;
    z-index: 50;
}

.floating-btn {
    width: 90rpx;
    height: 90rpx;
    background: rgba(255, 236, 179, 0.9);
    border: 4rpx solid #FFD700;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(4px);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.floating-btn:active {
    transform: scale(0.9);
    background: #FFD700;
}

.change-btn {
    /* background: #FFFDE7; */
}

.btn-icon {
    font-size: 28rpx;
    line-height: 1;
}

.btn-label {
    font-size: 26rpx;
    font-weight: bold;
    color: #fd4444;
    line-height: 1;
}

.reset-btn .btn-label {
    color: #fd4444;
}

.mirror-frame {
    width: 680rpx;
    height: 680rpx;
    /* background-image: url('../../static/images/ui_mirror_frame.png'); */
    background-size: 100% 100%;
    background-repeat: no-repeat;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    filter: drop-shadow(0 20rpx 40rpx rgba(0, 0, 0, 0.4));
}

.frame-border {
    width: 500rpx;
    height: 500rpx;
    background: transparent;
    position: relative;
}

/* Canvas & Preview */
.avatar-canvas {
    width: 750px;
    height: 750px;
    position: fixed;
    left: -2000px;
    top: -2000px;
    pointer-events: none;
    opacity: 0;
    z-index: -1;
}

.preview-layer {
    width: 100%;
    height: 100%;
    position: relative;
}

.preview-layer {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.avatar-mask {
    position: absolute;
    /* Removed hardcoded top/left 13% */
    width: 74%;
    height: 74%;
    border-radius: 50%;
    overflow: hidden;
    background: #FFF;
    z-index: 5;
    /* Use margin auto + inset to center accurately in flex parent */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
}

.user-photo {
    /* Dynamics handled by imgStyle */
    display: block;
}

.atmosphere-layer {
    position: absolute;
    /* Removed hardcoded top/left 13% */
    width: 74%;
    height: 74%;
    border-radius: 50%;
    background: linear-gradient(45deg, rgba(255, 154, 158, 0.2) 0%, rgba(254, 207, 239, 0.2) 99%);
    pointer-events: none;
    z-index: 6;
    /* Centering */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
}

.layer-image {
    position: absolute;
    pointer-events: none;
}

.gesture-handler {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 30;
    /* Above stickers, tags and frame */
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
    width: 128rpx;
}

.pos-bl {
    bottom: 10rpx;
    left: 10rpx;
    width: 128rpx;
}

.pos-tr {
    top: 10rpx;
    right: 10rpx;
    /* width: 160rpx; */
}

.pos-bc {
    bottom: 20rpx;
    left: 20%;
    right: 20%;
    margin: 0 auto;
    width: 160rpx;
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
    width: 90%;
    margin: 0 auto 40rpx;
}

.reset-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #FFECB3;
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

/* Modal Mask */
.modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
}

.modal-content {
    width: 620rpx;
    background: #FFF8E1;
    border-radius: 40rpx;
    padding: 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.5);
    border: 4rpx solid #FFD700;
}

.result-modal {
    animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes zoomIn {
    from {
        opacity: 0;
        transform: scale(0.8);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.modal-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
}

.modal-title {
    font-size: 32rpx;
    font-weight: 900;
    color: #D32F2F;
}

.close-btn {
    font-size: 40rpx;
    color: #999;
    padding: 10rpx;
}

.modal-body {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.result-preview-wrapper {
    width: 480rpx;
    height: 480rpx;
    background: #FFF;
    border-radius: 20rpx;
    overflow: hidden;
    margin-bottom: 30rpx;
    border: 8rpx solid #FFF;
}

.result-image {
    width: 100%;
    height: 100%;
}

.result-tips {
    font-size: 24rpx;
    color: #666;
    margin-bottom: 40rpx;
}

.modal-btns {
    width: 100%;
    display: flex;
    flex-direction: row;
    gap: 20rpx;
}

.m-btn {
    flex: 1;
    height: 90rpx;
    border-radius: 45rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: bold;
    transition: all 0.2s;
}

.btn-save {
    background: #D32F2F;
    color: #FFF;
}

.btn-share {
    background: #FFA000;
    color: #FFF;
    box-shadow: 0 6rpx 16rpx rgba(255, 160, 0, 0.3);
}

.m-btn:active {
    transform: scale(0.95);
    opacity: 0.9;
}
</style>
