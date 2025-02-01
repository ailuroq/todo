import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { pipeline as pipelineCallback } from 'stream';
const pipeline = promisify(pipelineCallback);
import { promisify } from 'util';
import { Upload } from "@aws-sdk/lib-storage";
import { s3client } from '../config/s3Client.js';

export class UserController {
  constructor(userRepository) {
    this.userRepository = userRepository;
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

  async getUserInfoByToken(request, reply) {
    const userId = request.user.id;

    try {
      const userInfo = await this.userRepository.getUserById(userId);
      reply.send(userInfo);
    } catch (err) {
      reply.status(500).send({ error: 'Error saving to database' });
    }
  }

  async getUserBaseInfoByToken(request, reply) {
    const userId = request.user.id;

    try {
      const userInfo = await this.userRepository.getUserBaseInfoById(userId);
      reply.send(userInfo);
    } catch (err) {
      reply.status(500).send({ error: 'Error saving to database' });
    }
  }

  async deleteUser(request, reply) {
    const userId = request.user.id;

    try {
      const userInfo = await this.userRepository.deleteUser(userId);
      reply.send(userInfo);
    } catch (err) {
      reply.status(500).send({ error: 'Error saving to database' });
    }
  }

  async updateUser(request, reply) {
    try {
      const parts = request.parts(); // Асинхронный итератор по частям запроса
      const userId = request.user.id;
      const updatedData = {};
  
      // Обрабатываем части запроса
      for await (const part of parts) {
        if (part.file) {
          // Если это файл, ожидаем, что это аватарка
          if (part.fieldname === 'avatar') {
            const filename = part.filename;
            const originalFilePath = path.join('./uploads', `original_${filename}`);
            const compressedFilePath = path.join('./uploads', `compressed_${filename}`);
  
            // Сохраняем оригинал во временный файл
            await pipeline(part.file, fs.createWriteStream(originalFilePath));
  
            // Сжимаем изображение с помощью sharp
            await sharp(originalFilePath)
              .resize({ width: 1024 })
              .jpeg({ quality: 80 })
              .toFile(compressedFilePath);
  
            // Читаем сжатый файл в поток
            const fileStream = fs.createReadStream(compressedFilePath);
            const bucketName = 'yoyoyo'; // замените на ваше имя bucket
            const key = `uploads/${Date.now()}_${filename}`;
  
            // Загружаем файл на S3 (метод uploadToS3 должен быть реализован вами)
            const uploadResult = await this.uploadToS3(bucketName, key, fileStream);
  
            // Удаляем временные файлы
            fs.unlinkSync(originalFilePath);
            fs.unlinkSync(compressedFilePath);
  
            // Сохраняем URL аватарки в объект обновления
            updatedData.avatar = uploadResult.Location;
          }
        } else {
          // Обработка текстовых полей
          const fieldname = part.fieldname;
          const value = part.value;
  
          if (fieldname === 'username') {
            updatedData.username = value;
          } else if (fieldname === 'email') {
            updatedData.email = value;
          }
        }
      }

      console.log(userId, updatedData)
  
      // Обновляем данные пользователя в базе данных
      const result = await this.userRepository.updateUser(userId, updatedData);
  
      return reply.send(result);
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  }

  async checkUsernameExists(request, reply) {
    const userId = request.user.id;
    const newName = request.body.newName;

    try {
      const userInfo = await this.userRepository.checkUsernameExists(userId, newName);
      reply.send(userInfo);
    } catch (err) {
      reply.status(500).send({ error: 'Error saving to database' });
    }
  }

  async saveFeedback(request, reply) {
    const userId = request.user.id;
    const feedbackText = request.body.feedback;

    try {
      const feedBackResult = await this.userRepository.saveFeedback(userId, feedbackText);
      reply.send(feedBackResult);
    } catch (err) {
      reply.status(500).send({ error: 'Error saving to database' });
    }
  }

  registerRoutes(instance) {
    instance.route({
      url: '/user/info',
      method: 'GET',
      handler: this.getUserInfoByToken.bind(this),
      schema: {
        tags: ['User'],
        description: 'Get user info with tasks',
      },
    });

    instance.route({
      url: '/user/base/info',
      method: 'GET',
      handler: this.getUserBaseInfoByToken.bind(this),
      schema: {
        tags: ['User'],
        description: 'Get user info with tasks',
      },
    });

    instance.route({
      url: '/user/delete',
      method: 'POST',
      handler: this.deleteUser.bind(this),
      schema: {
        tags: ['User'],
        description: 'Detete user',
      },
    });

    instance.route({
      url: '/user/check/username',
      method: 'POST',
      handler: this.checkUsernameExists.bind(this),
      schema: {
        tags: ['User'],
        description: 'check username exists',
      },
    });

    instance.route({
      url: '/user/update',
      method: 'PUT',
      handler: this.updateUser.bind(this),
      schema: {
        tags: ['User'],
        description: 'Update user fields',
      },
    });

    instance.route({
      url: '/feedback',
      method: 'POST',
      handler: this.saveFeedback.bind(this),
      schema: {
        tags: ['User'],
        description: 'check username exists',
      },
    });
  }
}
