export declare enum LoggerTag {
    INFO = "\uD83D\uDCAC",
    DEBUG = "\uD83C\uDFAC",
    WARNING = "\u26A0\uFE0F",
    ERROR = "\u274C"
}
export declare enum LoggerCode {
    PARAMS_ERROR = "PARAMS_ERROR",
    PARAMS_MISSING = "PARAMS_MISSING",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    EXEC_PATH_WRONG = "EXEC_PATH_WRONG",
    PATH_WRONG = "PATH_WRONG",
    HANDLE_FILE_FAILED = "HANDLE_FILE_FAILED",
    DOWNLOAD_FAILED = "DOWNLOAD_FAILED",
    EXEC_FAILED = "EXEC_FAILED"
}
export interface LoggerOptions {
    tag: LoggerTag;
    category?: string;
    message: string;
    exit?: boolean;
    code?: LoggerCode;
}
export declare class Logger {
    static log(options: LoggerOptions): void;
    static error(message: string, code: LoggerCode, exit?: boolean): void;
    static info(message: string, category?: string): void;
    static debug(message: string, category?: string): void;
}
