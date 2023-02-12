'use strict'

const tap = require('tap')
const warning = require('./deprecations')
const RDN = require('./rdn')
const DN = require('./dn')

// Silence the standard warning logs. We will test the messages explicitly.
process.removeAllListeners('warning')

tap.test('constructor', t => {
  t.test('throws for non-array', async t => {
    t.throws(
      () => new DN({ rdns: 42 }),
      Error('rdns must be an array')
    )
  })

  t.test('throws for non-rdn in array', async t => {
    const rdns = [
      new RDN(),
      { 'non-string-value': 42 },
      new RDN()
    ]
    t.throws(
      () => new DN({ rdns })
    )
  })

  t.test('handles mixed array', async t => {
    const rdns = [
      { cn: 'foo' },
      new RDN({ dc: 'example' }),
      new RDN({ dc: 'com' })
    ]
    const dn = new DN({ rdns })
    t.equal(dn.length, 3)
    t.equal(dn.toString(), 'cn=foo,dc=example,dc=com')
  })

  t.end()
})

tap.test('childOf', t => {
  t.test('false if we are shallower', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const target = new DN({
      rdns: [
        new RDN({ cn: 'foo' }),
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.childOf(target), false)
  })

  t.test('false if differing path', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const target = new DN({
      rdns: [
        new RDN({ dc: 'ldapjs' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.childOf(target), false)
  })

  t.test('true if we are a child', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const target = new DN({
      rdns: [
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.childOf(target), true)
  })

  t.test('handles string input', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const target = 'dc=example,dc=com'
    t.equal(dn.childOf(target), true)
  })

  t.end()
})

tap.test('clone', t => {
  t.test('returns a copy', async t => {
    const rdns = [new RDN({ cn: 'foo' })]
    const src = new DN({ rdns })
    const clone = src.clone()

    t.equal(src.length, clone.length)
    t.equal(src.toString(), clone.toString())
  })

  t.end()
})

tap.test('equals', t => {
  t.test('false for non-equal length', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const target = new DN({
      rdns: [
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.equals(target), false)
  })

  t.test('false for non-equal paths', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const target = new DN({
      rdns: [
        new RDN({ ou: 'computers' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.equals(target), false)
  })

  t.test('true for equal paths', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const target = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.equals(target), true)
  })

  t.test('handles string input', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const target = 'ou=people,dc=example,dc=com'
    t.equal(dn.equals(target), true)
  })

  t.end()
})

tap.test('format', t => {
  t.test('emits warning', t => {
    process.on('warning', handler)
    t.teardown(async () => {
      process.removeListener('warning', handler)
      warning.emitted.set('LDAP_DN_DEP_002', false)
    })

    const rdns = [{ cn: 'foo' }]
    const dnString = (new DN({ rdns })).format()
    t.equal(dnString, 'cn=foo')

    function handler (error) {
      t.equal(error.message, '.format() is deprecated. Use .toString() instead')
      t.end()
    }
  })

  t.end()
})

tap.test('isEmpty', t => {
  t.test('returns correct result', async t => {
    let dn = new DN()
    t.equal(dn.isEmpty(), true)

    dn = new DN({
      rdns: [new RDN({ cn: 'foo' })]
    })
    t.equal(dn.isEmpty(), false)
  })

  t.end()
})

tap.test('parent', t => {
  t.test('undefined for an empty DN', async t => {
    const dn = new DN()
    const parent = dn.parent()
    t.equal(parent, undefined)
  })

  t.test('returns correct DN', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ cn: 'jdoe', givenName: 'John' }),
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const parent = dn.parent()
    t.equal(parent.toString(), 'ou=people,dc=example,dc=com')
  })

  t.end()
})

tap.test('parentOf', t => {
  t.test('false if we are deeper', async t => {
    const target = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const dn = new DN({
      rdns: [
        new RDN({ cn: 'foo' }),
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.parentOf(target), false)
  })

  t.test('false if differing path', async t => {
    const target = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const dn = new DN({
      rdns: [
        new RDN({ dc: 'ldapjs' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.parentOf(target), false)
  })

  t.test('true if we are a parent', async t => {
    const target = new DN({
      rdns: [
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const dn = new DN({
      rdns: [
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.parentOf(target), true)
  })

  t.test('handles string input', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const target = 'ou=people,dc=example,dc=com'
    t.equal(dn.parentOf(target), true)
  })

  t.end()
})

tap.test('pop', t => {
  t.test('returns the last element and shortens the list', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ cn: 'foo' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.toString(), 'cn=foo,dc=example,dc=com')

    const rdn = dn.pop()
    t.equal(rdn.toString(), 'dc=com')
    t.equal(dn.toString(), 'cn=foo,dc=example')
  })

  t.end()
})

tap.test('push', t => {
  t.test('throws for bad input', async t => {
    const dn = new DN()
    t.throws(
      () => dn.push({ cn: 'foo' }),
      Error('rdn must be a RDN instance')
    )
  })

  t.test('adds to the front of the list', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ cn: 'foo' }),
        new RDN({ dc: 'example' })

      ]
    })
    t.equal(dn.toString(), 'cn=foo,dc=example')

    const newLength = dn.push(new RDN({ dc: 'com' }))
    t.equal(newLength, 3)
    t.equal(dn.toString(), 'cn=foo,dc=example,dc=com')
  })

  t.end()
})

tap.test('rdnAt', t => {
  t.test('returns correct RDN', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ cn: 'jdoe', givenName: 'John' }),
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    const rdn = dn.rdnAt(1)
    t.equal(rdn.toString(), 'ou=people')
  })

  t.end()
})

tap.test('reverse', t => {
  t.test('reverses the list', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ dc: 'com' }),
        new RDN({ dc: 'example' }),
        new RDN({ cn: 'foo' })
      ]
    })
    t.equal(dn.toString(), 'dc=com,dc=example,cn=foo')

    const result = dn.reverse()
    t.equal(dn, result)
    t.equal(dn.toString(), 'cn=foo,dc=example,dc=com')
  })

  t.end()
})

tap.test('setFormat', t => {
  t.test('emits warning', t => {
    process.on('warning', handler)
    t.teardown(async () => {
      process.removeListener('warning', handler)
      warning.emitted.set('LDAP_DN_DEP_004', false)
    })

    const rdns = [{ cn: 'foo' }]
    new DN({ rdns }).setFormat()

    function handler (error) {
      t.equal(error.message, '.setFormat() is deprecated. Options will be ignored')
      t.end()
    }
  })

  t.end()
})

tap.test('shift', t => {
  t.test('returns the first element and shortens the list', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ cn: 'foo' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.toString(), 'cn=foo,dc=example,dc=com')

    const rdn = dn.shift()
    t.equal(rdn.toString(), 'cn=foo')
    t.equal(dn.toString(), 'dc=example,dc=com')
  })

  t.end()
})

tap.test('toString', t => {
  t.test('renders correctly', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ cn: 'jdoe', givenName: 'John' }),
        new RDN({ ou: 'people' }),
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.toString(), 'cn=jdoe+givenName=John,ou=people,dc=example,dc=com')
  })

  t.test('empty string for empty DN', async t => {
    const dn = new DN()
    t.equal(dn.toString(), '')
  })

  t.end()
})

tap.test('unshift', t => {
  t.test('throws for bad input', async t => {
    const dn = new DN()
    t.throws(
      () => dn.unshift({ cn: 'foo' }),
      Error('rdn must be a RDN instance')
    )
  })

  t.test('adds to the front of the list', async t => {
    const dn = new DN({
      rdns: [
        new RDN({ dc: 'example' }),
        new RDN({ dc: 'com' })
      ]
    })
    t.equal(dn.toString(), 'dc=example,dc=com')

    const newLength = dn.unshift(new RDN({ cn: 'foo' }))
    t.equal(newLength, 3)
    t.equal(dn.toString(), 'cn=foo,dc=example,dc=com')
  })

  t.end()
})

tap.test('#isDn', t => {
  t.test('true for instance', async t => {
    const dn = new DN()
    t.equal(DN.isDn(dn), true)
  })

  t.test('false for non-object', async t => {
    t.equal(DN.isDn(42), false)
  })

  t.test('false for non-array rdns', async t => {
    const input = { rdns: 42 }
    t.equal(DN.isDn(input), false)
  })

  t.test('false for bad rdn', async t => {
    const input = { rdns: [{ bad: 'rdn', answer: 42 }] }
    t.equal(DN.isDn(input), false)
  })

  t.test('true for dn-like', async t => {
    const input = { rdns: [{ name: 'cn', value: 'foo' }] }
    t.equal(DN.isDn(input), true)
  })

  t.end()
})

tap.test('#fromString', t => {
  t.test('parses a basic string into an instance', async t => {
    const input = 'cn=foo+sn=bar,dc=example,dc=com'
    const dn = DN.fromString(input)
    t.equal(DN.isDn(dn), true)
    t.equal(dn.length, 3)
    t.equal(dn.rdnAt(0).toString(), 'cn=foo+sn=bar')
  })

  t.end()
})
