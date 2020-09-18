export class ConfigOptions {
    static lOGGER_PREFIX: string = '[rtsp_to_hls]'
    static M3U8_FILE_NAME: string = 'index.m3u8'
    static SCREENSHOT_NAME: string = 'screenshot.png'
}

/**
 * 编码格式
 * @refer http://www.ruanyifeng.com/blog/2020/01/ffmpeg.html
 */
export type Encoders = 'libx264' | 'NVENC' | 'libx265' | 'libvpx' | 'libaom'