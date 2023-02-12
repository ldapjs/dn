'use strict'

/**
 * Converts an attribute value into an escaped string as described in
 * https://www.rfc-editor.org/rfc/rfc4514#section-2.4.
 *
 * This function supports up to 4 byte unicode characters.
 *
 * @param {string} value
 * @returns {string} The escaped string.
 */
module.exports = function escapeValue (value) {
  if (typeof value !== 'string') {
    throw Error('value must be a string')
  }

  const toEscape = Buffer.from(value, 'utf8')
  const escaped = []

  // We will handle the reverse solidus ('\') on its own.
  const embeddedReservedChars = [
    0x22, // '"'
    0x2b, // '+'
    0x2c, // ','
    0x3b, // ';'
    0x3c, // '<'
    0x3e // '>'
  ]
  for (let i = 0; i < toEscape.byteLength;) {
    const charHex = toEscape[i]

    // Handle leading space or #.
    if (i === 0 && (charHex === 0x20 || charHex === 0x23)) {
      escaped.push(toEscapedHexString(charHex))
      i += 1
      continue
    }
    // Handle trailing space.
    if (i === toEscape.byteLength - 1 && charHex === 0x20) {
      escaped.push(toEscapedHexString(charHex))
      i += 1
      continue
    }

    if (embeddedReservedChars.includes(charHex) === true) {
      escaped.push(toEscapedHexString(charHex))
      i += 1
      continue
    }

    if (charHex >= 0xc0 && charHex <= 0xdf) {
      // Represents the first byte in a 2-byte UTF-8 character.
      escaped.push(toEscapedHexString(charHex))
      escaped.push(toEscapedHexString(toEscape[i + 1]))
      i += 2
      continue
    }

    if (charHex >= 0xe0 && charHex <= 0xef) {
      // Represents the first byte in a 3-byte UTF-8 character.
      escaped.push(toEscapedHexString(charHex))
      escaped.push(toEscapedHexString(toEscape[i + 1]))
      escaped.push(toEscapedHexString(toEscape[i + 2]))
      i += 3
      continue
    }

    if (charHex >= 0xf0 && charHex <= 0xf7) {
      // Represents the first byte in a 4-byte UTF-8 character.
      escaped.push(toEscapedHexString(charHex))
      escaped.push(toEscapedHexString(toEscape[i + 1]))
      escaped.push(toEscapedHexString(toEscape[i + 2]))
      escaped.push(toEscapedHexString(toEscape[i + 3]))
      i += 4
      continue
    }

    if (charHex <= 31) {
      // Represents an ASCII control character.
      escaped.push(toEscapedHexString(charHex))
      i += 1
      continue
    }

    escaped.push(String.fromCharCode(charHex))
    i += 1
    continue
  }

  return escaped.join('')
}

/**
 * Given a byte, convert it to an escaped hex string.
 *
 * @example
 * toEscapedHexString(0x20) // '\20'
 *
 * @param {number} char
 * @returns {string}
 */
function toEscapedHexString (char) {
  return '\\' + char.toString(16).padStart(2, '0')
}
