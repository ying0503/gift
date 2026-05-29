export async function hashPassword(password) {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt']
  )
  const rawKey = await crypto.subtle.exportKey('raw', key)
  const saltHex = btoa(String.fromCharCode(...salt))
  const keyHex = btoa(String.fromCharCode(...new Uint8Array(rawKey)))
  return `${saltHex}:${keyHex}`
}

export async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = stored.split(':')
  const salt = Uint8Array.from(atob(saltHex), c => c.charCodeAt(0))
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt']
  )
  const rawKey = await crypto.subtle.exportKey('raw', key)
  const computedHex = btoa(String.fromCharCode(...new Uint8Array(rawKey)))
  return computedHex === keyHex
}

export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}
