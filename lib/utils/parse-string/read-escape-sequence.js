'use strict'

/**
 * @typedef ReadEscapeSequenceResult
 * @property {number} endPos The position in the buffer that marks the end of
 * the escape sequence.
 * @property {Buffer} parsed The parsed escape sequence as a buffer of bytes.
 */

/**
 * Read an escape sequence from a buffer. It reads until no escape sequences
 * are found. Thus, a sequence of escape sequences will all be parsed at once
 * and returned as a single result.
 *
 * @example A Single ASCII Sequence
 * const toParse = Buffer.from('foo\\#bar', 'utf8')
 * const {parsed, endPos} = readEscapeSequence({
 *   searchBuffer: toParse,
 *   startPos: 3
 * })
 * // => parsed = '#', endPos = 5
 *
 * @example Multiple ASCII Sequences In Succession
 * const toParse = Buffer.from('foo\\#\\!bar', 'utf8')
 * const {parsed, endPos} = readEscapeSequence({
 *   searchBuffer: toParse,
 *   startPos: 3
 * })
 * // => parsed = '#!', endPos = 7
 *
 * @param searchBuffer
 * @param startPos
 *
 * @returns {ReadEscapeSequenceResult}
 *
 * @throws When an escaped sequence is not a valid hexadecimal value.
 */
module.exports = function readEscapeSequence ({ searchBuffer, startPos }) {
  // This is very similar to the `readEscapedCharacters` algorithm in
  // the `utils/escape-filter-value` in `@ldapjs/filter`. The difference being
  // that here we want to interpret the escape sequence instead of return it
  // as a string to be embedded in an "escaped" string.
  // https://github.com/ldapjs/filter/blob/1423612/lib/utils/escape-filter-value.js

  let pos = startPos
  const buf = []

  while (pos < searchBuffer.byteLength) {
    const char = searchBuffer[pos]
    const nextChar = searchBuffer[pos + 1]

    if (char !== 0x5c) {
      // End of sequence reached.
      break
    }

    const strHexCode = String.fromCharCode(nextChar) +
      String.fromCharCode(searchBuffer[pos + 2])
    const hexCode = parseInt(strHexCode, 16)
    if (Number.isNaN(hexCode) === true) {
      if (nextChar >= 0x00 && nextChar <= 0x7f) {
        // Sequence is a single escaped ASCII character
        buf.push(nextChar)
        pos += 2
        continue
      } else {
        throw Error('invalid hex code in escape sequence')
      }
    }

    if (hexCode >= 0xc0 && hexCode <= 0xdf) {
      // Sequence is a 2-byte utf-8 character.
      const secondByte = parseInt(
        String.fromCharCode(searchBuffer[pos + 4]) +
        String.fromCharCode(searchBuffer[pos + 5]),
        16
      )
      buf.push(hexCode)
      buf.push(secondByte)
      pos += 6
      continue
    }

    if (hexCode >= 0xe0 && hexCode <= 0xef) {
      // Sequence is a 3-byte utf-8 character.
      const secondByte = parseInt(
        String.fromCharCode(searchBuffer[pos + 4]) +
        String.fromCharCode(searchBuffer[pos + 5]),
        16
      )
      const thirdByte = parseInt(
        String.fromCharCode(searchBuffer[pos + 7]) +
        String.fromCharCode(searchBuffer[pos + 8]),
        16
      )
      buf.push(hexCode)
      buf.push(secondByte)
      buf.push(thirdByte)
      pos += 9
      continue
    }

    if (hexCode >= 0xf0 && hexCode <= 0xf7) {
      // Sequence is a 4-byte utf-8 character.
      const secondByte = parseInt(
        String.fromCharCode(searchBuffer[pos + 4]) +
        String.fromCharCode(searchBuffer[pos + 5]),
        16
      )
      const thirdByte = parseInt(
        String.fromCharCode(searchBuffer[pos + 7]) +
        String.fromCharCode(searchBuffer[pos + 8]),
        16
      )
      const fourthByte = parseInt(
        String.fromCharCode(searchBuffer[pos + 10]) +
        String.fromCharCode(searchBuffer[pos + 11]),
        16
      )
      buf.push(hexCode)
      buf.push(secondByte)
      buf.push(thirdByte)
      buf.push(fourthByte)
      pos += 12
      continue
    }

    // The escaped character should be a single hex value.
    buf.push(hexCode)
    pos += 3
  }

  return {
    endPos: pos,
    parsed: Buffer.from(buf)
  }
}
