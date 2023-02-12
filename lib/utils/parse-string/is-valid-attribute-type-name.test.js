'use strict'

const tap = require('tap')
const isValidAttributeTypeName = require('./is-valid-attribute-type-name')

tap.test('validates numericoids', async t => {
  let input = '1.2.3.4'
  let result = isValidAttributeTypeName(input)
  t.equal(result, true)

  input = '1.2.3.4.abc'
  result = isValidAttributeTypeName(input)
  t.equal(result, false)
})

tap.test('validates descrs', async t => {
  let input = 'foo'
  let result = isValidAttributeTypeName(input)
  t.equal(result, true)

  input = '3foo'
  result = isValidAttributeTypeName(input)
  t.equal(result, false)

  input = 'foo-3'
  result = isValidAttributeTypeName(input)
  t.equal(result, true)

  input = 'føø3'
  result = isValidAttributeTypeName(input)
  t.equal(result, false)

  input = 'ƒ00'
  result = isValidAttributeTypeName(input)
  t.equal(result, false)
})
