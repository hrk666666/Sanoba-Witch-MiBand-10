# Sanoba-Witch-MiBand-9-10

[![License](https://img.shields.io/badge/license-GPL_3.0-orange.svg)](https://www.gnu.org/licenses/gpl-3.0.html)
![Platform](https://img.shields.io/badge/Platform-Xiaomi%20Mi%20Band%209%2F10-brightgreen.svg)
![Language](https://img.shields.io/badge/Language-JavaScript-yellow.svg)

为小米手环 9 / 10 适配的《魔女的夜宴》移植版。

- **上游项目**：[futrw4v/Sanoba-Witch-MiBand-9Pro](https://github.com/futrw4v/Sanoba-Witch-MiBand-9Pro)（小米手环 9 Pro 版，已存档）
- **本仓库**：同步上游最终版 1.1.2+5 全部功能，并基于 [hrk666666/Sanoba-Witch-MiBand-10](https://github.com/hrk666666/Sanoba-Witch-MiBand-10) 的窄屏适配逻辑，同时支持手环 9 与手环 10。

## 与上游 9Pro 版的关系

本版本 = 上游 1.1.2+5（新引擎）+ 手环 10 窄屏 UI 适配 + 手环 9 兼容。

### 同步自上游的新功能（1.1.2+5）

| 功能 | 说明 |
|------|------|
| 快进 | 长按「快进」按钮，松开停止；整句瞬显后每 50ms 自动进入下一句 |
| EV/SD 事件 CG | SD 图已完整渲染（292 张）；EV 渲染层已保留（上游 EV 图未完成，在 feature/ev 分支） |
| 隐藏 UI | 全屏阅读模式，点击屏幕恢复 |
| 引擎模块化 | scriptEngine.js 独立引擎文件 |
| 剧本新格式 | 0标签/1章节/2背景/3对话/4选项/5EV/6跳转，修复跨章节跳转 |
| 时间显示 | 菜单顶部显示当前时间 |

### 本仓库的适配改动

1. **designWidth 212**（手环 10 适配基准）：手环 9（192px 物理宽）自动等比缩放 ≈0.9x，一套 UI 双机型通吃
2. **窄屏 UI 体系**：对话框 120px（圆角 10、距底 20）、说话人框上移 160px、字号 10-20px（默认 18）、菜单按钮高 46px
3. **首页 flex 自适应布局**：按钮组居中自适应，替代上游的绝对定位
4. **修复**：
   - 长按呼出菜单不再依赖 `DEBUG` 开关（正式版可用）
   - 快进遇选项时说话人显示错误（取整个节点数组的 bug）
   - `index.ux` / 首页 `prompt` 模块未导入
   - 标题图改用体积小 10 倍的 jpg 版
5. **资源**：bg 107 张采用上游压缩版（平均小 20%），SD 图 292 张补齐，剧本 101 个全部换成新格式

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

## 剧本

剧本位于 `src/common/scn/`，节点格式与上游 1.1.2+ 一致：

| 标识符 | 类型 | 数组结构 |
| :--- | :--- | :--- |
| **0** | 节点标签 | `[0, "label_name"]` |
| **1** | 章节标题 | `[1, "章节标题"]` |
| **2** | 背景 | `[2, "bg_name"]` |
| **3** | 对话 | `[3, "说话人", "内容", [立绘列表?]]` |
| **4** | 选项 | `[4, [["文字", "跳转", "表达式"], ...]]` |
| **5** | EV/SD 事件 | `[5, "sdXXX" / "evXXX"]` |
| **6** | 跳转 | `[6, "target_label"]` |

转换工具：`tools/convert_script.py`（输入 FreeMote `PsbDecompile.exe` 导出的 `.json` 剧本）

## 免责声明

仓库内所有自行编写的源代码、脚本均以 [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html) 协议开源。

- `src/common/bg/`、`src/common/sd/` 下的游戏素材版权归 **Yuzusoft** 所有，仅用于技术展示
- 汉化文本版权归暗鸽汉化组
- 请支持正版，勿用于商业用途
