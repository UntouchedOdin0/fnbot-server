import * as ENDPOINTS from '../resources/Endpoints.js'
import fetch from 'node-fetch'
import { atob } from 'abab'

import * as Auth from './API/Authorize.js'
import ReadConfig from './API/readHotfix.js'

const cache = {
  fortniteAuth: { access_token: undefined, expires_at: undefined, refresh_token: undefined, refresh_expires_at: undefined },
  launcherAuth: { access_token: undefined, expires_at: undefined },
  cloudstorageVersion: undefined,
  timeout_request: undefined,
  email: undefined,
  password: undefined
}

const build = global.build || {
  fortnite: {
    UserAgent:
      'Fortnite/++Fortnite+Release-10.40-CL-8970213 Windows/10.0.17134.1.768.64bit'
  }
}

async function refreshClientToken () {
  if (cache.launcherAuth && cache.launcherAuth.access_token && cache.launcherAuth.expires_at && new Date(cache.launcherAuth.expires_at) > new Date()) {
    return cache.launcherAuth.access_token
  };
  const login = await fetch(ENDPOINTS.FORTNITE.OAUTH, {
    method: 'POST',
    body: 'grant_type=client_credentials&token_type=eg1',
    headers: { 'User-Agent': build.fortnite.UserAgent, 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'basic MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE=' }
  }).then(res => res.json())
  cache.launcherAuth = { access_token: login.token_type + ' ' + login.access_token, expires_at: login.expires_at }
  return login.token_type + ' ' + login.access_token
};

// Function will be changed to allow refresh token oauth
async function refreshFortniteToken (email, password) {
  if (!password && cache.password) {
    password = cache.password
  } else {
    if (!password) {
      return undefined
    };
    cache.password = password
  };
  if (!email && cache.email) {
    email = cache.email
  } else {
    if (!email) {
      return undefined
    };
    cache.email = email
  };
  const tokenExpired = new Date(cache.fortniteAuth.expires_at || Date.now()) > new Date()
  if (cache.fortniteAuth && cache.fortniteAuth.access_token && cache.fortniteAuth.expires_at && !tokenExpired) {
    return cache.fortniteAuth.access_token
  };
  if (!cache.fortniteAuth.access_token || !cache.fortniteAuth.refresh_token || !cache.fortniteAuth.refresh_expires_at || tokenExpired) {
    const token = await Auth.fortniteFullAuth(email, password)
    if (!token) return undefined
    cache.fortniteAuth = { access_token: token.token_type + ' ' + token.access_token, expires_at: token.expires_at, refresh_token: token.refresh_token, refresh_expires_at: token.refresh_expires_at }
    return token.token_type + ' ' + token.access_token
  };
};

// from https://stackoverflow.com/questions/39460182/decode-base64-to-hexadecimal-string-with-javascript
function base64ToHEX (base64) {
  return atob(base64).split('').map(function (aChar) { return ('0' + aChar.charCodeAt(0).toString(16)).slice(-2) }).join('')
};

export async function getFortniteServerStatus () {
  return new Promise((resolve, reject) => {
    fetch(ENDPOINTS.FORTNITE.LIGHTSWITCH)
      .then(res => res.json())
      .catch(err => {
        return resolve({
          online: false,
          error: err
        })
      })
      .then(res => {
        if (!res || !res[0] || !res[0].serviceInstanceId || res[0].serviceInstanceId !== 'fortnite') {
          return resolve({ online: false })
        }
        if (res[0].banned) {
          return resolve({ online: false, banned: true })
        }
        if (res[0].status === 'UP') {
          return resolve({ online: true })
        }
        return resolve({ online: false })
      })
  })
}

export async function getEncryptionKeys (aes) {
  if (cache.timeout_request) {
    if (new Date(cache.timeout_request) > new Date()) return { type: 'auto_timeout' }
    cache.timeout_request = undefined
  };
  return new Promise((resolve, reject) => {
    fetch(ENDPOINTS.BENBOT.AES)
      .catch(err => {
        // console.error(err)
        if (aes) {
          console.log('[Warning] Could not fetch AES encryption keys from ' + ENDPOINTS.BENBOT.AES + ". Using the key you've provided in your config.")
          return resolve({ mainKey: aes })
        }
        let msg = err.message
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
          msg = 'benbot API seems to be offline. Now blocking requests to it for 30 minutes.'
          cache.timeout_request = new Date().getTime() + 30 * 60 * 1000 // adding 30 minutes to time
        };
        return resolve({ code: err.code, msg })
      })
      .then(res => {
        if (!res) return resolve(null)
        if (res.status !== 200) {
          return resolve({ code: res.status, msg: res.statusText })
        }
        try {
          res = res.json()
          return resolve(res)
        } catch (err) {
          return resolve(null)
        }
      })
  })
};

export async function getHotfix () {
  const token = await refreshClientToken()
  const cloudstorage = await fetch(ENDPOINTS.FORTNITE.CLOUDSTORAGE, { headers: { 'User-Agent': build.fortnite.UserAgent, Authorization: token } }).then(res => res.json())
  if (!cloudstorage || !cloudstorage[0]) { return [] }
  const file = cloudstorage.filter(file => file.filename.toLowerCase() === 'defaultgame.ini')[0]
  if (!file || typeof file !== 'object' || !file.uniqueFilename) { return [] }
  if (cache.cloudstorageVersion && file.uploaded && file.uploaded === cache.cloudstorageVersion) { return [] }
  const hotfixUri = ENDPOINTS.FORTNITE.CLOUDSTORAGE + '/' + file.uniqueFilename
  const hotfix = await fetch(hotfixUri, { headers: { 'User-Agent': build.fortnite.UserAgent, Authorization: token } }).then(res => res.text())
  if (!hotfix) { return [] }
  if (file.uploaded) { cache.cloudstorageVersion = file.uploaded }
  return { meta: file, data: hotfix.split('\n').filter(v => v.startsWith('+TextReplacements')).map(v => v.slice(18)).map(v => ReadConfig({ str: v })) }
};

export async function authorizeFortnite (email, password) {
  return refreshFortniteToken(email, password)
};

export async function getKeychain () {
  const token = await refreshFortniteToken()
  if (!token) return undefined
  return new Promise((resolve, reject) => {
    fetch(ENDPOINTS.FORTNITE.KEYCHAIN, { headers: { Authorization: token, 'User-Agent': build.fortnite.UserAgent } }).then(async res => {
      if (res.status !== 200) return resolve({ error: true, status: res.status, message: res.statusText })
      const json = await res.json()
      if (!json || !json[0]) return resolve({ error: true, message: 'Invalid response' })
      return resolve(json.map(item => { return { guid: item.split(':')[0].toLowerCase(), key: base64ToHEX(item.split(':')[1]), item: item.split(':')[2] || null } }))
    })
  })
};
