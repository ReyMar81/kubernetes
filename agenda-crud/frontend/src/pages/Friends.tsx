import React, { useEffect, useState } from 'react'
import { Friend } from '../types'
import * as api from '../api'
import FriendsTable from '../components/FriendsTable'
import FriendForm from '../components/FriendForm'

export default function Friends() {
  const [items, setItems] = useState<Friend[]>([])
  const [editing, setEditing] = useState<Friend | undefined>()

  const load = async () => {
    const data = await api.listFriends()
    setItems(data)
  }

  useEffect(() => {
    load()
  }, [])

  const onSave = async (f: Friend) => {
    if (f.id) {
      await api.updateFriend(f.id, f)
    } else {
      await api.createFriend(f)
    }
    setEditing(undefined)
    await load()
  }

  const onDelete = async (id?: number) => {
    if (!id) return
    if (!confirm('Delete?')) return
    await api.deleteFriend(id)
    await load()
  }

  const onEdit = (f: Friend) => setEditing(f)

  return (
    <div>
      <h2>Amigos</h2>
      <FriendForm initial={editing} onSave={onSave} onCancel={() => setEditing(undefined)} />
      <FriendsTable items={items} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
