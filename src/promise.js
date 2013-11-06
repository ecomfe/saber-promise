/**
 * @file Promise
 * @author treelite(c.xinle@gmail.com)
 */

define(function () {

    // resolver的状态
    var STATUS = {
        PENDING: 0,
        FULFILLED: 1,
        REJECTED: 2
    };

    /**
     * 函数判断
     *
     * @inner
     * @param {*} value
     * @return {boolean}
     */
    function isFunction(value) {
        return '[object Function]' 
            == Object.prototype.toString.call(value);
    }

    /**
     * object判断
     *
     * @inner
     * @param {*} value
     * @return {boolean}
     */
    function isObject(value) {
        return '[object Object]' 
            == Object.prototype.toString.call(value);
    }

    /**
     * 使用value确定resolver的状态
     *
     * @param {Resolver}
     * @param {Object} value
     */
    function resolve(resolver, value) {
        // 不再额外判断value是否是Promise对象
        if (isObject(value) || isFunction(value)) {
            // 保证resolvePromise与rejectPromise
            // 只能被调用一次
            // （不确定value是否是Promise对象）
            // see #2.3.3.3.3
            var called;
            try {
                // 可能抛异常
                var then = value.then;
                if (isFunction(then)) {
                    // 可能抛异常
                    then.call(
                        value, 
                        function (data) {
                            if (!called) {
                                resolve(resolver, data);
                                called = true;
                            }
                        },
                        function (reason) {
                            if (!called) {
                                resolver.reject(reason);
                                called = true;
                            }
                        }
                    );
                }
                else {
                    resolver.fulfill(value);
                }
            }
            catch (e) {
                if (!called) {
                    resolver.reject(e);
                }
            }
        }
        else {
            resolver.fulfill(value);
        }
    }

    /**
     * 包装then的回调参数
     * 使其能根据回调的返回结果设置then返回的Resolver对象状态
     *
     * @inner
     * @param {Resolver} resolver
     * @param {Promise} promise
     * @param {Function} callback
     */
    function wrapCallback(resolver, promise, callback) {
        return function (data) {
            try {
                // 可能抛异常
                var res = callback(data);
                // 返回结果与当前的promise对象相同
                // 抛异常
                // see # 2.3.1
                if (res === promise) {
                    throw new TypeError();
                }

                resolve(resolver, res);
            }
            catch (e) {
                resolver.reject(e);
            }
        };
    }

    /**
     * 注册resolver的回调函数
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
            // see #2.2.4
            setTimeout(
                function () {
                    callback(resolver.data);
                }, 
                0
            );
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
     * @inner
     * @param {Object} resolver
     */
    function emit(resolver) {
        var items = resolver.status == STATUS.FULFILLED
            ? resolver.fulfillList
            : resolver.rejectList;

        if (items.length <= 0 ) {
            return;
        }

        // 触发注册的回调函数必须
        // 在状态改变完成后
        // see #2.2.2 #2.2.3 #2.2.4
        setTimeout(
            function () {
                var item;
                while (item = items.shift()) {
                    item(resolver.data);
                }
            },
            0
        );
    }

    /**
     * then
     * 将fulfill回调与reject回调注册到resolver上
     * 并返回新的Promise对象
     *
     * @inner
     * @param {Resolver} resolver
     * @param {Function} onFulfilled 
     * @param {Function} onRejected 
     * @return {Promise}
     */
    function then(resolver, onFulfilled, onRejected) {
        var res = new Resolver();
        var promise = createPromise(res);

        if (isFunction(onFulfilled)) {
            onFulfilled = wrapCallback(res, promise, onFulfilled);
        }
        else {
            // not function
            // 'return promise' must fulfill with the same value 
            // when 'main promise' is resolved
            // see #2.2.7.3
            onFulfilled = function (data) {
                res.fulfill(data);
            };
        }
        addListener(resolver, STATUS.FULFILLED, onFulfilled);

        if (isFunction(onRejected)) {
            onRejected = wrapCallback(res, promise, onRejected);
        }
        else {
            // not function
            // 'return promise' must reject with the same reason 
            // when 'main promise' is rejected
            // see #2.2.7.4
            onRejected = function (reason) {
                res.reject(reason);
            };
        }
        addListener(resolver, STATUS.REJECTED, onRejected);

        return promise;
    }

    /**
     * 创建Promise对象
     *
     * @inner
     * @param {Resolver} resolver
     */
    function createPromise(resolver) {
        return {
            then: function (onFulfilled, onRejected) {
                return then(resolver, onFulfilled, onRejected);
            }
        };
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
     * @param {*} data
     */
    Resolver.prototype.fulfill = function (data) {
        if (this.status != STATUS.PENDING) {
            return;
        }

        this.data = data;
        this.status = STATUS.FULFILLED;
        emit(this);

    };

    /**
     * resolve
     *
     * @public
     * @param {*} data
     */
    Resolver.prototype.reslove = Resolver.prototype.fulfill;

    /**
     * reject
     *
     * @public
     * @param {*} reason
     */
    Resolver.prototype.reject = function (reason) {
        if (this.status != STATUS.PENDING) {
            return;
        }
        
        this.data = reason;
        this.status = STATUS.REJECTED;
        emit(this);
    };

    /**
     * 生成Promise
     *
     * @public
     * @param {Object} wrapper 包装对象
     * @return {Object}
     */
    Resolver.prototype.promise = function (wrapper) {
        var res = createPromise(this);

        if (wrapper) {
            Object.keys(wrapper).forEach(function (key) {
                if (key != 'then') {
                    res[key] = wrapper[key];
                }
            });
        }

        return res;
    };

    return Resolver;
});
