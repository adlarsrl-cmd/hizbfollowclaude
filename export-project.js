#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of all project files to export
const filesToExport = [
  // Root files
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json', 
  'tsconfig.node.json',
  'vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'eslint.config.js',
  'index.html',
  'README.md',
  '.env.example',
  
  // Source files
  'src/main.tsx',
  'src/App.tsx',
  'src/index.css',
  'src/vite-env.d.ts',
  
  // Types
  'src/types/index.ts',
  
  // Lib
  'src/lib/supabase.ts',
  'src/lib/constants.ts',
  'src/lib/utils.ts',
  'src/lib/snapshots.ts',
  'src/lib/getUserRole.ts',
  
  // Stores
  'src/stores/useAppStore.ts',
  'src/stores/useAuth.ts',
  
  // Components
  'src/components/Layout.tsx',
  'src/components/Login.tsx',
  'src/components/Dashboard.tsx',
  'src/components/analytics/EditHistoryButton.tsx',
  'src/components/analytics/ParticipantWeeklyDeltaChart.tsx',
  
  // Pages
  'src/pages/ParticipantsPage.tsx',
  'src/pages/EntryPage.tsx',
  'src/pages/AnalyticsPage.tsx',
  'src/pages/SettingsPage.tsx',
  
  // Test setup
  'src/test/setup.ts',
  
  // Public files
  'public/manifest.json',
  'public/sw.js',
  'public/icon-192x192.png',
  'public/icon-512x512.png',
  
  // Supabase functions
  'supabase/functions/send_reminders/index.ts',
  'supabase/functions/snapshot_tuesday/index.ts'
];

// Create export bundle
const exportData = {
  timestamp: new Date().toISOString(),
  files: {}
};

console.log('🚀 Starting HizbFollow project export...\n');

let exportedCount = 0;
let skippedCount = 0;

filesToExport.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      exportData.files[filePath] = content;
      console.log(`✅ Exported: ${filePath}`);
      exportedCount++;
    } else {
      console.log(`⚠️  Skipped (not found): ${filePath}`);
      skippedCount++;
    }
  } catch (error) {
    console.log(`❌ Error reading ${filePath}:`, error.message);
    skippedCount++;
  }
});

// Write export file
const exportFileName = `hizbfollow-export-${Date.now()}.json`;
fs.writeFileSync(exportFileName, JSON.stringify(exportData, null, 2));

console.log(`\n📦 Export completed!`);
console.log(`📊 Stats: ${exportedCount} files exported, ${skippedCount} skipped`);
console.log(`📁 Export file: ${exportFileName}`);
console.log(`💾 File size: ${(fs.statSync(exportFileName).size / 1024).toFixed(1)} KB`);

console.log(`\n🔄 Next steps:`);
console.log(`1. Download the ${exportFileName} file`);
console.log(`2. Run the import script on your local machine`);
console.log(`3. Commit and push to GitHub`);