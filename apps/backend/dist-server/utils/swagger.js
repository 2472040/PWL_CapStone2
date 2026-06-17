"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'LokaLab Suite API Docs',
            version: '3.0.0',
            description: 'Dokumentasi interaktif API LokaLab Suite - Sistem Manajemen Inventaris & Pengadaan Laboratorium Terintegrasi',
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
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
const setupSwagger = (app) => {
    // Setup endpoint
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(exports.swaggerSpec));
    console.log('📖 Swagger API docs available at /api-docs');
};
exports.setupSwagger = setupSwagger;
