<template>
  <view class="chat-container">
    <!-- Chat List -->
    <scroll-view 
        class="chat-content" 
        scroll-y 
        :scroll-into-view="scrollTarget" 
        :scroll-with-animation="true"
        @scrolltolower="onScrollToBottom"
    >
      <view class="padding-top"></view>
      
      <!-- Time/System Message Placeholder (Optional) -->
      <view class="system-msg">
        <text class="time-tag">{{ formatTime() }}</text>
      </view>

      <view 
        v-for="(msg, index) in messages" 
        :key="index" 
        :id="'msg-' + index"
        class="msg-row"
        :class="msg.role === 'user' ? 'msg-row-user' : 'msg-row-ai'"
      >
        <!-- Avatar -->
        <image 
            class="avatar" 
            :src="msg.role === 'user' ? (userProfile?.avatarUrl || '/static/default_avatar.png') : roleAvatar" 
            mode="aspectFill"
        ></image>

        <view class="msg-body">
            <!-- Bubble -->
            <view class="bubble-wrapper">
                <view 
                    class="bubble" 
                    :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'"
                    @longpress="onCopy(msg.content)"
                >
                    <text class="msg-text">{{ msg.content }}</text>
                    <!-- Arrow -->
                    <view class="arrow" :class="msg.role === 'user' ? 'arrow-user' : 'arrow-ai'"></view>
                </view>

                <!-- Tools (Share/Score) for AI only -->
                <view v-if="msg.role === 'ai'" class="bubble-footer">
                     <view v-if="msg.score" class="score-badge">🔥 杀伤力 {{ msg.score }}</view>
                     <view class="action-btn" @click="openShare(msg.content)">
                        <text class="action-icon">↪️</text> 分享精彩回复
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

    <!-- Share Modal -->
    <view class="modal-mask" v-if="showModal" @click="closeModal">
        <view class="modal-content" @click.stop>
            <view class="modal-title">✨ 嘴替神回复 ✨</view>
            
            <view class="canvas-wrapper shadow-lg">
                <image v-if="shareImagePath" :src="shareImagePath" class="share-preview" mode="aspectFit"></image>
                <view v-else class="generating">
                    <view class="loading-spinner"></view>
                    <text>正在生成卡片...</text>
                </view>
            </view>

            <view class="modal-btns">
                <button class="m-btn btn-save" @click="saveShareImage">📥 保存图片</button>
                <button class="m-btn btn-friend" open-type="share">💬 发给朋友</button>
            </view>
        </view>
    </view>

    <!-- Hidden Canvas -->
    <canvas canvas-id="shareCanvas" id="shareCanvas" class="offscreen-canvas"></canvas>

    <!-- Bottom Input Area (Simplified) -->
    <view class="input-panel safe-area-bottom">
        <view class="panel-top-border"></view>
        <view class="toolbar">
            <input 
                class="chat-input" 
                v-model="inputContent" 
                :confirm-hold="true" 
                confirm-type="send"
                cursor-spacing="20"
                @confirm="sendMessage"
placeholder="这谁受的了..."
            />
            
            <view 
                class="send-btn" 
                :class="{ 'btn-disabled': !inputContent.trim() }"
                @click="sendMessage"
            >发送</view>
        </view>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

const roleId = ref('')
const roleAvatar = ref('')
const roleName = ref('AI亲戚') 
const messages = ref([])
const inputContent = ref('')
const loading = ref(false)
const scrollTarget = ref('')
const userProfile = ref(null)

// Share State
const showModal = ref(false)
const shareImagePath = ref('')
const currentShareText = ref('')

const ROLE_INFO = {
  'aunt_money': { avatar: '/static/roles/aunt_money.jpeg', name: '势利二姨' },
  'aunt_marriage': { avatar: '/static/roles/aunt_marriage.jpeg', name: '催婚大姑' },
  'neighbor_showoff': { avatar: '/static/roles/neighbor_showoff.jpeg', name: '凡尔赛王姨' },
  'uncle_strict': { avatar: '/static/roles/uncle_strict.jpeg', name: '严肃二舅' }
}

onLoad((options) => {
  roleId.value = options.role || 'aunt_money'
  const info = ROLE_INFO[roleId.value] || { avatar: '/static/roles/aunt_money.jpeg', name: '神秘亲戚' }
  roleAvatar.value = info.avatar
  roleName.value = info.name
  
  uni.setNavigationBarTitle({ title: info.name }) 
  uni.setNavigationBarColor({
      frontColor: '#FFFFFF',
      backgroundColor: '#D32F2F' // Red Header
  })

  checkUserProfile()
  
  if (messages.value.length === 0) {
      messages.value.push({ role: 'ai', content: getGreeting(roleId.value) })
  }
})

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
    return '哎哟，你回来啦。' 
}

const sendMessage = async () => {
    if (!inputContent.value.trim() || loading.value) return
    const text = inputContent.value
    messages.value.push({ role: 'user', content: text })
    inputContent.value = '' 
    scrollToBottom()
    loading.value = true
    
    try {
        const history = messages.value.slice(-6).map(m => ({ role: m.role==='ai'?'assistant':'user', content: m.content }))
        const res = await uni.cloud.callFunction({
            name: 'chat-agent',
            data: { message: text, roleId: roleId.value, userProfile: userProfile.value, history }
        })
        
        if (res.result && res.result.reply) {
            messages.value.push({ role: 'ai', content: res.result.reply, score: res.result.score })
        }
    } catch(e) {
        messages.value.push({ role: 'ai', content: '（信号不好...）' })
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

const onScrollToBottom = (e) => {}

const onCopy = (content) => {
    uni.setClipboardData({ data: content })
}

// --- Share Logic ---
const openShare = (text) => {
    currentShareText.value = text
    showModal.value = true
    shareImagePath.value = ''
    setTimeout(() => { drawShareCard(text) }, 200)
}

const closeModal = () => {
    showModal.value = false
}

const drawShareCard = (text) => {
    const ctx = uni.createCanvasContext('shareCanvas')
    const w = 300
    const h = 400
    
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#D32F2F')
    grad.addColorStop(1, '#B71C1C')
    ctx.setFillStyle(grad)
    ctx.fillRect(0, 0, w, h)
    
    // Decoration Pattern (Circles)
    ctx.setGlobalAlpha(0.1)
    ctx.setFillStyle('#FFF')
    ctx.beginPath()
    ctx.arc(0, 0, 80, 0, 2*Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(w, h, 100, 0, 2*Math.PI)
    ctx.fill()
    ctx.setGlobalAlpha(1.0)
    
    // Title
    ctx.setFontSize(18)
    ctx.setFillStyle('#FFCDD2')
    ctx.setTextAlign('center')
    ctx.fillText('春节嘴替大作战', w/2, 40)
    
    // Role Name
    ctx.setFontSize(22)
    ctx.setFillStyle('#FFF')
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText(roleName.value + ' 说:', w/2, 80)
    
    // Quote Box
    ctx.setFillStyle('#FFFFFF')
    ctx.setShadow(0, 4, 10, 'rgba(0,0,0,0.2)')
    const boxY = 110
    const boxH = 200
    // Rounded Rect
    ctx.beginPath()
    ctx.rect(30, boxY, w-60, boxH) // Simplified rect for now
    ctx.fill()
    ctx.setShadow(0, 0, 0, 'transparent')
    
    // Quote Text (Multiline)
    ctx.setFontSize(18)
    ctx.setFillStyle('#333')
    ctx.setTextAlign('left')
    const maxWidth = w - 100
    const lineHeight = 28
    let lines = []
    let line = ''
    
    // Simple word wrap
    for (let i = 0; i < text.length; i++) {
        if (ctx.measureText(line + text[i]).width > maxWidth) {
            lines.push(line)
            line = ''
        }
        line += text[i]
    }
    lines.push(line)
    
    // Center text vertically in box
    let textY = boxY + (boxH - (lines.length * lineHeight)) / 2 + 20
    
    // Draw Quote Icon
    ctx.setFontSize(40)
    ctx.setFillStyle('#FFEBEE')
    ctx.fillText('“', 50, boxY + 50)
    
    ctx.setFontSize(18)
    ctx.setFillStyle('#333')
    lines.forEach((l, i) => {
        ctx.fillText(l, 50, textY + i * lineHeight)
    })
    
    // Footer
    ctx.setFontSize(14)
    ctx.setFillStyle('#FFCDD2')
    ctx.setTextAlign('center')
    ctx.fillText('快来一起对线！', w/2, h - 30)
    
    ctx.draw(false, () => {
        uni.canvasToTempFilePath({
            canvasId: 'shareCanvas',
            width: w, height: h,
            destWidth: w*2, destHeight: h*2,
            success: (res) => {
                shareImagePath.value = res.tempFilePath
            }
        })
    })
}

const saveShareImage = () => {
    if (!shareImagePath.value) return
    uni.saveImageToPhotosAlbum({
        filePath: shareImagePath.value,
        success: () => uni.showToast({ title: '保存成功' }),
        fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
    })
}

onShareAppMessage((res) => {
    let shareConfig = {
        title: '春节嘴替大作战：' + (currentShareText.value ? currentShareText.value.substring(0, 15) + '...' : '来战！'),
        path: `/pages/chat/index?role=${roleId.value}`
    }

    // Use the generated image if available, else default behavior
    if (shareImagePath.value) {
        shareConfig.imageUrl = shareImagePath.value
    }

    return shareConfig
})
</script>

<style scoped>
/* Container & Layout */
.chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #FFF8E1; /* Pale Peach/Cream */
}

.chat-content {
    flex: 1;
    overflow-y: scroll;
    padding-bottom: 20rpx;
}

.padding-top { height: 20rpx; }

/* System Time */
.system-msg {
    text-align: center;
    margin-bottom: 30rpx;
}
.time-tag {
    background: rgba(0,0,0,0.1);
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

.msg-row-user .msg-body { align-items: flex-end; }
.msg-row-ai .msg-body { align-items: flex-start; }

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
    box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.05);
}

/* User Bubble: Soft Pink/Red */
.bubble-user {
    background-color: #FFCDD2; /* Light Red/Pink */
    color: #B71C1C;
}

/* AI Bubble: White */
.bubble-ai {
    background-color: #FFFFFF;
    color: #333;
    border: 1rpx solid #FFF59D; /* Subtle Gold Border */
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
    border-color: transparent #FFFFFF transparent transparent; /* Arrow border logic is tricky, simplified */
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
    color: #FF6F00; /* Amber Text */
    display: flex;
    align-items: center;
}
.action-btn::after { border: none; }
.action-icon { margin-right: 4rpx; font-size: 24rpx; }

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

.panel-top-border { display: none; }

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
    background: #D32F2F; /* Red Button */
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
@keyframes spin { 100% { transform: rotate(360deg); } }

.anchor { height: 1rpx; width: 100%; }

/* Share Modal */
.modal-mask {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.6);
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
    box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.3);
}

.modal-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #D32F2F;
    margin-bottom: 30rpx;
}

.canvas-wrapper {
    width: 300px;
    height: 400px;
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

/* Hidden Canvas */
.offscreen-canvas {
    position: fixed;
    left: 9000px;
    width: 300px;
    height: 400px;
}
</style>
