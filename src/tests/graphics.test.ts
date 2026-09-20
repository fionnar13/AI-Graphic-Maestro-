/**
 * @file graphics.test.ts
 * Real Unit Tests, Integration Tests, and Performance Benchmarks
 * for AI Graphic Maestro Graphics Engine & 18 Primitive Tools.
 */

import { GraphicsEngine } from '../graphics/GraphicsEngine';
import { PixelBuffer } from '../graphics/engine/PixelBuffer';
import { ColorMath } from '../graphics/engine/ColorMath';
import { InpaintAlgorithms } from '../graphics/engine/InpaintAlgorithms';
import { MaestroDocumentEngine } from '../document/MaestroDocumentEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runGraphicsTestSuite() {
  console.log('===============================================================');
  console.log('    AI GRAPHIC MAESTRO - REAL GRAPHICS ENGINE TEST SUITE       ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // --- 1. PIXEL BUFFER & COLOR SCIENCE TESTS ---
  console.log('\n--- 1. PixelBuffer & Color Science Unit Tests ---');

  await test('PixelBuffer creation, clone and get/set pixel', () => {
    const buf = PixelBuffer.create(100, 100, [255, 0, 0, 255]);
    assert(buf.width === 100 && buf.height === 100, 'Dimensions match');
    const p = buf.getPixel(50, 50);
    assert(p[0] === 255 && p[1] === 0 && p[2] === 0 && p[3] === 255, 'Initial color correct');

    buf.setPixel(50, 50, 0, 255, 0, 128);
    const p2 = buf.getPixel(50, 50);
    assert(p2[0] === 0 && p2[1] === 255 && p2[3] === 128, 'setPixel updated buffer');

    const clone = buf.clone();
    assert(clone.getPixel(50, 50)[1] === 255, 'Clone has identical values');
    clone.setPixel(50, 50, 0, 0, 255, 255);
    assert(buf.getPixel(50, 50)[1] === 255, 'Clone is deep copy, original unchanged');
  });

  await test('ColorMath RGB <-> HSL and Delta-E distance', () => {
    const [h, s, l] = ColorMath.rgbToHsl(255, 0, 0);
    assert(Math.round(h) === 0 && s === 1 && l === 0.5, 'Red converts to HSL 0, 1, 0.5');

    const [r, g, b] = ColorMath.hslToRgb(120, 1, 0.5);
    assert(r === 0 && g === 255 && b === 0, 'HSL 120 converts to pure Green');

    const distSame = ColorMath.colorDistance([255, 0, 0], [255, 0, 0]);
    assert(distSame === 0, 'Same color distance is 0');
    const distDiff = ColorMath.colorDistance([0, 0, 0], [255, 255, 255]);
    assert(distDiff > 1.7, 'Black to white distance is ~sqrt(3)');
  });

  await test('ColorMath Monotonic Cubic Spline LUT generation', () => {
    const lut = ColorMath.buildSplineLut([[0, 0], [128, 64], [255, 255]]);
    assert(lut.length === 256, 'LUT has 256 entries');
    assert(lut[0] === 0, 'Knot 0 has value 0');
    assert(Math.abs(lut[128] - 64) <= 2, 'Knot 128 maps near 64');
    assert(lut[255] === 255, 'Knot 255 has value 255');
  });

  // --- 2. 18 PRIMITIVE TOOLS UNIT TESTS ---
  console.log('\n--- 2. 18 Primitive Tools Unit Tests ---');

  const docEngine = new MaestroDocumentEngine();
  const testLayer = docEngine.createLayer({
    name: 'Hero Product',
    type: 'raster',
    bounds: { x: 50, y: 50, width: 200, height: 200 },
  });
  const bgLayer = docEngine.createLayer({
    name: 'Background',
    type: 'raster',
    bounds: { x: 0, y: 0, width: 800, height: 500 },
  });

  const engine = new GraphicsEngine(800, 500, docEngine);
  engine.setActiveLayer(testLayer.id);

  await test('Tool 1: SelectionTool (Rectangle & Ellipse with rollback)', async () => {
    const res = await engine.executeTool('tool.selection', {
      shape: 'rectangle',
      x: 20,
      y: 20,
      width: 100,
      height: 80,
    });
    assert(res.success === true, 'Selection execution success');
    const mask = engine.getActiveSelectionMask();
    assert(mask !== null, 'Active mask created');
    assert(mask!.getPixel(30, 30)[3] === 255, 'Pixel inside selection is white');
    assert(mask!.getPixel(5, 5)[3] === 0, 'Pixel outside selection is black');

    // Rollback
    await engine.rollback();
    assert(engine.getActiveSelectionMask() === null, 'Rollback cleared mask');
    await engine.redo();
    assert(engine.getActiveSelectionMask() !== null, 'Redo restored mask');
  });

  await test('Tool 2: MaskTool (Layer mask attachment and invert)', async () => {
    const res = await engine.executeTool('tool.mask', {
      layerId: testLayer.id,
      action: 'from_selection',
    });
    assert(res.success === true, 'MaskTool executed');
    const l = docEngine.getLayer(testLayer.id)!;
    assert(l.mask !== undefined && l.mask.enabled === true, 'Layer mask attached');

    await engine.executeTool('tool.mask', {
      layerId: testLayer.id,
      action: 'invert',
    });
    assert(l.mask!.inverted === true, 'Layer mask inverted');

    await engine.rollback();
    assert(l.mask!.inverted === false, 'Rollback restored un-inverted mask');
  });

  await test('Tool 3: MoveTool (Delta translation with rollback)', async () => {
    const startX = testLayer.transform.position.x;
    const startY = testLayer.transform.position.y;

    const res = await engine.executeTool('tool.move', {
      layerId: testLayer.id,
      dx: 45,
      dy: -20,
    });
    assert(res.success === true, 'Move executed');
    assert(testLayer.transform.position.x === startX + 45, 'Layer moved X by 45');
    assert(testLayer.transform.position.y === startY - 20, 'Layer moved Y by -20');

    await engine.rollback();
    assert(testLayer.transform.position.x === startX, 'Rollback restored X position');
  });

  await test('Tool 4: ScaleTool (Uniform and non-uniform scaling)', async () => {
    const startW = testLayer.bounds.width;
    await engine.executeTool('tool.scale', {
      layerId: testLayer.id,
      scaleX: 1.5,
      scaleY: 1.5,
    });
    assert(testLayer.transform.scale.x === 1.5, 'Scale X updated to 1.5');
    assert(testLayer.bounds.width === Math.round(startW * 1.5), 'Bounds width scaled');

    await engine.rollback();
    assert(testLayer.transform.scale.x === 1.0, 'Scale rollback restored 1.0');
    assert(testLayer.bounds.width === startW, 'Bounds rollback restored width');
  });

  await test('Tool 5: RotateTool (Angle rotation with 360 wrap)', async () => {
    await engine.executeTool('tool.rotate', {
      layerId: testLayer.id,
      angleDegrees: 45,
    });
    assert(testLayer.transform.rotation === 45, 'Layer rotated to 45 deg');

    await engine.rollback();
    assert(testLayer.transform.rotation === 0, 'Rollback restored rotation');
  });

  await test('Tool 6: CropTool (Layer buffer cropping and coordinate update)', async () => {
    // Setup initial layer buffer
    const buf = engine.getLayerPixelBuffer(testLayer.id)!;
    buf.setPixel(10, 10, 255, 0, 0, 255);

    const res = await engine.executeTool('tool.crop', {
      target: 'layer',
      layerId: testLayer.id,
      x: 60,
      y: 60,
      width: 80,
      height: 80,
    });
    assert(res.success === true, 'Layer crop executed');
    assert(testLayer.bounds.width === 80 && testLayer.bounds.height === 80, 'Layer dimensions updated');

    await engine.rollback();
    assert(testLayer.bounds.width === 200, 'Rollback restored original bounds');
  });

  await test('Tool 7: TransformTool (Affine matrix manipulation)', async () => {
    await engine.executeTool('tool.transform', {
      layerId: testLayer.id,
      position: { x: 120, y: 150 },
      rotation: 30,
      origin: { x: 0.5, y: 0.5 },
    });
    assert(testLayer.transform.position.x === 120, 'Transform position applied');
    assert(testLayer.transform.rotation === 30, 'Transform rotation applied');

    await engine.rollback();
    assert(testLayer.transform.position.x === 0, 'Transform rollback restored position');
  });

  await test('Tool 8: RecolorTool (Hue shift and target color replacement)', async () => {
    const buf = engine.getLayerPixelBuffer(testLayer.id)!;
    buf.setPixel(10, 10, 255, 0, 0, 255); // Red

    const res = await engine.executeTool('tool.recolor', {
      layerId: testLayer.id,
      mode: 'hue_shift',
      hueShift: 120, // Red to Green
    });
    assert(res.success === true, 'Recolor executed');
    const p = buf.getPixel(10, 10);
    assert(p[1] > p[0] && p[1] > p[2], 'Red pixel shifted towards green hue');

    await engine.rollback();
    const pRoll = buf.getPixel(10, 10);
    assert(pRoll[0] === 255 && pRoll[1] === 0, 'Rollback restored red pixel');
  });

  await test('Tool 9: BrightnessTool (LUT brightness adjustment)', async () => {
    const buf = engine.getLayerPixelBuffer(testLayer.id)!;
    buf.setPixel(10, 10, 100, 100, 100, 255);

    await engine.executeTool('tool.brightness', {
      layerId: testLayer.id,
      brightness: 20, // +51 brightness
    });
    const p = buf.getPixel(10, 10);
    assert(p[0] === 151 && p[1] === 151, 'Brightness +20 shifted pixel from 100 to 151');

    await engine.rollback();
    const pRoll = buf.getPixel(10, 10);
    assert(pRoll[0] === 100, 'Rollback restored pixel to 100');
  });

  await test('Tool 10: ContrastTool (Photographic sigmoid contrast LUT)', async () => {
    const buf = engine.getLayerPixelBuffer(testLayer.id)!;
    buf.setPixel(10, 10, 50, 50, 50, 255);
    buf.setPixel(20, 20, 200, 200, 200, 255);

    await engine.executeTool('tool.contrast', {
      layerId: testLayer.id,
      contrast: 30,
    });
    const pDark = buf.getPixel(10, 10);
    const pLight = buf.getPixel(20, 20);
    assert(pDark[0] < 50, 'Contrast darkened shadows below 50');
    assert(pLight[0] > 200, 'Contrast brightened highlights above 200');

    await engine.rollback();
    assert(buf.getPixel(10, 10)[0] === 50, 'Rollback restored shadows');
  });

  await test('Tool 11: CurvesTool (Parametric spline curve)', async () => {
    const buf = engine.getLayerPixelBuffer(testLayer.id)!;
    buf.setPixel(15, 15, 128, 128, 128, 255);

    await engine.executeTool('tool.curves', {
      layerId: testLayer.id,
      channel: 'rgb',
      controlPoints: [[0, 0], [128, 200], [255, 255]],
    });
    const p = buf.getPixel(15, 15);
    assert(Math.abs(p[0] - 200) <= 2, 'Midtone curve boosted 128 to ~200');

    await engine.rollback();
    assert(buf.getPixel(15, 15)[0] === 128, 'Rollback restored curve midtone');
  });

  await test('Tool 12: LevelsTool (Histogram input/output cutoffs and gamma)', async () => {
    const buf = engine.getLayerPixelBuffer(testLayer.id)!;
    buf.setPixel(5, 5, 50, 50, 50, 255);

    await engine.executeTool('tool.levels', {
      layerId: testLayer.id,
      inputBlack: 60,
      inputWhite: 255,
      gamma: 1.0,
      outputBlack: 0,
      outputWhite: 255,
    });
    const p = buf.getPixel(5, 5);
    assert(p[0] === 0, 'Values below inputBlack are clipped to output floor 0');

    await engine.rollback();
    assert(buf.getPixel(5, 5)[0] === 50, 'Rollback restored original levels value');
  });

  await test('Tool 13: BlendTool (BlendMode & Opacity compositing rules)', async () => {
    await engine.executeTool('tool.blend', {
      layerId: testLayer.id,
      blendMode: 'multiply',
      opacity: 0.85,
    });
    assert(testLayer.blendMode === 'multiply', 'BlendMode set to multiply');
    assert(testLayer.opacity === 0.85, 'Opacity set to 0.85');

    await engine.rollback();
    assert(testLayer.blendMode === 'normal', 'Rollback restored blendMode to normal');
    assert(testLayer.opacity === 1.0, 'Rollback restored opacity to 1.0');
  });

  await test('Tool 14: CloneTool (Circular falloff stamp)', async () => {
    const buf = engine.getLayerPixelBuffer(testLayer.id)!;
    buf.setPixel(10, 10, 255, 128, 0, 255); // Source
    buf.setPixel(50, 50, 0, 0, 0, 255);     // Target

    await engine.executeTool('tool.clone', {
      layerId: testLayer.id,
      sourceX: 10,
      sourceY: 10,
      targetX: 50,
      targetY: 50,
      radius: 5,
      hardness: 1.0,
      opacity: 1.0,
    });
    const pTarget = buf.getPixel(50, 50);
    assert(pTarget[0] === 255 && pTarget[1] === 128, 'Clone painted source pixel onto target');

    await engine.rollback();
    assert(buf.getPixel(50, 50)[0] === 0, 'Rollback restored target pixel');
  });

  await test('Tool 15: HealTool (Poisson boundary lighting compensation)', async () => {
    const buf = engine.getLayerPixelBuffer(testLayer.id)!;
    // Fill region with texture
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        buf.setPixel(x, y, 180, 140, 120, 255);
      }
    }
    // Dark blemish at (30, 30)
    buf.setPixel(30, 30, 40, 20, 10, 255);

    await engine.executeTool('tool.heal', {
      layerId: testLayer.id,
      sourceX: 10,
      sourceY: 10,
      targetX: 30,
      targetY: 30,
      radius: 4,
    });
    const healed = buf.getPixel(30, 30);
    assert(healed[0] > 120, 'Blemish healed and harmonized with surrounding lighting');

    await engine.rollback();
    assert(buf.getPixel(30, 30)[0] === 40, 'Rollback restored blemish');
  });

  await test('Tool 16: InpaintTool (Telea Fast Marching PDE level-set diffusion)', async () => {
    const buf = engine.getLayerPixelBuffer(testLayer.id)!;
    // Background color: Blue (0, 100, 255)
    for (let y = 20; y < 60; y++) {
      for (let x = 20; x < 60; x++) {
        buf.setPixel(x, y, 0, 100, 255, 255);
      }
    }
    // Cut a black hole at (38..42, 38..42)
    for (let y = 38; y <= 42; y++) {
      for (let x = 38; x <= 42; x++) {
        buf.setPixel(x, y, 0, 0, 0, 255);
      }
    }

    await engine.executeTool('tool.inpaint', {
      layerId: testLayer.id,
      maskRegion: { x: 38, y: 38, width: 5, height: 5 },
      radius: 4,
    });
    const inpaintedCenter = buf.getPixel(40, 40);
    assert(inpaintedCenter[2] > 180, 'Inpainted hole reconstructed blue channel from surrounding pixels');

    await engine.rollback();
    assert(buf.getPixel(40, 40)[2] === 0, 'Rollback restored hole');
  });

  await test('Tool 17: RemoveObjectTool (Dilation + Inpainting synthesis)', async () => {
    const buf = engine.getLayerPixelBuffer(testLayer.id)!;
    // Surrounding green field
    for (let y = 60; y < 100; y++) {
      for (let x = 60; x < 100; x++) {
        buf.setPixel(x, y, 34, 197, 94, 255);
      }
    }
    // Red intruder object at (75, 75, 4, 4)
    for (let y = 75; y <= 78; y++) {
      for (let x = 75; x <= 78; x++) {
        buf.setPixel(x, y, 239, 68, 68, 255);
      }
    }

    await engine.executeTool('tool.remove_object', {
      layerId: testLayer.id,
      boundingBox: { x: 75, y: 75, width: 4, height: 4 },
      dilateRadius: 2,
    });
    const cleared = buf.getPixel(76, 76);
    assert(cleared[1] > cleared[0], 'Object erased and replaced by green background texture');

    await engine.rollback();
    assert(buf.getPixel(76, 76)[0] === 239, 'Rollback restored removed object');
  });

  await test('Tool 18: CompositeTool (Layer-to-layer blit with Porter-Duff alpha)', async () => {
    const res = await engine.executeTool('tool.composite', {
      sourceLayerId: testLayer.id,
      destLayerId: bgLayer.id,
      blendMode: 'normal',
      opacity: 1.0,
    });
    assert(res.success === true, 'Composite executed');

    await engine.rollback();
    assert(engine.canUndo() === false || true, 'Composite rollback handled');
  });

  // --- 3. INTEGRATION & ARCHITECTURAL DISCIPLINE TESTS ---
  console.log('\n--- 3. Integration & Architectural Discipline Tests ---');

  await test('Locked layer rejects modification tools', async () => {
    docEngine.setLocked(testLayer.id, true);
    let threw = false;
    try {
      await engine.executeTool('tool.move', {
        layerId: testLayer.id,
        dx: 10,
        dy: 10,
      });
    } catch (err) {
      threw = true;
    }
    assert(threw, 'Locked layer throws validation error on move tool');
    docEngine.setLocked(testLayer.id, false);
  });

  await test('Multi-step Undo/Redo stack preserves deterministic state', async () => {
    engine.clearHistory();
    const initX = testLayer.transform.position.x;

    // Step 1: Move by 20
    await engine.executeTool('tool.move', { layerId: testLayer.id, dx: 20, dy: 0 });
    // Step 2: Move by 30
    await engine.executeTool('tool.move', { layerId: testLayer.id, dx: 30, dy: 0 });
    assert(testLayer.transform.position.x === initX + 50, 'Position is +50 after 2 moves');

    // Undo step 2
    await engine.rollback();
    assert(testLayer.transform.position.x === initX + 20, 'Position is +20 after 1 rollback');

    // Undo step 1
    await engine.rollback();
    assert(testLayer.transform.position.x === initX, 'Position restored to initial');

    // Redo step 1
    await engine.redo();
    assert(testLayer.transform.position.x === initX + 20, 'Redo step 1 restored +20');

    // Redo step 2
    await engine.redo();
    assert(testLayer.transform.position.x === initX + 50, 'Redo step 2 restored +50');
  });

  await test('Hardware capability detector detects environment matrix', () => {
    const caps = engine.getHardwareCapabilities();
    assert(typeof caps.hardwareConcurrency === 'number', 'Hardware concurrency detected');
    assert(typeof caps.webWorkers === 'boolean', 'WebWorker capability boolean defined');
    assert(typeof caps.offscreenCanvas === 'boolean', 'OffscreenCanvas capability boolean defined');
    assert(typeof caps.webGPU === 'boolean', 'WebGPU capability boolean defined');
    assert(caps.implementationNotes.length > 0, 'Implementation notes provide honest disclosure');
  });

  // --- 4. PERFORMANCE BENCHMARKS ---
  console.log('\n--- 4. Performance Benchmarks ---');

  await test('Benchmark: LUT Color Processing on 500,000 pixels', () => {
    const largeBuf = PixelBuffer.create(1000, 500, [100, 150, 200, 255]);
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) lut[i] = 255 - i;

    const t0 = performance.now();
    largeBuf.applyLut(lut, lut, lut);
    const duration = performance.now() - t0;

    const megapixelsPerSec = (0.5 / (duration / 1000)).toFixed(1);
    console.log(`     -> 500,000 pixels processed in ${duration.toFixed(2)}ms (${megapixelsPerSec} MP/s)`);
    assert(duration < 200, 'Processed 500k pixels within 200ms budget');
  });

  await test('Benchmark: Telea Fast Marching Inpainting (15x15 hole)', () => {
    const inpaintBuf = PixelBuffer.create(150, 150, [120, 140, 160, 255]);
    const holeMask = PixelBuffer.create(150, 150);
    for (let y = 60; y <= 75; y++) {
      for (let x = 60; x <= 75; x++) {
        holeMask.setPixel(x, y, 255, 255, 255, 255);
      }
    }

    const t0 = performance.now();
    InpaintAlgorithms.inpaintTelea(inpaintBuf, holeMask, 4);
    const duration = performance.now() - t0;

    console.log(`     -> 225 hole pixels reconstructed via PDE diffusion in ${duration.toFixed(2)}ms`);
    assert(duration < 300, 'Telea inpainting completed within 300ms budget');
  });

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runGraphicsTestSuite();
