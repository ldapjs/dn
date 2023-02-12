'use strict'

const warning = require('./deprecations')
const escapeValue = require('./utils/escape-value')
const isDottedDecimal = require('./utils/is-dotted-decimal')

/**
 * Implements a relative distinguished name as described in
 * https://www.rfc-editor.org/rfc/rfc4514.
 *
 * @example
 * const rdn = new RDN({cn: 'jdoe', givenName: 'John'})
 * rdn.toString() // 'cn=jdoe+givenName=John'
 */
class RDN {
  #attributes = new Map()

  /**
   * @param {object} rdn An object of key-values to use as RDN attribute
   * types and attribute values. Attribute values should be strings.
   */
  constructor (rdn = {}) {
    for (const [key, val] of Object.entries(rdn)) {
      this.setAttribute({ name: key, value: val })
    }
  }

  get [Symbol.toStringTag] () {
    return 'LdapRdn'
  }

  /**
   * The number attributes associated with the RDN.
   *
   * @returns {number}
   */
  get size () {
    return this.#attributes.size
  }

  /**
   * Very naive equality check against another RDN instance. In short, if they
   * do not have the exact same key names with the exact same values, then
   * this check will return `false`.
   *
   * @param {RDN} rdn
   *
   * @returns {boolean}
   *
   * @todo Should implement support for the attribute types listed in https://www.rfc-editor.org/rfc/rfc4514#section-3
   */
  equals (rdn) {
    if (Object.prototype.toString.call(rdn) !== '[object LdapRdn]') {
      return false
    }
    if (this.size !== rdn.size) {
      return false
    }

    for (const key of this.keys()) {
      if (rdn.has(key) === false) return false
      if (this.getValue(key) !== rdn.getValue(key)) return false
    }

    return true
  }

  /**
   * The value associated with the given attribute name.
   *
   * @param {string} name An attribute name associated with the RDN.
   *
   * @returns {*}
   */
  getValue (name) {
    return this.#attributes.get(name)?.value
  }

  /**
   * Determine if the RDN has a specific attribute assigned.
   *
   * @param {string} name The name of the attribute.
   *
   * @returns {boolean}
   */
  has (name) {
    return this.#attributes.has(name)
  }

  /**
   * All attribute names associated with the RDN.
   *
   * @returns {IterableIterator<string>}
   */
  keys () {
    return this.#attributes.keys()
  }

  /**
   * Define an attribute type and value on the RDN.
   *
   * @param {string} name
   * @param {string | import('@ldapjs/asn1').BerReader} value
   * @param {object} options Deprecated. All options will be ignored.
   *
   * @throws If any parameter is invalid.
   */
  setAttribute ({ name, value, options = {} }) {
    if (typeof name !== 'string') {
      throw Error('name must be a string')
    }

    const valType = Object.prototype.toString.call(value)
    if (typeof value !== 'string' && valType !== '[object BerReader]') {
      throw Error('value must be a string or BerReader')
    }
    if (Object.prototype.toString.call(options) !== '[object Object]') {
      throw Error('options must be an object')
    }

    const startsWithAlpha = str => /^[a-zA-Z]/.test(str) === true
    if (startsWithAlpha(name) === false && isDottedDecimal(name) === false) {
      throw Error('attribute name must start with an ASCII alpha character or be a numeric OID')
    }

    const attr = { value, name }
    for (const [key, val] of Object.entries(options)) {
      warning.emit('LDAP_DN_DEP_001')
      if (key === 'value') continue
      attr[key] = val
    }

    this.#attributes.set(name, attr)
  }

  /**
   * Convert the RDN to a string representation. If an attribute value is
   * an instance of `BerReader`, the value will be encoded appropriately.
   *
   * @example Dotted Decimal Type
   * const rdn = new RDN({
   *   cn: '#foo',
   *   '1.3.6.1.4.1.1466.0': '#04024869'
   * })
   * rnd.toString()
   * // => 'cn=\23foo+1.3.6.1.4.1.1466.0=#04024869'
   *
   * @returns {string}
   */
  toString () {
    let result = ''
    const isHexEncodedValue = val => /^#([0-9a-fA-F]{2})+$/.test(val) === true

    for (const entry of this.#attributes.values()) {
      result += entry.name + '='

      if (isHexEncodedValue(entry.value)) {
        result += entry.value
      } else if (Object.prototype.toString.call(entry.value) === '[object BerReader]') {
        let encoded = '#'
        for (const byte of entry.value.buffer) {
          encoded += Number(byte).toString(16).padStart(2, '0')
        }
        result += encoded
      } else {
        result += escapeValue(entry.value)
      }

      result += '+'
    }

    return result.substring(0, result.length - 1)
  }

  /**
   * @returns {string}
   *
   * @deprecated Use {@link toString}.
   */
  format () {
    // If we decide to add back support for this, we should do it as
    // `.toStringWithFormatting(options)`.
    warning.emit('LDAP_DN_DEP_002')
    return this.toString()
  }

  /**
   * @param {string} name
   * @param {string} value
   * @param {object} options
   *
   * @deprecated Use {@link setAttribute}.
   */
  set (name, value, options) {
    warning.emit('LDAP_DN_DEP_003')
    this.setAttribute({ name, value, options })
  }

  /**
   * Determine if an object is an instance of {@link RDN} or is at least
   * a RDN-like object. It is safer to perform a `toString` check.
   *
   * @example Valid Instance
   * const Rdn = new RDN()
   * RDN.isRdn(rdn) // true
   *
   * @example RDN-like Instance
   * const rdn = { name: 'cn', value: 'foo' }
   * RDN.isRdn(rdn) // true
   *
   * @example Preferred Check
   * let rdn = new RDN()
   * Object.prototype.toString.call(rdn) === '[object LdapRdn]' // true
   *
   * dn = { name: 'cn', value: 'foo' }
   * Object.prototype.toString.call(dn) === '[object LdapRdn]' // false
   *
   * @param {object} rdn
   * @returns {boolean}
   */
  static isRdn (rdn) {
    if (Object.prototype.toString.call(rdn) === '[object LdapRdn]') {
      return true
    }

    const isObject = Object.prototype.toString.call(rdn) === '[object Object]'
    if (isObject === false) {
      return false
    }

    if (typeof rdn.name === 'string' && typeof rdn.value === 'string') {
      return true
    }

    for (const value of Object.values(rdn)) {
      if (
        typeof value !== 'string' &&
        Object.prototype.toString.call(value) !== '[object BerReader]'
      ) return false
    }

    return true
  }
}

module.exports = RDN
