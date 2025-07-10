import { Logger } from '@postybirb/logger';
import { IsTestEnvironment } from '@postybirb/utils/electron';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { Sharp } from 'sharp';

const logger = Logger();

/**
 * Configures Sharp environment for Electron production builds.
 * This must be called before any Sharp imports.
 */
export function configureSharpEnvironment(): void {
  if (IsTestEnvironment()) {
    return; // Skip configuration in test environment
  }

  // Force Sharp to use bundled binaries in production
  process.env.SHARP_IGNORE_GLOBAL_LIBVIPS = 'true';
  process.env.SHARP_FORCE_GLOBAL_LIBVIPS = 'false';

  // In Electron production, set the library path for Sharp's native modules
  if (process.type === 'browser' && process.env.NODE_ENV === 'production') {
    configureLibraryPaths();
  }
}

function configureLibraryPaths(): void {
  const appPath = process.resourcesPath || process.cwd();
  
  // Check for sharp-config.json created by afterPack script
  const configPath = join(appPath, 'sharp-config.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      const libPaths = config.libPaths || [];
      
      // Add all configured Sharp lib paths to LD_LIBRARY_PATH
      const currentLdPath = process.env.LD_LIBRARY_PATH || '';
      const allLibPaths = [...libPaths, currentLdPath].filter(Boolean).join(':');
      process.env.LD_LIBRARY_PATH = allLibPaths;
      
      logger.info(`Configured Sharp library paths from config: ${libPaths.join(', ')}`);
      return;
    } catch (error) {
      logger.warn('Failed to read sharp-config.json, falling back to default paths', error);
    }
  }
  
  // Fallback to default Sharp library paths
  const sharpLibPaths = [
    join(appPath, 'app.asar.unpacked', 'node_modules', '@img', 'sharp-libvips-linux-x64', 'lib'),
    join(appPath, 'app.asar.unpacked', 'node_modules', '@img', 'sharp-libvips-linuxmusl-x64', 'lib'),
    join(appPath, 'sharp-libvips'),
    join(appPath, 'sharp-libvips-musl')
  ].filter(path => existsSync(path));
  
  if (sharpLibPaths.length > 0) {
    const currentLdPath = process.env.LD_LIBRARY_PATH || '';
    const newLdPath = [...sharpLibPaths, currentLdPath].filter(Boolean).join(':');
    process.env.LD_LIBRARY_PATH = newLdPath;
    
    logger.info(`Configured Sharp library paths: ${sharpLibPaths.join(', ')}`);
  } else {
    logger.warn('No Sharp library paths found during configuration');
  }
}

/**
 * Loads Sharp with proper error handling and fallback.
 * Use this instead of importing Sharp directly.
 */
export async function loadSharp() {
  try {
    const sharp = await import('sharp');
    logger.info('Sharp loaded successfully');
    return sharp.default;
  } catch (error) {
    logger.error('Failed to load Sharp module', error?.toString());
    throw new Error(`Sharp module failed to load: ${error?.toString()}`);
  }
}

/**
 * Creates a Sharp instance with proper error handling.
 * Use this for creating Sharp instances throughout the application.
 */
export async function createSharpInstance(input?: Buffer | string): Promise<Sharp> {
  const sharp = await loadSharp();
  return sharp(input);
}

/**
 * Gets Sharp metadata with proper error handling.
 */
export async function getSharpMetadata(input: Buffer | string) {
  const sharpInstance = await createSharpInstance(input);
  return sharpInstance.metadata();
}