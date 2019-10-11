import * as fs from 'fs'
// eslint-disable-next-line camelcase
import { PakExtractor, read_pak_key } from 'node-wick'
import * as API from './API.js'
import * as Dumper from './AssetDumping/Dumper.js'
import * as Helper from './AssetDumping/Helper.js'

export async function getPakList (type, aes, pakpath, forceAes, useKeychain) {
  if (!type) return undefined
  let keys
  const res = {
    main: [],
    encrypted: []
  }
  if (aes && forceAes) {
    // If param forceAes provided, it'll use the aes key instead of requesting keys.
    keys = {
      mainKey: aes.replace('0x', '')
    }
  } else {
    keys = await API.getEncryptionKeys(aes)
  };
  if ((!keys || !keys.mainKey) && !useKeychain) {
    if (keys.type && keys.type === 'auto_timeout') {
      return res
    };
    if (keys && keys.code && keys.msg) {
      keys = 'Error code ' + keys.code + ': ' + keys.msg
    } else {
      keys = ''
    };
    console.log('[API:Warning] (' + new Date() + ') Requesting AES keys (type ' + type + ') failed. ' + keys)
    return res
  };
  const files = fs.readdirSync(pakpath)
  let filterFunction = file => file.endsWith('.pak')
  if (type === 'encrypted_only') {
    filterFunction = file => file.endsWith('.pak') && read_pak_key(pakpath + file) !== '00000000000000000000000000000000'
  };
  if (useKeychain) {
    const keychain = await API.getKeychain()
    if (!keychain || !keychain[0]) {}
    files.filter(filterFunction).sort().forEach(file => {
      try {
        let key = keys.mainKey
        const guid = read_pak_key(pakpath + file)
        if (guid !== '00000000000000000000000000000000') {
          if (!keychain.find(item => item.guid === guid)) {
            return
          } else {
            key = keychain.find(item => item.guid === guid).key
          }
        };
        const extractor = new PakExtractor(pakpath + file, (key).replace('0x', ''))
        const cosmetics = extractor.get_file_list().map((file, idx) => ({ path: file.replace('FortniteGame/Content/', ''), index: idx }))
        const filtered = Helper.filterPaths(cosmetics)
        if (filtered.length > 0) {
          if (guid !== '00000000000000000000000000000000') {
            res.encrypted.push({ type: 'encrypted', name: file, key })
          } else {
            res.main.push({ type: 'main', name: file, key })
          };
        };
      } catch (err) { }
    })
  } else {
    files.filter(filterFunction).sort().forEach(file => {
      try {
        let key = keys.mainKey
        if (keys.additionalKeys && keys.additionalKeys[file]) {
          key = (keys.additionalKeys[file]).replace('0x', '')
        };
        const extractor = new PakExtractor(pakpath + file, (key).replace('0x', ''))
        const cosmetics = extractor.get_file_list().map((file, idx) => ({ path: file.replace('FortniteGame/Content/', ''), index: idx }))
        const filtered = Helper.filterPaths(cosmetics)
        if (filtered.length > 0) {
          if (keys.additionalKeys && keys.additionalKeys[file]) {
            res.encrypted.push({ type: 'encrypted', name: file, key })
          } else {
            res.main.push({ type: 'main', name: file, key })
          };
        };
      } catch (err) { }
    })
  };
  return res
};
export async function process (paks, type, path, options) {
  await Dumper.processDump(paks, type, path, options)
};
