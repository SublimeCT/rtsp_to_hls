# rtsp -> hls
使用 `nodejs` 将 `rtsp` 视频流转换为 `hls` 并写入到本地文件, **必须安装 `ffmpeg` 才能使用**, 可以指定路径

## usage
```javascript
import { RtspConverter } from 'rtsp_to_hls'

const rc = new RtspConverter(url, ffmpegPath, outputDir)
rc.run()
```

## test
先修改 `test/config.js` 中的参数

```bash
yarn test
```
