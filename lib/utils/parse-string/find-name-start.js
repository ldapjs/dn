'use strict'

// Attribute types must start with an ASCII alphanum character.
// https://www.rfc-editor.org/rfc/rfc4514#section-3
// https://www.rfc-editor.org/rfc/rfc4512#section-1.4
const isLeadChar = (c) => /[a-zA-Z0-9]/.test(c) === true

/**
 * Find the starting position of an attribute type (name). Leading spaces and
 * commas are ignored. If an invalid leading character is encountered, an
 * invalid position will be returned.
 *
 * @param {Buffer} searchBuffer
 * @param {number} startPos
 *
 * @returns {number} The position in the buffer where the name starts, or `-1`
 * if an invalid name starting character is encountered.
 */
module.exports = function findNameStart ({ searchBuffer, startPos }) {
  let pos = startPos
  while (pos < searchBuffer.byteLength) {
    if (searchBuffer[pos] === 0x20 || searchBuffer[pos] === 0x2c) {
      // Skip leading space and comma.
      pos += 1
      continue
    }
    const char = String.fromCharCode(searchBuffer[pos])
    if (isLeadChar(char) === true) {
      return pos
    }
    break
  }
  return -1
}
