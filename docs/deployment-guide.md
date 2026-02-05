# 微信云开发 + UniApp 部署完全指南 (2026修订版)

> **核心逻辑说明**：
> 本项目是 **UniApp** 项目，**不能**直接像原生小程序那样运行。
> 必须先通过 UniApp 编译器将 `.vue` 代码编译为 `.wxml` 代码（生成 `dist` 目录），微信开发者工具才能识别。

---

## 🛑 第一步：本地环境准备 (至关重要)

你需要打开**两个**终端窗口（或者 VSCode 的两个终端标签）。

### 终端 A：负责前端编译 (保持运行)

这是让小程序界面跑起来的关键。

1. 进入项目根目录：
   ```bash
   cd /Users/hank/workspace/mine/springfun
   ```
2. 安装依赖 (如果没装过)：
   ```bash
   npm install
   ```
3. **启动编译模式** (重要！)：
   ```bash
   npm run dev:mp-weixin
   ```

   - **成功标志**：终端显示绿色字样 `READY`，并提示 `watching...`。
   - **注意**：**不要关闭这个窗口**！它会实时监听你的代码修改并编译。

### 终端 B：负责云函数安装 (一次性)

这是让 AI 嘴替能说话的关键。

1. 进入项目根目录：
   ```bash
   cd /Users/hank/workspace/mine/springfun
   ```
2. 执行一键安装脚本：
   ```bash
   npm run setup:cloud
   ```

   - (这会自动进入 `cloudfunctions` 下的每个文件夹执行 `npm install`)

---

## 🛠 第二步：微信开发者工具配置

### 1. 导入项目

- 打开微信开发者工具。
- **导入目录**：选择项目根目录 `/Users/hank/workspace/mine/springfun` (注意：**不是** `dist` 目录，选根目录即可，配置文件会自动指向 `dist`)。
- **AppID**：填写你的 `wx2cebf42f66388e80`。

### 2. 验证路径配置

导入后，如果在模拟器看到 "未找到入口页面" 或白屏，请检查工具栏上方的路径。

- 正确结构应为：`dist/dev/mp-weixin` (由 `project.config.json` 的 `miniprogramRoot` 控制)。
- 如果你看到的是 Vue 源码，说明编译没跑起来（请回看第一步）。

---

## ☁️ 第三步：云开发部署 (核心变动点)

微信云开发面板偶尔会改版，请认准以下操作流：

### 1. 初始化环境

1. 点击工具栏上的 **“云开发”** 图标。
2. 如果提示“未开通”，请点击开通，创建一个环境（建议命名 `prod-springfun`）。
3. 复制你的 **环境ID** (例如 `prod-xxxx-123456`)。

### 2. 多环境适配 (代码注入)

微信云开发现在推荐显示指定环境 ID。
打开 `src/App.vue` (或 `src/main.js`) 检查初始化代码：

```javascript
// 如果你还没配置，请在 src/App.vue 的 onLaunch 中添加：
wx.cloud.init({
  env: "你的环境ID", // 刚才复制的 ID
  traceUser: true,
});
```

### 3. 部署云函数 (Chat Agent)

1. 在开发者工具左侧的文件树中，找到 **`cloudfunctions`** 文件夹。
2. 这里的文件夹图标应该带有一朵小云或且文件夹名未灰显。
   - _如果文件夹是灰的_：右键 `cloudfunctions` -> “当前环境” -> 选择你刚才创建的环境。
3. 展开目录，右键点击 **`chat-agent`** 文件夹。
4. 选择 **“上传并部署: 云端安装依赖”** (不要选上传所有文件)。
   - _等待提示“上传成功”_。
5. 同样步骤部署 **`unlock-limit`** 文件夹。

---

## ⚙️ 第四步：数据库与配置 (重构版)

既然我们升级到了“动态配置”，这一步必须做：

### 1. 创建数据库集合

打开 **云开发控制台** -> **数据库**：

1. 点击 **+** 号，创建集合 `app_config`。
2. 点击 **+** 号，创建集合 `usage_logs`。
3. 这里的权限设置建议选 **“所有用户可读，仅创建者可写”** (对于配置表)。

### 2. 写入全局配置

点击 `app_config` 集合 -> **添加记录** -> **默认模式**，填入以下 JSON：

```json
{
  "_id": "global",
  "chat_daily_limit": 1000,
  "ad_enabled": false,
  "ad_unit_id": "目前未开通可留空",
  "share_title": "2026马年过年神器"
}
```

- **注意**：`_id` 必须是 `"global"`，代码是写死读取这个 ID 的。

### 3. 配置 API Key (环境变量)

打开 **云开发控制台** -> **云函数** -> **chat-agent** -> **版本与配置** -> **配置** -> **环境变量**：

- 添加 Key: `DEEPSEEK_API_KEY`
- 添加 Value: `sk-你的DeepSeek密钥`

---

## ✅ 第五步：最终验证

1. **重启工具**：有时候缓存会导致奇怪问题，点击工具栏 -> 项目 -> 重新打开此项目。
2. **看控制台**：
   - 前端控制台 (`console`) 不应有红色报错。
   - 如果有 `CloudID` 相关的报错，检查是否在 `App.vue` 里正确 `init` 了云环境。
3. **发一条消息**：
   - 在聊天框输入“你好”。
   - 观察 Network 面板 (或 Cloud 面板)，看 `chat-agent` 是否被调用。

---

## 🆘 常见救援 Q&A

**Q: 终端 A 报错 `'uni' 不是内部或外部命令`？**
A: 请运行 `npm install`。UniApp 的 CLI 包含在依赖里。

**Q: 开发者工具里找不到 `cloudfunctions` 目录？**
A: 检查 `project.config.json` 里是否有 `"cloudfunctionRoot": "cloudfunctions/"`。如果有但没显示，右键项目根目录 -> “同步云函数列表”。

**Q: 云函数调用报错 `Error: errCode: -404011 cloud function execution error`**
A:

1. 检查云端是否安装了依赖 (axios)。
2. 检查环境变量 `DEEPSEEK_API_KEY` 是否配置。
3. 去云控制台 -> 云函数日志 查看具体报错堆栈。
