/**
 * @file Promise
 * @author treelite(c.xinle@gmail.com)
 */

(function () {

    /**
     * resolver的状态
     *
     * @type {Object}
     */
    var STATUS = {
        PENDING: 0,
        FULFILLED: 1,
        REJECTED: 2
    };

    /**
     * 是否捕获异常
     * 规范要求捕获所有异常 see #2.2.7.2
     *
     * but 捕获了所有异常 开发可能比较难找错误...
     * 可以在debug下调用`Resolver.disableExceptionCapture()`
     * 关闭异常捕获简单粗暴管事儿
     *
     * 更优雅点的方式是`Resolver.on('reject', fn)`注册全局事件来统一处理异常
     *
     *
     * @type {boolean}
     */
    var captureException = true;

    /**
     * 是否启用全局事件
     * 默认不启用
     *
     * @type {boolean}
     */
    var globalEvent = false;

    /**
     * 延迟执行
     *
     * @inner
     */
    var nextTick = (function () {
        var res;

        var Observer;
        var callbacks = [];
        var NAME = 'promise';

        function callback() {
            var i;
            var len = callbacks.length;
            for (i = 0; i < len; i++) {
                callbacks[i]();
            }
            callbacks.splice(0, i);
        }

        // For node env
        if (typeof process !== 'undefined'
            && process !== null
            && typeof process.nextTick === 'function'
        ) {
            res = function (fn) {
                return process.nextTick(fn);
            };
        }
        // Only IE on browser, currently
        // https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/setImmediate/Overview.html#processingmodel
        else if (typeof setImmediate === 'function') {
            res = setImmediate;
        }
        // For modern browser
        else if (Observer = window.MutationObserver
            || window.webKitMutationObserver
        ) {
            var observer = new Observer(function (mutations) {
                var item = mutations[0];
                if (item.attributeName === NAME) {
                    callback();
                }
            });
            var ele = document.createElement('div');
            observer.observe(ele, {attributes: true});

            res = function (fn) {
                callbacks.push(fn);
                ele.setAttribute(
                    NAME,
                    Date.now ? Date.now() : (new Date()).getTime()
                );
            };
        }
        // It's faster than `setTimeout`
        else if (isFunction(window.postMessage)) {
            window.addEventListener(
                'message',
                function (e) {
                    if (e.source === window && e.data === NAME) {
                        callback();
                    }
                },
                false
            );

            res = function (fn) {
                callbacks.push(fn);
                window.postMessage(NAME, '*');
            };
        }
        // For older browser
        else {
            res = function (fn) {
                setTimeout(fn, 0);
            };
        }

        return res;
    })();

    /**
     * 函数判断
     *
     * @inner
     * @param {*} value 变量
     * @return {boolean}
     */
    function isFunction(value) {
        return typeof value === 'function';
    }

    /**
     * object判断
     *
     * @inner
     * @param {*} value 变量
     * @return {boolean}
     */
    function isObject(value) {
        return '[object Object]'
            === Object.prototype.toString.call(value);
    }

    /**
     * 使用value确定resolver的状态
     *
     * @param {Resolver} resolver resolver对象
     * @param {Object} value 值
     */
    function resolve(resolver, value) {
        // 保证resolvePromise与rejectPromise
        // 只能被调用一次
        // （不确定value是否是Promise对象）
        // see #2.3.3.3.3
        var called;

        function onFulfilled(data) {
            if (!called) {
                resolve(resolver, data);
                called = true;
            }
        }

        function onRejected(reason) {
            if (!called) {
                resolver.reject(reason);
                called = true;
            }
        }

        function work() {
            var then;
            // 不再额外判断value是否是Promise对象
            if (isObject(value) || isFunction(value)) {
                // 必须先保存对then对引用
                // 官方的test spec中有检查对then的引用次数只能为1
                then = value.then;
                if (isFunction(then)) {
                    then.call(value, onFulfilled, onRejected);
                }
                else {
                    then = null;
                }
            }

            if (!then) {
                resolver.fulfill(value);
            }
        }

        if (captureException) {
            try {
                work();
            }
            catch (e) {
                if (!called) {
                    emitExceptionEvent(e);
                    resolver.reject(e);
                }
            }
        }
        else {
            work();
        }

    }

    /**
     * 包装then的回调参数
     * 使其能根据回调的返回结果设置then返回的Resolver对象状态
     *
     * @inner
     * @param {Resolver} resolver resolver对象
     * @param {Promise} promise promise对象
     * @param {Function} callback 回调函数
     * @return {Function}
     */
    function wrapCallback(resolver, promise, callback) {
        return function (data) {

            function work() {
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

            if (captureException) {
                try {
                    work();
                }
                catch (e) {
                    emitExceptionEvent(e);
                    resolver.reject(e);
                }
            }
            else {
                work();
            }

        };
    }

    /**
     * 注册resolver的回调函数
     * 如果resolver已处于非PENDING状态
     * 则“立即”调用回调函数
     *
     * @inner
     * @param {Object} resolver resolver对象
     * @param {number} status 回调函数类型 FULFILLED 或者 REJECTED
     * @param {Function} callback 回调函数
     */
    function addListener(resolver, status, callback) {
        if (resolver.status === status) {
            // 设置延迟
            // 为了让then函数先返回再执行回调
            // see #2.2.4
            Resolver.nextTick(
                function () {
                    callback(resolver.data);
                }
            );
        }
        else if (status === STATUS.FULFILLED) {
            resolver.fulfillList.push(callback);
        }
        else if (status === STATUS.REJECTED) {
            resolver.rejectList.push(callback);
        }
    }

    /**
     * 触发resolver回调函数
     * 根据状态，执行resolver的回调函数
     *
     * @inner
     * @param {Object} resolver resolver对象
     */
    function emit(resolver) {
        var items = resolver.status === STATUS.FULFILLED
            ? resolver.fulfillList
            : resolver.rejectList;

        emitGlobalEvent(resolver);

        if (!items.length) {
            return;
        }

        // 触发注册的回调函数必须
        // 在状态改变完成后
        // see #2.2.2 #2.2.3 #2.2.4
        Resolver.nextTick(
            function () {
                var item;
                while (item = items.shift()) {
                    item(resolver.data);
                }
            }
        );
    }

    /**
     * then
     * 将fulfill回调与reject回调注册到resolver上
     * 并返回新的Promise对象
     *
     * @inner
     * @param {Resolver} resolver resolver对象
     * @param {Function} onFulfilled 成功回调
     * @param {Function} onRejected 失败回调
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
     * @param {Resolver} resolver resolver对象
     * @return {Object}
     */
    function createPromise(resolver) {
        return {
            'then': function (onFulfilled, onRejected) {
                return then(resolver, onFulfilled, onRejected);
            },

            'catch': function (onRejected) {
                return then(resolver, null, onRejected);
            }
        };
    }

    /**
     * 触发全局事件
     *
     * @inner
     * @param {Resolver} resolver resolver对象
     * @param {string} type 事件类型
     */
    function emitGlobalEvent(resolver) {
        var type = resolver.status === STATUS.FULFILLED
                    ? 'resolve'
                    : 'reject';

        if (globalEvent) {
            Resolver.emit(type, resolver.data);
        }
    }

    function emitExceptionEvent(e) {
        if (globalEvent) {
            Resolver.emit('exception', e);
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

    // 导出nextTick 方便重载
    Resolver.nextTick = nextTick;

    /**
     * 启用全局事件
     *
     * @public
     * @param {Emitter} Emitter 事件发射器
     */
    Resolver.enableGlobalEvent = function (Emitter) {
        Emitter.mixin(this);
        globalEvent = true;
    };

    /**
     * 禁用异常捕获
     *
     * @public
     */
    Resolver.disableExceptionCapture = function () {
        captureException = false;
    };

    /**
     * 启用异常捕获
     *
     * @public
     */
    Resolver.enableExceptionCapture = function () {
        captureException = true;
    };

    /**
     * all
     *
     * @param {...Promise|Array.<Promise>} promises promise参数
     * @return {Promise}
     */
    Resolver.all = function (promises) {

        if (!Array.isArray(promises)) {
            promises = Array.prototype.slice.call(arguments);
        }

        var resolve = new Resolver();
        var resolvedCount = 0;
        var res = [];

        function createResolvedHandler(index) {
            return function (data) {
                res[index] = data;
                resolvedCount++;
                if (resolvedCount >= promises.length) {
                    resolve.fulfill(res);
                }
            };
        }

        function rejectedHandler(reason) {
            resolve.reject(reason);
        }

        promises.forEach(function (item, index) {
            item.then(createResolvedHandler(index), rejectedHandler);
        });

        return resolve.promise();
    };

    /**
     * Race
     *
     * @param {...Promise|Array.<Promise>} promises promise参数
     * @return {Promise}
     */
    Resolver.race = function (promises) {
        var resolver = new Resolver();

        if (!Array.isArray(promises)) {
            promises = Array.prototype.slice.call(arguments);
        }

        function fulfill(data) {
            resolver.fulfill(data);
        }

        function reject(reason) {
            resolver.reject(reason);
        }

        promises.forEach(function (item) {
            item.then(fulfill, reject);
        });

        return resolver.promise();
    };

    /**
     * 创建promise
     *
     * @public
     * @param {function(Resolver)} fn 构造函数
     * @return {Promise}
     */
    Resolver.promise = function (fn) {
        var resolver = new Resolver();

        fn(resolver);
        return resolver.promise();
    };

    /**
     * 创建处于`rejected`状态的Promise对象
     *
     * @public
     * @param {string} reason 错误原因
     * @return {Promise}
     */
    Resolver.rejected = function (reason) {
        return this.promise(function (resolver) {
            resolver.reject(reason);
        });
    };

    /**
     * 创建处于`fulfill`状态的Promise对象
     *
     * @public
     * @param {*} data 填充数据
     * @return {Promise}
     */
    Resolver.fulfilled = function (data) {
        return this.promise(function (resolver) {
            resolver.fulfill(data);
        });
    };

    /**
     * 创建处于`fulfill`状态的Promise对象
     *
     * @public
     * @param {*} data 填充数据
     * @return {Promise}
     */
    Resolver.resolved = Resolver.fulfilled;

    /**
     * fulfill
     *
     * @public
     * @param {*} data 填充数据
     */
    Resolver.prototype.fulfill = function (data) {
        if (this.status !== STATUS.PENDING) {
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
     * @param {*} data 填充数据
     */
    Resolver.prototype.resolve = Resolver.prototype.fulfill;

    /**
     * reject
     *
     * @public
     * @param {*} reason 错误原因
     */
    Resolver.prototype.reject = function (reason) {
        if (this.status !== STATUS.PENDING) {
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
     * @return {Promise}
     */
    Resolver.prototype.promise = function () {
        return createPromise(this);
    };

    // Export
    if (typeof exports === 'object' && typeof module === 'object') {
        exports = module.exports = Resolver;
    }
    else if (typeof define === 'function' && define.amd) {
        define(function () {
            return Resolver;
        });
    }

})();
