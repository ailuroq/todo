export class TaskController {
  constructor(taskRepository, planRepository) {
    this.taskRepository = taskRepository;
    this.planRepository = planRepository;
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

      const taskData = { ...request.body, planId, userId };
      const newTask = await this.taskRepository.createTask(taskData);
      return reply.code(201).send(newTask);
    } catch (err) {
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
      schema: {
        tags: ['Tasks'],
        description: 'Create a new task within a specific plan',
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
            dueDate: { type: 'string', format: 'date-time' },
          },
          required: ['title'],
        },
      },
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
