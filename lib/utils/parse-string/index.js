'use strict'

const readAttributePair = require('./read-attribute-pair')

/**
 * @typedef {object} ParsedPojoRdn
 * @property {string} name Either the name of an RDN attribute, or the
 * equivalent numeric OID.
 * @property {string | import('@ldapjs/asn1').BerReader} value The attribute
 * value as a plain string, or a `BerReader` if the string value was an encoded
 * hex string.
 */

/**
 * Parse a string into a set of plain JavaScript object representations of
 * RDNs.
 *
 * @example A plain string with multiple RDNs and multiple attribute assertions.
 * const input = 'cn=foo+sn=bar,dc=example,dc=com
 * const result = parseString(input)
 * // [
 * //   { cn: 'foo', sn: 'bar' },
 * //   { dc: 'example' }
 * //   { dc: 'com' }
 * // ]
 *
 * @param {string} input The RDN string to parse.
 *
 * @returns {ParsedPojoRdn[]}
 *
 * @throws When there is some problem parsing the RDN string.
 */
module.exports = function parseString (input) {
  if (typeof input !== 'string') {
    throw Error('input must be a string')
  }
  if (input.length === 0) {
    // Short circuit because the input is an empty DN (i.e. "root DSE").
    return []
  }

  const searchBuffer = Buffer.from(input, 'utf8')
  const length = searchBuffer.byteLength
  const rdns = []

  let pos = 0
  let rdn = {}

  readRdnLoop:
  while (pos <= length) {
    if (pos === length) {
      const char = searchBuffer[pos - 1]

      /* istanbul ignore else */
      if (char === 0x2b || char === 0x2c || char === 0x3b) {
        throw Error('rdn string ends abruptly with character: ' + String.fromCharCode(char))
      }
    }

    // Find the start of significant characters by skipping over any leading
    // whitespace.
    while (pos < length && searchBuffer[pos] === 0x20) {
      pos += 1
    }

    const readAttrPairResult = readAttributePair({ searchBuffer, startPos: pos })
    pos = readAttrPairResult.endPos
    rdn = { ...rdn, ...readAttrPairResult.pair }

    if (pos >= length) {
      // We've reached the end of the string. So push the current RDN and stop.
      rdns.push(rdn)
      break
    }

    // Next, we need to determine if the next set of significant characters
    // denotes another attribute pair for the current RDN, or is the indication
    // of another RDN.
    while (pos < length) {
      const char = searchBuffer[pos]

      // We don't need to skip whitespace before the separator because the
      // attribute pair function has already advanced us past any such
      // whitespace.

      if (char === 0x2b) { // +
        // We need to continue adding attribute pairs to the current RDN.
        pos += 1
        continue readRdnLoop
      }

      /* istanbul ignore else */
      if (char === 0x2c || char === 0x3b) { // , or ;
        // The current RDN has been fully parsed, so push it to the list,
        // reset the collector, and start parsing the next RDN.
        rdns.push(rdn)
        rdn = {}
        pos += 1
        continue readRdnLoop
      }
    }
  }

  return rdns
}
