import * as fs from 'fs'

let assets
let build
let config

export function getAssets () {
  if (!assets) {
    this.reloadAssets()
  }
  return assets
};

export function getBuild () {
  if (!build) {
    this.reloadBuild()
  }
  return build
};

export function getConfig () {
  if (!config) {
    this.reloadConfig()
  }
  return config
};

export function reloadAssets () {
  assets = JSON.parse(fs.readFileSync(process.cwd() + '/storage/assets.json', { encoding: 'utf8' }))
  return assets
};

export function reloadBuild () {
  build = JSON.parse(fs.readFileSync(process.cwd() + '/storage/build.json', { encoding: 'utf8' }))
  return build
};

export function reloadConfig () {
  config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json', { encoding: 'utf8' }))
  return config
};
