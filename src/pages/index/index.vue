<template>
  <view class="container">
    <view class="header">
      <text class="title">春节嘴替</text>
      <text class="subtitle">选择一位“对手”开始演练</text>
    </view>
    
    <view class="role-grid">
      <view 
        class="role-card" 
        v-for="(role, index) in roles" 
        :key="index"
        @click="selectRole(role.id)"
      >
        <view class="avatar-placeholder" :style="{background: role.color}">{{ role.icon }}</view>
        <text class="role-name">{{ role.name }}</text>
        <text class="role-desc">{{ role.desc }}</text>
      </view>
    </view>

    <view class="footer-funcs">
      <button class="func-btn" @click="navTo('/pages/bank/index')">💰 妈妈存单</button>
      <button class="func-btn" @click="navTo('/pages/avatar/index')">🧧 开运头像</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const roles = ref([
  { id: 'aunt_money', name: '势利眼二姨', desc: '工资多少？买房了吗？', icon: '👱‍♀️', color: '#FF9800' },
  { id: 'aunt_marriage', name: '催婚大姑', desc: '还不找对象？不孝！', icon: '👵', color: '#E91E63' },
  { id: 'neighbor_showoff', name: '凡尔赛邻居', desc: '我家儿子刚换了保时捷', icon: '👨‍🦱', color: '#2196F3' },
  { id: 'uncle_strict', name: '严厉二舅', desc: '工作要脚踏实地...', icon: '👴', color: '#607D8B' }
])

const selectRole = (id) => {
  uni.navigateTo({
    url: `/pages/chat/index?role=${id}`
  })
}

const navTo = (url) => {
  uni.navigateTo({ url })
}
</script>

<style>
.container { padding: 40rpx; }
.header { margin-bottom: 60rpx; text-align: center; }
.title { font-size: 48rpx; font-weight: bold; color: #D32F2F; display: block; }
.subtitle { font-size: 28rpx; color: #666; margin-top: 10rpx; display: block; }

.role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30rpx; margin-bottom: 60rpx; }
.role-card { 
  background: #fff; padding: 30rpx; border-radius: 20rpx; 
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
  display: flex; flex-direction: column; align-items: center;
}
.avatar-placeholder { 
  width: 100rpx; height: 100rpx; border-radius: 50%; 
  display: flex; align-items: center; justify-content: center; font-size: 50rpx;
  margin-bottom: 20rpx;
}
.role-name { font-size: 32rpx; font-weight: bold; color: #333; }
.role-desc { font-size: 24rpx; color: #999; text-align: center; margin-top: 10rpx; }

.footer-funcs { display: flex; gap: 20rpx; }
.func-btn { flex: 1; font-size: 28rpx; background: #FFF3E0; color: #E65100; border: none; }
</style>
