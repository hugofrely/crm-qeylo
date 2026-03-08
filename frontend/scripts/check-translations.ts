#!/usr/bin/env npx tsx
/**
 * Compares translation keys between FR and EN to find missing translations.
 */
import * as fs from 'fs';
import * as path from 'path';

const messagesDir = path.join(__dirname, '..', 'messages');
const locales = ['fr', 'en'];

function getKeys(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return getKeys(value, fullKey);
    }
    return [fullKey];
  });
}

const allKeys: Record<string, Record<string, string[]>> = {};

for (const locale of locales) {
  const localeDir = path.join(messagesDir, locale);
  if (!fs.existsSync(localeDir)) {
    console.error(`Directory not found: ${localeDir}`);
    process.exit(1);
  }
  const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const namespace = file.replace('.json', '');
    const content = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf-8'));
    allKeys[namespace] = allKeys[namespace] || {};
    allKeys[namespace][locale] = getKeys(content);
  }
}

let hasErrors = false;

for (const [namespace, localeKeys] of Object.entries(allKeys)) {
  const frKeys = new Set(localeKeys['fr'] || []);
  const enKeys = new Set(localeKeys['en'] || []);

  const missingInEn = [...frKeys].filter(k => !enKeys.has(k));
  const missingInFr = [...enKeys].filter(k => !frKeys.has(k));

  if (missingInEn.length > 0) {
    console.error(`\n❌ ${namespace}: Missing in EN:`);
    missingInEn.forEach(k => console.error(`  - ${k}`));
    hasErrors = true;
  }
  if (missingInFr.length > 0) {
    console.error(`\n❌ ${namespace}: Missing in FR:`);
    missingInFr.forEach(k => console.error(`  - ${k}`));
    hasErrors = true;
  }
}

if (!hasErrors) {
  console.log('✅ All translation keys are in sync between FR and EN.');
}

process.exit(hasErrors ? 1 : 0);
