const cloud = require('wx-server-sdk')

// Config: Max messages per user per day is now dynamic

/**
 * Check if user has exceeded daily limit
 * @param {string} openId User's OpenID
 * @param {number} limit Dynamic limit from config
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
async function checkDailyLimit(openId, limit) {
    const db = cloud.database()
    const _ = db.command
    const today = new Date().toISOString().split('T')[0] // '2026-02-05'
    const recordId = `${openId}_${today}`

    try {
        const res = await db.collection('usage_logs').doc(recordId).get()
        const count = res.data.count

        if (count >= limit) {
            return { allowed: false, remaining: 0 }
        }

        // Increment
        await db.collection('usage_logs').doc(recordId).update({
            data: { count: _.inc(1) }
        })
        return { allowed: true, remaining: limit - count - 1 }

    } catch (e) {
        // Record not found, create new
        try {
            await db.collection('usage_logs').add({
                data: {
                    _id: recordId,
                    _openid: openId,
                    date: today,
                    count: 1
                }
            })
            return { allowed: true, remaining: limit - 1 }
        } catch (createErr) {
            // Handle concurrency race condition (duplicate key)
            return { allowed: true, remaining: limit - 1 }
        }
    }
}

module.exports = {
    checkDailyLimit
}
