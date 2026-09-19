# 迭代记录与开发规范

本文件记录本项目历次迭代内容，并固化以后的开发流程，供后续维护参考。

## 仓库结构与分支

- 仓库：`hrk666666/Sanoba-Witch-MiBand-10`
- **main**：有图版（含全部 CG / 背景 / 图标资源），正常功能分支。
- **no-image**：无图纯黑精简版。删除全部图片资源、所有页面恒纯黑、设置页无「纯黑模式」开关。与 main 同步功能，差异仅在资源与背景。
- 两个分支同包名 `dev.futrw4v.sanoba_witch`，**不能共存**，存档共用。

## 构建与发布流程（以后照此执行）

1. **改代码**：在对应分支上修改 `src/` 下的 `.ux` / `.js`。
2. **语法检查**：`.ux` 文件提取 `<script>` 段，用 `node --check` 验证 JS 语法，避免 push 后 Actions 才报错。
3. **版本号**：`src/manifest.json` 的 `versionCode` 每次发布 +1（保证覆盖安装），`versionName` 按语义化版本递增。
4. **CHANGELOG**：在 `CHANGELOG.md` 顶部按 `## [x.y.z] - 日期` 追加变更条目，分「新增 / 修改 / 修复 / 其他」。
5. **commit + push**：提交信息写清做了什么。
6. **GitHub Actions 自动构建**：`.github/workflows/build.yml` 已监听 `main` / `no-image` / `master` 分支，push 后自动 `npm ci && npm run release`，产出 jsc 字节码 release 签名 RPK，以 workflow artifact 形式提供。
7. **取产物**：Actions 跑完后，在该 run 的 Artifacts 里下载 `sanoba-witch-rpk`（zip），解压得到 `.release.rpk`。
8. **不在本机编译**：统一走 Actions，避免本地环境差异。签名证书在 `sign/` 目录（已入库），CI 自动复用，保证各版本签名一致、可覆盖安装。

## v1.3.0（2026-09-18）— 17 项改进

### 新增

- 主页「继续游戏」置顶：有自动存档直接读档进入；「开始游戏」改名「重开」。
- 自动保存（实时 + 3 秒节流）：独立存档键 `auto_save_data`，自动槽置顶只读；手动读档进入游戏时停用自动保存；退出阅读时强制写入一次。
- 自动播放：整句停 0.5 秒自动下一句，菜单内开关，遇选项暂停。
- 屏幕常亮：设置页独立开关；自动播放开启时同步启用；离开阅读页强制关闭。
- 纯黑模式：设置页开关，主页与阅读界面不渲染图片，底色纯黑。
- 振动反馈：所有点击短振动，`@system.vibrator.vibrate({mode:'short'})`。
- 「上一句」按钮：说话人框右侧，样式与顶部控制按钮同款构造。
- 阅读界面底部居中时间，字号与人名一致，30 秒刷新。

### 修改

- 文字框高度 120→150px（1.25 倍），左右边距 8→12px，内边距 10→14px；说话人框随之上移。
- 默认字号 18→22px，滑块上限 24→30px。
- 文字加粗开关（默认开）。
- 阅读菜单选项字号 15→19px（1.25 倍），按钮高度 46→50px，菜单可滚动。
- 主页按钮字号 17→21px 并加粗。
- 关于页：应用名改「魔女的夜宴 Band 9/10/11」；作者标识 `hrk666666`→`hrk_`；上游名缩短；作者行后内容字号 1.3 倍；新增「返回载入进度页」。
- 设置页「保存 / 退出」按钮居中并排、间距缩小。
- 快进按钮 1.25 倍。

### 修复

- 长按快进误触：改为自定义触摸计时（按压 600ms 且无位移才触发），移动即取消；快进触摸不冒泡触发菜单；菜单长按同样 600ms 阈值并吞掉随后误点击。
- 自动播放与快进互不干扰，手动操作优先。

## v1.3.1（2026-09-18）— 纯黑模式修复

- `game.ux` 页面根节点补 `background-color: #000000`：纯黑模式开启后不再露出 Vela 系统默认底色，真正纯黑。
- `settings.ux`、`about.ux` 的背景图与应用图标补 `!settings.darkMode` 条件：纯黑模式下一并隐藏。
- versionCode 8→9。

## v1.3.2（2026-09-19）— 音频不播放修复

- **根因**：`createAiotAdapter(config, resourceManager)` 签名要求外部注入 `resourceManager` 以解析音频 URI，但 `game.ux` 调用 `createAiotAdapter()` 时未传参，闭包变量始终 `undefined`。`audio.play()` 首行 `if (!name || !resourceManager) return` 直接拦截，剧本节点 8（音乐）全部静默丢弃。
- **修复**：`readConfig` 成功后自动 `new ResourceManager(cfg.resources)`，外部未注入时自行初始化；外部注入优先。
- **game.ux**：`private` 块中 `isSkipping` 重复声明，删除冗余项。
- **测试脚本**：`run-tests.mjs` 复制引擎到 `_esm/` 时增加 import 路径 `.js→.mjs` 替换，与 `regression-real.mjs` 对齐。
- versionCode 9→10。

### 新增踩坑记录

- **引擎跨模块 import**：在 `platformAdapter.js` 等引擎文件顶部 `import` 其他引擎模块时，测试脚本的文件复制会把 `.js` 改名为 `.mjs`，必须同步修正 import 路径，否则 `run-tests.mjs` 报 `MODULE_NOT_FOUND`。
- **adapter 闭包依赖注入**：`createAiotAdapter` 内部闭包引用的平台依赖（如 `resourceManager`）必须在 adapter 构造完成后可被 `readConfig` 延迟初始化，不能假设外部一定传参。

## no-image 分支（2026-09-18）— 无图纯黑版

- 删除 `common/bg/`、`common/sd/`、`common/ev/`、`common/logo.png`、`common/title_bg.jpg`，剧本 `common/scn/` 完整保留。
- 所有页面恒纯黑，设置页移除「纯黑模式」开关。
- 包体积由约 5.0 MB 降至约 1.6 MB。
- versionCode 9（与 main 的 v1.3.1 同号，均为各自分支最新）。

## 以后迭代注意事项

### 强制：先查 vela 技能文档，再写代码

- 开发前必须加载 `vela-quickapp-dev` 技能（AIoT IDE / Xiaomi Vela 官方文档体系），遇到以下情况**先查技能文档，禁止凭印象猜**：
  - 任何 `@system.xxx` 新接口（参数、回调、设备兼容性、错误码）；
  - UI 组件新用法（`<list>` / `<slider>` / `<input>` 等属性与事件）；
  - CSS / 布局 / 窄屏适配写法；
  - 构建、签名、打包命令（`aiot build` / `aiot release` / `--enable-jsc`）。
- 技能文档未覆盖的接口，去小米官方文档 `iot.mi.com/vela` 核实；仍不确定就不要硬写，先记录待验证。

### 强制：经验必须自动沉淀，文档随代码一起迭代

- 每次迭代完成后，把这次踩到的新坑、新结论、新参数写回本文件（v1.3.x 或「以后注意事项」对应小节），不允许只改代码不留记录。
- 已验证的写法（例如长按压用自定义 touch 计时而非 `longpress`、振动必须 `try-catch`、RPK 必须用 `sign/` 固定签名）要写成条目，避免下次重踩。
- 本文件与代码同 commit、同 push，**代码和文档永远在同一个提交里**。

- **改 UI 尺寸时**：手环 designWidth=212，窄长屏，单位一律用 `dp`，避免横向溢出；按钮最小可点区域参考 44×44。
- **加新页面**：必须放 `src/pages/xxx/xxx.ux` 子目录，并在 `manifest.json` 的 `router.pages` 注册。
- **加新系统能力**：在 `manifest.json` 的 `features` 里声明对应 `@system.xxx`，否则运行时拿不到。
- **存储**：所有设置 / 存档走 `@system.storage`，键名集中在 `common/constants.js`。
- **不支持的 API 要兜底**：振动等硬件 API 在部分设备不支持，调用处包 `try-catch` 或功能检测。
- **改完务必升 versionCode**：否则设备识别为同版本，可能拒绝覆盖安装。
- **两个分支同步**：main 上的功能改动，如果与图片无关，也要 cherry-pick / 手动同步到 no-image，反之亦然。
- **纯黑模式相关改动**：任何新页面、新背景元素，都要同时考虑 `if="{{ !settings.darkMode }}"` 条件和页面根节点黑底，否则纯黑模式下会露馅。
- **RPK 文件名**：交付时标注版本号与是否 jsc，方便用户区分（例：`xxx.release.1.3.1.jsc.rpk`）。
