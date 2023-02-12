'use strict'

const partIsNotNumeric = part => /^\d+$/.test(part) === false

/**
 * Determines if a passed in string is a dotted decimal string.
 *
 * @param {string} value
 *
 * @returns {boolean}
 */
module.exports = function isDottedDecimal (value) {
  if (typeof value !== 'string') return false

  const parts = value.split('.')
  const nonNumericParts = parts.filter(partIsNotNumeric)

  return nonNumericParts.length === 0
}
