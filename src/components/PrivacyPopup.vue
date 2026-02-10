<template>
  <view v-if="showPrivacy" class="privacy-mask">
    <view class="privacy-content">
      <view class="privacy-title">隐私协议提示</view>
      <view class="privacy-desc">
        感谢使用本小程序。为了保障您的合法权益，请您在继续使用前点击阅读并同意
        <text class="privacy-link" @click="openPrivacyContract">《用户隐私保护指引》</text>
        。
      </view>
      <view class="privacy-btns">
        <button class="btn-cancel" @click="handleRefuse">拒绝</button>
        <button 
          class="btn-confirm" 
          id="agree-btn" 
          open-type="agreePrivacyAuthorization" 
          @agreeprivacyauthorization="handleAgree"
        >同意</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const showPrivacy = ref(false)
let privacyResolve = null

onMounted(() => {
  if (uni.onNeedPrivacyAuthorization) {
    uni.onNeedPrivacyAuthorization((resolve) => {
      showPrivacy.value = true
      privacyResolve = resolve
    })
  }
})

const openPrivacyContract = () => {
  uni.openPrivacyContract({
    fail: () => {
      uni.showToast({ title: '无法打开隐私协议', icon: 'none' })
    }
  })
}

const handleRefuse = () => {
  showPrivacy.value = false
  if (privacyResolve) {
    privacyResolve({ buttonId: 'disagree-btn', event: 'disagree' })
  }
}

const handleAgree = () => {
  showPrivacy.value = false
  if (privacyResolve) {
    privacyResolve({ buttonId: 'agree-btn', event: 'agree' })
  }
}

// 暴露给外部调用的检查方法
const checkPrivacy = () => {
  console.log('PrivacyPopup checkPrivacy called')
  if (uni.getPrivacySetting) {
    uni.getPrivacySetting({
      success: (res) => {
        if (res.needAuthorization) {
          showPrivacy.value = true
        }
      }
    })
  }
}

defineExpose({
  checkPrivacy
})
</script>

<style scoped>
.privacy-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.privacy-content {
  width: 580rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  box-sizing: border-box;
}

.privacy-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  text-align: center;
}

.privacy-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 40rpx;
}

.privacy-link {
  color: #007AFF;
  text-decoration: underline;
}

.privacy-btns {
  display: flex;
  gap: 20rpx;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.btn-cancel {
  background: #f0f0f0;
  color: #999;
}

.btn-confirm {
  background: #D32F2F;
  color: #fff;
}

button::after {
  border: none;
}
</style>
