/// <reference types="node" />
import child_process from 'child_process';
import { EventEmitter } from 'events';
import { Encoders, LaunchState, VideoMetaInfo } from './config';
/**
 * rtsp -> hls 转码程序
 * @example
 * ```javascript
 * const url = 'rtsp://admin:123456@192.168.1.143:554/h264/ch34/main/av_stream'
 * const rc = new RtspConverter(url, 'ffmpeg', '/Users/xxx/rtsp_to_hls')
 * rc.run()
 * ```
 * @description TODO 检测磁盘剩余空间
 */
export declare class RtspConverter extends EventEmitter {
    /**
     * rtsp URL
     */
    readonly url: string;
    /**
     * ffmpeg 二进制文件路径
     * @example '/Users/xxx/ffmpeg_static/ffmpeg'
     * @example 'C:\Users\xxx\ffmpeg_static\ffmpeg.exe'
     */
    readonly ffmpegPath: string;
    /**
     * m3u8 / ts 文件输出路径
     * @example '/Users/xxx/rtsp_output'
     */
    readonly outputDir: string;
    /**
     * 生成的 hls 流文件编码格式
     * @description 若传空则使用 `-c copy` 即不进行再编码(默认)
     * @description 应用场景: 视频源是 `h265`, 需要转为 `h264` 提供给浏览器播放
     */
    encoder?: "libx264" | "NVENC" | "libx265" | "libvpx" | "libaom" | undefined;
    process?: child_process.ChildProcess;
    printscreenProcess?: child_process.ChildProcess;
    getVideoEncoderProcess?: child_process.ChildProcess;
    execOptions: child_process.ExecOptions;
    execScreenOptions: child_process.ExecOptions;
    /**
     * 当前进程是否已经生成 m3u8 文件
     */
    isExistsM3u8File: boolean;
    /**
     * ffmpeg 命令的执行参数, 参数很复杂, `hls` 部分参数可参考 `ffmpeg -h muxer=hls`
     * @description 不包含 `ffmpeg -i 'rtsp://...'` 部分, 也不包含最终的 output 文件
     * @description 若最终执行的命名为 `ffmpeg -i 'rtsp://...' -fflags flush_packets -max_delay 1 -an -flags -global_header -hls_time 1 -vcodec copy -y ./index.m3u8`
     * @description 则该属性应该包含 `-fflags flush_packets -max_delay 1 -an -flags -global_header -hls_time 1 -vcodec copy -y`
     * @description 为了便于修改, 声明为 `object`
     * @description ffmpeg 格式为 `ffmpeg [全局参数] [输入文件参数] -i [输入文件] [输出文件参数] [输出文件]`
     * @refer http://www.ruanyifeng.com/blog/2020/01/ffmpeg.html
     * @refer https://www.jianshu.com/p/98ff1c49f232
     * @refer https://www.jianshu.com/p/6f09f95f992b
     */
    execParams: {
        [paramKey: string]: null | string | string[];
    };
    /**
     * 获取视频流快照时的 ffmpeg 参数
     * @example 若最终执行的命令为 ffmpeg -i 'rtsp://username:xxxxx@192.168.1.143:554/h264/ch34/main/av_stream' -hide_banner  -vcodec png -vframes 1 -ss 0:0:0 -an /Users/test/rtsp_to_hls/2/s.png
     * @example 则该属性为 -hide_banner -vcodec png -vframes 1 -ss 0:0:0 -an
     */
    printScreenParams: string[];
    /**
     * 执行开始时间
     */
    startTime: number;
    /**
     * 连接成功时间
     */
    connectionTime: number;
    /**
     * 执行结束时间
     */
    endTime: number;
    /**
     * 执行状态
     */
    state: LaunchState;
    /**
     * 当前实例在 `RtspConverter.processList` 中的索引
     */
    get index(): number;
    /**
     * 当前 rtsp -> hls 视频流文件保存路径
     */
    get savePath(): string;
    /**
     * m3u8 文件保存路径
     */
    get saveM3u8Path(): string;
    /**
     * 视频流快照文件保存路径
     */
    get saveScreenshotPath(): string;
    /**
     * 不同平台下的 ffmpeg 二进制包下载地址
     */
    static ffmpegDownloadURL: {
        [platform in NodeJS.Platform]?: string;
    };
    /**
     * 解析的视频元信息
     */
    static videoMetaInfos: {
        [url: string]: VideoMetaInfo;
    };
    /**
     * RtspConverter 线程集合
     * @description 在 `this.outputDir` 目录下, 每创建一个 `RtspConverter` 实例就会创建一个输出目录, 目录名以数组 `key` 作为名称
     */
    static processList: RtspConverter[];
    /**
     * 已经生成 `index.m3u8` 文件的 RtspConverter 线程集合
     */
    static get existsM3u8Process(): RtspConverter[];
    /**
     * 在 RtspConverter 线程集合中寻找当前实例的位置, 可作为目录名称
     * @param rc RtspConverter 实例
     */
    static findProcessIndex(rc: RtspConverter): number;
    static videoEncoderRegexp: RegExp;
    static audioEncoderRegexp: RegExp;
    constructor(
    /**
     * rtsp URL
     */
    url: string, 
    /**
     * ffmpeg 二进制文件路径
     * @example '/Users/xxx/ffmpeg_static/ffmpeg'
     * @example 'C:\Users\xxx\ffmpeg_static\ffmpeg.exe'
     */
    ffmpegPath: string, 
    /**
     * m3u8 / ts 文件输出路径
     * @example '/Users/xxx/rtsp_output'
     */
    outputDir: string, 
    /**
     * 生成的 hls 流文件编码格式
     * @description 若传空则使用 `-c copy` 即不进行再编码(默认)
     * @description 应用场景: 视频源是 `h265`, 需要转为 `h264` 提供给浏览器播放
     */
    encoder?: "libx264" | "NVENC" | "libx265" | "libvpx" | "libaom" | undefined);
    /**
     * 设置编码格式
     * @param encoder 编码格式
     */
    setEncoder(encoder?: Encoders): void;
    static get logIsEnabled(): boolean;
    static setLog(enable: boolean): void;
    static enableLog(): void;
    static disableLog(): void;
    /**
     * 检测传入的路径是否正确(仅检测该文件的可访问性)
     * @description 检测文件无需传入 checkParams, 检测命令时需要传入 `checkParams`
     * @param filePath string
     */
    static checkPath(filePath: string, checkParams?: string): boolean;
    download(): Promise<unknown>;
    emitSavedEvent(data: string): void;
    emitConnectedEvent(data: string): void;
    isConnectedInStdout(data: string): boolean;
    m3u8FileExistsInStdout(data: string): boolean;
    printscreen(): Promise<unknown>;
    getPrintScreenCommand(): string[];
    /**
     * 停止正在执行的 `ffmpeg` 进程
     * @description ⚠️ 当不需要显示视频时应该及时 kill ffmpeg 进程
     */
    kill(): boolean;
    /**
     * kill all ffmpeg process
     */
    static killAll(): void;
    beforeRun(): Promise<void>;
    getCommand(): string[];
    getExecParams(): string[];
    /**
     * 使用 `ffmpeg` 获取视频编码格式
     * @description 通过 `ffmpeg -i 'rtsp://xxxx'` 的 `stdout` 中获取视频信息
     */
    getVideoEncoder(url: string, useCache?: boolean): VideoMetaInfo | Promise<unknown>;
    /**
     * 从 `ffmpeg -i rtsp://xxxxx` 的输出信息中获取 `VideoMetaInfo`
     * @param data string
     */
    private _getVideoInfoByOutput;
}
