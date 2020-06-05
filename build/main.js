"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtspConverter = void 0;
const child_process_1 = __importDefault(require("child_process"));
const Logger_1 = require("./core/Logger");
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const events_1 = require("events");
/**
 * rtsp -> hls 转码程序
 * @example
 * ```javascript
 * const url = 'rtsp://admin:123456@192.168.1.143:554/h264/ch34/main/av_stream'
 * const rc = new RtspConverter(url, 'ffmpeg', '/Users/xxx/rtsp_to_hls')
 * rc.run()
 * ```
 */
let RtspConverter = /** @class */ (() => {
    class RtspConverter extends events_1.EventEmitter {
        constructor(
        /**
         * rtsp URL
         */
        url, 
        /**
         * ffmpeg 二进制文件路径
         * @example '/Users/xxx/ffmpeg_static/ffmpeg'
         * @example 'C:\Users\xxx\ffmpeg_static\ffmpeg.exe'
         */
        ffmpegPath, 
        /**
         * m3u8 / ts 文件输出路径
         * @example '/Users/xxx/rtsp_output'
         */
        outputDir) {
            super();
            this.url = url;
            this.ffmpegPath = ffmpegPath;
            this.outputDir = outputDir;
            this.execOptions = {
                timeout: 10000,
                maxBuffer: 1024 * 1024 * 1024,
                windowsHide: true,
            };
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
            this.execParams = {
                '-hide_banner': '',
                '-fflags flush_packets': '',
                '-vcodec': '',
                '-flags': '',
                '-hls_time': 3,
                '-hls_wrap': 20,
                '-hls_flags delete_segments': '',
                '-hls_flags round_durations': '',
                '-hls_list_size': 10,
                '-c': 'copy',
                '-y': '',
            };
            if (!RtspConverter.checkPath(ffmpegPath, '-version'))
                Logger_1.Logger.error('ffmpeg command path invalid', Logger_1.LoggerCode.EXEC_PATH_WRONG);
            if (!RtspConverter.checkPath(outputDir))
                Logger_1.Logger.error('output path invalid', Logger_1.LoggerCode.PATH_WRONG);
        }
        /**
         * 当前实例在 `RtspConverter.processList` 中的索引
         */
        get index() {
            return RtspConverter.findProcessIndex(this);
        }
        /**
         * 当前 rtsp -> hls 视频流文件保存路径
         */
        get savePath() {
            return path_1.default.join(this.outputDir, this.index.toString());
        }
        /**
         * m3u8 文件保存路径
         */
        get saveM3u8Path() {
            return path_1.default.join(this.savePath, 'index.m3u8');
        }
        /**
         * 在 RtspConverter 线程集合中寻找当前实例的位置, 可作为目录名称
         * @param rc RtspConverter 实例
         */
        static findProcessIndex(rc) {
            return RtspConverter.processList.findIndex(p => p === rc);
        }
        /**
         * 检测传入的路径是否正确(仅检测该文件的可访问性)
         * @param filePath string
         */
        static checkPath(filePath, checkParams) {
            let isValid = false;
            try {
                if (checkParams) {
                    child_process_1.default.execSync(filePath + ' ' + checkParams);
                }
                else {
                    fs_1.default.accessSync(filePath);
                }
                isValid = true;
            }
            catch (err) {
                Logger_1.Logger.debug(`${filePath} -> ${err.message}`);
            }
            return isValid;
        }
        run() {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.beforeRun();
                const command = this.getCommand();
                Logger_1.Logger.debug(`\ncommand: ${command}\n`);
                return new Promise(resolve => {
                    this.process = child_process_1.default.exec(command, this.execOptions, (err, stdout, stderr) => {
                        // ffmpeg 执行失败
                        if (err) {
                            Logger_1.Logger.error(`command execute failed:\n\tcommand: ${command}\n\terr: ${err.message}\n`, Logger_1.LoggerCode.EXEC_FAILED, false);
                            return;
                        }
                        Logger_1.Logger.debug(`stdout: ${stdout}`);
                        Logger_1.Logger.debug(`stderr: ${stderr}`);
                        resolve(stdout);
                    });
                    this.process.on('exit', (code, signal) => {
                        Logger_1.Logger.debug(`ffmpeg process event <exit>:\n\tcode: ${code}\n\tsignal: ${signal}`, 'process event');
                        this.emit('exit', code, signal);
                    });
                    this.process.on('error', err => {
                        Logger_1.Logger.debug(`ffmpeg process event <error>:\n\tcode: ${err}`, 'process event');
                        this.emit('error', err);
                    });
                });
            });
        }
        /**
         * 停止正在执行的 `ffmpeg` 进程
         */
        kill() {
            if (!this.process || this.process.killed)
                return false;
            this.process.kill('SIGHUP');
            return true;
        }
        beforeRun() {
            return __awaiter(this, void 0, void 0, function* () {
                // 将当前实例存入 process list
                RtspConverter.processList.push(this);
                console.log('\n>>>>>>>>> 当前程序所处位置\n', RtspConverter.processList.length, this.index);
                // 确保 m3u8 文件保存目录存在且是空目录
                Logger_1.Logger.debug(`remove ${this.savePath} directory if exists`, 'before run');
                yield fs_extra_1.default.remove(this.savePath);
                Logger_1.Logger.debug(`create ${this.savePath} directory if not exists`, 'before run');
                yield fs_extra_1.default.ensureDir(this.savePath);
            });
        }
        getCommand() {
            const execParams = this.getExecParams();
            return `${this.ffmpegPath} -i '${this.url}' ${execParams} ${this.saveM3u8Path}`;
        }
        getExecParams() {
            let params = '';
            for (const key in this.execParams) {
                params += `${key} ${this.execParams[key]} `;
            }
            return params;
        }
    }
    /**
     * RtspConverter 线程集合
     * @description 在 `this.outputDir` 目录下, 每创建一个 `RtspConverter` 实例就会创建一个输出目录, 目录名以数组 `key` 作为名称
     */
    RtspConverter.processList = [];
    return RtspConverter;
})();
exports.RtspConverter = RtspConverter;
//# sourceMappingURL=main.js.map