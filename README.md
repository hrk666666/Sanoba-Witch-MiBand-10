# 千恋＊万花 · 小米手环移植版

《千恋＊万花》（SAGA PLANETS）完整剧情在小米手环 / Redmi Watch（Vela OS）上的运行版本。

本项目是两个上游仓库的组合移植：

| 部分 | 来源 | 说明 |
|------|------|------|
| 剧情内容（剧本 + 立绘 + 背景 + 事件图） | [qlwh-mibandported](https://github.com/hezdaaa/qlwh-mibandported) | 千恋＊万花内容包，55901 页剧本 + 809 张图片资源 |
| 游戏引擎 + 手环 UI | [Sanoba-Witch-MiBand-10](https://github.com/hrk666666/Sanoba-Witch-MiBand-10) | 平台无关的 VnEngine（data-driven）+ 手环快应用界面 |

即：**内容采用 qlwh 仓库，引擎与 UI 采用 Sanoba 仓库**，二者在本工程内合并为一个可构建 RPK 的新工程。

## 快速开始

```bash
npm ci                      # 安装依赖（网络受限时：npm ci --registry=https://registry.npmmirror.com/）
npm start                   # 模拟器 / 真机调试（aiot start --watch）
npm run release             # 构建 RPK（JSC 字节码，产物在 dist/）
npm test                    # 单测 + 端到端路线回归
npm run validate            # 内容包完整性校验（game.txt / 112 块剧本 / 跳转目标 / 资源存在性）
```

## 目录结构

```
src/
├── manifest.json           # 包名 com.hrk.qlwh.band，名称 千恋＊万花，deviceTypeList=["watch"]
├── app.ux                  # 应用入口
├── common/
│   ├── game.txt            # 引擎配置：id=senren-banka、title=千恋＊万花、scenarios.main=112 块
│   ├── scn/chunk001..112.txt  # 转换后的剧本（74504 节点）
│   ├── bg/ ch/ ev/ sd/     # 背景(98) / 立绘(141) / 事件图(570) / SD 装饰
│   ├── constants.js        # SCN_TYPE 等常量（SCN_LIST 已移除，场景由 game.txt 驱动）
│   └── logo.png / title_bg.jpg
├── engine/                 # VnEngine（平台无关）：scriptRuntime / resourceManager / saveSystem / variables …
└── pages/                  # index（首页）/ game（游戏页）/ settings / data / about
tools/
├── convert_qlwh.py         # 内容转换器（上游脚本 → 引擎剧本 v1.1）
└── validate_qlwh.py        # 内容包校验器
tests/
├── run-tests.mjs           # 引擎单测（17 项）
└── regression-qlwh.mjs     # 端到端回归：2 条主路线 + 6 条路线扫描
docs/剧本格式规范v1.1.md     # 剧本节点格式说明
```

## 转换规则（tools/convert_qlwh.py）

对上游 `scriptData1..112.txt`（每页 JSON：b/s/t/c/co/c1..c5/c1t..c5t/cg）逐页转换：

- 顺序页 → 对话节点 `[3,说话人,文本,立绘]`；背景变化 → `[2,背景]`
- 立绘 `c` → 对话第 4 字段 `[["键","center","change"]]`；消失 → `[7,"*","center","fadeout"]`
- 事件图 `cg` → `[5,资源]`（`ev*`→.jpg，其余→.png；缺资源跳过并记 missing）
- 选项页 → `[4,[[文本,目标,表达式]…]]`，目标取上游 `cNt`（含跨块 `块号@*p页`），表达式 `f.c<页>=<序号>`
- 合流（noNextPages 92 条）→ `[6,目标]`；隐藏路由（hiddenPages 6 函数）→ 多条条件 `[6,目标,条件]` + 兜底；结局 → `[6,"*gameend_<名>"]`
- 章节标记 → `[1,"CHAPTERx-y"]`

## 与上游的行为一致性

- **选项目标、合流点、隐藏路由、结局表**均按 repo1 `detail.ux` 的 `branchConfig` 逐条翻译，端到端回归覆盖：共通线、茉子线、丛雨线、小春&芦花线均可达正确结局。
- **已知上游死路由（忠实保留）**：repo1 的 `noNextPages` 将 `5925 → 6325`（5912「钓鱼」支线直接合流），导致 5926 选项页在 repo1 原版中即不可达，`c5926` 永不被设置。因此依赖 `c5926` 的**芳乃线**（9130，需 `c5926==1`）与**蕾娜线**（8460，需 `c5926==2`）在上游与本次移植中均不会触发——并非移植缺陷，而是内容源自身行为。
- 引擎扩展（向后兼容，不影响 Sanoba 原有剧本）：NEXT 节点支持条件（`node[2]`）与跨场景目标（`scnId@label`）；`sd` 资源扩展名 jpg→png。

## 版权

- 游戏内容（剧本、立绘、背景、事件图）版权归 **SAGA PLANETS**（《千恋＊万花》原厂商）所有。
- 本项目为学习与技术演示用途的移植，请勿用于商业分发。
- 引擎与 UI 逻辑分别来自上述两个开源仓库，遵循其各自许可。
