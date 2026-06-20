export async function hashPassword(password) {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const rawKey = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  const saltB64 = btoa(String.fromCharCode(...salt))
  const keyB64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)))
  return `${saltB64}:${keyB64}`
}

export async function verifyPassword(password, stored) {
  const [saltB64, keyB64] = stored.split(':')
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const rawKey = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  const computedB64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)))
  return computedB64 === keyB64
}

export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}
