import { buildApp } from './app.js';
import { parseConfig } from './config.js';

const config = parseConfig(process.env);
const app = buildApp(config);

await app.listen({ host: config.HOST, port: config.PORT });
