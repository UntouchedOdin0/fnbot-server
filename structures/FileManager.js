let build = require('../storage/build.json')
let assets = require('../storage/assets.json')

export function getBuild () {
  return build
};

export function getAssets () {
  return assets
};

export function reloadBuild () {
  build = undefined
  delete require.cache['../storage/build.json']
  build = require('../storage/build.json')
  return build
};

export function reloadAssets () {
  assets = undefined
  delete require.cache['../storage/assets.json']
  assets = require('../storage/assets.json')
  return assets
};
