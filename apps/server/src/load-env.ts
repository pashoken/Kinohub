import { loadEnvFile } from 'node:process';

export function loadLocalEnv(path = '.env'): void {
  try {
    loadEnvFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
