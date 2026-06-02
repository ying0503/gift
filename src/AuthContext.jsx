import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || ''

export { API }

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.user) setUser(data.user); else localStorage.removeItem('token') })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (email, password) => {
    const res = await fetch(`${API}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (token) {
      await fetch(`${API}/api/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
