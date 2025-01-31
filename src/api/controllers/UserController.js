export class UserController {
  constructor(userRepository) {
    this.userRepository = userRepository;
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

  async deleteUser(request, reply) {
    const userId = request.user.id;

    try {
      const userInfo = await this.userRepository.deleteUser(userId);
      reply.send(userInfo);
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
      url: '/user/delete',
      method: 'POST',
      handler: this.deleteUser.bind(this),
      schema: {
        tags: ['User'],
        description: 'Detete user',
      },
    });
  }
}
