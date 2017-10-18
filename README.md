[![Build Status](https://travis-ci.org/francoispqt/iter.svg?branch=master)](https://travis-ci.org/francoispqt/iter)
[![codecov](https://codecov.io/gh/francoispqt/iter/branch/master/graph/badge.svg)](https://codecov.io/gh/francoispqt/iter)
# Iter
*Async made easy*
```bash
$ npm i --save iter
```
## Basic example
```javascript
const Iter = require('iter')

const main = function*() {
    const result = yield Iter.reduce([1,2,3], function*(agg, key, value){
        agg += yield Promise.resolve(value)
    }, 0)

    console.log(result) // 6
}

Iter.run(main)()
.catch(console.error)
```