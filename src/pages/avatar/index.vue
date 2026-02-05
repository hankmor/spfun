<template>
  <view class="container">
    <text class="title">马年开运头像</text>
    <view class="upload-area">
      <button @click="chooseImage">上传头像</button>
    </view>
    <text class="todo">功能开发中...</text>
  </view>
</template>

<script setup>
const chooseImage = () => {
  uni.showToast({ title: '功能即将上线', icon: 'none' })
}
</script>

<style>
.container { padding: 40rpx; text-align: center; }
.title { font-size: 36rpx; display: block; margin-bottom: 40rpx; }
.todo { color: #999; margin-top: 40rpx; display: block; }
</style>
