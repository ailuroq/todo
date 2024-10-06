import Knex from 'knex';

export class PlanRepository {
  #knex = Knex({ client: 'pg' });
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  // Получение списка планов с возможной фильтрацией и сортировкой
  async getPlans(filter = {}, sort = {}) {
    try {
      const query = this.#knex('Plans').select('*');

      if (filter.category) {
        query.where('category', '=', filter.category);
      }

      if (filter.ownerId) {
        query.where('ownerId', '=', filter.ownerId);
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
      const query = this.#knex('Plans')
        .select('*')
        .where('planId', '=', planId)
        .first()
        .toSQL()
        .toNative();


      console.log(query)

      const [plan] = (await this.#pool.query(query.sql, query.bindings)).rows;

      console.log(plan)
      return plan || null;
    } catch (err) {
      throw err;
    }
  }

  // Создание нового плана
  async createPlan(planData) {
    try {
      const query = this.#knex('Plans').insert(planData).returning('*').toSQL().toNative();

      const newPlan = (await this.#pool.query(query.sql, query.bindings)).rows;
      return newPlan[0];
    } catch (err) {
      throw err;
    }
  }

  // Обновление существующего плана по ID
  async updatePlan(planId, updatedData) {
    try {
      const query = this.#knex('Plans')
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
      const query = this.#knex('Plans').delete().where('planId', '=', planId).toSQL().toNative();

      await this.#pool.query(query.sql, query.bindings);
    } catch (err) {
      throw err;
    }
  }

  // Получение списка планов по ID пользователя
  async getPlansByUserId(userId) {
    try {
      const query = this.#knex('Plans')
        .select('*')
        .where('ownerId', '=', userId)
        .toSQL()
        .toNative();

      const plans = (await this.#pool.query(query.sql, query.bindings)).rows;
      return plans;
    } catch (err) {
      throw err;
    }
  }
}
