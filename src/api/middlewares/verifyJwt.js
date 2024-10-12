import jwt from 'jsonwebtoken';
import config from '../config/config.js';

// Middleware для проверки JWT
export function authenticate(request, reply, next) {
  try {
    if (request.url === '/login' || request.url === '/register') {
      return next();
    }

    // Получение токена из заголовка Authorization
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      return reply.code(401).send({ message: 'Authorization header missing' });
    }

    // Проверка формата заголовка, токен должен начинаться с 'Bearer '
    const token = authHeader.split(' ')[1];
    if (!token) {
      return reply.code(401).send({ message: 'Token missing or invalid format' });
    }

    // Проверка и валидация токена
    const decoded = jwt.verify(token, config.server.jwtSecret);
    if (!decoded) {
      return reply.code(401).send({ message: 'Invalid token' });
    }

    request.user = decoded;
    return next();
  } catch (err) {
    // Обработка ошибок при проверке токена
    if (err.name === 'TokenExpiredError') {
      return reply.code(401).send({ message: 'Token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      return reply.code(401).send({ message: 'Invalid token' });
    } else {
      return reply.code(500).send({ message: 'Server error' });
    }
  }
}
