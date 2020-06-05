const expect = require('chai').expect
const config = require('./config.js')
const { RtspConverter } = require('../build/main.js')

// 测试套件 test suite, 表示一组相关的测试
describe('2. 测试执行场景', function () {
    describe('2-1. 验证 `processList` index', function () {
        // 测试用例 test case, 表示一个单独的测试, 是测试的最小单位
        it('验证基本路径', async function () {
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
