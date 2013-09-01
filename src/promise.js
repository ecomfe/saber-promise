/**
 * @file Promise
 * @author treelite(c.xinle@gmail.com)
 */

define(function () {

    // 状态
    var STATUS = {
        PENDING: 0,
        FULFILLED: 1,
        REJECTED: 2
    };

    /**
     * 函数判断
     *
     * @inner
     * @param {Object} value
     * @return {boolean}
     */
    function isFunction(value) {
        return '[object Function]' 
            == Object.prototype.toString.call(value);
    }

    /**
     * Promise对象判断
     *
     * @inner
     * @param {Object} value
     * @return {boolean}
     */
    function isPromise(value) {
        return value instanceof Promise;
    }

    /**
     * 包装then参数中的回调函数
     *
     * @inner
     * @param {Object} resolver then函数返回的值对应的Resolver
     * @param {Function} callback then参数中的回调函数
     * @return {Function}
     */
    function wrapCallback(resolver, callback) {
        return function (data) {
            var res;
            try {
                res = callback(data);
                if (!isPromise(res)) {
                    resolver.fulfill(res);
                }
                else {
                    res.then(
                        function (data) {
                            resolver.fulfill(data);
                        },
                        function (reason) {
                            resolver.reject(reason);
                        }
                    );
                }
            }
            catch (e) {
                resolver.reject(e);
            }
        };
    }

    /**
     * 添加resolver的回调函数
     * 如果resolver已处于非PENDING状态
     * 则“立即”调用回调函数
     *
     * @inner
     * @param {Object} resolver
     * @param {number} status 回调函数类型 FULFILLED 或者 REJECTED
     * @param {Function} callback
     */
    function addListener(resolver, status, callback) {
        if (resolver.status == status) {
            // 设置延迟
            // 为了让then函数先返回再执行回调
            // see Promises/A+ 3.2.4
            // http://promises-aplus.github.io/promises-spec/ 
            setTimeout(function () {
                callback(resolver.data);
            }, 0);
        }
        else if (status == STATUS.FULFILLED) {
            resolver.fulfillList.push(callback);
        }
        else if (status == STATUS.REJECTED) {
            resolver.rejectList.push(callback);
        }
    }

    /**
     * 触发resolver回调函数
     * 根据状态，执行resolver的回调函数
     *
     * @param {Object} resolver
     */
    function resolve(resolver) {
        var items = resolver.status == STATUS.FULFILLED
            ? resolver.fulfillList
            : resolver.rejectList;

        var item;
        while (item = items.shift()) {
            item(resolver.data);
        }
    }

    /**
     * Resolver
     *
     * @constructor
     */
    function Resolver() {
        this.status = STATUS.PENDING;
        this.fulfillList = [];
        this.rejectList = [];
    }

    /**
     * fulfill
     *
     * @public
     * @param {Object} data
     */
    Resolver.prototype.fulfill = function (data) {
        if (this.status != STATUS.PENDING) {
            return;
        }

        this.data = data;
        this.status = STATUS.FULFILLED;
        resolve(this);
    };

    /**
     * reject
     *
     * @public
     * @param {Object} reason
     */
    Resolver.prototype.reject = function (reason) {
        if (this.status != STATUS.PENDING) {
            return;
        }
        
        this.data = reason;
        this.status = STATUS.REJECTED;
        resolve(this);
    };

    /**
     * 生成Promise
     *
     * @public
     */
    Resolver.prototype.promise = function () {
        return new Promise(this);
    };

    /**
     * Promise
     *
     * @inner
     * @constructor
     * @param {Object} resolver
     */
    function Promise(resolver) {
        this.resolver = resolver;
    }

    /**
     * then
     *
     * @public
     * @param {Function} onFulfilled
     * @param {Function} onRejected
     * @param {Object} promise对象
     */
    Promise.prototype.then = function (onFulfilled, onRejected) {
        var res = new Resolver();

        if (isFunction(onFulfilled)) {
            onFulfilled = wrapCallback(res, onFulfilled);
        }
        else {
            onFulfilled = function (data) {
                res.fulfill(data);
            };
        }
        addListener(this.resolver, STATUS.FULFILLED, onFulfilled);

        if (isFunction(onRejected)) {
            onRejected = wrapCallback(res, onRejected);
        }
        else {
            onRejected = function (reason) {
                res.reject(reason);
            };
        }
        addListener(this.resolver, STATUS.REJECTED, onRejected);

        return res.promise();
    };

    return Resolver;
});
