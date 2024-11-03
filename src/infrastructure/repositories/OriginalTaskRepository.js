import Knex from 'knex';

export class OriginalTaskRepository {
  #knex = Knex({ client: 'pg' });
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  // Получение списка планов с возможной фильтрацией и сортировкой
  async getTasks(filter = {}, sort = {}) {
    try {
      const query = this.#knex('OriginalTasks').select('*');

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
      const query = this.#knex('OriginalTasks')
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

  async getTasksByPlanId(planId) {
    try {
      const query = this.#knex('OriginalTasks')
        .select('*')
        .where('planId', '=', planId)
        .first()
        .toSQL()
        .toNative();

      const tasks = (await this.#pool.query(query.sql, query.bindings)).rows;
      return tasks || null;
    } catch (err) {
      throw err;
    }
  }

  // Создание нового плана
  async createTask(taskData) {
    try {
      const query = this.#knex('OriginalTasks').insert(taskData).returning('*').toSQL().toNative();

      const newTask = (await this.#pool.query(query.sql, query.bindings)).rows;
      return newTask[0];
    } catch (err) {
      throw err;
    }
  }

  // Обновление существующего плана по ID
  async updateTask(taskId, updatedData) {
    try {
      const query = this.#knex('OriginalTasks')
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
      const query = this.#knex('OriginalTasks').delete().where('taskId', '=', taskId).toSQL().toNative();

      await this.#pool.query(query.sql, query.bindings);
    } catch (err) {
      throw err;
    }
  }

  // Получение списка планов по ID пользователя
  async getTasksByUserId(userId) {
    try {
      const query = this.#knex('OriginalTasks').select('*').where('userId', '=', userId).toSQL().toNative();

      const tasks = (await this.#pool.query(query.sql, query.bindings)).rows;
      return tasks;
    } catch (err) {
      throw err;
    }
  }
}
