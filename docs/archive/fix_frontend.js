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

    // Fix imports
    if (content.includes('const { user } = useStore();') || content.includes('user } = useStore();') || content.includes('{ user, ') ) {
       if (!content.includes('useAuth')) {
           // Find relative path to context
           const relativePathToContext = path.relative(path.dirname(filePath), path.join(srcDir, 'context', 'AuthContext'));
           const importPath = relativePathToContext.replace(/\\/g, '/');
           content = `import { useAuth } from '${importPath.startsWith('.') ? importPath : './' + importPath}';\n` + content;
           
           content = content.replace(/const \{ user \} = useStore\(\);/g, 'const { user } = useAuth();');
           content = content.replace(/const \{ toggleSidebar, user \} = useStore\(\);/g, 'const { toggleSidebar } = useStore();\n  const { user } = useAuth();');
           dirty = true;
       }
    }

    // Fix URL templates
    const fixes = [
       {from: /\/api\/dashboard\/stats\/\$\{user\.id\}/g, to: '/api/dashboard/stats'},
       {from: /\/api\/dashboard\/activity\/\$\{user\.id\}/g, to: '/api/dashboard/activity'},
       {from: /\/api\/code-explainer\/history\/\$\{user\.id\}/g, to: '/api/history/code_explainer'},
       {from: /\/api\/flashcards\/user\/\$\{user\.id\}/g, to: '/api/history/flashcards'},
       {from: /,\s*\{\s*params:\s*\{\s*user_id:\s*user\?\.id\s*\|\|\s*"anonymous"\s*\}\s*\}/g, to: ''},
       {from: /formData\.append\('user_id',\s*user\?\.id\s*\|\|\s*"anonymous"\);/g, to: ''}
    ];

    fixes.forEach(fix => {
        if (fix.from.test(content)) {
            content = content.replace(fix.from, fix.to);
            dirty = true;
        }
    });

    if (dirty) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed', filePath);
    }
  }
});
