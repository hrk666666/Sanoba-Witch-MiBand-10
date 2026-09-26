#!/usr/bin/env node
/**
 * regression-qlwh.mjs — 《千恋＊万花》内容包端到端回归
 *
 * 用 createMemoryAdapter 的 fs 模式加载仓库真实 game.txt + src/common/scn/chunk*.txt，
 * 完整走完两条路线（全选第 1 项 / 全选最后一项），验证：
 *   - 全流程无崩溃、无未解析跳转
 *   - 两条路线均能到达结局（gameend）
 *   - 隐藏路由按选项记录正确分线（丛雨线 057 块仅在路线 2 被访问）
 *
 * 运行：node tests/regression-qlwh.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const ESM = path.join(__dirname, "_esm")

// 复制引擎源码为 ESM（与 run-tests.mjs 相同机制），并把内部相对导入改为 .mjs
fs.mkdirSync(ESM, { recursive: true })
for (const f of fs.readdirSync(path.join(ROOT, "src", "engine"))) {
  if (f.endsWith(".js")) {
    let src = fs.readFileSync(path.join(ROOT, "src", "engine", f), "utf-8")
    src = src.replace(/from "\.\/([\w-]+)\.js"/g, 'from "./$1.mjs"')
    fs.writeFileSync(path.join(ESM, f.replace(/\.js$/, ".mjs")), src)
  }
}

const { createMemoryAdapter } = await import(`./_esm/platformAdapter.mjs`)
const { createVnEngine } = await import(`./_esm/index.mjs`)

const adapter = createMemoryAdapter({}, null, { fs, baseDir: ROOT })
const cfg = await adapter.readConfig()
console.log(`内容包: ${cfg.title} v${cfg.version}，${cfg.scenarios.main.length} 个场景块`)

let pass = 0
let fail = 0
function check(name, cond, extra = "") {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.log(`  ✗ ${name} ${extra}`)
  }
}

async function walkRoute(choicePolicy, label, defaultPick = () => 0) {
  let state = null
  const engine = await createVnEngine({
    adapter,
    options: { saveSlots: 4 },
    onState: (s) => { state = s }
  })
  const rt = engine.runtime
  await rt.load("001")
  let steps = 0
  const visited = new Set()
  const optionsSeen = []
  const perScnCount = {}
  while (!state.ended && steps < 600000) {
    steps++
    visited.add(state.scnId)
    if (state.showOptions) {
      const opts = state.options || []
      if (opts.length === 0) {
        console.log(`  [${label}] 空选项 @ ${state.scnId}:${state.lineIndex} — 强制推进`)
        rt.advance()
      } else {
        optionsSeen.push(opts.map((o) => o.text))
        // 每个场景内第 n 次选项 → 策略下标；策略未命中时用 defaultPick
        perScnCount[state.scnId] = (perScnCount[state.scnId] || 0)
        const n = perScnCount[state.scnId]++
        let idx = defaultPick(opts.length)
        if (choicePolicy && choicePolicy[state.scnId]) {
          const want = choicePolicy[state.scnId][n]
          if (want !== undefined) idx = Math.min(want, opts.length - 1)
        }
        rt.choose(idx)
      }
    } else if (state.isTextComplete) {
      rt.advance()
    } else {
      rt.markTextComplete()
    }
    // 引擎跨场景跳转为异步设计（真机由用户点击驱动，无竞态）；
    // 回归脚本必须每步让出微任务队列，确保跳转落地后再走下一步。
    await Promise.resolve()
  }
  return { state, steps, visited, optionsSeen }
}

// ---- 路线 1：全选第 1 项 ----
console.log(`\n== 路线 1（全选第 1 项）==`)
const r1 = await walkRoute(null, "路线1")
check("路线 1 到达结局（ended）", r1.state.ended,
  `steps=${r1.steps} scnId=${r1.state.scnId}`)
check("路线 1 未访问丛雨线（057 块）", !r1.visited.has("057"))
console.log(`  路线 1 推进 ${r1.steps} 步，访问 ${r1.visited.size} 个场景块，最终 ${r1.state.scnId}，选项 ${r1.optionsSeen.length} 次`)

// ---- 路线 2：全选最后一项 ----
console.log(`\n== 路线 2（全选最后一项）==`)
const r2 = await walkRoute(null, "路线2", (n) => n - 1)
check("路线 2 到达结局（ended）", r2.state.ended,
  `steps=${r2.steps} scnId=${r2.state.scnId}`)
check("路线 2 访问丛雨线（057 块）", r2.visited.has("057"))
console.log(`  路线 2 推进 ${r2.steps} 步，访问 ${r2.visited.size} 个场景块，最终 ${r2.state.scnId}，选项 ${r2.optionsSeen.length} 次`)

// ---- 路线扫描：全部可达路线 + 上游死路线确认 ----
// 共通前段选项顺序（chunk012 内依次为 5504/5912/5926）：
//   "001" 109  | "007" 3468 | "012" [5504, 5912, 5926] | "013" 6390 | "015" 7337 | "017" 8418
//
// 注意（上游一致性）：repo1 的 noNextPages 将 "5925"→"6325"（5912 钓鱼支线直接合流），
// 5926 选项页在 repo1 原版中即不可达 → c5926 永不被设置 →
// 上游 8460（蕾娜线需 c5926==2）与 9130（芳乃线需 c5926==1）均为死路由。
// 本移植忠实复刻：钓鱼路线必然走向共通线，蕾娜线/芳乃线不触发（与 repo1 一致）。
const ROUTE_SWEEP = [
  { name: "共通线",      policy: {},                                          expectEnd: "019" },
  { name: "钓鱼支线(共通)", policy: { "012": [1, 0, 0], "017": [0] },          expectEnd: "019" },
  { name: "茉子线",      policy: { "012": [1, 1, 0], "017": [0] },             expectEnd: "056" },
  { name: "钓鱼支线2(共通)", policy: { "012": [0, 0, 1], "017": [0] },         expectEnd: "019" },
  { name: "丛雨线",      policy: { "012": [1, 2, 1], "013": [1], "017": [0] }, expectEnd: "077" },
  { name: "小春&芦花线", policy: { "012": [1, 0, 0], "013": [0], "015": [1], "017": [0] }, expectEnd: "107" }
]
console.log(`\n== 路线扫描（${ROUTE_SWEEP.length} 条）==`)
for (const r of ROUTE_SWEEP) {
  const res = await walkRoute(r.policy, r.name)
  const ok = res.state.ended && res.state.scnId === r.expectEnd
  check(`${r.name} → 结局（最终块 ${r.expectEnd}）`, ok,
    `实际 ${res.state.scnId} steps=${res.steps} visited=${res.visited.size}`)
  console.log(`  ${r.name}: ${res.steps} 步，访问 ${res.visited.size} 块，最终 ${res.state.scnId}`)
}

// ---- 汇总 ----
console.log(`\n========== 结果 ==========`)
console.log(`通过 ${pass} / ${pass + fail}`)
if (fail > 0) process.exit(1)
