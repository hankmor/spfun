<template>
  <view class="bank-container">
    <view class="input-form" v-if="!generated">
      <view class="form-item">
        <text class="label">存户姓名</text>
        <input class="input" v-model="form.name" placeholder="请输入姓名" />
      </view>
      <view class="form-item">
        <text class="label">存入金额</text>
        <input class="input" type="digit" v-model="form.amount" placeholder="8888" />
      </view>
      <view class="form-item">
        <text class="label">存入理由</text>
        <input class="input" v-model="form.reason" placeholder="等你买房娶媳妇给你" />
      </view>
      
      <button class="generate-btn" @click="generateReceipt">生成存单</button>
    </view>

    <view class="preview-area" v-else>
      <canvas canvas-id="bankCanvas" id="bankCanvas" class="bank-canvas"></canvas>
      <view class="action-btns">
        <button class="btn save" @click="saveImage">保存到相册</button>
        <button class="btn retry" @click="generated = false">再存一张</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'

const form = reactive({
  name: '',
  amount: '',
  reason: '先帮你存着，以后给你'
})
const generated = ref(false)

const generateReceipt = () => {
  if (!form.name || !form.amount) return uni.showToast({ title: '请填写完整', icon: 'none' })
  
  generated.value = true
  
  // Wait for canvas to be ready
  setTimeout(() => {
    drawReceipt()
  }, 200)
}

const drawReceipt = () => {
  const ctx = uni.createCanvasContext('bankCanvas')
  const width = 300
  const height = 450
  
  // Background
  ctx.setFillStyle('#FFF8E1')
  ctx.fillRect(0, 0, width, height)
  
  // Border
  ctx.setStrokeStyle('#D32F2F')
  ctx.setLineWidth(4)
  ctx.strokeRect(10, 10, width-20, height-20)
  
  // Title
  ctx.setFontSize(24)
  ctx.setFillStyle('#D32F2F')
  ctx.setTextAlign('center')
  ctx.fillText('妈妈银行定期存单', width/2, 50)
  
  // Content
  ctx.setFontSize(16)
  ctx.setFillStyle('#333')
  ctx.setTextAlign('left')
  
  const startX = 40
  let currentY = 100
  const lineHeight = 40
  
  ctx.fillText(`存户：${form.name}`, startX, currentY)
  currentY += lineHeight
  ctx.fillText(`金额：￥${form.amount}`, startX, currentY)
  currentY += lineHeight
  
  // Inflation Egg
  const futureValue = (parseInt(form.amount) * 0.0001).toFixed(2)
  ctx.fillText(`预计2036年价值：${futureValue}元`, startX, currentY)
  ctx.setFontSize(12)
  ctx.setFillStyle('#999')
  ctx.fillText('(基于通胀与茅台股价波动计算)', startX, currentY + 20)
  
  currentY += 60
  ctx.setFontSize(16)
  ctx.setFillStyle('#333')
  ctx.fillText(`存入理由：`, startX, currentY)
  ctx.fillText(`${form.reason}`, startX, currentY + 30)
  
  // Stamp
  ctx.setGlobalAlpha(0.6)
  ctx.beginPath()
  ctx.arc(width - 60, height - 60, 40, 0, 2 * Math.PI)
  ctx.setStrokeStyle('#D32F2F')
  ctx.setLineWidth(2)
  ctx.stroke()
  ctx.setFontSize(14)
  ctx.setFillStyle('#D32F2F')
  ctx.translate(width - 60, height - 60)
  ctx.rotate(-15 * Math.PI / 180)
  ctx.fillText('妈妈帮你存着', -40, 5)
  
  ctx.draw()
}

const saveImage = () => {
  uni.canvasToTempFilePath({
    canvasId: 'bankCanvas',
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '已保存' }),
        fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
      })
    }
  })
}
</script>

<style>
.bank-container { padding: 40rpx; background: #fff; min-height: 100vh; }
.form-item { margin-bottom: 40rpx; }
.label { display: block; font-size: 28rpx; color: #666; margin-bottom: 15rpx; }
.input { border: 1rpx solid #ddd; padding: 20rpx; border-radius: 10rpx; font-size: 32rpx; }

.generate-btn { background: #D32F2F; color: #fff; margin-top: 60rpx; }

.bank-canvas { width: 300px; height: 450px; margin: 0 auto; box-shadow: 0 5rpx 15rpx rgba(0,0,0,0.1); }
.action-btns { margin-top: 40rpx; display: flex; gap: 20rpx; }
.btn { flex: 1; font-size: 28rpx; }
.save { background: #FFC107; color: #333; }
.retry { background: #eee; color: #666; }
</style>
