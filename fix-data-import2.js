import fs from 'fs';
import path from 'path';

const files = [
  'src/screens/app-screens-1.jsx',
  'src/screens/app-screens-2.jsx',
  'src/screens/app-screens-3.jsx',
  'src/components/app-shell.jsx',
  'src/components/app-icons.jsx',
  'src/components/app-cursor.jsx',
  'src/main.jsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('app-data.js')) {
      content = content.replace(/app-data\.js/g, 'app-data.jsx');
      fs.writeFileSync(file, content);
      console.log(`Updated imports in ${file}`);
    }
  }
}
