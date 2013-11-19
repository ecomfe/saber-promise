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
    var resolver = new Resolver();

    resolver.resolve(value);
    return resolver.promise();
};

exports.rejected = function (reason) {
    var resolver = new Resolver();

    resolver.reject(reason);
    return resolver.promise();
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
