// utilsFile.js
// Saves a JSON object to a file in public/locales, replacing any existing file.
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function saveJsonToFile(pathname, filename, jsonobj) {
  const outputPath = path.isAbsolute(pathname)
    ? path.join(pathname, filename)
    : path.resolve(__dirname, pathname, filename);

  try {
    fs.writeFileSync(outputPath, JSON.stringify(jsonobj, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write ${outputPath}: ${error.message}`);
  }
}
