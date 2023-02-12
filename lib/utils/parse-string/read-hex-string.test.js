'use strict'

const tap = require('tap')
const readHexString = require('./read-hex-string')

tap.test('throws for invalid hex pair', async t => {
  let input = Buffer.from('1z2f')
  t.throws(
    () => readHexString({ searchBuffer: input, startPos: 0 }),
    'invalid hex pair encountered: 0x1z'
  )

  input = Buffer.from('a0b1g692')
  t.throws(
    () => readHexString({ searchBuffer: input, startPos: 0 }),
    'invalid hex pair encountered: 0xg6'
  )
})

tap.test('handles incorrect length string', async t => {
  const input = Buffer.from('a1b')
  t.throws(
    () => readHexString({ searchBuffer: input, startPos: 0 }),
    'invalid hex pair encountered: 0xb'
  )
})

tap.test('reads hex string', async t => {
  let input = Buffer.from('0403666f6f')
  let result = readHexString({ searchBuffer: input, startPos: 0 })
  t.equal(result.endPos, 10)
  t.equal(result.berReader.readString(), 'foo')

  input = Buffer.from('uid=#0409746573742E75736572')
  result = readHexString({ searchBuffer: input, startPos: 5 })
  t.equal(result.endPos, input.byteLength)
  t.equal(result.berReader.readString(), 'test.user')
})

tap.test('stops on end chars', async t => {
  const inputs = [
    Buffer.from('0403666f6f foo'),
    Buffer.from('0403666f6f+foo'),
    Buffer.from('0403666f6f,foo'),
    Buffer.from('0403666f6f;foo')
  ]
  for (const input of inputs) {
    const result = readHexString({ searchBuffer: input, startPos: 0 })
    t.equal(result.endPos, 10)
    t.equal(result.berReader.readString(), 'foo')
  }
})
