// Recordatorios push. GET entrega la clave pública; POST (solo la tarea programada) envía los que tocan.
// Se envían SIN contenido, así que no hace falta cifrar nada: el texto lo pone el service worker del dispositivo.
// Las claves viven en Vault: la privada se genera aquí la primera vez y nunca sale de la base.
import postgres from 'npm:postgres@3.4.5'

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 2 })
const SUBJECT = 'https://zzorgh.github.io/mis-finanzas/inicio/'
const HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)$/
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const text = (value: string) => b64url(new TextEncoder().encode(value))

const secret = async (db: postgres.Sql | postgres.TransactionSql, name: string): Promise<string | null> => {
  const rows = await db`select decrypted_secret from vault.decrypted_secrets where name = ${name}`
  return rows.length ? rows[0].decrypted_secret : null
}

const getKeys = async () => {
  const pub = await secret(sql, 'vapid_publica')
  const priv = await secret(sql, 'vapid_privada')
  if (pub && priv) return { pub, priv }
  return await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('recordatorios_vapid'))`
    const p1 = await secret(tx, 'vapid_publica')
    const p2 = await secret(tx, 'vapid_privada')
    if (p1 && p2) return { pub: p1, priv: p2 }
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
    const jwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey))
    const newPub = b64url(raw)
    await tx`select vault.create_secret(${jwk}, 'vapid_privada')`
    await tx`select vault.create_secret(${newPub}, 'vapid_publica')`
    return { pub: newPub, priv: jwk }
  })
}

const vapidJwt = async (audience: string, key: CryptoKey) => {
  const exp = Math.floor(Date.now() / 1000) + 6 * 3600
  const body = text(JSON.stringify({ typ: 'JWT', alg: 'ES256' })) + '.' + text(JSON.stringify({ aud: audience, exp, sub: SUBJECT }))
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(body))
  return body + '.' + b64url(new Uint8Array(sig))
}

const sameText = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const sendAll = async () => {
  const { pub, priv } = await getKeys()
  const key = await crypto.subtle.importKey('jwk', JSON.parse(priv), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const rows = await sql`select endpoint from private.recordatorios_tomar()`
  const jwts = new Map<string, string>()
  const result = { enviados: 0, vencidos: 0, fallidos: 0 }

  const sendOne = async (endpoint: string) => {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:' || !HOSTS.test(url.hostname)) { result.fallidos++; return }
    if (!jwts.has(url.origin)) jwts.set(url.origin, await vapidJwt(url.origin, key))
    const resp = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: { TTL: '14400', Urgency: 'normal', 'Content-Length': '0', Authorization: `vapid t=${jwts.get(url.origin)}, k=${pub}` },
    })
    await resp.body?.cancel()
    if (resp.status === 404 || resp.status === 410) {
      await sql`delete from public.recordatorios where endpoint = ${endpoint}`
      result.vencidos++
    } else if (resp.ok) result.enviados++
    else result.fallidos++
  }

  const queue = rows.map((r) => r.endpoint as string)
  await Promise.all(Array.from({ length: 10 }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      try { await sendOne(next) } catch (_) { result.fallidos++ }
    }
  }))
  return result
}

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...extra } })

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    if (req.method === 'GET') return json({ k: (await getKeys()).pub }, 200, { ...CORS, 'Cache-Control': 'public, max-age=3600' })
    if (req.method !== 'POST') return json({ error: 'method' }, 405)
    const expected = await secret(sql, 'recordatorios_cron')
    if (!expected || !sameText(req.headers.get('x-cron') ?? '', expected)) return json({ error: 'forbidden' }, 403)
    return json(await sendAll())
  } catch (_) {
    return json({ error: 'internal' }, 500)
  }
})
