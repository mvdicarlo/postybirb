const fs = require('fs');
const path = require('path');

/**
 * AfterPack script for electron-builder to handle Sharp native libraries on Linux
 * This ensures Sharp's libvips libraries are properly available in the packaged app
 */
exports.default = async function afterPack(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  
  console.log('Running afterPack script...');
  console.log(`Platform: ${electronPlatformName}, OutDir: ${appOutDir}`);
  
  // Only process Linux builds
  if (electronPlatformName !== 'linux') {
    console.log('Skipping afterPack for non-Linux platform');
    return;
  }
  
  try {
    // Ensure Sharp libraries are accessible
    await setupSharpLibraries(appOutDir);
    console.log('Sharp libraries setup completed successfully');
  } catch (error) {
    console.error('Error in afterPack Sharp setup:', error);
    throw error;
  }
};

async function setupSharpLibraries(appOutDir) {
  const resourcesDir = path.join(appOutDir, 'resources');
  const asarUnpackedDir = path.join(resourcesDir, 'app.asar.unpacked');
  const sharpNodeModulesDir = path.join(asarUnpackedDir, 'node_modules', '@img');
  
  console.log('Checking Sharp libraries in:', sharpNodeModulesDir);
  
  if (!fs.existsSync(sharpNodeModulesDir)) {
    console.log('Sharp node_modules directory not found, checking alternate locations...');
    return;
  }
  
  // Find Sharp libvips directories
  const sharpDirs = fs.readdirSync(sharpNodeModulesDir)
    .filter(dir => dir.startsWith('sharp-libvips-linux'))
    .map(dir => path.join(sharpNodeModulesDir, dir));
  
  console.log('Found Sharp directories:', sharpDirs);
  
  for (const sharpDir of sharpDirs) {
    const libDir = path.join(sharpDir, 'lib');
    if (fs.existsSync(libDir)) {
      console.log(`Verifying Sharp libraries in: ${libDir}`);
      
      const libFiles = fs.readdirSync(libDir).filter(file => file.endsWith('.so') || file.includes('.so.'));
      console.log(`Found library files: ${libFiles.join(', ')}`);
      
      // Verify libraries are readable
      for (const libFile of libFiles) {
        const libPath = path.join(libDir, libFile);
        const stats = fs.statSync(libPath);
        console.log(`Library ${libFile}: size=${stats.size}, mode=${stats.mode.toString(8)}`);
      }
    }
  }
  
  // Create a sharp-loader configuration file
  const configPath = path.join(resourcesDir, 'sharp-config.json');
  const config = {
    libPaths: sharpDirs.map(dir => path.join(dir, 'lib')),
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Created Sharp configuration file:', configPath);
}