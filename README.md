[![Build Status](https://travis-ci.org/francoispqt/itur.svg?branch=master)](https://travis-ci.org/francoispqt/itur)
[![codecov](https://codecov.io/gh/francoispqt/iter/branch/master/graph/badge.svg)](https://codecov.io/gh/francoispqt/iter)
# Itur
*Async made easy with generator control flow*
```bash
$ npm i --save itur
```
## Basic example
```javascript
const Itur = require('itur')

const main = function*() {
    const result = yield Itur.reduce([1,2,3], function*(agg, key, value){
        agg += yield Promise.resolve(value)
        return agg
    }, 0)

    console.log(result) // 6
}

Itur.run(main)()
.catch(console.error)
```

## API
### forEach
```javascript
Itur.forEach([1,2,3], function*(key, value) {
    yield Promise.resolve(key)
})
```
### map
```javascript
const result = yield Itur.map([1,2,3], function*(key, value) {
    return yield Promise.resolve(key)
})

console.log(result) // [0,1,2]
```
### all
```javascript
const result = yield Itur.all([1,2,3], function*(key, value) {
    return yield Promise.resolve(key)
})

console.log(result) // [0,1,2]
```
### reduce
```javascript
const result = yield Itur.reduce([1,2,3], function*(agg, key, value) {
     agg += yield Promise.resolve(value)
     return agg
}, 0)

console.log(result) // 6
```
### find
```javascript
const result = yield Itur.find([1,2,3], function*(agg, key, value) {
     return key === yield Promise.resolve(2)
}, 0)

console.log(result) // 3
```
### while
```javascript
let c = 0
Itur.while(
    () => c < 10, 
    function*() {
        yield Promise.resolve('do any async')
        c++
    }
)
```
### range
```javascript
const a = [1,2,3]
const fn = function*(key, value) {
    return yield Promise.resolve('foobar')
}

for (const i of Itur.range(a, fn)) {
    console.log(i) // foobar
}
```
### Chaining
You can chain certain operations. Example: 
```javascript
const result = yield Itur.map([1,2,3], function*(key, value) {
    return key + yield Promise.resolve(value)
})
.reduce(function*(agg, key, value) {
    agg.push(yield Promise.resolve(value))
    return agg
}, [])
.find(function*(key, value) {
    return key === 1
})

console.log(result) // 3
```
### Constructor syntax
