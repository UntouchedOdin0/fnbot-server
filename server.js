import * as fs from 'fs'

import * as API from './structures/API.js'
import * as AssetDumping from './structures/AssetDumping.js'
import * as BuildDumping from './structures/BuildDumping.js'
import * as ExpressInstance from './structures/ExpressApp.js'
import * as FileManager from './structures/FileManager.js'
import * as WarningManager from './structures/WarningManager.js'

let config

let cachedPaks = []
let isDumping = false
let serversOff = false
let useKeychain = false

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
    config = FileManager.getConfig()
  } else {
    console.log('[FSError] No configuration file has been found.')
    process.exit(1)
  };
} else {
  config = FileManager.getConfig()
};

let minifyLogs = config.minifyLogs || true
if (config.minifyLogs === false) minifyLogs = false

config.routeinit = {
  defaultVersion: 'v1.1',
  routeLocation: './routes/',
  baseUrl: '/api/',
  minifyLogs: minifyLogs
}

const requiredPaths = ['./storage/', './storage/icons/']
if (config.assetdumping && config.assetdumping.mode && config.assetdumping.mode === 'storage') {
  requiredPaths.push('./storage/assets/')
};
requiredPaths.forEach(p => {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p)
  };
})

async function buildDump (firstTime) {
  if (firstTime) console.log('[BuildDumper] Dumping build information')
  const FNDump = BuildDumping.dumpFNBuild(config.builddumping.fnlogs)
  const LauncherDump = BuildDumping.dumpLauncherBuild(config.builddumping.launcherlogs)
  if (FNDump.dumpFailed || LauncherDump.dumpFailed) {
    if (firstTime) {
      console.log('  => Build dump failed. Seems like the log files are corrupted or not readable.\n')
    } else {
      console.log('[BuildDumper] Build updating failed. Seems like the log files are corrupted or not readable.')
    };
    return
  };
  const obj = {
    fortnite: FNDump,
    launcher: LauncherDump
  }
  if (global.build && JSON.stringify(obj) === JSON.stringify(global.build)) return
  global.build = obj
  fs.writeFileSync('./storage/build.json', JSON.stringify(obj))
  let t = '[BuildDumper] Build updated\n  => Launcher Build: ' + obj.launcher.build + '\n  => Fortnite Build: ' + obj.fortnite.build + '\n  => Fortnite netCL: ' + obj.fortnite.netCL
  if (firstTime) t = '  => Build dumped\n     => Launcher Build: ' + obj.launcher.build + '\n     => Fortnite Build: ' + obj.fortnite.build + '\n     => Fortnite netCL: ' + obj.fortnite.netCL
  console.log(t + '\n')
  return obj
};

function msToTime (duration) {
  const milliseconds = parseInt((duration % 1000) / 100)
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  if (minutes === 0) {
    return seconds + '.' + milliseconds + ' seconds'
  };
  return minutes + ' minutes and ' + seconds + ' seconds'
}

async function assetDump (firstDump) {
  isDumping = true
  let aes
  let force = false
  let hasDumped = false
  const startedAt = Date.now()
  let endedAt = Date.now()
  let assets
  if (fs.existsSync('./storage/assets.json')) {
    assets = FileManager.getAssets()
  };
  let paks
  if (global.arguments.aes) {
    aes = global.arguments.aes
    force = true
  };
  if (assets && global.build.fortnite.build === assets.build && !force && !global.arguments.forcedump && !global.arguments.fd) {
    paks = await AssetDumping.getPakList('encrypted_only', aes, config.assetdumping.pakpath, false, useKeychain)
    config.assetdumping.build = global.build.fortnite.build
    if (((!paks.main || !paks.main[0]) && (!paks.encrypted || !paks.encrypted[0])) || !paks.encrypted.filter(pak => !cachedPaks.includes(pak.name))[0]) {
      hasDumped = false
    } else {
      paks.encrypted.filter(pak => !cachedPaks.includes(pak.name)).forEach(pak => cachedPaks.push(pak.name))
      hasDumped = true
      console.log('[AssetDumper] Processing...')
      await AssetDumping.process(paks, 'encrypted_only', config.assetdumping.pakpath, config.assetdumping)
      endedAt = Date.now()
    };
  };
  let totalAssets = 0
  if (assets) totalAssets = assets.skins.length + assets.emotes.length + assets.backpacks.length + assets.pickaxes.length
  if (!assets || global.build.fortnite.build !== assets.build || (aes && force) || totalAssets === 0 || global.arguments.forcedump || global.arguments.fd) {
    paks = await AssetDumping.getPakList('all', aes, config.assetdumping.pakpath, force, useKeychain)
    config.assetdumping.build = global.build.fortnite.build
    if (assets && global.build.fortnite.build !== assets.build) {
      cachedPaks = []
    };
    if ((!paks.main || !paks.main[0]) && (!paks.encrypted || !paks.encrypted[0])) {
      console.log('[AssetDumper] No paks were loaded. If you\'re using an old version of Fortnite, make sure to provide \'--aes=<key>\' as an argument with the right aes encryption key.')
    } else {
      hasDumped = true
      paks.encrypted.filter(pak => !cachedPaks.includes(pak.name)).forEach(pak => cachedPaks.push(pak.name))
      console.log('[AssetDumper] Processing...')
      await AssetDumping.process(paks, 'all', config.assetdumping.pakpath, config.assetdumping)
      endedAt = Date.now()
    };
  };
  try {
    if (hasDumped || firstDump) {
      global.assets = FileManager.reloadAssets()
    };
  } catch (err) {
    console.log('[Error] Couldn\'t load storage/assets.json. You must dump assets at least one time before you can run the script without dumping.')
    return process.exit(1)
  };
  totalAssets = global.assets.skins.length + global.assets.emotes.length + global.assets.backpacks.length + global.assets.pickaxes.length
  try {
    if (hasDumped || firstDump) {
      global.icons = fs.readdirSync('./storage/icons/')
    }
  } catch (err) {
    console.log('[Error] Couldn\'t load icons directory.')
  };
  if (totalAssets === 0) {
    console.log('[Error] assets file is empty.')
    return process.exit(1)
  };
  if (hasDumped) {
    const time = msToTime(endedAt - startedAt)
    console.log('  => Dump succeeded. Took ' + time + '.\n')
  };
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
    skipassetdump = 'argument skipdump was used'
    skipbuilddump = 'argument skipdump was used'
  };
  if (!config.assetdumping || !config.assetdumping.pakpath) {
    skipassetdump = 'no paths provided in the config'
  };
  if (!config.builddumping || !config.builddumping.fnlogs || !config.builddumping.launcherlogs) {
    skipbuilddump = 'no paths provided in the config'
  };
  if (!skipbuilddump) {
    await buildDump(true)
  } else {
    if (typeof skipbuilddump === 'string') {
      console.log('[BuildDumper] Skipping build dump because of: ' + skipbuilddump)
    } else {
      console.log('[BuildDumper] Skipping build dump.')
    };
    try {
      global.build = FileManager.reloadBuild()
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
    if (config.fortnite && config.fortnite.email && config.fortnite.password) {
      console.log('[FortniteAuth] Logging in')
      const res = await API.authorizeFortnite(config.fortnite.email, config.fortnite.password)
      if (res && typeof res === 'string') {
        console.log('  => Fortnite Authorization succeeded.\n')
        useKeychain = true
      };
    };
    await assetDump(true)
  } else {
    if (typeof skipassetdump === 'string') {
      console.log('[AssetDumper] Skipping asset dump because of: ' + skipassetdump)
    } else {
      console.log('[AssetDumper] Skipping asset dump.')
    };
    try {
      global.assets = FileManager.getAssets()
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
  const CommandHandler = ExpressInstance.InitCommandHandler(config.routeinit)
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
    if (!HotfixData || !HotfixData.data || !HotfixData.data[0]) return
    const newAssets = {
      ...global.assets
    }
    const changes = []
    Object.keys(newAssets).filter(key => typeof newAssets[key] === 'object').forEach(k => {
      newAssets[k].filter(asset => asset.keys).forEach(asset => {
        Object.keys(asset.keys).forEach(key => {
          if (HotfixData.data.filter(data => data.Key === asset.keys[key])[0]) {
            const fixdata = HotfixData.data.filter(data => data.Key === asset.keys[key])[0]
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
      console.log('[Hotfix] Hotfix ' + HotfixData.meta.hash + '\n  => Hotfix version: ' + HotfixData.meta.uploaded + '\n  => Updates: ' + changes.length + '\n  => Updated items: ' + changes.map(change => change.id).sort().join(', ') + '\n')
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
  console.log(('[Interval] Checking for updates every ' + formatTime(interval) + '.\n\n').replace('1 minutes', 'minute'))
  console.log('=== Server is now ready. Time: ' + new Date() + ' ===\n\n')
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
