const cloud = require('wx-server-sdk')

// Local Ref Cache (reuse in same container instance)
let cachedConfig = null
let lastFetch = 0
const TTL = 60 * 1000 // 1 minute cache

const DEFAULT_CONFIG = {
  chat_daily_limit: 100, // Phase 1: High limit
  ad_enabled: false,      // Phase 1: No ads
  ad_unit_id: '',
  share_title: '2026马年过年必备神器，你的全能社交互联网嘴替！',
  share_image: ''
}

/**
 * Load config from DB 'app_config' -> doc 'global'
 */
async function loadConfig() {
  const db = cloud.database()
  const now = Date.now()
  if (cachedConfig && (now - lastFetch < TTL)) {
    return cachedConfig
  }

  try {
    const res = await db.collection('app_config').doc('global').get()
    cachedConfig = { ...DEFAULT_CONFIG, ...res.data }
    lastFetch = now
    return cachedConfig
  } catch (e) {
    console.warn('Config fetch failed, using default', e)
    return DEFAULT_CONFIG
  }
}

module.exports = {
  loadConfig
}
