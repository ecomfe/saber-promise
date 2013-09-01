/**
 * @file Promises/A+ Test Adapter
 * @author treelite(c.xinle@gmail.com)
 */

var Resolver;

function define(def) {
     Resolver = def();
}

var code = require('fs').readFileSync(
    require('path').resolve(__dirname, '../src/promise.js'),
    'utf-8'
);

eval(code);

 // 适配pending
 // 导出供Test Suite使用
exports.pending = function () {
    var resolver = new Resolver();

    return {
        promise: resolver.promise(),

        fulfill: function (value) {
            resolver.fulfill(value);
        },

        reject: function (reason) {
            resolver.reject(reason);
        }
    };
};
