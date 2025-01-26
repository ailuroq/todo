export class AuthController {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async register(request, reply) {
    try {
      return this.userRepository.register(
        request.body.username,
        request.body.email,
        request.body.password
      );
    } catch (err) {
      reply.status(500).send({ error: 'Error saving to database' });
    }
  }

  async login(request, reply) {
    try {
      const result = await this.userRepository.login(request.body.email, request.body.password);

      return result;
    } catch (err) {
      reply.status(401).send({ error: 'Not authentificated' });
    }
  }

  registerRoutes(instance) {
    instance.route({
      url: '/register',
      method: 'POST',
      handler: this.register.bind(this),
      schema: {
        tags: ['User'],
        description: 'User registration',
      },
    });

    instance.route({
      url: '/login',
      method: 'POST',
      handler: this.login.bind(this),
      schema: {
        tags: ['Index'],
        description: 'User login',
      },
    });
  }
}
