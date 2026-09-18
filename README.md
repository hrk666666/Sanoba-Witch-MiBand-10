# Sanoba-Witch-MiBand-9-10

[![License](https://img.shields.io/badge/license-GPL_3.0-orange.svg)](https://www.gnu.org/licenses/gpl-3.0.html)
![Platform](https://img.shields.io/badge/Platform-Xiaomi%20Mi%20Band%209%2F10-brightgreen.svg)
![Language](https://img.shields.io/badge/Language-JavaScript-yellow.svg)

为小米手环 9 / 10 适配的《魔女的夜宴》移植版，内置一套平台无关的 **视觉小说（VN）引擎**。

- **上游项目**：[futrw4v/Sanoba-Witch-MiBand-9Pro](https://github.com/futrw4v/Sanoba-Witch-MiBand-9Pro)（小米手环 9 Pro 版，已存档）
- **本仓库**：同步上游最终版 1.1.2+5 全部功能，并基于 [hrk666666/Sanoba-Witch-MiBand-10](https://github.com/hrk666666/Sanoba-Witch-MiBand-10) 的窄屏适配逻辑，同时支持手环 9 与手环 10。

## 与上游 9Pro 版的关系

本版本 = 上游 1.1.2+5（新引擎）+ 手环 10 窄屏 UI 适配 + 手环 9 兼容 + **VN 引擎化重构**。

### 同步自上游的新功能（1.1.2+5）

| 功能 | 说明 |
|------|------|
| 快进 | 长按「快进」按钮，松开停止；整句瞬显后每 50ms 自动进入下一句 |
| EV/SD 事件 CG | SD 图已完整渲染（292 张）；EV 渲染层已保留（上游 EV 图未完成，在 feature/ev 分支） |
| 隐藏 UI | 全屏阅读模式，点击屏幕恢复 |
| 引擎模块化 | scriptEngine.js 独立引擎文件 |
| 剧本新格式 | 0标签/1章节/2背景/3对话/4选项/5EV/6跳转，修复跨章节跳转 |
| 时间显示 | 菜单顶部显示当前时间 |

## VN 引擎化重构

本仓库把「游戏内容」与「引擎」彻底解耦，引擎可直接复用于任何 VN 剧本：

```
src/engine/                  ← 平台无关引擎核心（零依赖，可跑在 Node/手环/PC）
  index.js                    统一入口 createVnEngine({adapter, onState, onFx})
  scriptRuntime.js            剧本状态机（节点 0-10，对话/选项暂停，快进/跳过/跨场景）
  variables.js                变量系统 + 手写递归下降表达式解析器（不用 eval）
  saveSystem.js               多槽位存档（storage 键值）
  resourceManager.js          资源 URI 归一化 + 预加载清单
  audioManager.js             单通道音频策略（BGM 切换 / SE 打断恢复）
  fxManager.js                特效队列（whiteflash/blackout/fadein/fadeout/vibrate）
  platformAdapter.js          平台适配层（AIoT 手环 / Node 测试双实现）

src/common/game.txt           ← 内容包：场景清单(101) + 分线规则 + 初始变量
src/common/scn/*.txt          ← 剧本（节点格式 v1.1，61382 节点）
tools/generate_game_config.py   从旧 constants.js SCN_LIST 生成 game.txt
tools/validate_game.py          内容包校验器（场景引用/节点语法/资源存在性）
tools/convert_script.py         FreeMote JSON → 剧本格式转换
tests/run-tests.mjs             引擎单元测试（17 用例，Node 直跑）
tests/regression-real.mjs       真实内容包端到端回归（101 场景全走完）
docs/剧本格式规范v1.1.md        格式规范文档
```

### 引擎能力（按 Vela 平台真实能力裁剪）

| 能力 | 状态 | 说明 |
|------|------|------|
| 对话/选项/条件分支 | ✅ | 条件表达式 `== != > < >= <= && || !`、`rand(a,b)` |
| 变量指令 | ✅ | `f.x=1` / `f.x++` / `f.x+=2` / `f.x=rand(5,10)` |
| 立绘三槽位 | ✅ | left/center/right + fadein/fadeout/change；兼容存量 KRKR 立绘字段 |
| 背景/事件CG/SD | ✅ | bg/ev/sd 目录按 URI 加载 |
| BGM/SE | ✅ | 原生 `@system.audio`，单通道：SE 打断 BGM、结束后恢复 |
| 特效 | ✅ | 白闪/黑场/淡入淡出（@keyframes）+ 振动（@system.vibrator） |
| 存档/读档 | ✅ | 4 槽位（storage 键值），含音频状态恢复 |
| 快进/跳过 | ✅ | 长按快进、菜单跳过至下一选项 |
| 跨场景/分线 | ✅ | game.txt routes：019 → flagRoute（好感度最高进线，全 0 走 fallback） |
| 混音/语音 | ❌ | 平台单音频播放器，BGM+SE+语音无法同时 |
| 重型粒子/后台续播 | ❌ | 内存受限（闪退主因），不做 |

### 引擎用法（写一个新 VN）

```js
import { createVnEngine } from "../../engine/index.js"
import { createAiotAdapter } from "../../engine/platformAdapter.js"

const engine = await createVnEngine({
  adapter: createAiotAdapter(),          // 手环：@system.* ；PC/测试：createMemoryAdapter
  onState: (s) => render(s),             // 剧本状态 → UI
  onFx: (name) => playFx(name)           // 特效回调
})
await engine.runtime.load("001")         // 从场景开始
engine.runtime.markTextComplete()        // 打字机完成
engine.runtime.advance()                 // 下一句
engine.runtime.choose(0)                 // 选选项
engine.runtime.save() / restore(saved)   // 存读档
```

换平台只需换 adapter（audio/file/storage/vibrate 的实现）。

## 环境要求

- **Node.js**: >= 8.10
- **aiot-toolkit**: 小米 AIoT QuickApp 开发框架
- **设备**: 小米手环 9 / 小米手环 10

### 开发依赖

```json
{
  "@aiot-toolkit/jsc": "^1.0.3",
  "aiot-toolkit": "^2.0.5"
}
```

## 安装与构建

```bash
npm install     # 安装依赖
npm start       # 开发模式（可加 --watch 监听）
npm run build   # 构建
npm run release # 发布（产物 .rpk，经小米穿戴 App 安装）
```

## 测试

```bash
node tests/run-tests.mjs        # 引擎单元测试（17 用例）
node tests/regression-real.mjs  # 真实内容包端到端回归（101 场景走完 + 读档）
python3 tools/validate_game.py  # 内容包校验（场景引用/节点语法/资源存在性）
```

## 剧本

剧本位于 `src/common/scn/`，节点格式 v1.1（向后兼容 v1.0 的 0-6）：

| 标识符 | 类型 | 数组结构 |
| :--- | :--- | :--- |
| **0** | 节点标签 | `[0, "label_name"]` |
| **1** | 章节标题 | `[1, "章节标题"]` |
| **2** | 背景 | `[2, "bg_name"]` |
| **3** | 对话 | `[3, "说话人", "内容", [立绘列表?]]` |
| **4** | 选项 | `[4, [["文字", "跳转", "表达式", "条件?"], ...]]` |
| **5** | EV/SD 事件 | `[5, "sdXXX" / "evXXX" / null]` |
| **6** | 跳转 | `[6, "target_label"]` |
| **7** | 立绘 | `[7, "角色_表情", "left|center|right", "fadein|fadeout|change"]` |
| **8** | 音乐 | `[8, "曲名", "bgm|se", "loop|once"]` |
| **9** | 特效 | `[9, "whiteflash|blackout|fadein|fadeout|vibrate"]` |
| **10** | 变量 | `[10, "f.x = 1, f.y++"]` |

- 对话第 4 字段（立绘列表）兼容存量 KRKR 格式：`[["角色名", "出|中|左|右|百分比", "表情号", "服装"], ...]`
- 完整规范见 `docs/剧本格式规范v1.1.md`
- 转换工具：`tools/convert_script.py`（输入 FreeMote `PsbDecompile.exe` 导出的 `.json` 剧本）

## 免责声明

仓库内所有自行编写的源代码、脚本均以 [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html) 协议开源。

- `src/common/bg/`、`src/common/sd/` 下的游戏素材版权归 **Yuzusoft** 所有，仅用于技术展示
- 汉化文本版权归暗鸽汉化组
- 请支持正版，勿用于商业用途
