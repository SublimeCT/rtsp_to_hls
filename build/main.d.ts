/// <reference types="node" />
import child_process from 'child_process';
import { EventEmitter } from 'events';
/**
 * rtsp -> hls 转码程序
 * @example
 * ```javascript
 * const url = 'rtsp://admin:123456@192.168.1.143:554/h264/ch34/main/av_stream'
 * const rc = new RtspConverter(url, 'ffmpeg', '/Users/xxx/rtsp_to_hls')
 * rc.run()
 * ```
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
    process?: child_process.ChildProcess;
    execOptions: child_process.ExecOptions;
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
     * ffmpeg -i 'rtsp://admin:shengyun123@192.168.1.143:554/h264/ch34/main/av_stream' -hide_banner  -fflags  flush_packets  -vcodec  -flags  -hls_time 3 -hls_wrap 20 -hls_flags round_durations  -hls_flags delete_segments  -hls_list_size 10 -c copy -y   /Users/test/rtsp_to_hls/2/index.m3u8
     * ffmpeg -i 'rtsp://admin:shengyun123@192.168.1.143:554/h264/ch34/main/av_stream' -hide_banner  -fflags  flush_packets  -vcodec -flags  -hls_time 3 -hls_wrap 20 -hls_flags delete_segments -hls_flags round_durations  -hls_list_size 10 -c copy  -y   /Users/test/rtsp_to_hls/0/index.m3u8
     */
    execParams: {
        [paramKey: string]: string | number;
    };
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
     * RtspConverter 线程集合
     * @description 在 `this.outputDir` 目录下, 每创建一个 `RtspConverter` 实例就会创建一个输出目录, 目录名以数组 `key` 作为名称
     */
    static processList: RtspConverter[];
    /**
     * 在 RtspConverter 线程集合中寻找当前实例的位置, 可作为目录名称
     * @param rc RtspConverter 实例
     */
    static findProcessIndex(rc: RtspConverter): number;
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
    outputDir: string);
    /**
     * 检测传入的路径是否正确(仅检测该文件的可访问性)
     * @param filePath string
     */
    static checkPath(filePath: string, checkParams?: string): boolean;
    run(): Promise<unknown>;
    /**
     * 停止正在执行的 `ffmpeg` 进程
     */
    kill(): boolean;
    beforeRun(): Promise<void>;
    getCommand(): string;
    getExecParams(): string;
}
