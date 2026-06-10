import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/** Assina um JWT com o id e role do utilizador. */
export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/** Verifica e descodifica um JWT (lança se inválido/expirado). */
export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
