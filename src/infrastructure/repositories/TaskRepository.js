import Knex from 'knex';
import { openai } from '../../openai.js';

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
      if (taskData.startTime) {
        // Разбиваем строку по символу "T" и удаляем "Z"
        taskData.startTime = taskData.startTime;
      }
      if (taskData.endTime) {
        taskData.endTime = taskData.endTime;
      }
  
      if (taskData.isMeal) {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `
                Ты нутриционист. Твоя задача — анализировать описания блюд и возвращать информацию о БЖУ (белках, жирах, углеводах) и калориях в формате JSON. Если информация неточная, используй средние значения. Если не указана масса, рассчитывай для 100 грамм блюда.
                Формат ответа, только следующая информация и исключительно в формате JSON и всё:
                {
                  "calories": число (ккал),
                  "proteins": число (грамм),
                  "fats": число (грамм),
                  "carbohydrates": число (грамм),
                }
              `,
            },
            { role: 'user', content: taskData.description },
          ],
        });

        const structuredData = JSON.parse(response.choices[0].message.content);
        if (structuredData) {
          taskData.protein = structuredData.proteins
          taskData.fats = structuredData.fats
          taskData.carbs = structuredData.carbohydrates
          taskData.calories = structuredData.calories
        }
      }


      const query = this.#knex('Tasks')
        .insert(taskData)
        .returning('*')
        .toSQL()
        .toNative();

      const newTask = (await this.#pool.query(query.sql, query.bindings)).rows;
      return newTask[0];
    } catch (err) {
      throw err;
    }
  }

  // Обновление существующего плана по ID
  async updateTask(taskId, updatedData) {
    try {
        if (updatedData?.lastTaskGoingToBeDone === true) {
            const updateLikesForThePlanQuery = this.#knex('OriginalPlans')
                .where('planId', '=', updatedData.originalPlanId)
                .increment('likesCount', 1)
                .returning('*')
                .toSQL()
                .toNative();

            await this.#pool.query(updateLikesForThePlanQuery.sql, updateLikesForThePlanQuery.bindings);
        }

        let lastActivityDate = null;
        let points = 0;
        let isTaskCompleted = false;
        let isTaskReverted = false;

        // Получаем текущий статус задачи перед обновлением
        const taskQuery = this.#knex('Tasks')
            .select('status', 'isMandatory', 'isRepeating', 'userId')
            .where('taskId', '=', taskId)
            .toSQL()
            .toNative();

        const { rows } = await this.#pool.query(taskQuery.sql, taskQuery.bindings);
        if (rows.length === 0) return;

        const task = rows[0];

        // ✅ Если пользователь выполняет задачу впервые
        if (updatedData?.status === 'done' && task.status !== 'done') {
            isTaskCompleted = true;
            lastActivityDate = this.#knex.fn.now();
            points = 10; // Базовые очки

            if (task.isMandatory) points += 10; // +10 за важную
            if (task.isRepeating) points += 5;  // +5 за повторяющуюся
        }

        // ❌ Если пользователь отменяет выполнение (меняет статус на "pending")
        if (updatedData?.status === 'pending' && task.status === 'done') {
            isTaskReverted = true;
            points = -(10 + (task.isMandatory ? 10 : 0) + (task.isRepeating ? 5 : 0)); // Минусуем начисленные очки
        }

        // Обновляем статус задачи
        const query = this.#knex('Tasks')
            .update({ status: updatedData.status, lastActivityDate })
            .where('taskId', '=', taskId)
            .returning('*')
            .toSQL()
            .toNative();

        const updatedTask = (await this.#pool.query(query.sql, query.bindings)).rows;

        // ✅ Если задача выполнена – начисляем очки
        if (isTaskCompleted) {
            const pointsQuery = this.#knex('Users')
                .where('userId', '=', task.userId)
                .increment('points', points)
                .toSQL()
                .toNative();

            await this.#pool.query(pointsQuery.sql, pointsQuery.bindings);
        }

        // ❌ Если задача была отменена – забираем очки
        if (isTaskReverted) {
            const pointsQuery = this.#knex('Users')
                .where('userId', '=', task.userId)
                .decrement('points', Math.abs(points)) // Отнимаем очки
                .toSQL()
                .toNative();

            await this.#pool.query(pointsQuery.sql, pointsQuery.bindings);
        }

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
