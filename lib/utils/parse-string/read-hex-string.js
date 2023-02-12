'use strict'

const { BerReader } = require('@ldapjs/asn1')

const isValidHexCode = code => /[0-9a-fA-F]{2}/.test(code) === true

/**
 * @typedef {object} ReadHexStringResult
 * @property {number} endPos The position in the buffer where the end of the
 * hex string was encountered.
 * @property {import('@ldapjs/asn1').BerReader} berReader The parsed hex string
 * as an BER object.
 */

/**
 * Read a sequence of bytes as a hex encoded octet string. The sequence is
 * assumed to be a spec compliant encoded BER object.
 *
 * @param {Buffer} searchBuffer The buffer to read.
 * @param {number} startPos The position in the buffer to start reading from.
 *
 * @returns {ReadHexStringResult}
 *
 * @throws When an invalid hex pair has been encountered.
 */
module.exports = function readHexString ({ searchBuffer, startPos }) {
  const bytes = []

  let pos = startPos
  while (pos < searchBuffer.byteLength) {
    if (isEndChar(searchBuffer[pos])) {
      break
    }

    const hexPair = String.fromCharCode(searchBuffer[pos]) +
      String.fromCharCode(searchBuffer[pos + 1])
    if (isValidHexCode(hexPair) === false) {
      throw Error('invalid hex pair encountered: 0x' + hexPair)
    }

    bytes.push(parseInt(hexPair, 16))
    pos += 2
  }

  return {
    endPos: pos,
    berReader: new BerReader(Buffer.from(bytes))
  }
}

function isEndChar (c) {
  switch (c) {
    case 0x20: // space
    case 0x2b: // +
    case 0x2c: // ,
    case 0x3b: // ;
      return true
    default:
      return false
  }
}
