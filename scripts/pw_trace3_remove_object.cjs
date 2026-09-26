/**
 * pw_trace3_remove_object.cjs
 * Targeted test: select Perfume Bottle Hero layer, then run "remove this object".
 * Capture canvas pixels at perfume bottle location before/after.
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => consoleLogs.push({ type: 'pageerror', text: err.message }));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Find the Layer panel and click on "Perfume Bottle Hero"
  console.log('=== CLICKING ON PERFUME BOTTLE HERO LAYER ===');
  const clicked = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('*'));
    for (const el of allEls) {
      const t = (el.textContent || '').trim();
      if (t === 'Perfume Bottle Hero' || (t.startsWith('Perfume Bottle Hero') && t.length < 50)) {
        // Find the clickable parent (usually a div with onClick)
        let target = el;
        for (let i = 0; i < 5; i++) {
          if (target.onclick || target.getAttribute('role') === 'button') break;
          target = target.parentElement;
          if (!target) break;
        }
        if (target) {
          target.click();
          return { clicked: true, text: t, tag: target.tagName };
        }
      }
    }
    return { clicked: false };
  });
  console.log(JSON.stringify(clicked, null, 2));
  await page.waitForTimeout(500);

  // Verify selected layer
  const selected = await page.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/SELECTED:\s*([^\n]+)/);
    return m ? m[1].trim() : null;
  });
  console.log('Selected layer:', selected);

  // Take BEFORE pixel sample
  console.log('\n=== CANVAS PIXELS (BEFORE) ===');
  const before = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const samples = {};
    for (const [name, pt] of Object.entries({
      'topLeftBg': [10, 10],
      'centerBottle': [400, 250],
      'bottleCap': [400, 170],
      'bottleBottom': [400, 340],
      'bottleLeftEdge': [330, 250],
      'bottleRightEdge': [470, 250],
    })) {
      const d = ctx.getImageData(pt[0], pt[1], 1, 1).data;
      samples[name] = [d[0], d[1], d[2], d[3]];
    }
    return samples;
  });
  console.log(JSON.stringify(before, null, 2));

  // Type "remove this object" and submit
  console.log('\n=== SUBMITTING "remove this object" ===');
  const textarea = await page.$('textarea');
  await textarea.fill('remove this object');
  await page.waitForTimeout(200);
  await textarea.press('Enter');
  await page.waitForTimeout(4000);

  // Take AFTER pixel sample
  console.log('\n=== CANVAS PIXELS (AFTER) ===');
  const after = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const samples = {};
    for (const [name, pt] of Object.entries({
      'topLeftBg': [10, 10],
      'centerBottle': [400, 250],
      'bottleCap': [400, 170],
      'bottleBottom': [400, 340],
      'bottleLeftEdge': [330, 250],
      'bottleRightEdge': [470, 250],
    })) {
      const d = ctx.getImageData(pt[0], pt[1], 1, 1).data;
      samples[name] = [d[0], d[1], d[2], d[3]];
    }
    return samples;
  });
  console.log(JSON.stringify(after, null, 2));

  // Check what the AI panel says
  console.log('\n=== AI COPILOT RESPONSE ===');
  const aiResponse = await page.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/Successfully executed[^\n]*/);
    const intentM = text.match(/Detected Intent:[^\n]*/);
    return {
      successMessage: m ? m[0] : null,
      detectedIntent: intentM ? intentM[0] : null,
    };
  });
  console.log(JSON.stringify(aiResponse, null, 2));

  // Now click on the History tab in the bottom dock and check content
  console.log('\n=== LOOKING FOR HISTORY TAB IN BOTTOM DOCK ===');
  const histTab = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button, div'));
    for (const t of tabs) {
      const txt = (t.textContent || '').trim();
      if (txt === 'History' || txt === 'HISTORY') {
        t.click();
        return { clicked: true, text: txt };
      }
    }
    return { clicked: false };
  });
  console.log(JSON.stringify(histTab, null, 2));
  await page.waitForTimeout(1000);

  // Get history panel content
  console.log('\n=== HISTORY PANEL CONTENT ===');
  const histContent = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    for (const d of allDivs) {
      const t = (d.innerText || '');
      if (t.includes('Document History Stream') || t.includes('Operations')) {
        return { found: true, text: t.slice(0, 2000) };
      }
    }
    return { found: false };
  });
  console.log(JSON.stringify(histContent, null, 2));

  // Try undo via the UI button
  console.log('\n=== CLICKING UNDO BUTTON ===');
  const undoClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.title && b.title.includes('Undo')) {
        const wasDisabled = b.disabled;
        b.click();
        return { clicked: true, wasDisabled, title: b.title };
      }
    }
    return { clicked: false };
  });
  console.log(JSON.stringify(undoClicked, null, 2));
  await page.waitForTimeout(2000);

  // Take POST-UNDO pixel sample
  console.log('\n=== CANVAS PIXELS (POST-UNDO) ===');
  const postUndo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const samples = {};
    for (const [name, pt] of Object.entries({
      'topLeftBg': [10, 10],
      'centerBottle': [400, 250],
      'bottleCap': [400, 170],
      'bottleBottom': [400, 340],
    })) {
      const d = ctx.getImageData(pt[0], pt[1], 1, 1).data;
      samples[name] = [d[0], d[1], d[2], d[3]];
    }
    return samples;
  });
  console.log(JSON.stringify(postUndo, null, 2));

  // Pixel diff summary
  console.log('\n=== PIXEL DIFF SUMMARY ===');
  for (const k of Object.keys(before)) {
    const b = before[k];
    const a = after[k];
    const u = postUndo[k];
    const changedAfter = JSON.stringify(b) !== JSON.stringify(a);
    const changedUndo = JSON.stringify(a) !== JSON.stringify(u);
    const restoredToBefore = JSON.stringify(b) === JSON.stringify(u);
    console.log(`  ${k}: before=${b.join(',')} after=${a.join(',')} postUndo=${u ? u.join(',') : 'N/A'} | afterChanged=${changedAfter} undoChanged=${changedUndo} restored=${restoredToBefore}`);
  }

  // Print last 20 console logs
  console.log('\n=== CONSOLE LOGS (last 20) ===');
  console.log(consoleLogs.slice(-20).map(l => `[${l.type}] ${l.text}`).join('\n'));

  await browser.close();
})().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
