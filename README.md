# 学习陪伴助手

一款基于 Electron 的 AI 驱动学习陪伴桌面应用，帮助你制定学习计划、记录每日学习日报、生成周报分析。

## 功能特性

- **AI 智能计划拆解** - 输入学习目标或上传 PDF，AI 自动拆解为每日任务
- **每日学习日报** - 任务清单、学习计时器、笔记记录、完成总结
- **周报生成** - AI 分析本周学习情况，生成关键成果和学习建议
- **推荐链接** - AI 根据学习主题推荐相关学习资源
- **本地数据存储** - 所有数据存储在本地 SQLite 数据库，隐私安全

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 41 |
| 前端 | React 19 + React Router |
| 状态管理 | Zustand |
| 构建 | Vite 8 + electron-builder |
| 数据库 | better-sqlite3 |
| AI 接口 | OpenAI 兼容 API |

## 支持的 AI 服务商

- **阿里云百炼**（推荐）- 支持 Qwen、DeepSeek、GLM 等多模型
- **DeepSeek 官方**
- **Kimi（月之暗面）**
- **智谱 GLM 官方**

## 快速开始

### 环境要求

- Node.js 20+
- Windows / macOS / Linux

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建打包

```bash
npm run build
```

打包后的安装包位于 `release/` 目录。

## 项目结构

```
study-companion/
├── electron/           # Electron 主进程
│   ├── main.ts         # 主进程入口
│   ├── preload.ts      # 预加载脚本
│   └── db.ts           # SQLite 数据库
├── src/                # React 渲染进程
│   ├── components/     # 通用组件
│   ├── pages/          # 页面组件
│   ├── services/       # AI 和数据库服务
│   ├── store/          # Zustand 状态管理
│   └── styles/         # 全局样式
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 配置

首次使用需要在设置页面配置 AI 服务商和 API Key：

1. 打开应用，点击左侧「设置」
2. 选择 AI 服务商（推荐阿里云百炼）
3. 输入 API Key
4. 保存配置

### 获取 API Key

| 服务商 | 控制台地址 |
|--------|-----------|
| 阿里云百炼 | https://bailian.console.aliyun.com/ |
| DeepSeek | https://platform.deepseek.com/ |
| Kimi | https://platform.moonshot.cn/ |
| 智谱 GLM | https://open.bigmodel.cn/ |

## 数据存储

所有数据存储在本地：

- **开发环境**: 项目根目录 `study-companion.db`
- **生产环境**: 用户数据目录 `%APPDATA%/study-companion/study-companion.db`

## License

MIT
