import fs from 'fs';

const files = [
  'src/screens/app-screens-1.jsx',
  'src/screens/app-screens-2.jsx',
  'src/screens/app-screens-3.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix grid templates
  content = content.replace(/gridTemplateColumns:\s*'repeat\(auto-fill\}\}/g, "gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'}}");
  
  // Fix rgba truncation 1
  content = content.replace(/background:\s*isRec\s*\?\s*'rgba\(163,230,\s*border:\s*'1px\s*solid\s*'\s*\+\s*\(isRec\s*\?\s*'rgba\(163,230,\s*transition:\s*'all\s*0\.25s'\}\}/g, "background: isRec ? 'rgba(163,230,53,0.1)' : '', border: '1px solid ' + (isRec ? 'rgba(163,230,53,0.3)' : 'var(--color-line)'), transition: 'all 0.25s'}}");

  // Fix rgba truncation 2
  content = content.replace(/background:\s*'rgba\(255,255,\s*borderBottom:\s*'1px\s*solid\s*var\(--line\)'/g, "background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-line)'");

  // Fix rgba truncation 3
  content = content.replace(/background:\s*'rgba\(183,148,\s*borderColor:\s*'rgba\(183,148\}\}/g, "background: 'rgba(183,148,255,0.1)', borderColor: 'rgba(183,148,255,0.3)'}}");

  // Fix rgba truncation 4
  content = content.replace(/background:\s*'rgba\(0,0\}\}/g, "background: 'rgba(0,0,0,0.2)'}}");
  
  // Fix rgba truncation 5 (avatar)
  content = content.replace(/background:\s*'rgba\(255,\s*display:\s*'flex',\s*alignItems:\s*'center',\s*justifyContent:\s*'center',\s*margin:\s*'0\s*auto\s*18px'\}\}/g, "background: 'rgba(255,107,131,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px'}}");

  fs.writeFileSync(file, content);
  console.log(`Fixed truncated strings in ${file}`);
}
