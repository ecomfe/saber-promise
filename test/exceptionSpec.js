/**
 * @file 异常处理测试
 * @author treelite(c.xinle@gmail.com)
 */

global.define = function (def) {
     global.Resolver = def();
};

require('../src/promise');

// mock Emitter
var Emitter = {
    handlers: {},
    mixin: function (obj) {
        var me = this;
        obj.emit = function (type, e) {
            var items = me.handlers[type] || [];

            items.forEach(function (item) {
                item.call(obj, e);
            });
        };

        obj.on = function (type, fn) {
            var items = me.handlers[type] || [];

            items.push(fn);

            me.handlers[type] = items;
        };

        obj.un = function (type, fn) {
            var items = me.handlers[type] || [];

            items.some(function (item, index) {
                if (item == fn) {
                    items.splice(index, 1);
                    return true;
                }
            });
        };
    }
};

describe('global event', function () {

    Resolver.enableGlobalEvent(Emitter);

    it('enable', function () {
        expect(typeof Resolver.emit).toBe('function');
        expect(typeof Resolver.on).toBe('function');
        expect(typeof Resolver.un).toBe('function');
    });
    
    // **切记**
    // 异步spec的异步断言部分如果本身抛异常了 jasmine-node无法正确捕获到
    // 会终止运行 无任何输出
    it('emit `resolve` when Resolver is resolved', function (done) {
        var handler = jasmine.createSpy('handler');

        Resolver.on('resolve', handler);

        var resolver = new Resolver();
        resolver.resolve(123);

        setTimeout(function () {
            expect(handler).toHaveBeenCalled();
            expect(handler.mostRecentCall.args[0]).toBe(123);
        }, 0);

        Resolver.un('resolve', handler);
        resolver = new Resolver();
        resolver.resolve(123);

        setTimeout(function () {
            expect(handler.callCount).toBe(1);
            done();
        }, 1);

    });

    it('emit `reject` when Resolver is rejected', function (done) {
        var handler = jasmine.createSpy('handler');

        Resolver.on('reject', handler);

        var resolver = new Resolver();
        resolver.reject(123);

        setTimeout(function () {
            expect(handler).toHaveBeenCalled();
            expect(handler.mostRecentCall.args[0]).toBe(123);
        }, 0);

        Resolver.un('reject', handler);
        resolver = new Resolver();
        resolver.reject(123);

        setTimeout(function () { 
            expect(handler.callCount).toBe(1);
            done();
        }, 0);
    });

    it('emit `exception` when a caller throws error', function (done) {
        var excHandler = jasmine.createSpy('excHandler');
        var rejHandler = jasmine.createSpy('rejHandler');

        Resolver.on('exception', excHandler);
        Resolver.on('reject', rejHandler);

        var resolver = new Resolver();
        var promise = resolver.promise();
        resolver.reject(123);

        function finish() {
            Resolver.un('exception', excHandler);
            Resolver.un('reject', rejHandler);
            done();
        }

        setTimeout(function () {
            expect(rejHandler).toHaveBeenCalled();
            expect(rejHandler.mostRecentCall.args[0]).toBe(123);
            expect(excHandler).not.toHaveBeenCalled();

            promise.then(null, function () {
                throw new Error();
            });

            setTimeout(function () {
                expect(excHandler).toHaveBeenCalled();
                expect(
                    excHandler.callCount >= 1
                    && excHandler.mostRecentCall.args[0] instanceof Error).toBeTruthy();
                expect(rejHandler.callCount).toBe(2);
                finish();
            }, 0);

        }, 0);
    });
});
