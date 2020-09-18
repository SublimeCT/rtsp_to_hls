# rtsp -> hls
使用 `nodejs` 将 `rtsp` 视频流转换为 `hls` 并写入到本地文件, **必须安装 `ffmpeg` 才能使用**, 可以指定路径

## usage
```javascript
import { RtspConverter } from 'rtsp_to_hls'

// 首先应确保 `ffmpegPath` 和 `outputDir` 存在
const encoder = 'libxh264' // 设置生成的 hls 流的编码格式, 不传或传空为不转码
const rc = new RtspConverter(url, ffmpegPath, outputDir, encoder)

// 监听事件
rc.on('error', handleRCError)
rc.on('stderr', handleRCError)
rc.on('connected', handleRCConnected)
rc.on('existsM3u8', () => {
    // 此时已经生成了 m3u8 文件
    console.log(rc.saveM3u8Path)
    // 使用 `file` 协议播放 `.m3u8` 文件
    this.videoSrc = `file://${rc.saveM3u8Path}`
})

// 开始生成 ts 文件
rc.download()
// 开始截图
// rc.printscreen()

// 在退出播放时必须要停掉 ffmpeg 进程, 否则 ...
rc.kill()
```

## test
先修改 `test/config.js` 中的参数

```bash
yarn test
```
