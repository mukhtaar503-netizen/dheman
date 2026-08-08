import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from '@/config/env';
import { swaggerSpec } from '@/config/swagger';
import { errorHandler, notFoundHandler } from '@/middleware/error-handler';
import { perfLogging } from '@/middleware/perf-logging';
import routes from '@/routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/docs.json', (_req, res) => res.status(200).json(swaggerSpec));

  app.use('/api/v1', perfLogging, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
