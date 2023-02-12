'use strict'

const findNameStart = require('./find-name-start')
const findNameEnd = require('./find-name-end')
const isValidAttributeTypeName = require('./is-valid-attribute-type-name')
const readAttributeValue = require('./read-attribute-value')

/**
 * @typedef {object} AttributePair
 * @property {string | import('@ldapjs/asn1').BerReader} name Property name is
 * actually the property name of the attribute pair. The value will be a string,
 * or, in the case of the value being a hex encoded string, an instance of
 * `BerReader`.
 *
 * @example
 * const input = 'foo=bar'
 * const pair = { foo: 'bar' }
 */

/**
 * @typedef {object} ReadAttributePairResult
 * @property {number} endPos The ending position in the input search buffer that
 * is the end of the read attribute pair.
 * @property {AttributePair} pair The parsed attribute pair.
 */

/**
 * Read an RDN attribute type and attribute value pair from the provided
 * search buffer at the given starting position.
 *
 * @param {Buffer} searchBuffer
 * @param {number} startPos
 *
 * @returns {ReadAttributePairResult}
 *
 * @throws When there is some problem with the input string.
 */
module.exports = function readAttributePair ({ searchBuffer, startPos }) {
  let pos = startPos

  const nameStartPos = findNameStart({
    searchBuffer,
    startPos: pos
  })
  if (nameStartPos < 0) {
    throw Error('invalid attribute name leading character encountered')
  }

  const nameEndPos = findNameEnd({
    searchBuffer,
    startPos: nameStartPos
  })
  if (nameStartPos < 0) {
    throw Error('invalid character in attribute name encountered')
  }

  const attributeName = searchBuffer.subarray(nameStartPos, nameEndPos).toString('utf8')
  if (isValidAttributeTypeName(attributeName) === false) {
    throw Error('invalid attribute type name: ' + attributeName)
  }

  const valueReadResult = readAttributeValue({
    searchBuffer,
    startPos: nameEndPos
  })
  pos = valueReadResult.endPos
  const attributeValue = valueReadResult.value

  return {
    endPos: pos,
    pair: { [attributeName]: attributeValue }
  }
}
