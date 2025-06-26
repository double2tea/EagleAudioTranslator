import { appendFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOG_FILE = join(__dirname, '..', 'server.log');
const ERROR_LOG_FILE = join(__dirname, '..', 'error.log');
export async function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    try {
        appendFileSync(LOG_FILE, logMessage);
    }
    catch (err) {
        console.error('Failed to write to log file:', err);
    }
}
export async function logError(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ERROR: ${message}\n`;
    try {
        appendFileSync(ERROR_LOG_FILE, logMessage);
    }
    catch (err) {
        console.error('Failed to write to error log file:', err);
    }
}
