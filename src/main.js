import { Server } from './server.js';
import config from './api/config/config.js';
import { AuthController } from './api/controllers/AuthController.js';
import { UserRepository } from './infrastructure/repositories/UserRepository.js';
import pg from 'pg';
import { PlanRepository } from './infrastructure/repositories/PlanRepository.js';
import { PlanController } from './api/controllers/PlanController.js';
import { TaskController } from './api/controllers/TaskController.js';
import { ImageController } from './api/controllers/ImageController.js';
import { TaskRepository } from './infrastructure/repositories/TaskRepository.js';
import { ImageRepository } from './infrastructure/repositories/ImageRepository.js';
import { OriginalPlanRepository } from './infrastructure/repositories/OriginalPlanRepository.js';
import { OriginalTaskRepository } from './infrastructure/repositories/OriginalTaskRepository.js';
import { OriginalPlanController } from './api/controllers/OriginalPlanController.js';
import { OriginalTaskController } from './api/controllers/OriginalTaskController.js';
import { UserController } from './api/controllers/UserController.js';

const PROCESS_STOP_EVENTS = ['unhandledRejection', 'SIGINT', 'SIGTERM'];

async function main() {
  const pool = new pg.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'password',
    port: 5432,
  });

  const userRepository = new UserRepository(pool);
  const planRepository = new PlanRepository(pool);
  const originalPlanRepository = new OriginalPlanRepository(pool)
  const taskRepository = new TaskRepository(pool);
  const originalTaskRepository = new OriginalTaskRepository(pool);
  const imageRepository = new ImageRepository(pool);

  const server = new Server(config.server, [
    new AuthController(userRepository),
    new PlanController(planRepository),
    new OriginalPlanController(originalPlanRepository),
    new TaskController(taskRepository, planRepository),
    new OriginalTaskController(originalTaskRepository, originalPlanRepository),
    new ImageController(imageRepository),
    new UserController(userRepository),
  ]);

  await server.start();
  console.log('Application started on port:', config.server.port);

  PROCESS_STOP_EVENTS.forEach((event) => {
    process.on(event, async (e) => {
      if (event === 'unhandledRejection') {
        console.log('Unexpected exception:', e);
      }

      try {
        await server.stop();
      } catch (error) {
        console.log('Error stopping the server:', error);
      }

      console.log('Application stopped');
    });
  });
}

await main();
