import * as fs from 'fs'
// eslint-disable-next-line camelcase
import { Package, PakExtractor, read_texture_to_file } from 'node-wick'

import * as Helper from './Helper.js'
import * as LocaleDump from './LocaleDump.js'
import * as os from 'os'

var locales = {}
var assets = {}
var oldAssets = {}
var variants = {}

function hasEnoughMem (size = 1.5) {
  const freemem = formatBytes(os.freemem())
  if (!freemem) return false
  if (freemem.element < 3) return false // if the free memory type is lower than GB
  if (freemem.size < size) return false
  return true
}

function formatBytes (bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return { size: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)), type: sizes[i], element: i }
}

function getTranslations (asset, type, key, locales) {
  if (!asset) return undefined
  if (!type || !key || !locales) return asset
  if (!asset[type]) asset[type] = {}
  if (typeof asset[type] === 'string') {
    asset[type] = {
      en: asset[type]
    }
  };
  Object.keys(locales).sort().forEach(loc => {
    let name = locales[loc][key] || locales.en[key]
    if (!name) return asset
    if (name.split(' ')[name.split(' ').length - 1] === '') {
      name = name.split(' ').slice(0, name.split(' ').length - 1).join(' ')
    };
    if (name) asset[type][loc] = name
  })
  return asset
};

export async function process (paks, type, path, options) {
  if (!paks || !type || !path) return undefined
  if (!options) options = {}
  var extractors = []
  if (type !== 'all') {
    const exists = fs.existsSync('./storage/assets.json')
    if (exists) oldAssets = require('../../storage/assets.json')
  };
  if (paks.main && paks.main.filter(pak => pak.name === 'pakchunk0-WindowsClient.pak')[0]) {
    var pak = paks.main.filter(pak => pak.name === 'pakchunk0-WindowsClient.pak')[0]
    locales = await LocaleDump.default({
      path: path + pak.name,
      key: (pak.key).replace('0x', '')
    }, options.locales)
  };
  paks.main.forEach(pak => extractors.push(new PakExtractor(path + pak.name, (pak.key).replace('0x', ''))))
  paks.encrypted.forEach(pak => extractors.push(new PakExtractor(path + pak.name, (pak.key).replace('0x', ''))))
  var cosmetics = []
  extractors.forEach(extractor => {
    cosmetics = cosmetics.concat(extractor.get_file_list().map((file, idx) => ({
      path: file.replace('FortniteGame/Content/', ''),
      index: idx,
      extractor: extractor
    })))
  })
  var assetFiles = {}
  var Items = Helper.filterPaths(cosmetics)
  var mode = 'memory'
  if (options.mode && options.mode === 'storage') mode = 'storage'
  var modeTypes = { storage: 'Dumping', memory: 'Caching' }
  if (mode === 'memory') {
    var enoughmemory = hasEnoughMem(1.5)
    if (!enoughmemory) {
      mode = 'storage'
      console.log('[Warning] You must have at least 1.5 GB of free memory left to cache assets. The script will now instead perform a storage dump.')
    }
  };
  console.log('[AssetDumper] ' + modeTypes[mode] + ' ' + Items.length + ' assets (' + type + ').')
  for (let i = 0; i < Items.length; i++) {
    const filepath = Items[i]
    const file = filepath.extractor.get_file(filepath.index)
    const filename = filepath.path.split('/').pop().toLowerCase()
    if (mode === 'memory') {
      if (filename.slice(-4) === 'uexp') {
        if (!assetFiles[filename.slice(0, -5)]) { assetFiles[filename.slice(0, -5)] = {} }
        assetFiles[filename.slice(0, -5)].uexp = file
      };
      if (filename.slice(-5) === 'ubulk') {
        if (!assetFiles[filename.slice(0, -6)]) { assetFiles[filename.slice(0, -5)] = {} }
        assetFiles[filename.slice(0, -6)].ubulk = file
      };
      if (filename.slice(-6) === 'uasset') {
        if (!assetFiles[filename.slice(0, -7)]) { assetFiles[filename.slice(0, -7)] = {} }
        assetFiles[filename.slice(0, -7)].uasset = file
      };
      continue
    };
    if (mode === 'storage') {
      var fp = './storage/assets/' + filename
      if (filename.slice(-6) === 'uasset') {
        assetFiles[filename.slice(0, -7)] = { path: filename }
      };
      if (fs.existsSync(fp)) { continue }
      if (file != null) fs.writeFileSync(fp, file)
      continue
    };
  };
  console.log('[AssetDumper] Reading data...')
  var datafields = { textures: 0, items: 0, variants: 0 }
  Object.keys(assetFiles).forEach(key => {
    const filename = key
    var file = assetFiles[key]
    delete assetFiles[key]
    if (!file.path && (!file.uasset || !file.uexp)) return
    let asset = false
    try {
      if (file.ubulk) {
        asset = new Package(file.uasset, file.uexp, file.ubulk)
      } else {
        if (file.path) {
          if (file.path.endsWith('.uexp') || file.path.endsWith('.ubulk')) return
          asset = new Package('./storage/assets/' + file.path.slice(0, -7))
        } else {
          asset = new Package(file.uasset, file.uexp)
        }
      };
    } catch (err) {
      console.log('Couldn\'t read ' + filename + ': ')
      console.error(err)
      return
    };
    const data = asset.get_data()
    if (!data[0]) return
    if (data[0].export_type === 'Texture2D' && options.dumpIcons) {
      const tPath = './storage/icons/' + filename + '.png'
      if (!fs.existsSync(tPath)) {
        read_texture_to_file('./storage/assets/' + filename, tPath)
      };
      datafields.textures++
      return
    };
    if (data[0].ItemVariants && data[0].ItemVariants[0] && data[1]) {
      datafields.variants++
      data.slice(1).forEach(d => {
        const ProcessedVariants = Helper.processVariants(d, filename, variants)
        variants = ProcessedVariants
      })
      return
    };
    if (!assets[data[0].export_type]) assets[data[0].export_type] = {}
    const assetdata = Helper.AddAsset(data[0])
    if (assetdata) assets[data[0].export_type][filename] = assetdata
    datafields.items++
  })
  if (mode === 'storage') {
    fs.readdir('./storage/assets/', (err, files) => {
      if (err) throw err
      for (const file of files) {
        fs.unlink(require('path').join('./storage/assets/', file), err => {
          if (err) throw err
        })
      };
    })
  };
  console.log('[AssetDumper] Loaded ' + Object.keys(datafields).map(key => datafields[key] + ' ' + key).sort().join(', ') + '.')
  const SortedVariants = {}
  Object.keys(variants).sort().forEach(key => {
    if (variants[key].filter(v => v.tags)[0]) {
      variants[key].forEach(v => {
        v.tags.forEach(tag => {
          if (tag.keys) {
            Object.keys(tag.keys).forEach(k => {
              tag = getTranslations(tag, k, tag.keys[k], locales)
            })
          };
          tag.keys = undefined
        })
      })
    };
    SortedVariants[key] = variants[key]
  })
  variants = SortedVariants
  const finalItems = Helper.ProcessItems(assets)
  for (let i = 0; i < finalItems.length; i++) {
    let item = finalItems[i]
    if (item.keys) {
      Object.keys(item.keys).forEach(key => {
        item = getTranslations(item, key, item.keys[key], locales)
      })
    };
  };
  var types = {
    cid: 'skin',
    eid: 'emote',
    bid: 'backpack',
    pic: 'pickaxe'
  }
  finalItems.forEach(item => {
    if (item.set) {
      item.setParts = finalItems.filter(i => i.set && i.set === item.set && i.id !== item.id).map(i => {
        return i.id + ':' + types[i.id.slice(0, 3)]
      })
    }
    if (item.id && variants[item.id.toLowerCase()]) {
      item.variants = variants[item.id.toLowerCase()]
    };
  })
  const data = {
    backpacks: finalItems.filter(a => a.id && a.id.startsWith('bid')).sort(),
    emotes: finalItems.filter(a => a.id && a.id.startsWith('eid')).sort(),
    pickaxes: finalItems.filter(a => a.definition && a.definition.startsWith('wid')).sort(),
    skins: finalItems.filter(a => a.id && a.id.startsWith('cid')).sort(),
    build: options.build
  }

  function compare (a, b) {
    if (a.id < b.id) { return -1 };
    if (a.id > b.id) { return 1 };
    return 0
  };
  Object.keys(data).filter(key => typeof data[key] === 'object').forEach(key => {
    if (oldAssets && type !== 'all') {
      oldAssets[key].forEach(asset => {
        if (data[key].filter(a => a.id === asset.id)[0]) return
        data[key].push(asset)
      })
    }
    data[key] = data[key].sort(compare)
  })
  fs.writeFileSync('./storage/assets.json', JSON.stringify(data))
  return data
};
