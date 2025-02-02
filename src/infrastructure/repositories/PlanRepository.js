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
      const query = this.#knex('Plans')
        .select(
          '*',
          this.#knex.raw(`
          (
            SELECT json_agg(tasks)
            FROM "Tasks" tasks
            WHERE tasks."planId" = "Plans"."planId"
          ) AS tasks
        `)
        )
        .where('Plans.planId', '=', planId)
        .first()
        .toSQL()
        .toNative();

      const [plan] = (await this.#pool.query(query.sql, query.bindings)).rows;
      return plan || null;
    } catch (err) {
      throw err;
    }
  }

  async getCurrentUserPlan(userId) {
    try {
      const query = this.#knex('Plans')
        .select(
          '*',
          this.#knex.raw(`
          (
            SELECT json_agg(tasks)
            FROM "Tasks" tasks
            WHERE tasks."planId" = "Plans"."planId"
            AND "Plans"."isActive" = true
          ) AS tasks
        `),
        this.#knex.raw(`
          (
            SELECT CASE
              WHEN COUNT(*) FILTER (
                WHERE tasks.status != 'done'
                AND tasks.date = CURRENT_DATE
              ) = 0 THEN true
              ELSE false
            END
            FROM "Tasks" tasks
            WHERE tasks."planId" = "Plans"."planId"
          ) AS "isDayCompleted"
          `)
        )
        .where('Plans.userId', '=', userId)
        .where('Plans.isActive', '=', true)
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
      const query = this.#knex('Plans').select('*').where('userId', '=', userId).toSQL().toNative();

      const plans = (await this.#pool.query(query.sql, query.bindings)).rows;
      return plans;
    } catch (err) {
      throw err;
    }
  }

  async getExpiredPlans(today) {
    const query = this.#knex('Plans')
        .select('planId', 'userId')
        .where('isActive', '=', true)
        .where('planId', 'in', function() {
            this.select('planId')
                .from('Tasks')
                .where('date', '<', today) // ✅ Дата последней задачи < сегодня
                .groupBy('planId');
        })
        .toSQL()
        .toNative();

    const { rows } = await this.#pool.query(query.sql, query.bindings);
    return rows;
  }


// Найти невыполненные задачи для плана
  async getIncompleteTasks(planId, today) {
    const query = this.#knex('Tasks')
        .count('*')
        .where('planId', '=', planId)
        .where('date', '<', today) // ❌ Только просроченные задачи
        .whereNot('status', '=', 'done') // ❌ Которые не были выполнены
        .where('penaltyApplied', '=', false) // ❌ По которым штраф еще не был начислен
        .toSQL()
        .toNative();

    const { rows } = await this.#pool.query(query.sql, query.bindings);
    return rows[0].count || 0;
  }



// Завершить просроченный план
  async markPlanAsCompleted(planId) {
      const query = this.#knex('Plans')
          .where('planId', '=', planId)
          .update({ isActive: false })
          .toSQL()
          .toNative();

      await this.#pool.query(query.sql, query.bindings);
  }

  async markPenaltyAsApplied(planId, today) {
    const query = this.#knex('Tasks')
        .where('planId', '=', planId)
        .where('date', '<', today)
        .whereNot('status', '=', 'done')
        .update({ penaltyApplied: true })
        .toSQL()
        .toNative();

    await this.#pool.query(query.sql, query.bindings);
  }
}
