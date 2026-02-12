import tools from "./tools"
class AdManager {
    constructor() {
        this.videoAd = null
        this.cardAd = null
        this.lastCardAdTime = 0
        // Default Config
        this.config = {
            ad_enabled: false,  // Master switch
            video_ad_id: '',    // 激励视频广告 ID
            interstitial_ad_id: '', // 插屏广告 ID
            banner_ad_id: '',   // Banner 广告 ID
            feed_ad_id: '',     // 原生模板/信息流广告 ID
            chat_energy: 15,    // Daily free energy
            chat_energy_num_after_ad: 10, // Reward amount
            ai_help_prompt: '请根据当前对话生成一句幽默、犀利且符合长辈人设的回复，60字以内。',
            card_ad_cooldown: 300, // 5 minutes in seconds
            // 开关
            mm_enable: true,     // 新增默认值
            bless_enable: true,  // 新增默认值
            avatar_enable: true, // 新增默认值
        }
        this.isLoaded = false
    }

    static getInstance() {
        if (!AdManager.instance) {
            AdManager.instance = new AdManager()
        }
        return AdManager.instance
    }

    /**
     * Initialize API and load remote config
     */
    async init() {
        if (this.isLoaded) return
        console.log('AdManager: Initializing...')

        try {
            // 1. Fetch Remote Config
            const db = uni.cloud.database()
            const collection = db.collection('app_config')
            const res = await collection.get()
            console.log("res: ", res)
            if (res && res.data && res.data.length > 0) {
                const remoteConfig = res.data[0]
                // Merge remote config, prioritizing remote values
                this.config = { ...this.config, ...remoteConfig }
                console.log('AdManager: Config loaded', this.config)
            } else {
                console.warn('AdManager: No remote config found, using defaults.')
            }

            // 2. Pre-load Ads only if enabled
            if (this.config.ad_enabled) {
                this._createVideoAd()
                this._createInterstitialAd()
            }

        } catch (e) {
            console.error('AdManager: Init failed', e)
            // Fallback: Proceed with defaults
        } finally {
            this.isLoaded = true
        }
    }

    /**
     * Internal: Create Rewarded Video Ad
     */
    _createVideoAd() {
        // #ifdef MP-WEIXIN
        console.log('AdManager: Creating Video Ad with ID:', this.config.video_ad_id)
        if (wx.createRewardedVideoAd && this.config.video_ad_id && this.config.video_ad_id.length > 15) {
            this.videoAd = wx.createRewardedVideoAd({
                adUnitId: this.config.video_ad_id
            })

            this.videoAd.onError((err) => {
                console.error('AdManager: Video Ad Error', err)
            })
        } else {
            console.warn('AdManager: Skip Video Ad creation (Invalid ID or not supported)')
        }
        // #endif
    }

    /**
   * Internal: Create Interstitial Ad
   */
    _createInterstitialAd() {
        // #ifdef MP-WEIXIN
        console.log('AdManager: Creating Interstitial Ad with ID:', this.config.interstitial_ad_id)
        if (wx.createInterstitialAd && this.config.interstitial_ad_id && this.config.interstitial_ad_id.length > 15) {
            this.cardAd = wx.createInterstitialAd({
                adUnitId: this.config.interstitial_ad_id
            })

            this.cardAd.onLoad(() => { })
            this.cardAd.onError((err) => {
                console.error('AdManager: Interstitial Ad Error', err)
            })
            this.cardAd.onClose(() => { })
        } else {
            console.warn('AdManager: Skip Interstitial Ad creation (Invalid ID or not supported)')
        }
        // #endif
    }

    /**
     * Show Rewarded Video Ad
     * @param {Object} options callbacks
     * @param {Function} options.onSuccess - Ad watched fully
     * @param {Function} options.onFail - Ad closed early or failed
     */
    showRewardedVideoAd({ onSuccess, onFail }) {
        console.log('AdManager: Requesting Video Ad. Enabled:', this.config.ad_enabled)

        // Bypass if Ads are disabled (Audit Mode or Config Off)
        if (!this.config.ad_enabled) {
            console.log('AdManager: Ads disabled, granting reward instantly.')
            if (onSuccess) onSuccess()
            return
        }

        if (tools.isRelease()) {
            // #ifdef MP-WEIXIN
            if (this.videoAd) {
                console.log("has videoAd: ", this.videoAd)
                // Clear previous listeners to avoid duplicates
                this.videoAd.offClose()
                this.videoAd.offError()

                // Set up new listeners
                this.videoAd.onClose((res) => {
                    if (res && res.isEnded) {
                        // Fully watched
                        console.log('AdManager: Ad watched fully')
                        if (onSuccess) onSuccess()
                    } else {
                        // Closed early
                        console.log('AdManager: Ad closed early')
                        if (onFail) onFail('视频未播放完成')
                    }
                })

                this.videoAd.onError((err) => {
                    console.error('AdManager: Show Error', err)
                    // Strategy: If Ad fails to load/show, grant reward anyway (System Compensation)
                    uni.showToast({
                        title: '春节送福利，本次免广告！',
                        icon: 'none'
                    })
                    if (onSuccess) onSuccess()
                })

                // Show Ad
                this.videoAd.show().catch(() => {
                    // Reload and try again
                    this.videoAd.load()
                        .then(() => this.videoAd.show())
                        .catch(err => {
                            console.error('AdManager: Load failed', err)
                            // Strategy: Grant reward on failure
                            uni.showToast({
                                title: '春节送福利，本次免广告！',
                                icon: 'none'
                            })
                            if (onSuccess) onSuccess()
                        })
                })
            } else {
                // Not supported env or init failed
                if (onSuccess) onSuccess()
            }
            // #endif
        } else {
            // Dev environment or H5: Direct success
            console.log('AdManager: Dev Mode - Mock Ad Success')
            uni.showModal({
                title: '开发模式',
                content: '[模拟] 激励视频播放完成？',
                success: (res) => {
                    if (res.confirm) {
                        if (onSuccess) onSuccess()
                    } else {
                        if (onFail) onFail('用户取消')
                    }
                }
            })
        }
    }

    /**
     * Show Interstitial Ad (with Cooldown)
     */
    showInterstitialAd() {
        if (!this.config.ad_enabled) return

        const now = Math.floor(Date.now() / 1000)
        if (now - this.lastCardAdTime < this.config.card_ad_cooldown) {
            console.log('AdManager: Interstitial in cooldown')
            return
        }

        if (tools.isRelease()) {
            // #ifdef MP-WEIXIN
            if (this.cardAd) {
                this.cardAd.show().then(() => {
                    this.lastCardAdTime = now
                }).catch((err) => {
                    console.error('AdManager: Show Interstitial Failed', err)
                })
            }
            // #endif
        } else {
            console.log('AdManager: Dev Mode - Mock Interstitial Ad Success')
            this.lastCardAdTime = now
            uni.showToast({
                title: '[模拟] 插屏广告已显示',
                icon: 'none'
            })
        }
    }
}

export default AdManager.getInstance()
