import fetch from 'node-fetch'
import { FORTNITE, TOKENS } from '../../resources/Endpoints.js'

const fetchCookie = require('fetch-cookie')(fetch)

export async function fortniteFullAuth (email, password) {
  if (!email || !password) {
    return { code: 'no_data' }
  };
  const bodyLogin = 'email=' + email + '&password=' + password + '&rememberMe=false'
  const CSRF = await fetchCookie(FORTNITE.CSRF)
  const XSRF = CSRF.headers.raw()['set-cookie'].find(item => item.startsWith('XSRF-TOKEN=')).split('XSRF-TOKEN=')[1].split(';')[0]
  const LOGIN = await fetchCookie(FORTNITE.LOGIN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-xsrf-token': XSRF }, body: bodyLogin })
  const LOGIN_RES = await LOGIN.text()
  if (LOGIN_RES !== '') {
    return { code: 'error_login', errorRaw: LOGIN_RES }
  };
  const EXCHANGE = await fetchCookie(FORTNITE.EXCHANGE, { headers: { 'x-xsrf-token': XSRF } }).then(res => res.json())
  if (!EXCHANGE || !EXCHANGE.code) {
    return { code: 'error_exchange' }
  };
  const bodyToken = 'grant_type=exchange_code&exchange_code=' + EXCHANGE.code + '&includePerms=true&token_type=eg1'
  const TOKEN = await fetch(FORTNITE.OAUTH, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'basic ' + TOKENS.LAUNCHER }, body: bodyToken }).then(res => res.json())
  if (!TOKEN || TOKEN.error) {
    return { code: 'token_error', msg: TOKEN.error || null }
  };
  return TOKEN
};

export async function launcherAuth () {};
