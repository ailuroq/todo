import Knex from 'knex';

export class OriginalPlanRepository {
  #knex = Knex({ client: 'pg' });
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  // Получение списка планов с возможной фильтрацией и сортировкой
  async getPlans(filter = {}, sort = {}, searchQuery, categories) {
    try {
      const sqlQuery = this.#knex('OriginalPlans')
        .select(
          'OriginalPlans.*',
          'Users.*',
          this.#knex.raw('(SELECT MAX("dayNumber") FROM "OriginalTasks" WHERE "OriginalTasks"."planId" = "OriginalPlans"."planId") AS "maxDayNumber"')
        )
        .where(function () {
          if (searchQuery) {
            this.whereRaw('LOWER(title) ILIKE ?', [`%${searchQuery.toLowerCase()}%`])
            .orWhereRaw('LOWER(description) ILIKE ?', [`%${searchQuery.toLowerCase()}%`]);
          }

          if (categories && categories.length > 0) {
            this.whereIn('category', categories);
          }
        })
        .innerJoin('Users', 'OriginalPlans.userId', 'Users.userId')
        .orderBy('OriginalPlans.likesCount', 'desc')
        .toSQL()
        .toNative();

      const plans = (await this.#pool.query(sqlQuery.sql, sqlQuery.bindings)).rows;

      return plans;
    } catch (err) {
      throw err;
    }
  }

  // Получение плана по ID
  async getOriginalPlanById(planId, userId = false) {
    try {
      const query = this.#knex('OriginalPlans')
        .select(
          '*',
          this.#knex.raw(`
          (
            SELECT json_agg(tasks)
            FROM "OriginalTasks" tasks
            LEFT JOIN "Images" ON "Images"."originalTaskId" = tasks."taskId"
            WHERE tasks."planId" = "OriginalPlans"."planId"
          ) AS tasks
        `)
        )
        .where('OriginalPlans.planId', '=', planId)
        .first()
        .toSQL()
        .toNative();

      const [plan] = (await this.#pool.query(query.sql, query.bindings)).rows;

      if (userId) {
        const isThereActiveUserPlan = this.#knex('Plans')
        .select('planId', 'isActive')
        .where({ userId, isActive: true })
        .first()
        .toSQL()
        .toNative();

        const [isActivePlan] = (await this.#pool.query(isThereActiveUserPlan.sql, isThereActiveUserPlan.bindings)).rows;

        plan.isActivePlanExists = isActivePlan?.isActive;
      }

      return plan || null;
    } catch (err) {
      throw err;
    }
  }

  async createPlanFromUser(planData, userId) {
    try {
      const insertOriginalPlanQuery = this.#knex
        .queryBuilder()
        .insert({
          userId,
          title: planData.title,
          mainImageLink: planData.image,
          description: planData.description,
        })
        .into('OriginalPlans')
        .returning('planId')
        .toSQL()
        .toNative();

      const planInsertResult = await this.#pool.query(insertOriginalPlanQuery.sql, insertOriginalPlanQuery.bindings);

      const insertOriginalTasksQuery = 
          this.#knex
          .queryBuilder()
          .insert(planData.tasks.map((item) => ({
            planId: planInsertResult.rows[0].planId,
            title: item.title,
            description: item.description,
            dayNumber: item.dayNumber,
            isMandatory: item.isMandatory,
            mainImageLink: item.image,
            tag: item.tag,
            userId,
          })))
          .into('OriginalTasks')
          .returning('*')
          .toSQL()
          .toNative();


      const [tasksInsertResult] = (await this.#pool.query(insertOriginalTasksQuery.sql, insertOriginalTasksQuery.bindings)).rows;

      return planInsertResult.rows[0].planId;

    } catch (err) {
      console.log(err)
      throw(err);
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
  async startPlan(userId, planId) {
    try {
      // Шаг 1: Выбор оригинального плана
      const selectPlanQuery = this.#knex('OriginalPlans')
        .select(
          'userId',
          'title',
          'description',
          'details',
          'category',
          'isPublic',
          'likesCount',
          'version'
        )
        .where('planId', planId)
        .toSQL()
        .toNative();
  
      const originalPlan = (await this.#pool.query(selectPlanQuery.sql, selectPlanQuery.bindings)).rows[0];
  
      // Создание нового плана
      const newPlanData = {
        userId: userId,
        originalPlanId: planId,
        isActive: true,
        title: originalPlan.title,
        description: originalPlan.description,
        details: originalPlan.details,
        category: originalPlan.category,
        isPublic: originalPlan.isPublic,
        likesCount: originalPlan.likesCount,
        version: originalPlan.version,
        createdAt: this.#knex.fn.now(),
        updatedAt: this.#knex.fn.now(),
      };
  
      const insertPlanQuery = this.#knex('Plans')
        .insert(newPlanData)
        .returning('*')
        .toSQL()
        .toNative();
  
      const newPlan = (await this.#pool.query(insertPlanQuery.sql, insertPlanQuery.bindings)).rows[0];
      const newPlanId = newPlan.planId;
  
      // Шаг 2: Копирование задач
      const selectQuery = this.#knex('OriginalTasks as ot')
        .join('OriginalPlans as op', 'ot.planId', 'op.planId')
        .select(
          'ot.taskId AS originalTaskId',
          'ot.title',
          'ot.description',
          'ot.taskOrder',
          'ot.mainImageLink',
          'ot.durationMinutes',
          'ot.isRepeating',
          'ot.isMandatory',
          'ot.isMeal',
          'ot.repeatType',
          'ot.repeatDays',
          'ot.tagId',
          'ot.startTime',
          'ot.endTime',
          'ot.status',
          'ot.calories',
          'ot.protein',
          'ot.carbs',
          'ot.fats',
          'ot.dayNumber'
        )
        .where('op.planId', planId)
        .toSQL()
        .toNative();
  
      const selectedTasks = (await this.#pool.query(selectQuery.sql, selectQuery.bindings)).rows;
  
      const tasksToInsert = selectedTasks.map(task => {
        const date = new Date();
        date.setDate(date.getDate() + task.dayNumber - 1);
        return {
          planId: newPlanId,
          userId: userId,
          title: task.title,
          description: task.description,
          taskOrder: task.taskOrder,
          durationMinutes: task.durationMinutes,
          isRepeating: task.isRepeating,
          isMandatory: task.isMandatory,
          isMeal: task.isMeal,
          repeatType: task.repeatType,
          repeatDays: task.repeatDays,
          tagId: task.tagId,
          mainImageLink: task.mainImageLink,
          startTime: task.startTime,
          endTime: task.endTime,
          status: task.status,
          calories: task.calories,
          protein: task.protein,
          carbs: task.carbs,
          fats: task.fats,
          createdAt: this.#knex.fn.now(),
          updatedAt: this.#knex.fn.now(),
          date: date,
          originalTaskId: task.originalTaskId, // Добавляем для связи
        };
      });
  
      const insertQuery = this.#knex('Tasks')
        .insert(tasksToInsert)
        .returning(['taskId', 'originalTaskId'])
        .toSQL()
        .toNative();
  
      const insertedTasks = (await this.#pool.query(insertQuery.sql, insertQuery.bindings)).rows;
  
      const setOtherPlansNotActive = this.#knex('Plans')
        .update('isActive', false)
        .where('Plans.planId', '<>', newPlanId)
        .toSQL()
        .toNative();
  
      await this.#pool.query(setOtherPlansNotActive.sql, setOtherPlansNotActive.bindings);
  
      return insertedTasks;
    } catch (err) {
      console.log(err);
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
