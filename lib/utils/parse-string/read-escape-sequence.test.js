'use strict'

const tap = require('tap')
const readEscapeSequence = require('./read-escape-sequence')

tap.test('throws for bad sequence', async t => {
  const input = Buffer.from('foo\\ø')
  t.throws(
    () => readEscapeSequence({ searchBuffer: input, startPos: 3 }),
    Error('invalid hex code in escape sequence')
  )
})

tap.test('reads a single ascii sequence', async t => {
  const input = Buffer.from('foo\\#bar', 'utf8')
  const { parsed, endPos } = readEscapeSequence({
    searchBuffer: input,
    startPos: 3
  })
  t.equal(parsed.toString(), '#')
  t.equal(endPos, 5)
})

tap.test('reads a sequence of ascii sequences', async t => {
  const input = Buffer.from('foo\\#\\!bar', 'utf8')
  const { parsed, endPos } = readEscapeSequence({
    searchBuffer: input,
    startPos: 3
  })
  t.equal(parsed.toString(), '#!')
  t.equal(endPos, 7)
})

tap.test('reads a single hex sequence', async t => {
  const input = Buffer.from('foo\\2abar', 'utf8')
  const { parsed, endPos } = readEscapeSequence({
    searchBuffer: input,
    startPos: 3
  })
  t.equal(parsed.toString(), '*')
  t.equal(endPos, 6)
})

tap.test('reads 2-byte utf-8 sequence', async t => {
  const input = Buffer.from('fo\\c5\\8f bar')
  const { parsed, endPos } = readEscapeSequence({
    searchBuffer: input,
    startPos: 2
  })
  t.equal(parsed.toString(), 'ŏ')
  t.equal(endPos, 8)
})

tap.test('reads 3-byte utf-8 sequence', async t => {
  const input = Buffer.from('fo\\e0\\b0\\b0 bar')
  const { parsed, endPos } = readEscapeSequence({
    searchBuffer: input,
    startPos: 2
  })
  t.equal(parsed.toString(), 'ర')
  t.equal(endPos, 11)
})

tap.test('reads 4-byte utf-8 sequence', async t => {
  const input = Buffer.from('fo\\f0\\92\\84\\ad bar')
  const { parsed, endPos } = readEscapeSequence({
    searchBuffer: input,
    startPos: 2
  })
  t.equal(parsed.toString(), '𒄭')
  t.equal(endPos, 14)
})
