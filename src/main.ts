import child_process from 'child_process'
import { Logger, LoggerCode } from './core/Logger'
import fs from 'fs'
import fse from 'fs-extra'
import path from 'path'
import { EventEmitter } from 'events'

/**
 * rtsp -> hls 转码程序
 * @example
 * ```javascript
 * const url = 'rtsp://admin:123456@192.168.1.143:554/h264/ch34/main/av_stream'
 * const rc = new RtspConverter(url, 'ffmpeg', '/Users/xxx/rtsp_to_hls')
 * rc.run()
 * ```
 */
export class RtspConverter extends EventEmitter {
    process?: child_process.ChildProcess
    execOptions: child_process.ExecOptions = {
        timeout: 10000,
        maxBuffer: 1024 * 1024 * 1024, // 单位是 byte, 参考自 http://nodejs.cn/api/child_process.html#child_process_child_process_exec_command_options_callback
        windowsHide: true,
    }
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
    execParams: { [paramKey: string]: string | number } = {
        '-hide_banner': '', // 好像没用 ...
        '-fflags flush_packets': '', // 立即将 packets 数据刷新入文件中, #refer https://www.jianshu.com/p/6f09f95f992b
        '-vcodec': '',
        '-flags': '', // 
        '-hls_time': 3, // 每片 1s #refer https://www.jianshu.com/p/98ff1c49f232
        '-hls_wrap': 20, // 设置刷新回滚参数, 当TS分片序号等于3时回滚 #refer https://www.jianshu.com/p/98ff1c49f232
        '-hls_flags delete_segments': '', // 只保留设置的切片个数, 删除其他早期的切片 #refer https://www.jianshu.com/p/98ff1c49f232
        '-hls_flags round_durations': '', // 可以实现切片信息的duration时长为整形 #refer https://www.jianshu.com/p/98ff1c49f232
        '-hls_list_size': 10, // m3u8 ts list size #refer https://www.jianshu.com/p/98ff1c49f232
        '-c': 'copy', // 直接复制, 不经过重新编码 这样比较快? #refer http://www.ruanyifeng.com/blog/2020/01/ffmpeg.html
        '-y': '',
    }
    /**
     * 当前实例在 `RtspConverter.processList` 中的索引
     */
    get index(): number {
        return RtspConverter.findProcessIndex(this)
    }
    /**
     * 当前 rtsp -> hls 视频流文件保存路径
     */
    get savePath(): string {
        return path.join(this.outputDir, this.index.toString())
    }
    /**
     * m3u8 文件保存路径
     */
    get saveM3u8Path(): string {
        return path.join(this.savePath, 'index.m3u8')
    }
    /**
     * RtspConverter 线程集合
     * @description 在 `this.outputDir` 目录下, 每创建一个 `RtspConverter` 实例就会创建一个输出目录, 目录名以数组 `key` 作为名称
     */
    static processList: RtspConverter[] = []
    /**
     * 在 RtspConverter 线程集合中寻找当前实例的位置, 可作为目录名称
     * @param rc RtspConverter 实例
     */
    static findProcessIndex(rc: RtspConverter): number {
        return RtspConverter.processList.findIndex(p => p === rc)
    }
    constructor(
        /**
         * rtsp URL
         */
        readonly url: string,
        /**
         * ffmpeg 二进制文件路径
         * @example '/Users/xxx/ffmpeg_static/ffmpeg'
         * @example 'C:\Users\xxx\ffmpeg_static\ffmpeg.exe'
         */
        readonly ffmpegPath: string,
        /**
         * m3u8 / ts 文件输出路径
         * @example '/Users/xxx/rtsp_output'
         */
        readonly outputDir: string,
    ) {
        super()
        if (!RtspConverter.checkPath(ffmpegPath, '-version')) Logger.error('ffmpeg command path invalid', LoggerCode.EXEC_PATH_WRONG)
        if (!RtspConverter.checkPath(outputDir)) Logger.error('output path invalid', LoggerCode.PATH_WRONG)
    }
    /**
     * 检测传入的路径是否正确(仅检测该文件的可访问性)
     * @param filePath string
     */
    static checkPath(filePath: string, checkParams?: string): boolean {
        let isValid: boolean = false
        try {
            if (checkParams) {
                child_process.execSync(filePath + ' ' + checkParams)
            } else {
                fs.accessSync(filePath)
            }
            isValid = true
        } catch(err) {
            Logger.debug(`${filePath} -> ${err.message}`)
        }
        return isValid
    }
    async download() {
        await this.beforeRun()
        const command = this.getCommand()
        Logger.debug(`\ncommand: ${command}\n`)
        return new Promise(resolve => {
            this.process = child_process.exec(command, this.execOptions, (err, stdout, stderr) => {
                // ffmpeg 执行失败
                if (err) {
                    Logger.error(`command execute failed:\n\tcommand: ${command}\n\terr: ${err.message}\n`, LoggerCode.EXEC_FAILED, false)
                    return
                }
                Logger.debug(`stdout: ${stdout}`)
                Logger.debug(`stderr: ${stderr}`)
                resolve(stdout)
            })
            this.process.on('exit', (code, signal) => {
                Logger.debug(`ffmpeg process event <exit>:\n\tcode: ${code}\n\tsignal: ${signal}`, 'process event')
                this.emit('exit', code, signal)
            })
            this.process.on('error', err => {
                Logger.debug(`ffmpeg process event <error>:\n\tcode: ${err}`, 'process event')
                this.emit('error', err)
            })
        })
    }
    async printscreen() {}
    /**
     * 停止正在执行的 `ffmpeg` 进程
     */
    kill(): boolean {
        if (!this.process || this.process.killed) return false
        this.process.kill('SIGHUP')
        return true
    }
    async beforeRun() {
        // 将当前实例存入 process list
        RtspConverter.processList.push(this)
        console.log('\n>>>>>>>>> 当前程序所处位置\n', RtspConverter.processList.length, this.index)
        // 确保 m3u8 文件保存目录存在且是空目录
        Logger.debug(`remove ${this.savePath} directory if exists`, 'before run')
        await fse.remove(this.savePath)
        Logger.debug(`create ${this.savePath} directory if not exists`, 'before run')
        await fse.ensureDir(this.savePath)
    }
    getCommand(): string {
        const execParams = this.getExecParams()
        return `${this.ffmpegPath} -i '${this.url}' ${execParams} ${this.saveM3u8Path}`
    }
    getExecParams(): string {
        let params = ''
        for (const key in this.execParams) {
            params += `${key} ${this.execParams[key]} `
        }
        return params
    }
}
