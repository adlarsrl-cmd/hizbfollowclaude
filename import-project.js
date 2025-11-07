#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get export file from command line argument
const exportFile = process.argv[2];

if (!exportFile) {
  console.log('❌ Please provide the export file path');
  console.log('Usage: node import-project.js hizbfollow-export-123456789.json');
  process.exit(1);
}

if (!fs.existsSync(exportFile)) {
  console.log(`❌ Export file not found: ${exportFile}`);
  process.exit(1);
}

console.log('📥 Starting HizbFollow project import...\n');

try {
  // Read export data
  const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
  
  console.log(`📅 Export timestamp: ${exportData.timestamp}`);
  console.log(`📁 Files to import: ${Object.keys(exportData.files).length}\n`);
  
  let importedCount = 0;
  let errorCount = 0;
  
  // Import each file
  Object.entries(exportData.files).forEach(([filePath, content]) => {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (dir !== '.' && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
      
      // Write file
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Imported: ${filePath}`);
      importedCount++;
      
    } catch (error) {
      console.log(`❌ Error importing ${filePath}:`, error.message);
      errorCount++;
    }
  });
  
  console.log(`\n📦 Import completed!`);
  console.log(`📊 Stats: ${importedCount} files imported, ${errorCount} errors`);
  
  // Create .gitignore
  const gitignoreContent = `# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local
.env.production

# Build outputs
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Temporary folders
tmp/
temp/
`;
  
  fs.writeFileSync('.gitignore', gitignoreContent);
  console.log(`✅ Created .gitignore`);
  
  console.log(`\n🔄 Next steps:`);
  console.log(`1. Copy your .env file with actual Supabase credentials`);
  console.log(`2. Run: npm install`);
  console.log(`3. Run: git add .`);
  console.log(`4. Run: git commit -m "Initial commit: HizbFollow app"`);
  console.log(`5. Run: git push -u origin main`);
  
} catch (error) {
  console.log('❌ Error reading export file:', error.message);
  process.exit(1);
}