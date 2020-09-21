const expect = require('chai').expect
const config = require('./config.js')
const { RtspConverter } = require('../build/main.js')

describe('5. 退出 ffmpeg 进程测试', function () {
    describe('5-1. this.kill() check state', function () {
        it('kill process success', function () {
            const rc = new RtspConverter(config.url, 'ffmpeg', config.outputDir)
            rc.download()
            const result = rc.kill()
            expect(result).to.equal(false, 'kill() return false, because process not create')
            expect(rc.state).to.equal('killed')
        })
    })
    describe('5-2. this.kill() check process exit', function () {
        it('check this.process can exit', function (done) {
            const rc = new RtspConverter(config.url, 'ffmpeg', config.outputDir)
            rc.download()
            rc.on('exit', (code) => {
                console.log('exit ffmpeg process')
                done()
            })
            setTimeout(() => {
                rc.kill()
                expect(rc.state).to.equal('killed', 'state is killed')
            }, 2000)
            expect(rc.state).to.equal('idle', 'state is idle')
        })
    })
    describe('5-3. RtspConverter.killAll() (wait 1s)', function () {
        it('kill every(2) process', function (done) {
            const rc1 = new RtspConverter(config.url, 'ffmpeg', config.outputDir)
            const rc2 = new RtspConverter(config.url, 'ffmpeg', config.outputDir)
            rc1.download()
            rc2.download()
            let rc1Exited = false
            let rc2Exited = false
            rc1.on('exit', () => {
                rc1Exited = true
            })
            rc2.on('exit', () => {
                rc2Exited = true
            })
            setTimeout(() => {
                RtspConverter.killAll()
            }, 1000)
            setTimeout(() => {
                expect(rc1Exited).to.be.true
                expect(rc2Exited).to.be.true
                expect(RtspConverter.processList.length).to.equal(0, 'kill all process')
                done()
            }, 2000)
            console.log(RtspConverter.processList.map(p => p.state))
            expect(RtspConverter.processList.length).to.equal(2, 'has 2 process')
        })
    })
})
