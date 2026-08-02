# Sanoba-Witch-MiBand-10

[![License](https://img.shields.io/badge/license-GPL_3.0-orange.svg)](https://www.gnu.org/licenses/gpl-3.0.html)
![Platform](https://img.shields.io/badge/Platform-Xiaomi%20Mi%20Band%2010-brightgreen.svg)
![Language](https://img.shields.io/badge/Language-JavaScript-yellow.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

## 项目简介

本项目是 [Sanoba-Witch-MiBand-9Pro](https://github.com/futrw4v/Sanoba-Witch-MiBand-9Pro) 的小米手环 10 移植版本。原版项目为小米手环 9 Pro 开发，本项目针对手环 10 的屏幕尺寸与交互特性进行了全面适配，包括 UI 布局调整、对话框重构、选项按钮居中优化等，使视觉小说的阅读体验在手环 10 的窄屏设备上达到最佳效果。

本项目使用小米 AIoT 开发框架（aiot-toolkit）构建，运行于小米手环 10 的 QuickApp 环境中。

## ⚠️ 版权声明与法律说明

**本仓库仅包含自行编写的源代码、脚本及工具，不包含任何原作游戏资源。**

### 代码许可

本项目所有自行编写的源代码、脚本及文档均以 [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html) 协议开源。您可以自由地使用、修改和分发本项目代码，但必须遵守 GPL v3.0 的相关条款。

### 游戏内容版权

- 《魔女的夜宴》（サノバウィッチ）是 **Yuzusoft（柚子社）** 的商业作品
- 游戏剧情文本、角色设定、美术素材、音乐音效等一切游戏内容版权归 **Yuzusoft** 所有
- 本项目**不内置、不附带、不分发**任何原作游戏资源
- 如需运行本项目，请自行获取正版游戏资源并按照本说明进行资源转换
- **请勿将本项目用于任何商业用途**
- **请在支持正版的前提下进行研究与学习**
- 若相关权利方认为本项目存在侵权行为，请通过 Issue 联系，我们将立即删除相关内容

### 汉化资源

本项目使用的汉化文本资源来源于暗鸽汉化组。汉化文本的版权归原汉化组所有，仅用于技术研究与学习目的。

## 已实现功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 完整剧本引擎 | ✅ | 支持对话、分支选项、章节切换、标签跳转 |
| UI 交互系统 | ✅ | 适配手环 10 窄屏，点击推进对话，长按/侧滑呼出菜单 |
| 背景渲染 | ✅ | 根据剧本指令动态切换背景图片 |
| 存档系统 | ✅ | 8 个存档位，支持保存、读取、删除 |
| 设置系统 | ✅ | 文字显示速度、字号可调 |
| 多角色路线 | ✅ | 宁々、めぐる、紬、憧子、和奏五条个人线，基于好感度 flag 自动判定 |
| 打字机效果 | ✅ | 逐字显示对话文本，支持跳过 |
| 章节标题显示 | ✅ | 进入新章节时显示章节名称 |

## TODO

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 特殊 CG 渲染 | 中 | 支持特殊 CG 图片展示与鉴赏模式 |
| 人物立绘渲染 | 中 | 在对话中显示角色立绘 |
| 隐藏 UI 按钮 | 低 | 全屏阅读模式 |
| 快进按钮 | 低 | 一键跳过已读文本 |
| 自动播放 | 低 | 自动推进对话 |

## 环境要求

- **Node.js**: >= 8.10
- **aiot-toolkit**: 小米 AIoT QuickApp 开发框架
- **设备**: 小米手环 10（设计宽度 212px）

### 开发依赖

```json
{
  "@aiot-toolkit/jsc": "^1.0.3",
  "aiot-toolkit": "^2.0.5"
}
```

## 安装与构建

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式

```bash
npm start
# 或
npm run start -- --watch  # 文件监听模式
```

### 3. 构建

```bash
npm run build
```

### 4. 发布

```bash
npm run release
```

构建产物为 `.rpk` 文件，可通过小米穿戴应用安装到手环设备。

## 资源准备指南

**本仓库不包含任何原作游戏资源。** 运行前需自行准备以下资源并放入指定目录。

### 资源提取流程

```
原版游戏 → KrkrExtract 提取 → FreeMote 转换 → convert_script.py 压缩 → 放入项目
```

#### 步骤一：提取原始资源

使用 [KrkrExtract](https://github.com/xmoezzz/KrkrExtract) 从原版游戏中提取 `.scn` 剧本文件和其他资源。

#### 步骤二：转换剧本格式

使用 [FreeMote](https://github.com/UlyssesWu/FreeMote) 中的 `PsbDecompile.exe` 将 `.scn` 文件转换为 `.json` 格式：

```bash
PsbDecompile.exe <input.scn> -o <output.json>
```

#### 步骤三：压缩剧本数据

使用本项目提供的转换工具将 `.json` 转换为紧凑数组格式，以适配手环有限的存储空间：

```bash
python tools/convert_script.py <输入目录> <输出目录>
```

#### 步骤四：放置资源

将转换后的文件放入对应目录：

```
src/common/
├── bg/           # 背景图片（.jpg 格式）
│   ├── 空_青空.jpg
│   ├── 学院_教室モブ授業中a.jpg
│   └── ...
├── scn/          # 剧本数据（.txt 格式，convert_script.py 输出）
│   ├── 001.共通－オナニーマスター.ks.txt
│   ├── 002.共通－欠片吸収.ks.txt
│   └── ...
├── logo.png      # 应用图标
└── title_bg.png  # 标题背景图片
```

### 图片处理建议

为适配手环 10 的 212px 屏幕，建议对背景图片进行以下处理：

- 分辨率：适配 212px 宽度，保持宽高比
- 格式：JPEG
- 质量：适当压缩以减小包体积，建议质量参数 60-80
- 文件名：保持原始日文文件名，代码中通过文件名引用

## 剧本数据结构详解

`tools/convert_script.py` 将原始剧本转换为紧凑的 JSON 数组格式。转换后的文件由一系列数组组成，每个数组的第一个元素为类型标识符。

### 节点类型

#### 0 - 标签节点（Label）

```json
[0, "label_name"]
```

定义跳转目标点。选项跳转和无条件跳转均通过标签名定位。

#### 1 - 背景切换（Background）

```json
[1, "bg_name"]
```

切换当前显示的背景图片。`bg_name` 对应 `src/common/bg/` 目录下的文件名（不含扩展名）。

#### 2 - 对话（Dialogue）

```json
[2, "说话人", "对话内容", [立绘列表]]
```

- `说话人`：角色名称，为空字符串时表示旁白
- `对话内容`：对话文本内容
- `立绘列表`：可选，仅在立绘状态变化时出现。格式为 `[[角色名, 位置, 表情, 服装], ...]`

#### 3 - 选项（Selection）

```json
[3, [["选项文字1", "目标标签1", "表达式1"], ["选项文字2", "目标标签2", "表达式2"]]]
```

- `选项文字`：显示给玩家的选项文本
- `目标标签`：选择后跳转到的标签名
- `表达式`：可选，选择后执行的变量操作（如 `f.nen_flag++`）

#### 4 - 章节标题（Title）

```json
[4, "章节标题"]
```

更新当前章节标题，进入新章节时显示。

### 变量系统

游戏使用 `gameFlags` 对象存储玩家选择产生的变量，用于路线判定：

| 变量名 | 说明 |
|--------|------|
| `nen_flag` | 宁々好感度 |
| `meg_flag` | めぐる好感度 |
| `tsu_flag` | 紬好感度 |
| `tou_flag` | 憧子好感度 |
| `wak_flag` | 和奏好感度 |

选项中的表达式支持以下操作：
- `f.var++`：变量自增
- `f.var--`：变量自减
- `f.var=value`：变量赋值

### 路线判定

在共通线结束时（场景 019），系统根据各角色好感度自动判定进入哪条个人线：

```
好感度最高的角色 → 进入该角色个人线
所有好感度为 0 → 进入单身线
```

## 项目结构

```
Sanoba-Witch-MiBand-10/
├── src/
│   ├── app.ux                     # 应用入口，全局状态管理
│   ├── manifest.json              # 应用配置（包名、版本、路由、权限）
│   ├── config-watch.json          # 手环设备配置
│   ├── common/
│   │   ├── constants.js           # 全局常量（DEBUG 开关等）
│   │   ├── logo.png               # 应用图标
│   │   ├── title_bg.png           # 标题页背景
│   │   ├── bg/                    # 游戏背景图片（需自行准备）
│   │   └── scn/                   # 剧本数据（需自行准备）
│   └── pages/
│       ├── index/
│       │   └── index.ux           # 主菜单页面
│       ├── game/
│       │   └── game.ux            # 核心游戏引擎
│       ├── data/
│       │   └── data.ux            # 存档管理页面
│       ├── settings/
│       │   └── settings.ux        # 系统设置页面
│       └── about/
│           └── about.ux           # 关于页面
├── tools/
│   └── convert_script.py          # 剧本格式转换工具
├── .eslintignore                  # ESLint 忽略配置
├── .gitignore                     # Git 忽略配置
├── LICENSE                        # GPL v3.0 许可证
├── README.md                      # 项目文档
└── package.json                   # 项目配置与依赖
```

### 核心模块说明

#### `app.ux` - 应用入口

管理全局状态，提供 `globalGameState` 用于存档恢复时的页面间数据传递。

#### `game.ux` - 游戏引擎

核心模块，职责包括：
- 剧本加载与解析
- 对话逐字显示（打字机效果）
- 背景切换
- 选项分支处理
- 变量系统与路线判定
- 存档状态保存与恢复
- 菜单系统（存档、读档、跳过、返回主页）

#### `data.ux` - 存档管理

提供 8 个存档位，支持：
- 保存当前游戏进度（含场景 ID、行号、背景、变量等）
- 读取已有存档
- 长按删除存档

#### `settings.ux` - 系统设置

可调节参数：
- 文字显示速度（20-100ms/字）
- 文字大小（10-20px）

设置通过 localStorage 持久化存储。

#### `about.ux` - 关于页面

展示项目信息，支持侧滑和长按返回。

## 感谢名单

### 原版项目
- [Sanoba-Witch-MiBand-9Pro](https://github.com/futrw4v/Sanoba-Witch-MiBand-9Pro)：原版小米手环 9 Pro 移植，本项目的移植基础

### 游戏内容
- **柚子社（Yuzusoft）**：《魔女的夜宴》原作开发
- **暗鸽汉化组**：提供中文汉化文本资源

### 技术支持
- [liuyuze61](https://github.com/liuyuze61)：部分代码与逻辑参考
- **Gemini**：AI 代码辅助

### 工具链
- [GARbro-Mod](https://github.com/crskycode/GARbro) & [FreeMote](https://github.com/UlyssesWu/FreeMote)：游戏资源转换
- [KrkrExtract](https://github.com/xmoezzz/KrkrExtract)：KiriKiri 引擎资源提取
- [FFmpeg](https://ffmpeg.org/)：图片格式处理与压缩

## 相关链接

| 链接 | 说明 |
|------|------|
| [Sanoba-Witch-MiBand-9Pro](https://github.com/futrw4v/Sanoba-Witch-MiBand-9Pro) | 原版项目（手环 9 Pro） |
| [BandBBS 米坛社区](https://www.bandbbs.cn/resources/6531/) | 米坛社区资源页 |
| [aiot-toolkit](https://iot.mi.com/vela/quickapp) | 小米 AIoT QuickApp 开发框架 |
| [Yuzusoft 官网](https://yuzusoft.com/) | 柚子社官方网站 |

## 免责声明

1. 本项目为非商业、非官方的个人学习研究项目，与 Yuzusoft 无任何关联
2. 本项目不提供任何原作游戏资源的下载，所有游戏资源需用户自行从正版游戏提取
3. 本项目代码以 GPL v3.0 协议开源，游戏内容版权归 Yuzusoft 所有
4. 使用本项目产生的一切法律后果由使用者自行承担
5. 若本项目侵犯了您的合法权益，请通过 Issue 联系，我们将立即处理
