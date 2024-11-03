export class OriginalPlanController {
  constructor(planRepository) {
    this.planRepository = planRepository;
  }

  // Получение списка планов с фильтрацией и сортировкой
  async getPlans(request) {
    try {
      const { filter, sort } = request.query;
      const plans = await this.planRepository.getPlans(filter, sort);
      return plans;
    } catch (err) {
      throw err;
    }
  }

  // Получение детальной информации о плане по ID
  async getPlanById(request) {
    try {
      const { planId } = request.params;
      const plan = await this.planRepository.getPlanById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }
      return plan;
    } catch (err) {
      throw err;
    }
  }

  // Создание нового плана
  async createPlan(request, reply) {
    try {
      const userId = request.user.id;
      const planData = { ...request.body, userId };
      const newPlan = await this.planRepository.createPlan(planData);
      return reply.code(201).send(newPlan);
    } catch (err) {
      throw err;
    }
  }

  // Обновление существующего плана
  async updatePlan(request) {
    try {
      const { planId } = request.params;
      const userId = 1;
      const existingPlan = await this.planRepository.getPlanById(planId);

      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      if (existingPlan.userId !== userId) {
        throw new Error('You can only edit your own plans');
      }

      const updatedPlan = await this.planRepository.updatePlan(planId, request.body);
      return updatedPlan;
    } catch (err) {
      throw err;
    }
  }

  async startPlan(request) {
    try {
      const { planId } = request.params;
      const userId = request.user.id;
      const existingPlan = await this.planRepository.getPlanById(planId);

      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      const updatedPlan = await this.planRepository.startPlan(userId, planId);
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
      const existingPlan = await this.planRepository.getPlanById(planId);

      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      if (existingPlan.userId !== userId) {
        throw new Error('You can only delete your own plans');
      }

      await this.planRepository.deletePlan(planId);
      return reply.code(204).send();
    } catch (err) {
      throw err;
    }
  }

  // Получение списка планов текущего пользователя
  async getMyPlans(request) {
    try {
      const userId = request.user.id;
      const plans = await this.planRepository.getPlansByUserId(userId);
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
      schema: {
        tags: ['Plans'],
        description: 'Create a new plan',
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
          },
          required: ['title', 'description'],
        },
      },
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
