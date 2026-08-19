const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  let content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
  
  // Basic cleanup of TS output to pure CommonJS
  if (content.includes('exports.default = mongoose')) {
    // 1. Remove strict mode, Object.defineProperty, imports
    let newContent = `const mongoose = require('mongoose');\nconst { Schema } = mongoose;\n\n`;
    
    // 2. Extract schema definition
    const schemaMatch = content.match(/const [A-Za-z0-9_]+Schema = new (?:mongoose_1\.)?Schema\(\{[\s\S]*?\}\);/);
    if (schemaMatch) {
      newContent += schemaMatch[0].replace(/mongoose_1\./g, 'mongoose.') + '\n\n';
    } else {
      // some schemas might have a second arg for timestamps
      const schemaMatch2 = content.match(/const [A-Za-z0-9_]+Schema = new (?:mongoose_1\.)?Schema\(\{[\s\S]*?\}, \{[\s\S]*?\}\);/);
      if (schemaMatch2) {
        newContent += schemaMatch2[0].replace(/mongoose_1\./g, 'mongoose.') + '\n\n';
      }
    }
    
    // 3. Extract indexes
    const indexMatch = content.match(/[A-Za-z0-9_]+Schema\.index\(\{[\s\S]*?\}\);/);
    if (indexMatch) {
      newContent += indexMatch[0] + '\n\n';
    }
    
    // 4. Extract export
    const exportMatch = content.match(/exports\.default = (?:mongoose_1\.)?default\.model\('([^']+)', ([^)]+)\);/);
    if (exportMatch) {
      newContent += `module.exports = mongoose.model('${exportMatch[1]}', ${exportMatch[2]});\n`;
    }
    
    fs.writeFileSync(path.join(modelsDir, file), newContent);
    console.log(`Rewrote ${file} to clean CommonJS`);
  }
});
