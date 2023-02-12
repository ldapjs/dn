'use strict'

const isDigit = c => /[0-9]/.test(c) === true
const hasKeyChars = input => /[a-zA-Z-]/.test(input) === true
const isValidLeadChar = c => /[a-zA-Z]/.test(c) === true
const hasInvalidChars = input => /[^a-zA-Z0-9-]/.test(input) === true

/**
 * An attribute type name is defined by RFC 4514 §3 as a "descr" or
 * "numericoid". These are defined by RFC 4512 §1.4. This function validates
 * the given name as matching the spec.
 *
 * @param {string} name
 *
 * @returns {boolean}
 */
module.exports = function isValidAttributeTypeName (name) {
  if (isDigit(name[0]) === true) {
    // A leading digit indicates that the name should be a numericoid.
    return hasKeyChars(name) === false
  }

  if (isValidLeadChar(name[0]) === false) {
    return false
  }

  return hasInvalidChars(name) === false
}
