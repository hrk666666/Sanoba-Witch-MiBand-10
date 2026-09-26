/**
 * aiotAdapter.js — 小米 Vela 快应用（手环 9/10/11）平台适配
 *
 * 与 platformAdapter.js 分离的原因：
 *  用 Vela 运行时全局 $app_require$ 直接加载系统模块（模块对象本身），
 *  绕开 webpack 模块解析的两种坑：
 *   1) 运行时 require("@system.xxx")：部分构建环境（本地 Node v22）生成
 *      "Cannot find module '@system.file'" fallback → 真机初始化失败；
 *   2) ESM import xxx from "@system.xxx"：webpack 做 default interop，
 *      而 Vela 部分系统模块（如 @system.audio）没有 default 导出，
 *      运行时得到 null → "cannot set property onended of null"。
 *
 *  $app_require$("@app-module/system.xxx") 返回模块对象本身
 *  （与 require 语义一致，已在用户跑通的版本验证）。
 *
 * 本文件仅在 Vela 运行时被引用（src/pages/game/game.ux），
 * Node 测试环境不会 import 它，因此访问运行时全局安全。
 *
 * 适配器统一暴露：
 *  - readScenario(scnId) -> Promise<Array>   读取剧本（引擎唯一的数据入口）
 *  - storageGet(key) / storageSet(key, value)
 *  - toast(msg) / vibrate(mode)
 *  - audio: { play(name,{loop}), pause(), stop(), setVolume(v), onEnded(cb), getState() }
 */

import { ResourceManager } from "./resourceManager.js"
import { findScenario } from "./platformAdapter.js"

/**
 * Vela 运行时加载系统模块。
 * 使用框架注入的全局 $app_require$（模块对象直出，无 ESM interop）。
 * 本文件仅被 Vela 运行时加载，Node 测试环境不会 import 它。
 */
function loadSystemModule(id) {
  if (typeof $app_require$ === "function") {
    return $app_require$(id)
  }
  return null
}

// Vela 系统模块 —— 模块对象本身（勿改为 ESM default import）
const file = loadSystemModule("@app-module/system.file")
const storage = loadSystemModule("@app-module/system.storage")
const prompt = loadSystemModule("@app-module/system.prompt")
const vibrator = loadSystemModule("@app-module/system.vibrator")
const sysAudio = loadSystemModule("@app-module/system.audio")

export function createAiotAdapter(config, resourceManager) {
  // resourceManager 可能由外部注入，也可能在 readConfig 成功后自行创建
  let rm = resourceManager || null

  const audio = {
    _endedCb: null,
    play(name, { loop = true } = {}) {
      if (!name || !rm || !sysAudio) return
      sysAudio.src = rm.uri("audio", name)
      sysAudio.loop = loop
      sysAudio.autoplay = true
      sysAudio.play()
    },
    pause() { if (sysAudio) sysAudio.pause() },
    stop() { if (sysAudio) sysAudio.stop() },
    setVolume(v) { if (sysAudio) sysAudio.volume = v },
    onEnded(cb) { if (sysAudio) sysAudio.onended = cb },
    getState() {
      return new Promise((resolve) => {
        if (!sysAudio) { resolve(null); return }
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
          fail: (err, code) => reject(new Error("game.txt 读取失败: " + ((err && err.code) || code || "未知")))
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
          fail: (err, code) => reject(new Error("剧本读取失败: " + ((err && err.code) || code || "未知")))
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

export default createAiotAdapter
