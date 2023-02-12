'use strict'

const tap = require('tap')
const isDottedDecimal = require('./is-dotted-decimal')

tap.test('false for non-string', async t => {
  t.equal(isDottedDecimal(), false)
})

tap.test('false for empty string', async t => {
  t.equal(isDottedDecimal(''), false)
})

tap.test('false for alpha string', async t => {
  t.equal(isDottedDecimal('foo'), false)
})

tap.test('false for alpha-num string', async t => {
  t.equal(isDottedDecimal('foo.123'), false)
})

tap.test('true for valid string', async t => {
  t.equal(isDottedDecimal('1.2.3'), true)
})
