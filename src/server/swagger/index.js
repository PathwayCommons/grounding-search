import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

export default function( port ) {
  const options = {
    swaggerDefinition: {
      info: {
        title: 'Swagger docs',
        version: '0.0.0',
        description: 'REST API with Swagger doc',
        contact: {
          email: 'pathway-commons-help@googlegroups.com'
        }
      },
      tags: [
        {
          name: 'grounding-search',
          description: 'Grounding Search API'
        }
      ],
      schemes: ['http'],
      host: `localhost:${port}`,
      basePath: '/'
    },
    apis: ['./src/server/routes/index.js']
  };

  const swaggerSpec = swaggerJSDoc(options);
  router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  return router;
};
