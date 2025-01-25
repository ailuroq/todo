import { S3Client } from "@aws-sdk/client-s3";
import config from './config.js';
// Создаем экземпляр S3 клиента
export const s3client = new S3Client({
  endpoint: config.s3.endpoing, // Ваш S3 API Endpoint
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,        // Ваш Access Key
    secretAccessKey: config.s3.accessKey,    // Ваш Secret Key
  },
});
