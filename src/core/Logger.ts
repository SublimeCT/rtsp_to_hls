import { ConfigOptions } from '../config'

export enum LoggerTag {
    INFO = '💬',
    DEBUG = '🎲',
    WARNING = '⚠️',
    ERROR = '❌',
}

export enum LoggerCode {
    PARAMS_ERROR = 'PARAMS_ERROR',
    PARAMS_MISSING = 'PARAMS_MISSING',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    EXEC_PATH_WRONG = 'EXEC_PATH_WRONG',
    PATH_WRONG = 'PATH_WRONG',
    HANDLE_FILE_FAILED = 'HANDLE_FILE_FAILED',
    DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
    EXEC_FAILED = 'EXEC_FAILED',
}

export interface LoggerOptions {
    tag: LoggerTag
    category?: string
    message: string
    exit?: boolean
    code?: LoggerCode
}

export class Logger {
    static log(options: LoggerOptions) {
        const msg = `${ConfigOptions.lOGGER_PREFIX} ${options.tag} ${options.category ? `[${options.category}]` : ''} ${options.code ? `<Code: ${options.code}>` : ''} ${options.message}`
        console.log(msg)
        // 当处于测试环境时, process.exit() 会导致线程终止, 无法执行后续的断言, 所以改为抛出异常
        // if (options.exit) process.exit()
        if (options.exit) throw new Error(`${ConfigOptions.lOGGER_PREFIX} ⛔️`)
    }
    static error(message: string, code: LoggerCode, exit: boolean = true) {
        const options: LoggerOptions = {
            tag: LoggerTag.ERROR,
            message,
            exit,
            code
        }
        Logger.log(options)
    }
    static info(message: string, category?: string) {
        const options: LoggerOptions = {
            tag: LoggerTag.INFO,
            message,
        }
        Logger.log(options)
    }
    static debug(message: string, category?: string) {
        const options: LoggerOptions = {
            tag: LoggerTag.DEBUG,
            message,
        }
        Logger.log(options)
    }
}