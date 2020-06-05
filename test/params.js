const expect = require('chai').expect
const config = require('./config.js')
const { RtspConverter } = require('../build/main.js')


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
