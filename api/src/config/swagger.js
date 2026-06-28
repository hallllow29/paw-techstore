/**
 * Configuração do Swagger / OpenAPI.
 * A spec é construída a partir de anotações JSDoc (@openapi) nas rotas.
 * Disponível em GET /api/docs.
 */
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from './env.js';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ElSircários Tech Store API',
      version: '0.1.0',
      description:
        'API REST da plataforma e-commerce ElSircários Tech Store (PAW - Avaliação de Recurso).',
    },
    servers: [{ url: `http://localhost:${env.port}`, description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  // Onde procurar anotações @openapi
  apis: ['./src/routes/*.js', './src/models/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);

export function mountSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  // Expõe o JSON cru (útil para import/testes)
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
}
