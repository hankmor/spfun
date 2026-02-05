# 常见问题与故障排除 (Troubleshooting)

## 1. 网络连接问题：VPN 与 微信云开发冲突

**现象**：
- 开启 VPN (如快连) 时，微信开发者工具无法连接云环境，报错 `cloud.callFunction:fail` 或 `network timeout`。
- 关闭 VPN 时，无法使用外部工具 (如 Antigravity / DeepSeek 官网)。

**解决方案**：
不需要频繁开关 VPN，只需**单独配置微信开发者工具**：

1.  打开微信开发者工具。
2.  顶部菜单栏：**设置 (Settings)** -> **代理设置 (Proxy)**。
3.  选择 **“不使用任何代理” (No Proxy)**。
    *   *(默认为“使用系统代理”，这会导致流量误走 VPN 通道)*
4.  保存设置，**重启开发者工具**。

**原理**：
- 让开发者工具强制直连腾讯内网/公网，不经过 VPN。
- 其他软件 (VS Code, 浏览器) 继续使用系统代理 (VPN)。

---

## 2. 云函数部署失败 (Error 145 / 504002)

**现象**：
- 上传云函数时提示 `functions execute fail` 或 `errMsg: 145 code exit unexpected`。

**原因**：
- 本地 (`node_modules`) 依赖是 Mac/Windows 版，直接上传导致 Linux 云服务器无法运行。

**解决方案**：
1.  **删除本地依赖**：进入云函数目录，删除 `node_modules` 和 `package-lock.json`。
2.  **云端安装**：右键云函数文件夹 -> 选择 **“上传并部署：云端安装依赖”**。

