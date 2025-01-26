/* eslint-disable no-undef */
import 'dotenv/config';

export default {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
    environment: process.env.NODE_ENV,
    jwtSecret: String(process.env.JWT_SECRET),
  },
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    name: process.env.DB_NAME,
  },
  s3: {
    endpoing: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    accessKey: process.env.S3_ACCESS_KEY
  }
};
