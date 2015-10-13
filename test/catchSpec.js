/**
 * @file 异常处理测试
 * @author treelite(c.xinle@gmail.com)
 */

var Resolver = require('../promise');

describe('catch', function () {
    it('failure', function (done) {
        var resolver = new Resolver();
        var error = 'error';

        var promise = resolver.promise();

        promise
            .then(
                function () {
                    expect(false).toBeTruthy();
                }
            )
            .catch(
                function (reason) {
                    expect(reason).toEqual(error);
                    done();
                }
            );

        resolver.reject(error);
    });

    it('exception', function (done) {
        var promise = Resolver.fulfilled();
        var error = new Error();

        promise
            .then(
                function () {
                    throw error;
                }
            )
            .then(
                function () {
                    expect(false).toBeTruthy();
                }
            )
            .catch(
                function (e) {
                    expect(e).toBe(error);
                    done();
                }
            );
    });

    it('return Promise', function (done) {
        var promise = Resolver.rejected();
        var data = Date.now();

        promise
            .catch(
                function () {
                    return data;
                }
            )
            .then(
                function (d) {
                    expect(d).toBe(data);
                    done();
                }
            )
    });
});
