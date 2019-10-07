import * as WarningManager from '../../structures/WarningManager.js'

const build = {
  fortnite: {
    build: global.build.fortnite.build,
    engineBuild: global.build.fortnite.engineBuild,
    netCL: global.build.fortnite.netCL,
    buildID: global.build.fortnite.buildID,
    UserAgent: global.build.fortnite.UserAgent
  },
  launcher: {
    build: global.build.launcher.build,
    engineVersion: global.build.launcher.engineVersion,
    netCL: global.build.launcher.netCL
  }
}

function calculateAssets (assets) {
  const obj = {
    total: 0
  }
  Object.keys(assets).filter(key => key !== 'build').forEach(a => {
    obj.total += assets[a].length
    obj[a] = assets[a].length
  })
  return obj
};

export const routes = [{
  name: '/status',
  run (req, res) {
    res.status(200).json({
      state: 'online',
      defaultVersion: global.defaultVersion,
      fortniteVersion: {
        splitStr: build.fortnite.build.split('Release-')[1].split('-')[0],
        build: build.fortnite.build
      },
      startedAt: global.instanceInfo.startedAt,
      assetsLoaded: calculateAssets(global.assets)
    })
  },
  description: 'Returns the current server status.'
},
{
  name: '/build',
  run (req, res) {
    res.status(200).json(build)
  },
  description: 'Returns netCL and buildID.'
},
{
  name: '/',
  run (req, res) {
    let tmpstr = ''
    if (req.serverVersion !== '' && !req.serverVersion.includes('/')) {
      tmpstr = req.serverVersion + '/'
    };
    res.status(200).redirect('/api/' + tmpstr + 'status')
  }
},
{
  name: '/warnings',
  run (req, res) {
    return res.status(200).json(WarningManager.Warnings)
  }
}
]
