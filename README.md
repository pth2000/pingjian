# 枰间 Pingjian

枰间是一款运行在浏览器中的五子棋与连珠应用，支持对弈、定式研习、杀法练习和对局复盘。

[在线体验](https://pth2000.github.io/pingjian/) · [问题反馈](https://github.com/pth2000/pingjian/issues) · [第三方来源](THIRD_PARTY.md)

项目无需账号或后端服务。AI 搜索在本地运行，棋谱、战绩和练习进度保存在浏览器中。生产版可构建为单页离线应用。

## 功能

- 人机对弈和本地双人对弈，支持自选执子、猜先、悔棋、认输和复盘。
- 6 位行棋风格不同的电脑对手，提供 4 档难度。
- 无禁手、标准五子棋和连珠棋规。
- Swap、Swap2、Pro、Long Pro、RIF、山口、索索夫-8 和塔拉古奇-10 开局规则。
- 候选点提示、胜率走势、失误标记和逐手复盘。
- 连珠 26 种标准开局的定式浏览与谱内练习。
- 31 道连续冲四（VCF）练习题。
- 多角色档案、战绩、棋谱、成就和数据备份。
- 可选的人物与故事内容，可在创建角色时关闭。
- 响应式布局，支持桌面、平板和手机。

## 快速开始

在线版可直接访问 [pth2000.github.io/pingjian](https://pth2000.github.io/pingjian/)。

本地开发需要 Node.js 22.12 或更高版本：

```bash
git clone https://github.com/pth2000/pingjian.git
cd pingjian
npm ci
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版到 `dist/` |
| `npm run preview` | 预览生产构建 |
| `npm run check` | 检查模块导入和未使用导出 |
| `npm test` | 构建并运行 Playwright 回归测试 |
| `npm test -- <keyword>` | 只运行文件名包含关键字的测试 |
| `npm run release` | 构建离线发布包 |

首次运行浏览器测试前，需要安装 Chromium：

```bash
npx playwright install chromium
```

## 离线发布

```bash
npm run release
```

构建完成后会生成：

```text
release/
├─ pingjian/
│  ├─ index.html
│  ├─ coaches.js
│  ├─ avatars.js
│  └─ README.txt
└─ pingjian.zip
```

解压 `pingjian.zip` 后双击 `index.html` 即可离线运行。

## 项目结构

```text
src/
├─ engine/      AI 搜索、局面评估与棋规判定
├─ game/        对局流程、存档与复盘
├─ openings/    定式浏览与练习
├─ puzzles/     杀法练习
├─ components/  Vue 组件
├─ views/       页面组件
├─ stores/      Pinia 状态
├─ story/       可选人物与故事内容
├─ features/    成就等附加功能
└─ data/        定式树与题目数据
```

界面使用 Vue 3、Pinia 和 Vue Router；棋盘由 Canvas 绘制，AI 默认在 Web Worker 中运行。Vite 生产构建会将代码、样式、字体和 Worker 内联到 `index.html`。

`public/coaches.js` 和 `public/avatars.js` 包含电脑对手的台词、配置和头像，可以独立定制。

## 数据与隐私

角色、设置、战绩、棋谱和练习进度均保存在浏览器的 `localStorage` 中，不会上传到远程服务器。

更换设备或清理浏览器数据前，请在“我的 → 数据”中导出备份。改名前导出的备份仍可导入。

## 部署

GitHub Pages 工作流位于 `.github/workflows/pages.yml`，推送到 `master` 分支时会自动构建并发布 `dist/`。

首次发布前，需要在仓库的 **Settings → Pages → Build and deployment** 中将 Source 设为 **GitHub Actions**。

## 贡献

欢迎提交 Issue 和 Pull Request。提交代码前请至少运行：

```bash
npm run check
npm run build
```

涉及交互、棋规、存档或响应式布局的修改，请同时运行相关 Playwright 测试。新增第三方内容时，请在 [THIRD_PARTY.md](THIRD_PARTY.md) 中记录来源与许可信息。

## 许可

项目代码及原创内容采用 [MIT License](LICENSE) 发布。字体、定式、题目数据及其他第三方内容遵循各自条款，详见 [THIRD_PARTY.md](THIRD_PARTY.md)。
