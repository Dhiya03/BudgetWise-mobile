import fs from 'fs';
import path from 'path';

const i18nDir = path.join(process.cwd(), 'public', 'i18n');
const baseLang = 'en';
const otherLangs = ['hi', 'ta', 'te', 'kn', 'ml'];

const LENGTH_THRESHOLD_PERCENT = 2.0; // 200%
const MIN_BASE_LENGTH = 15; // Only check strings longer than this

let hasErrors = false;

try {
  const baseContent = JSON.parse(fs.readFileSync(path.join(i18nDir, `${baseLang}.json`), 'utf-8'));

  for (const lang of otherLangs) {
    console.log(`\nValidating ${lang}.json against ${baseLang}.json...`);
    const langFilePath = path.join(i18nDir, `${lang}.json`);

    if (!fs.existsSync(langFilePath)) {
      console.warn(`  - ⚠️  File not found: ${langFilePath}`);
      continue;
    }

    const langContent = JSON.parse(fs.readFileSync(langFilePath, 'utf-8'));

    for (const key in baseContent) {
      if (Object.prototype.hasOwnProperty.call(baseContent, key)) {
        const baseValue = baseContent[key];
        const langValue = langContent[key];

        if (typeof baseValue === 'string' && typeof langValue === 'string') {
          if (baseValue.length > MIN_BASE_LENGTH && langValue.length > baseValue.length * LENGTH_THRESHOLD_PERCENT) {
            console.warn(`  - ⚠️  [${lang}] Key "${key}" is too long:`);
            console.warn(`    - EN (${baseValue.length} chars): "${baseValue}"`);
            console.warn(`    - ${lang.toUpperCase()} (${langValue.length} chars): "${langValue}"`);
            hasErrors = true;
          }
        }
      }
    }
  }

  if (!hasErrors) {
    console.log('\n✅ All translation lengths are within acceptable limits.');
  } else {
    console.error('\n❌ Found potential layout issues due to long translations.');
    process.exit(1);
  }
} catch (error) {
  console.error('Error validating translations:', error);
  process.exit(1);
}
