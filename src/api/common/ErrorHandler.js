export class ErrorHandler {
  async handle(error, request, reply) {
    if (error.validation) {
      reply.status(500).send({
        errors: [
          {
            code: 'validation_error',
            message: JSON.stringify(error.validation),
          },
        ],
      });
    } else {
      reply.status(500).send({
        errors: [
          {
            code: 'internal_server_error',
            message: error,
          },
        ],
      });
    }
  }
}
