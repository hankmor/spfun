<template>
  <view class="container">
    <!-- Background Pattern -->
    <view class="bg-pattern"></view>
    <view class="bg-clouds"></view>

    <!-- Header -->
    <view class="header">
      <text class="title">春节大作战</text>
      <text class="subtitle">2026 马年限定版</text>
    </view>

    <!-- Roles Grid (Center) -->
    <view class="main-content">
      <view class="role-grid">
        <view 
          v-for="(role, index) in roles" 
          :key="index"
          class="role-card"
          :class="role.theme"
          @click="navTo(role.path)"
        >
          <!-- Floating Speech Bubble -->
          <view class="speech-bubble">
            <text class="bubble-text">{{ role.desc }}</text>
            <view class="bubble-tail"></view>
          </view>
          
          <!-- Character Image (Popping out) -->
          <view class="image-wrapper">
             <image class="role-img" :src="role.img" mode="aspectFill" @error="onImgError($event, index)"></image>
             <view class="role-emoji-fallback" v-if="imgErrors[index]">{{ role.fallback }}</view>
          </view>
          
          <!-- Name Tag -->
          <view class="name-tag">
            <text class="name-text">{{ role.name }}</text>
            <view class="action-icon">➜</view>
          </view>
        </view>
      </view>
    </view>

    <!-- Bottom Dock -->
    <view class="bottom-dock-container">
        <view class="bottom-dock glass-panel">
            <view class="dock-btn btn-deposit" @click="navTo('/pages/bank/index')">
                <view class="icon-3d">💰</view>
                <text class="btn-text">妈妈存单</text>
            </view>
            <view class="dock-btn btn-avatar" @click="navTo('/pages/avatar/index')">
                <view class="icon-3d">🦁</view>
                <text class="btn-text">开运头像</text>
            </view>
        </view>
    </view>

  </view>
</template>

<script setup>
import { ref } from 'vue'

const navTo = (url) => {
  uni.navigateTo({ url })
}

const imgErrors = ref([false, false, false, false])
const onImgError = (e, index) => {
    imgErrors.value[index] = true
}

const roles = [
    { name: '势利二姨', desc: '工资才三千？', img: '/static/roles/aunt_money.jpeg', fallback: '🀄️', path: '/pages/chat/index?role=aunt_money', theme: 'theme-pink' },
    { name: '催婚大姑', desc: '不结婚不孝！', img: '/static/roles/aunt_marriage.jpeg', fallback: '🤱', path: '/pages/chat/index?role=aunt_marriage', theme: 'theme-purple' },
    { name: '凡尔赛王姨', desc: 'Lucy去巴黎了', img: '/static/roles/neighbor_showoff.jpeg', fallback: '👜', path: '/pages/chat/index?role=neighbor_showoff', theme: 'theme-yellow' },
    { name: '严肃二舅', desc: '要有规划', img: '/static/roles/uncle_strict.jpeg', fallback: '♟️', path: '/pages/chat/index?role=uncle_strict', theme: 'theme-blue' }
]
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FFFBF0; /* Creamy color */
  position: relative;
  overflow-x: hidden;
  padding-bottom: 220rpx; /* Space for dock */
  box-sizing: border-box;
}

/* Background Pattern */
.bg-pattern {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
        radial-gradient(#FFE0B2 10%, transparent 10%),
        radial-gradient(#FFCCBC 10%, transparent 10%);
    background-position: 0 0, 60rpx 60rpx;
    background-size: 120rpx 120rpx;
    opacity: 0.2;
    z-index: 0;
    pointer-events: none;
}

.bg-clouds {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: radial-gradient(circle at 50% 50%, #fff 20%, transparent 60%);
    background-size: 300rpx 300rpx;
    opacity: 0.4;
    z-index: 0;
    pointer-events: none;
    mix-blend-mode: overlay;
}

.header {
    position: relative;
    z-index: 2;
    padding: 80rpx 40rpx 40rpx;
    text-align: center;
}

.title {
    font-size: 64rpx;
    font-weight: 900;
    color: #FF4757;
    letter-spacing: 4rpx;
    text-shadow: 4rpx 4rpx 0rpx rgba(255, 200, 200, 0.4);
    display: block;
}

.subtitle {
    font-size: 30rpx;
    color: #FFA502;
    font-weight: 700;
    margin-top: 16rpx;
    background: rgba(255, 255, 255, 0.8);
    padding: 8rpx 30rpx;
    border-radius: 30rpx;
    display: inline-block;
    box-shadow: 0 4rpx 10rpx rgba(255, 165, 2, 0.15);
}

/* Main Content Grid */
.main-content {
    position: relative;
    z-index: 2;
    padding: 20rpx 30rpx;
}

.role-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
}

.role-card {
    width: 48%;
    height: 380rpx;
    background: #FFFFFF;
    border-radius: 40rpx;
    position: relative;
    box-shadow: 0 20rpx 40rpx rgba(200, 100, 100, 0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 50rpx;
    margin-top: 30rpx; /* Space for speech bubble overlap */
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow: visible; /* Allow pop out */
}

.role-card:active {
    transform: scale(0.96);
    box-shadow: 0 10rpx 20rpx rgba(200, 100, 100, 0.1);
}

/* Speech Bubble */
.speech-bubble {
    position: absolute;
    top: -50rpx;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    padding: 14rpx 24rpx;
    border-radius: 24rpx;
    box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.06);
    z-index: 10;
    white-space: nowrap;
    border: 3rpx solid #FFF0F0;
    animation: float 3s ease-in-out infinite;
    max-width: 140%;
}

.bubble-text {
    font-size: 24rpx;
    color: #555;
    font-weight: 800;
}

.bubble-tail {
    position: absolute;
    bottom: -12rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12rpx solid transparent;
    border-right: 12rpx solid transparent;
    border-top: 12rpx solid #fff;
}

/* Image Wrapper for Pop-out Effect */
.image-wrapper {
    position: absolute;
    bottom: 90rpx; /* sits above name tag */
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: 5;
}

.role-img {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    border: 6rpx solid #fff;
    box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.12);
    background: #f0f0f0;
}

.role-emoji-fallback {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 80rpx;
    border: 6rpx solid #f0f0f0;
}

/* Name Tag */
.name-tag {
    height: 100rpx;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30rpx;
    box-sizing: border-box;
    background: linear-gradient(to bottom, #ffffff, #fafafa);
    border-radius: 0 0 40rpx 40rpx;
    z-index: 4;
}

.name-text {
    font-size: 32rpx;
    font-weight: 900;
    color: #333;
}

.action-icon {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    background: #333;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20rpx;
    font-weight: bold;
}

/* Themes */
.theme-pink .action-icon { background: #FF9A9E; box-shadow: 0 4rpx 10rpx rgba(255, 154, 158, 0.4); }
.theme-purple .action-icon { background: #BE93E4; box-shadow: 0 4rpx 10rpx rgba(190, 147, 228, 0.4); }
.theme-yellow .action-icon { background: #F6D365; box-shadow: 0 4rpx 10rpx rgba(246, 211, 101, 0.4); }
.theme-blue .action-icon { background: #4FACFE; box-shadow: 0 4rpx 10rpx rgba(79, 172, 254, 0.4); }

/* Bottom Dock */
.bottom-dock-container {
    position: fixed;
    bottom: 50rpx;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: 100;
    pointer-events: none; /* Let clicks pass through container area */
}

.bottom-dock {
    pointer-events: auto;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 12rpx;
    border-radius: 80rpx;
    box-shadow: 0 20rpx 50rpx rgba(0,0,0,0.1), 0 0 0 2rpx rgba(255,255,255,0.6);
    width: 85%;
    max-width: 600rpx;
    justify-content: space-between;
}

.dock-btn {
    width: 48%;
    height: 100rpx;
    border-radius: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

.btn-deposit {
    background: linear-gradient(135deg, #FFD700 0%, #FFA502 100%);
    box-shadow: 0 8rpx 16rpx rgba(255, 165, 2, 0.3), inset 0 2rpx 4rpx rgba(255,255,255,0.4);
}

.btn-avatar {
    background: linear-gradient(135deg, #FF9A9E 0%, #FF6B6B 100%);
    box-shadow: 0 8rpx 16rpx rgba(255, 107, 107, 0.3), inset 0 2rpx 4rpx rgba(255,255,255,0.4);
}

.icon-3d {
    font-size: 40rpx;
    margin-right: 12rpx;
    filter: drop-shadow(0 2rpx 2rpx rgba(0,0,0,0.1));
}

.btn-text {
    color: #fff;
    font-size: 28rpx;
    font-weight: 800;
    letter-spacing: 1rpx;
    text-shadow: 0 2rpx 2rpx rgba(0,0,0,0.1);
}

/* Animations */
@keyframes float {
    0%, 100% { transform: translate(-50%, 0); }
    50% { transform: translate(-50%, -8rpx); }
}
</style>
