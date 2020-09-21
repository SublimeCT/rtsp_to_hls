import child_process from 'child_process'
import { Logger, LoggerCode } from './core/Logger'
import fs from 'fs'
import fse from 'fs-extra'
import path from 'path'
import { EventEmitter } from 'events'
import { ConfigOptions, Encoders, LaunchState, VideoMetaInfo } from './config'

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
export class RtspConverter extends EventEmitter {
    process?: child_process.ChildProcess
    printscreenProcess?: child_process.ChildProcess
    getVideoEncoderProcess?: child_process.ChildProcess
    execOptions: child_process.ExecOptions = {
        timeout: 10000,
        maxBuffer: 1024 * 1024 * 1024, // 单位是 byte, 参考自 http://nodejs.cn/api/child_process.html#child_process_child_process_exec_command_options_callback
        windowsHide: true,
    }
    execScreenOptions: child_process.ExecOptions = {
        timeout: 10000,
        windowsHide: true,
    }
    /**
     * 当前进程是否已经生成 m3u8 文件
     */
    isExistsM3u8File: boolean = true
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
    execParams: { [paramKey: string]: null | string | string[] } = {
        '-hide_banner': '', // 好像没用 ...
        '-fflags': 'flush_packets', // 立即将 packets 数据刷新入文件中, #refer https://www.jianshu.com/p/6f09f95f992b
        '-vcodec': '',
        '-flags': '',
        '-hls_time': '3', // 每片 1s #refer https://www.jianshu.com/p/98ff1c49f232
        '-hls_wrap': '20', // 设置刷新回滚参数, 当TS分片序号等于 20 时回滚 #refer https://www.jianshu.com/p/98ff1c49f232
        '-hls_flags': [
            '-hls_flags', 'delete_segments', // 只保留设置的切片个数, 删除其他早期的切片 #refer https://www.jianshu.com/p/98ff1c49f232
            '-hls_flags', 'round_durations', // 可以实现切片信息的duration时长为整形 #refer https://www.jianshu.com/p/98ff1c49f232
            // '-hls_flags', 'split_by_time',
        ],
        '-hls_list_size': '10', // m3u8 ts list size #refer https://www.jianshu.com/p/98ff1c49f232
        '-c:v': null, // 将视频流编码为 h.264(libx264) 格式(在获取实际执行的参数时如果指定了 `this.encoder`, 则会使用该参数, 否则会删除该参数) #refer https://www.jianshu.com/p/98ff1c49f232
        // '-bsf:v': 'h264_mp4toannexb', // 转换为常见于实时传输流的H.264 AnnexB标准的编码
        '-c': null, // 直接复制(`copy` 在获取实际执行的参数时如果指定了 `this.encoder`, 则会删除该参数), 不经过重新编码 这样比较快? #refer http://www.ruanyifeng.com/blog/2020/01/ffmpeg.html
        '-y': '',
    }
    /**
     * 获取视频流快照时的 ffmpeg 参数
     * @example 若最终执行的命令为 ffmpeg -i 'rtsp://username:xxxxx@192.168.1.143:554/h264/ch34/main/av_stream' -hide_banner  -vcodec png -vframes 1 -ss 0:0:0 -an /Users/test/rtsp_to_hls/2/s.png
     * @example 则该属性为 -hide_banner -vcodec png -vframes 1 -ss 0:0:0 -an
     */
    printScreenParams: string[] = ['-hide_banner', '-vcodec', 'png', '-vframes', '1', '-ss', '0:0:0', '-an']
    /**
     * 执行开始时间
     */
    startTime: number = 0
    /**
     * 连接成功时间
     */
    connectionTime: number = 0
    /**
     * 执行结束时间
     */
    endTime: number = 0
    /**
     * 执行状态
     */
    state: LaunchState = 'idle'
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
        if (this.index === -1) throw new Error('current ffmpeg process maybe killed')
        return path.join(this.outputDir, this.index.toString())
    }
    /**
     * m3u8 文件保存路径
     */
    get saveM3u8Path(): string {
        return path.join(this.savePath, ConfigOptions.M3U8_FILE_NAME)
    }
    /**
     * 视频流快照文件保存路径
     */
    get saveScreenshotPath(): string {
        return path.join(this.savePath, ConfigOptions.SCREENSHOT_NAME)
    }
    /**
     * 不同平台下的 ffmpeg 二进制包下载地址
     */
    static ffmpegDownloadURL: { [platform in NodeJS.Platform]?: string } = {
        win32: 'https://ffmpeg.zeranoe.com/builds/win32/static/ffmpeg-4.3.1-win32-static.zip',
        darwin: 'https://ffmpeg.zeranoe.com/builds/macos64/static/ffmpeg-4.3.1-macos64-static.zip'
    }
    /**
     * 解析的视频元信息
     */
    static videoMetaInfos: {[url: string]: VideoMetaInfo} = {}
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
    static videoEncoderRegexp: RegExp = /\sVideo:\s([\d\w]+)\s/
    static audioEncoderRegexp: RegExp = /\sAudio:\s([\d\w]+)\s/
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
        /**
         * 生成的 hls 流文件编码格式
         * @description 若传空则使用 `-c copy` 即不进行再编码(默认)
         * @description 应用场景: 视频源是 `h265`, 需要转为 `h264` 提供给浏览器播放
         */
        public encoder?: Encoders,
    ) {
        super()
        if (!RtspConverter.checkPath(ffmpegPath, '-version')) Logger.error('ffmpeg command path invalid', LoggerCode.EXEC_PATH_WRONG)
        if (!RtspConverter.checkPath(outputDir)) Logger.error('output path invalid', LoggerCode.PATH_WRONG)
        this.setEncoder(encoder)
    }
    /**
     * 设置编码格式
     * @param encoder 编码格式
     */
    setEncoder(encoder?: Encoders) {
        if (encoder) {
            this.execParams['-c:v'] = encoder
            this.execParams['-c'] = null
        } else {
            this.execParams['-c'] = 'copy'
            this.execParams['-c:v'] = null
        }
        console.log(`-c -> ${this.execParams['-c']}; -c:v -> ${this.execParams['-c:v']}`)
    }
    // /**
    //  * 下载 ffmpeg 二进制包到本地
    //  * @param ffmpegPath 保存路径
    //  */
    // static downloadFfmpeg(ffmpegPath: string, downloadURL?: string) {
    //     if (!RtspConverter.checkPath(ffmpegPath)) Logger.error('download path invalid', LoggerCode.PATH_WRONG)
    //     const url = downloadURL || RtspConverter.ffmpegDownloadURL[os.platform()]
    // }
    /**
     * 检测传入的路径是否正确(仅检测该文件的可访问性)
     * @description 检测文件无需传入 checkParams, 检测命令时需要传入 `checkParams`
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
        if (this.state === 'killed') return false
        await this.beforeRun()
        const command = this.getCommand()
        return new Promise(resolve => {
            if (this.state === 'killed') resolve(false)
            this.state = 'active'
            // 参考 http://nodejs.cn/api/child_process.html#child_process_child_process_spawn_command_args_options
            Logger.debug(`\ncommand: \n\t${this.ffmpegPath + ' ' + command.join(' ')}\n\texecOptions:\n\t${JSON.stringify(this.execOptions)}`)
            this.process = child_process.spawn(this.ffmpegPath, command, this.execOptions)
            this.startTime = Date.now() // 记录开始时间用于统计
            this.process.on('error', err => {
                Logger.debug(`ffmpeg process event <error>:\n\tcode: ${err}`, 'process event')
                resolve(this.index === -1 ? '' : this.saveM3u8Path)
                this.emit('error', err)
            })
            this.process.on('exit', (code, signal) => {
                Logger.debug(`ffmpeg process event <exit>:\n\tcode: ${code}\n\tsignal: ${signal}`, 'process event')
                resolve(this.index === -1 ? '' : this.saveM3u8Path)
                this.emit('exit', code, signal)
            })
            this.process.stderr?.on('data', data => {
                Logger.debug(`ffmpeg process event <stderr><data>:\n\tdata: ${data}`, 'process event<stderr>')
                // resolve(this.saveM3u8Path)
                this.emit('stderr', data)
                // 若已生成 m3u8 文件则触发 m3u8 文件已生成事件
                this.emitSavedEvent(data)
                // 若已连接成功则触发 connection 事件
                this.emitConnectedEvent(data)
            })
            Logger.debug('是否有 stdout ? ' + !!this.process.stdout)
            this.process.stdout?.on('data', data => {
                Logger.debug(`ffmpeg process event <stdout><data>:\n\tdata: ${data}`, 'process event<stdout>')
                resolve(this.saveM3u8Path)
                this.emit('stdout', data)
                // 触发 m3u8 文件已生成事件
                this.emitSavedEvent(data)
                // 若已连接成功则触发 connection 事件
                this.emitConnectedEvent(data)
            })
        })
    }
    emitSavedEvent(data: string) {
        const existsM3u8File = this.m3u8FileExistsInStdout(data)
        if (existsM3u8File) {
            this.isExistsM3u8File = true
            this.endTime = Date.now()
            Logger.info(`exists m3u8 file, ${this.endTime - this.startTime}ms`, 'timer')
            this.emit('existsM3u8')
        }
    }
    emitConnectedEvent(data: string) {
        const connected = this.isConnectedInStdout(data)
        if (connected) {
            this.connectionTime = Date.now()
            Logger.info(`camera device is connected, ${this.connectionTime - this.startTime}ms`, 'timer')
            this.emit('connected')
        }
    }
    isConnectedInStdout(data: string): boolean {
        return data.indexOf(this.url) !== -1
    }
    m3u8FileExistsInStdout(data: string): boolean {
        return data.indexOf('index1.ts') !== -1 && data.indexOf('for writing') !== -1
        // return data.indexOf(this.saveM3u8Path) !== -1
    }
    // async loopCheckFileExists(filePath: string, times: number = 200, timeout: number = 123) {
    //     for (let t = times; t--;) {
    //         await this._fileExists(filePath)
    //     }
    // }
    // private _fileExists(filePath: string): Promise<boolean> {
    //     return new Promise(resolve => {

    //     })
    // }
    async printscreen() {
        if (this.state === 'killed') return false
        await this.beforeRun()
        const command = this.getPrintScreenCommand()
        return new Promise((resolve, reject) => {
            if (this.state === 'killed') resolve(false)
            this.state = 'active'
            // 参考 http://nodejs.cn/api/child_process.html#child_process_child_process_spawn_command_args_options
            Logger.debug(`\ncommand: \n\t${this.ffmpegPath + ' ' + command.join(' ')}\n\texecOptions:\n\t${JSON.stringify(this.execScreenOptions)}`)
            this.startTime = Date.now() // 记录开始时间用于统计
            this.printscreenProcess = child_process.spawn(this.ffmpegPath, command, this.execScreenOptions)
            this.printscreenProcess.on('error', err => {
                Logger.debug(`ffmpeg process (printscreen) event <error>:\n\tcode: ${err}`, 'process event')
                this.emit('printscreen error', err)
                this.state = 'idle'
                resolve(this.saveScreenshotPath)
            })
            this.printscreenProcess.on('exit', (code, signal) => {
                Logger.debug(`ffmpeg process (printscreen) event <exit>:\n\tcode: ${code}\n\tsignal: ${signal}`, 'process event')
                this.endTime = Date.now()
                Logger.info(`generated printscreen file, ${this.endTime - this.startTime}ms`, 'timer')
                this.emit('printscreen exit', code, signal)
                this.state = 'idle'
                resolve(this.saveScreenshotPath)
            })
            this.printscreenProcess.stderr?.on('data', data => {
                Logger.debug(`ffmpeg process (printscreen) event <stderr><data>:\n\tdata: ${data}`, 'process event<stderr>')
                this.emit('printscreen stderr', data)
                // 若已连接成功则触发 connection 事件
                this.emitConnectedEvent(data)
            })
            this.printscreenProcess.stdout?.on('data', data => {
                Logger.debug(`ffmpeg process (printscreen) event <stdout><data>:\n\tdata: ${data}`, 'process event<stdout>')
                this.emit('printscreen stdout', data)
                // 若已连接成功则触发 connection 事件
                this.emitConnectedEvent(data)
            })
            // this.printscreenProcess = child_process.exec(command, this.execScreenOptions, (err, stdout) => {
            //     if (err) {
            //         Logger.error(`printscreen execute failed:\n\tcommand: ${command}\n\terr: ${err.message}`, LoggerCode.EXEC_FAILED, false)
            //         return
            //     }
            // })
            // this.printscreenProcess.on('exit', (code, signal) => {
            //     Logger.debug(`ffmpeg printscreen process event <exit>:\n\tcode: ${code}\n\tsignal: ${signal}`, 'process event')
            //     resolve(this.saveScreenshotPath)
            //     this.emit('exit', code, signal)
            // })
            // this.printscreenProcess.on('error', err => {
            //     Logger.debug(`ffmpeg printscreen process event <error>:\n\tcode: ${err}`, 'process event')
            //     reject(this.saveScreenshotPath)
            //     this.emit('error', err)
            // })
        })
    }
    getPrintScreenCommand(): string[] {
        return ['-i', this.url, ...this.printScreenParams, this.saveScreenshotPath]
    }
    /**
     * 停止正在执行的 `ffmpeg` 进程
     * @description ⚠️ 当不需要显示视频时应该及时 kill ffmpeg 进程
     */
    kill(): boolean {
        this.state = 'killed'
        this.isExistsM3u8File = false
        const index = RtspConverter.processList.findIndex(p => p === this)
        if (index !== -1) {
            RtspConverter.processList.splice(index, 1)
        }
        if (!this.process || this.process.killed) return false
        this.process.kill('SIGHUP')
        return true
    }
    /**
     * kill all ffmpeg process
     */
    static killAll() {
        for (let processIndex = RtspConverter.processList.length; processIndex--;) {
            const p = RtspConverter.processList[processIndex]
            try {
                p.kill()
            } catch(err) {
                Logger.error(`ffmpeg process list event <kill process failed>:\n\terror message: ${err}`, LoggerCode.KILL_PROCESS_FAILED, false)
            }
        }
        // remove killed process
        RtspConverter.processList = RtspConverter.processList.filter(p => p.state !== 'killed')
        // // remove all process
        // RtspConverter.processList = []
    }
    async beforeRun() {
        // 将当前实例存入 process list
        RtspConverter.processList.push(this)
        Logger.debug(`\n\t当前程序所处位置: ${this.index}/${RtspConverter.processList.length}\n`)
        // 确保 m3u8 文件保存目录存在且是空目录
        Logger.debug(`remove ${this.savePath} directory if exists`, 'before run')
        await fse.remove(this.savePath)
        Logger.debug(`create ${this.savePath} directory if not exists`, 'before run')
        await fse.ensureDir(this.savePath)
    }
    getCommand(): string[] {
        const execParams = this.getExecParams()
        return ['-i', this.url, ...execParams, this.saveM3u8Path]
    }
    getExecParams(): string[] {
        let params = []
        for (const key in this.execParams) {
            if (this.execParams[key] === null) continue
            if (Array.isArray(this.execParams[key])) {
                params.push(...(<Array<string>>this.execParams[key]))
            } else {
                params.push(key)
                if (this.execParams[key]) params.push((<string>this.execParams[key]).toString())
            }
        }
        return params
    }
    /**
     * 使用 `ffmpeg` 获取视频编码格式
     * @description 通过 `ffmpeg -i 'rtsp://xxxx'` 的 `stdout` 中获取视频信息
     */
    getVideoEncoder(url: string, useCache: boolean = true) {
        if (RtspConverter.videoMetaInfos[url]) return RtspConverter.videoMetaInfos[url]
        return new Promise((resolve, reject) => {
            // output such as:
            //      ...
            //      Stream #0:0: Audio: aac (LC), 12000 Hz, stereo, fltp
            //      Stream #0:1: Video: h264 (Constrained Baseline), yuv420p(progressive), 240x160, 24 fps, 24 tbr, 90k tbn, 48 tbc
            //      ...
            let ffmpegRawOutput = ''
            let metaInfo: VideoMetaInfo
            this.getVideoEncoderProcess = child_process.spawn(this.ffmpegPath, ['-i', url])
            this.getVideoEncoderProcess.on('error', err => {
                Logger.debug(`ffmpeg get video encoder process event <error>:\n\tcode: ${err}`, 'process event')
                reject(err)
            })
            this.getVideoEncoderProcess.on('exit', (code, signal) => {
                Logger.debug(`ffmpeg get video encoder process event <exit>:\n\tcode: ${code}\n\tsignal: ${signal}`, 'process event')
                RtspConverter.videoMetaInfos[url] = metaInfo
                resolve(metaInfo)
            })
            this.getVideoEncoderProcess.stderr?.on('data', data => {
                Logger.debug(`ffmpeg process (get video encoder) event <stderr><data>:\n\tdata: ${data}`, 'process event<stderr>')
                this.emit('getVideoEncoder-stderr', data)
                // 从输出中获取编码格式
                ffmpegRawOutput += data.toString('utf-8')
                metaInfo = this._getVideoInfoByOutput(ffmpegRawOutput)
            })
        })
    }
    /**
     * 从 `ffmpeg -i rtsp://xxxxx` 的输出信息中获取 `VideoMetaInfo`
     * @param data string
     */
    private _getVideoInfoByOutput(data: string): VideoMetaInfo {
        const videoMetaInfo: VideoMetaInfo = {
            videoEncoder: '',
            audioEncoder: '',
        }
        const videoMatches = data.match(RtspConverter.videoEncoderRegexp)
        const audioMatches = data.match(RtspConverter.audioEncoderRegexp)
        if (Array.isArray(videoMatches) && videoMatches[1]) {
            videoMetaInfo.videoEncoder = videoMatches[1]
        }
        if (Array.isArray(audioMatches) && audioMatches[1]) {
            videoMetaInfo.audioEncoder = audioMatches[1]
        }
        return videoMetaInfo
    }
}
