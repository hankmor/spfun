const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const today = new Date().toISOString().split('T')[0]
  const recordId = `${OPENID}_${today}`

  try {
    // Reset count for the day (or give bonus)
    // Strategy: Decrement count by large amount or remove record? 
    // Safer: Update 'is_vip_today': true or just set count to -100 (allow 100 more)
    
    // Simple strategy: Set count to -9999 to allow unlimited for day
    await db.collection('usage_logs').doc(recordId).update({
      data: {
        count: -9999
      }
    })
    
    return { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}
