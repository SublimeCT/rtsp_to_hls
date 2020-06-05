const fs = require('fs')
const path = require('path')
const { ConfigOptions } = require('../build/config.js')
const expect = require('chai').expect

/**
 * 是否是包含自定义的错误提示的异常
 */
module.exports.isCustomErr = err => expect(err.message).to.equal(ConfigOptions.lOGGER_PREFIX, '代码报错导致的异常 ?')

/**
 * 直接执行抛出异常断言
 * @description 必须抛出异常
 * @example
 * ```javascript
 * try {
 *     // ...
 * } catch(err) {
 *     isThrow() // 若抛出异常则视为验证通过
 * }
 * ```
 */
module.exports.isThrow = fn => expect(fn || (() => { throw new Error() })).to.throw()

module.exports.delay = (timeout = 1000) => new Promise(resolve => setTimeout(resolve, timeout))