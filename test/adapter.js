/**
 * @file Promises/A+ Test Adapter
 * @author treelite(c.xinle@gmail.com)
 */

var Resolver = require('../promise');

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
