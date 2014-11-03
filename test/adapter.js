/**
 * @file Promises/A+ Test Adapter
 * @author treelite(c.xinle@gmail.com)
 */

var Resolver;

// eval的方法不能断点调试
// 改用require + global函数注册的方式

global.define = function (def) {
     Resolver = def();
};

require('../src/promise');

exports.resolved = function (value) {
    return Resolver.resolved(value);
};

exports.rejected = function (reason) {
    return Resolver.rejected(reason);
};

exports.deferred = function () {
    var resolver = new Resolver();

    return {
        promise: resolver.promise(),

        resolve: function (value) {
            resolver.resolve(value);
        },

        reject: function (reason) {
            resolver.reject(reason);
        }
    };
};
