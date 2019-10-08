import * as fs from 'fs'

import * as API from './structures/API.js'
import * as AssetDumping from './structures/AssetDumping.js'
import * as BuildDumping from './structures/BuildDumping.js'
import * as ExpressInstance from './structures/ExpressApp.js'
import * as WarningManager from './structures/WarningManager.js'

let config

let cachedPaks = []
let isDumping = false
let serversOff = false

function handleCmdArgs (argv) {
  const args = argv.slice(2)
  const res = {}
  args.forEach(arg => {
    if (arg.toLowerCase().startsWith('--') && arg.toLowerCase().split('=')[1]) {
      res[arg.slice(2).split('=')[0]] = arg.toLowerCase().split('=')[1]
    };
    if (arg.toLowerCase().startsWith('-') && !arg.toLowerCase().startsWith('--')) {
      res[arg.slice(1)] = '---'
    };
  })
  return res
};

global.arguments = handleCmdArgs(process.argv)
global.instanceInfo = {}

if (!fs.existsSync('./config.json')) {
  if (fs.existsSync('./config.example.json')) {
    fs.renameSync('./config.example.json', './config.json')
    config = require('./config.json')
  } else {
    console.log('[FSError] No configuration file has been found.')
    process.exit(1)
  };
} else {
  config = require('./config.json')
};

config.routeinit = {
  defaultVersion: 'v1.1',
  routeLocation: './routes/',
  baseUrl: '/api/'
}

const requiredPaths = ['./storage/', './storage/icons/']
if (config.assetdumping && config.assetdumping.mode && config.assetdumping.mode === 'storage') {
  requiredPaths.push('./storage/assets/')
}
requiredPaths.forEach(p => {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p)
  };
})

async function buildDump (firstTime) {
  if (firstTime) console.log('[BuildDumper] Dumping build information from logs.')
  const FNDump = BuildDumping.dumpFNBuild(config.builddumping.fnlogs)
  const LauncherDump = BuildDumping.dumpLauncherBuild(config.builddumping.launcherlogs)
  const obj = {
    fortnite: FNDump,
    launcher: LauncherDump
  }
  if (global.build && JSON.stringify(obj) === JSON.stringify(global.build)) return
  global.build = obj
  fs.writeFileSync('./storage/build.json', JSON.stringify(obj))
  if (firstTime) {
    console.log('[BuildDumper] Dumped build information, works with ' + obj.fortnite.build + '.')
  } else {
    console.log('[BuildDumper] Updated build information, works with ' + obj.fortnite.build + '.')
  };
};

async function assetDump () {
  isDumping = true
  let aes
  let force = false
  let hasDumped = false
  const assetsExist = fs.existsSync('./storage/assets.json')
  let tempAssetFile
  if (assetsExist) {
    tempAssetFile = require('./storage/assets.json')
  };
  let paks
  if (global.arguments.aes) {
    aes = global.arguments.aes
    force = true
  };
  if (tempAssetFile && global.build.fortnite.build === tempAssetFile.build && !force && !global.arguments.forcedump && !global.arguments.fd) {
    paks = await AssetDumping.getPakList('encrypted_only', aes, config.assetdumping.pakpath, false)
    config.assetdumping.build = global.build.fortnite.build
    if (((!paks.main || !paks.main[0]) && (!paks.encrypted || !paks.encrypted[0])) || !paks.encrypted.filter(pak => !cachedPaks.includes(pak.name))[0]) {
      hasDumped = false
    } else {
      paks.encrypted.filter(pak => !cachedPaks.includes(pak.name)).forEach(pak => cachedPaks.push(pak.name))
      hasDumped = true
      await AssetDumping.process(paks, 'encrypted_only', config.assetdumping.pakpath, config.assetdumping)
    };
  };
  let totalAssets = 0
  if (tempAssetFile) totalAssets = tempAssetFile.skins.length + tempAssetFile.emotes.length + tempAssetFile.backpacks.length + tempAssetFile.pickaxes.length
  if (!tempAssetFile || global.build.fortnite.build !== tempAssetFile.build || (aes && force) || totalAssets === 0 || global.arguments.forcedump || global.arguments.fd) {
    paks = await AssetDumping.getPakList('all', aes, config.assetdumping.pakpath, force)
    config.assetdumping.build = global.build.fortnite.build
    if (tempAssetFile && global.build.fortnite.build !== tempAssetFile.build) {
      cachedPaks = []
    };
    if ((!paks.main || !paks.main[0]) && (!paks.encrypted || !paks.encrypted[0])) {
      console.log('[AssetDumper] No paks were loaded. If you\'re using an old version of Fortnite, make sure to provide \'--aes=<key>\' as an argument with the right aes encryption key.')
    } else {
      hasDumped = true
      paks.encrypted.filter(pak => !cachedPaks.includes(pak.name)).forEach(pak => cachedPaks.push(pak.name))
      await AssetDumping.process(paks, 'all', config.assetdumping.pakpath, config.assetdumping)
    };
  };
  try {
    delete require.cache[require.resolve('./storage/assets.json')]
    global.assets = require('./storage/assets.json')
  } catch (err) {
    console.log('[Error] Couldn\'t load storage/assets.json. You must dump assets at least one time before you can run the script without dumping.')
    return process.exit(1)
  };
  totalAssets = global.assets.skins.length + global.assets.emotes.length + global.assets.backpacks.length + global.assets.pickaxes.length
  try {
    global.icons = fs.readdirSync('./storage/icons/')
  } catch (err) {
    console.log('[Error] Couldn\'t load icons directory.')
  };
  if (totalAssets === 0) {
    console.log('[Error] assets file is empty.')
    return process.exit(1)
  };
  if (hasDumped) console.log('[AssetDumper] Successfully dumped. ' + totalAssets + ' items are now located in storage/assets.json.')
  isDumping = false
  // Removes dump forcing arguments after first dump.
  delete global.arguments.aes
  delete global.arguments.fd
  delete global.arguments.forcedump
};

ExpressInstance.constructor({
  port: config.server.port,
  title: config.server.title,
  baseUrl: config.routeinit.baseUrl
} || null).then(async app => {
  ExpressInstance.updateState({ msg: 'Server is currently starting up and preparing assets.', code: 'preparing' })
  let skipassetdump; let skipbuilddump = false
  if (global.arguments.skipdump || global.arguments.sd || global.arguments.skipdumping) {
    skipassetdump = true
    skipbuilddump = true
  };
  if (!config.assetdumping || !config.assetdumping.pakpath) {
    skipassetdump = true
  };
  if (!config.builddumping || !config.builddumping.fnlogs || !config.builddumping.launcherlogs) {
    skipbuilddump = true
  };
  if (!skipbuilddump) {
    await buildDump(true)
  } else {
    console.log('[BuildDumper] Skipping dump.')
    try {
      global.build = require('./storage/build.json')
    } catch (err) {
      console.log('[Error] Error while loading build.json: ' + err)
      process.exit(1)
    };
  };
  if (!skipassetdump) {
    if (config.assetdumping.pakpath.split('/')[1]) {
      if (config.assetdumping.pakpath.split('/')[config.assetdumping.pakpath.split('/').length - 1] !== '') {
        config.assetdumping.pakpath = config.assetdumping.pakpath + '/'
      };
    };
    if (config.assetdumping.pakpath.split('\\')[1]) {
      if (config.assetdumping.pakpath.split('\\')[config.assetdumping.pakpath.split('\\').length - 1] !== '') {
        config.assetdumping.pakpath = config.assetdumping.pakpath + '\\'
      };
    };
    await assetDump()
  } else {
    console.log('[AssetDumper] Skipping dump.')
    try {
      global.assets = require('./storage/assets.json')
    } catch (err) {
      console.log('[Error] Error while loading assets.json: ' + err)
      process.exit(1)
    };
    try {
      global.icons = fs.readdirSync('./storage/icons/')
    } catch (err) {
      console.log('[Error] Couldn\'t load icons directory.')
    };
  };
  try {
    global.exceptions = require('./storage/exceptions.json')
  } catch (err) {
    global.exceptions = []
  };
  const CommandHandler = await ExpressInstance.InitCommandHandler(config.routeinit)
  if (CommandHandler.error) {
    console.log('[CommandHandler:Error] ' + CommandHandler.error + ' => ' + CommandHandler.msg)
    return process.exit(1)
  };
  ExpressInstance.updateState({ code: 'ready', msg: 'Server is up and running. You can now use it with fnbot-client.' })
  global.instanceInfo.startedAt = new Date()
  async function checkFNStatus () {
    const status = await API.getFortniteServerStatus()
    const warnings = WarningManager.Warnings
    if (status.online && warnings.filter(warn => warn.typeId === 'fortnite.servers.offline')[0]) {
      serversOff = false
      return WarningManager.deleteWarning(warnings.filter(warn => warn.typeId === 'fortnite.servers.offline')[0].id)
    };
    if (!status.online && !warnings.filter(warn => warn.typeId === 'fortnite.servers.offline')[0]) {
      serversOff = true
      return WarningManager.createWarning('fortnite.servers.offline', 'Fortnite servers are offline.', undefined, 'auto')
    };
    return {
      code: 'nothing_changed'
    }
  };
  async function checkWarnFile () {
    const file = await WarningManager.readWarningFile()
    let warnings = WarningManager.Warnings
    if (file) {
      let updateCount = 0
      warnings.forEach(warning => {
        if (!file.filter(f => f.id === warning.id)[0]) {
          if (warning.creation && warning.creation === 'auto') return
          return WarningManager.deleteWarning(warning.id)
        };
      })
      file.forEach(async warning => {
        let warningContent
        if (warnings.filter(w => w.id === warning.id)[0]) {
          if (JSON.stringify(warnings.filter(w => w.id === warning.id)[0]) === JSON.stringify(warning)) return
          warningContent = WarningManager.updateWarning(warning.id, warning)
          warning.id = warningContent.id
          warnings = WarningManager.Warnings
          return WarningManager.writeWarningFile(warnings)
        };
        if (warning.id) return warnings.push(warning)
        warningContent = WarningManager.createWarning(warning.typeId, warning.message, warning.postedBy)
        updateCount++
      })
      if (updateCount > 0) return WarningManager.writeWarningFile(warnings)
    };
    return {
      code: 'nothing_changed'
    }
  };
  async function addHotfix () {
    const HotfixData = await API.getHotfix()
    const newAssets = {
      ...global.assets
    }
    const changes = []
    Object.keys(newAssets).filter(key => typeof newAssets[key] === 'object').forEach(k => {
      newAssets[k].filter(asset => asset.keys).forEach(asset => {
        Object.keys(asset.keys).forEach(key => {
          if (HotfixData.filter(data => data.Key === asset.keys[key])[0]) {
            const fixdata = HotfixData.filter(data => data.Key === asset.keys[key])[0]
            if (!skipassetdump && config.assetdumping.locales) {
              fixdata.LocalizedStrings = fixdata.LocalizedStrings.filter(data => config.assetdumping.locales.includes(data[0]))
            };
            if (!fixdata.LocalizedStrings || !fixdata.LocalizedStrings[0]) return
            fixdata.LocalizedStrings.forEach(data => {
              if (asset[key][data[0]] && asset[key][data[0]] === data[1]) return
              if (!changes.filter(change => change.id === asset.id)[0]) changes.push(asset)
              asset[key][data[0]] = data[1]
            })
          };
        })
      })
    })
    if (changes[0]) {
      console.log('[Hotfix] New hotfix - Updated ' + changes.length + ' items: ' + changes.map(change => change.id).sort().join(', '))
      global.assets = newAssets
      fs.writeFileSync('./storage/assets.json', JSON.stringify(newAssets))
    };
  };
  await addHotfix()
  await checkFNStatus()
  await checkWarnFile()

  function formatTime (ms) {
    if (ms >= 1000 * 60) {
      return ms / 60000 + ' minutes'
    };
    if (ms >= 1000) {
      return ms / 1000 + ' seconds'
    };
    return ms + ' milliseconds'
  };
  let interval = config.warning_interval || config.update_interval
  if (!interval || interval < 10000) {
    console.log('[Interval] Interval must be >=60000 to prevent spam and has now been set to 5 minutes.')
    interval = 300000
  };
  console.log(('[Interval] Checking for updates every ' + formatTime(interval) + '.').replace('1 minutes', 'minute'))
  setInterval(async () => {
    await addHotfix()
    await checkFNStatus()
    await checkWarnFile()
    if (!skipbuilddump) await buildDump()
    if (!skipassetdump) {
      if ((!isDumping || isDumping === false) && !serversOff) await assetDump()
    };
  }, interval || 1000 * 60 * 5)
})
