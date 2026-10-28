import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const picker = page.locator('#apk-fold-language-picker select');
  await picker.waitFor({ state: 'attached', timeout: 15000 });

  await picker.selectOption('en');
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  const key = await page.evaluate(() =>
    Object.keys(localStorage).find((name) => name.startsWith('apk-fold.language.')) || null
  );
  assert.ok(key, 'language preference should be stored in localStorage');
  assert.equal(await page.evaluate((name) => localStorage.getItem(name), key), 'en');

  await page.evaluate(() => {
    const dynamicLabel = document.createElement('span');
    dynamicLabel.id = 'i18n-smoke-dynamic';
    dynamicLabel.textContent = 'Réglages';
    document.body.append(dynamicLabel);

    const userContent = document.createElement('span');
    userContent.id = 'i18n-smoke-user-content';
    userContent.className = 'doc-title';
    userContent.textContent = 'Réglages';
    document.body.append(userContent);
  });

  await page.waitForFunction(() =>
    document.getElementById('i18n-smoke-dynamic')?.textContent === 'Settings'
  );
  assert.equal(await page.locator('#i18n-smoke-user-content').textContent(), 'Réglages',
    'user-authored content must not be automatically translated');

  await picker.selectOption('fr');
  await page.waitForFunction(() => document.documentElement.lang === 'fr');
  await page.waitForFunction(() =>
    document.getElementById('i18n-smoke-dynamic')?.textContent === 'Réglages'
  );
  assert.equal(await page.evaluate((name) => localStorage.getItem(name), key), 'fr');
  console.log('i18n smoke test passed: selector, persistence, dynamic UI, and user content');
} finally {
  await browser.close();
}
