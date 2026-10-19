import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:3000/vendor/deliveries/book', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
});
await page.getByText('Vehicle Type').first().waitFor({ timeout: 30000 });
const combos = await page.getByRole('combobox').allInnerTexts();
const trigger = page.getByRole('combobox').filter({ hasText: /Bike/ }).first();
await trigger.click();
const options = await page.getByRole('option').allInnerTexts();
const body = await page.locator('body').innerText();
console.log(JSON.stringify({ url: page.url(), combos, options, has49: body.includes('₹49'), has10: body.includes('10 min') }, null, 2));
await browser.close();
