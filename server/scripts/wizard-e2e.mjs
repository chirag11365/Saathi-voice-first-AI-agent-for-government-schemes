import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SAATHI_BASE_URL || 'http://localhost:5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByTestId('language-hi').click();
  await page.getByTestId('language-next').click();
  await page.getByTestId('option-farmer').click();
  await page.getByTestId('next-step').click();
  await page.getByTestId('option-age41to59').click();
  await page.getByTestId('next-step').click();
  await page.locator('#state-choice').fill('Bihar');
  await page.getByTestId('next-step').click();
  await page.getByTestId('option-under1L').click();
  await page.getByTestId('next-step').click();
  await page.getByTestId('option-land2to5').click();
  await page.getByTestId('see-my-schemes').click();

  const card = page.getByTestId('scheme-pm-kisan');
  await card.waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await card.getAttribute('data-scheme-name'), 'PM-KISAN');
  assert.deepEqual(pageErrors, [], 'the wizard flow should not throw browser errors');
  console.log('PASS: Hindi farmer wizard reaches PM-KISAN schemes card.');
} finally {
  await browser.close();
}
