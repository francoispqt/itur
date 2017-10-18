/**
 * Recursive solution to run a gen
 * @param {*} g the generator to be ran
 * @param {*} thener thener
 * @param {*} resolve wrapped Promise resolver
 * @param {*} reject wrapped Promise rejecter
 */
const runGen = (g, thener, resolve, reject) => {
    thener = thener || resolve
    function it(value) {
        const ret = g.next(value)
        if (ret.value && ret.value.then && !ret.done) {
            return ret.value.then(it).catch(err => {
                let r
                try {
                    r = g.throw(err)
                } catch (e) {
                    return reject(e)
                }
                return iterate(r)
            })
        }
        if (ret.value && ret.value.then) {
            return ret.value.then(thener).catch(reject)
        }
        if (ret.done) return thener(ret.value)
        return it(ret.value)
    }
    it()
}

/**
 * Function to map col with gen with a defined concurrency
 * @param {*} col the collection to map
 * @param {*} fn the gen function
 * @param {*} concurrency the concurrency
 */
const mapWithConc = (col, fn, concurrency) => {
    return new Promise((resolve, reject) => {
        const res = []
        const q = []
        let doing = 0
        const r = v => {
            res.push(v)
            doing--
            if (res.length >= col.length) {
                return resolve(res)
            }
            if (doing < concurrency && q.length > 0) {
                for (let i = 0; i < q.length; i++) {
                    if (doing < concurrency) {
                        const g = q.shift()
                        doing++
                        runGen(g, r, resolve, reject)
                    }
                }
            }
            return null
        }
        for (let i = 0; i < col.length; i++) {
            const g = fn(i, col[i])
            if (doing < concurrency) {
                doing++
                runGen(g, r, resolve, reject)
            } else {
                q.push(g)
            }
        }
    })
}

/**
 * Function to map col with gen without limit on concurrency
 * @param {*} col the collection
 * @param {*} fn the generator to apply
 */
const mapWithoutConc = (col, fn) => {
    return new Promise((resolve, reject) => {
        const res = []
        function r(v) {
            res.push(v)
            if (res.length === col.length) {
                return resolve(res)
            }
            return null
        }
        for (let i = 0; i < col.length; i++) {
            const g = fn(i, col[i])
            runGen(g, null, r, reject)
        }
    })
}
/**
 * Function to call the iteration on the collection
 * @param {array} col the collection
 * @param {generator} fn the generator function
 */
const forEach = (col, fn) => {
    return new Promise((resolve, reject) => {
        runGen(iterate(col, fn), null, resolve, reject)
    })
}
/**
 * Function to apply a reduction on a collection with a generator function
 * @param {*} col the collection to reduce
 * @param {*} fn the generator function to apply
 * @param {*} agg the initial value for the reduction result
 */
const reduce = (col, fn, agg) => {
    const g = function*(c, f) {
        for (let i = 0; i < col.length; i++) {
            f = f || c[i]
            yield new Promise((resolve, reject) => {
                runGen(fn(agg, i, c[i]), null, resolve, reject)
            }).then(r => { // eslint-disable-line
                agg = r
                return agg
            })
        }
    }
    return new Promise((resolve, reject) => {
        runGen(
            (function*() {
                let result
                for (const r of g(col, fn)) {
                    result = yield r
                }
                return result
            }()),
            null,
            resolve,
            reject
        )
    })
}

/**
 * A function to apply a generator call on each element of a collection concurrently
 * @param {*} col the collection to run on
 * @param {*} fn the generator function to apply on each element of the collection
 */
const all = (col, fn) => {
    return new Promise((resolve, reject) => {
        let ct = 0
        function r() {
            ct++
            if (ct === col.length) {
                return resolve()
            }
            return null
        }
        for (let i = 0; i < col.length; i++) {
            const g = fn(i, col[i])
            runGen(g, null, r, reject)
        }
    })
}


/**
 * Async iterator
 * @param {array} col the collection to iterate over
 * @param {generator} fn the function generator applied to all elements
 * @param {*} args arguments to pass to the generator function applied to each elements
 */
function* iterate(col, fn, args = []) {
    for (let i = 0; i < col.length; i++) {
        fn = fn || col[i]
        yield new Promise((resolve, reject) => {
            return runGen(fn(i, col[i], ...args), null, resolve, reject)
        })
    }
}

/**
 * find is the generator running the find function with defined concurrency
 * @param {*} col the collection on which the generator is based
 * @param {function} fn a function, an async function or a generator
 * @param {*} concurrency
 */
function* find(col, fn, concurrency = 0) {
    let promises = []
    let result
    for (let i = 0; i < col.length; i++) {
        fn = fn || col[i]
        if (concurrency > 0 && promises.length === concurrency) {
            result = yield Promise.all(promises).then(() => {
                return result
            }) // eslint-disable-line no-loop-func
            promises = []
            promises.push(
                new Promise((resolve, reject) => {
                    runGen(fn(i, col[i]), null, resolve, reject)
                }).then(r => {
                    // eslint-disable-line no-loop-func
                    if (r) {
                        result = col[i]
                    }
                    return result
                })
            )
        } else {
            promises.push(
                new Promise((resolve, reject) => {
                    runGen(fn(i, col[i]), null, resolve, reject)
                }).then(r => {
                    // eslint-disable-line no-loop-func
                    if (r) {
                        result = col[i]
                    }
                    return result
                })
            )
        }
    }
    if (concurrency > 0) {
        /* eslint-disable */
        return promises.length > 0
            ? yield Promise.all(promises).then(() => {
                  return result // eslint-disable-line
              })
            : result
        /* eslint-disable */
    }
    return yield Promise.all(promises).then(() => {
        return result
    })
}

/**
 * 
 * @param {*} cond 
 * @param {*} fn 
 */
function* forWhile(cond, fn) {
    const g = function*(f) {
        let i = 0
        while (cond()) {
            yield new Promise((resolve, reject) => { // eslint-disable-line
                return runGen(f(i), null, resolve, reject)
            })
            i++
        }
    }

    let result
    for (const r of g(fn)) {
        result = yield r
    }

    return result
}

/**
 * 
 * @param {*} fn 
 */
const drain = (fn, It) => {
    const t = It.queue.shift()
    if (t) {
        return t()
            .then(() => {
                return drain(fn, It)
            })
            .catch(It._catcher)
    }
    return fn(It.collection)
}

/** Iter is a wrapper to an Object or an Array giving it async flow control */
class Iter {
    /**
     * Creates an instance of an Iter, attaches the collection
     * @param {object} col the colection, an object or an array
     */
    constructor(col, promise) {
        this.collection = col
        if (promise) {
            this.promise = promise
            this.queue = [
                () =>
                    promise.then(col => { // eslint-disable-line
                        this.collection = col
                    }),
            ]
        }
        this.aborted = false
    }
    /* Private API */
    _drain(fn) {
        return drain(fn, this)
    }

    /* Public API */
    /**
     * Wraps the then of the promise wrapped
     * @param {function} fn a function, an async function or a generator
     */
    then(fn) {
        this._drain(fn)
        return this
    }
    /**
     * Wraps the catch of the promise wrapped
     * @param {function} fn a function, an async function or a generator
     */
    catch(fn) {
        this._catcher = fn
    }
    /**
     * Calls forEach on the collection attached to the Iter instance
     * @param {generator} fn 
     */
    forEach(fn) {
        this.queue.push(() =>
            this.promise.then(col => { // eslint-disable-line
                if (col instanceof Array) {
                    return forEach(col, fn)
                }
                return forEach([col], fn)
            })
        )
        return this
    }
    /**
     * Prints the Iter collection
     * Useful if you want to pass the Iter object directly to a response for example
     */
    toJSON() {
        return this.collection
    }
    /**
     * Returns an async iterable applying an async func on each iteration,
     * last argument is the function, the ones before are passed to the func
     * @param {*} args args is the list of argument
     */
    range(...args) {
        const fn = args.pop()
        const g = iterate(this.collection, fn.bind(this), args)
        return g
    }

    /**
     * Reduces asynchronously the iterable applying a function returning the aggregator
     * @param {*} cb a function, an async function or a generator
     * @param {*} agg the aggregator, default to []
     */
    reduce(fn, agg = []) {
        this.queue.push(() => {
            return this.promise.then(() => {
                return reduce(this.collection, fn, agg).then(r => {
                    this.collection = r
                    return r
                })
            })
        })

        return this
    }
    /**
     * Maps asynchronously applying a function,
     * the return from the function will be mapped to the collection
     * @param {function} cb a function, an async function or a generator
     */
    map(fn, opts) {
        this.queue.push(() =>
            this.promise // eslint-disable-line arrow-body-style
                .then(col => {
                    return opts && opts.concurrency > 0
                        ? mapWithConc(col, fn, opts.concurrency)
                        : mapWithoutConc(col, fn)
                })
                .then(r => {
                    this.collection = r
                    return r
                })
        )

        return this
    }
    /**
     * Maps in series applying a function,
     * the return from the function will be mapped to the collection
     * @param {function} cb a function, an async function or a generator
     */
    mapSeries(fn) {
        this.queue.push(() =>
            this.promise // eslint-disable-line arrow-body-style
                .then(col => {
                    return mapWithConc(col, fn, 1)
                })
                .then(r => {
                    this.collection = r
                    return r
                })
        )
        return this
    }
    /**
     * The find() method returns the value of the first element in the array that satisfies the provided testing generator function.
     * runs concurrently, you can add a concurrency level by setting the concurrency option
     * @param {generator} fn the generator function to apply to each element of the collection
     * @param {object} opts the options object
     */
    find(fn, opts = {}) {
        return new Promise((resolve, reject) => {
            runGen(find(this.collection, fn, opts.concurrency), null, resolve, reject)
        })
    }
    /**
     * The findSeries() method returns the value of the first element in the array that satisfies the provided testing generator function, runs in serie.
     * @param {generator} fn the generator function to apply to each element of the collection
     */
    findSeries(fn) {
        return new Promise((resolve, reject) => {
            runGen(find(this.colletion, fn, 1), null, resolve, reject)
        })
    }


    /** Static Methods */

    /**
     * Applies a function to all elements of the iterable
     * concurrency will max the concurrencly level if > 0
     * @param {function} cb a function, an async function or a generator
     * @param {number} concurrency a number representing the max number of concurrent application
     */
    static all(col, fn) {
        return new Iter(col, all(col, fn))
    }
    /**
     * Maps asynchronously applying a function,
     * the return from the function will be mapped to the collection
     * @param {function} fn a function, an async function or a generator
     */
    static map(col, fn, opts = {}) {
        return opts.concurrency > 0
            ? new Iter(col, mapWithConc(col, fn, opts.concurrency))
            : new Iter(col, mapWithoutConc(col, fn))
    }
    /**
     * 
     * @param {*} col 
     * @param {*} fn 
     */
    static forEach(col, fn) {
        return new Iter(col, forEach(col, fn))
    }
    /**
     * Reduces asynchronously the iterable applying a function returning the aggregator
     * @param {*} cb a function, an async function or a generator
     * @param {*} agg the aggregator, default to []
     */
    static reduce(col, fn, agg) {
        return new Iter(col, reduce(col, fn, agg))
    }

    /**
     * 
     * @param {*} fn 
     */
    static run(fn) {
        return (...args) => {
            return new Promise((resolve, reject) => {
                runGen(fn(...args), null, resolve, reject)
            })
        }
    }
    /**
     * Maps in series applying a function,
     * the return from the function will be mapped to the collection
     * @param {function} cb a function, an async function or a generator
     */
    static mapSeries(col, fn) {
        return new Iter(col, mapWithConc(col, fn, 1))
    }
    /**
     * Find an element in the iterable applying a function to each element
     * if the function returns true, the element is returned
     * @param {function} cb a function, an async function or a generator
     * @param {number} concurrency a number representing the max number of concurrent application
     */
    static find(col, fn, opts = {}) {
        return new Promise((resolve, reject) => {
            runGen(find(col, fn, opts.concurrency), null, resolve, reject)
        })
    }
    /**
     * Find an element in the iterable applying a function to each element, in series
     * if the function returns true, the element is returned
     * @param {function} cb a function, an async function or a generator
     */
    static findSeries(col, fn) {
        return new Promise((resolve, reject) => {
            runGen(find(col, fn, 1), null, resolve, reject)
        })
    }
    /**
     * 
     * @param {*} cond 
     * @param {*} fn 
     */
    static while(cond, fn) {
        return new Promise((resolve, reject) => {
            runGen(forWhile(cond, fn), null, resolve, reject)
        })
    }
    /**
     * 
     * @param {*} col 
     * @param {*} args 
     */
    static range(col, ...args) {
        const fn = args.pop()
        const g = iterate(col, fn, args)
        return g
    }
}

module.exports = Iter
