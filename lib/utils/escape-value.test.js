'use strict'

const tap = require('tap')
const escapeValue = require('./escape-value')

tap.test('throws for bad input', async t => {
  t.throws(
    () => escapeValue(42),
    Error('value must be a string')
  )
})

tap.test('reserved chars', t => {
  t.test('space', async t => {
    const input = ' has a leading and trailing space '
    const expected = '\\20has a leading and trailing space\\20'
    const result = escapeValue(input)
    t.equal(result, expected)
  })

  t.test('leading #', async t => {
    t.equal(escapeValue('#hashtag'), '\\23hashtag')
  })

  t.test('pompous name', async t => {
    t.equal(
      escapeValue('James "Jim" Smith, III'),
      'James \\22Jim\\22 Smith\\2c III'
    )
  })

  t.test('carriage return', async t => {
    t.equal(escapeValue('Before\rAfter'), 'Before\\0dAfter')
  })

  t.end()
})

tap.test('2-byte utf-8', t => {
  t.test('Lučić', async t => {
    const expected = 'Lu\\c4\\8di\\c4\\87'
    t.equal(escapeValue('Lučić'), expected)
  })

  t.end()
})

tap.test('3-byte utf-8', t => {
  t.test('₠', async t => {
    t.equal(escapeValue('₠'), '\\e2\\82\\a0')
  })

  t.end()
})

tap.test('4-byte utf-8', t => {
  t.test('😀', async t => {
    t.equal(escapeValue('😀'), '\\f0\\9f\\98\\80')
  })

  t.end()
})
