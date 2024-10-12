import Knex from 'knex';

export class TaskRepository {
  #knex = Knex({ client: 'pg' });
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  // Получение списка планов с возможной фильтрацией и сортировкой
  async getTasks(filter = {}, sort = {}) {
    try {
      const query = this.#knex('Tasks').select('*');

      if (filter.category) {
        query.where('category', '=', filter.category);
      }

      if (filter.userId) {
        query.where('userId', '=', filter.userId);
      }

      if (sort.by && sort.order) {
        query.orderBy(sort.by, sort.order);
      }

      const sqlQuery = query.toSQL().toNative();
      const tasks = (await this.#pool.query(sqlQuery.sql, sqlQuery.bindings)).rows;
      return tasks;
    } catch (err) {
      throw err;
    }
  }

  // Получение плана по ID
  async getTaskById(taskId) {
    try {
      const query = this.#knex('Tasks')
        .select('*')
        .where('taskId', '=', taskId)
        .first()
        .toSQL()
        .toNative();

      const [task] = (await this.#pool.query(query.sql, query.bindings)).rows;
      return task || null;
    } catch (err) {
      throw err;
    }
  }

  // Создание нового плана
  async createTask(taskData) {
    try {
      const query = this.#knex('Tasks').insert(taskData).returning('*').toSQL().toNative();

      const newTask = (await this.#pool.query(query.sql, query.bindings)).rows;
      return newTask[0];
    } catch (err) {
      throw err;
    }
  }

  // Обновление существующего плана по ID
  async updateTask(taskId, updatedData) {
    try {
      const query = this.#knex('Tasks')
        .update(updatedData)
        .where('taskId', '=', taskId)
        .returning('*')
        .toSQL()
        .toNative();

      const updatedTask = (await this.#pool.query(query.sql, query.bindings)).rows;
      return updatedTask[0];
    } catch (err) {
      throw err;
    }
  }

  // Удаление плана по ID
  async deleteTask(taskId) {
    try {
      const query = this.#knex('Tasks').delete().where('taskId', '=', taskId).toSQL().toNative();

      await this.#pool.query(query.sql, query.bindings);
    } catch (err) {
      throw err;
    }
  }

  // Получение списка планов по ID пользователя
  async getTasksByUserId(userId) {
    try {
      const query = this.#knex('Tasks').select('*').where('userId', '=', userId).toSQL().toNative();

      const tasks = (await this.#pool.query(query.sql, query.bindings)).rows;
      return tasks;
    } catch (err) {
      throw err;
    }
  }
}