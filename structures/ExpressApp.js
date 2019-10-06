import express from 'express'
import * as fs from 'fs'

var app = null
const endpoints = {}

const isDirectory = source => fs.statSync(source).isDirectory()
const isFile = source => fs.statSync(source).isFile()

var baseFunction = function (req, res) {
  return res.status(200).json({ statusCode: 200, code: 'starting', msg: 'Server is currently starting up.' })
}

export function constructor (options) {
  if (!options) {
    options = {
      port: 8080,
      baseUrl: '/api/'
    }
  }
  if (options && typeof options === 'string') {
    options = {
      port: parseInt(options) || 8080
    }
  }
  return new Promise((resolve, reject) => {
    app = express()
    if (options.title) app.locals.title = options.title
    app.use(function (req, res, next) {
      if (req.originalUrl && req.originalUrl.split(options.baseUrl)[1] && req.originalUrl.split(options.baseUrl)[1].split('/')[0].startsWith('v') && req.originalUrl.split(options.baseUrl)[1].split('/')[0].indexOf('.') > -1) {
        req.serverVersion = req.originalUrl.split(options.baseUrl)[1].split('/')[0] + ''
      } else {
        req.serverVersion = ''
      };
      res.set('Request-Version', req.serverVersion)
      req.baseUrl = req.protocol + '://' + req.get('host') + options.baseUrl
      next()
    })
    app.listen(process.env.PORT || options.port, () => {
      app.all('/', function (req, res) {
        return baseFunction(req, res)
      })
      console.log('[ExpressApp] Listening on port ' + options.port + '.')
      return resolve(app)
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('[Error:ExpressApp] Port ' + err.port + ' is already used. You must use a different port or stop applications that use this port.')
        process.exit(1)
      } else {
        console.error(err)
        process.exit(1)
      };
    })
  })
};

export function InitCommandHandler (options) {
  if (!options || typeof options !== 'object') {
    return {
      error: 'missing_config',
      msg: 'Missing required configuration.'
    }
  }
  if (!app) {
    return {
      error: 'app_not_ready',
      msg: 'Please initialize app first.'
    }
  }
  var defaultVersion = options.defaultVersion
  var directories = fs.readdirSync(options.routeLocation).filter(f => isDirectory(options.routeLocation + f))
  if (!directories[0]) {
    return {
      error: 'no_route_dirs',
      msg: 'No route directories have been found.'
    }
  }
  if (!directories.includes(defaultVersion)) {
    return {
      error: 'default_version_invalid',
      msg: 'Could not find defaultVersion in route dirs. '
    }
  }
  console.log('[CommandHandler] Found ' + directories.length + ' route directories.')
  directories.forEach(dir => {
    console.log('[' + dir + ']')
    const files = fs.readdirSync(options.routeLocation + dir).filter(f => isFile(options.routeLocation + dir + '/' + f)).filter(f => f.split('.')[f.split('.').length - 1] === 'js')
    if (!files[0]) return console.log('      => Could not find any valid files.')
    endpoints[dir] = []
    const baseUrl = options.baseUrl || ''
    for (var filename of files) {
      let file
      const nameWithoutExtension = filename.split('.').slice(0, filename.split('.').length - 1).join('.')
      try {
        file = require(process.cwd() + '/' + options.routeLocation + dir + '/' + filename)
      } catch (err) {
        console.log('      <FILE:' + filename + '> - Error: ')
        console.error(err)
        continue
      };
      if (!file.routes) {
        console.log('      <FILE:' + filename + '> - Error: No routes array detected.')
        continue
      };
      if (!file.config || typeof file.config !== 'object') {
        file.config = {
          enabled: true
        }
      }
      if (!file.config.enabled) {
        console.log('      <' + nameWithoutExtension + '> - Information: Skipping file because it is deactivated.')
      };
      console.log(('      <' + nameWithoutExtension + '> Loading ' + file.routes.length + ' endpoints.').replace('1 endpoints', '1 endpoint'))
      for (var endpoint of file.routes) {
        if (!endpoint.name || !endpoint.run) continue
        try {
          if (!endpoint.method) endpoint.method = 'all'
          app[endpoint.method.toLowerCase()](baseUrl + dir + endpoint.name, endpoint.run)
          if (defaultVersion === dir) {
            app[endpoint.method.toLowerCase()](baseUrl + endpoint.name.slice(1), endpoint.run)
          };
          console.log('      <' + nameWithoutExtension + '> => Loaded "' + endpoint.name + '" [' + endpoint.method + ']')
          endpoints[dir].push(endpoint)
        } catch (err) {
          console.log('      (' + endpoint.name + ') - Error: ' + err)
        };
      };
    };
  })
  var count = 0
  Object.keys(endpoints).forEach(e => { count += endpoints[e].length })
  console.log('[CommandHandler] Initialized. Total endpoints: ' + count)
  global.defaultVersion = defaultVersion
  return {
    status: 'OK',
    endpoints
  }
};

export function updateState (state) {
  if (!state || !state.msg) return undefined
  if (!state.statusCode) state.statusCode = 200
  baseFunction = function (req, res) {
    return res.status(state.statusCode).json({ statusCode: state.statusCode, code: state.code, msg: state.msg })
  }
  return 'OK'
};
