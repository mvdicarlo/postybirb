#!/usr/bin/env node

/**
 * Generate a consolidated latest-linux.yml file containing all Linux distributions and architectures
 * This approach creates a single update file that the client can process to find the appropriate update
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Calculate SHA512 hash of a file
 */
function calculateSHA512(filePath) {
  const hash = crypto.createHash('sha512');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('base64');
}

/**
 * Simple YAML stringifier for our update file format
 */
function stringifyUpdateYaml(data) {
  let yaml = `version: ${data.version}\n`;
  yaml += `releaseDate: ${data.releaseDate}\n`;
  yaml += 'artifacts:\n';
  
  for (const artifact of data.artifacts) {
    yaml += `  ${artifact.target}-${artifact.arch}:\n`;
    yaml += `    url: ${artifact.url}\n`;
    yaml += `    sha512: ${artifact.sha512}\n`;
    yaml += `    size: ${artifact.size}\n`;
  }
  
  return yaml;
}

/**
 * Get artifact patterns for target type and architecture
 */
function getArtifactPatterns(target, arch) {
  const patterns = [];
  
  switch (target) {
    case 'AppImage':
      patterns.push(new RegExp(`PostyBirb-.*-linux-${arch}\\.AppImage$`));
      break;
    case 'snap':
      patterns.push(new RegExp(`PostyBirb-.*-linux-snap-${arch}\\.snap$`));
      break;
    case 'deb':
      patterns.push(new RegExp(`PostyBirb-.*-linux-deb-${arch}\\.deb$`));
      break;
    case 'rpm':
      patterns.push(new RegExp(`PostyBirb-.*-linux-rpm-${arch}\\.rpm$`));
      break;
    case 'tar.gz':
      patterns.push(new RegExp(`PostyBirb-.*-linux-${arch}\\.tar\\.gz$`));
      break;
    default:
      patterns.push(new RegExp(`PostyBirb-.*-${target}-${arch}\\.*`));
  }
  
  return patterns;
}

/**
 * Parse the original latest.yml to get version and release date
 */
function parseOriginalLatest(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes(': ')) {
      const [key, value] = trimmed.split(': ', 2);
      if (key === 'version' || key === 'releaseDate') {
        result[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  }
  
  return result;
}

/**
 * Generate consolidated update file for Linux distributions
 */
async function generateLinuxUpdateFiles(context) {
  const { outDir, platformToTargets } = context;
  
  // Get Linux platform targets
  const linuxTargets = platformToTargets.get('linux');
  if (!linuxTargets) {
    console.log('No Linux targets found, skipping Linux update file generation');
    return;
  }

  console.log('Generating consolidated Linux update file...');

  // Find the original latest.yml file (for version/release date)
  const originalLatestPath = path.join(outDir, 'latest.yml');
  let versionInfo = { version: '1.0.0', releaseDate: new Date().toISOString() };
  
  if (fs.existsSync(originalLatestPath)) {
    try {
      versionInfo = parseOriginalLatest(originalLatestPath);
    } catch (error) {
      console.warn('Could not parse original latest.yml, using defaults');
    }
  }
  
  // Collect all Linux artifacts
  const artifacts = [];
  
  for (const target of linuxTargets) {
    const targetName = target.name;
    
    for (const arch of target.archs) {
      const archName = arch.name;
      
      // Skip snap for non-x64 architectures
      if (targetName === 'snap' && archName !== 'x64') {
        continue;
      }
      
      // Find artifacts for this target/arch combination
      const artifactFiles = fs.readdirSync(outDir).filter(file => {
        const expectedPatterns = getArtifactPatterns(targetName, archName);
        return expectedPatterns.some(pattern => pattern.test(file));
      });
      
      for (const artifactFile of artifactFiles) {
        const fullPath = path.join(outDir, artifactFile);
        const stats = fs.statSync(fullPath);
        
        artifacts.push({
          target: targetName,
          arch: archName,
          url: artifactFile,
          sha512: calculateSHA512(fullPath),
          size: stats.size
        });
        
        console.log(`Added ${artifactFile} (${targetName} ${archName}) to update catalog`);
      }
    }
  }
  
  // Create consolidated update file
  const updateData = {
    version: versionInfo.version,
    releaseDate: versionInfo.releaseDate,
    artifacts: artifacts
  };
  
  // Write the consolidated update file
  const latestLinuxPath = path.join(outDir, 'latest-linux.yml');
  fs.writeFileSync(latestLinuxPath, stringifyUpdateYaml(updateData));
  
  console.log(`Generated latest-linux.yml with ${artifacts.length} artifacts`);
}

module.exports = generateLinuxUpdateFiles;

// If run directly
if (require.main === module) {
  console.error('This script should be called by electron-builder');
  process.exit(1);
}