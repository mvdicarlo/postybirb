import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_FILES = [
  'apps/postybirb-ui/src/app-insights-ui.ts',
  'libs/logger/src/lib/app-insights.ts',
];
const PLACEHOLDER_STATEMENT = 'const appInsightsConnectionString: string | null = null;';
const STATEMENT_REGEX = /const appInsightsConnectionString(?::\s*string\s*\|\s*null)?\s*=\s*[^;]+;/;

const shouldClear = process.argv.includes('--clear');
const appInsightsKey = process.env.APP_INSIGHTS_KEY?.trim();

if (!shouldClear && !appInsightsKey) {
  console.log('[inject-app-insights] APP_INSIGHTS_KEY not provided; skipping.');
  process.exit(0);
}

const replacementStatement = shouldClear
  ? PLACEHOLDER_STATEMENT
  : `const appInsightsConnectionString: string | null = ${JSON.stringify(appInsightsKey)};`;

/**
 * @param {string} relativePath
 */
function updateFile(relativePath) {
  const filePath = path.join(ROOT_DIR, relativePath);
  const originalContent = fs.readFileSync(filePath, 'utf8');

  if (!STATEMENT_REGEX.test(originalContent)) {
    throw new Error(
      `[inject-app-insights] Could not find placeholder in ${relativePath}.`,
    );
  }

  const updatedContent = originalContent.replace(
    STATEMENT_REGEX,
    replacementStatement,
  );

  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log(
    `[inject-app-insights] ${
      shouldClear ? 'Cleared placeholder' : 'Injected key'
    } in ${relativePath}.`,
  );
}

TARGET_FILES.forEach(updateFile);
