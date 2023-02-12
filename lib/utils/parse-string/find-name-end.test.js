'use strict'

const tap = require('tap')
const findNameEnd = require('./find-name-end')

tap.test('stops on a space', async t => {
  const input = Buffer.from('foo = bar')
  const pos = findNameEnd({ searchBuffer: input, startPos: 0 })
  t.equal(pos, 3)
})

tap.test('stops on an equals', async t => {
  const input = Buffer.from('foo=bar')
  const pos = findNameEnd({ searchBuffer: input, startPos: 0 })
  t.equal(pos, 3)
})

tap.test('returns -1 for bad character', async t => {
  const input = Buffer.from('føø=bar')
  const pos = findNameEnd({ searchBuffer: input, startPos: 0 })
  t.equal(pos, -1)
})

tap.test('recognizes all valid characters', async t => {
  const input = Buffer.from('Foo.0-bar=baz')
  const pos = findNameEnd({ searchBuffer: input, startPos: 0 })
  t.equal(pos, 9)
})
