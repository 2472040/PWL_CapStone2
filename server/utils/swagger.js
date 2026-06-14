const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
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
  apis: ['./server/routes/*.js', './server/routes/*.cjs', './server/routes/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  // Setup endpoint
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📖 Swagger API docs available at /api-docs');
};

module.exports = { setupSwagger, swaggerSpec };
