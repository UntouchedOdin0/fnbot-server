import * as fs from 'fs'

export function dumpFNBuild (path) {
  if (!path || typeof path !== 'string') {
    return {
      error: 'no_path',
      msg: 'Please provide a valid path to the FortniteGame.log file.'
    }
  }
  try {
    const Data = fs.readFileSync(path, {
      encoding: 'utf8'
    })
    if (!Data || !Data.split('Net CL: ')[1] || !Data.split('Build: ')[1] || !Data.split('Compatible Engine Version: ')[1]) {
      return { dumpFailed: true }
    };
    const prepareObj = {
      buildID: '1:1:' + Data.split('Net CL: ')[1].split('\r\n')[0],
      netCL: Data.split('Net CL: ')[1].split('\r\n')[0],
      build: Data.split('Build: ')[1].split('\r\n')[0],
      engineBuild: Data.split('Compatible Engine Version: ')[1].split('\r\n')[0],
      UserAgent: 'Fortnite/' + Data.split('Build: ')[1].split('\r\n')[0] + ' Windows/10.0.17134.1.768.64bit'
    }
    return prepareObj
  } catch (err) {
    return { dumpFailed: true }
  };
};

export function dumpLauncherBuild (path) {
  if (!path || typeof path !== 'string') {
    return {
      error: 'no_path',
      msg: 'Please provide a valid path to the EpicGamesLauncher.log file.'
    }
  }
  try {
    const Data = fs.readFileSync(path, {
      encoding: 'utf8'
    })
    if (!Data || !Data.split('Build: ')[1] || !Data.split('Engine Version: ')[1] || !Data.split('Net CL: ')[1]) {
      return { dumpFailed: true }
    };
    const prepareObj = {
      build: Data.split('Build: ')[1].split('\r\n')[0],
      engineVersion: Data.split('Engine Version: ')[1].split('\r\n')[0],
      netCL: Data.split('Net CL: ')[1].split('\r\n')[0]
    }
    return prepareObj
  } catch (err) {
    return { dumpFailed: true }
  };
};
