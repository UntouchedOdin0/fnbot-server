import * as fs from 'fs'
import { PakExtractor } from 'node-wick'
import * as API from './API.js'
import * as Dumper from './AssetDumping/Dumper.js'
import * as Helper from './AssetDumping/Helper.js'

export async function getPakList (type, aes, pakpath, forceAes) {
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
  if (!keys || !keys.mainKey) {
    if (keys.type && keys.type === 'auto_timeout') {
      return res
    }
    if (keys && keys.code && keys.msg) {
      keys = 'Error code ' + keys.code + ': ' + keys.msg
    } else {
      keys = ''
    };
    console.log('[API:Warning] (' + new Date() + ') Requesting AES keys (type ' + type + ') failed. ' + keys)
    return res
  };
  // Returns all paks, needed if you don't have an existing assets.json.
  const files = fs.readdirSync(pakpath)
  var filterFunction = file => file.endsWith('.pak')
  if (type === 'encrypted_only') filterFunction = file => file.endsWith('.pak') && keys.additionalKeys && keys.additionalKeys[file]
  files.filter(filterFunction).sort().map(async file => {
    try {
      var key = (keys.mainKey).replace('0x', '')
      if (keys.additionalKeys && keys.additionalKeys[file]) {
        key = (keys.additionalKeys[file]).replace('0x', '')
      };
      const ex = new PakExtractor(pakpath + file, (key).replace('0x', ''))
      const cosmetics = ex.get_file_list().map((file, idx) => ({
        path: file.replace('FortniteGame/Content/', ''),
        index: idx,
        extractor: ex
      }))
      const filtered = Helper.filterPaths(cosmetics)
      if (filtered.length > 0) {
        if (keys.additionalKeys && keys.additionalKeys[file]) {
          res.encrypted.push({
            type: 'encrypted',
            name: file,
            key: keys.additionalKeys[file]
          })
        } else {
          res.main.push({
            type: 'main',
            name: file,
            key: keys.mainKey
          })
        };
      };
    } catch (err) {
      return
    };
  })
  return res
};
export async function process (paks, type, path, options) {
  await Dumper.process(paks, type, path, options)
};
