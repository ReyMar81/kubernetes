export type Friend = {
  id?: number;
  name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

import db from '../db';

export const getAll = async () => {
  const res = await db.query('SELECT * FROM friends ORDER BY id DESC');
  return res.rows;
};

export const getById = async (id: number) => {
  const res = await db.query('SELECT * FROM friends WHERE id = $1', [id]);
  return res.rows[0];
};

export const create = async (friend: Friend) => {
  const res = await db.query(
    `INSERT INTO friends (name, email, phone, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
    [friend.name, friend.email, friend.phone || null, friend.notes || null]
  );
  return res.rows[0];
};

export const update = async (id: number, friend: Friend) => {
  const res = await db.query(
    `UPDATE friends SET name=$1, email=$2, phone=$3, notes=$4, updated_at=now() WHERE id=$5 RETURNING *`,
    [friend.name, friend.email, friend.phone || null, friend.notes || null, id]
  );
  return res.rows[0];
};

export const remove = async (id: number) => {
  await db.query('DELETE FROM friends WHERE id=$1', [id]);
  return true;
};
