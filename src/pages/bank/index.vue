<template>
  <view class="container">
    <!-- Background Decor (Coins) -->
    <view class="bg-coins"></view>

    <!-- Header (Piggy Bank) -->
    <view class="piggy-header anim-bounce">
       <view class="piggy-icon">🐷</view>
       <view class="gold-pile">💰💰💰</view>
    </view>

    <!-- Form Area (Receipt Card) -->
    <view class="receipt-container anim-slide-up" v-if="!generated">
       <!-- Jagged Top (Optional, but using regular border radius for now) -->
       
       <!-- Receipt Body -->
       <view class="receipt-paper">
           <view class="receipt-header">
               <text class="receipt-title">MOM'S BANK</text>
               <text class="receipt-sub">定期存款单</text>
           </view>
           
           <view class="dotted-line"></view>

           <!-- Engraved Inputs -->
           <view class="input-section">
               <view class="input-group">
                   <text class="label">NAME / 存户姓名</text>
                   <view class="engraved-box">
                       <input class="input-text" v-model="form.name" placeholder="Name" placeholder-class="ph-style"/>
                   </view>
               </view>

               <view class="input-group">
                   <text class="label">AMOUNT / 金额 (CNY)</text>
                   <view class="engraved-box">
                       <input class="input-text" type="digit" v-model="form.amount" placeholder="¥ 8888" placeholder-class="ph-style"/>
                   </view>
               </view>
               
               <view class="input-group">
                   <text class="label">REASON / 存入理由</text>
                   <view class="engraved-box">
                       <input class="input-text" v-model="form.reason" placeholder="压岁钱..." placeholder-class="ph-style"/>
                   </view>
               </view>
           </view>

           <view class="receipt-footer">
               <text class="fine-print">*本凭证解释权归妈妈所有</text>
           </view>

           <!-- Jagged Bottom Edge -->
           <view class="jagged-edge"></view>
       </view>

       <!-- Stamp Button -->
       <view class="stamp-btn-wrapper">
           <view class="stamp-btn hover-scale" @click="generateReceipt">
               <view class="stamp-inner">
                   <text class="stamp-text">SEAL</text>
                   <text class="stamp-sub">盖章存入</text>
               </view>
           </view>
       </view>
    </view>

    <!-- Preview Area -->
    <view class="preview-area anim-fade-in" v-else>
       <view class="piggy-header-small">🐷</view>
       <view class="canvas-box shadow-lg">
         <canvas canvas-id="bankCanvas" id="bankCanvas" class="bank-canvas"></canvas>
       </view>
       
       <view class="action-row">
         <button class="action-btn btn-save" @click="saveImage">保存凭证</button>
         <button class="action-btn btn-retry" @click="generated = false">再存一笔</button>
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
  if (!form.name || !form.amount) return uni.showToast({ title: '写个名字和金额呗', icon: 'none' })
  generated.value = true
  setTimeout(() => { drawReceipt() }, 200)
}

const drawReceipt = () => {
  const ctx = uni.createCanvasContext('bankCanvas')
  const width = 300
  const height = 450
  
  // Paper Texture
  ctx.setFillStyle('#FFFDF5') 
  ctx.fillRect(0, 0, width, height)
  
  // Border (Double Line)
  ctx.setStrokeStyle('#B71C1C') // Dark Red Border
  ctx.setLineWidth(3)
  ctx.strokeRect(15, 15, width-30, height-30)
  ctx.setLineWidth(1)
  ctx.strokeRect(22, 22, width-44, height-44)
  
  // Header
  ctx.setFontSize(28)
  ctx.setFillStyle('#B71C1C')
  ctx.setTextAlign('center')
  ctx.font = 'bold 28px serif'
  ctx.fillText('MOM\'S BANK', width/2, 70)
  
  ctx.setFontSize(16)
  ctx.setFillStyle('#D32F2F')
  ctx.fillText('妈妈定期存单', width/2, 100)
  
  // Divider
  ctx.setStrokeStyle('#FFC107') // Gold Divider
  ctx.setLineWidth(2)
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(30, 120)
  ctx.lineTo(width-30, 120)
  ctx.stroke()
  ctx.setLineDash([]) // Reset
  
  // Content
  ctx.setTextAlign('left')
  const startX = 40
  let currentY = 160
  
  // Name
  ctx.setFontSize(12)
  ctx.setFillStyle('#999')
  ctx.fillText('NAME / 存户', startX, currentY)
  currentY += 30
  ctx.setFontSize(24)
  ctx.setFillStyle('#000')
  ctx.fillText(form.name, startX, currentY)
  
  // Amount
  currentY += 50
  ctx.setFontSize(12)
  ctx.setFillStyle('#999')
  ctx.fillText('AMOUNT / 金额', startX, currentY)
  currentY += 35
  ctx.setFontSize(40)
  ctx.setFillStyle('#D32F2F')
  ctx.fillText(`¥ ${form.amount}`, startX, currentY)
  
  // Reason
  currentY += 50
  ctx.setFontSize(12)
  ctx.setFillStyle('#999')
  ctx.fillText('NOTE / 备注', startX, currentY)
  currentY += 30
  ctx.setFontSize(16)
  ctx.setFillStyle('#333')
  ctx.fillText(form.reason.substring(0, 18), startX, currentY)
  
  // Stamp
  ctx.save()
  ctx.translate(width - 90, height - 100)
  ctx.rotate(-20 * Math.PI / 180)
  
  // Stamp Ring
  ctx.beginPath()
  ctx.arc(0, 0, 45, 0, 2 * Math.PI)
  ctx.setStrokeStyle('#D32F2F')
  ctx.setLineWidth(4)
  ctx.stroke()
  
  // Stamp Inner Ring
  ctx.beginPath()
  ctx.arc(0, 0, 40, 0, 2 * Math.PI)
  ctx.setLineWidth(1)
  ctx.stroke()
  
  // Stamp Text
  ctx.setFontSize(14)
  ctx.setFillStyle('#D32F2F')
  ctx.setTextAlign('center')
  ctx.fillText('OFFICIAL', 0, -10)
  ctx.fillText('妈妈存管', 0, 10)
  ctx.setFontSize(10)
  ctx.fillText(new Date().getFullYear(), 0, 25)
  
  ctx.restore()
  
  ctx.draw()
}

const saveImage = () => {
  uni.canvasToTempFilePath({
    canvasId: 'bankCanvas',
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '保存成功' }),
        fail: () => uni.showToast({ title: '权限被拒绝', icon: 'none' })
      })
    }
  })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 40rpx;
  background-color: #FFF8E1; /* Creamy Beige */
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* Background Coins Pattern */
.bg-coins {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background-image: radial-gradient(#FFC107 15%, transparent 15%);
    background-size: 60rpx 60rpx;
    opacity: 0.15;
    pointer-events: none;
}

/* Header */
.piggy-header {
    text-align: center;
    margin-top: 40rpx;
    margin-bottom: 30rpx;
    position: relative;
    z-index: 2;
}
.piggy-icon {
    font-size: 160rpx;
    filter: drop-shadow(0 10rpx 20rpx rgba(0,0,0,0.2));
    animation: float 3s ease-in-out infinite;
}
.gold-pile {
    font-size: 60rpx;
    margin-top: -40rpx;
    letter-spacing: -10rpx;
}

/* Receipt Card */
.receipt-container {
    margin-top: 20rpx;
    position: relative;
    z-index: 5;
    padding-bottom: 120rpx; /* Space for stamp */
}

.receipt-paper {
    background: #FFFDF5;
    width: 100%;
    padding: 60rpx 40rpx 80rpx;
    box-sizing: border-box;
    box-shadow: 0 20rpx 60rpx rgba(211, 47, 47, 0.1);
    position: relative;
    border-top: 8rpx solid #B71C1C; /* Red Top Border */
}

/* Jagged Edge using gradient */
.jagged-edge {
    position: absolute;
    bottom: -20rpx;
    left: 0;
    width: 100%;
    height: 20rpx;
    background: linear-gradient(-45deg, transparent 16rpx, #FFFDF5 0), 
                linear-gradient(45deg, transparent 16rpx, #FFFDF5 0);
    background-size: 32rpx 32rpx;
    background-repeat: repeat-x;
}

.receipt-header {
    text-align: center;
    margin-bottom: 40rpx;
}
.receipt-title {
    font-family: serif;
    font-size: 48rpx;
    font-weight: 900;
    color: #B71C1C;
    display: block;
    letter-spacing: 4rpx;
}
.receipt-sub {
    font-size: 24rpx;
    color: #D32F2F;
    letter-spacing: 10rpx;
    margin-top: 10rpx;
    display: block;
    opacity: 0.8;
}

.dotted-line {
    border-bottom: 4rpx dashed #FFC107;
    margin: 40rpx 0;
}

/* Inputs */
.input-group {
    margin-bottom: 30rpx;
}
.label {
    font-size: 20rpx;
    color: #B71C1C;
    font-weight: bold;
    margin-bottom: 12rpx;
    display: block;
    letter-spacing: 1rpx;
}

.engraved-box {
    background: #FFF;
    border-radius: 12rpx;
    padding: 10rpx 24rpx;
    box-shadow: inset 0 2rpx 4rpx rgba(0,0,0,0.05);
    border: 2rpx solid #FFCDD2;
}

.input-text {
    height: 80rpx;
    font-size: 32rpx;
    color: #333;
    font-weight: bold;
    font-family: monospace; /* Typewriter feel */
}

.receipt-footer {
    text-align: center;
    margin-top: 60rpx;
}
.fine-print {
    font-size: 18rpx;
    color: #EF9A9A;
}

/* Stamp Button */
.stamp-btn-wrapper {
    position: absolute;
    bottom: -60rpx;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: 10;
}

.stamp-btn {
    width: 180rpx;
    height: 180rpx;
    background: #D32F2F;
    border-radius: 50%;
    box-shadow: 0 10rpx 30rpx rgba(211, 47, 47, 0.4), inset 0 4rpx 10rpx rgba(255,255,255,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 8rpx solid #B71C1C;
}

.stamp-inner {
    width: 140rpx;
    height: 140rpx;
    border: 4rpx solid rgba(255,255,255,0.4);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.stamp-text {
    color: #fff;
    font-size: 36rpx;
    font-weight: 900;
    letter-spacing: 2rpx;
}
.stamp-sub {
    color: rgba(255,255,255,0.8);
    font-size: 20rpx;
    margin-top: 6rpx;
}

/* Preview Area */
.preview-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 60rpx;
}
.piggy-header-small { font-size: 80rpx; margin-bottom: 20rpx; }
.canvas-box { border-radius: 4rpx; overflow: hidden; background: #fff; margin-bottom: 60rpx; }
.bank-canvas { width: 300px; height: 450px; }

.action-row { display: flex; width: 100%; gap: 30rpx; }
.action-btn { flex: 1; border-radius: 20rpx; height: 100rpx; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 30rpx; box-shadow: 0 8rpx 16rpx rgba(0,0,0,0.1); }
.btn-save { background: #D32F2F; color: #FFF; }
.btn-retry { background: #FFF; color: #D32F2F; border: 2rpx solid #D32F2F; }

/* Animation */
@keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20rpx); }
}
</style>
