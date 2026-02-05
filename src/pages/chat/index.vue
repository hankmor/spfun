<template>
  <view class="chat-container">
    <scroll-view class="chat-list" scroll-y :scroll-into-view="scrollTarget" scroll-with-animation>
      <view 
        v-for="(msg, index) in messages" 
        :key="index" 
        :id="'msg-' + index"
        class="message-item"
        :class="msg.role === 'user' ? 'msg-user' : 'msg-ai'"
      >
        <view class="avatar">{{ msg.role === 'user' ? '🧑' : roleIcon }}</view>
        <view class="bubble">
          <text>{{ msg.content }}</text>
          <view v-if="msg.score" class="score-tag">杀伤力: {{ msg.score }}</view>
        </view>
      </view>
      <view v-if="loading" class="loading-status">对方正在输入...</view>
      <view id="bottom-anchor" class="anchor"></view>
    </scroll-view>

    <view class="input-area">
      <input 
        class="input-box" 
        v-model="inputContent" 
        placeholder="这谁顶得住啊..." 
        confirm-type="send"
        @confirm="sendMessage"
        :disabled="loading"
      />
      <button class="send-btn" @click="sendMessage" :disabled="loading || !inputContent">发送</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const roleId = ref('')
const roleIcon = ref('🤖')
const messages = ref([])
const inputContent = ref('')
const loading = ref(false)
const scrollTarget = ref('')

const ROLE_ICONS = {
  'aunt_money': '👱‍♀️',
  'aunt_marriage': '👵',
  'neighbor_showoff': '👨‍🦱',
  'uncle_strict': '👴'
}

onLoad((options) => {
  roleId.value = options.role || 'aunt_money'
  roleIcon.value = ROLE_ICONS[roleId.value] || '🤖'
  
  // Initial Greeting
  messages.value.push({ role: 'ai', content: getGreeting(roleId.value) })
})

const getGreeting = (id) => {
  const map = {
    'aunt_money': '哎哟，这不是小明吗？听说你在大城市工作，工资多少啦？',
    'aunt_marriage': '过年回来了啊，今年带女朋友回来没？',
    'neighbor_showoff': '哟，买车了没啊？我家那小子刚提了辆奥迪。',
    'uncle_strict': '工作怎么样？还没当上经理吗？'
  }
  return map[id] || '你来了。'
}

const sendMessage = async () => {
  if (!inputContent.value.trim() || loading.value) return
  
  const userText = inputContent.value
  messages.value.push({ role: 'user', content: userText })
  inputContent.value = ''
  scrollToBottom()

  loading.value = true
  
  try {
    const res = await uni.cloud.callFunction({
      name: 'chat-agent',
      data: {
        message: userText,
        roleId: roleId.value
      }
    })
    
    if (res.result && res.result.reply) {
      if (res.result.limitHit) {
        // Handle Limit Hit
        if (res.result.action === 'show_ad') {
          showAdModal(res.result.reply)
        } else {
          uni.showModal({
            title: '今日已达上限',
            content: res.result.reply,
            showCancel: false
          })
        }
      } else {
        // Normal Reply
        messages.value.push({ 
            role: 'ai', 
            content: res.result.reply,
            score: res.result.score
        })
      }
    } else {
      messages.value.push({ role: 'ai', content: '（尴尬）...我竟然无言以对' })
    }
  } catch (err) {
    console.error(err)
    messages.value.push({ role: 'ai', content: '网络有点卡，刚说什么来着？' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

// Rewarded Video Ad Logic
let videoAd = null

const showAdModal = (msg) => {
  uni.showModal({
    title: '能量耗尽',
    content: msg,
    confirmText: '看视频解锁',
    success: (res) => {
      if (res.confirm) {
        playRewardAd()
      }
    }
  })
}

const playRewardAd = () => {
  // In development, mock success
  // In production, create RewardedVideoAd
  /*
  if (wx.createRewardedVideoAd) {
      videoAd = wx.createRewardedVideoAd({ adUnitId: 'YOUR_AD_ID' })
      videoAd.show().catch(() => {
          // Fallback
          videoAd.load().then(() => videoAd.show())
      })
      videoAd.onClose(onAdClose)
  }
  */
  
  // Mocking Ad Success for Demo
  uni.showLoading({ title: '加载广告...' })
  setTimeout(() => {
      uni.hideLoading()
      onAdClose({ isEnded: true })
  }, 1000)
}

const onAdClose = async (res) => {
    if (res && res.isEnded) {
        // Ad watched complete -> Unlock
        uni.showLoading({ title: '充能中...' })
        await uni.cloud.callFunction({ name: 'unlock-limit' })
        uni.hideLoading()
        uni.showToast({ title: '充能成功！' })
    } else {
        uni.showToast({ title: '视频未看完', icon: 'none' })
    }
}

const scrollToBottom = () => {
  setTimeout(() => {
    scrollTarget.value = 'bottom-anchor'
    // Hack to trigger reactivity if already at bottom
    setTimeout(() => { scrollTarget.value = '' }, 100)
    setTimeout(() => { scrollTarget.value = 'bottom-anchor' }, 200)
  }, 100)
}

// Share Config
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

onShareAppMessage(() => {
    return {
        title: '2026马年过年必备神器，你的全能社交互联网嘴替！',
        path: '/pages/index/index',
        imageUrl: '/static/share_cover.png' // Maintainer note: Add a cover image
    }
})

onShareTimeline(() => {
    return {
        title: '春节被亲戚怼了？快用这个神器回击！',
        imageUrl: '/static/share_cover.png'
    }
})
</script>

<style>
.chat-container { display: flex; flex-direction: column; height: 100vh; background: #F5F5F5; }
.chat-list { flex: 1; padding: 20rpx; box-sizing: border-box; }
.anchor { height: 20rpx; }

.message-item { display: flex; margin-bottom: 30rpx; }
.msg-user { flex-direction: row-reverse; }
.msg-ai { flex-direction: row; }

.avatar { 
  width: 80rpx; height: 80rpx; background: #ddd; border-radius: 10rpx; 
  display: flex; align-items: center; justify-content: center; font-size: 40rpx;
}
.bubble { 
  max-width: 60%; padding: 20rpx; border-radius: 10rpx; margin: 0 20rpx; position: relative;
  font-size: 30rpx;
}
.msg-user .bubble { background: #95EC69; color: #000; }
.msg-ai .bubble { background: #fff; color: #333; }

.score-tag { 
  position: absolute; bottom: -30rpx; right: 0; 
  font-size: 20rpx; color: #E91E63; font-weight: bold; 
}

.input-area { 
  padding: 20rpx; background: #fff; border-top: 1rpx solid #eee;
  display: flex; align-items: center; padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
}
.input-box { 
  flex: 1; height: 72rpx; background: #f5f5f5; border-radius: 36rpx; padding: 0 30rpx; margin-right: 20rpx;
}
.send-btn { 
  width: 120rpx; height: 72rpx; line-height: 72rpx; font-size: 28rpx; 
  background: #07C160; color: #fff; padding: 0;
}
.loading-status { text-align: center; color: #999; font-size: 24rpx; margin-bottom: 20rpx; }
</style>
