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
          v-for="(role, index) in rolesData"
          :key="index"
          class="role-card"
          :class="role.theme"
          @click="navTo(role.path)"
        >
          <!-- Info Icon -->
          <view class="info-icon" @click.stop="openRoleModal(role)">i</view>

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
            <view class="action-btn">🔥</view>
          </view>
        </view>
      </view>
    </view>

    <!-- Role Detail Modal -->
    <view class="modal-mask" v-if="showRoleModal" @click="closeRoleModal">
        <view class="modal-content" @click.stop>
            <view class="modal-header">
                <text class="modal-title">{{ currentRole.name }}</text>
                <view class="close-btn" @click="closeRoleModal">✕</view>
            </view>
            
            <view class="modal-body">
                <view class="modal-role-img-wrapper">
                    <image class="modal-role-img" :src="currentRole.img" mode="aspectFill"></image>
                    <view class="modal-role-emoji" v-if="!currentRole.img">{{ currentRole.fallback }}</view>
                </view>
                <text class="modal-desc">{{ currentRole.detailDesc }}</text>
                
                <view class="modal-tags">
                    <view class="tag" v-for="tag in currentRole.tags" :key="tag">{{ tag }}</view>
                </view>
            </view>

            <button class="start-chat-btn" @click="startGame">👊 开始对线</button>
        </view>
    </view>

    <!-- Bottom Dock -->
    <view class="bottom-dock-container">
        <view class="bottom-dock glass-panel">
            <view class="dock-btn btn-deposit tada-anim" @click="navTo('/pages/bank/index')">
                <view class="icon-3d pop-out">🧧</view>
                <view class="btn-content">
                    <text class="btn-title">妈妈存单</text>
                    <text class="btn-subtitle">刚查到一笔巨款</text>
                </view>
            </view>
            <view class="dock-btn btn-avatar" @click="navTo('/pages/avatar/index')">
                <view class="shine-container">
                    <view class="shine-sweep"></view>
                </view>
                <view class="icon-3d pop-out delay-anim">🦁</view>
                <view class="btn-content">
                    <text class="btn-title">开运头像</text>
                    <text class="btn-subtitle">换个头像马上有钱</text>
                </view>
            </view>
        </view>
    </view>

  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { AUNT_MONEY_PIC, AUNT_MARRIAGE_PIC, NEIGHBOR_SHOWOFF_PIC, UNCLE_STRICT_PIC } from '../../constants/roles'

const navTo = (url) => {
  uni.navigateTo({ url })
}

const imgErrors = ref([false, false, false, false])
const onImgError = (e, index) => {
    imgErrors.value[index] = true
}

const rolesData = ref([
    { 
        name: '势利二姨', 
        desc: '工资才三千？', 
        detailDesc: '“现在的年轻人啊，眼高手低，看看隔壁王阿姨家儿子，年薪百万！” \n\n战斗指数：⭐⭐⭐⭐⭐\n必杀技：收入羞辱、凡尔赛打击',
        tags: ['嫌贫爱富', '炫耀狂魔'],
        cloudId: AUNT_MONEY_PIC, 
        img: '', 
        fallback: '🀄️', 
        path: '/pages/chat/index?role=aunt_money', 
        theme: 'theme-red' 
    },
    { 
        name: '催婚大姑', 
        desc: '不结婚不孝！', 
        detailDesc: '“都多大了还不找对象？再挑就没人要了！姑姑给你介绍个二婚带娃的...” \n\n战斗指数：⭐⭐⭐⭐\n必杀技：焦虑贩卖、道德绑架',
        tags: ['相亲狂热', '单身歧视'],
        cloudId: AUNT_MARRIAGE_PIC, 
        img: '', 
        fallback: '🤱', 
        path: '/pages/chat/index?role=aunt_marriage', 
        theme: 'theme-coral' 
    },
    { 
        name: '凡尔赛王姨', 
        desc: 'Lucy去巴黎了', 
        detailDesc: '“哎呀，我家Lucy非要接我去欧洲度假，我都烦死了，不像你这么清闲...” \n\n战斗指数：⭐⭐⭐\n必杀技：高级黑、明贬暗褒',
        tags: ['海归子女', '精致利己'],
        cloudId: NEIGHBOR_SHOWOFF_PIC, 
        img: '', 
        fallback: '👜', 
        path: '/pages/chat/index?role=neighbor_showoff', 
        theme: 'theme-red' 
    },
    { 
        name: '严肃二舅', 
        desc: '年轻人要有规划', 
        detailDesc: '（战术喝茶）“年轻人要脚踏实地，那种不稳定工作能干一辈子？考公才是出路！” \n\n战斗指数：⭐⭐⭐⭐\n必杀技：体制内优越、爹味说教',
        tags: ['体制内', '人生导师'],
        cloudId: UNCLE_STRICT_PIC, 
        img: '', 
        fallback: '♟️', 
        path: '/pages/chat/index?role=uncle_strict', 
        theme: 'theme-coral' 
    }
])

const showRoleModal = ref(false)
const currentRole = ref({})

const openRoleModal = (role) => {
    currentRole.value = role
    showRoleModal.value = true
}

const closeRoleModal = () => {
    showRoleModal.value = false
}

const startGame = () => {
    closeRoleModal()
    navTo(currentRole.value.path)
}

onLoad(() => {
    resolveCloudUrls()
})

const resolveCloudUrls = async () => {
    const fileList = rolesData.value.map(r => r.cloudId)
    console.log('开始解析首页云文件(输入):', fileList)
    try {
        const res = await uni.cloud.getTempFileURL({ fileList })
        console.log('云文件解析结果(原始返回):', res)

        if (res.fileList && res.fileList.length > 0) {
            const urlMap = {}
            res.fileList.forEach(item => {
                console.log(`解析项: ID=${item.fileID}, Status=${item.status}, Err=${item.errMsg}`)
                if (item.tempFileURL) {
                    urlMap[item.fileID] = item.tempFileURL
                }
            })

            let updatedCount = 0
            rolesData.value.forEach(role => {
                // 尝试完全匹配或忽略前缀差异
                if (urlMap[role.cloudId]) {
                    role.img = urlMap[role.cloudId]
                    updatedCount++
                }
            })
            console.log(`首页更新完成，成功更新 ${updatedCount} 个角色头像`)
        }
    } catch (e) {
        console.error('首页解析云文件失败:', e)
    }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FFF8E7; /* Creamy Beige */
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
        radial-gradient(#FDE6CA 15%, transparent 15%),
        radial-gradient(#FDE6CA 15%, transparent 15%);
    background-position: 0 0, 40rpx 40rpx;
    background-size: 80rpx 80rpx;
    opacity: 0.4;
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
    opacity: 0.6;
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
    color: #D32F2F; /* Vermilion Red */
    letter-spacing: 4rpx;
    text-shadow: 2rpx 2rpx 0rpx rgba(255, 200, 200, 0.4);
    display: block;
}

.subtitle {
    font-size: 30rpx;
    color: #FF8F00; /* Amber */
    font-weight: 700;
    margin-top: 16rpx;
    background: #FFF;
    padding: 8rpx 30rpx;
    border-radius: 30rpx;
    display: inline-block;
    box-shadow: 0 4rpx 10rpx rgba(255, 143, 0, 0.15);
    border: 2rpx solid #FFECB3;
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
    background: #f06262; /* Fallback */
    border-radius: 40rpx;
    position: relative;
    box-shadow: 0 20rpx 40rpx rgba(211, 47, 47, 0.15);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 50rpx;
    margin-top: 30rpx; /* Space for speech bubble overlap */
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    overflow: visible; /* Allow pop out */
    border: 4rpx solid rgba(255,255,255,0.3);
}

.theme-red { background: linear-gradient(135deg, #f06262 0%, #e05858 100%); }
.theme-coral { background: linear-gradient(135deg, #FF8A65 0%, #f06262 100%); }

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
    background: #FFF8E1; /* Light Yellow/Cream */
    padding: 14rpx 24rpx;
    border-radius: 24rpx;
    box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.1);
    z-index: 10;
    white-space: nowrap;
    border: 3rpx solid #FFECB3;
    animation: float 3s ease-in-out infinite;
    max-width: 140%;
}

.bubble-text {
    font-size: 24rpx;
    color: #BF360C;
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
    border-top: 12rpx solid #FFF8E1;
}

/* Image Wrapper for Pop-out Effect */
.image-wrapper {
    position: absolute;
    bottom: 130rpx;
        /* sits above name tag */
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: 5;
}

.role-img {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    border: 8rpx solid #FFF;
    box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.2);
    background: #FFF;
}

.role-emoji-fallback {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    background: #FFF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 80rpx;
    border: 8rpx solid #FFF;
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
    background: rgba(255, 255, 255, 0.95);
    border-radius: 0 0 36rpx 36rpx;
    z-index: 4;
    border-top: 1rpx solid rgba(255,255,255,0.5);
}

.name-text {
    font-size: 32rpx;
    font-weight: 900;
    color: #B71C1C;
}

.action-icon {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    background: #FFD700;
    color: #D32F2F;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20rpx;
    font-weight: bold;
    box-shadow: 0 4rpx 8rpx rgba(255, 215, 0, 0.4);
}

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
    /* background: #FFF8E1; */
    padding: 12rpx;
    border-radius: 80rpx;
    /* box-shadow: 0 20rpx 50rpx rgba(238, 234, 142, 0.3), inset 0 2rpx 4rpx rgba(255,255,255,0.3); */
    width: 85%;
    max-width: 600rpx;
    justify-content: space-between;
    /* border: 4rpx solid #FFF8E1; */
}

.dock-btn {
    width: 48%;
    height: 120rpx;
    border-radius: 30rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    /* overflow visible for pop-out icons */
}

.btn-deposit {
    background: linear-gradient(135deg, #FFC107 0%, #FF8F00 100%);
    box-shadow: 0 8rpx 16rpx rgba(0,0,0,0.15), inset 0 2rpx 4rpx rgba(255,255,255,0.5);
    border: 2rpx solid #FFECB3;
}

.btn-avatar {
    background: linear-gradient(135deg, #FF5252 0%, #D32F2F 100%);
    box-shadow: 0 8rpx 16rpx rgba(0,0,0,0.15), inset 0 2rpx 4rpx rgba(255,255,255,0.3);
    border: 2rpx solid #FFCDD2;
}

.icon-3d {
    font-size: 56rpx;
    margin-right: 12rpx;
    filter: drop-shadow(0 4rpx 4rpx rgba(0,0,0,0.2));
    transition: transform 0.2s;
}

.pop-out {
    position: absolute;
    top: -40rpx;
    left: 10rpx;
    z-index: 10;
}

.btn-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    /* padding-left: 60rpx; */
}

.btn-title {
    color: #fff;
    font-size: 34rpx;
    font-weight: 950;
    letter-spacing: 2rpx;
    text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.2);
    line-height: 1.2;
}

.btn-subtitle {
    color: rgba(255, 255, 255, 0.9);
    font-size: 20rpx;
    font-weight: 500;
    margin-top: 2rpx;
}

/* Tada Animation */
.tada-anim {
    animation: tada 3s infinite;
}

@keyframes tada {
    0% { transform: scale(1); }
    10%, 20% { transform: scale(0.95) rotate(-3deg); }
    30%, 50%, 70%, 90% { transform: scale(1.05) rotate(3deg); }
    40%, 60%, 80% { transform: scale(1.05) rotate(-3deg); }
    100% { transform: scale(1) rotate(0); }
}

/* Shine Effect */
.shine-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 30rpx;
    z-index: 1;
    pointer-events: none;
}

.shine-sweep {
    position: absolute;
    top: 0;
    left: -150%;
    width: 100%;
    height: 100%;
    background: linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent);
    transform: skewX(-25deg);
    animation: shine 3s infinite;
}

@keyframes shine {
    0% { left: -150%; }
    30% { left: 150%; }
    100% { left: 150%; }
}
.btn-subtitle {
    color: rgba(255, 255, 255, 0.9);
    font-size: 20rpx;
    font-weight: 500;
    margin-top: 4rpx;
}

/* Info Icon */
.info-icon {
    position: absolute;
    top: 20rpx;
    right: 20rpx;
    width: 40rpx;
    height: 40rpx;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
    font-weight: 600;
    color: #FFF;
    z-index: 20;
    border: 2rpx solid rgba(255, 255, 255, 0.6);
}

/* Role Modal */
.modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
}

.modal-content {
    width: 580rpx;
    background: #FFF;
    border-radius: 40rpx;
    padding: 0;
    overflow: hidden;
    position: relative;
    box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.modal-header {
    background: linear-gradient(135deg, #d32f2f, #FF5252);
    padding: 30rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
}

.modal-title {
    color: #FFF;
    font-size: 36rpx;
    font-weight: bold;
}

.close-btn {
    position: absolute;
    right: 30rpx;
    top: 30rpx;
    color: rgba(255, 255, 255, 0.8);
    font-size: 36rpx;
    padding: 10rpx;
}

.modal-body {
    padding: 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.modal-role-img-wrapper {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    margin-bottom: 30rpx;
    border: 6rpx solid #FFECB3;
    overflow: hidden;
    background: #f5f5f5;
    box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.1);
}

.modal-role-img {
    width: 100%;
    height: 100%;
}

.modal-role-emoji {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 80rpx;
}

.modal-desc {
    font-size: 28rpx;
    color: #555;
    line-height: 1.6;
    text-align: center;
    margin-bottom: 30rpx;
    white-space: pre-wrap;
    background: #FFF8E1;
    padding: 20rpx;
    border-radius: 20rpx;
    width: 100%;
    box-sizing: border-box;
}

.modal-tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16rpx;
    margin-bottom: 40rpx;
}

.tag {
    background: #FFEBEE;
    color: #D32F2F;
    padding: 8rpx 20rpx;
    border-radius: 30rpx;
    font-size: 24rpx;
    font-weight: bold;
}

.start-chat-btn {
    background: linear-gradient(135deg, #FFC107 0%, #FF8F00 100%);
    color: #FFF;
    font-weight: bold;
    font-size: 32rpx;
    border-radius: 50rpx;
    width: 80%;
    padding: 20rpx 0;
    margin-bottom: 40rpx;
    box-shadow: 0 8rpx 20rpx rgba(255, 143, 0, 0.3);
    border: none;
}

.start-chat-btn:active {
    transform: scale(0.96);
}

.action-btn {
    font-size: 24rpx;
    font-weight: 900;
    color: #D32F2F;
    background: #FFF;
    padding: 4rpx 16rpx;
    border-radius: 20rpx;
    box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1);
}

/* Animations included in style tag */
.bounce-anim {
    animation: bounce 2s infinite;
}

.delay-anim {
    animation-delay: 1s;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
    40% {transform: translateY(-10rpx);}
    60% {transform: translateY(-5rpx);}
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(50rpx); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

/* Animations */
@keyframes float {
    0%, 100% { transform: translate(-50%, 0); }
    50% { transform: translate(-50%, -8rpx); }
}
</style>
