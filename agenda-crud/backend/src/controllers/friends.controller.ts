import { Request, Response } from 'express';
import * as model from '../models/friend.model';
import { friendSchema } from '../validators/friend.schema';

export const listFriends = async (req: Request, res: Response) => {
  const friends = await model.getAll();
  res.json(friends);
};

export const getFriend = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const friend = await model.getById(id);
  if (!friend) return res.status(404).json({ message: 'Not found' });
  res.json(friend);
};

export const createFriend = async (req: Request, res: Response) => {
  const { error, value } = friendSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const created = await model.create(value);
  res.status(201).json(created);
};

export const updateFriend = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { error, value } = friendSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });
  const exists = await model.getById(id);
  if (!exists) return res.status(404).json({ message: 'Not found' });
  const updated = await model.update(id, value);
  res.json(updated);
};

export const deleteFriend = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const exists = await model.getById(id);
  if (!exists) return res.status(404).json({ message: 'Not found' });
  await model.remove(id);
  res.status(204).send();
};
