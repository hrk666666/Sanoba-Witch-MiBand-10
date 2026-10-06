/**
 * aiotAdapter.js — 小米 Vela 快应用（手环 9/10/11）平台适配
 *
 * 系统模块加载方式说明（尝试方案 B，1.3.6）：
 *  1.2.x 用 $app_require$("@app-module/...")，1.3.0 改成标准 import "@system.xxx"，
 *  1.3.5 沿用在手环10上 import 阶段解析不到 → 开游戏即重启。
 *  现按小米官方文档的第二种写法 const x = require('@system.xxx') 改写：
 *  官方文档（iot.mi.com/vela/quickapp）明确支持 require 形式，且 require 不做
 *  ESM default 解包，可规避"部分系统模块无 default 导出 → import 拿到 null"的坑。
 *  若此方案真机仍重启，则根因更可能在 release 的 --enable-jsc 编译，需另行验证。
 *  audio 仍保持 null（手环无扬声器、固件无 @system.audio）。
 *
 * 适配器统一暴露：
 *  - readScenario(scnId) -> Promise<Array>   读取剧本（引擎唯一的数据入口）
 *  - storageGet(key) / storageSet(key, value)
 *  - toast(msg) / vibrate(mode)
 *  - audio: { play(name,{loop}), pause(), stop(), setVolume(v), onEnded(cb), getState() }
 */

import { ResourceManager } from "./resourceManager.js"
import { findScenario } from "./platformAdapter.js"

// 官方文档推荐的 require 写法：拿到完整模块对象，不做 ESM default interop。
// 引用：https://iot.mi.com/vela/quickapp/en/features/data/file.html
//       import file from '@system.file'  // or const file = require('@system.file')
const file = require("@system.file")
const storage = require("@system.storage")
const prompt = require("@system.prompt")
const vibrator = require("@system.vibrator")

// 手环 9/9 Pro/10 均无扬声器、固件无 @system.audio 模块（官方文档亦无此 API）。
// 保留 audio 接口桩，引擎调用静默跳过，避免任何设备上崩溃。
const sysAudio = null

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
