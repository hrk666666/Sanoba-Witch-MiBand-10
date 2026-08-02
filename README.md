# Sanoba-Witch-MiBand-10

[![License](https://img.shields.io/badge/license-GPL_3.0-orange.svg)](https://www.gnu.org/licenses/gpl-3.0.html)
![Platform](https://img.shields.io/badge/Platform-Xiaomi%20Mi%20Band%2010-brightgreen.svg)
![Language](https://img.shields.io/badge/Language-JavaScript-yellow.svg)

将 [Sanoba-Witch-MiBand-9Pro](https://github.com/futrw4v/Sanoba-Witch-MiBand-9Pro) 移植适配到小米手环 10 的版本。

原版项目为小米手环 9 Pro 开发，本项目针对手环 10 的屏幕尺寸和交互特性进行了适配调整。

## ⚠️ 版权声明

**本仓库仅包含自行编写的源代码、脚本及工具，不包含任何原作游戏资源。**

本项目代码以 [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html) 协议开源。

**游戏内容版权说明：**
- 《魔女的夜宴》（サノバウィッチ）是 **Yuzusoft（柚子社）** 的商业作品，游戏剧情、角色、美术素材等一切游戏内容版权归 Yuzusoft 所有
- 本项目**不内置、不附带、不分发**任何原作游戏资源（剧本、图片、音频等）
- 如需运行本项目，请自行获取正版游戏资源并进行转换
- **请勿将本项目用于任何商业用途**
- **请在支持正版的前提下进行研究与学习**
- 若相关权利方认为本项目存在侵权行为，请联系删除

## 已实现功能

- [x] 完整剧本（需自行准备）
- [x] UI 交互（适配手环 10 窄屏）
- [x] 背景渲染
- [x] 存档与设置
- [x] 选项与个人线

## TODO

- [ ] 特殊 CG 与鉴赏
- [ ] 人物立绘渲染

## 安装

本项目使用小米 AIoT 开发框架（aiot-toolkit）构建。

### 环境要求

- Node.js >= 8.10
- [aiot-toolkit](https://iot.mi.com/vela/quickapp)

### 开发

```bash
npm install
npm start
```

### 构建

```bash
npm run build
```

### 发布

```bash
npm run release
```

## 资源准备

**注意：本仓库不包含任何原作游戏资源。** 运行前需自行准备以下资源：

1. 拥有正版《魔女的夜宴》游戏
2. 使用 [KrkrExtract](https://github.com/xmoezzz/KrkrExtract) 提取游戏资源
3. 使用 [FreeMote](https://github.com/UlyssesWu/FreeMote) 中的 `PsbDecompile.exe` 将 `.scn` 剧本文件转换为 `.json`
4. 使用本项目提供的 `tools/convert_script.py` 将 `.json` 转换为紧凑数组格式，放入 `src/common/scn/`
5. 将背景图片处理后放入 `src/common/bg/`

### 资源目录结构

```
src/common/
├── bg/       # 背景图片（.jpg）
├── scn/      # 剧本数据（.txt，convert_script.py 输出）
├── logo.png  # 应用图标
└── title_bg.png  # 标题背景
```

## 剧本转换工具

`tools/convert_script.py` 用于将原始剧本转换为紧凑的数组格式，以适配手环有限的存储空间。

```bash
python tools/convert_script.py <输入路径> <输出路径>
```

### 剧本数据结构

转换后的文件由一系列数组组成，每个数组的第一个元素为类型标识符：

| 标识符 | 类型 | 数组结构 | 说明 |
| :--- | :--- | :--- | :--- |
| **0** | **节点** | `[0, "label_name"]` | 标签/跳转点 |
| **1** | **背景** | `[1, "bg_name"]` | 背景图片切换 |
| **2** | **对话** | `[2, "说话人", "内容", [立绘列表]]` | 说话人与台词内容，立绘列表可选 |
| **3** | **选项** | `[3, [["文字", "跳转", "表达式"], ...]]` | 分支选项及逻辑判断 |
| **4** | **章节标题** | `[4, "章节标题"]` | 更新剧本章节标题 |

## 项目结构

```
├── src/
│   ├── app.ux                 # 应用入口
│   ├── manifest.json          # 应用配置
│   ├── common/
│   │   ├── bg/                # 背景图片（需自行准备）
│   │   ├── scn/               # 剧本数据（需自行准备）
│   │   ├── constants.js       # 配置常量
│   │   ├── logo.png           # 应用图标
│   │   └── title_bg.png       # 标题背景
│   └── pages/
│       ├── index/             # 主菜单
│       ├── game/              # 游戏引擎
│       ├── data/              # 存档管理
│       ├── settings/          # 系统设置
│       └── about/             # 关于页面
├── tools/
│   └── convert_script.py      # 剧本转换工具
├── LICENSE
└── package.json
```

## 感谢名单

### 原版项目
- [Sanoba-Witch-MiBand-9Pro](https://github.com/futrw4v/Sanoba-Witch-MiBand-9Pro)：原版小米手环 9 Pro 移植

### 游戏内容
- 柚子社（Yuzusoft）：游戏制作
- 暗鸽汉化组：提供原始汉化文本资源

### 技术
- [liuyuze61](https://github.com/liuyuze61)：部分代码与逻辑参考
- Gemini：代码辅助

### 工具
- [GARbro-Mod](https://github.com/crskycode/GARbro) & [FreeMote](https://github.com/UlyssesWu/FreeMote)：资源转换
- [KrkrExtract](https://github.com/xmoezzz/KrkrExtract)：资源提取
- [FFmpeg](https://ffmpeg.org/)：图片处理

## 相关链接

- 原版项目（手环 9 Pro）：[Sanoba-Witch-MiBand-9Pro](https://github.com/futrw4v/Sanoba-Witch-MiBand-9Pro)
- 米坛社区：[BandBBS](https://www.bandbbs.cn/resources/6531/)
