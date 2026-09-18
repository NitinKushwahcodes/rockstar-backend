import jwt from 'jsonwebtoken';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';

export async function createUser(data) {
  const user = await User.create({ displayName: data.displayName });
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_SECRET, { expiresIn: '24h' });

  return {
    user: {
      id: user._id.toString(),
      displayName: user.displayName,
      createdAt: user.createdAt,
    },
    token,
  };
}
