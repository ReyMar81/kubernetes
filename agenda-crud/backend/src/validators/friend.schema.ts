import Joi from 'joi';

export const friendSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow(null, '').max(50),
  notes: Joi.string().allow(null, '').max(2000),
});
