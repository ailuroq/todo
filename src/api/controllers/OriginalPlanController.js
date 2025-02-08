import { pipeline as pipelineCallback } from 'stream';
const pipeline = promisify(pipelineCallback);
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import sharp from 'sharp';
import { Upload } from "@aws-sdk/lib-storage";
import { s3client } from '../config/s3Client.js';

export class OriginalPlanController {
  constructor(planRepository) {
    this.originalPlanRepository = planRepository;
  }

  // Получение списка планов с фильтрацией и сортировкой
  async getPlans(request) {
    try {
      const { filter, sort, searchQuery, categories } = request.query;

      const parsedCategories = categories
        ? categories.split(',')
        : []

      const plans = await this.originalPlanRepository.getPlans(filter, sort, searchQuery, parsedCategories);
      return plans;
    } catch (err) {
      throw err;
    }
  }

  // Получение детальной информации о плане по ID
  async getPlanById(request) {
    try {
      const { planId } = request.params;
      const userId = request.user.id;
      const plan = await this.originalPlanRepository.getOriginalPlanById(planId, userId);
      if (!plan) {
        throw new Error('Plan not found');
      }
      return plan;
    } catch (err) {
      throw err;
    }
  }

  async uploadToS3(bucketName, key, fileStream) {
    const upload = new Upload({
      client: s3client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: "image/jpeg",
      },
    });
  
    return await upload.done(); // Возвращает результат загрузки
  }

  // Создание нового плана
  async createPlan(request, reply) {
    try {
      const parts = request.parts();
      const userId = request.user.id;
      const plan = {
        title: "",
        description: "",
        image: '',    // сюда будем сохранять URL изображения плана
        tag: '',
        tasks: [],
      };
      // Обрабатываем все части запроса
      for await (const part of parts) {
        if (part.file) {
          const filename = part.filename;
          const originalFilePath = path.join("./uploads", `original_${filename}`);
          const compressedFilePath = path.join("./uploads", `compressed_${filename}`);
  
          // Сохраняем оригинальный файл временно
          await pipeline(part.file, fs.createWriteStream(originalFilePath));
  
          // Сжимаем изображение
          await sharp(originalFilePath)
            .resize({ width: 1024 })
            .jpeg({ quality: 80 })
            .toFile(compressedFilePath);
  
          // Читаем сжатый файл
          const fileStream = fs.createReadStream(compressedFilePath);
          const bucketName = 'yoyoyo';
          const key = `uploads/${Date.now()}_${filename}`;
  
          // Загружаем на S3
          const uploadResult = await this.uploadToS3(bucketName, key, fileStream);
  
          // Удаляем временные файлы
          fs.unlinkSync(originalFilePath);
          fs.unlinkSync(compressedFilePath);
  
          // Определяем, к какому полю относится изображение
          const taskImageMatch = part.fieldname.match(/tasks\[(\d+)]\[image\]/);
          if (taskImageMatch) {
            // Если поле соответствует картинке задачи
            const taskIndex = parseInt(taskImageMatch[1], 10);
            plan.tasks[taskIndex] = plan.tasks[taskIndex] || {};
            plan.tasks[taskIndex].image = uploadResult.Location;
          } else if (part.fieldname === "image") {
            // Если поле называется просто "image" – это картинка плана
            plan.image = uploadResult.Location;
          }
        } else {
          // Обработка текстовых данных
          const fieldname = part.fieldname;
          const value = part.value;
  
          if (fieldname === "title") {
            plan.title = value;
          } else if (fieldname === "description") {
            plan.description = value;
          } else if (fieldname === "tag") {
            plan.tag = value;
          } else {
            // Обработка полей для задач
            const match = fieldname.match(/tasks\[(\d+)]\[(.+)\]/);
            if (match) {
              const taskIndex = parseInt(match[1], 10);
              const key = match[2];
              plan.tasks[taskIndex] = plan.tasks[taskIndex] || {};
              if (plan.tasks[taskIndex].startTime === 'null') plan.tasks[taskIndex].startTime = null;
              if (plan.tasks[taskIndex].endTime === 'null') plan.tasks[taskIndex].endTime = null;
              plan.tasks[taskIndex][key] = key.includes("is")
                ? value === "true"
                : value;
            }
          }
        }
      }

      // Сохраняем план в базе данных
      const result = await this.originalPlanRepository.createPlanFromUser(plan, userId);
      return reply.send(result);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  

  // Обновление существующего плана
  async updatePlan(request) {
    try {
      const { planId } = request.params;
      const userId = 1;
      const existingPlan = await this.originalPlanRepository.getOriginalPlanById(planId);

      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      if (existingPlan.userId !== userId) {
        throw new Error('You can only edit your own plans');
      }

      const updatedPlan = await this.originalPlanRepository.updatePlan(planId, request.body);
      return updatedPlan;
    } catch (err) {
      throw err;
    }
  }

  async startPlan(request) {
    try {
      const { planId } = request.params;
      const userId = request.user.id;
      const existingPlan = await this.originalPlanRepository.getOriginalPlanById(planId);

      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      const updatedPlan = await this.originalPlanRepository.startPlan(userId, planId);
      return updatedPlan;
    } catch (err) {
      throw err;
    }
  }

  // Удаление плана
  async deletePlan(request, reply) {
    try {
      const { planId } = request.params;
      const userId = 1;
      const existingPlan = await this.originalPlanRepository.getOriginalPlanById(planId);

      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      if (existingPlan.userId !== userId) {
        throw new Error('You can only delete your own plans');
      }

      await this.originalPlanRepository.deletePlan(planId);
      return reply.code(204).send();
    } catch (err) {
      throw err;
    }
  }

  // Получение списка планов текущего пользователя
  async getMyPlans(request) {
    try {
      const userId = request.user.id;
      const plans = await this.originalPlanRepository.getPlansByUserId(userId);
      return plans;
    } catch (err) {
      throw err;
    }
  }

  // Регистрация маршрутов
  registerRoutes(instance) {
    instance.route({
      url: '/original/plans',
      method: 'GET',
      handler: this.getPlans.bind(this),
      schema: {
        tags: ['Plans'],
        description: 'Get list of plans with optional filters and sorting',
        querystring: {
          type: 'object',
          properties: {
            filter: { type: 'string' },
            searchQuery: { type: 'string' },
            sort: { type: 'string' },
          },
        },
      },
    });

    instance.route({
      url: '/original/plans/:planId',
      method: 'GET',
      handler: this.getPlanById.bind(this),
      schema: {
        tags: ['Plans'],
        description: 'Get detailed information about a plan by ID',
        params: {
          type: 'object',
          properties: {
            planId: { type: 'string' },
          },
        },
      },
    });

    instance.route({
      url: '/original/plans',
      method: 'POST',
      handler: this.createPlan.bind(this),
    });

    instance.route({
      url: '/original/plans/:planId/start',
      method: 'POST',
      handler: this.startPlan.bind(this),
      schema: {
        tags: ['Plans'],
        description: 'Update an existing plan',
        params: {
          type: 'object',
          properties: {
            planId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
          },
        },
      },
    });

    instance.route({
      url: '/original/plans/:planId',
      method: 'PUT',
      handler: this.updatePlan.bind(this),
      schema: {
        tags: ['Plans'],
        description: 'Update an existing plan',
        params: {
          type: 'object',
          properties: {
            planId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
          },
        },
      },
    });

    instance.route({
      url: '/original/plans/:planId',
      method: 'DELETE',
      handler: this.deletePlan.bind(this),
      schema: {
        tags: ['Plans'],
        description: 'Delete a plan by ID',
        params: {
          type: 'object',
          properties: {
            planId: { type: 'string' },
          },
        },
      },
    });

    instance.route({
      url: '/original/plans/my',
      method: 'GET',
      handler: this.getMyPlans.bind(this),
      schema: {
        tags: ['Plans'],
        description: 'Get list of plans owned by the current user',
      },
    });
  }
}
