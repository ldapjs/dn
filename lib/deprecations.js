'use strict'

const warning = require('process-warning')()
const clazz = 'LdapjsDnWarning'

warning.create(clazz, 'LDAP_DN_DEP_001', 'attribute options is deprecated and are ignored')
warning.create(clazz, 'LDAP_DN_DEP_002', '.format() is deprecated. Use .toString() instead')
warning.create(clazz, 'LDAP_DN_DEP_003', '.set() is deprecated. Use .setAttribute() instead')
warning.create(clazz, 'LDAP_DN_DEP_004', '.setFormat() is deprecated. Options will be ignored')

module.exports = warning
