import Knex from 'knex';

export class OriginalPlanRepository {
  #knex = Knex({ client: 'pg' });
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  // Получение списка планов с возможной фильтрацией и сортировкой
  async getPlans(filter = {}, sort = {}) {
    try {
      const query = this.#knex('OriginalPlans').select('*');

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
      const plans = (await this.#pool.query(sqlQuery.sql, sqlQuery.bindings)).rows;
      return plans;
    } catch (err) {
      throw err;
    }
  }

  // Получение плана по ID
  async getPlanById(planId) {
    try {
      const query = this.#knex('OriginalPlans')
        .select(
          '*',
          this.#knex.raw(`
          (
            SELECT json_agg(tasks)
            FROM "OriginalTasks" tasks
            WHERE tasks."planId" = "OriginalPlans"."planId"
          ) AS tasks
        `)
        )
        .where('OriginalPlans.planId', '=', planId)
        .first()
        .toSQL()
        .toNative();

      const [plan] = (await this.#pool.query(query.sql, query.bindings)).rows;
      return plan || null;
    } catch (err) {
      throw err;
    }
  }

  // Создание нового плана
  async createPlan(planData) {
    try {
      const query = this.#knex('OriginalPlans').insert(planData).returning('*').toSQL().toNative();

      const newPlan = (await this.#pool.query(query.sql, query.bindings)).rows;
      return newPlan[0];
    } catch (err) {
      throw err;
    }
  }

  // Обновление существующего плана по ID
  async updatePlan(planId, updatedData) {
    try {
      const query = this.#knex('OriginalPlans')
        .update(updatedData)
        .where('planId', '=', planId)
        .returning('*')
        .toSQL()
        .toNative();

      const updatedPlan = (await this.#pool.query(query.sql, query.bindings)).rows;
      return updatedPlan[0];
    } catch (err) {
      throw err;
    }
  }

  // Пользователь нажимает начать план
  async updatePlan(planId, updatedData) {
    try {
      const query = this.#knex('OriginalPlans')
        .update(updatedData)
        .where('planId', '=', planId)
        .returning('*')
        .toSQL()
        .toNative();

      const updatedPlan = (await this.#pool.query(query.sql, query.bindings)).rows;
      return updatedPlan[0];
    } catch (err) {
      throw err;
    }
  }

  // Удаление плана по ID
  async deletePlan(planId) {
    try {
      const query = this.#knex('OriginalPlans').delete().where('planId', '=', planId).toSQL().toNative();

      await this.#pool.query(query.sql, query.bindings);
    } catch (err) {
      throw err;
    }
  }

  // Получение списка планов по ID пользователя
  async getPlansByUserId(userId) {
    try {
      const query = this.#knex('OriginalPlans').select('*').where('userId', '=', userId).toSQL().toNative();

      const plans = (await this.#pool.query(query.sql, query.bindings)).rows;
      return plans;
    } catch (err) {
      throw err;
    }
  }
}
