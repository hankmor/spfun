# 春节嘴替 - 2026马年过年必备小程序

> AI 嘴替 + 趣味存单 + 开运头像，让你的春节社交游刃有余！

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd springfun
```

### 2. 安装依赖

```bash
npm install              # 前端依赖
npm run setup:cloud      # 云函数依赖
```

### 3. 配置 AppID

在以下文件中替换 `YOUR_APPID_HERE` 为你的微信小程序 AppID:

- `src/manifest.json`
- `project.config.json`

### 4. 导入微信开发者工具

1. 打开微信开发者工具
2. 导入项目，选择此目录
3. 点击"云开发"按钮，初始化云环境

### 5. 部署云函数

右键 `cloudfunctions/chat-agent` -> **上传并部署: 云端安装依赖**

### 6. 配置环境变量

云开发控制台 -> 云函数 -> chat-agent -> 配置 -> 环境变量:

- `DEEPSEEK_API_KEY`: 你的 DeepSeek API Key

## 详细文档

- **[部署指南](./docs/deployment-guide.md)** - 完整的部署流程
- **[产品规划](./docs/product.md)** - 产品设计文档

## 核心功能

### 💬 AI 嘴替

四大经典角色 AI 对话，帮你应对春节尬聊：

- 势利眼二姨
- 催婚大姑
- 凡尔赛邻居
- 严厉二舅

### 💰 妈妈银行

生成趣味"压岁钱存单"，调侃童年回忆。

### 🧧 开运头像

马年限定头像装饰（待开发）。

## 技术栈

- **前端**: UniApp (Vue3 + Vite)
- **后端**: 微信云开发 (Serverless)
- **AI**: DeepSeek API

## 开发命令

```bash
npm run dev:mp-weixin          # 开发模式
npm run build:mp-weixin        # 生产构建
npm run setup:cloud            # 安装云函数依赖
```

## 目录结构

```
/springfun
├── src/                       # 前端源码
│   ├── pages/                # 页面
│   ├── components/           # 组件
│   └── manifest.json         # 小程序配置
├── cloudfunctions/           # 云函数
│   └── chat-agent/           # AI 聊天服务
├── docs/                     # 文档
└── package.json              # 依赖管理
```

## License

MIT

---

**祝你 2026 马年发大财！🐴💰**
