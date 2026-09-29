# 第三方素材与来源 / Third-party materials

本项目的代码、剧情与陪练文字、熟客与玩家画像以 [MIT 协议](LICENSE) 发布。
下面这些内容来自第三方，按各自的条款使用，在此注明来源并致谢。

## 字体（SIL Open Font License 1.1）

页面里内嵌的是按需裁出的字体子集（`styles/fonts.css`，由 `tools/fonts.py` 生成）。

| 字体 | 版权 | 协议 |
|---|---|---|
| 马善政毛笔楷书 Ma Shan Zheng | Copyright 2018 The MaShanZheng Project Authors (https://github.com/googlefonts/mashanzheng) | [OFL 1.1](licenses/OFL-MaShanZheng.txt) |
| JetBrains Mono | Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono) | [OFL 1.1](licenses/OFL-JetBrainsMono.txt) |

## 棋谱与题目数据

- **定式**（`src/data/tree.js`）：主要来自 [RenLib](https://www.renju.se/renlib/) 附带的《连珠定式全集》
  AllRenjuOpenings.lib，以及花月、浦月两份专题库 D4.lib、I7.lib。本项目将这些棋库转换为内部数据格式；英文与拼音注释为项目转写。
- **白 4 防点的中文说明**：部分整理自[励精连珠教室](https://www.ljrenju.com/croom/index.htm)。
- **杀法练习**（`src/data/puzzles.js`）：31 道题来自 RenLib 附带的连续冲四题库 VCF.lib，每道题都用本项目的引擎重新验证过有解。
- **开局库**（定式树里标为「开局库」的分支和胜率）：用开源连珠程序 [Rapfi](https://github.com/dhbloo/rapfi)（GPL-3.0）逐局推演得到。
  本项目只收录推演出的下法和胜率估计，不包含 Rapfi 的代码和网络权重。
- **开局名称与理论评价**：参考 Wikipedia 条目 [Renju opening pattern](https://en.wikipedia.org/wiki/Renju_opening_pattern)。
- **开局规则的说明**：参考 Wikipedia 条目 [Renju](https://en.wikipedia.org/wiki/Renju) 与 [Gomoku](https://en.wikipedia.org/wiki/Gomoku)。

以上数据的权利归原作者所有。若权利人对收录方式有异议，请提 issue，我们会及时调整或移除。

## 运行时依赖（打包进页面）

| 包 | 协议 |
|---|---|
| [Vue](https://github.com/vuejs/core)、[Pinia](https://github.com/vuejs/pinia)、[Vue Router](https://github.com/vuejs/router) | MIT |
| [VueUse](https://github.com/vueuse/vueuse) | MIT |
| [Reka UI](https://github.com/unovue/reka-ui) | MIT |
| [Lucide](https://github.com/lucide-icons/lucide)（图标） | ISC |

构建工具（Vite、vite-plugin-singlefile 等）和测试工具（Playwright）只在开发时使用，不进入发布的页面。
