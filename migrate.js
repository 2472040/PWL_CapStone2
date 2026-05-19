import fs from 'fs';
import path from 'path';

const files = [
  'src/data/app-data.js',
  'src/utils/app-sounds.js',
  'src/components/app-icons.jsx',
  'src/components/app-cursor.jsx',
  'src/components/app-shell.jsx',
  'src/screens/app-screens-1.jsx',
  'src/screens/app-screens-2.jsx',
  'src/screens/app-screens-3.jsx',
  'src/app-main.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Strip IIFE wrappers
  content = content.replace(/^\s*\(\s*function\s*\(\)\s*\{\s*/m, '');
  content = content.replace(/\}\)\(\);\s*$/m, '');

  // Strip const { ... } = React;
  content = content.replace(/const\s+\{([^}]+)\}\s*=\s*React;/g, "import React, { $1 } from 'react';");
  
  // Strip const { ... } = window.LokaApp;
  content = content.replace(/const\s+\{([^}]+)\}\s*=\s*window\.LokaApp;/g, "import { $1 } from '../components/app-shell.jsx';");

  // Fix custom global object declarations
  content = content.replace(/window\.LOKA\s*=\s*\{/, "export const LOKA = {");
  content = content.replace(/window\.Icon\s*=\s*function/, "export function Icon");
  content = content.replace(/window\.QR\s*=\s*function/, "export function QR");
  content = content.replace(/window\.CustomCursor\s*=\s*function/, "export function CustomCursor");
  content = content.replace(/window\.LokaSounds\s*=\s*\{/, "export const LokaSounds = {");
  
  content = content.replace(/window\.Screens1\s*=\s*\{/, "export const Screens1 = {");
  content = content.replace(/window\.Screens2\s*=\s*\{/, "export const Screens2 = {");
  content = content.replace(/window\.Screens3\s*=\s*\{/, "export const Screens3 = {");
  
  content = content.replace(/window\.LokaApp\s*=\s*\{/, "export const LokaApp = {");

  // Fix usages of globals
  content = content.replace(/const D = window\.LOKA;/g, "import { LOKA as D } from '../data/app-data.js';");
  content = content.replace(/const Icon = window\.Icon;/g, "import { Icon } from '../components/app-icons.jsx';");
  content = content.replace(/const QR = window\.QR;/g, "import { QR } from '../components/app-icons.jsx';");
  content = content.replace(/const CustomCursor = window\.CustomCursor;/g, "import { CustomCursor } from '../components/app-cursor.jsx';");
  
  content = content.replace(/const\s+\{([^}]+)\}\s*=\s*window\.Screens1;/g, "import { $1 } from './app-screens-1.jsx';");
  content = content.replace(/const\s+\{([^}]+)\}\s*=\s*window\.Screens2;/g, "import { $1 } from './app-screens-2.jsx';");
  content = content.replace(/const\s+\{([^}]+)\}\s*=\s*window\.Screens3;/g, "import { $1 } from './app-screens-3.jsx';");

  // If app-main, change to main
  if (file === 'src/app-main.jsx') {
    content = content.replace(/ReactDOM\.createRoot\(document\.getElementById\('root'\)\)\.render\(<App \/>\);/g, "import ReactDOM from 'react-dom/client';\nimport '../assets/css/app-theme.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(<App />);");
    fs.writeFileSync('src/main.jsx', content);
    fs.unlinkSync(file);
  } else {
    fs.writeFileSync(file, content);
  }
  console.log(`Migrated ${file}`);
}
