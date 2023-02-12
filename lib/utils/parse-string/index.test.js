'use strict'

const tap = require('tap')
const { BerReader } = require('@ldapjs/asn1')
const parseString = require('./index')

tap.test('throws for non-string input', async t => {
  const input = ['cn=foo']
  t.throws(
    () => parseString(input),
    'input must be a string'
  )
})

tap.test('short circuits for root dse', async t => {
  t.same(parseString(''), [])
})

tap.test('parses basic single rdn', async t => {
  const input = 'cn=foo'
  const result = parseString(input)
  t.same(result, [{ cn: 'foo' }])
})

tap.test('skips leading whitespace', async t => {
  const input = '   cn=foo'
  const result = parseString(input)
  t.same(result, [{ cn: 'foo' }])
})

tap.test('parses basic multiple rdns', async t => {
  let input = 'dc=example,dc=com'
  let result = parseString(input)
  t.same(
    result,
    [
      { dc: 'example' },
      { dc: 'com' }
    ]
  )

  // RFC 2253 §4 separator is supported.
  input = 'dc=example;dc=com'
  result = parseString(input)
  t.same(
    result,
    [
      { dc: 'example' },
      { dc: 'com' }
    ]
  )
})

tap.test('handles multivalued rdn', async t => {
  const input = 'foo=bar+baz=bif'
  const result = parseString(input)
  t.same(result, [{ foo: 'bar', baz: 'bif' }])
})

tap.test('abruptly ending strings throw', async t => {
  const baseError = 'rdn string ends abruptly with character: '
  const tests = [
    { input: 'foo=bar+', expected: baseError + '+' },
    { input: 'foo=bar,', expected: baseError + ',' },
    { input: 'foo=bar;', expected: baseError + ';' }
  ]
  for (const test of tests) {
    t.throws(() => parseString(test.input), test.expected)
  }
})

tap.test('adds rdn with trailing whitespace', async t => {
  const input = 'foo=bar   '
  const result = parseString(input)
  t.same(result, [{ foo: 'bar' }])
})

tap.test('parses rdn with attribute name in OID form', async t => {
  const input = '0.9.2342.19200300.100.1.25=Example'
  const result = parseString(input)
  t.same(result, [{ '0.9.2342.19200300.100.1.25': 'Example' }])
})

tap.test('throws for invalid attribute type name', async t => {
  let input = '3foo=bar'
  t.throws(
    () => parseString(input),
    'invalid attribute type name: 3foo'
  )

  input = '1.2.3.abc=bar'
  t.throws(
    () => parseString(input),
    'invalid attribute type name: 1.2.3.abc=bar'
  )

  input = 'føø=bar'
  t.throws(
    () => parseString(input),
    'invalid attribute type name: føø'
  )
})

tap.test('throws for abrupt end', async t => {
  const input = 'foo=bar,'
  t.throws(
    () => parseString(input),
    'rdn string ends abruptly with character: ,'
  )
})

tap.test('rfc 4514 §4 examples', async t => {
  const tests = [
    {
      input: 'UID=jsmith,DC=example,DC=net',
      expected: [{ UID: 'jsmith' }, { DC: 'example' }, { DC: 'net' }]
    },
    {
      input: 'OU=Sales+CN=J.  Smith,DC=example,DC=net',
      expected: [
        { OU: 'Sales', CN: 'J.  Smith' },
        { DC: 'example' },
        { DC: 'net' }
      ]
    },
    {
      input: 'CN=James \\"Jim\\" Smith\\, III,DC=example,DC=net',
      expected: [{ CN: 'James "Jim" Smith, III' }, { DC: 'example' }, { DC: 'net' }]
    },
    {
      input: 'CN=Before\\0dAfter,DC=example,DC=net',
      expected: [{ CN: 'Before\rAfter' }, { DC: 'example' }, { DC: 'net' }]
    },
    {
      checkBuffer: true,
      input: '1.3.6.1.4.1.1466.0=#04024869',
      expected: [{ '1.3.6.1.4.1.1466.0': new BerReader(Buffer.from([0x04, 0x02, 0x48, 0x69])) }]
    },
    {
      input: 'CN=Lu\\C4\\8Di\\C4\\87',
      expected: [{ CN: 'Lučić' }]
    }
  ]

  for (const test of tests) {
    const result = parseString(test.input)
    if (test.checkBuffer) {
      for (const [i, rdn] of test.expected.entries()) {
        for (const key of Object.keys(rdn)) {
          t.equal(
            rdn[key].buffer.compare(result[i][key].buffer),
            0
          )
        }
      }
    } else {
      t.same(result, test.expected)
    }
  }
})

tap.test('rfc 2253 §5 examples', async t => {
  const tests = [
    {
      input: 'CN=Steve Kille,O=Isode Limited,C=GB',
      expected: [{ CN: 'Steve Kille' }, { O: 'Isode Limited' }, { C: 'GB' }]
    },
    {
      input: 'OU=Sales+CN=J. Smith,O=Widget Inc.,C=US',
      expected: [{ OU: 'Sales', CN: 'J. Smith' }, { O: 'Widget Inc.' }, { C: 'US' }]
    },
    {
      input: 'CN=L. Eagle,O=Sue\\, Grabbit and Runn,C=GB',
      expected: [{ CN: 'L. Eagle' }, { O: 'Sue, Grabbit and Runn' }, { C: 'GB' }]
    },
    {
      input: 'CN=Before\\0DAfter,O=Test,C=GB',
      expected: [{ CN: 'Before\rAfter' }, { O: 'Test' }, { C: 'GB' }]
    },
    {
      checkBuffer: true,
      input: '1.3.6.1.4.1.1466.0=#04024869,O=Test,C=GB',
      expected: [
        { '1.3.6.1.4.1.1466.0': new BerReader(Buffer.from([0x04, 0x02, 0x48, 0x69])) },
        { O: 'Test' },
        { C: 'GB' }
      ]
    },
    {
      input: 'SN=Lu\\C4\\8Di\\C4\\87',
      expected: [{ SN: 'Lučić' }]
    }
  ]

  for (const test of tests) {
    const result = parseString(test.input)
    if (test.checkBuffer) {
      for (const [i, rdn] of test.expected.entries()) {
        for (const key of Object.keys(rdn)) {
          if (typeof rdn[key] !== 'string') {
            t.equal(
              rdn[key].buffer.compare(result[i][key].buffer),
              0
            )
          } else {
            t.equal(rdn[key], result[i][key])
          }
        }
      }
    } else {
      t.same(result, test.expected)
    }
  }
})
