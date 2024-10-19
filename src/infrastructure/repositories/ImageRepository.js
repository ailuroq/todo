import Knex from 'knex';
import fs from 'fs';

export class ImageRepository {
  #knex = Knex({ client: 'pg' });
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  async upload(filename, fileData, filePath) {
    try {
      const query = this.#knex
        .queryBuilder()
        .insert({
          name: filename,
          image: fileData
        })
        .into('Images')
        .returning('*')
        .toSQL()
        .toNative();

      const result = await this.#pool.query(query.sql, query.bindings);
      console.log(result)

      // Delete the temporary file
      fs.unlinkSync(filePath);
    } catch (err) {
      throw err;
    }
  }

  async findImage(id) {
    try {
      const query = this.#knex
        .queryBuilder()
        .select('*')
        .from('Images')
        .where('id', '=', id)
        .toSQL()
        .toNative();

      const result = await this.#pool.query(query.sql, query.bindings);

      console.log(result)

      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }
}
