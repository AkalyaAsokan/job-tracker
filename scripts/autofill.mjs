/**
 * Auto-fill job applications in Chrome.
 * Usage: node scripts/autofill.mjs <url1> <url2> ...
 *
 * Strategy: Launch Chrome as a fully independent process, connect via CDP,
 * fill forms, then DISCONNECT (not close) — Chrome stays open after script exits.
 *
 * Handles: Greenhouse (+ branded like stripe.com?gh_jid=), Lever
 * Opens but does NOT auto-fill: LinkedIn, Google, Amazon, and other custom portals
 * NEVER submits.
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { spawn, execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profile = JSON.parse(
  readFileSync(path.join(__dirname, '../config/profile.json'), 'utf8')
).personal;

const CHROME_PATH   = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT    = 9333; // use a non-standard port to avoid conflicts
const TEMP_PROFILE  = `/tmp/job-tracker-chrome-${Date.now()}`;

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error('No URLs provided.');
  process.exit(1);
}

// ─── Launch Chrome independently ─────────────────────────────────────────────

async function launchChrome() {
  console.log('  Launching Chrome…');

  // Kill any previous instance on our debug port
  try { execSync(`lsof -ti:${DEBUG_PORT} | xargs kill -9 2>/dev/null || true`); } catch {}
  await new Promise(r => setTimeout(r, 400));

  // Spawn Chrome as a detached process (completely independent)
  const proc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${TEMP_PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--start-maximized',
    'about:blank',
  ], {
    detached: true,
    stdio:    'ignore',
  });
  proc.unref(); // fully detach — Chrome outlives this script

  // Poll until Chrome's CDP endpoint is ready (up to 15s)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`, { timeout: 1000 });
      console.log('  Chrome ready.\n');
      return browser;
    } catch {}
  }
  throw new Error('Could not connect to Chrome after launch');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function safeFill(page, selector, value) {
  try {
    const el = page.locator(selector).first();
    if (await el.count() > 0) { await el.fill(value); return true; }
  } catch {}
  return false;
}

// ─── ATS detection ───────────────────────────────────────────────────────────

function detectAts(url, pageContent) {
  if (url.includes('greenhouse.io'))  return 'greenhouse';
  if (url.includes('lever.co'))       return 'lever';
  if (url.includes('linkedin.com'))   return 'linkedin';
  // Branded Greenhouse (stripe.com?gh_jid=, airbnb.com, anthropic.com, etc.)
  if (url.includes('gh_jid=') || pageContent.includes('greenhouse-job-board') ||
      pageContent.includes('boards.greenhouse.io') || pageContent.includes('Greenhouse'))
    return 'greenhouse';
  // Branded Lever
  if (pageContent.includes('jobs.lever.co') || pageContent.includes('lever-job'))
    return 'lever';
  return 'unknown';
}

// ─── Greenhouse ───────────────────────────────────────────────────────────────

async function fillGreenhouse(page) {
  console.log('    → Greenhouse detected');

  // Click apply button if present
  const applyBtn = page.locator('a:has-text("Apply for this Job"), a:has-text("Apply Now"), button:has-text("Apply")').first();
  if (await applyBtn.count() > 0) {
    await applyBtn.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
  }

  // Wait for first name field
  await page.waitForSelector('#first_name, input[name="job_application[first_name]"]', { timeout: 8000 })
    .catch(() => {});

  // Standard Greenhouse field IDs
  await safeFill(page, '#first_name', profile.firstName);
  await safeFill(page, '#last_name',  profile.lastName);
  await safeFill(page, '#email',      profile.email);
  await safeFill(page, '#phone',      profile.phone);

  // Long-form field names (some GH boards)
  await safeFill(page, 'input[name="job_application[first_name]"]', profile.firstName);
  await safeFill(page, 'input[name="job_application[last_name]"]',  profile.lastName);
  await safeFill(page, 'input[name="job_application[email]"]',      profile.email);
  await safeFill(page, 'input[name="job_application[phone]"]',      profile.phone);

  // Resume upload
  const resumeInput = page.locator('input[type="file"]').first();
  if (await resumeInput.count() > 0) {
    await resumeInput.setInputFiles(profile.resumePath).catch(e =>
      console.log('    ⚠ Resume upload failed:', e.message)
    );
  }

  // Scan all text/url inputs for LinkedIn, GitHub, website
  const inputs = await page.locator('input[type="text"], input[type="url"]').all();
  for (const input of inputs) {
    const id          = (await input.getAttribute('id')          || '').toLowerCase();
    const placeholder = (await input.getAttribute('placeholder') || '').toLowerCase();
    const label       = (await input.getAttribute('aria-label')  || '').toLowerCase();
    const all         = `${id} ${placeholder} ${label}`;

    if (all.includes('linkedin'))              await input.fill(profile.linkedin).catch(() => {});
    else if (all.includes('github'))           await input.fill(profile.github).catch(() => {});
    else if (all.includes('website') || all.includes('portfolio'))
                                               await input.fill(profile.linkedin).catch(() => {});
  }

  console.log('    ✓ Form filled — review and submit');
}

// ─── Lever ───────────────────────────────────────────────────────────────────

async function fillLever(page) {
  console.log('    → Lever detected');

  if (!page.url().includes('/apply')) {
    const applyBtn = page.locator('a:has-text("Apply for this job"), a[href*="/apply"]').first();
    if (await applyBtn.count() > 0) {
      await applyBtn.click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  await page.waitForSelector('input[name="name"], input[placeholder*="Full name"]', { timeout: 8000 })
    .catch(() => {});

  await safeFill(page, 'input[name="name"]',             `${profile.firstName} ${profile.lastName}`);
  await safeFill(page, 'input[name="email"]',            profile.email);
  await safeFill(page, 'input[name="phone"]',            profile.phone);
  await safeFill(page, 'input[name="urls[LinkedIn]"]',   profile.linkedin);
  await safeFill(page, 'input[name="urls[GitHub]"]',     profile.github);
  await safeFill(page, 'input[name="urls[Portfolio]"]',  profile.linkedin);

  const resumeInput = page.locator('input[type="file"]').first();
  if (await resumeInput.count() > 0) {
    await resumeInput.setInputFiles(profile.resumePath).catch(e =>
      console.log('    ⚠ Resume upload failed:', e.message)
    );
  }

  console.log('    ✓ Form filled — review and submit');
}

// ─── LinkedIn ────────────────────────────────────────────────────────────────

async function handleLinkedIn(page) {
  console.log('    → LinkedIn — checking for Easy Apply…');
  await page.waitForLoadState('networkidle').catch(() => {});

  const easyApply = page.locator('button:has-text("Easy Apply")').first();
  if (await easyApply.count() > 0) {
    await easyApply.click();
    await new Promise(r => setTimeout(r, 1500));
    await safeFill(page, 'input[id*="phoneNumber"]',    profile.phone);
    await safeFill(page, 'input[aria-label*="Phone"]',  profile.phone);
    console.log('    ✓ Easy Apply modal opened — continue and submit manually');
  } else {
    const applyBtn = page.locator('a:has-text("Apply on company website"), a.apply-button').first();
    if (await applyBtn.count() > 0) {
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 10000 }),
        applyBtn.click(),
      ]).catch(() => [null]);

      if (newPage) {
        await newPage.waitForLoadState('domcontentloaded').catch(() => {});
        const newUrl     = newPage.url();
        const newContent = await newPage.content();
        const ats        = detectAts(newUrl, newContent);
        console.log(`    → Redirected to ${new URL(newUrl).hostname} [${ats}]`);
        if (ats === 'greenhouse') await fillGreenhouse(newPage);
        else if (ats === 'lever') await fillLever(newPage);
        else console.log('    ℹ Company portal opened — fill manually');
      }
    } else {
      console.log('    ℹ No Easy Apply button found — fill manually');
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 Opening ${urls.length} job application(s)…`);
  console.log('⚠️  NOTHING will be submitted automatically — review each tab before applying.\n');

  const browser = await launchChrome();

  // Get or create a context
  const contexts = browser.contexts();
  const ctx = contexts.length > 0 ? contexts[0] : await browser.newContext({ viewport: null, acceptDownloads: true });

  // Close the blank tab that Chrome opens by default
  const existingPages = ctx.pages();
  if (existingPages.length === 1 && (await existingPages[0].url()) === 'about:blank') {
    // keep it — we'll reuse or close after opening job tabs
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] ${url.slice(0, 80)}…`);

    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const currentUrl = page.url();
      const content    = await page.content();
      const ats = detectAts(currentUrl, content) !== 'unknown'
        ? detectAts(currentUrl, content)
        : detectAts(url, content);

      if (ats === 'greenhouse')        await fillGreenhouse(page);
      else if (ats === 'lever')        await fillLever(page);
      else if (ats === 'linkedin')     await handleLinkedIn(page);
      else console.log(`    ℹ ${new URL(currentUrl).hostname} — fill manually`);
    } catch (err) {
      console.error(`    ✗ Error: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 600));
  }

  // Close the initial blank tab if job tabs were opened
  try {
    const blank = ctx.pages().find(p => p.url() === 'about:blank');
    if (blank) await blank.close();
  } catch {}

  console.log('\n✅ Done! Chrome windows are open — review each, complete missing fields, and submit when ready.');

  // DISCONNECT (not close) — Chrome process stays alive independently
  await browser.close(); // on CDP-connected browsers this disconnects, not kills Chrome
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
