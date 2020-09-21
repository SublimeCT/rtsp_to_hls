export declare class ConfigOptions {
    static lOGGER_PREFIX: string;
    static M3U8_FILE_NAME: string;
    static SCREENSHOT_NAME: string;
}
/**
 * 编码格式
 * @refer http://www.ruanyifeng.com/blog/2020/01/ffmpeg.html
 */
export declare type Encoders = 'libx264' | 'NVENC' | 'libx265' | 'libvpx' | 'libaom';
/**
 * 视频元信息
 */
export interface VideoMetaInfo {
    videoEncoder?: Encoders | string;
    audioEncoder?: Encoders | string;
}
/**
 * RtspConverter 的执行状态
 */
export declare type LaunchState = 'active' | 'killed' | 'idle';
