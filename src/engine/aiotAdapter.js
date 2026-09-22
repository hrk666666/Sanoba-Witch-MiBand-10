/**
 * aiotAdapter.js — 小米 Vela 快应用（手环 9/10/11）平台适配
 *
 * 与 platformAdapter.js 分离的原因：
 *  Vela 系统模块必须用顶层静态 import（import file from "@system.file"），
 *  打包器才会正确编译为 $app_require$("@app-module/system.file")；
 *  若用运行时 require("@system.file")，webpack 在部分构建环境下会生成
 *  "Cannot find module '@system.file'" 的 fallback，导致真机初始化失败。
 *
 * 本文件仅在 Vela 运行时被引用（src/pages/game/game.ux），
 * Node 测试环境不会 import 它，因此顶层加载 @system.* 安全。
 *
 * 适配器统一暴露：
 *  - readScenario(scnId) -> Promise<Array>   读取剧本（引擎唯一的数据入口）
 *  - storageGet(key) / storageSet(key, value)
 *  - toast(msg) / vibrate(mode)
 *  - audio: { play(name,{loop}), pause(), stop(), setVolume(v), onEnded(cb), getState() }
 */

import { ResourceManager } from "./resourceManager.js"
import { findScenario } from "./platformAdapter.js"

// Vela 系统模块 —— 必须顶层静态 import（勿改为 require）
import file from "@system.file"
import storage from "@system.storage"
import prompt from "@system.prompt"
import vibrator from "@system.vibrator"
import sysAudio from "@system.audio"

export function createAiotAdapter(config, resourceManager) {
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
