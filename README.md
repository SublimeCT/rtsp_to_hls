# rtsp -> hls
使用 `nodejs` 将 `rtsp` 视频流转换为 `hls` 并写入到本地文件, **必须安装 `ffmpeg` 才能使用**, 可以指定路径

## usage
```javascript
import { RtspConverter } from 'rtsp_to_hls'

const rc = new RtspConverter(url, ffmpegPath, outputDir)
rc.download()
rc.printscreen()

rc.on('error', err => handleErr(err))

// 在退出播放时必须要停掉 ffmpeg 进程, 否则 ...
rc.kill()
```

## test
先修改 `test/config.js` 中的参数

```bash
yarn test
```
