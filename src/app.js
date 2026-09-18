import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestContext } from './middleware/requestContext.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(apiRateLimiter);
app.use(express.json());
app.use(requestContext);
app.use(routes);
app.use(errorHandler);

export default app;
