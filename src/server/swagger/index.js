import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import { SWAGGER_HOST } from '../config';

const router = express.Router();

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

export default function( port ) {
  const options = {
    swaggerDefinition: {
      info: {
        title: 'Pathway Commons Grounding Search Service',
        version: pkg.version,
        description: 'Get a database grounding for a colloquial biological entity name.  Source code and citation instructions are available on GitHub: [https://github.com/PathwayCommons/grounding-search](`https://github.com/PathwayCommons/grounding-search`)',
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
      schemes: SWAGGER_HOST === 'localhost:3000' ? ['http'] : ['https', 'http'],
      host: SWAGGER_HOST,
      basePath: '/'
    },
    apis: ['./src/server/routes/index.js']
  };

  const swaggerSpec = swaggerJSDoc(options);
  router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  return router;
}
