import express from 'express';
import cors from 'cors';
import { config } from './config';
import { apiRouter } from './routes/api.routes';
import { webhookRouter } from './routes/webhook.routes';

const app = express();

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-hub-signature-256', 'x-github-event', 'x-github-delivery'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/webhooks', webhookRouter);
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(config.port, () => {
  console.info('====================================================');
  console.info(`🚀 AI Git Reviewer Server running on http://localhost:${config.port}`);
  console.info(`🤖 AI Provider: [${config.aiProvider.toUpperCase()}]`);
  console.info(`📦 GitHub Webhook: http://localhost:${config.port}/api/webhooks/github`);
  console.info(`📊 Dashboard API: http://localhost:${config.port}/api/metrics`);
  console.info('====================================================');
});

export default app;

