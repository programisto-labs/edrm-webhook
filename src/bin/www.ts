/// <reference types="node" />
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);
const localAppPath: string = path.join(__dirname, '../lib/app.js');
const coreAppPath: string = 'endurance-core/dist/lib/app.js';

if (fs.existsSync(localAppPath)) {
    await import(localAppPath);
} else {
    await import(coreAppPath);
}
