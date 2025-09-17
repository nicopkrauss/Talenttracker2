#!/usr/bin/env node

/**
 * Script to fix Next.js 15 params issues across all API routes
 * 
 * This script updates API route handlers to await params before accessing properties
 * as required by Next.js 15.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all API route files that need fixing
function findApiRoutes() {
  try {
    // Windows-compatible approach using PowerShell
    const result = execSync('powershell "Get-ChildItem -Path app/api -Recurse -Name route.ts | ForEach-Object { \\"app/api/$_\\" }"', { encoding: 'utf8' });
    return result.trim().split('\n').filter(Boolean).map(p => p.replace(/\\/g, '/'));
  } catch (error) {
    console.error('PowerShell failed, trying manual directory traversal...');
    // Fallback to manual traversal
    return findApiRoutesManually('app/api');
  }
}

// Manual directory traversal fallback
function findApiRoutesManually(dir) {
  const routes = [];
  
  function traverse(currentDir) {
    try {
      if (!fs.existsSync(currentDir)) {
        return;
      }
      
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        
        if (item.isDirectory()) {
          traverse(fullPath);
        } else if (item.name === 'route.ts') {
          routes.push(fullPath.replace(/\\/g, '/'));
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }
  
  traverse(dir);
  return routes;
}

// Check if file contains the old params pattern
function needsParamsFix(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes('{ params }: { params: { ') && 
           !content.includes('{ params }: { params: Promise<{');
  } catch (error) {
    return false;
  }
}

// Fix params in a single file
function fixParamsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern 1: Single id parameter
    const singleIdPattern = /{ params }: { params: { id: string } }/g;
    if (content.match(singleIdPattern)) {
      content = content.replace(singleIdPattern, '{ params }: { params: Promise<{ id: string }> }');
      modified = true;
    }

    // Pattern 2: Multiple parameters (id + another param)
    const multiParamPattern = /{ params }: { params: { id: string; (\w+): string } }/g;
    content = content.replace(multiParamPattern, (match, paramName) => {
      modified = true;
      return `{ params }: { params: Promise<{ id: string; ${paramName}: string }> }`;
    });

    // Pattern 3: Date parameter specifically
    const dateParamPattern = /{ params }: { params: { id: string; date: string } }/g;
    if (content.match(dateParamPattern)) {
      content = content.replace(dateParamPattern, '{ params }: { params: Promise<{ id: string; date: string }> }');
      modified = true;
    }

    if (modified) {
      // Now we need to add await params destructuring at the beginning of each function
      // Look for function bodies and add the await destructuring
      
      // Pattern for single id
      content = content.replace(
        /(export async function \w+\([^)]*{ params }: { params: Promise<{ id: string }> }[^)]*\)\s*{\s*try\s*{)/g,
        (match) => {
          return match + '\n    const { id } = await params';
        }
      );

      // Pattern for multiple params
      content = content.replace(
        /(export async function \w+\([^)]*{ params }: { params: Promise<{ id: string; (\w+): string }> }[^)]*\)\s*{\s*try\s*{)/g,
        (match, fullMatch, paramName) => {
          return match + `\n    const { id, ${paramName} } = await params`;
        }
      );

      // Replace all instances of params.id with id
      content = content.replace(/params\.id/g, 'id');
      
      // Replace params.paramName with paramName for other params
      const paramNames = ['assignmentId', 'templateId', 'groupId', 'talentId', 'date'];
      paramNames.forEach(paramName => {
        const regex = new RegExp(`params\\.${paramName}`, 'g');
        content = content.replace(regex, paramName);
      });

      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔍 Finding API routes that need Next.js 15 params fixes...');
  
  const apiRoutes = findApiRoutes();
  console.log(`Found ${apiRoutes.length} API route files`);

  const routesToFix = apiRoutes.filter(needsParamsFix);
  console.log(`${routesToFix.length} files need params fixes`);

  if (routesToFix.length === 0) {
    console.log('✅ All API routes are already compatible with Next.js 15!');
    return;
  }

  console.log('\n📝 Files that need fixing:');
  routesToFix.forEach(route => console.log(`  - ${route}`));

  console.log('\n🔧 Applying fixes...');
  let fixedCount = 0;
  let errorCount = 0;

  routesToFix.forEach(filePath => {
    try {
      const wasFixed = fixParamsInFile(filePath);
      if (wasFixed) {
        console.log(`✅ Fixed: ${filePath}`);
        fixedCount++;
      } else {
        console.log(`⚠️  No changes needed: ${filePath}`);
      }
    } catch (error) {
      console.log(`❌ Error fixing ${filePath}: ${error.message}`);
      errorCount++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Fixed: ${fixedCount} files`);
  console.log(`  ❌ Errors: ${errorCount} files`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 Next.js 15 params compatibility fixes applied!');
    console.log('💡 The application should now run without params-related errors.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixParamsInFile, needsParamsFix };