/**
 * @file Node env
 * @author treelite(c.xinle@gmail.com)
 */

var Resolver = require('./src/promise');

/**
 * Plugin for Rebas
 *
 * @public
 * @param {Object} app server
 */
Resolver.rebas = function (app) {
    var nextTick = this.nextTick;

    // 重载异步函数
    // 以保存请求上下文
    this.nextTick = function (fn) {
        var id = app.stashContext();
        nextTick(function () {
            app.revertContext(id);
            fn();
        });
    };
};

module.exports = Resolver;
