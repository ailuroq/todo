import pg from 'pg';
import { faker } from '@faker-js/faker';

const client = new pg.Client({
  user: 'user',
  host: 'localhost',
  database: 'mydb',
  password: 'password',
  port: 5432,
});

const NUM_USERS = 100;
const NUM_PLANS = 200;
const NUM_TASKS = 500;
const NUM_PROGRESS = 1000;
const NUM_LIKES = 500;
const NUM_FROZEN = 50;

const generateUsers = async () => {
  console.log('Generating users...');
  for (let i = 0; i < NUM_USERS; i++) {
    const username = faker.internet.userName();
    const email = faker.internet.email();
    const password = faker.internet.password();
    const avatar = faker.image.avatar();

    await client.query(
      'INSERT INTO Users (username, email, password, avatar) VALUES ($1, $2, $3, $4)',
      [username, email, password, avatar]
    );
  }
  console.log('Users generated.');
};

const generatePlans = async () => {
  console.log('Generating plans...');
  for (let i = 0; i < NUM_PLANS; i++) {
    const userId = faker.number.int({ min: 1, max: NUM_USERS });
    const title = faker.lorem.words(3);
    const description = faker.lorem.sentence();
    const isPublic = faker.datatype.boolean();

    await client.query(
      'INSERT INTO Plans (user_id, title, description, public) VALUES ($1, $2, $3, $4)',
      [userId, title, description, isPublic]
    );
  }
  console.log('Plans generated.');
};

const generateTasks = async () => {
  console.log('Generating tasks...');
  for (let i = 0; i < NUM_TASKS; i++) {
    const planId = faker.number.int({ min: 1, max: NUM_PLANS });
    const userId = faker.number.int({ min: 1, max: NUM_USERS });
    const title = faker.lorem.words(2);
    const description = faker.lorem.sentence();
    const order = faker.number.int({ min: 1, max: 10 });
    const durationMinutes = faker.number.int({ min: 10, max: 120 });
    const isMandatory = faker.datatype.boolean();
    const tag = faker.helpers.arrayElement(['прием пищи', 'тренировка', 'витамины'], 1);
    const calories = faker.number.int({ min: 100, max: 1000 });
    const protein = faker.number.float({ min: 10, max: 50 });
    const carbs = faker.number.float({ min: 20, max: 100 });
    const fats = faker.number.float({ min: 5, max: 30 });

    await client.query(
      'INSERT INTO Tasks (plan_id, user_id, title, description, "order", duration_minutes, mandatory, tag, calories, protein, carbs, fats) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [
        planId,
        userId,
        title,
        description,
        order,
        durationMinutes,
        isMandatory,
        tag,
        calories,
        protein,
        carbs,
        fats,
      ]
    );
  }
  console.log('Tasks generated.');
};

const generatePlanProgress = async () => {
  console.log('Generating plan progress...');
  for (let i = 0; i < NUM_PROGRESS; i++) {
    const userId = faker.number.int({ min: 1, max: NUM_USERS });
    const planId = faker.number.int({ min: 1, max: NUM_PLANS });
    const progressDate = faker.date.past();
    const completedTasksCount = faker.number.int({ min: 1, max: 5 });
    const mandatoryTasksCount = faker.number.int({ min: 1, max: 5 });
    const allTasksCompleted = completedTasksCount === mandatoryTasksCount;

    await client.query(
      'INSERT INTO Plan_Progress (user_id, plan_id, progress_date, completed_tasks_count, mandatory_tasks_count, all_tasks_completed) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, planId, progressDate, completedTasksCount, mandatoryTasksCount, allTasksCompleted]
    );
  }
  console.log('Plan progress generated.');
};

const generateLikes = async () => {
  console.log('Generating likes...');
  for (let i = 0; i < NUM_LIKES; i++) {
    const userId = faker.number.int({ min: 1, max: NUM_USERS });
    const planId = faker.number.int({ min: 1, max: NUM_PLANS });
    const likeDate = faker.date.recent();

    await client.query('INSERT INTO Likes (user_id, plan_id, like_date) VALUES ($1, $2, $3)', [
      userId,
      planId,
      likeDate,
    ]);
  }
  console.log('Likes generated.');
};

const generateFrozenLikes = async () => {
  console.log('Generating frozen likes...');
  for (let i = 0; i < NUM_FROZEN; i++) {
    const userId = faker.number.int({ min: 1, max: NUM_USERS });
    const planId = faker.number.int({ min: 1, max: NUM_PLANS });
    const freezeStartDate = faker.date.past();
    const freezeEndDate = faker.date.future();

    await client.query(
      'INSERT INTO Frozen_Likes (user_id, plan_id, freeze_start_date, freeze_end_date) VALUES ($1, $2, $3, $4)',
      [userId, planId, freezeStartDate, freezeEndDate]
    );
  }
  console.log('Frozen likes generated.');
};

const generateData = async () => {
  try {
    await client.connect();
    console.log('Connected to database.');

    await generateUsers();
    await generatePlans();
    await generateTasks();
    await generatePlanProgress();
    await generateLikes();
    await generateFrozenLikes();

    console.log('Data generation complete.');
  } catch (err) {
    console.error('Error generating data:', err);
  } finally {
    await client.end();
    console.log('Disconnected from database.');
  }
};

generateData();
