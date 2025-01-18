import Knex from 'knex';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline as pipelineCallback } from 'stream';
const pipeline = promisify(pipelineCallback);

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
      .select('*')
      .where(function () {
        if (searchQuery) {
          this.whereRaw('LOWER(title) ILIKE ?', [`%${searchQuery.toLowerCase()}%`])
          .orWhereRaw('LOWER(description) ILIKE ?', [`%${searchQuery.toLowerCase()}%`]);
        }

        if (categories && categories.length > 0) {
          this.whereIn('category', categories);
        }
      })
      .toSQL()
      .toNative();

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

  async createPlanFromUser(planData, userId) {
    try {
      const insertOriginalPlanQuery = this.#knex
        .queryBuilder()
        .insert({
          userId,
          title: planData.title,
          description: planData.description,
        })
        .into('OriginalPlans')
        .returning('planId')
        .toSQL()
        .toNative();

      const planInsertResult = await this.#pool.query(insertOriginalPlanQuery.sql, insertOriginalPlanQuery.bindings);

      const insertOriginalTasksQuery = this.#knex
        .queryBuilder()
        .insert(planData.tasks.map((item) => ({
          planId: planInsertResult.rows[0].planId,
          title: item.title,
          description: item.description,
          dayNumber: item.dayNumber,
          isMandatory: item.isMandatory,
          userId,
          image: item.image
        })))
        .into('OriginalTasks')
        .returning('*')
        .toSQL()
        .toNative();

      const tasksInsertResult = await this.#pool.query(insertOriginalTasksQuery.sql, insertOriginalTasksQuery.bindings);

      const insertOriginalImages = this.#knex
        .queryBuilder()
        .insert(planData.tasks.map((item) => {
          const fileData = fs.readFileSync(item.image);

          return {
            originalPlanId: planInsertResult.rows[0].planId,
            originalTaskId: item.taskId,
            imageData: fileData,
            userId,
          }
        }))
        .into('Images')
        .returning('*')
        .toSQL()
        .toNative();

      await this.#pool.query(insertOriginalImages.sql, insertOriginalImages.bindings);

    } catch (err) {
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
    //const trx = await this.#knex.transaction();

    try {
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

      // Modify the selected plan data as necessary (e.g., with the new userId)
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
        updatedAt: this.#knex.fn.now()
      };

      // Step 2: Insert the new plan into Plans table
      const insertPlanQuery = this.#knex('Plans')
        .insert(newPlanData)
        .returning('*')
        .toSQL()
        .toNative();

      const newPlan = (await this.#pool.query(insertPlanQuery.sql, insertPlanQuery.bindings)).rows[0];
      const newPlanId = newPlan.planId;

      const selectQuery = this.#knex('OriginalTasks as ot')
        .join('OriginalPlans as op', 'ot.planId', 'op.planId')
        .select(
          'ot.title',
          'ot.description',
          'ot.taskOrder',
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
      
      // Execute the select query within the transaction
      const selectedTasks = (await this.#pool.query(selectQuery.sql, selectQuery.bindings)).rows;

      // Step 2: Map the tasks for insertion
      const tasksToInsert = selectedTasks.map(task => {
        // Calculate the specific date based on startDate and dayNumber
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
          startTime: task.startTime,
          endTime: task.endTime,
          status: task.status,
          calories: task.calories,
          protein: task.protein,
          carbs: task.carbs,
          fats: task.fats,
          createdAt: this.#knex.fn.now(),
          updatedAt: this.#knex.fn.now(),
          date: date
        };
      });

      // Step 3: Insert the mapped tasks within the transaction
      const insertQuery = this.#knex('Tasks')
        .insert(tasksToInsert)
        .returning('*')
        .toSQL()
        .toNative();

      const setOtherPlansNotActive = this.#knex('Plans')
        .update('isActive', false)
        .where('Plans.planId', '<>', newPlanId)
        .toSQL()
        .toNative()

      const insertedTasks = (await this.#pool.query(insertQuery.sql, insertQuery.bindings)).rows;
      const updatedPlans = (await this.#pool.query(setOtherPlansNotActive.sql, setOtherPlansNotActive.bindings)).rows;

      // Commit transaction
      //await trx.commit();
      return insertedTasks;
    } catch (err) {
      console.log(err)
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
