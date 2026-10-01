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

async function walkRoute(choicePolicy, label, defaultPick = () => 0, initClears = null) {
  let state = null
  const engine = await createVnEngine({
    adapter,
    options: { saveSlots: 4 },
    onState: (s) => { state = s }
  })
  const rt = engine.runtime
  if (initClears) rt.setClears(initClears)
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
        // 置灰选项不可选：模拟 UI 层，回退到可用项（首周目隐藏线锁定）
        if (opts[idx] && opts[idx].enabled === false) {
          const alt = opts.findIndex((o) => o.enabled !== false)
          if (alt !== -1) idx = alt
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

// ---- 路线 3：快进（跳到下一个选项）不串线 ----
// 回归背景：skipToNextSelect 曾跳过 [6] 跳转/结束节点，
// 快进跳过 gameend 后线路不结束、顺序连播下一条线（"芳乃完接茉子"）。
// 修复：快进遇 gameend 立即结束、遇路由节点执行跳转。
async function walkRouteWithSkips(choicePolicy, label, skipEvery = 500) {
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
  const perScnCount = {}
  while (!state.ended && steps < 800000) {
    steps++
    visited.add(state.scnId)
    if (state.showOptions) {
      const opts = state.options || []
      if (opts.length === 0) { rt.advance(); continue }
      perScnCount[state.scnId] = (perScnCount[state.scnId] || 0)
      const n = perScnCount[state.scnId]++
      let idx = 0
      if (choicePolicy && choicePolicy[state.scnId]) {
        const want = choicePolicy[state.scnId][n]
        if (want !== undefined) idx = Math.min(want, opts.length - 1)
      }
      rt.choose(idx)
    } else if (state.isTextComplete) {
      // 模拟用户周期性使用"跳到下一个选项"
      if (steps % skipEvery === 0 && !state.ended) {
        rt.skipToNextSelect()
      } else {
        rt.advance()
      }
    } else {
      rt.markTextComplete()
    }
    await Promise.resolve()
  }
  return { state, steps, visited }
}

console.log(`\n== 路线 3（快进跳选项，防串线回归）==`)
const r3 = await walkRouteWithSkips({ "012": [1, 0, 0], "017": [0] }, "芳乃+快进")
check("芳乃线+快进：正确结束于 037（不串线下一条线）",
  r3.state.ended && r3.state.scnId === "037",
  `实际 ${r3.state.scnId} steps=${r3.steps} 访问 ${r3.visited.size} 块`)
check("芳乃线+快进：未进入茉子线（038 块）", !r3.visited.has("038"))
const r4 = await walkRouteWithSkips(null, "全选1+快进", 300)
check("全选1+快进：正确结束于 019", r4.state.ended && r4.state.scnId === "019",
  `实际 ${r4.state.scnId}`)

// ---- 路线 1：全选第 1 项 ----
console.log(`\n== 路线 1（全选第 1 项）==`)
const r1 = await walkRoute(null, "路线1")
check("路线 1 到达结局（ended）", r1.state.ended,
  `steps=${r1.steps} scnId=${r1.state.scnId}`)
check("路线 1 未访问丛雨线（057 块）", !r1.visited.has("057"))
console.log(`  路线 1 推进 ${r1.steps} 步，访问 ${r1.visited.size} 个场景块，最终 ${r1.state.scnId}，选项 ${r1.optionsSeen.length} 次`)

// ---- 路线 2：全选最后一项（二周目场景：预置通关标记，解锁隐藏线选项） ----
console.log(`\n== 路线 2（全选最后一项，通关后）==`)
const r2 = await walkRoute(null, "路线2", (n) => n - 1, ["芳乃"])
check("路线 2 到达结局（ended）", r2.state.ended,
  `steps=${r2.steps} scnId=${r2.state.scnId}`)
check("路线 2 访问丛雨线（057 块）", r2.visited.has("057"))
console.log(`  路线 2 推进 ${r2.steps} 步，访问 ${r2.visited.size} 个场景块，最终 ${r2.state.scnId}，选项 ${r2.optionsSeen.length} 次`)

// ---- 路线扫描：全部可达路线 ----
// 共通前段选项顺序（chunk012 内依次为 5504/5912/5926）：
//   "001" 109  | "007" 3468 | "012" [5504, 5912, 5926] | "013" 6390 | "015" 7337 | "017" 8418
//
// 死路由修复（tools/convert_qlwh.py）：上游 noNextPages "5925"→"6325" 跳过了 5926 选项页，
// 导致 c5926 永不被赋值、芳乃线（c5926==1）与蕾娜线（c5926==2）成为死路由。
// 已移除该规则：5926 选项可达，两条线恢复。原"钓鱼支线(共通)"用例现分别进入芳乃/蕾娜线。
const ROUTE_SWEEP = [
  { name: "共通线",      policy: {},                                          expectEnd: "019" },
  { name: "芳乃线",      policy: { "012": [1, 0, 0], "017": [0] },             expectEnd: "037" },
  { name: "茉子线",      policy: { "012": [1, 1, 0], "017": [0] },             expectEnd: "056" },
  { name: "蕾娜线",      policy: { "012": [0, 0, 1] },                         expectEnd: "097" },
  { name: "丛雨线",      policy: { "012": [1, 2, 1], "013": [1], "017": [0] }, expectEnd: "077" },
  { name: "小春&芦花线", policy: { "012": [1, 0, 0], "013": [0], "015": [1], "017": [1] }, expectEnd: "107" }
]
console.log(`\n== 路线扫描（${ROUTE_SWEEP.length} 条）==`)
for (const r of ROUTE_SWEEP) {
  // 小春&芦花为隐藏线：预置通关标记（二周目解锁）
  const initClears = r.name === "小春&芦花线" ? ["芳乃"] : null
  const res = await walkRoute(r.policy, r.name, () => 0, initClears)
  const ok = res.state.ended && res.state.scnId === r.expectEnd
  check(`${r.name} → 结局（最终块 ${r.expectEnd}）`, ok,
    `实际 ${res.state.scnId} steps=${res.steps} visited=${res.visited.size}`)
  console.log(`  ${r.name}: ${res.steps} 步，访问 ${res.visited.size} 块，最终 ${res.state.scnId}`)
}

// ---- 二周目机制：通关标记 / 隐藏线解锁 / 后日谈 ----
console.log(`\n== 二周目机制 ==`)

// 1. 首周目：隐藏线入口选项（8418 页"不说多余话"→*p8424）置灰
{
  let state = null
  const engine = await createVnEngine({ adapter, options: { saveSlots: 4 }, onState: (s) => { state = s } })
  const rt = engine.runtime
  await rt.load("017")
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "src/common/scn/chunk017.txt"), "utf-8"))
  const selIdx = d.findIndex(n => n[0] === 4 && n[1][0][0].includes("安抚朝武"))
  rt.lineIndex = selIdx
  rt._step()
  const locked = state.options.find(o => o.jump === "*p8424")
  check("首周目隐藏线选项置灰（*p8424 enabled=false）", !!locked && locked.enabled === false)
  const normal = state.options.find(o => o.jump === "*p8419")
  check("首周目主线选项仍可选（*p8419 enabled=true）", !!normal && normal.enabled !== false)
}

// 2. 通关任意 1 线后：隐藏线选项解锁
{
  let state = null
  const engine = await createVnEngine({ adapter, options: { saveSlots: 4 }, onState: (s) => { state = s } })
  const rt = engine.runtime
  rt.setClears(["芳乃"])
  await rt.load("017")
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "src/common/scn/chunk017.txt"), "utf-8"))
  const selIdx = d.findIndex(n => n[0] === 4 && n[1][0][0].includes("安抚朝武"))
  rt.lineIndex = selIdx
  rt._step()
  const unlocked = state.options.find(o => o.jump === "*p8424")
  check("通关 1 线后隐藏线选项可选", !!unlocked && unlocked.enabled !== false)
}

// 3. 置灰选项 choose 被拒绝（UI 层点击拦截 + 引擎防御）
{
  let state = null
  const engine = await createVnEngine({ adapter, options: { saveSlots: 4 }, onState: (s) => { state = s } })
  const rt = engine.runtime
  await rt.load("017")
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "src/common/scn/chunk017.txt"), "utf-8"))
  const selIdx = d.findIndex(n => n[0] === 4 && n[1][0][0].includes("安抚朝武"))
  rt.lineIndex = selIdx
  rt._step()
  rt.choose(state.options.findIndex(o => o.enabled === false))
  await Promise.resolve()
  check("choose 置灰项被拒绝（仍停留在选项）", state.showOptions === true)
}

// 4. 通关记录：芳乃线走完 → clears 含"芳乃"
{
  let state = null
  const engine = await createVnEngine({ adapter, options: { saveSlots: 4 }, onState: (s) => { state = s } })
  const rt = engine.runtime
  await rt.load("001")
  const policy = { "012": [1, 0, 0], "017": [0] }
  const perScn = {}
  let steps = 0
  while (!state.ended && steps < 500000) {
    steps++
    if (state.showOptions) {
      const opts = state.options || []
      if (!opts.length) { rt.advance(); continue }
      const n = perScn[state.scnId] = (perScn[state.scnId] || 0)
      const picks = policy[state.scnId] || []
      let idx = picks[n] !== undefined ? Math.min(picks[n], opts.length - 1) : 0
      if (opts[idx] && opts[idx].enabled === false) {
        idx = opts.findIndex(o => o.enabled !== false)
        if (idx === -1) idx = 0
      }
      perScn[state.scnId]++
      rt.choose(idx)
    } else if (state.isTextComplete) { rt.advance() }
    else { rt.markTextComplete() }
    await Promise.resolve()
  }
  check("芳乃线通关 → clears 记录", rt.clears.includes("芳乃"))
}

// 5. 后日谈章节清单与数据一致（起始行 = gameend 后一行）
const EXPECT_AFTER = [
  ["芳乃", "037", 553], ["茉子", "056", 57], ["丛雨", "077", 498],
  ["蕾娜", "097", 321], ["小春", "107", 728], ["芦花", "111", 789]
]
for (const [name, scn, from] of EXPECT_AFTER) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, `src/common/scn/chunk${scn}.txt`), "utf-8"))
  const ge = d.findIndex(n => n[0] === 6 && String(n[1]).includes("gameend"))
  check(`后日谈 ${name} 起始行 = gameend+1（${scn}:${from}）`, ge !== -1 && ge + 1 === from,
    `实际 gameend@${ge}`)
}

// 6. 后日谈可从起始行加载推进
{
  let state = null
  const engine = await createVnEngine({ adapter, options: { saveSlots: 4 }, onState: (s) => { state = s } })
  const rt = engine.runtime
  await rt.load("037", 553)
  for (let i = 0; i < 3; i++) {
    if (state.showOptions || state.ended) break
    if (state.isTextComplete) rt.advance(); else rt.markTextComplete()
    await Promise.resolve()
  }
  check("芳乃后日谈 037:553 可正常推进", !!state.fullText && state.fullText.length > 0)
}

// 7. 后日谈结束哨兵：038 末尾 gameend_end → ended
{
  let state = null
  const engine = await createVnEngine({ adapter, options: { saveSlots: 4 }, onState: (s) => { state = s } })
  const rt = engine.runtime
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "src/common/scn/chunk038.txt"), "utf-8"))
  const endIdx = d.findIndex(n => n[0] === 6 && String(n[1]).toLowerCase().includes("gameend"))
  await rt.load("038", endIdx)
  check("后日谈哨兵结束（ended=true）", state.ended === true, `idx=${endIdx}`)
}

// ---- 汇总 ----
console.log(`\n========== 结果 ==========`)
console.log(`通过 ${pass} / ${pass + fail}`)
if (fail > 0) process.exit(1)
