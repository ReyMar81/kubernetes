import React from 'react'
import { Friend } from '../types'

type Props = {
  items: Friend[]
  onEdit: (f: Friend) => void
  onDelete: (id?: number) => void
}

export default function FriendsTable({ items, onEdit, onDelete }: Props) {
  return (
    <table border={1} cellPadding={8} style={{ width: '100%', marginBottom: 12 }}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Telefono</th>
          <th>Notas</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {items.map((f) => (
          <tr key={f.id}>
            <td>{f.id}</td>
            <td>{f.name}</td>
            <td>{f.email}</td>
            <td>{f.phone}</td>
            <td>{f.notes}</td>
            <td>
              <button onClick={() => onEdit(f)}>Editar</button>
              <button onClick={() => onDelete(f.id)} style={{ marginLeft: 8 }}>
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
