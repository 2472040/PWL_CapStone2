import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LokaLab Suite API Docs',
      version: '3.0.0',
      description:
        'Dokumentasi interaktif API LokaLab Suite - Sistem Manajemen Inventaris & Pengadaan Laboratorium Terintegrasi',
      contact: {
        name: 'Maranatha Lab Support',
        email: '2472901@maranatha.ac.id',
      },
    },
    servers: [
      {
        url: '',
        description: 'Current host',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'Akses JWT via HttpOnly Cookie (token)',
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: [
    './server/routes/*.js',
    './server/routes/*.ts',
    './server/routes/**/*.ts',
    './server/dist-server/routes/**/*.js',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express): void => {
  // Setup endpoint
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📖 Swagger API docs available at /api-docs');
};
