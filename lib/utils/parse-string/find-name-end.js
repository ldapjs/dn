'use strict'

/**
 * Find the ending position of the attribute type name portion of an RDN.
 * This function does not verify if the name is a valid description string
 * or numeric OID. It merely reads a string from the given starting position
 * to the spec defined end of an attribute type string.
 *
 * @param {Buffer} searchBuffer A buffer representing the RDN.
 * @param {number} startPos The position in the `searchBuffer` to start
 * searching from.
 *
 * @returns {number} The position of the end of the RDN's attribute type name,
 * or `-1` if an invalid character has been encountered.
 */
module.exports = function findNameEnd ({ searchBuffer, startPos }) {
  let pos = startPos

  while (pos < searchBuffer.byteLength) {
    const char = searchBuffer[pos]
    if (char === 0x20 || char === 0x3d) {
      // Name ends with a space or an '=' character.
      break
    }
    if (isValidNameChar(char) === true) {
      pos += 1
      continue
    }
    return -1
  }

  return pos
}

/**
 * Determine if a character is a valid `attributeType` character as defined
 * in RFC 4514 §3.
 *
 * @param {number} c The character to verify. Should be the byte representation
 * of the character from a {@link Buffer} instance.
 *
 * @returns {boolean}
 */
function isValidNameChar (c) {
  if (c >= 0x41 && c <= 0x5a) { // A - Z
    return true
  }
  if (c >= 0x61 && c <= 0x7a) { // a - z
    return true
  }
  if (c >= 0x30 && c <= 0x39) { // 0 - 9
    return true
  }
  if (c === 0x2d || c === 0x2e) { // - or .
    return true
  }
  return false
}
