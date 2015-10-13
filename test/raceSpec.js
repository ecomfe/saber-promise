/**
 * @file race 测试
 * @author treelite(c.xinle@gmail.com)
 */

var Resolver = require('../promise');
var blank = function () {};

describe('race', function () {

    it('resolved', function (done) {
        var data = Date.now();
        var p1 = Resolver.promise(blank);
        var p2 = Resolver.resolved(data);
        var p3 = Resolver.promise(blank);

        Resolver
            .race([p1, p2, p3])
            .then(
                function (item) {
                    expect(item).toBe(data);
                    done();
                }
            );
    });

    it('rejected', function (done) {
        var reason = new Error();

        var p1 = Resolver.promise(blank);
        var p2 = Resolver.rejected(reason);
        var p3 = Resolver.promise(blank);

        Resolver
            .race([p1, p2, p3])
            .catch(
                function (e) {
                    expect(e).toBe(reason);
                    done();
                }
            );
    });

    it('only trigger once by resolved', function (done) {
        var count = 0;
        var p1 = Resolver.resolved();
        var p2 = Resolver.promise(function (resolver) {
            setTimeout(function () {
                resolver.resolve();
            }, 1000);
        });

        Resolver
            .race([p1, p2])
            .then(
                function () {
                    count++;
                }
            );

        setTimeout(function () {
            expect(count).toEqual(1);
            done();
        }, 1200);
    });

    it('only trigger once by rejected', function (done) {
        var count = 0;
        var p1 = Resolver.rejected();
        var p2 = Resolver.promise(function (resolver) {
            setTimeout(function () {
                resolver.reject();
            }, 1000);
        });

        Resolver
            .race([p1, p2])
            .catch(
                function () {
                    count++;
                }
            );

        setTimeout(function () {
            expect(count).toEqual(1);
            done();
        }, 1200);
    });

    it('only trigger once by rejected or resolved', function (done) {
        var tCount = 0;
        var fCount = 0;
        var p1 = Resolver.promise(function (resolver) {
            setTimeout(function () {
                resolver.resolve();
            }, 500);
        });
        var p2 = Resolver.promise(function (resolver) {
            setTimeout(function () {
                resolver.reject();
            }, 1000);
        });

        Resolver
            .race([p1, p2])
            .then(
                function () {
                    tCount++;
                },
                function () {
                    fCount++;
                }
            );

        setTimeout(function () {
            expect(tCount).toEqual(1);
            expect(fCount).toEqual(0);
            done();
        }, 1200);
    });

});
