import { Friend } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export const listFriends = async (): Promise<Friend[]> => {
  const res = await fetch(`${API_BASE}/friends`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export const getFriend = async (id: number): Promise<Friend> => {
  const res = await fetch(`${API_BASE}/friends/${id}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export const createFriend = async (payload: Friend) => {
  const res = await fetch(`${API_BASE}/friends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create')
  return res.json()
}

export const updateFriend = async (id: number, payload: Friend) => {
  const res = await fetch(`${API_BASE}/friends/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update')
  return res.json()
}

export const deleteFriend = async (id: number) => {
  const res = await fetch(`${API_BASE}/friends/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete')
  return true
}
