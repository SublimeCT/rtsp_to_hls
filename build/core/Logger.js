"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LoggerCode = exports.LoggerTag = void 0;
const config_1 = require("../config");
var LoggerTag;
(function (LoggerTag) {
    LoggerTag["INFO"] = "\uD83D\uDCAC";
    LoggerTag["DEBUG"] = "\uD83C\uDFB2";
    LoggerTag["WARNING"] = "\u26A0\uFE0F";
    LoggerTag["ERROR"] = "\u274C";
})(LoggerTag = exports.LoggerTag || (exports.LoggerTag = {}));
var LoggerCode;
(function (LoggerCode) {
    LoggerCode["PARAMS_ERROR"] = "PARAMS_ERROR";
    LoggerCode["PARAMS_MISSING"] = "PARAMS_MISSING";
    LoggerCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    LoggerCode["EXEC_PATH_WRONG"] = "EXEC_PATH_WRONG";
    LoggerCode["PATH_WRONG"] = "PATH_WRONG";
    LoggerCode["HANDLE_FILE_FAILED"] = "HANDLE_FILE_FAILED";
    LoggerCode["DOWNLOAD_FAILED"] = "DOWNLOAD_FAILED";
    LoggerCode["EXEC_FAILED"] = "EXEC_FAILED";
    LoggerCode["KILL_PROCESS_FAILED"] = "KILL_PROCESS_FAILED";
})(LoggerCode = exports.LoggerCode || (exports.LoggerCode = {}));
class Logger {
    static log(options) {
        const msg = `${config_1.ConfigOptions.lOGGER_PREFIX} ${options.tag} ${options.category ? `[${options.category}]` : ''} ${options.code ? `<Code: ${options.code}>` : ''} ${options.message}`;
        console.log(msg);
        // 当处于测试环境时, process.exit() 会导致线程终止, 无法执行后续的断言, 所以改为抛出异常
        // if (options.exit) process.exit()
        if (options.exit)
            throw new Error(`${config_1.ConfigOptions.lOGGER_PREFIX} ⛔️`);
    }
    static error(message, code, exit = true) {
        const options = {
            tag: LoggerTag.ERROR,
            message,
            exit,
            code
        };
        Logger.log(options);
    }
    static info(message, category) {
        const options = {
            tag: LoggerTag.INFO,
            message,
        };
        Logger.log(options);
    }
    static debug(message, category) {
        const options = {
            tag: LoggerTag.DEBUG,
            message,
        };
        Logger.log(options);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map