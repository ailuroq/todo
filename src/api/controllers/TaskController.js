import { pipeline as pipelineCallback } from 'stream';
const pipeline = promisify(pipelineCallback);
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import sharp from 'sharp';
import { Upload } from "@aws-sdk/lib-storage";
import { s3client } from '../config/s3Client.js';

export class TaskController {
  constructor(taskRepository, planRepository) {
    this.taskRepository = taskRepository;
    this.planRepository = planRepository;
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

  // Получение списка задач для определенного плана
  async getTasks(request, reply) {
    try {
      const { planId } = request.params;
      const plan = await this.planRepository.getPlanById(planId);

      if (!plan) {
        throw new Error('Plan not found');
      }

      const tasks = await this.taskRepository.getTasksByPlanId(planId);
      return tasks;
    } catch (err) {
      throw err;
    }
  }

  // Создание новой задачи в рамках плана
  async createTask(request, reply) {
    try {
      const { planId } = request.params;
      const userId = request.user.id;
      const plan = await this.planRepository.getPlanById(planId);
  
      if (!plan) {
        throw new Error('Plan not found');
      }
  
      if (plan.userId !== userId) {
        throw new Error('You can only add tasks to your own plans');
      }
  
      // Инициализируем объект задачи с обязательными полями
      const task = { planId, userId };
  
      // Получаем части запроса (multipart)
      const parts = request.parts();
  
      for await (const part of parts) {
        if (part.file) {
          // Обработка файлов (изображений)
          if (part.fieldname === 'image') {
            const filename = part.filename;
            const originalFilePath = path.join('./uploads', `original_${filename}`);
            const compressedFilePath = path.join('./uploads', `compressed_${filename}`);
  
            // Сохраняем оригинальный файл временно
            await pipeline(part.file, fs.createWriteStream(originalFilePath));
  
            // Сжимаем изображение с помощью sharp
            await sharp(originalFilePath)
              .resize({ width: 1024 })
              .jpeg({ quality: 80 })
              .toFile(compressedFilePath);
  
            // Создаём поток чтения для сжатого файла
            const fileStream = fs.createReadStream(compressedFilePath);
            const bucketName = 'yoyoyo';
            const key = `uploads/${Date.now()}_${filename}`;
  
            // Загружаем изображение на S3
            const uploadResult = await this.uploadToS3(bucketName, key, fileStream);
  
            // Удаляем временные файлы
            fs.unlinkSync(originalFilePath);
            fs.unlinkSync(compressedFilePath);
  
            // Сохраняем URL изображения в задаче
            task.mainImageLink = uploadResult.Location;
          }
        } else {
          // Обработка текстовых полей
          const fieldname = part.fieldname;
          const value = part.value;
  
          // Если поле представляет булев тип – приводим строковое значение к булеву
          if (fieldname === 'isMandatory' || fieldname === 'isMeal') {
            task[fieldname] = value === 'true';
          } else {
            task[fieldname] = value;
          }
        }
      }
  
      // Создаём задачу через репозиторий
      const newTask = await this.taskRepository.createTask(task);
      return reply.code(201).send(newTask);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  // Обновление задачи
  async updateTask(request, reply) {
    try {
      const { taskId } = request.params;

      const task = await this.taskRepository.getTaskById(taskId);

      if (!task) {
        throw new Error('Task not found in this plan');
      }

      const updatedTask = await this.taskRepository.updateTask(taskId, request.body);
      return updatedTask;
    } catch (err) {
      throw err;
    }
  }

  // Удаление задачи
  async deleteTask(request, reply) {
    try {
      const { planId, taskId } = request.params;
      const userId = request.user.id;
      const plan = await this.planRepository.getPlanById(planId);

      if (!plan) {
        throw new Error('Plan not found');
      }

      if (plan.userId !== userId) {
        throw new Error('You can only delete tasks from your own plans');
      }

      const task = await this.taskRepository.getTaskById(taskId);

      if (!task || task.planId !== planId) {
        throw new Error('Task not found in this plan');
      }

      await this.taskRepository.deleteTask(taskId);
      return reply.code(204).send();
    } catch (err) {
      throw err;
    }
  }

  // Регистрация маршрутов
  registerRoutes(instance) {
    instance.route({
      url: '/plans/:planId/tasks',
      method: 'GET',
      handler: this.getTasks.bind(this),
      schema: {
        tags: ['Tasks'],
        description: 'Get list of tasks for a specific plan',
        params: {
          type: 'object',
          properties: {
            planId: { type: 'string' },
          },
        },
      },
    });

    instance.route({
      url: '/plans/:planId/tasks',
      method: 'POST',
      handler: this.createTask.bind(this),
    });

    instance.route({
      url: '/plans/tasks/:taskId',
      method: 'PUT',
      handler: this.updateTask.bind(this),
      schema: {
        tags: ['Tasks'],
        description: 'Update an existing task within a specific plan',
        params: {
          type: 'object',
          properties: {
            planId: { type: 'string' },
            taskId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    });

    instance.route({
      url: '/plans/:planId/tasks/:taskId',
      method: 'DELETE',
      handler: this.deleteTask.bind(this),
      schema: {
        tags: ['Tasks'],
        description: 'Delete a task within a specific plan',
        params: {
          type: 'object',
          properties: {
            planId: { type: 'string' },
            taskId: { type: 'string' },
          },
        },
      },
    });
  }
}
