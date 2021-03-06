const expect = require('chai').expect
const config = require('./config.js')
const fs = require('fs')
const { RtspConverter } = require('../build/main.js')

describe('4. 功能测试', function () {
    describe('4-1. [download] 验证 `savePath` 下是否生成文件', function () {
        // 测试用例 test case, 表示一个单独的测试, 是测试的最小单位
        it('执行 10s 内应该已经生成了 index.m3u8', function (done) {
            const rc = new RtspConverter(config.url, 'ffmpeg', config.outputDir)
            let existsM3u8 = false
            let timeout = null
            rc.download()
            rc.on('connected', () => {
                expect(true).to.be.true
            })
            rc.on('existsM3u8', () => {
                existsM3u8 = true
                clearTimeout(timeout)
                fs.access(rc.saveM3u8Path, err => {
                    rc.kill()
                    done()
                    expect(err).to.be.null
                })
            })
            timeout = setTimeout(() => {
                expect(existsM3u8).to.be.true
                done()
            }, 10000)
        })
    })
    describe('4-2. [printscreen] 取第一帧', function () {
        it('等待时间应该小于 7s', async function() {
            const rc = new RtspConverter(config.url, 'ffmpeg', config.outputDir)
            const startTime = Date.now()
            const screenshotPath = await rc.printscreen()
            const endTime = Date.now()
            rc.kill()
            expect(endTime - startTime).to.lt(7000)
            return new Promise(resolve => {
                fs.access(screenshotPath, err => {
                    expect(err).to.be.null
                    resolve()
                })
            })
        })
    })
})
