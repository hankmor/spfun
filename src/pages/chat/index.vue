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
                     <button class="action-btn" open-type="share" :data-msg="msg.content">
                        <text class="action-icon">↪️</text> 分享精彩回复
                     </button>
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
                placeholder="请输入..." 
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
    const profile = uni.getStorageSync('user_profile')
    if (profile) {
        userProfile.value = profile
    } else {
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

onShareAppMessage((res) => {
    let shareConfig = {
        title: '春节嘴替大作战',
        path: '/pages/index/index',
        imageUrl: '/static/share_cover.png'
    }

    if (res.from === 'button') {
        const msg = res.target.dataset.msg
        if (msg) {
             shareConfig.title = `${roleName.value}：${msg.substring(0, 20)}...`
             shareConfig.path = `/pages/chat/index?role=${roleId.value}`
        }
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
</style>
