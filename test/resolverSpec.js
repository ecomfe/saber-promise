/**
 * @file API测试
 * @author c.xinle@gmail.com
 */

global.define = function (def) {
     global.Resolver = def();
};

require('../src/promise');

describe('Resolver', function () {

    // .promise() spec
    describe('.promise() return promise', function () {
        it('had resolved', function (done) {
            var promise = Resolver.promise(function (resolver) {
                resolver.resolve();
            });

            var resolvedHandler = jasmine.createSpy('handler');
            var rejectedHandler = jasmine.createSpy('handler');
            promise.then(resolvedHandler, rejectedHandler);

            setTimeout(function () {
                expect(resolvedHandler).toHaveBeenCalled();
                expect(rejectedHandler).not.toHaveBeenCalled();
                done();
            }, 0);
        });

        it('had rejected', function (done) {
            var promise = Resolver.promise(function (resolver) {
                resolver.reject();
            });

            var resolvedHandler = jasmine.createSpy('handler');
            var rejectedHandler = jasmine.createSpy('handler');
            promise.then(resolvedHandler, rejectedHandler);

            setTimeout(function () {
                expect(resolvedHandler).not.toHaveBeenCalled();
                expect(rejectedHandler).toHaveBeenCalled();
                done();
            }, 0);
        });
    });

    // .resolved() spec
    it('.resolved() return promise had resolved', function (done) {
        var param = 'w';
        var promise = Resolver.resolved(param);

        var resolvedHandler = jasmine.createSpy('handler');
        var rejectedHandler = jasmine.createSpy('handler');
        promise.then(resolvedHandler, rejectedHandler);

        setTimeout(function () {
            expect(resolvedHandler).toHaveBeenCalled();
            expect(resolvedHandler).toHaveBeenCalledWith(param);
            expect(rejectedHandler).not.toHaveBeenCalled();
            done();
        }, 0);
    });

    // .rejected() spec
    it('.rejected() return promise had rejected', function (done) {
        var reason = 'error';
        var promise = Resolver.rejected(reason);

        var resolvedHandler = jasmine.createSpy('handler');
        var rejectedHandler = jasmine.createSpy('handler');
        promise.then(resolvedHandler, rejectedHandler);

        setTimeout(function () {
            expect(rejectedHandler).toHaveBeenCalled();
            expect(rejectedHandler).toHaveBeenCalledWith(reason);
            expect(resolvedHandler).not.toHaveBeenCalled();
            done();
        }, 0);
    });

    // .all() spec
    describe('.all() return promise', function () {
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
            var promises = createPromises([{data:1, delay: 100}, {data: 2}]); 
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
            var promises = createPromises([{data: 1}, {reason: 'error'}]); 

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
});
