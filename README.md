# Iter
*Async made easy*
```bash
$ npm i --save iter
```
## Basic example
```javascript
const Iter = require('iter')

const main = function*() {
    const result = Iter.reduce([1,2,3], function*(agg, key, value){
        agg += yield Promise.resolve(value)
    }, 0)

    console.log(result) // 6
}

Iter.run(main)()
.catch(console.error)
```