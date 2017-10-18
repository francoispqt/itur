const chai = require('chai')
const Iter = require('../')

const expect = chai.expect

const testCol = [1, 2, 3, 4]

describe('Iter.map', () => {
    it('Should map values returned by the generator to the a new collection', done => {
        Iter.map(testCol, function*(key, value) {
            return value + 1
        }).then(result => {
            expect(result).to.deep.equal([2, 3, 4, 5])
            done()
        })
    })

    it('Should map values returned by the generator to the a new collection with the given concurrency level', done => {
        Iter.map(
            testCol,
            function*(key, value) {
                return value + 1
            },
            { concurrency: 2 }
        ).then(result => {
            expect(result).to.deep.equal([2, 3, 4, 5])
            done()
        })
    })

    it('Should map values returned by the generator to the a new collection with the given concurrency level', done => {
        Iter.mapSeries(testCol, function*(key, value) {
            return value + 1
        }).then(result => {
            expect(result).to.deep.equal([2, 3, 4, 5])
            done()
        })
    })
})

describe('Iter.forEach', () => {
    it('Should run a generator in series on each element of the collection', done => {
        const result = []
        Iter.forEach(testCol, function*(key, value) {
            result.push(
                yield new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(value)
                    }, 500 - key * 100)
                })
            )
        }).then(() => {
            expect(result).to.deep.equal([1, 2, 3, 4])
            done()
        })
    })
})

describe('Iter.all', () => {
    it('Should run a generator concurrently on each element of the collection', done => {
        const result = []
        Iter.all(testCol, function*(key, value) {
            result[key] = value + 1
        }).then(() => {
            expect(result).to.deep.equal([2, 3, 4, 5])
            done()
        })
    })
})

describe('Iter.reduce', () => {
    it('Should should reduce the collection applying a generator on each elemnt and returning the final reuslt', done => {
        Iter.reduce(
            testCol,
            function*(agg, key, value) {
                agg += yield Promise.resolve(value)
                return agg
            },
            0
        ).then(result => {
            expect(result).to.equal(10)
            done()
        })
    })
})

describe('Iter.range', () => {
    it('Should be used to range over an iterable applying a generator on each elem', done => {
        const g = function*(key, value) {
            return key
        }
        const result = []
        Iter.run(function*() {
            for (const d of Iter.range(testCol, g)) {
                result.push(yield d)
            }
        })().then(() => {
            expect(result).to.deep.equal([0, 1, 2, 3])
            done()
        })
    })
})

describe('Iter.while', () => {
    it('Should run a generator as long as the condition is matched', done => {
        let c = true
        let ct = 0
        Iter.while(
            () => {
                return c === true
            },
            function*() {
                yield Promise.resolve(true)
                ct++
                if (ct >= 10) c = false
            }
        ).then(() => {
            expect(ct).to.equal(10)
            done()
        })
    })
})

describe('Iter.find', () => {
    it('Should find the given element in the collection applying a generator to each elem', done => {
        Iter.find(testCol, function*(key, value) {
            const r = yield Promise.resolve(3)
            return key === r
        }).then(r => {
            expect(r).to.equal(4)
            done()
        })
    })

    it('Should find the given element in the collection applying a generator to each elem', done => {
        Iter.find(
            testCol,
            function*(key, value) {
                const r = yield Promise.resolve(3)
                return key === r
            },
            { concurrency: 2 }
        ).then(r => {
            expect(r).to.equal(4)
            done()
        })
    })

    it('Should find the given element in the collection applying a generator to each elem', done => {
        Iter.findSeries(testCol, function*(key, value) {
            const r = yield Promise.resolve(3)
            return key === r
        }).then(r => {
            expect(r).to.equal(4)
            done()
        })
    })
})

describe('Iter', () => {
    it('Iter should be chainable and yieldable', done => {
        Iter.run(function*() {
            const r = yield Iter.map(testCol, function*(key, value) {
                return value + 1
            }).reduce(function*(agg, key, value) {
                agg += yield Promise.resolve(value)
                return agg
            }, 0)

            expect(r).to.equal(14)
            done()
        })()
    })

    it('Iter should be catchable and yieldable and stop when error is encountered', done => {
        Iter.run(function*() {
            try {
                const r = yield Iter.map(testCol, function*(key, value) {
                    return value + 1
                })
                    .forEach(function*(key, value) {
                        // should not be called
                        expect(value).to.equal(key + 2)
                        return
                    })
                    .map(function*(key, value) {
                        return value
                    })
                    .mapSeries(function*(key, value) {
                        return yield Promise.resolve(value)
                    })
                    .reduce(function*(agg, key, value) {
                        throw new Error('err')
                        return agg
                    }, 0)
            } catch (err) {
                console.error(err)
                expect(err.message).to.equal('err')
                done()
            }
        })()
    })

    it('Iter should be catchable and yieldable and stop when error is encountered', done => {
        Iter.run(function*() {
            try {
                const r = yield Iter.map(testCol, function*(key, value) {
                    return value + 1
                })
                    .reduce(function*(agg, key, value) {
                        throw new Error('err')
                    }, 0)
                    .forEach(function*(key, value) {
                        // should not be called
                        expect(true).to.equal(false)
                    })
            } catch (err) {
                expect(err.message).to.equal('err')
                done()
            }
        })()
    })

    it('Iter should be catchable and yieldable and stop when error is encountered', done => {
        Iter.run(function*() {
            return Promise.reject(new Error('test'))
        })().catch(err => {
            expect(err.message).to.equal('test')
            done()
        })
    })
})
