export class AuthController {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async register(request) {
    try {
      return this.userRepository.register(
        request.body.username,
        request.body.email,
        request.body.password
      );
    } catch (err) {
      throw err;
    }
  }

  async login(request) {
    try {
      return this.userRepository.login(request.body.email, request.body.password);
    } catch (err) {
      throw err;
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
