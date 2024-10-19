import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline as pipelineCallback } from 'stream';
const pipeline = promisify(pipelineCallback);

export class ImageController {
  constructor(imageRepository) {
    this.imageRepository = imageRepository;
  }

  async register(req, reply) {
    const data = await req.file();
    const filename = data.filename;
    // eslint-disable-next-line no-undef
    const filePath = path.join(process.cwd(), 'uploads', filename);

    // Save the temporary file
    await pipeline(data.file, fs.createWriteStream(filePath));

    // Read file for inserting into the database
    const fileData = fs.readFileSync(filePath);

    try {
      await this.imageRepository.upload(filename, fileData, filePath);
    } catch (err) {
      reply.status(500).send({ error: 'Error saving to database' });
    }
  }

  async findImage(req, reply) {
    const { id } = req.params;

    try {
      const image = await this.imageRepository.findImage(id);
      reply.type('image/jpeg').send(image.image);
    } catch (err) {
      reply.status(500).send({ error: 'Error saving to database' });
    }
  }

  registerRoutes(instance) {
    instance.route({
      url: '/upload',
      method: 'POST',
      handler: this.register.bind(this),
      schema: {
        tags: ['Image'],
        description: 'Image upload',
      },
    });
  }

  registerRoutes(instance) {
    instance.route({
      url: '/image/:id',
      method: 'GET',
      handler: this.findImage.bind(this),
      schema: {
        tags: ['Image'],
        description: 'Image upload',
      },
    });
  }
}
