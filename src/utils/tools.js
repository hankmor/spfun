const _getEnv = function () {
    // 兼容非小程序环境，防止报错
    const accountInfo = (uni.getAccountInfoSync && uni.getAccountInfoSync()) || {};
    const env = (accountInfo.miniProgram && accountInfo.miniProgram.envVersion) ||
        (process.env.NODE_ENV === 'development' ? 'develop' : 'release');

    console.log("Current Env: ", env);
    return env
}

export default {
    isDev: () => {
        return _getEnv() == 'develop'
    },
    isTrial: () => {
        return _getEnv() == "trial"
    },
    isRelease: () => {
        return _getEnv() == "release"
    },
    getEnv: _getEnv
}