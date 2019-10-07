function calculateAssets (assets) {
  const obj = {}
  Object.keys(assets).filter(key => key !== 'build').forEach(a => {
    obj[a] = assets[a].length
  })
  return obj
};

export const routes = [{
  name: '/status',
  run (req, res) {
    const tmpobj = {
      fortniteOptions: global.build.fortnite,
      launcherOptions: global.build.launcher
    }
    res.status(200).json({
      state: 'online',
      latestVersion: global.defaultVersion,
      fortniteVersion: tmpobj.fortniteOptions.UserAgent.split('Release-')[1].split('-')[0],
      assetsLoaded: calculateAssets(global.assets)
    })
  },
  description: 'Returns the current server status.'
},
{
  name: '/build',
  run (req, res) {
    const tmpobj = {
      fortniteOptions: global.build.fortnite,
      launcherOptions: global.build.launcher
    }
    res.status(200).json(tmpobj)
  },
  description: 'Returns netCL and buildID.'
},
{
  name: '/',
  run (req, res) {
    res.status(200).send('Server is up and running. You can provide this url as the server url in the config.json.')
  }
}
]
