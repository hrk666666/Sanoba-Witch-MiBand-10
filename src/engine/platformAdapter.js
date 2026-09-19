/**
 * platformAdapter.js — 平台适配层（引擎与平台解耦的关键）
 *
 * 提供两套实现：
 *  - createAiotAdapter()   小米 Vela 快应用（手环 9/10）
 *  - createMemoryAdapter() Node 测试 / PC 预览（内存存储 + mock 音频）
 *
 * 适配器统一暴露：
 *  - readScenario(scnId) -> Promise<Array>   读取剧本（引擎唯一的数据入口）
 *  - storageGet(key) / storageSet(key, value)
 *  - toast(msg) / vibrate(mode)
 *  - audio: { play(name,{loop}), pause(), stop(), setVolume(v), onEnded(cb), getState() }
 *
 * 换平台 = 新写一个 adapter，引擎零改动。
 */

import { ResourceManager } from "./resourceManager.js"

/** 从内容包配置解析场景：id -> {id, path, listName} */
function findScenario(config, scnId) {
  if (!config || !config.scenarios) return null
  for (const listName of Object.keys(config.scenarios)) {
    const item = (config.scenarios[listName] || []).find((s) => s.id === scnId)
    if (item) return { id: item.id, path: item.path, listName }
  }
  return null
}

// ---------------------------------------------------------------- AIoT
export function createAiotAdapter(config, resourceManager) {
  // 延迟 require 平台模块（Node 环境不会加载）
  const file = require("@system.file")
  const storage = require("@system.storage")
  const prompt = require("@system.prompt")
  const vibrator = require("@system.vibrator")
  const sysAudio = require("@system.audio")

  // resourceManager 可能由外部注入，也可能在 readConfig 成功后自行创建
  let rm = resourceManager || null

  const audio = {
    _endedCb: null,
    play(name, { loop = true } = {}) {
      if (!name || !rm) return
      sysAudio.src = rm.uri("audio", name)
      sysAudio.loop = loop
      sysAudio.autoplay = true
      sysAudio.play()
    },
    pause() { sysAudio.pause() },
    stop() { sysAudio.stop() },
    setVolume(v) { sysAudio.volume = v },
    onEnded(cb) { sysAudio.onended = cb },
    getState() {
      return new Promise((resolve) => {
        sysAudio.getPlayState({ success: resolve, fail: () => resolve(null) })
      })
    }
  }

  return {
    config,
    readConfig() {
      return new Promise((resolve, reject) => {
        file.readText({
          uri: "/common/game.txt",
          success: (data) => {
            try {
              const cfg = JSON.parse(data.text)
              this.config = cfg
              // readConfig 成功后自行初始化 ResourceManager（外部未注入时）
              if (!rm) rm = new ResourceManager(cfg.resources)
              resolve(cfg)
            } catch (e) {
              reject(new Error("game.txt 解析失败"))
            }
          },
          fail: (err) => reject(new Error("game.txt 读取失败: " + (err && err.code)))
        })
      })
    },
    readScenario(scnId) {
      return new Promise((resolve, reject) => {
        const scn = findScenario(this.config, scnId)
        if (!scn) { reject(new Error("未找到场景: " + scnId)); return }
        file.readText({
          uri: `/common/scn/${scn.path}`,
          success: (data) => {
            try {
              resolve(JSON.parse(data.text))
            } catch (e) {
              reject(new Error("剧本 JSON 解析失败: " + scnId))
            }
          },
          fail: (err) => reject(new Error("剧本读取失败: " + (err && err.code)))
        })
      })
    },
    storageGet(key) {
      return new Promise((resolve) => {
        storage.get({
          key,
          success: (data) => resolve(data),
          fail: () => resolve(null)
        })
      })
    },
    storageSet(key, value) {
      return new Promise((resolve) => {
        if (value === "") {
          storage.delete({ key, success: () => resolve(), fail: () => resolve() })
          return
        }
        storage.set({ key, value, success: () => resolve(), fail: () => resolve() })
      })
    },
    toast(msg) {
      prompt.showToast({ message: msg, duration: 1500 })
    },
    vibrate(mode = "short") {
      try {
        vibrator.vibrate({ mode })
      } catch (e) { /* 部分设备不支持，忽略 */ }
    },
    audio
  }
}

// ---------------------------------------------------------------- Memory（Node 测试 / PC 预览）
export function createMemoryAdapter(config, resourceManager, { fs, baseDir } = {}) {
  const mem = new Map()
  // 内联内容包（测试/PC 预览）：统一从 _inlineConfig 取游戏配置
  const gameCfg = (config && config._inlineConfig) || config || {}
  const inlineScenarios = (config && config._inlineScenarios) || {}

  const audio = {
    _endedCb: null,
    _state: { src: "", loop: false, playing: false, volume: 1 },
    calls: [],
    play(name, { loop = true } = {}) {
      this.calls.push({ op: "play", name, loop })
      this._state.src = name
      this._state.loop = loop
      this._state.playing = true
    },
    pause() {
      this.calls.push({ op: "pause" })
      this._state.playing = false
    },
    stop() {
      this.calls.push({ op: "stop" })
      this._state.playing = false
      this._state.src = ""
    },
    setVolume(v) { this._state.volume = v },
    onEnded(cb) { this._endedCb = cb },
    /** 测试辅助：模拟播放结束 */
    emitEnded() { if (this._endedCb) this._endedCb() },
    getState() { return Promise.resolve(this._state) }
  }

  return {
    config: gameCfg,
    async readConfig() {
      if (fs && baseDir) {
        const text = fs.readFileSync(`${baseDir}/src/common/game.txt`, "utf-8")
        const cfg = JSON.parse(text)
        this.config = cfg
        return cfg
      }
      this.config = gameCfg
      return gameCfg
    },
    async readScenario(scnId) {
      const scn = findScenario(this.config, scnId)
      if (!scn) throw new Error("未找到场景: " + scnId)
      if (fs && baseDir) {
        const text = fs.readFileSync(`${baseDir}/src/common/scn/${scn.path}`, "utf-8")
        return JSON.parse(text)
      }
      // 无 fs：使用注入的内容映射（测试用）
      const inline = inlineScenarios[scnId]
      if (!inline) throw new Error("无剧本源: " + scnId)
      return inline
    },
    async storageGet(key) {
      return mem.has(key) ? mem.get(key) : null
    },
    async storageSet(key, value) {
      if (value === "") mem.delete(key)
      else mem.set(key, value)
    },
    toast(msg) {
      if (typeof console !== "undefined") console.log("[Toast]", msg)
    },
    vibrate() {},
    audio
  }
}

export default { createAiotAdapter, createMemoryAdapter }
