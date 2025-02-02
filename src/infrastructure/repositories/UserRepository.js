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
        .from('Users')
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
        .into('Users')
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
      .from('Users')
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
      { id: user.userId, username: user.username, email: user.email },
      config.server.jwtSecret
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
  
  async deductPoints(userId, points) {
    try {
      const query = this.#knex('Users')
          .where('userId', '=', userId)
          .decrement('points', points)
          .toSQL()
          .toNative();

      await this.#pool.query(query.sql, query.bindings);
    } catch (err) {
        throw err;
    }
  }
  async getUserById(userId) {
    try {
      const getUserInfoQuery = this.#knex
      .queryBuilder()
      .select('username', 'email', 'userId', 'avatar')
      .from('Users')
      .where('userId', '=', userId)
      .first()
      .toSQL()
      .toNative();

    const userPlanQuery = this.#knex('Plans')
      .select(
        '*',
        this.#knex.raw(`
          (
            SELECT json_agg(tasks)
            FROM "Tasks" tasks
            WHERE tasks."planId" = "Plans"."planId"
            AND tasks."date" = CURRENT_DATE
            AND "Plans"."isActive" = true
          ) as "todayTasks"
        `)
      )
      .where('Plans.userId', '=', userId)
      .where('Plans.isActive', '=', true)
      .first()
      .toSQL()
      .toNative();

    const userOriginalPlanQuery = this.#knex('OriginalPlans')
      .select(
        '*'
      )
      .where('userId', '=', userId)
      .orderBy('likesCount', 'desc')
      .toSQL()
      .toNative();

    const [user] = (await this.#pool.query(getUserInfoQuery.sql, getUserInfoQuery.bindings)).rows;
    const [userPlan] = (await this.#pool.query(userPlanQuery.sql, userPlanQuery.bindings)).rows;
    const userOriginalPlans = (await this.#pool.query(userOriginalPlanQuery.sql, userOriginalPlanQuery.bindings)).rows;

    if (userPlan && !userPlan?.todayTasks) {
      userPlan.todayTasks = [];
    }

    return {
      user,
      userPlan,
      userOriginalPlans,
    }
    } catch (err) {
      console.log(err)
    }
  }

  async getUserBaseInfoById(userId) {
    try {
      const getUserInfoQuery = this.#knex
      .queryBuilder()
      .select('username', 'email', 'userId', 'avatar')
      .from('Users')
      .where('userId', '=', userId)
      .first()
      .toSQL()
      .toNative();

    const [user] = (await this.#pool.query(getUserInfoQuery.sql, getUserInfoQuery.bindings)).rows;

    return {
      user
    }
    } catch (err) {
      console.log(err)
    }
  }

  async deleteUser(userId) {
    try {
      const deleteUserQuery = this.#knex
        .queryBuilder()
        .delete()
        .from('Users')
        .where('userId', '=', userId)
        .toSQL()
        .toNative();

      await this.#pool.query(deleteUserQuery.sql, deleteUserQuery.bindings);
    } catch (err) {
      console.log(err)
    }
  }

  async updateUser(userId, updatedData) {
    try {
      const updateUserQuery = this.#knex
        .queryBuilder()
        .update(updatedData)
        .from('Users')
        .where('userId', '=', userId)
        .toSQL()
        .toNative();
  
      const result = await this.#pool.query(updateUserQuery.sql, updateUserQuery.bindings);
      return result;
    } catch (err) {
      console.error('Ошибка при обновлении пользователя:', err);
      throw err;
    }
  }

  async saveFeedback(userId, feedbackText) {
    try {
      const insertFeedbackQuery = this.#knex
        .queryBuilder()
        .insert({
          userId,
          feedbackText
          // Поле created_at можно не указывать, если в БД стоит DEFAULT NOW()
        })
        .into('Feedback')
        .toSQL()
        .toNative();
  
      const result = await this.#pool.query(insertFeedbackQuery.sql, insertFeedbackQuery.bindings);
      return result;
    } catch (err) {
      console.error('Ошибка при сохранении обратной связи:', err);
      throw err;
    }
  }
  
  async checkUsernameExists(userId, newUsername) {
    try {
      const existingUserQuery = this.#knex('Users')
        .select('userId')
        .where('username', newUsername)
        .andWhere('userId', '!=', userId)
        .first()
        .toSQL()
        .toNative();

      const existingUser = await this.#pool.query(existingUserQuery.sql, existingUserQuery.bindings);
  
      return Boolean(existingUser.rows.length);
    } catch (err) {
      console.error('Ошибка при проверке существования никнейма:', err);
      throw err;
    }
  }
  
}
