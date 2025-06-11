#!/usr/bin/env node

/**
 * Generate separate latest-*.yml files for different Linux distributions and architectures
 * This enables proper auto-updates for each distribution/architecture combination
 */

const fs = require('fs');
const path = require('path');

/**
 * Simple YAML parser for our specific use case
 */
function parseSimpleYaml(yamlContent) {
  const lines = yamlContent.split('\n');
  const result = {};
  let currentKey = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (trimmed.includes(': ')) {
      const [key, value] = trimmed.split(': ', 2);
      const cleanKey = key.trim();
      const cleanValue = value.trim().replace(/^["']|["']$/g, '');
      
      if (cleanKey === 'files') {
        result.files = [];
        currentKey = 'files';
      } else if (currentKey === 'files' && cleanKey.startsWith('- ')) {
        // Handle array items under files
        const fileKey = cleanKey.substring(2);
        if (!result.files[0]) result.files[0] = {};
        result.files[0][fileKey] = cleanValue;
      } else {
        result[cleanKey] = cleanValue;
      }
    }
  }
  
  return result;
}

/**
 * Simple YAML stringifier for our specific use case
 */
function stringifySimpleYaml(obj) {
  let yaml = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'files' && Array.isArray(value)) {
      yaml += 'files:\n';
      for (const file of value) {
        yaml += '  - url: ' + file.url + '\n';
        yaml += '    sha512: ' + file.sha512 + '\n';
        yaml += '    size: ' + file.size + '\n';
      }
    } else {
      yaml += key + ': ' + value + '\n';
    }
  }
  
  return yaml;
}

/**
 * Generate update files for Linux distributions
 * @param {import('electron-builder').AfterAllArtifactBuildContext} context
 */
async function generateLinuxUpdateFiles(context) {
  const { outDir, platformToTargets } = context;
  
  // Get Linux platform targets
  const linuxTargets = platformToTargets.get('linux');
  if (!linuxTargets) {
    console.log('No Linux targets found, skipping Linux update file generation');
    return;
  }

  console.log('Generating Linux update files...');

  // Find the original latest.yml file
  const originalLatestPath = path.join(outDir, 'latest.yml');
  if (!fs.existsSync(originalLatestPath)) {
    console.log('No latest.yml found, skipping Linux update file generation');
    return;
  }

  // Read the original latest.yml
  const originalLatest = parseSimpleYaml(fs.readFileSync(originalLatestPath, 'utf8'));
  
  // Generate update files for each target/arch combination
  const updateFiles = [];
  
  for (const target of linuxTargets) {
    const targetName = target.name;
    
    for (const arch of target.archs) {
      const archName = arch.name;
      
      // Skip snap for non-x64 architectures or other combinations that don't make sense
      if (targetName === 'snap' && archName !== 'x64') {
        continue;
      }
      
      // Create a specific update file for this target/arch combination
      const updateFileName = `latest-linux-${targetName}-${archName}.yml`;
      const updateFilePath = path.join(outDir, updateFileName);
      
      // Find the corresponding artifact
      const artifactPattern = new RegExp(`PostyBirb-.*-linux-${targetName}-${archName}\\.(${getExtensionForTarget(targetName)})$`);
      const artifacts = fs.readdirSync(outDir).filter(file => artifactPattern.test(file));
      
      if (artifacts.length > 0) {
        const artifactFile = artifacts[0];
        const stats = fs.statSync(path.join(outDir, artifactFile));
        
        // Create update metadata for this specific target/arch
        const updateData = {
          version: originalLatest.version,
          files: [{
            url: artifactFile,
            sha512: originalLatest.sha512, // This should be recalculated for the specific file
            size: stats.size
          }],
          path: artifactFile,
          sha512: originalLatest.sha512,
          releaseDate: originalLatest.releaseDate || new Date().toISOString()
        };
        
        // Write the update file
        fs.writeFileSync(updateFilePath, stringifySimpleYaml(updateData));
        updateFiles.push(updateFileName);
        
        console.log(`Generated ${updateFileName} for ${artifactFile}`);
      }
    }
  }
  
  // Also create a generic latest-linux.yml that points to AppImage x64 by default
  if (updateFiles.some(f => f.includes('AppImage-x64'))) {
    const appImageUpdate = path.join(outDir, 'latest-linux-AppImage-x64.yml');
    if (fs.existsSync(appImageUpdate)) {
      fs.copyFileSync(appImageUpdate, path.join(outDir, 'latest-linux.yml'));
      console.log('Generated latest-linux.yml (pointing to AppImage x64)');
    }
  }
  
  console.log(`Generated ${updateFiles.length} Linux update files`);
}

/**
 * Get file extension for target type
 */
function getExtensionForTarget(target) {
  switch (target) {
    case 'AppImage': return 'AppImage';
    case 'snap': return 'snap';
    case 'deb': return 'deb';
    case 'rpm': return 'rpm';
    case 'tar.gz': return 'tar\\.gz';
    default: return '.*';
  }
}

module.exports = generateLinuxUpdateFiles;

// If run directly
if (require.main === module) {
  console.error('This script should be called by electron-builder');
  process.exit(1);
}