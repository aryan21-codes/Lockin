const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(srcDir, function(filePath) {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let dirty = false;

    // Skip api.js and supabase.js
    if (filePath.includes('lib\\api.js') || filePath.includes('lib/api.js') || filePath.includes('lib\\supabase.js') || filePath.includes('lib/supabase.js')) {
      return;
    }

    if (content.includes('import axios from \'axios\';')) {
        // Calculate relative path to lib/api.js
        const relativePathToLib = path.relative(path.dirname(filePath), path.join(srcDir, 'lib', 'api'));
        // convert windows separator to posix
        const importPath = relativePathToLib.replace(/\\/g, '/');
        
        content = content.replace('import axios from \'axios\';', `import { api } from '${importPath.startsWith('.') ? importPath : './' + importPath}';`);
        dirty = true;
    }

    if (content.includes('axios.')) {
        content = content.replace(/axios\./g, 'api.');
        dirty = true;
    }
    
    // Replace hardcoded localhost base URL
    if (content.includes('http://localhost:8000')) {
        content = content.replace(/http:\/\/localhost:8000/g, '');
        dirty = true;
    }

    if (dirty) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
