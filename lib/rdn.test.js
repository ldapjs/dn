'use strict'

const tap = require('tap')
const warning = require('./deprecations')
const { BerReader } = require('@ldapjs/asn1')
const RDN = require('./rdn')

// Silence the standard warning logs. We will test the messages explicitly.
process.removeAllListeners('warning')

tap.test('equals', t => {
  t.test('false for non-rdn object', async t => {
    const rdn = new RDN()
    t.equal(rdn.equals({}), false)
  })

  t.test('false for size mis-match', async t => {
    const rdn1 = new RDN({ cn: 'foo' })
    const rdn2 = new RDN({ cn: 'foo', sn: 'bar' })
    t.equal(rdn1.equals(rdn2), false)
  })

  t.test('false for keys mis-match', async t => {
    const rdn1 = new RDN({ cn: 'foo' })
    const rdn2 = new RDN({ sn: 'bar' })
    t.equal(rdn1.equals(rdn2), false)
  })

  t.test('false for value mis-match', async t => {
    const rdn1 = new RDN({ cn: 'foo' })
    const rdn2 = new RDN({ cn: 'bar' })
    t.equal(rdn1.equals(rdn2), false)
  })

  t.test('true for match', async t => {
    const rdn1 = new RDN({ cn: 'foo' })
    const rdn2 = new RDN({ cn: 'foo' })
    t.equal(rdn1.equals(rdn2), true)
  })

  t.end()
})

tap.test('setAttribute', async t => {
  t.test('throws for bad name', async t => {
    const rdn = new RDN()
    t.throws(
      () => rdn.setAttribute({ name: 42 }),
      Error('name must be a string')
    )

    t.throws(
      () => rdn.setAttribute({ name: '3cn', value: 'foo' }),
      Error('attribute name must start with an ASCII alpha character or be a numeric OID')
    )
  })

  t.test('throws for bad value', async t => {
    const rdn = new RDN()
    t.throws(
      () => rdn.setAttribute({ name: 'cn', value: 42 }),
      Error('value must be a string')
    )
  })

  t.test('throws for options', async t => {
    const rdn = new RDN()
    t.throws(
      () => rdn.setAttribute({ name: 'cn', value: 'foo', options: 42 }),
      Error('options must be an object')
    )
  })

  t.test('sets an attribute with value', async t => {
    const rdn = new RDN()
    rdn.setAttribute({ name: 'cn', value: 'foo' })
    t.equal(rdn.getValue('cn'), 'foo')
  })

  t.test('options generates warning', t => {
    process.on('warning', handler)
    t.teardown(async () => {
      process.removeListener('warning', handler)
      warning.emitted.set('LDAP_DN_DEP_001', false)
    })

    const rdn = new RDN()
    rdn.setAttribute({ name: 'cn', value: 'foo', options: { foo: 'bar' } })

    function handler (error) {
      t.equal(error.message, 'attribute options is deprecated and are ignored')
      t.end()
    }
  })

  t.end()
})

tap.test('toString', t => {
  t.test('basic single value', async t => {
    const rdn = new RDN({ cn: 'foo' })
    t.equal(rdn.toString(), 'cn=foo')
  })

  t.test('escaped single value', async t => {
    const rdn = new RDN({ cn: ' foo, bar\n' })
    t.equal(rdn.toString(), 'cn=\\20foo\\2c bar\\0a')
  })

  t.test('basic multi-value', async t => {
    const rdn = new RDN({ cn: 'foo', sn: 'bar' })
    t.equal(rdn.toString(), 'cn=foo+sn=bar')
  })

  t.test('escaped multi-value', async t => {
    const rdn = new RDN({ cn: '#foo', sn: 'bar' })
    t.equal(rdn.toString(), 'cn=\\23foo+sn=bar')
  })

  t.test('recognizes encoded string values', async t => {
    const rdn = new RDN({
      cn: '#foo',
      '1.3.6.1.4.1.1466.0': '#04024869'
    })
    t.equal(rdn.toString(), 'cn=\\23foo+1.3.6.1.4.1.1466.0=#04024869')
  })

  t.test('encodes BerReader instances', async t => {
    const rdn = new RDN({
      cn: new BerReader(Buffer.from([0x04, 0x03, 0x66, 0x6f, 0x6f]))
    })
    t.equal(rdn.toString(), 'cn=#0403666f6f')
  })

  t.test('honors unescaped options', async t => {
    const rdn = new RDN({
      ou: '研发二组'
    })
    t.equal(rdn.toString({ unescaped: true }), 'ou=研发二组')
  })

  t.end()
})

tap.test('deprecations', t => {
  t.test('format', t => {
    process.on('warning', handler)
    t.teardown(async () => {
      process.removeListener('warning', handler)
      warning.emitted.set('LDAP_DN_DEP_002', false)
    })

    const rdn = new RDN({ cn: 'foo' })
    t.equal(rdn.format(), 'cn=foo')

    function handler (error) {
      t.equal(error.message, '.format() is deprecated. Use .toString() instead')
      t.end()
    }
  })

  t.test('set', t => {
    process.on('warning', handler)
    t.teardown(async () => {
      process.removeListener('warning', handler)
      warning.emitted.set('LDAP_DN_DEP_002', false)
    })

    const rdn = new RDN()
    rdn.set('cn', 'foo', { value: 'ignored' })

    function handler (error) {
      t.equal(error.message, '.set() is deprecated. Use .setAttribute() instead')
      t.end()
    }
  })

  t.end()
})

tap.test('#isRdn', t => {
  t.test('true for instance', async t => {
    const rdn = new RDN()
    t.equal(RDN.isRdn(rdn), true)
  })

  t.test('false for non-object', async t => {
    t.equal(RDN.isRdn(42), false)
  })

  t.test('false for bad object', async t => {
    const input = { bad: 'rdn', 'non-string-value': 42 }
    t.equal(RDN.isRdn(input), false)
  })

  t.test('true for rdn-like with name+value keys', async t => {
    const input = { name: 'cn', value: 'foo' }
    t.equal(RDN.isRdn(input), true)
  })

  t.test('true for pojo representation', async t => {
    const input = { cn: 'foo', sn: 'bar' }
    t.equal(RDN.isRdn(input), true)
  })

  t.test('true for pojo with BerReader', async t => {
    const input = {
      foo: new BerReader(Buffer.from([0x04, 0x03, 0x66, 0x6f, 0x6f]))
    }
    t.equal(RDN.isRdn(input), true)
  })

  t.end()
})
