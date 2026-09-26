/**
 * pw_verify_history_panel.cjs
 * Verify that after "remove this object" executes, the History panel
 * (in the bottom dock) shows the tool.remove_object entry.
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  const consoleLogs = [];
  page.on('console', (m) => consoleLogs.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', (e) => consoleLogs.push({ type: 'pageerror', text: e.message }));

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click on Perfume Bottle Hero layer
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    for (const el of els) {
      if ((el.textContent || '').trim() === 'Perfume Bottle Hero') {
        let t = el;
        for (let i = 0; i < 5; i++) {
          if (t.onclick) break;
          t = t.parentElement;
          if (!t) break;
        }
        if (t) t.click();
        return true;
      }
    }
    return false;
  });
  await page.waitForTimeout(500);

  // Submit "remove this object"
  const ta = await page.$('textarea');
  await ta.fill('remove this object');
  await ta.press('Enter');
  await page.waitForTimeout(4000);

  // Find and click the History tab in the bottom dock
  console.log('=== LOOKING FOR HISTORY TAB ===');
  const histTabResult = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('button, div, span'));
    const candidates = [];
    for (const el of allEls) {
      const t = (el.textContent || '').trim();
      if ((t === 'History' || t === 'HISTORY' || t === 'history') && el.offsetParent !== null) {
        candidates.push({ tag: el.tagName, text: t, class: el.className?.toString?.()?.slice(0, 80) || '' });
      }
    }
    return candidates.slice(0, 10);
  });
  console.log(JSON.stringify(histTabResult, null, 2));

  // Click the first "History" candidate
  if (histTabResult.length > 0) {
    await page.evaluate(() => {
      const allEls = Array.from(document.querySelectorAll('button, div, span'));
      for (const el of allEls) {
        const t = (el.textContent || '').trim();
        if ((t === 'History' || t === 'HISTORY') && el.offsetParent !== null) {
          el.click();
          return true;
        }
      }
      return false;
    });
    await page.waitForTimeout(1000);
  }

  // Now look for history content
  console.log('\n=== HISTORY PANEL CONTENT ===');
  const histContent = await page.evaluate(() => {
    // Look for any div containing "tool.remove_object" text
    const allDivs = Array.from(document.querySelectorAll('div'));
    const matches = [];
    for (const d of allDivs) {
      const t = (d.innerText || '');
      if (t.includes('tool.remove_object') || t.includes('Remove Object')) {
        matches.push({ text: t.slice(0, 800), classList: (d.className || '').toString().slice(0, 80) });
      }
    }
    return matches.slice(0, 5);
  });
  console.log('Matches for "tool.remove_object" or "Remove Object":');
  console.log(JSON.stringify(histContent, null, 2));

  // Also look for "Document History Stream"
  console.log('\n=== SEARCH FOR "Document History Stream" ===');
  const histStream = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all) {
      const t = (el.textContent || '').trim();
      if (t.includes('Document History Stream')) {
        // Walk up to find a container with reasonable size
        let c = el;
        for (let i = 0; i < 8; i++) {
          if (c.innerText && c.innerText.length > 100 && c.innerText.length < 3000) {
            return { found: true, text: c.innerText.slice(0, 2000) };
          }
          c = c.parentElement;
          if (!c) break;
        }
      }
    }
    return { found: false };
  });
  console.log(JSON.stringify(histStream, null, 2));

  // Capture the entire bottom dock content for inspection
  console.log('\n=== BOTTOM DOCK TABS ===');
  const bottomTabs = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
    return tabs.filter(t => t.offsetParent !== null).map(t => ({
      text: (t.textContent || '').trim().slice(0, 40),
      class: (t.className || '').toString().slice(0, 100),
    })).filter(t => t.text.length > 0 && t.text.length < 30);
  });
  console.log(JSON.stringify(bottomTabs.slice(0, 20), null, 2));

  // Try clicking each tab labeled "History" or "HISTORY" or "Document History"
  console.log('\n=== TRY CLICKING TABS ===');
  for (const tabText of ['History', 'HISTORY', 'Document History', 'history']) {
    const clicked = await page.evaluate((txt) => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"], div'));
      for (const t of tabs) {
        if ((t.textContent || '').trim() === txt && t.offsetParent !== null) {
          t.click();
          return true;
        }
      }
      return false;
    }, tabText);
    if (clicked) {
      console.log(`  Clicked tab: "${tabText}"`);
      await page.waitForTimeout(800);
      // Re-search for the history content
      const found = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('*'));
        for (const el of all) {
          const t = (el.textContent || '').trim();
          if (t.includes('Document History Stream') || t.includes('tool.remove_object')) {
            return { found: true, text: t.slice(0, 1500) };
          }
        }
        return { found: false };
      });
      if (found.found) {
        console.log('  ✓ Found history content after clicking ' + tabText + ':');
        console.log(found.text);
        break;
      } else {
        console.log('  ✗ No history content found after clicking ' + tabText);
      }
    }
  }

  await browser.close();
})().catch(err => { console.error('FATAL:', err); process.exit(1); });
