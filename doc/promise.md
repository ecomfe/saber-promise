Promise
===

由[Resolver](resolver.md)对象产生，用于表示一个正在进行的操作

## Methods

### then(onFulfilled[, onRejected])

注册`fulfilled`（操作完成）和`rejected`（操作失败）状态的回调

* **onFulfilled** `{?Function}` `fulfilled`状态回调
* **onRejected** `{Function=}` `rejected`状态回调
* _return_ `{Promise}`
