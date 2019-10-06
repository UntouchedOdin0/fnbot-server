import * as ENDPOINTS from '../resources/Endpoints.js'
import fetch from 'node-fetch'

import ReadConfig from './API/readHotfix.js'

const cache = {
  access_token: undefined,
  expiresAt: undefined
}
const build = global.build || {
  fortnite: {
    UserAgent:
      'Fortnite/++Fortnite+Release-10.40-CL-8970213 Windows/10.0.17134.1.768.64bit'
  }
}

async function refreshClientToken () {
  if (cache.access_token && new Date(cache.expiresAt) > new Date()) {
    return cache.access_token
  }
  const login = await fetch(ENDPOINTS.FORTNITE.OAUTH, {
    method: 'POST',
    body: 'grant_type=client_credentials&token_type=eg1',
    headers: {
      'User-Agent': build.fortnite.UserAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'basic MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE='
    }
  }).then(res => res.json())
  cache.access_token = login.token_type + ' ' + login.access_token
  cache.expiresAt = login.expires_at
  return login.token_type + ' ' + login.access_token
}

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
        if (
          !res ||
          !res[0] ||
          !res[0].serviceInstanceId ||
          res[0].serviceInstanceId !== 'fortnite'
        ) {
          return resolve({
            online: false
          })
        }
        if (res[0].banned) {
          return resolve({
            online: false,
            banned: true
          })
        }
        if (res[0].status === 'UP') {
          return resolve({
            online: true
          })
        }
        return resolve({
          online: false
        })
      })
  })
}

export async function getEncryptionKeys (aes) {
  return new Promise((resolve, reject) => {
    fetch(ENDPOINTS.BENBOT.AES)
      .catch(err => {
        // console.error(err)
        if (aes) {
          console.log('[Warning] Could not fetch AES encryption keys from ' + ENDPOINTS.BENBOT.AES + ". Using the key you've provided in your config.")
          return resolve({ mainKey: aes })
        }
        var msg = err.message
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
          msg = 'benbot API seems to be offline. Got an ' + err.code + ' error.'
        }
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
}

export async function getHotfix () {
  const token = await refreshClientToken()
  const cloudstorage = await fetch(ENDPOINTS.FORTNITE.CLOUDSTORAGE, { headers: { 'User-Agent': build.fortnite.UserAgent, Authorization: token } }).then(res => res.json())
  if (!cloudstorage || !cloudstorage[0]) return []
  if (!cloudstorage.filter(file => file.filename.toLowerCase() === 'defaultgame.ini')[0]) { return [] }
  const hotfixUri = ENDPOINTS.FORTNITE.CLOUDSTORAGE + '/' + cloudstorage.filter(file => file.filename.toLowerCase() === 'defaultgame.ini')[0].uniqueFilename
  const hotfix = await fetch(hotfixUri, { headers: { 'User-Agent': build.fortnite.UserAgent, Authorization: token } }).then(res => res.text())
  if (!hotfix) { return [] }
  return hotfix.split('\n').filter(v => v.startsWith('+TextReplacements')).map(v => v.slice(18)).map(v => ReadConfig({ str: v }))
}
