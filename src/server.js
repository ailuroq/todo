import fastify from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { fastifyMiddie } from '@fastify/middie';
import { authenticate } from './api/middlewares/verifyJwt.js';

export class Server {
  constructor(config, controllers) {
    this.config = config;
    this.controllers = controllers;
    this.instance = fastify({
      ignoreTrailingSlash: true,
    });
  }

  async start() {
    await this.instance.register(fastifyMiddie);
    await this.instance.register(jwt, {
      secret: this.config.jwtSecret,
      cookie: {
        cookieName: 'accessToken',
        signed: false,
      },
    });
    this.instance.register(cookie, {
      secret: this.config.jwtSecret,
      parseOptions: {},
    });

    this.controllers.forEach((controller) => {
      controller.registerRoutes(this.instance);
    });

    this.instance.addHook('onRequest', authenticate);

    await this.instance.listen({
      host: this.config.host,
      port: this.config.port,
    });
  }

  async stop() {
    await this.instance.close();
  }
}
