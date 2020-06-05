const config = require('./config.js')
const { RtspConverter } = require('../build/main.js')
const { isThrow } = require('./utils.js')

describe('3. 测试执行过程', function () {
    describe('3-1. 测试 command 是否顺利执行', function () {
        it('应该顺利执行', function (done) {
            const rc = new RtspConverter(config.url, 'ffmpeg', config.outputDir)
            try {
                rc.download()
                setTimeout(() => {
                    console.log('after 4.5s...')
                    rc.kill()
                    done()
                }, 3000)
            } catch (err) {
                isThrow()
                done()
            }
        })
    })
})

