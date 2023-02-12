'use strict'

const readHexString = require('./read-hex-string')
const readEscapeSequence = require('./read-escape-sequence')

/**
 * @typedef {object} ReadAttributeValueResult
 * @property {number} endPos The position in the buffer that marks the end of
 * the value.
 * @property {string | import('@ldapjs/asn1').BerReader} value
 */

/**
 * Read an attribute value string from a given {@link Buffer} and return it.
 * If the value is an encoded octet string, it will be decoded and returned
 * as a {@link Buffer}.
 *
 * @param {Buffer} searchBuffer
 * @param {number} startPos
 *
 * @returns {ReadAttributeValueResult}
 *
 * @throws When there is a syntax error in the attribute value string.
 */
module.exports = function readAttributeValue ({ searchBuffer, startPos }) {
  let pos = startPos

  while (pos < searchBuffer.byteLength && searchBuffer[pos] === 0x20) {
    // Skip over any leading whitespace before the '='.
    pos += 1
  }

  if (pos >= searchBuffer.byteLength || searchBuffer[pos] !== 0x3d) {
    throw Error('attribute value does not start with equals sign')
  }

  // Advance past the equals sign.
  pos += 1
  while (pos <= searchBuffer.byteLength && searchBuffer[pos] === 0x20) {
    // Advance past any leading whitespace.
    pos += 1
  }

  if (pos >= searchBuffer.byteLength) {
    return { endPos: pos, value: '' }
  }

  if (searchBuffer[pos] === 0x23) {
    const result = readHexString({ searchBuffer, startPos: pos + 1 })
    pos = result.endPos
    return { endPos: pos, value: result.berReader }
  }

  const readValueResult = readValueString({ searchBuffer, startPos: pos })
  pos = readValueResult.endPos
  return {
    endPos: pos,
    value: readValueResult.value.toString('utf8').trim()
  }
}

/**
 * @typedef {object} ReadValueStringResult
 * @property {number} endPos
 * @property {Buffer} value
 * @private
 */

/**
 * Read a series of bytes from the buffer as a plain string.
 *
 * @param {Buffer} searchBuffer
 * @param {number} startPos
 *
 * @returns {ReadValueStringResult}
 *
 * @throws When the attribute value is malformed.
 *
 * @private
 */
function readValueString ({ searchBuffer, startPos }) {
  let pos = startPos
  let inQuotes = false
  let endQuotePresent = false

  const bytes = []
  while (pos <= searchBuffer.byteLength) {
    const char = searchBuffer[pos]

    if (pos === searchBuffer.byteLength) {
      if (inQuotes === true && endQuotePresent === false) {
        throw Error('missing ending double quote for attribute value')
      }
      break
    }

    if (char === 0x22) {
      // Handle the double quote (") character.
      // RFC 2253 §4 allows for attribute values to be wrapped in double
      // quotes in order to allow certain characters to be unescaped.
      // We are not enforcing escaping of characters in this parser, so we only
      // need to recognize that the quotes are present. Our RDN string encoder
      // will escape characters as necessary.
      if (inQuotes === true) {
        pos += 1
        endQuotePresent = true

        // We should be at the end of the value.
        while (pos < searchBuffer.byteLength) {
          const nextChar = searchBuffer[pos]
          if (isEndChar(nextChar) === true) {
            break
          }
          if (nextChar !== 0x20) {
            throw Error('significant rdn character found outside of quotes at position ' + pos)
          }
          pos += 1
        }

        break
      }

      if (pos !== startPos) {
        throw Error('unexpected quote (") in rdn string at position ' + pos)
      }
      inQuotes = true
      pos += 1
      continue
    }

    if (isEndChar(char) === true && inQuotes === false) {
      break
    }

    if (char === 0x5c) {
      // We have encountered the start of an escape sequence.
      const seqResult = readEscapeSequence({
        searchBuffer,
        startPos: pos
      })
      pos = seqResult.endPos
      Array.prototype.push.apply(bytes, seqResult.parsed)
      continue
    }

    bytes.push(char)
    pos += 1
  }

  return {
    endPos: pos,
    value: Buffer.from(bytes)
  }
}

function isEndChar (c) {
  switch (c) {
    case 0x2b: // +
    case 0x2c: // ,
    case 0x3b: // ; -- Allowed by RFC 2253 §4 in place of a comma.
      return true
    default:
      return false
  }
}
