import React, { useState, useEffect } from 'react'
import { Friend } from '../types'

type Props = {
  initial?: Friend
  onSave: (f: Friend) => void
  onCancel?: () => void
}

export default function FriendForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<Friend>(
    initial || { name: '', email: '', phone: '', notes: '' }
  )

  useEffect(() => setForm(initial || { name: '', email: '', phone: '', notes: '' }), [initial])

  const handle = (k: keyof Friend, v: any) => setForm({ ...form, [k]: v })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(form)
      }}
      style={{ marginBottom: 12 }}
    >
      <div>
        <label>Nombre</label>
        <br />
        <input value={form.name} onChange={(e) => handle('name', e.target.value)} required />
      </div>
      <div>
        <label>Email</label>
        <br />
        <input value={form.email} onChange={(e) => handle('email', e.target.value)} required />
      </div>
      <div>
        <label>Telefono</label>
        <br />
        <input value={form.phone || ''} onChange={(e) => handle('phone', e.target.value)} />
      </div>
      <div>
        <label>Notas</label>
        <br />
        <textarea value={form.notes || ''} onChange={(e) => handle('notes', e.target.value)} />
      </div>
      <button type="submit">Guardar</button>
      {onCancel && (
        <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>
          Cancelar
        </button>
      )}
    </form>
  )
}
