/**
 * pw_a6_verify.cjs
 * Browser verification for A6 final fix.
 *   Test A: "make design futuristic" → completed_noop, no false mutation message
 *   Test B: "Move the selected layer 50 pixels to the right" → completed, mutation
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

  // Select the Perfume Bottle Hero layer
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

  // ====================================================================
  // TEST A — "make design futuristic" → completed_noop
  // ====================================================================
  console.log('========================================');
  console.log('TEST A: "make design futuristic"');
  console.log('========================================');

  const ta = await page.$('textarea');
  await ta.fill('make design futuristic');
  await ta.press('Enter');
  await page.waitForTimeout(4000);

  // Capture AI panel response
  const testAResult = await page.evaluate(() => {
    const text = document.body.innerText;
    const successMsg = text.match(/Successfully executed[^\n]*/);
    const canvasUpdatedMsg = text.match(/Canvas & Document updated[^\n]*/);
    const analysisCompleteMsg = text.match(/Analysis complete[^\n]*/);
    const noDocChangesMsg = text.match(/no document changes[^\n]*/i);
    return {
      hasFalseSuccessMessage: !!successMsg,
      falseSuccessMessage: successMsg ? successMsg[0] : null,
      hasCanvasUpdatedMessage: !!canvasUpdatedMsg,
      canvasUpdatedMessage: canvasUpdatedMsg ? canvasUpdatedMsg[0] : null,
      hasAnalysisCompleteMessage: !!analysisCompleteMsg,
      analysisCompleteMessage: analysisCompleteMsg ? analysisCompleteMsg[0] : null,
      hasNoDocChangesMessage: !!noDocChangesMsg,
      noDocChangesMessage: noDocChangesMsg ? noDocChangesMsg[0] : null,
    };
  });
  console.log('Result:', JSON.stringify(testAResult, null, 2));

  const testAPass =
    !testAResult.hasFalseSuccessMessage &&
    !testAResult.hasCanvasUpdatedMessage &&
    testAResult.hasAnalysisCompleteMessage;
  console.log(`\nTest A ${testAPass ? 'PASS' : 'FAIL'}: ${testAPass
    ? 'No false "Successfully executed" / "Canvas & Document updated"; "Analysis complete" message shown.'
    : 'A6 contract violated.'}`);

  // ====================================================================
  // TEST B — Real mutation: "Move the selected layer 50 pixels to the right"
  // ====================================================================
  console.log('\n========================================');
  console.log('TEST B: "Move the selected layer 50 pixels to the right"');
  console.log('========================================');

  // Capture layer position BEFORE
  const beforePos = await page.evaluate(() => {
    const text = document.body.innerText;
    // Look for "Perfume Bottle Hero (X, Y)" in the layer panel
    const m = text.match(/Perfume Bottle Hero \((\d+),\s*(\d+)\)/);
    return m ? { x: parseInt(m[1], 10), y: parseInt(m[2], 10) } : null;
  });
  console.log('Layer position BEFORE:', JSON.stringify(beforePos));

  const ta2 = await page.$('textarea');
  await ta2.fill('Move the selected layer 50 pixels to the right.');
  await ta2.press('Enter');
  await page.waitForTimeout(4000);

  // Capture layer position AFTER
  const afterPos = await page.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/Perfume Bottle Hero \((\d+),\s*(\d+)\)/);
    return m ? { x: parseInt(m[1], 10), y: parseInt(m[2], 10) } : null;
  });
  console.log('Layer position AFTER: ', JSON.stringify(afterPos));

  // Capture AI panel message
  const testBResult = await page.evaluate(() => {
    const text = document.body.innerText;
    const successMsg = text.match(/Successfully executed[^\n]*/);
    const analysisCompleteMsg = text.match(/Analysis complete[^\n]*/);
    return {
      hasSuccessMessage: !!successMsg,
      successMessage: successMsg ? successMsg[0] : null,
      hasAnalysisCompleteMessage: !!analysisCompleteMsg,
    };
  });
  console.log('Result:', JSON.stringify(testBResult, null, 2));

  const moved = beforePos && afterPos && (afterPos.x - beforePos.x) === 50;
  // Test B passes if:
  //   1. Layer actually moved +50px (real mutation occurred)
  //   2. "Successfully executed" message is present (mutation correctly reported)
  // Note: We do NOT check absence of "Analysis complete" because Test A's
  // message persists in the conversation history. The contract is "real
  // mutation → success message + visible change", both of which are verified.
  const testBPass = moved && testBResult.hasSuccessMessage;
  console.log(`\nLayer moved by +50px: ${moved ? 'YES' : 'NO'}`);
  console.log(`Test B ${testBPass ? 'PASS' : 'FAIL'}: ${testBPass
    ? 'Real mutation produced "Successfully executed" message and layer moved +50px.'
    : 'Real mutation contract violated.'}`);

  // ====================================================================
  // FINAL REPORT
  // ====================================================================
  console.log('\n========================================');
  console.log('FINAL A6 VERIFICATION REPORT');
  console.log('========================================');
  console.log(`Test A (A6 no-op): ${testAPass ? 'PASS' : 'FAIL'}`);
  console.log(`Test B (real mutation): ${testBPass ? 'PASS' : 'FAIL'}`);
  console.log(`Overall: ${(testAPass && testBPass) ? 'PASS — A6 CONTRACT SATISFIED' : 'FAIL'}`);

  // Print last 10 console logs for diagnostics
  console.log('\n=== Last 10 console logs ===');
  console.log(consoleLogs.slice(-10).map(l => `[${l.type}] ${l.text}`).join('\n'));

  await browser.close();
  process.exit((testAPass && testBPass) ? 0 : 1);
})().catch(err => { console.error('FATAL:', err); process.exit(1); });
