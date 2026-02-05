<script>
export default {
  onLaunch: function () {
    console.log('App Launch')
    // Initialize WeChat Cloud
    if (typeof wx !== 'undefined' && wx.cloud) {
        wx.cloud.init({
            env: 'cloud1-6g60xvpwf70ce125', // Best practice: Specify Env ID
            traceUser: true
        })
    }
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
}
</script>

<style>
/*每个页面公共css */
</style>
