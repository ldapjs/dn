'use strict'

const tap = require('tap')
const readAttributeValue = require('./read-attribute-value')
const { BerReader } = require('@ldapjs/asn1')

const missingError = Error('attribute value does not start with equals sign')

tap.test('throws if missing equals sign', async t => {
  let input = Buffer.from('foo')
  t.throws(
    () => readAttributeValue({ searchBuffer: input, startPos: 3 }),
    missingError
  )

  input = Buffer.from('foo  ≠')
  t.throws(
    () => readAttributeValue({ searchBuffer: input, startPos: 3 }),
    missingError
  )
})

tap.test('handles empty attribute value', async t => {
  const input = Buffer.from('foo=')
  const result = readAttributeValue({ searchBuffer: input, startPos: 3 })
  t.same(result, { endPos: 4, value: '' })
})

tap.test('returns attribute value', async t => {
  const input = Buffer.from('foo=bar')
  const result = readAttributeValue({ searchBuffer: input, startPos: 3 })
  t.same(result, { endPos: 7, value: 'bar' })
})

tap.test('quoted values', t => {
  t.test('throws if quote is unexpected', async t => {
    const input = Buffer.from('=foo"bar')
    t.throws(
      () => readAttributeValue({ searchBuffer: input, startPos: 0 }),
      'unexpected quote (") in rdn string at position 4'
    )
  })

  t.test('handles a basic quoted value', async t => {
    const input = Buffer.from('="bar"')
    const result = readAttributeValue({ searchBuffer: input, startPos: 0 })
    t.same(result, { endPos: 6, value: 'bar' })
  })

  t.test('handles quote followed by end char', async t => {
    const input = Buffer.from('="bar",another=rdn')
    const result = readAttributeValue({ searchBuffer: input, startPos: 0 })
    t.same(result, { endPos: 6, value: 'bar' })
  })

  t.test('significant spaces in quoted values are part of the value', async t => {
    const input = Buffer.from('="foo bar   "')
    const result = readAttributeValue({ searchBuffer: input, startPos: 0 })
    t.same(result, { endPos: 13, value: 'foo bar' })
  })

  t.test('throws if next significant char is not an end char', async t => {
    const input = Buffer.from('="foo bar" baz')
    t.throws(
      () => readAttributeValue({ searchBuffer: input, startPos: 0 }),
      'significant rdn character found outside of quotes at position 7'
    )
  })

  t.test('throws if ending quote not found', async t => {
    const input = Buffer.from('="foo')
    t.throws(
      () => readAttributeValue({ searchBuffer: input, startPos: 0 }),
      'missing ending double quote for attribute value'
    )
  })

  t.end()
})

tap.test('leading and trailing spaces are omitted', async t => {
  const input = Buffer.from('=   foo  ')
  const result = readAttributeValue({ searchBuffer: input, startPos: 0 })
  t.same(result, { endPos: 9, value: 'foo' })
})

tap.test('parses escaped attribute values', async t => {
  const input = Buffer.from('foo=foo\\#bar')
  const result = readAttributeValue({ searchBuffer: input, startPos: 3 })
  t.same(result, { endPos: 12, value: 'foo#bar' })
})

tap.test('stops reading at all ending characters', async t => {
  const tests = [
    { input: '=foo,bar', expected: { endPos: 4, value: 'foo' } },
    { input: '=foo+bar', expected: { endPos: 4, value: 'foo' } },
    { input: '=foo;bar', expected: { endPos: 4, value: 'foo' } }
  ]

  for (const test of tests) {
    const result = readAttributeValue({
      searchBuffer: Buffer.from(test.input),
      startPos: 0
    })
    t.same(result, test.expected)
  }
})

tap.test('reads hex encoded string', async t => {
  const input = Buffer.from('=#0403666f6f')
  const result = readAttributeValue({ searchBuffer: input, startPos: 0 })
  const expected = {
    endPos: 12,
    value: new BerReader(Buffer.from([0x04, 0x03, 0x66, 0x6f, 0x6f]))
  }

  t.same(result, expected)
  t.equal(result.value.buffer.compare(expected.value.buffer), 0)
})
