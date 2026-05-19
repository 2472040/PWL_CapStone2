import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const files = globSync('src/**/*.jsx');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('app-data.js')) {
    content = content.replace(/app-data\.js/g, 'app-data.jsx');
    fs.writeFileSync(file, content);
    console.log(`Updated imports in ${file}`);
  }
}
