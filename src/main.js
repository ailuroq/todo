import { Server } from './server.js';
import config from './api/config/config.js';
import { AuthController } from './api/controllers/AuthController.js';
import { UserRepository } from './infrastructure/repositories/UserRepository.js';
import pg from 'pg';
import { PlanRepository } from './infrastructure/repositories/PlanRepository.js';
import { PlanController } from './api/controllers/PlanController.js';

const PROCESS_STOP_EVENTS = ['unhandledRejection', 'SIGINT', 'SIGTERM'];

async function main() {
  const pool = new pg.Pool({
    user: 'user',
    host: 'localhost',
    database: 'mydb',
    password: 'password',
    port: 5432,
  });

  const userRepository = new UserRepository(pool);
  const planRepository = new PlanRepository(pool);

  const server = new Server(config.server, [
    new AuthController(userRepository),
    new PlanController(planRepository),
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
