'use strict'

const warning = require('./deprecations')
const RDN = require('./rdn')
const parseString = require('./utils/parse-string')

/**
 * Implements distinguished name strings as described in
 * https://www.rfc-editor.org/rfc/rfc4514 as an object.
 * This is the primary implementation for parsing and generating DN strings.
 *
 * @example
 * const dn = new DN({rdns: [{cn: 'jdoe', givenName: 'John'}] })
 * dn.toString() // 'cn=jdoe+givenName=John'
 */
class DN {
  #rdns = []

  /**
   * @param {object} input
   * @param {RDN[]} [input.rdns=[]] A set of RDN objects that define the DN.
   * Remember that DNs are in reverse domain order. Thus, the target RDN must
   * be the first item and the top-level RDN the last item.
   *
   * @throws When the provided `rdns` array is invalid.
   */
  constructor ({ rdns = [] } = {}) {
    if (Array.isArray(rdns) === false) {
      throw Error('rdns must be an array')
    }

    const hasNonRdn = rdns.some(
      r => RDN.isRdn(r) === false
    )
    if (hasNonRdn === true) {
      throw Error('rdns must be an array of RDN objects')
    }

    Array.prototype.push.apply(
      this.#rdns,
      rdns.map(r => {
        if (Object.prototype.toString.call(r) === '[object LdapRdn]') {
          return r
        }
        return new RDN(r)
      })
    )
  }

  get [Symbol.toStringTag] () {
    return 'LdapDn'
  }

  /**
   * The number of RDNs that make up the DN.
   *
   * @returns {number}
   */
  get length () {
    return this.#rdns.length
  }

  /**
   * Determine if the current instance is the child of another DN instance or
   * DN string.
   *
   * @param {DN|string} dn
   *
   * @returns {boolean}
   */
  childOf (dn) {
    if (typeof dn === 'string') {
      const parsedDn = DN.fromString(dn)
      return parsedDn.parentOf(this)
    }
    return dn.parentOf(this)
  }

  /**
   * Get a new instance that is a replica of the current instance.
   *
   * @returns {DN}
   */
  clone () {
    return new DN({ rdns: this.#rdns })
  }

  /**
   * Determine if the instance is equal to another DN.
   *
   * @param {DN|string} dn
   *
   * @returns {boolean}
   */
  equals (dn) {
    if (typeof dn === 'string') {
      const parsedDn = DN.fromString(dn)
      return parsedDn.equals(this)
    }

    if (this.length !== dn.length) return false

    for (let i = 0; i < this.length; i += 1) {
      if (this.#rdns[i].equals(dn.rdnAt(i)) === false) {
        return false
      }
    }

    return true
  }

  /**
   * @deprecated Use .toString() instead.
   *
   * @returns {string}
   */
  format () {
    warning.emit('LDAP_DN_DEP_002')
    return this.toString()
  }

  /**
   * Determine if the instance has any RDNs defined.
   *
   * @returns {boolean}
   */
  isEmpty () {
    return this.#rdns.length === 0
  }

  /**
   * Get a DN representation of the parent of this instance.
   *
   * @returns {DN|undefined}
   */
  parent () {
    if (this.length === 0) return undefined
    const save = this.shift()
    const dn = new DN({ rdns: this.#rdns })
    this.unshift(save)
    return dn
  }

  /**
   * Determine if the instance is the parent of a given DN instance or DN
   * string.
   *
   * @param {DN|string} dn
   *
   * @returns {boolean}
   */
  parentOf (dn) {
    if (typeof dn === 'string') {
      const parsedDn = DN.fromString(dn)
      return this.parentOf(parsedDn)
    }

    if (this.length >= dn.length) {
      // If we have more RDNs in our set then we must be a descendent at least.
      return false
    }

    const numberOfElementsDifferent = dn.length - this.length
    for (let i = this.length - 1; i >= 0; i -= 1) {
      const myRdn = this.#rdns[i]
      const theirRdn = dn.rdnAt(i + numberOfElementsDifferent)
      if (myRdn.equals(theirRdn) === false) {
        return false
      }
    }

    return true
  }

  /**
   * Removes the last RDN from the list and returns it. This alters the
   * instance.
   *
   * @returns {RDN}
   */
  pop () {
    return this.#rdns.pop()
  }

  /**
   * Adds a new RDN to the end of the list (i.e. the "top most" RDN in the
   * directory path) and returns the new RDN count.
   *
   * @param {RDN} rdn
   *
   * @returns {number}
   *
   * @throws When the input is not a valid RDN.
   */
  push (rdn) {
    if (Object.prototype.toString.call(rdn) !== '[object LdapRdn]') {
      throw Error('rdn must be a RDN instance')
    }
    return this.#rdns.push(rdn)
  }

  /**
   * Return the RDN at the provided index in the list of RDNs associated with
   * this instance.
   *
   * @param {number} index
   *
   * @returns {RDN}
   */
  rdnAt (index) {
    return this.#rdns[index]
  }

  /**
   * Reverse the RDNs list such that the first element becomes the last, and
   * the last becomes the first. This is useful when the RDNs were added in the
   * opposite order of how they should have been.
   *
   * This is an in-place operation. The instance is changed as a result of
   * this operation.
   *
   * @returns {DN} The current instance (i.e. this method is chainable).
   */
  reverse () {
    this.#rdns.reverse()
    return this
  }

  /**
   * @deprecated Formatting options are not supported.
   */
  setFormat () {
    warning.emit('LDAP_DN_DEP_004')
  }

  /**
   * Remove the first RDN from the set of RDNs and return it.
   *
   * @returns {RDN}
   */
  shift () {
    return this.#rdns.shift()
  }

  /**
   * Render the DN instance as a spec compliant DN string.
   *
   * @returns {string}
   */
  toString () {
    let result = ''
    for (const rdn of this.#rdns) {
      const rdnString = rdn.toString()
      result += `,${rdnString}`
    }
    return result.substring(1)
  }

  /**
   * Adds an RDN to the beginning of the RDN list and returns the new length.
   *
   * @param {RDN} rdn
   *
   * @returns {number}
   *
   * @throws When the RDN is invalid.
   */
  unshift (rdn) {
    if (Object.prototype.toString.call(rdn) !== '[object LdapRdn]') {
      throw Error('rdn must be a RDN instance')
    }
    return this.#rdns.unshift(rdn)
  }

  /**
   * Determine if an object is an instance of {@link DN} or is at least
   * a DN-like object. It is safer to perform a `toString` check.
   *
   * @example Valid Instance
   * const dn = new DN()
   * DN.isDn(dn) // true
   *
   * @example DN-like Instance
   * let dn = { rdns: [{name: 'cn', value: 'foo'}] }
   * DN.isDn(dn) // true
   *
   * dn = { rdns: [{cn: 'foo', sn: 'bar'}, {dc: 'example'}, {dc: 'com'}]}
   * DN.isDn(dn) // true
   *
   * @example Preferred Check
   * let dn = new DN()
   * Object.prototype.toString.call(dn) === '[object LdapDn]' // true
   *
   * dn = { rdns: [{name: 'cn', value: 'foo'}] }
   * Object.prototype.toString.call(dn) === '[object LdapDn]' // false
   *
   * @param {object} dn
   * @returns {boolean}
   */
  static isDn (dn) {
    if (Object.prototype.toString.call(dn) === '[object LdapDn]') {
      return true
    }
    if (
      Object.prototype.toString.call(dn) !== '[object Object]' ||
      Array.isArray(dn.rdns) === false
    ) {
      return false
    }
    if (dn.rdns.some(dn => RDN.isRdn(dn) === false) === true) {
      return false
    }

    return true
  }

  /**
   * Parses a DN string and returns a new {@link DN} instance.
   *
   * @example
   * const dn = DN.fromString('cn=foo,dc=example,dc=com')
   * DN.isDn(dn) // true
   *
   * @param {string} dnString
   *
   * @returns {DN}
   *
   * @throws If the string is not parseable.
   */
  static fromString (dnString) {
    const rdns = parseString(dnString)
    return new DN({ rdns })
  }
}

module.exports = DN
