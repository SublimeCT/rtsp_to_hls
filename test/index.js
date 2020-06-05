const expect = require('chai').expect
const config = require('./config.js')
const fs = require('fs')
const { RtspConverter } = require('../build/main.js')
const { isThrow } = require('./utils.js')

// 测试套件 test suite, 表示一组相关的测试
describe('1. 输入参数检测', function() {
    describe('1-1. ffmpeg 路径错误', function() {
        // 测试用例 test case, 表示一个单独的测试, 是测试的最小单位
        it('应该抛出自定义异常', async function() {
            expect(() => new RtspConverter(config.urlExample, '/a/b/c/d', 'e/f/g/h')).throw()
        })
    })
    describe('1-2. output 路径错误', function() {
        // 测试用例 test case, 表示一个单独的测试, 是测试的最小单位
        it('应该抛出自定义异常', async function() {
            expect(() => new RtspConverter(config.urlExample, 'ffmpeg', 'e/f/g/h')).throw()
        })
    })
    describe('1-3. 参数正确', function() {
        // 测试用例 test case, 表示一个单独的测试, 是测试的最小单位
        it('参数正确, 应该顺利执行', async function() {
            new RtspConverter(config.urlExample, 'ffmpeg', config.outputDir)
        })
    })
})

// 测试套件 test suite, 表示一组相关的测试
describe('2. 测试执行场景', function() {
    describe('2-1. 验证 `processList` index', function() {
        // 测试用例 test case, 表示一个单独的测试, 是测试的最小单位
        it('验证基本路径', async function() {
            const savePath = '/Users/test/rtsp_to_hls/0'
            const saveM3u8Path = '/Users/test/rtsp_to_hls/0/index.m3u8'
            const rc = new RtspConverter(config.urlExample, 'ffmpeg', config.outputDir)
            await rc.beforeRun()
            expect(rc.index).to.equal(0)
            expect(rc.savePath).equal(savePath)
            expect(rc.saveM3u8Path).equal(saveM3u8Path)
        })
    })
})

describe('3. 测试执行过程', function() {
    describe('3-1. 测试 command 是否顺利执行', function () {
        it('应该顺利执行', function(done) {
            const rc = new RtspConverter(config.url, 'ffmpeg', config.outputDir)
            try {
                rc.download()
                setTimeout(() => {
                    console.log('after 4.5s...')
                    rc.kill()
                    done()
                }, 3000)
            } catch(err) {
                isThrow()
                done()
            }
        })
    })
})

describe('4. 功能测试', function () {
    describe('4-1. [download] 验证 `savePath` 下是否生成文件', function () {
        // 测试用例 test case, 表示一个单独的测试, 是测试的最小单位
        it('执行 7s 后应该已经生成了 index.m3u8', function (done) {
            const rc = new RtspConverter(config.url, 'ffmpeg', config.outputDir)
            rc.download()
            setTimeout(() => {
                fs.access(rc.saveM3u8Path, err => {
                    rc.kill()
                    expect(err).to.be.null
                    done()
                })
            }, 7000);
        })
    })
    describe('1-1. [printscreen] 取第一帧', function () {
        it('等待时间应该小于 5s', function (done) {
            const rc = new RtspConverter(config.url, 'ffmpeg', config.outputDir)
            rc.download()
        })
    })
})

