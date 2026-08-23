import { parseConfig } from '../apps/server/src/config.js';
import { loadLocalEnv } from '../apps/server/src/load-env.js';

loadLocalEnv();
const config = parseConfig(process.env);
process.stdout.write(
  `CONFIG_OK mode=${config.APP_MODE} origin=${new URL(config.PUBLIC_APP_ORIGIN).origin} secrets=redacted\n`,
);
