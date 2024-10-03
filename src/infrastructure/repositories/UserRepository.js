import Knex from 'knex';
import bcrypt from 'bcryptjs';
import config from '../../api/config/config.js';
import jwt from 'jsonwebtoken';

export class UserRepository {
  #knex = Knex({ client: 'pg' });
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  async register(username, email, password) {
    try {
      const checkUserExistenseQuery = this.#knex
        .queryBuilder()
        .select('*')
        .from('users')
        .where('email', '=', email)
        .first()
        .toSQL()
        .toNative();

      const isUserExists = (
        await this.#pool.query(checkUserExistenseQuery.sql, checkUserExistenseQuery.bindings)
      ).rows;

      if (isUserExists && isUserExists.length) {
        throw new Error('This user already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUserInsertQuery = this.#knex
        .queryBuilder()
        .insert({
          username,
          email,
          password: hashedPassword,
        })
        .into('users')
        .returning('*')
        .toSQL()
        .toNative();

      const newUser = (await this.#pool.query(newUserInsertQuery.sql, newUserInsertQuery.bindings))
        .rows;

      return newUser[0];
    } catch (err) {
      throw err;
    }
  }

  async login(email, password) {
    const findUserQuery = this.#knex
      .queryBuilder()
      .select('*')
      .from('users')
      .where('email', '=', email)
      .first()
      .toSQL()
      .toNative();

    const [user] = (await this.#pool.query(findUserQuery.sql, findUserQuery.bindings)).rows;

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      config.server.jwtSecret,
      {
        expiresIn: '1h',
      }
    );

    return {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }
}
