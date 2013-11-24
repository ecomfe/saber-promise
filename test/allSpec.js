/**
 * @file `.all()` spec
 * @author treelite(c.xinle@gmail.com)
 */

global.define = function (def) {
     global.Resolver = def();
};

require('../src/promise');

describe('all return promise', function () {

    function createPromises(options) {
        options = options || [{}, {}];
        var res = [];

        options.forEach(function (item) {
            res.push(Resolver.promise(function (resolver) {
                setTimeout(function () {
                    if (item.reason) {
                        resolver.reject(item.reason);
                    }
                    else {
                        resolver.resolve(item.data);
                    }
                }, item.delay || 0);
            }));
        });

        return res;
    };

    it('that will resolve only once all the items have resolved', function () {
        var promises = createPromises(); 
        var handler = jasmine.createSpy('handler');
        Resolver.all(promises).then(handler);

        waitsFor(function () {
            return handler.calls.length > 0
        }, 100, 'timeout');

        runs(function () {
            expect(handler.calls.length).toBe(1);
        });
    });

    it('that resolved with a array param has right sequence', function () {
        var promises = createPromises([{data:1, delay: 100}, {data:2}]); 
        var handler = jasmine.createSpy('handler');
        Resolver.all(promises).then(handler);

        waitsFor(function () {
            return handler.calls.length > 0
        }, 100, 'timeout');

        runs(function () {
            expect(handler).toHaveBeenCalledWith([1, 2]);
        });
    });

    it('that will reject if any items is rejected', function () {
        var promises = createPromises([{data:1}, {reason: 'error'}]); 

        var handler = jasmine.createSpy('handler');
        Resolver.all(promises).then(null, handler);

        waitsFor(function () {
            return handler.calls.length > 0
        }, 100, 'timeout');

        runs(function () {
            expect(handler.calls.length).toBe(1);
            expect(handler).toHaveBeenCalledWith('error');
        });
    });
});
