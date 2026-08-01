(function () {
  'use strict';

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (x) {
      var hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function hexToRgba(hex, alpha) {
    if (alpha === undefined) alpha = 1;
    var shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthand, function (m, r, g, b) { return r + r + g + g + b + b; });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 'rgba(0,0,0,' + alpha + ')';
    return 'rgba(' + parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16) + ', ' + alpha + ')';
  }

  function hexToRgb(hex) {
    var shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = (hex || '#000000').replace(shorthand, function (m, r, g, b) { return r + r + g + g + b + b; });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 15, g: 23, b: 42 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  function computePositionalBaseAndRadii(points) {
    if (!points || points.length === 0) {
      return { baseColor: '#080C14', cssGradients: [] };
    }

    var totalWeight = 0;
    var rWeighted = 0, gWeighted = 0, bWeighted = 0;

    var cssGradients = points.map(function (pt) {
      var posX = Math.round(pt.x * 100);
      var posY = Math.round(pt.y * 100);
      var intensity = pt.intensity !== undefined ? Number(pt.intensity) : 85;
      var radiusVal = pt.radius !== undefined ? Number(pt.radius) : 0.7;

      var weight = intensity * radiusVal;
      totalWeight += weight;

      var hex = pt.color || '#ffffff';
      var rgb = hexToRgb(hex);
      rWeighted += rgb.r * weight;
      gWeighted += rgb.g * weight;
      bWeighted += rgb.b * weight;

      // Expand higher intensity points up to 180% to smoothly encompass the canvas
      var rad = Math.round(radiusVal * (intensity / 85) * 100);
      return 'radial-gradient(circle at ' + posX + '% ' + posY + '%, ' + pt.color + ' 0%, ' + hexToRgba(pt.color, 0) + ' ' + rad + '%)';
    });

    var rAvg = totalWeight > 0 ? Math.round(rWeighted / totalWeight) : 15;
    var gAvg = totalWeight > 0 ? Math.round(gWeighted / totalWeight) : 23;
    var bAvg = totalWeight > 0 ? Math.round(bWeighted / totalWeight) : 42;

    // Ambient background backdrop: blend weighted average with deep dark slate for rich cinema contrast
    var ambientR = Math.round(rAvg * 0.28 + 8);
    var ambientG = Math.round(gAvg * 0.28 + 12);
    var ambientB = Math.round(bAvg * 0.28 + 20);

    var baseColor = 'rgb(' + ambientR + ', ' + ambientG + ', ' + ambientB + ')';

    return {
      baseColor: baseColor,
      cssGradients: cssGradients,
      ambientR: ambientR,
      ambientG: ambientG,
      ambientB: ambientB
    };
  }

  var MAX_COLOR_DISTANCE = Math.sqrt(255 * 255 * 3);

  function createSeamlessNoisePatternCanvas(frequency, opacity) {
    var size = 256;
    var nCanvas = document.createElement('canvas');
    nCanvas.width = size;
    nCanvas.height = size;
    var nCtx = nCanvas.getContext('2d');
    var imgData = nCtx.createImageData(size, size);
    var data = imgData.data;
    var opVal = (opacity !== undefined ? opacity : 0.15) * 255;
    var freqVal = Math.max(0.05, frequency || 1.0);

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var idx = (y * size + x) * 4;
        // Pseudo-random noise with frequency granularity sampling
        var sample = Math.sin(x * freqVal * 12.9898 + y * freqVal * 78.233) * 43758.5453;
        var rand = sample - Math.floor(sample);
        var val = rand > 0.5 ? 255 : 0;

        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = Math.floor(rand * opVal);
      }
    }
    nCtx.putImageData(imgData, 0, 0);
    return nCanvas;
  }

  var cachedNoiseDataUris = {};
  function generateNoiseSvgDataUri(frequency, opacity) {
    var key = (frequency || 1.0) + '_' + (opacity || 0.15);
    if (!cachedNoiseDataUris[key]) {
      var canvas = createSeamlessNoisePatternCanvas(frequency, opacity);
      cachedNoiseDataUris[key] = canvas.toDataURL('image/png');
    }
    return cachedNoiseDataUris[key];
  }

  var cachedNoisePatterns = {};
  function getSeamlessNoisePattern(ctx, frequency, opacity) {
    var key = (frequency || 1.0) + '_' + (opacity || 0.15);
    if (!cachedNoisePatterns[key]) {
      var canvas = createSeamlessNoisePatternCanvas(frequency, opacity);
      cachedNoisePatterns[key] = ctx.createPattern(canvas, 'repeat');
    }
    return cachedNoisePatterns[key];
  }

  function $(id) { return document.getElementById(id); }
  function show(el) {
    if (el) {
      el.classList.remove('hidden');
    }
  }
  function hide(el) {
    if (el) {
      el.classList.add('hidden');
    }
  }
  function toggle(el, visible) {
    if (el) {
      if (visible) {
        show(el);
      } else {
        hide(el);
      }
    }
  }

  function copyTextToClipboard(text, onSuccess) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(function () {
        fallbackCopy(text, onSuccess);
      });
    } else {
      fallbackCopy(text, onSuccess);
    }
  }

  function fallbackCopy(text, onSuccess) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error('Copy failed:', e);
    }
    document.body.removeChild(ta);
  }

  var audioManager = (function () {
    var ctx = null;
    var isMuted = false;
    var volumeLevel = 0.8;

    function initCtx() {
      if (!ctx) {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) ctx = new AudioContext();
      }
      if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    return {
      init: initCtx,
      setMuted: function (muted) { isMuted = muted; },
      setVolume: function (vol) { volumeLevel = Math.max(0, Math.min(1, vol)); },
      play: function (type) {
        if (isMuted || volumeLevel <= 0) return;
        initCtx();
        if (!ctx) return;
        var now = ctx.currentTime;

        if (type === 'pop' || type === 'click') {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(type === 'pop' ? 240 : 520, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.03);
          gain.gain.setValueAtTime(0.35 * volumeLevel, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
          osc.start(now);
          osc.stop(now + 0.03);
        } else if (type === 'tab' || type === 'swish') {
          var osc1 = ctx.createOscillator();
          var gain1 = ctx.createGain();
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(180, now);
          osc1.frequency.exponentialRampToValueAtTime(360, now + 0.05);
          gain1.gain.setValueAtTime(0.25 * volumeLevel, now);
          gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc1.start(now);
          osc1.stop(now + 0.05);
        } else if (type === 'preset') {
          // Musical Chord Pop
          [523.25, 659.25, 783.99].forEach(function (freq, idx) {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, now + idx * 0.015);
            g.gain.setValueAtTime(0.18 * volumeLevel, now + idx * 0.015);
            g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.015 + 0.08);
            o.start(now + idx * 0.015);
            o.stop(now + idx * 0.015 + 0.08);
          });
        } else if (type === 'slider') {
          var oscS = ctx.createOscillator();
          var gainS = ctx.createGain();
          oscS.connect(gainS);
          gainS.connect(ctx.destination);
          oscS.type = 'sine';
          oscS.frequency.setValueAtTime(800, now);
          gainS.gain.setValueAtTime(0.08 * volumeLevel, now);
          gainS.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
          oscS.start(now);
          oscS.stop(now + 0.01);
        } else if (type === 'success') {
          [440, 554.37, 659.25, 880].forEach(function (freq, idx) {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, now + idx * 0.06);
            g.gain.setValueAtTime(0.25 * volumeLevel, now + idx * 0.06);
            g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.25);
            o.start(now + idx * 0.06);
            o.stop(now + idx * 0.06 + 0.25);
          });
        }
      }
    };
  })();

  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button, .tab-pill-btn, .segmented-btn, .theme-card, .preset-pill, .color-preset-pill, .color-stop-item, input[type="range"]')) {
      audioManager.play('pop');
    }
  });

  function triggerSnappyExportProgress(title, onDownloadTrigger) {
    var overlay = $('export-modal-overlay');
    var titleEl = $('export-modal-title');
    var statusEl = $('export-modal-status');
    var percentEl = $('export-modal-percent');
    var fillEl = $('export-progress-fill');
    var iconBox = $('export-icon-container');

    if (!overlay || !fillEl) {
      onDownloadTrigger();
      return;
    }

    titleEl.textContent = title || 'Exporting PNG';
    statusEl.textContent = 'Initializing Canvas Renderer...';
    percentEl.textContent = '0%';
    fillEl.style.width = '0%';
    iconBox.innerHTML = '<i class="ph-fill ph-spinner animate-spin" style="font-size: 22px; color: var(--color-seaweed);"></i>';
    show(overlay);

    var steps = [
      { pct: 25, msg: 'Rendering High-Res Pixels...' },
      { pct: 60, msg: 'Synthesizing Color & Noise Layers...' },
      { pct: 88, msg: 'Encoding Ultra-HD PNG...' },
      { pct: 100, msg: 'Export Complete!' }
    ];

    var currentStep = 0;

    function nextTick() {
      if (currentStep < steps.length) {
        var s = steps[currentStep];
        fillEl.style.width = s.pct + '%';
        percentEl.textContent = s.pct + '%';
        statusEl.textContent = s.msg;

        currentStep++;

        if (s.pct === 100) {
          // Trigger file download
          onDownloadTrigger();
          audioManager.play('success');
          iconBox.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size: 22px; color: var(--color-seaweed);"></i>';
    

          setTimeout(function () {
            hide(overlay);
          }, 450);
        } else {
          setTimeout(nextTick, 180 + Math.random() * 120);
        }
      }
    }

    audioManager.play('woosh');
    setTimeout(nextTick, 120);
  }

  var currentCpCallback = null;
  var cpState = { h: 0, s: 0, v: 100, hex: '#ffffff' }; // HSV format internally

  function hexToHsv(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;
    var d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
  }

  function hsvToHex(h, s, v) {
    h /= 360; s /= 100; v /= 100;
    var r, g, b;
    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
  }

  function updateColorPickerUI(skipLiveCallback) {
    cpState.hex = hsvToHex(cpState.h, cpState.s, cpState.v);

    // Update sat-val area background to pure hue
    if ($('cp-sat-val-area')) $('cp-sat-val-area').style.backgroundColor = hsvToHex(cpState.h, 100, 100);

    // Position thumbs
    var svThumb = $('cp-sat-val-thumb');
    if (svThumb) {
      svThumb.style.left = cpState.s + '%';
      svThumb.style.top = (100 - cpState.v) + '%';
      svThumb.style.backgroundColor = cpState.hex;
    }

    var hueThumb = $('cp-hue-thumb');
    if (hueThumb) hueThumb.style.left = (cpState.h / 360 * 100) + '%';

    // Update hex input & preview
    if ($('cp-hex-input')) $('cp-hex-input').value = cpState.hex.toUpperCase();
    if ($('cp-preview-swatch')) $('cp-preview-swatch').style.backgroundColor = cpState.hex;

    // Update RGB inputs
    var rgbMatch = hexToRgba(cpState.hex, 1).match(/\d+/g);
    var rgb = rgbMatch ? rgbMatch.map(Number) : [255, 255, 255];
    if ($('cp-r-input')) $('cp-r-input').value = rgb[0];
    if ($('cp-g-input')) $('cp-g-input').value = rgb[1];
    if ($('cp-b-input')) $('cp-b-input').value = rgb[2];

    // Live preview callback invocation
    if (!skipLiveCallback && currentCpCallback) {
      currentCpCallback(cpState.hex);
    }
  }

  function setupColorPickerEvents() {
    var overlay = $('color-picker-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          audioManager.play('woosh');
          hide(overlay);
        }
      });
    }

    var closeBtn = $('color-picker-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        audioManager.play('woosh');
        hide($('color-picker-modal-overlay'));
      });
    }

    var applyBtn = $('cp-apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        audioManager.play('pop');
        if (currentCpCallback) currentCpCallback(cpState.hex);
        hide($('color-picker-modal-overlay'));
      });
    }

    if ($('cp-hex-input')) {
      $('cp-hex-input').addEventListener('input', function (e) {
        var val = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          var hsv = hexToHsv(val);
          cpState.h = hsv.h; cpState.s = hsv.s; cpState.v = hsv.v;
          updateColorPickerUI();
        }
      });
    }

    ['cp-r-input', 'cp-g-input', 'cp-b-input'].forEach(function (id) {
      var inp = $(id);
      if (inp) {
        inp.addEventListener('input', function () {
          var r = Math.max(0, Math.min(255, Number($('cp-r-input').value) || 0));
          var g = Math.max(0, Math.min(255, Number($('cp-g-input').value) || 0));
          var b = Math.max(0, Math.min(255, Number($('cp-b-input').value) || 0));
          var hex = rgbToHex(r, g, b);
          var hsv = hexToHsv(hex);
          cpState.h = hsv.h; cpState.s = hsv.s; cpState.v = hsv.v;
          updateColorPickerUI();
        });
      }
    });

    // Quick Palette
    var qpContainer = $('cp-quick-palette');
    if (qpContainer && qpContainer.children.length === 0) {
      QUICK_PALETTE_COLORS.forEach(function (qc) {
        var btn = document.createElement('div');
        btn.style.cssText = 'width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 2px 6px rgba(0,0,0,0.4); transition: transform 0.15s ease;';
        btn.style.backgroundColor = qc;
        btn.addEventListener('mouseenter', function () { btn.style.transform = 'scale(1.2)'; btn.style.borderColor = '#ffffff'; });
        btn.addEventListener('mouseleave', function () { btn.style.transform = 'scale(1)'; btn.style.borderColor = 'rgba(255,255,255,0.2)'; });
        btn.addEventListener('click', function () {
          audioManager.play('pop');
          var hsv = hexToHsv(qc);
          cpState.h = hsv.h; cpState.s = hsv.s; cpState.v = hsv.v;
          updateColorPickerUI();
        });
        qpContainer.appendChild(btn);
      });
    }

    // Dragging Logic for Sat/Val Area
    var isDraggingSV = false;
    if ($('cp-sat-val-area')) {
      $('cp-sat-val-area').addEventListener('mousedown', function (e) {
        isDraggingSV = true;
        handleSVDOMouseEvent(e);
      });
      document.addEventListener('mousemove', function (e) {
        if (isDraggingSV) handleSVDOMouseEvent(e);
      });
      document.addEventListener('mouseup', function () {
        isDraggingSV = false;
      });
    }

    function handleSVDOMouseEvent(e) {
      var area = $('cp-sat-val-area');
      if (!area) return;
      var rect = area.getBoundingClientRect();
      var x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      var y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      cpState.s = (x / rect.width) * 100;
      cpState.v = 100 - ((y / rect.height) * 100);
      updateColorPickerUI();
    }

    // Dragging Logic for Hue Track
    var isDraggingHue = false;
    if ($('cp-hue-track')) {
      $('cp-hue-track').addEventListener('mousedown', function (e) {
        isDraggingHue = true;
        handleHueMouseEvent(e);
      });
      document.addEventListener('mousemove', function (e) {
        if (isDraggingHue) handleHueMouseEvent(e);
      });
      document.addEventListener('mouseup', function () {
        isDraggingHue = false;
      });
    }

    function handleHueMouseEvent(e) {
      var track = $('cp-hue-track');
      if (!track) return;
      var rect = track.getBoundingClientRect();
      var x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      cpState.h = (x / rect.width) * 360;
      updateColorPickerUI();
    }
  }

  function openCustomColorPicker(initialColor, onColorChangeCallback) {
    if (!$('color-picker-modal-overlay').dataset.init) {
      setupColorPickerEvents();
      $('color-picker-modal-overlay').dataset.init = 'true';
    }

    currentCpCallback = onColorChangeCallback;
    var hsv = hexToHsv(initialColor || '#ffffff');
    cpState.h = hsv.h; cpState.s = hsv.s; cpState.v = hsv.v;
    updateColorPickerUI(true);
    show($('color-picker-modal-overlay'));
  }

  var state = {
    activeTab: 'image',
    groqApiKey: localStorage.getItem('gradial_groq_api_key') || '',

    // Eraser / Image / Layers / Retouching
    imageSrc: null,
    imageObj: null,
    targetColor: null,
    targetColorPicked: false,
    tolerance: 0,
    edgeFeather: 0,
    eraserToolMode: 'color', // 'color' | 'brush' | 'pan'
    brushSize: 30,
    brushAction: 'erase', // 'erase' | 'restore'
    isPickingColor: false,
    isBrushing: false,
    lastBrushX: 0,
    lastBrushY: 0,
    exportScale: 1,
    isImageExportMenuOpen: false,
    layers: [{ id: 'layer-bg', name: 'Background Layer', opacity: 100, blendMode: 'normal', visible: true }],
    activeLayerId: 'layer-bg',
    currentTool: 'color', // 'color' | 'brush' | 'rect' | 'lasso' | 'wand' | 'clone' | 'heal'
    undoStack: [],
    redoStack: [],
    levelsGamma: 1.0,

    // Offscreen Original Image Canvas for Restore Brush
    origCanvas: null,
    origCtx: null,

    // Gradient
    gradientMode: 'linear', // 'linear' | '4-corner' | '6-corner' | 'fluid' | 'animated'
    gradientColors: ['#216869', '#49a078'],
    meshColors: ['#216869', '#49a078', '#9cc5a1', '#1f2421'],
    meshIntensities: [70, 70, 70, 70], // Per-corner intensity %: [TL, TR, BR, BL]

    // 6-Corner Mesh
    mesh6Colors: ['#216869', '#49a078', '#9cc5a1', '#1f2421', '#ff007f', '#00f0ff'],
    mesh6Intensities: [70, 70, 70, 70, 70, 70],

    // 3D Liquid Lava Lamp Engine State
    lavaLamp: {
      waxColor1: '#00F0FF',
      waxColor2: '#7000FF',
      bgColor: '#050B1E',
      blobCount: 7,
      speed: 1.0,
      viscosity: 1.0,
      specular: true,
      blobs: []
    },

    gradientAngle: 90,
    animationDuration: 5.0, // seconds
    positionalPoints: [
      { x: 0.25, y: 0.35, color: '#FF3366', intensity: 85, radius: 0.7 },
      { x: 0.75, y: 0.65, color: '#33CCFF', intensity: 85, radius: 0.7 },
      { x: 0.50, y: 0.50, color: '#FF9933', intensity: 85, radius: 0.7 }
    ],

    // Image Filters
    imageFilters: { brightness: 100, contrast: 100, saturate: 100, blur: 0, hue: 0, grayscale: 0, sepia: 0, invert: 0 },

    // 2D Photographic Styles & 3D LUT Engine
    imgStylePad: { tone: 0, warmth: 0 },
    vidStylePad: { tone: 0, warmth: 0 },
    imgLut: 'none',
    imgLutStrength: 100,
    vidLut: 'none',
    vidLutStrength: 100,

    // Video Studio State
    videoState: {
      videoEl: null,
      isLoaded: false,
      isPlaying: false,
      scale: 1,
      sharpen: 0,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      temp: 0,
      hue: 0,
      file: null,
      fileName: '',
      duration: 0,
      width: 0,
      height: 0
    },

    // Canvas Pan & Zoom
    canvasTransform: { scale: 1, panX: 0, panY: 0 },
    isPanning: false,
    spacebarDown: false,
    lastPanMouseX: 0,
    lastPanMouseY: 0,

    // Media Player Timeline Keyframes (posX and posY numbers 0-100 for clean UI)
    isPlaying: false,
    currentTime: 0.0,
    keyframes: [
      { percent: 0, time: 0.0, posX: 0, posY: 50, angle: 90, colors: ['#216869', '#49a078'] },
      { percent: 50, time: 2.5, posX: 100, posY: 50, angle: 180, colors: ['#49a078', '#9cc5a1'] },
      { percent: 100, time: 5.0, posX: 0, posY: 50, angle: 90, colors: ['#216869', '#49a078'] }
    ],

    // Noise
    enableNoise: false,
    noiseFrequency: 0.65,
    noiseOpacity: 0.15,

    // Export
    isGradientExportMenuOpen: false,

    selectedKeyframePct: null
  };

  function syncSelectedKeyframe() {
    if (state.gradientMode === 'animated' && state.selectedKeyframePct !== null) {
      var kf = state.keyframes.find(function (k) { return k.percent === state.selectedKeyframePct; });
      if (kf) {
        kf.colors = state.gradientColors.slice(); // copy array
        kf.angle = state.gradientAngle;
      }
    }
  }

  var GRADIENT_RESOLUTIONS = [
    { label: 'Full HD (1080p)', width: 1920, height: 1080 },
    { label: '2K QHD (1440p)', width: 2560, height: 1440 },
    { label: '4K Ultra HD', width: 3840, height: 2160 },
    { label: '8K Ultra HD', width: 7680, height: 4320 },
    { label: 'Mobile Portrait (9:16)', width: 1080, height: 1920 },
    { label: 'Square Post (1:1)', width: 1080, height: 1080 }
  ];

  var QUICK_PALETTE_COLORS = ['#216869', '#49A078', '#9CC5A1', '#FF6B6B', '#A66CFF', '#F0A500'];

  // ==================== CINEMATIC 3D LUT PRESETS DEFINITION ====================
  var LUT_PRESETS = [
    { id: 'none', title: 'Normal', sub: 'Standard Color', color: 'linear-gradient(135deg, #888, #444)' },
    { id: 'teal_orange', title: 'Teal & Orange', sub: 'Hollywood Film', color: 'linear-gradient(135deg, #00b4d8, #ffb703)' },
    { id: 'vintage_35mm', title: 'Vintage 35mm', sub: 'Retro Matte', color: 'linear-gradient(135deg, #d4a373, #faedcd)' },
    { id: 'cyberpunk', title: 'Cyberpunk Neon', sub: 'Electric Glow', color: 'linear-gradient(135deg, #ff007f, #00f0ff)' },
    { id: 'portra_400', title: 'Kodak Portra', sub: 'Warm Skintones', color: 'linear-gradient(135deg, #f4a261, #e9c46a)' },
    { id: 'fuji_velvia', title: 'Fuji Velvia', sub: 'Vivid Landscape', color: 'linear-gradient(135deg, #2a9d8f, #e76f51)' },
    { id: 'noir_bw', title: 'Noir B&W', sub: 'Dramatic Silver', color: 'linear-gradient(135deg, #ffffff, #111111)' },
    { id: 'golden_hour', title: 'Golden Hour', sub: 'Sunset Glow', color: 'linear-gradient(135deg, #ffb703, #fb8500)' },
    { id: 'emerald', title: 'Emerald Teal', sub: 'Moody Forest', color: 'linear-gradient(135deg, #119da4, #0466c8)' },
    { id: 'pastel_dream', title: 'Pastel Dream', sub: 'Lavender Matte', color: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)' },
    { id: 'solarized', title: 'Solarized Neon', sub: 'Hyper Inversion', color: 'linear-gradient(135deg, #00f5d4, #7b2cbf)' }
  ];

  // Pixel Color Processor for LUT & 2D Photographic Style Pad
  function transformPixelColor(r, g, b, lutId, tone, warmth) {
    var tr = r, tg = g, tb = b;

    // --- 1. Apply 3D LUT Preset Transform ---
    if (lutId === 'teal_orange') {
      var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      tr = r * 1.1 + (lum > 0.5 ? (lum - 0.5) * 50 : 0) - (lum < 0.5 ? (0.5 - lum) * 20 : 0);
      tg = g * 0.95 + (lum > 0.5 ? (lum - 0.5) * 20 : 0);
      tb = b * 0.9 + (lum < 0.5 ? (0.5 - lum) * 60 : 0);
    } else if (lutId === 'vintage_35mm') {
      tr = r * 0.95 + 20;
      tg = g * 0.9 + 15;
      tb = b * 0.8 + 25;
    } else if (lutId === 'cyberpunk') {
      tr = r * 1.25 - g * 0.2 + 15;
      tg = g * 0.7 + 10;
      tb = b * 1.35 - r * 0.1 + 25;
    } else if (lutId === 'portra_400') {
      tr = r * 1.08 + 10;
      tg = g * 1.02 + 5;
      tb = b * 0.94;
    } else if (lutId === 'fuji_velvia') {
      tr = Math.pow(r / 255, 0.9) * 265;
      tg = Math.pow(g / 255, 0.85) * 270;
      tb = Math.pow(b / 255, 0.92) * 260;
    } else if (lutId === 'noir_bw') {
      var gray = 0.299 * r + 0.587 * g + 0.114 * b;
      // High contrast S-Curve
      var normG = gray / 255;
      normG = normG < 0.5 ? 2 * normG * normG : 1 - Math.pow(-2 * normG + 2, 2) / 2;
      tr = tg = tb = normG * 255;
    } else if (lutId === 'golden_hour') {
      tr = r * 1.15 + 15;
      tg = g * 1.05 + 8;
      tb = b * 0.85 - 10;
    } else if (lutId === 'emerald') {
      tr = r * 0.85;
      tg = g * 1.15 + 12;
      tb = b * 1.1 + 10;
    } else if (lutId === 'pastel_dream') {
      tr = r * 0.9 + 40;
      tg = g * 0.85 + 35;
      tb = b * 1.1 + 30;
    } else if (lutId === 'solarized') {
      tr = r > 128 ? 255 - r : r * 1.4;
      tg = g > 128 ? 255 - g : g * 1.4;
      tb = b > 128 ? 255 - b : b * 1.4;
    }

    // --- 2. Apply 2D Photographic Style Pad (Tone & Warmth) ---
    if (tone !== 0) {
      var tFactor = tone / 100; // -1 to +1
      // Tone Y-axis: Positive = Higher contrast & richer blacks, Negative = Muted soft flat tone
      var normR = tr / 255, normG = tg / 255, normB = tb / 255;
      if (tFactor > 0) {
        normR = (normR - 0.5) * (1 + tFactor * 0.6) + 0.5;
        normG = (normG - 0.5) * (1 + tFactor * 0.6) + 0.5;
        normB = (normB - 0.5) * (1 + tFactor * 0.6) + 0.5;
      } else {
        normR = normR * (1 + tFactor * 0.35) - tFactor * 0.15;
        normG = normG * (1 + tFactor * 0.35) - tFactor * 0.15;
        normB = normB * (1 + tFactor * 0.35) - tFactor * 0.15;
      }
      tr = normR * 255; tg = normG * 255; tb = normB * 255;
    }

    if (warmth !== 0) {
      var wFactor = warmth / 100; // -1 to +1
      // Warmth X-axis: Positive = Amber/Warm (+Red, +Yellow), Negative = Cool Cyan/Blue (+Blue)
      tr += wFactor * 32;
      tg += wFactor * 12;
      tb -= wFactor * 28;
    }

    return {
      r: Math.max(0, Math.min(255, Math.round(tr))),
      g: Math.max(0, Math.min(255, Math.round(tg))),
      b: Math.max(0, Math.min(255, Math.round(tb)))
    };
  }

  function applyLutAndStylePadToImageData(imageData, lutId, lutStrengthPct, tone, warmth) {
    if ((!lutId || lutId === 'none') && (tone === 0) && (warmth === 0)) return;

    var data = imageData.data;
    var strength = Math.max(0, Math.min(100, lutStrengthPct || 100)) / 100;

    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue; // Skip transparent pixels

      var origR = data[i], origG = data[i + 1], origB = data[i + 2];
      var transformed = transformPixelColor(origR, origG, origB, lutId, tone, warmth);

      if (strength < 1) {
        data[i] = Math.round(origR * (1 - strength) + transformed.r * strength);
        data[i + 1] = Math.round(origG * (1 - strength) + transformed.g * strength);
        data[i + 2] = Math.round(origB * (1 - strength) + transformed.b * strength);
      } else {
        data[i] = transformed.r;
        data[i + 1] = transformed.g;
        data[i + 2] = transformed.b;
      }
    }
  }

  // --- Render LUT Preset Cards Grid ---
  function renderLutGrid(gridId, currentLutId, onSelectLutCallback) {
    var container = $(gridId);
    if (!container) return;
    container.innerHTML = '';

    LUT_PRESETS.forEach(function (lut) {
      var card = document.createElement('div');
      card.className = 'lut-card' + (lut.id === currentLutId ? ' active' : '');
      card.dataset.lut = lut.id;
      card.innerHTML =
        '<div class="lut-preview-swatch" style="background:' + lut.color + '"></div>' +
        '<div style="overflow:hidden;">' +
        '<div class="lut-card-title">' + lut.title + '</div>' +
        '<div class="lut-card-sub">' + lut.sub + '</div>' +
        '</div>';

      card.addEventListener('click', function () {
        audioManager.play('pop');
        container.querySelectorAll('.lut-card').forEach(function (c) { c.classList.remove('active'); });
        card.classList.add('active');
        onSelectLutCallback(lut.id);
      });

      container.appendChild(card);
    });
  }

  // --- Apple Camera-Style 2D Photographic Style Pad Touch Controller ---
  function initStylePad(config) {
    var touchArea = $(config.touchId);
    var dotsContainer = $(config.dotsId);
    var puck = $(config.puckId);
    var glow = $(config.glowId);
    var readout = $(config.readoutId);
    var resetBtn = $(config.resetBtnId);

    if (!touchArea || !puck || !dotsContainer) return;

    // Generate 7x7 Grid Dots (49 total)
    dotsContainer.innerHTML = '';
    var dots = [];
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 7; c++) {
        var dot = document.createElement('div');
        dot.className = 'style-pad-grid-dot';
        dotsContainer.appendChild(dot);
        dots.push({ el: dot, col: c, row: r, normX: c / 6, normY: r / 6 });
      }
    }

    var isDragging = false;
    var rafPending = false;
    var lastNormX = 0.5, lastNormY = 0.5;

    function updatePadUI(normX, normY, isFinal) {
      lastNormX = normX;
      lastNormY = normY;

      if (rafPending && !isFinal) return;
      rafPending = true;

      requestAnimationFrame(function () {
        rafPending = false;
        var currX = lastNormX;
        var currY = lastNormY;

        var warmth = Math.round((currX - 0.5) * 200);
        var tone = Math.round((0.5 - currY) * 200);

        var pctX = currX * 100;
        var pctY = currY * 100;
        puck.style.left = pctX + '%';
        puck.style.top = pctY + '%';
        if (glow) {
          glow.style.left = pctX + '%';
          glow.style.top = pctY + '%';
        }

        if (readout) {
          readout.textContent = 'Tone: ' + (tone >= 0 ? '+' : '') + tone + ' | Warmth: ' + (warmth >= 0 ? '+' : '') + warmth;
        }

        // Fast proximity calculation (0 lag)
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          var dx = d.normX - currX;
          var dy = d.normY - currY;
          var distSq = dx * dx + dy * dy;

          if (distSq < 0.2025) { // 0.45 * 0.45
            var dist = Math.sqrt(distSq);
            var factor = 1 - (dist / 0.45);
            var opacity = 0.25 + factor * 0.75;
            d.el.style.transform = 'scale(' + (1 + factor * 1.6) + ')';
            d.el.style.backgroundColor = 'rgba(255, 255, 255, ' + opacity + ')';
          } else {
            d.el.style.transform = 'none';
            d.el.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
          }
        }

        if (config && typeof config.onChange === 'function') {
          config.onChange(tone, warmth, isFinal);
        }
      });
    }

    function handlePointerEvent(e, isFinal) {
      var rect = touchArea.getBoundingClientRect();
      var x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      var y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      var normX = x / rect.width;
      var normY = y / rect.height;
      updatePadUI(normX, normY, isFinal);
    }

    touchArea.addEventListener('pointerdown', function (e) {
      isDragging = true;
      touchArea.setPointerCapture(e.pointerId);
      audioManager.play('pop');
      handlePointerEvent(e, false);
    });

    touchArea.addEventListener('pointermove', function (e) {
      if (isDragging) {
        handlePointerEvent(e, false);
      }
    });

    touchArea.addEventListener('pointerup', function (e) {
      if (isDragging) {
        isDragging = false;
        try { touchArea.releasePointerCapture(e.pointerId); } catch (err) { }
        handlePointerEvent(e, true);
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        audioManager.play('pop');
        updatePadUI(0.5, 0.5, true);
      });
    }

    // Set initial position at center (0.5, 0.5)
    updatePadUI(0.5, 0.5, true);
  }

  var processingCanvas, exportCanvas, editorCanvas, editorCtx;
  var animFrameId = null;
  var processTimer = null;

  // --- Preferences & Settings Management ---
  function loadPreferences() {
    // Sound Mute
    var savedMute = localStorage.getItem('gradial-sound-muted');
    if (savedMute !== null) {
      var isMuted = savedMute === 'true';
      audioManager.setMuted(isMuted);
      updateSoundUI(!isMuted);
    }

    // Sound Volume
    var savedVol = localStorage.getItem('gradial-sound-volume');
    if (savedVol !== null) {
      var vol = parseFloat(savedVol);
      audioManager.setVolume(vol);
      if ($('setting-volume-slider')) $('setting-volume-slider').value = Math.round(vol * 100);
      if ($('setting-volume-val')) $('setting-volume-val').textContent = Math.round(vol * 100) + '%';
    }

    // UI Motion
    var savedMotion = localStorage.getItem('gradial-motion');
    if (savedMotion === 'snappy') {
      setMotionUI('snappy');
    }

    // Grid Style
    var savedGrid = localStorage.getItem('gradial-grid');
    if (savedGrid === 'light') {
      setGridUI('light');
    }

    // Downsample Scale Ratio
    var savedScale = localStorage.getItem('gradial-downsample-ratio');
    if (savedScale !== null) {
      setDownsampleRatio(savedScale);
    }

    // GPU Canvas Offloading
    var savedOffload = localStorage.getItem('gradial-gpu-offload');
    if (savedOffload !== null) {
      setGpuOffload(savedOffload === 'true');
    }

    // Export Format
    var savedFmt = localStorage.getItem('gradial-export-fmt');
    var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    if (savedFmt !== null) {
      setExportFormat(savedFmt);
    } else {
      setExportFormat(isFirefox ? 'webm' : 'mp4');
    }

    // Export FPS
    var savedFps = localStorage.getItem('gradial-export-fps');
    if (savedFps !== null) {
      setExportFps(savedFps);
    }

    // Export Bitrate
    var savedBitrate = localStorage.getItem('gradial-export-bitrate');
    if (savedBitrate !== null) {
      setExportBitrate(savedBitrate);
    }

    // Export Alpha
    var savedAlpha = localStorage.getItem('gradial-export-alpha');
    if (savedAlpha !== null) {
      setExportAlpha(savedAlpha === 'true');
    }
  }

  function setDownsampleRatio(ratio) {
    state.downsampleRatio = parseFloat(ratio) === 1.0 ? 1.0 : 0.5;
    var btn05 = $('setting-downsample-05');
    var btn10 = $('setting-downsample-10');
    if (state.downsampleRatio === 1.0) {
      if (btn10) btn10.classList.add('active');
      if (btn05) btn05.classList.remove('active');
    } else {
      if (btn05) btn05.classList.add('active');
      if (btn10) btn10.classList.remove('active');
    }
    localStorage.setItem('gradial-downsample-ratio', state.downsampleRatio);
    if (typeof updateGradientPreview === 'function') updateGradientPreview();
  }

  function setGpuOffload(enabled) {
    state.useGpuOffloading = !!enabled;
    var btn = $('setting-gpu-offload-btn');
    var text = $('setting-gpu-offload-text');
    if (btn) {
      btn.classList.toggle('active', state.useGpuOffloading);
      if (text) text.textContent = state.useGpuOffloading ? 'Enabled' : 'Disabled';
    }
    document.querySelectorAll('.canvas-element').forEach(function (el) {
      el.style.transform = state.useGpuOffloading ? 'translateZ(0)' : 'none';
    });
    localStorage.setItem('gradial-gpu-offload', state.useGpuOffloading);
  }

  function setExportFormat(fmt) {
    state.defaultExportFormat = fmt === 'webm' ? 'webm' : 'mp4';
    var btnMp4 = $('setting-export-fmt-mp4');
    var btnWebm = $('setting-export-fmt-webm');
    if (state.defaultExportFormat === 'webm') {
      if (btnWebm) btnWebm.classList.add('active');
      if (btnMp4) btnMp4.classList.remove('active');
    } else {
      if (btnMp4) btnMp4.classList.add('active');
      if (btnWebm) btnWebm.classList.remove('active');
    }
    localStorage.setItem('gradial-export-fmt', state.defaultExportFormat);
  }

  function setExportFps(fps) {
    state.defaultExportFps = parseInt(fps, 10) === 30 ? 30 : 60;
    var btn60 = $('setting-export-fps-60');
    var btn30 = $('setting-export-fps-30');
    if (state.defaultExportFps === 30) {
      if (btn30) btn30.classList.add('active');
      if (btn60) btn60.classList.remove('active');
    } else {
      if (btn60) btn60.classList.add('active');
      if (btn30) btn30.classList.remove('active');
    }
    localStorage.setItem('gradial-export-fps', state.defaultExportFps);
  }

  function setExportBitrate(mbps) {
    var val = Math.max(5, Math.min(50, parseInt(mbps, 10) || 20));
    state.defaultExportBitrate = val * 1000000;
    var slider = $('setting-export-bitrate-slider');
    var readout = $('setting-export-bitrate-val');
    if (slider) slider.value = val;
    if (readout) readout.textContent = val + ' Mbps';
    localStorage.setItem('gradial-export-bitrate', val);
    initSliderFills();
    if (typeof renderGradientResolutions === 'function') renderGradientResolutions();
  }

  function setExportAlpha(enabled) {
    state.defaultExportAlpha = !!enabled;
    var btn = $('setting-export-alpha-toggle');
    var text = $('setting-export-alpha-text');
    if (btn) {
      btn.classList.toggle('active', state.defaultExportAlpha);
      if (text) text.textContent = state.defaultExportAlpha ? 'Enabled' : 'Disabled';
    }
    localStorage.setItem('gradial-export-alpha', state.defaultExportAlpha);
  }

  function updateSoundUI(enabled) {
    var btn = $('setting-sound-toggle');
    if (btn) {
      if (enabled) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="ph-fill ph-speaker-high"></i> <span id="setting-sound-text">Enabled</span>';
      } else {
        btn.innerHTML = '<i class="ph-fill ph-speaker-slash"></i> <span id="setting-sound-text">Muted</span>';
      }
    }
  }

  function setMotionUI(mode) {
    var btnSmooth = $('setting-motion-smooth');
    var btnSnappy = $('setting-motion-snappy');
    if (mode === 'snappy') {
      document.body.classList.add('no-animations');
      if (btnSnappy) btnSnappy.classList.add('active');
      if (btnSmooth) btnSmooth.classList.remove('active');
    } else {
      document.body.classList.remove('no-animations');
      if (btnSmooth) btnSmooth.classList.add('active');
      if (btnSnappy) btnSnappy.classList.remove('active');
    }
    localStorage.setItem('gradial-motion', mode);
  }

  function setGridUI(style) {
    var wrap = $('source-canvas-wrap');
    var btnDark = $('setting-grid-dark');
    var btnLight = $('setting-grid-light');
    if (style === 'light') {
      if (wrap) wrap.style.backgroundColor = '#e5e8eb';
      if (btnLight) btnLight.classList.add('active');
      if (btnDark) btnDark.classList.remove('active');
    } else {
      if (wrap) wrap.style.backgroundColor = '';
      if (btnDark) btnDark.classList.add('active');
      if (btnLight) btnLight.classList.remove('active');
    }
    localStorage.setItem('gradial-grid', style);
  }

  function loadTheme() {
    var savedTheme = localStorage.getItem('gradial-theme');
    if (savedTheme !== null) {
      applyTheme(savedTheme);
    } else {
      initSliderFills();
    }
  }

  function applyTheme(themeName) {
    var isStudio = document.body.classList.contains('studio-active');
    var isNoAnim = document.body.classList.contains('no-animations');
    document.body.className = themeName;
    if (isStudio) document.body.classList.add('studio-active');
    if (isNoAnim) document.body.classList.add('no-animations');
    localStorage.setItem('gradial-theme', themeName);
    
    // Update theme card active state
    document.querySelectorAll('.theme-card').forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-theme') === themeName);
    });

    initSliderFills();
    refreshLucideIcons();
  }

  function handleImageUpload(e) {
    var file = e.target.files[0];
    if (!file) return;

    show($('processing-spinner'));
    var reader = new FileReader();

    reader.onload = function (event) {
      var img = new Image();
      img.onload = function () {
        state.imageObj = img;
        state.imageSrc = event.target.result;
        state.targetColorPicked = false; // Do NOT auto-key out target color background on upload!
        state.tolerance = 0;
        state.edgeFeather = 0;

        if ($('tolerance-slider')) $('tolerance-slider').value = 0;
        if ($('tolerance-val')) $('tolerance-val').textContent = '0%';
        if ($('edge-feather-slider')) $('edge-feather-slider').value = 0;
        if ($('edge-feather-val')) $('edge-feather-val').textContent = '0%';

        // Sample top-left pixel for reference hex readout
        var sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 1; sampleCanvas.height = 1;
        var sctx = sampleCanvas.getContext('2d');
        sctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
        var pData = sctx.getImageData(0, 0, 1, 1).data;
        if (pData.length >= 4) {
          state.targetColor = { r: pData[0], g: pData[1], b: pData[2] };
        }

        // Setup Offscreen Canvas for Original Image (Restore brush reference)
        if (!state.origCanvas) {
          state.origCanvas = document.createElement('canvas');
          state.origCtx = state.origCanvas.getContext('2d', { willReadFrequently: true });
        }
        state.origCanvas.width = img.width;
        state.origCanvas.height = img.height;
        state.origCtx.clearRect(0, 0, img.width, img.height);
        state.origCtx.drawImage(img, 0, 0);

        // Setup Main Editor Canvas
        editorCanvas.width = img.width;
        editorCanvas.height = img.height;
        editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
        editorCtx.drawImage(img, 0, 0);

        // Enable UI Controls
        var pBtn = $('pick-color-btn'); if (pBtn) pBtn.disabled = false;
        var tSld = $('tolerance-slider'); if (tSld) tSld.disabled = false;

        hide($('upload-placeholder'));
        show($('source-canvas-wrap'));
        if ($('upload-label-text')) $('upload-label-text').textContent = 'Change Image';

        updateColorDisplay();
        processColorEraser();
        state.undoStack = [];
        state.redoStack = [];
        pushUndoState();
        hide($('processing-spinner'));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function updatePickingState() {
    var btn = $('pick-color-btn');
    if (!btn) return;
    if (state.isPickingColor) {
      btn.innerHTML = '<i class="ph-fill ph-eyedropper"></i><span>Click pixel on image...</span>';
      btn.style.borderColor = 'var(--color-seaweed)';
    } else {
      btn.innerHTML = '<i class="ph-fill ph-eyedropper"></i><span>Pick Color from Image</span>';
      btn.style.borderColor = 'rgba(255,255,255,0.05)';
    }
    updateCanvasCursor();
  }

  function updateCanvasCursor() {
    var wrap = $('source-canvas-wrap');
    if (state.eraserToolMode === 'pan' || state.spacebarDown) {
      editorCanvas.className = 'canvas-element';
      wrap.style.cursor = state.isPanning ? 'grabbing' : 'grab';
    } else {
      wrap.style.cursor = '';
      if (state.isPickingColor) {
        editorCanvas.className = 'canvas-element picking';
      } else if (state.eraserToolMode === 'brush') {
        editorCanvas.className = 'canvas-element brushing';
      } else {
        editorCanvas.className = 'canvas-element';
      }
    }
  }

  function handleCanvasMouseDown(e) {
    if (!state.imageObj) return;

    var rect = editorCanvas.getBoundingClientRect();
    // Use actual bounding client rect (which accounts for CSS transform scale)
    var scaleX = editorCanvas.width / rect.width;
    var scaleY = editorCanvas.height / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;

    if (state.isPickingColor) {
      var tempCanvas = document.createElement('canvas');
      tempCanvas.width = 1; tempCanvas.height = 1;
      var tctx = tempCanvas.getContext('2d');
      tctx.drawImage(state.imageObj, Math.floor(x), Math.floor(y), 1, 1, 0, 0, 1, 1);
      var pix = tctx.getImageData(0, 0, 1, 1).data;
      if (pix[3] > 0) {
        state.targetColor = { r: pix[0], g: pix[1], b: pix[2] };
        state.targetColorPicked = true;
        updateColorDisplay();
        scheduleProcessing();
      }
      state.isPickingColor = false;
      updatePickingState();
    } else if (state.eraserToolMode === 'brush') {
      state.isBrushing = true;
      state.lastBrushX = x;
      state.lastBrushY = y;
      drawSmoothBrushLine(x, y, x, y);
    }
  }

  function handleCanvasMouseMove(e) {
    if (!state.isBrushing || state.eraserToolMode !== 'brush') return;
    var rect = editorCanvas.getBoundingClientRect();
    var scaleX = editorCanvas.width / rect.width;
    var scaleY = editorCanvas.height / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;

    drawSmoothBrushLine(state.lastBrushX, state.lastBrushY, x, y);
    state.lastBrushX = x;
    state.lastBrushY = y;
  }

  function handleCanvasMouseUp() {
    if (state.isBrushing) {
      state.isBrushing = false;
      pushUndoState();
      updatePreviewFromEditorCanvas();
    }
  }

  // --- Smooth Hardware Accelerated Brush Drawing (No Lag, No Gaps) ---
  function drawSmoothBrushLine(x1, y1, x2, y2) {
    if (!editorCtx) return;

    editorCtx.save();
    editorCtx.globalCompositeOperation = 'destination-out';
    editorCtx.lineCap = 'round';
    editorCtx.lineJoin = 'round';
    editorCtx.lineWidth = state.brushSize || 40;

    editorCtx.beginPath();
    editorCtx.moveTo(x1, y1);
    editorCtx.lineTo(x2, y2);
    editorCtx.stroke();
    editorCtx.restore();
  }

  function updateColorDisplay() {
    if (!state.targetColor) {
      if ($('target-color-thumb')) $('target-color-thumb').style.backgroundColor = '#FFFFFF';
      if ($('target-color-hex')) $('target-color-hex').textContent = 'NONE';
      return;
    }
    var hex = rgbToHex(state.targetColor.r, state.targetColor.g, state.targetColor.b);
    if ($('target-color-thumb')) $('target-color-thumb').style.backgroundColor = hex;
    if ($('target-color-hex')) $('target-color-hex').textContent = hex.toUpperCase();
  }

  var isProcessingFrame = false;
  function scheduleProcessing() {
    if (isProcessingFrame) return;
    isProcessingFrame = true;
    requestAnimationFrame(function () {
      processColorEraser();
      isProcessingFrame = false;
    });
  }

  function processColorEraser() {
    if (!state.imageObj) {
      hide($('processing-spinner'));
      return;
    }

    editorCanvas.width = state.imageObj.width;
    editorCanvas.height = state.imageObj.height;
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.drawImage(state.imageObj, 0, 0);

    // Strict guard: ONLY run color distance keyer if user manually picked a color AND tolerance > 0
    if (state.targetColorPicked && state.targetColor && state.tolerance > 0) {
      try {
        var imageData = editorCtx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
        var data = imageData.data;
        var distanceThreshold = (state.tolerance / 100) * MAX_COLOR_DISTANCE;
        var tr = state.targetColor.r;
        var tg = state.targetColor.g;
        var tb = state.targetColor.b;
        var featherBand = ((state.edgeFeather || 0) / 100) * MAX_COLOR_DISTANCE * 0.35;

        for (var i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue;

          var rDiff = data[i] - tr;
          var gDiff = data[i + 1] - tg;
          var bDiff = data[i + 2] - tb;
          var dist = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);

          if (featherBand <= 0.001) {
            if (dist <= distanceThreshold) data[i + 3] = 0;
          } else {
            var innerEdge = distanceThreshold - featherBand;
            var outerEdge = distanceThreshold + featherBand;
            if (dist <= innerEdge) {
              data[i + 3] = 0;
            } else if (dist < outerEdge) {
              var t = (dist - innerEdge) / (outerEdge - innerEdge);
              data[i + 3] = Math.round(data[i + 3] * t);
            }
          }
        }

        editorCtx.putImageData(imageData, 0, 0);
      } catch (e) {
        console.error('Eraser processing error:', e);
      }
    }
    updatePreviewFromEditorCanvas();
    hide($('processing-spinner'));
  }

  function buildImageFilterCss(scale) {
    scale = scale || 1;
    var f = state.imageFilters || { brightness: 100, contrast: 100, saturate: 100, hue: 0, grayscale: 0, sepia: 0, invert: 0, blur: 0 };
    if (f.brightness === 100 && f.contrast === 100 && f.saturate === 100 &&
      (!f.hue) && (!f.grayscale) && (!f.sepia) && (!f.invert) && (!f.blur)) {
      return 'none';
    }
    var parts = [];
    if (f.brightness !== 100) parts.push('brightness(' + f.brightness + '%)');
    if (f.contrast !== 100) parts.push('contrast(' + f.contrast + '%)');
    if (f.saturate !== 100) parts.push('saturate(' + f.saturate + '%)');
    if (f.hue) parts.push('hue-rotate(' + f.hue + 'deg)');
    if (f.grayscale) parts.push('grayscale(' + f.grayscale + '%)');
    if (f.sepia) parts.push('sepia(' + f.sepia + '%)');
    if (f.invert) parts.push('invert(' + f.invert + '%)');
    if (f.blur) parts.push('blur(' + (f.blur * scale) + 'px)');
    return parts.length > 0 ? parts.join(' ') : 'none';
  }

  function updatePreviewFromEditorCanvas() {
    if (!editorCanvas || editorCanvas.width === 0 || editorCanvas.height === 0) return;

    // Downsample preview size for 60FPS UI feedback (max 800px dimension)
    var maxPreviewDim = 800;
    var previewW = editorCanvas.width;
    var previewH = editorCanvas.height;
    if (previewW > maxPreviewDim || previewH > maxPreviewDim) {
      var ratio = Math.min(maxPreviewDim / previewW, maxPreviewDim / previewH);
      previewW = Math.round(previewW * ratio);
      previewH = Math.round(previewH * ratio);
    }

    var tmp = document.createElement('canvas');
    tmp.width = previewW;
    tmp.height = previewH;
    var tctx = tmp.getContext('2d');
    tctx.clearRect(0, 0, previewW, previewH);
    tctx.imageSmoothingEnabled = true;
    tctx.imageSmoothingQuality = 'high';

    var filterCss = buildImageFilterCss(1);
    tctx.filter = filterCss;
    tctx.drawImage(editorCanvas, 0, 0, previewW, previewH);

    // Apply LUT & 2D Style Pad to lightweight preview image data (0 lag)
    if ((state.imgLut && state.imgLut !== 'none') || state.imgStylePad.tone !== 0 || state.imgStylePad.warmth !== 0) {
      var imgData = tctx.getImageData(0, 0, tmp.width, tmp.height);
      applyLutAndStylePadToImageData(imgData, state.imgLut, state.imgLutStrength, state.imgStylePad.tone, state.imgStylePad.warmth);
      tctx.putImageData(imgData, 0, 0);
    }

    // Render Backdrop Replacement mode in live preview
    var backdropMode = state.backdropMode || 'transparent';
    var finalTmp = tmp;

    if (backdropMode === 'mesh' || backdropMode === 'solid') {
      var bgComp = document.createElement('canvas');
      bgComp.width = previewW;
      bgComp.height = previewH;
      var bctx = bgComp.getContext('2d');
      if (backdropMode === 'mesh') {
        var mainCanvas = $('main-canvas');
        if (mainCanvas) {
          bctx.drawImage(mainCanvas, 0, 0, previewW, previewH);
        } else {
          bctx.fillStyle = '#171B19';
          bctx.fillRect(0, 0, previewW, previewH);
        }
      } else {
        bctx.fillStyle = state.backdropSolidColor || '#171B19';
        bctx.fillRect(0, 0, previewW, previewH);
      }
      bctx.drawImage(tmp, 0, 0);
      finalTmp = bgComp;
    }

    var url = finalTmp.toDataURL('image/png');
    var prevImg = $('preview-result-img');
    if (prevImg) {
      prevImg.src = url;
      show(prevImg);
    }
    if ($('preview-placeholder-text')) hide($('preview-placeholder-text'));
    renderImageExportBlock();
  }

  function applyAiSuperResolutionSharpening(ctx, w, h, scale, sharpenAmount) {
    if (!sharpenAmount || sharpenAmount <= 0) return;
    try {
      var imgData = ctx.getImageData(0, 0, w, h);
      var data = imgData.data;
      var copy = new Uint8ClampedArray(data);

      // Sharpening Kernel Strength factor based on scale (1x, 2x, 4x, 8x) and slider amount
      var factor = (sharpenAmount / 100) * (0.2 + scale * 0.12);

      // 3x3 High-Frequency Detail Recovery Kernel
      for (var y = 1; y < h - 1; y += 1) {
        for (var x = 1; x < w - 1; x += 1) {
          var idx = (y * w + x) * 4;

          // Skip fully transparent pixels
          if (copy[idx + 3] === 0) continue;

          for (var c = 0; c < 3; c++) {
            var center = copy[idx + c];
            var top = copy[((y - 1) * w + x) * 4 + c];
            var bottom = copy[((y + 1) * w + x) * 4 + c];
            var left = copy[(y * w + x - 1) * 4 + c];
            var right = copy[(y * w + x + 1) * 4 + c];

            var laplacian = (4 * center) - (top + bottom + left + right);
            var sharpened = center + laplacian * factor;

            data[idx + c] = Math.min(255, Math.max(0, Math.round(sharpened)));
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn('AI Sharpening Pass skipped:', e);
    }
  }

  function handleImageExport() {
    if (!state.imageObj) return;

    triggerSnappyExportProgress('Exporting Image (' + state.exportScale + 'x)', function () {
      var canvas = exportCanvas;
      var ctx = canvas.getContext('2d');

      var targetWidth = (state.imageObj ? state.imageObj.width : editorCanvas.width) * state.exportScale;
      var targetHeight = (state.imageObj ? state.imageObj.height : editorCanvas.height) * state.exportScale;

      // Clamp max canvas dimension to 8192px to prevent GPU memory/driver allocation crashes
      var maxDim = 8192;
      if (targetWidth > maxDim || targetHeight > maxDim) {
        var ratio = Math.min(maxDim / targetWidth, maxDim / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Apply CSS Filters to the canvas context (matches preview scaling)
      ctx.filter = buildImageFilterCss(1);
      ctx.drawImage(editorCanvas, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none'; // reset

      // 2. Apply LUT & 2D Style Pad to transparent image data BEFORE solid background fill,
      // so erased/transparent background pixels are skipped, matching live preview 100%
      if ((state.imgLut && state.imgLut !== 'none') || state.imgStylePad.tone !== 0 || state.imgStylePad.warmth !== 0) {
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyLutAndStylePadToImageData(imgData, state.imgLut, state.imgLutStrength, state.imgStylePad.tone, state.imgStylePad.warmth);
        ctx.putImageData(imgData, 0, 0);
      }

      // 3. Backdrop Replacement Engine (Transparent PNG, Mesh Gradient, or Solid Color)
      var backdropMode = state.backdropMode || 'transparent';

      if (backdropMode === 'mesh') {
        var bgCanvas = document.createElement('canvas');
        bgCanvas.width = canvas.width;
        bgCanvas.height = canvas.height;
        var bgCtx = bgCanvas.getContext('2d');
        
        var mainCanvas = $('main-canvas');
        if (mainCanvas) {
          bgCtx.drawImage(mainCanvas, 0, 0, bgCanvas.width, bgCanvas.height);
        } else {
          bgCtx.fillStyle = '#171B19';
          bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        }
        bgCtx.drawImage(canvas, 0, 0);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bgCanvas, 0, 0);
      } else if (backdropMode === 'solid') {
        var bgCanvas = document.createElement('canvas');
        bgCanvas.width = canvas.width;
        bgCanvas.height = canvas.height;
        var bgCtx = bgCanvas.getContext('2d');
        bgCtx.fillStyle = state.backdropSolidColor || '#171B19';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgCtx.drawImage(canvas, 0, 0);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bgCanvas, 0, 0);
      }

      // 4. AI Super-Resolution Sharpening & Edge Detail Recovery Pass
      var sharpenAmount = state.aiUpscaleSharpen !== undefined ? state.aiUpscaleSharpen : 40;
      if (sharpenAmount > 0) {
        applyAiSuperResolutionSharpening(ctx, canvas.width, canvas.height, state.exportScale, sharpenAmount);
      }

      try {
        canvas.toBlob(function (blob) {
          if (!blob) {
            console.error('Image export failed: canvas.toBlob returned null');
            return;
          }
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          var timestamp = new Date().getTime();
          link.download = 'gradial_export_' + state.exportScale + 'x_' + timestamp + '.png';
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(function () { URL.revokeObjectURL(url); }, 10000);

          var btn = $('image-export-main-btn');
          if (btn) {
            btn.innerHTML = '<i class="ph-fill ph-check"></i><span>Exported!</span>';
            setTimeout(function () {
              btn.innerHTML = '<i class="ph-fill ph-download-simple"></i><span>Export PNG</span>';
            }, 2000);
          }
        }, 'image/png', 1.0);
      } catch (err) {
        console.error('Export failed:', err);
      }
    });
  }

  function handleClearAllImage() {
        state.imageSrc = null;
        state.imageObj = null;
        state.isPickingColor = false;

        $('file-input-element').value = '';
        $('tolerance-slider').value = 15;
        $('tolerance-val').textContent = '15%';
        $('pick-color-btn').disabled = true;
        $('tolerance-slider').disabled = true;

        show($('upload-placeholder'));
        hide($('source-canvas-wrap'));
        hide($('preview-result-img'));
        show($('preview-placeholder-text'));
        $('upload-label-text').textContent = 'Upload Image';

        renderImageExportBlock();
      }

  function renderImageExportBlock() {
        var block = $('image-export-block');
        if (!block) return;

        var resolutions = [
          { label: 'Full HD (1080p)', scale: 1, width: 1920, height: 1080 },
          { label: '2K QHD (1440p)', scale: 2, width: 2560, height: 1440 },
          { label: '4K Ultra HD', scale: 4, width: 3840, height: 2160 },
          { label: '8K Ultra HD', scale: 8, width: 7680, height: 4320 },
          { label: 'Mobile Portrait (9:16)', scale: 2, width: 1080, height: 1920 },
          { label: 'Square Post (1:1)', scale: 2, width: 1080, height: 1080 }
        ];

        if (!state.selectedImageResolution) {
          state.selectedImageResolution = resolutions[1]; // Default 2K QHD (1440p)
          state.exportScale = resolutions[1].scale;
        }

        var isMenuOpen = !!state.isImageExportMenuOpen;

        var resListHtml = resolutions.map(function (res) {
          var isSelected = state.selectedImageResolution && state.selectedImageResolution.label === res.label;
          var checkIcon = isSelected ? '<i class="ph-fill ph-check" style="font-size:14px; color:var(--accent-primary);"></i> ' : '';
          return '<button class="dropdown-item-sk' + (isSelected ? ' selected' : '') + '" type="button" data-res-label="' + res.label + '" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: none; background: ' + (isSelected ? 'var(--bg-recessed)' : 'transparent') + '; color: var(--text-main); font-weight: 700; font-size: 0.84rem; cursor: pointer; border-radius: 8px; transition: background 0.15s ease; white-space: nowrap; gap: 12px;">' +
            '<div style="display:flex; align-items:center; gap:8px; white-space:nowrap; overflow:hidden;">' +
            checkIcon +
            '<span style="font-weight:700;">' + res.label + '</span>' +
            '</div>' +
            '<span style="font-family:var(--font-mono); font-size:0.75rem; opacity:0.75; white-space:nowrap; flex-shrink:0;">' + res.width + ' × ' + res.height + '</span>' +
            '</button>';
        }).join('');

        block.innerHTML =
          '<div style="position: relative;" id="image-export-dropdown-anchor">' +
          '<div style="display: flex; gap: 8px;">' +
          '<button class="btn-sk btn-primary-sk" id="image-export-main-btn" style="flex: 1; min-width: 0;">' +
          '<i class="ph-fill ph-download-simple"></i>' +
          '<span>Export PNG</span>' +
          '</button>' +
          '<button class="btn-sk btn-icon-sk" id="image-export-chevron-btn" title="Select Resolution" style="flex-shrink: 0; width: 42px; padding: 0; display: flex; align-items: center; justify-content: center;">' +
          '<i class="ph ' + (isMenuOpen ? 'ph-caret-up' : 'ph-caret-down') + '"></i>' +
          '</button>' +
          '</div>' +
          '<div class="dropdown-menu-sk' + (isMenuOpen ? '' : ' hidden') + '" id="image-export-menu-sk" style="position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 8px; width: 100%; box-sizing: border-box; z-index: 999; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); padding: 6px; display: ' + (isMenuOpen ? 'block' : 'none') + ';">' +
          '<div class="dropdown-header-sk" style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); padding: 8px 12px 6px;">RESOLUTIONS</div>' +
          '<div id="image-resolutions-list" style="display: flex; flex-direction: column; gap: 2px;">' +
          resListHtml +
          '</div>' +
          '</div>' +
          '</div>' +
          (state.imageObj ?
            '<div style="height: 8px;"></div>' +
            '<button class="btn-sk btn-danger-sk" id="image-clear-all-btn" style="width: 100%; height: 32px; font-size: 0.78rem;">' +
            '<i class="ph-fill ph-arrow-counter-clockwise"></i> Clear Image' +
            '</button>' : ''
          );

        // Toggle chevron menu
        var chevBtn = $('image-export-chevron-btn');
        if (chevBtn) {
          chevBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            audioManager.play('pop');
            state.isImageExportMenuOpen = !state.isImageExportMenuOpen;
            renderImageExportBlock();
          });
        }

        // Bind resolution options
        block.querySelectorAll('#image-resolutions-list .dropdown-item-sk').forEach(function (item) {
          item.addEventListener('click', function (e) {
            e.stopPropagation();
            audioManager.play('pop');
            var label = item.dataset.resLabel;
            var found = resolutions.find(function (r) { return r.label === label; });
            if (found) {
              state.selectedImageResolution = found;
              state.exportScale = found.scale;
            }
            state.isImageExportMenuOpen = false;
            renderImageExportBlock();
          });
        });

        // Main Export button handler
        var exportBtn = $('image-export-main-btn');
        if (exportBtn) {
          exportBtn.addEventListener('click', function () {
            if (state.imageObj) {
              handleImageExport();
            } else {
              audioManager.play('pop');
              var fileInp = $('file-input-element');
              if (fileInp) fileInp.click();
            }
          });
        }

        // Clear Image button
        var clearBtn = $('image-clear-all-btn');
        if (clearBtn) {
          clearBtn.addEventListener('click', handleClearAllImage);
        }
      }

  function renderColorStops() {
        var list = $('color-stops-list');
        list.innerHTML = '';

        // Live Gradient Strip Bar Visualizer
        var stripBar = document.createElement('div');
        stripBar.className = 'gradient-strip-bar';
        stripBar.style.background = 'linear-gradient(90deg, ' + state.gradientColors.join(', ') + ')';
        list.appendChild(stripBar);

        state.gradientColors.forEach(function (color, idx) {
          var card = document.createElement('div');
          card.className = 'color-stop-card';

          var quickDotsHtml = QUICK_PALETTE_COLORS.map(function (qc) {
            return '<div class="quick-color-dot" style="background-color: ' + qc + ';" data-qc="' + qc + '" data-idx="' + idx + '" title="Apply ' + qc + '"></div>';
          }).join('');

          card.innerHTML =
            '<div class="color-stop-card-main">' +
            '<div class="color-picker-wrap custom-cp-trigger" data-cidx="' + idx + '" style="cursor: pointer;">' +
            '<div class="color-picker-swatch" style="background-color: ' + color + '; pointer-events: none;"></div>' +
            '</div>' +
            '<input type="text" class="text-input-sk" value="' + color.toUpperCase() + '" data-idx="' + idx + '">' +
            '<button class="color-stop-remove-btn" data-idx="' + idx + '"' + (state.gradientColors.length <= 2 ? ' disabled' : '') + '>' +
            '<i class="ph-fill ph-trash" style="font-size: 14px;"></i>' +
            '</button>' +
            '</div>' +
            '<div class="quick-palette-row">' +
            '<span class="quick-palette-label">Presets:</span>' +
            quickDotsHtml +
            '</div>';

          list.appendChild(card);
        });

        // Custom Color Pickers
        list.querySelectorAll('.custom-cp-trigger').forEach(function (trigger) {
          trigger.addEventListener('click', function () {
            var idx = Number(trigger.dataset.cidx);
            openCustomColorPicker(state.gradientColors[idx], function (newColor) {
              state.gradientColors[idx] = newColor;
              syncSelectedKeyframe();
              renderColorStops();
              updateGradientPreview();
              updateCssOutput();
            });
          });
        });

        list.querySelectorAll('.text-input-sk').forEach(function (inp) {
          inp.addEventListener('input', function () {
            var idx = Number(inp.dataset.idx);
            var val = inp.value.trim();
            if (val && !val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{3,6}$/.test(val)) {
              var hex = val;
              if (hex.length === 4) {
                hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
              }
              state.gradientColors[idx] = hex;
              syncSelectedKeyframe();
              updateGradientPreview();
              updateCssOutput();
              var swatch = inp.closest('.color-stop-card-main').querySelector('.color-picker-swatch');
              if (swatch) swatch.style.backgroundColor = hex;
            }
          });
        });

        // Quick Color Dots (1-Click Preset Pop)
        list.querySelectorAll('.quick-color-dot').forEach(function (dot) {
          dot.addEventListener('click', function () {
            audioManager.play('pop');
            var idx = Number(dot.dataset.idx);
            var qc = dot.dataset.qc;
            state.gradientColors[idx] = qc;
            syncSelectedKeyframe();
            renderColorStops();
            updateGradientPreview();
            updateCssOutput();
          });
        });

        // Color Stop Remove Buttons
        list.querySelectorAll('.color-stop-remove-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (state.gradientColors.length <= 2) return;
            audioManager.play('pop');
            var idx = Number(btn.dataset.idx);
            state.gradientColors.splice(idx, 1);
            syncSelectedKeyframe();
            renderColorStops();
            updateGradientPreview();
            updateCssOutput();
          });
        });
      }
  function renderGradientResolutions() {
        var list = $('gradient-resolutions-list');
        if (!list) return;
        list.innerHTML = '';
        var currentMbps = Math.round((state.defaultExportBitrate || 40000000) / 1000000) + ' Mbps';
        var isAnimatedMode = (state.gradientMode === 'animated' || state.gradientMode === 'aurora' || state.gradientMode === 'lavalamp');

        var savedResJson = localStorage.getItem('gradial_selected_export_resolution');
        if (savedResJson && !state.selectedExportResolution) {
          try { state.selectedExportResolution = JSON.parse(savedResJson); } catch (e) { }
        }
        if (!state.selectedExportResolution && typeof GRADIENT_RESOLUTIONS !== 'undefined') {
          state.selectedExportResolution = GRADIENT_RESOLUTIONS[0];
        }

        GRADIENT_RESOLUTIONS.forEach(function (res) {
          var btn = document.createElement('button');
          btn.className = 'dropdown-item-sk';
          btn.type = 'button';
          var isSelected = state.selectedExportResolution && state.selectedExportResolution.label === res.label;
          btn.style.cssText = 'width: 100%; display: flex; flex-direction: column; padding: 10px 12px; border: none; background: ' + (isSelected ? 'var(--bg-recessed)' : 'transparent') + '; color: var(--text-main); font-weight: 700; cursor: pointer; border-radius: 8px; transition: background 0.15s ease; gap: 4px; box-sizing: border-box; text-align: left;';

          var bitrateBadge = isAnimatedMode ? '<span class="res-bitrate-badge" style="font-family: var(--font-main); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.02em; padding: 2px 8px; border-radius: 999px; background: rgba(0, 213, 255, 0.16); color: var(--accent-primary); border: 1px solid var(--border-color); flex-shrink: 0; display: inline-flex; align-items: center; white-space: nowrap;">' + currentMbps + '</span>' : '';
          var checkIcon = isSelected ? '<i class="ph-fill ph-check" style="font-size:14px; color:var(--accent-primary); flex-shrink:0;"></i>' : '<span style="width:14px; flex-shrink:0;"></span>';

          btn.innerHTML =
            '<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">' +
            '<div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">' +
            checkIcon +
            '<span style="font-weight: 800; font-size: 0.86rem; color: var(--text-main); white-space: nowrap;">' + res.label + '</span>' +
            '</div>' +
            bitrateBadge +
            '</div>' +
            '<div style="display: flex; align-items: center; justify-content: flex-start; width: 100%; padding-left: 22px;">' +
            '<span style="font-family: var(--font-mono); font-size: 0.75rem; opacity: 0.8; color: var(--text-sub); font-weight: 600;">' + res.width + ' × ' + res.height + '</span>' +
            '</div>';

          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            audioManager.play('pop');
            state.selectedExportResolution = res;
            localStorage.setItem('gradial_selected_export_resolution', JSON.stringify(res));
            state.isGradientExportMenuOpen = false;
            var menu = $('gradient-export-menu');
            if (menu) hide(menu);
            updateGradientSections();
          });
          list.appendChild(btn);
        });
      }

  function updateGradientSections() {
        var mode = state.gradientMode;

        toggle($('color-stops-container'), mode === 'linear');
        toggle($('corner-mesh-container'), mode === '4-corner');
        toggle($('corner-mesh-6-container'), mode === '6-corner');
        toggle($('animated-type-container'), mode === 'animated');
        toggle($('angle-container'), mode === 'linear');
        if ($('positional-container')) toggle($('positional-container'), mode === 'positional');
        if ($('media-timeline-container')) toggle($('media-timeline-container'), mode === 'animated');

        if (mode === 'positional') {
          renderPositionalPointsList();
        } else if (mode === '4-corner') {
          renderCornerGrid();
        } else if (mode === '6-corner') {
          renderCorner6Grid();
        } else if (mode === 'animated') {
          if (typeof renderTimelineMarkers === 'function') renderTimelineMarkers();
          if (typeof renderKeyframesList === 'function') renderKeyframesList();
          startAnimatedGradientLoop();
        }

        renderCanvasHandlesOverlay();

        // Dynamic Export Button Label
        var exportBtn = $('gradient-export-main-btn');
        if (exportBtn) {
          var isVideoMode = (mode === 'animated');
          var icon = isVideoMode ? 'ph-video-camera' : 'ph-download-simple';
          var label = isVideoMode ? 'Export Video (MP4)' : 'Export PNG';
          exportBtn.innerHTML = '<i class="ph ' + icon + '"></i><span>' + label + '</span>';
        }
      }

  // --- 6-Corner Mesh Control Panel Generator ---
  function renderCorner6Grid() {
        var grid = $('corner-grid-6-list');
        if (!grid) return;
        var labels = ['Top Left', 'Top Center', 'Top Right', 'Bottom Left', 'Bottom Center', 'Bottom Right'];
        var stateMap = [0, 1, 2, 3, 4, 5];
        grid.innerHTML = '';

        var corners = [
          { label: 'Top-Left', idx: 0 },
          { label: 'Top-Right', idx: 1 },
          { label: 'Bottom-Left', idx: 2 },
          { label: 'Bottom-Right', idx: 3 }
        ];

        corners.forEach(function (c) {
          var stateIdx = c.idx;
          var color = state.meshColors[stateIdx] || '#3b82f6';
          var intensity = state.meshIntensities[stateIdx] || 100;
          var label = c.label;

          var quickDotsHtml = QUICK_PALETTE_COLORS.map(function (qc) {
            return '<div class="quick-color-dot" style="background-color: ' + qc + ';" data-qc="' + qc + '" data-sidx="' + stateIdx + '" title="Apply ' + qc + '"></div>';
          }).join('');

          var card = document.createElement('div');
          card.className = 'corner-card';
          card.innerHTML =
            '<div style="display: flex; align-items: center; justify-content: space-between;">' +
            '<span class="corner-card-label">' + label + '</span>' +
            '<span class="slider-val-badge corner-intensity-badge" style="font-size: 0.65rem; padding: 1px 6px;">' + intensity + '%</span>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 6px;">' +
            '<div class="color-picker-wrap custom-cp-trigger" data-sidx="' + stateIdx + '" style="width: 28px; height: 28px; cursor: pointer;">' +
            '<div class="color-picker-swatch" style="background-color: ' + color + '; pointer-events: none;"></div>' +
            '</div>' +
            '<input type="text" class="text-input-sk" value="' + color.toUpperCase() + '" data-sidx="' + stateIdx + '" style="font-size: 0.72rem; padding: 4px 6px;">' +
            '</div>' +
            '<div class="quick-palette-row" style="margin-top: 2px;">' +
            quickDotsHtml +
            '</div>' +
            '<div style="display: flex; flex-direction: column; gap: 2px; margin-top: 2px;">' +
            '<div style="display: flex; justify-content: space-between; font-size: 0.6rem; color: var(--text-muted);">' +
            '<span>Intensity</span>' +
            '</div>' +
            '<input type="range" class="corner-intensity-slider" min="20" max="130" value="' + intensity + '" data-sidx="' + stateIdx + '">' +
            '</div>';

          grid.appendChild(card);
        });

        grid.querySelectorAll('.custom-cp-trigger').forEach(function (trigger) {
          trigger.addEventListener('click', function () {
            var sidx = Number(trigger.dataset.sidx);
            openCustomColorPicker(state.meshColors[sidx], function (newColor) {
              state.meshColors[sidx] = newColor;
              renderCornerGrid();
              updateGradientPreview();
              updateCssOutput();
            });
          });
        });

        grid.querySelectorAll('.text-input-sk').forEach(function (inp) {
          inp.addEventListener('input', function () {
            var sidx = Number(inp.dataset.sidx);
            var val = inp.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              state.meshColors[sidx] = val;
              renderCornerGrid();
              updateGradientPreview();
              updateCssOutput();
            }
          });
        });

        grid.querySelectorAll('.quick-color-dot').forEach(function (dot) {
          dot.addEventListener('click', function () {
            var sidx = Number(dot.dataset.sidx);
            state.meshColors[sidx] = dot.dataset.qc;
            renderCornerGrid();
            updateGradientPreview();
            updateCssOutput();
          });
        });

        grid.querySelectorAll('.corner-intensity-slider').forEach(function (slider) {
          slider.addEventListener('input', function () {
            var sidx = Number(slider.dataset.sidx);
            var val = Number(slider.value);
            state.meshIntensities[sidx] = val;
            slider.closest('.corner-card').querySelector('.corner-intensity-badge').textContent = val + '%';
            updateGradientPreview();
            updateCssOutput();
          });
        });
        container.innerHTML = '';

        state.fluidPoints.forEach(function (pt, idx) {
          var card = document.createElement('div');
          card.className = 'fluid-point-card';

          var quickDotsHtml = QUICK_PALETTE_COLORS.map(function (qc) {
            return '<div class="quick-color-dot" style="background-color: ' + qc + ';" data-qc="' + qc + '" data-fidx="' + idx + '" title="Apply ' + qc + '"></div>';
          }).join('');

          card.innerHTML =
            '<div class="fluid-point-header">' +
            '<div class="fluid-point-title"><span style="width:10px; height:10px; border-radius:50%; background:' + pt.color + ';"></span> Spot #' + (idx + 1) + '</div>' +
            '<button class="fluid-point-remove-btn" data-fidx="' + idx + '"' + (state.fluidPoints.length <= 2 ? ' disabled' : '') + '><i class="ph-fill ph-x" style="font-size:12px;"></i></button>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 6px;">' +
            '<div class="color-picker-wrap custom-cp-fluid" data-fidx="' + idx + '" style="width: 28px; height: 28px; cursor: pointer;">' +
            '<div class="color-picker-swatch" style="background-color: ' + pt.color + '; pointer-events: none;"></div>' +
            '</div>' +
            '<input type="text" class="text-input-sk text-input-fluid" value="' + pt.color.toUpperCase() + '" data-fidx="' + idx + '" style="font-size: 0.72rem; padding: 4px 6px;">' +
            '</div>' +
            '<div class="quick-palette-row">' + quickDotsHtml + '</div>' +
            '<div class="slider-container" style="margin-top: 4px;">' +
            '<div class="slider-info-row"><span class="slider-title">Spread Radius</span><span class="slider-val-badge">' + Math.round((pt.radius || 0.65) * 100) + '%</span></div>' +
            '<input type="range" class="fluid-radius-slider" min="0.2" max="1.2" step="0.05" value="' + (pt.radius || 0.65) + '" data-fidx="' + idx + '">' +
            '</div>' +
            '<div class="slider-container" style="margin-top: 4px;">' +
            '<div class="slider-info-row"><span class="slider-title">Intensity</span><span class="slider-val-badge">' + pt.intensity + '%</span></div>' +
            '<input type="range" class="fluid-intensity-slider" min="20" max="130" value="' + pt.intensity + '" data-fidx="' + idx + '">' +
            '</div>';

          container.appendChild(card);
        });

        container.querySelectorAll('.custom-cp-fluid').forEach(function (trigger) {
          trigger.addEventListener('click', function () {
            var fidx = Number(trigger.dataset.fidx);
            openCustomColorPicker(state.fluidPoints[fidx].color, function (newColor) {
              state.fluidPoints[fidx].color = newColor;
              renderFluidPointsList();
              updateGradientPreview();
              updateCssOutput();
            });
          });
        });

        container.querySelectorAll('.text-input-fluid').forEach(function (inp) {
          inp.addEventListener('input', function () {
            var fidx = Number(inp.dataset.fidx);
            var val = inp.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              state.fluidPoints[fidx].color = val;
              renderFluidPointsList();
              updateGradientPreview();
              updateCssOutput();
            }
          });
        });

        container.querySelectorAll('.quick-color-dot').forEach(function (dot) {
          dot.addEventListener('click', function () {
            var fidx = Number(dot.dataset.fidx);
            state.fluidPoints[fidx].color = dot.dataset.qc;
            renderFluidPointsList();
            updateGradientPreview();
            updateCssOutput();
          });
        });

        container.querySelectorAll('.fluid-radius-slider').forEach(function (slider) {
          slider.addEventListener('input', function () {
            var fidx = Number(slider.dataset.fidx);
            state.fluidPoints[fidx].radius = Number(slider.value);
            updateGradientPreview();
            updateCssOutput();
          });
        });

        container.querySelectorAll('.fluid-intensity-slider').forEach(function (slider) {
          slider.addEventListener('input', function () {
            var fidx = Number(slider.dataset.fidx);
            state.fluidPoints[fidx].intensity = Number(slider.value);
            updateGradientPreview();
            updateCssOutput();
          });
        });

        container.querySelectorAll('.fluid-point-remove-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (state.fluidPoints.length <= 2) return;
            var fidx = Number(btn.dataset.fidx);
            state.fluidPoints.splice(fidx, 1);
            renderFluidPointsList();
            updateGradientPreview();
            updateCssOutput();
          });
        });
      }

  function renderPositionalPointsList() {
        var container = $('positional-points-list');
        if (!container) return;
        container.innerHTML = '';

        (state.positionalPoints || []).forEach(function (pt, idx) {
          var card = document.createElement('div');
          card.className = 'color-stop-card';
          card.style.cssText = 'background: var(--bg-card); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px;';

          var quickDotsHtml = QUICK_PALETTE_COLORS.map(function (qc) {
            return '<div class="quick-color-dot" style="background-color: ' + qc + ';" data-qc="' + qc + '" data-pidx="' + idx + '" title="Apply ' + qc + '"></div>';
          }).join('');

          card.innerHTML =
            '<div style="display: flex; align-items: center; justify-content: space-between;">' +
            '<span class="corner-card-label" style="font-weight: 700; font-size: 0.78rem; color: var(--accent-primary);">Point #' + (idx + 1) + '</span>' +
            '<button class="positional-point-remove-btn btn-sk btn-icon-sk" data-pidx="' + idx + '"' + ((state.positionalPoints.length <= 2) ? ' disabled' : '') + ' style="width: 22px; height: 22px; padding: 0;">' +
            '<i class="ph-fill ph-x" style="font-size:12px;"></i>' +
            '</button>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 8px;">' +
            '<div class="color-picker-wrap custom-cp-trigger" data-pidx="' + idx + '" style="width: 28px; height: 28px; cursor: pointer; flex-shrink:0;">' +
            '<div class="color-picker-swatch" style="background-color: ' + pt.color + '; pointer-events: none;"></div>' +
            '</div>' +
            '<input type="text" class="text-input-sk positional-hex-input" value="' + pt.color.toUpperCase() + '" data-pidx="' + idx + '" style="flex: 1; font-size: 0.75rem; padding: 4px 6px;">' +
            '</div>' +
            '<div style="display: flex; flex-direction: column; gap: 4px;">' +
            '<div style="display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: 600; color: var(--text-sub);">' +
            '<span>Intensity</span>' +
            '<span class="positional-intensity-badge" style="font-family: var(--font-mono); color: var(--accent-primary);">' + (pt.intensity || 85) + '%</span>' +
            '</div>' +
            '<input type="range" class="positional-intensity-slider sk-slider" min="20" max="150" value="' + (pt.intensity || 85) + '" data-pidx="' + idx + '">' +
            '</div>' +
            '<div style="display: flex; flex-direction: column; gap: 4px;">' +
            '<div style="display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: 600; color: var(--text-sub);">' +
            '<span>Radius</span>' +
            '<span class="positional-radius-badge" style="font-family: var(--font-mono); color: var(--accent-primary);">' + Math.round((pt.radius || 0.7) * 100) + '%</span>' +
            '</div>' +
            '<input type="range" class="positional-radius-slider sk-slider" min="10" max="150" value="' + Math.round((pt.radius || 0.7) * 100) + '" data-pidx="' + idx + '">' +
            '</div>';

          container.appendChild(card);
        });


        // Color Studio Custom Color Picker
        container.querySelectorAll('.custom-cp-trigger').forEach(function (trigger) {
          trigger.addEventListener('click', function () {
            var pidx = Number(trigger.dataset.pidx);
            openCustomColorPicker(state.positionalPoints[pidx].color, function (newColor) {
              state.positionalPoints[pidx].color = newColor;
              renderPositionalPointsList();
              renderCanvasHandlesOverlay();
              updateGradientPreview();
              updateCssOutput();
            });
          });
        });

        // Hex Text Input
        container.querySelectorAll('.positional-hex-input').forEach(function (inp) {
          inp.addEventListener('input', function () {
            var pidx = Number(inp.dataset.pidx);
            var val = inp.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
              state.positionalPoints[pidx].color = val;
              renderCanvasHandlesOverlay();
              updateGradientPreview();
              updateCssOutput();
              var swatch = inp.closest('.color-stop-card, div').querySelector('.color-picker-swatch');
              if (swatch) swatch.style.backgroundColor = val;
            }
          });
        });

        // Quick Color Dots
        container.querySelectorAll('.quick-color-dot').forEach(function (dot) {
          dot.addEventListener('click', function () {
            audioManager.play('pop');
            var pidx = Number(dot.dataset.pidx);
            var qc = dot.dataset.qc;
            state.positionalPoints[pidx].color = qc;
            renderPositionalPointsList();
            renderCanvasHandlesOverlay();
            updateGradientPreview();
            updateCssOutput();
          });
        });

        // Per-Point Intensity Sliders
        container.querySelectorAll('.positional-intensity-slider').forEach(function (slider) {
          slider.addEventListener('input', function () {
            var pidx = Number(slider.dataset.pidx);
            var val = Number(slider.value);
            state.positionalPoints[pidx].intensity = val;
            slider.closest('div').querySelector('.positional-intensity-badge').textContent = val + '%';
            updateGradientPreview();
            updateCssOutput();
          });
        });

        // Per-Point Spread Radius Sliders
        container.querySelectorAll('.positional-radius-slider').forEach(function (slider) {
          slider.addEventListener('input', function () {
            var pidx = Number(slider.dataset.pidx);
            var val = Number(slider.value);
            state.positionalPoints[pidx].radius = val / 100;
            slider.closest('div').querySelector('.positional-radius-badge').textContent = val + '%';
            updateGradientPreview();
            updateCssOutput();
          });
        });

        // Delete Point Buttons
        container.querySelectorAll('.positional-point-remove-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (state.positionalPoints.length <= 2) return;
            audioManager.play('pop');
            var pidx = Number(btn.dataset.pidx);
            state.positionalPoints.splice(pidx, 1);
            renderPositionalPointsList();
            renderCanvasHandlesOverlay();
            updateGradientPreview();
            updateCssOutput();
          });
        });
      }

  // --- Interactive Canvas Drag Handles Overlay Generator ---
  function renderCanvasHandlesOverlay() {
        var overlay = $('canvas-handles-overlay');
        if (!overlay) return;
        overlay.innerHTML = '';

        var mode = state.gradientMode;
        if (mode !== 'linear' && mode !== '4-corner' && mode !== '6-corner' && mode !== 'fluid' && mode !== 'positional') return;

        if (mode === 'linear') {
          var angle = state.gradientAngle || 90;
          var rad = (angle - 90) * (Math.PI / 180);
          var midPct = state.gradientMidpoint !== undefined ? state.gradientMidpoint : 50;

          // Draw SVG overlay line
          var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('style', 'position:absolute; inset:0; width:100%; height:100%; pointer-events:none;');
          var cxPct = 50, cyPct = 50;
          var lenPct = 35; // 35% radius
          var startXPct = cxPct - Math.cos(rad) * lenPct;
          var startYPct = cyPct - Math.sin(rad) * lenPct;
          var endXPct = cxPct + Math.cos(rad) * lenPct;
          var endYPct = cyPct + Math.sin(rad) * lenPct;

          var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', startXPct + '%');
          line.setAttribute('y1', startYPct + '%');
          line.setAttribute('x2', endXPct + '%');
          line.setAttribute('y2', endYPct + '%');
          line.setAttribute('stroke', 'var(--accent-primary, #49A078)');
          line.setAttribute('stroke-width', '2');
          line.setAttribute('stroke-dasharray', '4 4');
          svg.appendChild(line);
          overlay.appendChild(svg);

          // Midpoint Handle
          var midXPct = startXPct + (endXPct - startXPct) * (midPct / 100);
          var midYPct = startYPct + (endYPct - startYPct) * (midPct / 100);

          var midHandle = document.createElement('div');
          midHandle.className = 'canvas-point-handle linear-midpoint-handle';
          midHandle.style.left = midXPct + '%';
          midHandle.style.top = midYPct + '%';
          midHandle.style.backgroundColor = 'var(--accent-primary, #49A078)';
          midHandle.style.border = '2px solid #ffffff';
          midHandle.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
          midHandle.innerHTML = '<span class="canvas-point-handle-label">Mid: ' + Math.round(midPct) + '%</span>';

          var isMidDragging = false;
          midHandle.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            isMidDragging = true;
            midHandle.setPointerCapture(e.pointerId);
          });
          midHandle.addEventListener('pointermove', function (e) {
            if (!isMidDragging) return;
            var rect = overlay.getBoundingClientRect();
            var clickX = e.clientX - rect.left;
            var clickY = e.clientY - rect.top;
            var startX = (startXPct / 100) * rect.width;
            var startY = (startYPct / 100) * rect.height;
            var endX = (endXPct / 100) * rect.width;
            var endY = (endYPct / 100) * rect.height;

            var dx = endX - startX;
            var dy = endY - startY;
            var lenSq = dx * dx + dy * dy;
            if (lenSq === 0) return;

            var t = ((clickX - startX) * dx + (clickY - startY) * dy) / lenSq;
            t = Math.max(0.05, Math.min(0.95, t));
            var newMid = Math.round(t * 100);
            state.gradientMidpoint = newMid;

            var currMidXPct = startXPct + (endXPct - startXPct) * (newMid / 100);
            var currMidYPct = startYPct + (endYPct - startYPct) * (newMid / 100);
            midHandle.style.left = currMidXPct + '%';
            midHandle.style.top = currMidYPct + '%';

            var labelSpan = midHandle.querySelector('.canvas-point-handle-label');
            if (labelSpan) labelSpan.textContent = 'Mid: ' + newMid + '%';

            if ($('gradient-midpoint-slider')) $('gradient-midpoint-slider').value = newMid;
            if ($('gradient-midpoint-val')) $('gradient-midpoint-val').textContent = newMid + '%';

            updateGradientPreview();
            updateCssOutput();
          });
          midHandle.addEventListener('pointerup', function (e) {
            isMidDragging = false;
            try { midHandle.releasePointerCapture(e.pointerId); } catch (err) { }
          });
          overlay.appendChild(midHandle);
          return;
        }

        var handlesData = [];

        if (mode === '4-corner') {
          handlesData = [
            { label: 'TL', x: 0.05, y: 0.05, color: state.meshColors[0], type: '4corner', idx: 0 },
            { label: 'TR', x: 0.95, y: 0.05, color: state.meshColors[1], type: '4corner', idx: 1 },
            { label: 'BR', x: 0.95, y: 0.95, color: state.meshColors[2], type: '4corner', idx: 2 },
            { label: 'BL', x: 0.05, y: 0.95, color: state.meshColors[3], type: '4corner', idx: 3 }
          ];
        } else if (mode === '6-corner') {
          handlesData = [
            { label: 'TL', x: 0.05, y: 0.05, color: state.mesh6Colors[0], type: '6corner', idx: 0 },
            { label: 'TC', x: 0.50, y: 0.05, color: state.mesh6Colors[1], type: '6corner', idx: 1 },
            { label: 'TR', x: 0.95, y: 0.05, color: state.mesh6Colors[2], type: '6corner', idx: 2 },
            { label: 'BL', x: 0.05, y: 0.95, color: state.mesh6Colors[3], type: '6corner', idx: 3 },
            { label: 'BC', x: 0.50, y: 0.95, color: state.mesh6Colors[4], type: '6corner', idx: 4 },
            { label: 'BR', x: 0.95, y: 0.95, color: state.mesh6Colors[5], type: '6corner', idx: 5 }
          ];
        } else if (mode === 'fluid') {
          handlesData = state.fluidPoints.map(function (pt, idx) {
            return { label: '#' + (idx + 1), x: pt.x, y: pt.y, color: pt.color, type: 'fluid', idx: idx };
          });
        } else if (mode === 'positional') {
          handlesData = (state.positionalPoints || []).map(function (pt, idx) {
            return { label: '#' + (idx + 1), x: pt.x, y: pt.y, color: pt.color, type: 'positional', idx: idx };
          });
        }

        handlesData.forEach(function (h) {
          var handleEl = document.createElement('div');
          handleEl.className = 'canvas-point-handle';
          handleEl.style.left = (h.x * 100) + '%';
          handleEl.style.top = (h.y * 100) + '%';
          handleEl.style.backgroundColor = h.color;
          handleEl.innerHTML = '<span class="canvas-point-handle-label">' + h.label + '</span>';

          var isDragging = false;

          function onPointerMove(e) {
            if (!isDragging) return;
            var rect = overlay.getBoundingClientRect();
            var x = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width));
            var y = Math.max(0.01, Math.min(0.99, (e.clientY - rect.top) / rect.height));

            handleEl.style.left = (x * 100) + '%';
            handleEl.style.top = (y * 100) + '%';

            if (h.type === 'fluid') {
              state.fluidPoints[h.idx].x = x;
              state.fluidPoints[h.idx].y = y;
            } else if (h.type === 'positional') {
              state.positionalPoints[h.idx].x = x;
              state.positionalPoints[h.idx].y = y;
              if ($('positional-points-list')) {
                var card = $('positional-points-list').children[h.idx];
                if (card) {
                  var labelSpan = card.querySelector('span[style*="font-mono"]');
                  if (labelSpan) labelSpan.textContent = '(' + Math.round(x * 100) + '%, ' + Math.round(y * 100) + '%)';
                }
              }
            }

            updateGradientPreview();
            updateCssOutput();
          }

          handleEl.addEventListener('pointerdown', function (e) {
            isDragging = true;
            handleEl.classList.add('dragging');
            handleEl.setPointerCapture(e.pointerId);
            audioManager.play('pop');
            e.stopPropagation();
          });

          handleEl.addEventListener('pointermove', onPointerMove);

          handleEl.addEventListener('pointerup', function (e) {
            if (isDragging) {
              isDragging = false;
              handleEl.classList.remove('dragging');
              try { handleEl.releasePointerCapture(e.pointerId); } catch (err) { }
            }
          });

          overlay.appendChild(handleEl);
        });
      }

  // --- 3D Liquid Lava Lamp Engine ---
  function initLavaLampBlobs() {
        var config = state.lavaLamp;
        if (config.blobs && config.blobs.length === config.blobCount) return;

        config.blobs = [];
        for (var i = 0; i < config.blobCount; i++) {
          config.blobs.push({
            id: i + 1,
            x: 0.15 + Math.random() * 0.7,
            y: 0.1 + Math.random() * 0.8,
            vx: (Math.random() - 0.5) * 0.001,
            vy: (Math.random() - 0.5) * 0.001,
            radius: 0.07 + Math.random() * 0.08,
            heat: Math.random(),
            phase: Math.random() * Math.PI * 2
          });
        }
      }

  function updateLavaLampPhysics(timeSec) {
        var config = state.lavaLamp;
        var speed = config.speed || 1.0;
        var visc = (config.viscosity || 100) / 100;
        var blobs = config.blobs;

        blobs.forEach(function (b) {
          // Thermal Buoyancy
          if (b.y > 0.75) {
            b.heat = Math.min(1.0, b.heat + 0.015 * speed);
          } else if (b.y < 0.2) {
            b.heat = Math.max(0.0, b.heat - 0.012 * speed);
          }

          b.vy -= (b.heat - 0.48) * 0.0005 * speed;
          b.vy *= 0.97; // Drag

          b.vx += Math.sin(timeSec * 0.8 + b.phase) * 0.0002 * speed;
          b.vx *= 0.96;

          b.x += b.vx;
          b.y += b.vy;

          // Elastic Wall Bouncing (No Sticking!)
          var margin = (b.radius || 0.08) + 0.02;
          if (b.x < margin) {
            b.x = margin;
            b.vx = Math.abs(b.vx || 0.001) * 0.98 + 0.0005;
          } else if (b.x > 1 - margin) {
            b.x = 1 - margin;
            b.vx = -Math.abs(b.vx || 0.001) * 0.98 - 0.0005;
          }

          if (b.y < margin) {
            b.y = margin;
            b.vy = Math.abs(b.vy || 0.001) * 0.98 + 0.0005;
          } else if (b.y > 1 - margin) {
            b.y = 1 - margin;
            b.vy = -Math.abs(b.vy || 0.001) * 0.98 - 0.0005;
          }
        });

        // Surface tension force
        for (var i = 0; i < blobs.length; i++) {
          for (var j = i + 1; j < blobs.length; j++) {
            var b1 = blobs[i];
            var b2 = blobs[j];
            var dx = b2.x - b1.x;
            var dy = b2.y - b1.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var minDist = (b1.radius + b2.radius) * 1.2 * visc;

            if (dist < minDist && dist > 0.001) {
              var pull = (minDist - dist) * 0.0004;
              var nx = dx / dist;
              var ny = dy / dist;
              b1.vx += nx * pull;
              b1.vy += ny * pull;
              b2.vx -= nx * pull;
              b2.vy -= ny * pull;
            }
          }
        }
      }

  function draw3DLavaLampMetaballs(ctx, width, height, timeSec) {
        var config = state.lavaLamp;
        updateLavaLampPhysics(timeSec);

        // Deep Dark Ambient Liquid Background matching reference image
        var bgGrad = ctx.createRadialGradient(
          width * 0.5, height * 0.5, 0,
          width * 0.5, height * 0.5, Math.max(width, height) * 0.85
        );
        bgGrad.addColorStop(0, '#160a29');
        bgGrad.addColorStop(0.6, '#0d0714');
        bgGrad.addColorStop(1, '#05020a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        var c1 = config.waxColor1 || '#FFE600';
        var c2 = config.waxColor2 || '#B000FF';

        // Ambient Liquid Caustic Glow
        var blobs = config.blobs;
        blobs.forEach(function (b) {
          var cx = b.x * width;
          var cy = b.y * height;
          var r = b.radius * Math.min(width, height);

          var aGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
          aGrad.addColorStop(0, hexToRgba(c1, 0.45));
          aGrad.addColorStop(0.5, hexToRgba(c2, 0.25));
          aGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = aGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        });

        // 3D Multi-Color Gradient Metaballs (Yellow -> Orange -> Magenta -> Purple)
        blobs.forEach(function (b) {
          var cx = b.x * width;
          var cy = b.y * height;
          var r = b.radius * Math.min(width, height);

          var deformX = 1 + 0.12 * Math.sin(timeSec * 1.6 + b.phase);
          var deformY = 1 + 0.12 * Math.cos(timeSec * 1.6 + b.phase);

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(deformX, deformY);

          // Multi-Color Shaded 3D Body
          var bodyGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r);
          bodyGrad.addColorStop(0, '#FFF59D'); // Glowing highlight
          bodyGrad.addColorStop(0.25, c1);     // Primary wax color (bright yellow)
          bodyGrad.addColorStop(0.6, lerpColor(c1, c2, 0.6)); // Fiery orange / magenta transition
          bodyGrad.addColorStop(0.9, c2);      // Secondary wax color (electric purple)
          bodyGrad.addColorStop(1, lerpColor(c2, '#1a0033', 0.8)); // Deep edge rim shadow
          ctx.fillStyle = bodyGrad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();

          // 3D Specular Gloss Highlight
          if (config.specular !== false) {
            var specGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 0, -r * 0.35, -r * 0.35, r * 0.55);
            specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
            specGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
            specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = specGrad;
            ctx.beginPath();
            ctx.arc(-r * 0.35, -r * 0.35, r * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        });
      }

      function interpolateKeyframeAtTime(timeSec) {
        var dur = state.animationDuration || 5.0;
        var curPct = ((timeSec % dur) / dur) * 100;
        var sorted = (state.keyframes || []).slice().sort(function (a, b) { return a.percent - b.percent; });
        var defColors = state.gradientColors || ['#FF6B6B', '#49A078'];

        if (sorted.length === 0) {
          return { colors: defColors, angle: state.gradientAngle || 90, noise: 30, seedRate: 1.0, blur: 0 };
        }

        var k1 = sorted[0];
        var k2 = sorted[sorted.length - 1];

        if (curPct <= k1.percent) {
          return {
            colors: k1.colors || defColors,
            angle: k1.angle !== undefined ? k1.angle : 90,
            noise: k1.noise !== undefined ? k1.noise : 30,
            seedRate: k1.seedRate !== undefined ? k1.seedRate : 1.0,
            blur: k1.blur !== undefined ? k1.blur : 0
          };
        }
        if (curPct >= k2.percent) {
          return {
            colors: k2.colors || defColors,
            angle: k2.angle !== undefined ? k2.angle : 90,
            noise: k2.noise !== undefined ? k2.noise : 30,
            seedRate: k2.seedRate !== undefined ? k2.seedRate : 1.0,
            blur: k2.blur !== undefined ? k2.blur : 0
          };
        }

        for (var i = 0; i < sorted.length - 1; i++) {
          if (curPct >= sorted[i].percent && curPct <= sorted[i + 1].percent) {
            k1 = sorted[i];
            k2 = sorted[i + 1];
            break;
          }
        }

        var range = k2.percent - k1.percent;
        var tRaw = range === 0 ? 0 : (curPct - k1.percent) / range;
        var u = 0.5 * (1 - Math.cos(tRaw * Math.PI));

        var cols1 = k1.colors || defColors;
        var cols2 = k2.colors || defColors;
        var numCols = Math.max(cols1.length, cols2.length);
        var blendedColors = [];

        for (var cIdx = 0; cIdx < numCols; cIdx++) {
          var hexA = cols1[cIdx % cols1.length];
          var hexB = cols2[cIdx % cols2.length];
          var rgbA = hexToRgb(hexA);
          var rgbB = hexToRgb(hexB);
          var r = Math.round(rgbA.r + u * (rgbB.r - rgbA.r));
          var g = Math.round(rgbA.g + u * (rgbB.g - rgbA.g));
          var b = Math.round(rgbA.b + u * (rgbB.b - rgbA.b));
          blendedColors.push(rgbToHex(r, g, b));
        }

        var angle1 = k1.angle !== undefined ? k1.angle : 90;
        var angle2 = k2.angle !== undefined ? k2.angle : 90;
        var angle = Math.round(angle1 + u * (angle2 - angle1));

        var noise1 = k1.noise !== undefined ? k1.noise : 30;
        var noise2 = k2.noise !== undefined ? k2.noise : 30;
        var noise = Math.round(noise1 + u * (noise2 - noise1));

        var seed1 = k1.seedRate !== undefined ? k1.seedRate : 1.0;
        var seed2 = k2.seedRate !== undefined ? k2.seedRate : 1.0;
        var seedRate = seed1 + u * (seed2 - seed1);

        var blur1 = k1.blur !== undefined ? k1.blur : 0;
        var blur2 = k2.blur !== undefined ? k2.blur : 0;
        var blur = Math.round(blur1 + u * (blur2 - blur1));

        return {
          colors: blendedColors,
          angle: angle,
          noise: noise,
          seedRate: seedRate,
          blur: blur
        };
      }

  function drawAnimatedGradientFrame(ctx, width, height, timeSec) {
        var kfState = interpolateKeyframeAtTime(timeSec);
        var colors = kfState.colors;
        var rotAngle = kfState.angle;
        var speed = state.animatedSpeed || 1.0;
        var t = timeSec * speed * kfState.seedRate;
        var motionIntensity = state.animatedMotionIntensity || 1.0;
        var glowStrength = state.animatedGlowStrength || 1.0;

        // 1. Rotating Base Linear Gradient Transition
        var angleDeg = (rotAngle + (t * 18 * motionIntensity)) % 360;
        var rad = (angleDeg - 90) * (Math.PI / 180);
        var length = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
        var halfLen = length / 2;
        var cx = width / 2;
        var cy = height / 2;

        var x0 = cx - Math.cos(rad) * halfLen;
        var y0 = cy - Math.sin(rad) * halfLen;
        var x1 = cx + Math.cos(rad) * halfLen;
        var y1 = cy + Math.sin(rad) * halfLen;

        var baseGrad = ctx.createLinearGradient(x0, y0, x1, y1);
        var numCols = colors.length;

        colors.forEach(function (col, idx) {
          var baseStop = idx / Math.max(1, numCols - 1);
          var waveShift = Math.sin(t * 0.8 + idx * 1.5) * 0.12 * motionIntensity;
          var stopPos = Math.max(0, Math.min(1, baseStop + waveShift));
          baseGrad.addColorStop(stopPos, col);
        });

        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. Fast Noise Displacement Spheres
        var displacementPct = (kfState.noise !== undefined ? kfState.noise : (state.animatedDisplacement !== undefined ? state.animatedDisplacement : 30));
        var noiseScale = (displacementPct / 100) * motionIntensity;
        for (var i = 0; i < numCols; i++) {
          var col = colors[i];
          var phase = t * (0.8 + i * 0.3) + i * 1.7;

          // Fast Noise procedural displacement offsets
          var dispX = Math.sin(phase * 1.2) * (width * 0.35 * (0.2 + noiseScale * 0.8));
          var dispY = Math.cos(phase * 0.9) * (height * 0.35 * (0.2 + noiseScale * 0.8));

          var orbX = width * 0.5 + dispX;
          var orbY = height * 0.5 + dispY;
          var orbRadius = Math.max(width, height) * (0.35 + 0.3 * noiseScale) * glowStrength;

          var orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbRadius);
          orbGrad.addColorStop(0, hexToRgba(col, 0.75 * glowStrength));
          orbGrad.addColorStop(0.5, hexToRgba(col, 0.35 * glowStrength));
          orbGrad.addColorStop(1, hexToRgba(col, 0));

          ctx.fillStyle = orbGrad;
          ctx.fillRect(0, 0, width, height);
        }

        // 3. Texture Noise Overlay Layer (100% Synchronous Pattern)
        if (state.enableNoise) {
          var pat = getSeamlessNoisePattern(ctx, state.noiseFrequency, state.noiseOpacity);
          if (pat) {
            ctx.fillStyle = pat;
            ctx.fillRect(0, 0, width, height);
          }
        }
      }

  var animatedLoopFrame = null;
    var _lastAnimTime = 0;

    function startAnimatedGradientLoop() {
      if (state.gradientMode !== 'animated' && state.gradientMode !== 'aurora' && state.gradientMode !== 'lavalamp') {
        if (animatedLoopFrame) {
          cancelAnimationFrame(animatedLoopFrame);
          animatedLoopFrame = null;
        }
        return;
      }

      var preview = $('gradient-live-viewport');
      if (!preview) return;

      var now = performance.now();
      if (state.isPlaying) {
        if (_lastAnimTime > 0) {
          var dt = (now - _lastAnimTime) / 1000;
          state.currentTime = (state.currentTime || 0) + dt;
          if (state.currentTime >= state.animationDuration) {
            state.currentTime = 0;
          }
        }
        _lastAnimTime = now;
        updateTimelineUI();
      } else {
        _lastAnimTime = 0;
      }

      var effectiveTimeSec = state.currentTime || 0;

      var pCanvas = preview.querySelector('#lava-live-canvas');
      if (!pCanvas) {
        preview.innerHTML = '<canvas id="lava-live-canvas" style="width:100%; height:100%; display:block; border-radius:inherit; object-fit:fill;"></canvas>';
        pCanvas = $('lava-live-canvas');
      }

      var rect = preview.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // GPU Downsample buffer resolution to 0.6x for 60FPS performance
        var targetW = Math.round(rect.width * 0.6);
        var targetH = Math.round(rect.height * 0.6);
        if (pCanvas.width !== targetW || pCanvas.height !== targetH) {
          pCanvas.width = targetW;
          pCanvas.height = targetH;
        }

        // GPU Blur Filter via CSS Compositor (0 CPU overhead)
        var kfState = interpolateKeyframeAtTime(effectiveTimeSec);
        var blurVal = kfState.blur !== undefined ? kfState.blur : (state.animatedBlur || 0);
        pCanvas.style.filter = blurVal > 0 ? 'blur(' + blurVal + 'px)' : 'none';

        var pCtx = pCanvas.getContext('2d');
        drawAnimatedGradientFrame(pCtx, pCanvas.width, pCanvas.height, effectiveTimeSec);
      }

      if (state.isPlaying) {
        animatedLoopFrame = requestAnimationFrame(startAnimatedGradientLoop);
      } else {
        if (animatedLoopFrame) {
          cancelAnimationFrame(animatedLoopFrame);
          animatedLoopFrame = null;
        }
      }
    }

    function renderTimelineMarkers() {
      var layer = $('timeline-markers-layer');
      if (!layer) return;
      layer.innerHTML = '';

      state.keyframes.forEach(function (kf) {
        var marker = document.createElement('div');
        var isSelected = (state.selectedKeyframePct === kf.percent);
        marker.className = 'timeline-marker-diamond' + (isSelected ? ' active' : '');
        marker.style.left = kf.percent + '%';
        marker.title = 'Keyframe @ ' + kf.percent + '% (' + ((kf.percent / 100) * state.animationDuration).toFixed(1) + 's)';

        marker.addEventListener('click', function (e) {
          e.stopPropagation();
          audioManager.play('pop');
          state.selectedKeyframePct = kf.percent;
          state.currentTime = (kf.percent / 100) * state.animationDuration;
          updateTimelineUI();
          if (kf.colors) state.gradientColors = kf.colors.slice();
          if (kf.angle !== undefined) state.gradientAngle = kf.angle;
          if ($('angle-slider')) $('angle-slider').value = state.gradientAngle;
          if ($('angle-val')) $('angle-val').textContent = state.gradientAngle + '\u00B0';
          if (typeof renderColorStops === 'function') renderColorStops();
          renderKeyframesList();
          renderTimelineMarkers();
          updateGradientPreview();
          updateCssOutput();
        });

        layer.appendChild(marker);
      });
    }

    function renderKeyframesList() {
      var list = $('media-keyframes-list');
      list.innerHTML = '';

      var sorted = state.keyframes.slice().sort(function (a, b) { return a.percent - b.percent; });

      var compassOptions = [
        { label: '', x: 50, y: 0, angle: 0, title: 'Top (0\u00B0)', style: 'top: 2px; left: 26px;' },
        { label: '', x: 100, y: 0, angle: 45, title: 'Top Right (45\u00B0)', style: 'top: 9px; left: 43px;' },
        { label: '', x: 100, y: 50, angle: 90, title: 'Right (90\u00B0)', style: 'top: 26px; left: 50px;' },
        { label: '', x: 100, y: 100, angle: 135, title: 'Bottom Right (135\u00B0)', style: 'top: 43px; left: 43px;' },
        { label: '', x: 50, y: 100, angle: 180, title: 'Bottom (180\u00B0)', style: 'top: 50px; left: 26px;' },
        { label: '', x: 0, y: 100, angle: 225, title: 'Bottom Left (225\u00B0)', style: 'top: 43px; left: 9px;' },
        { label: '', x: 0, y: 50, angle: 270, title: 'Left (270\u00B0)', style: 'top: 26px; left: 2px;' },
        { label: '', x: 0, y: 0, angle: 315, title: 'Top Left (315\u00B0)', style: 'top: 9px; left: 9px;' }
      ];

      sorted.forEach(function (kf) {
        var sec = ((kf.percent / 100) * state.animationDuration).toFixed(1);
        var card = document.createElement('div');
        card.className = 'keyframe-item-card';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'stretch';
        card.style.gap = '4px';

        var kx = kf.posX !== undefined ? kf.posX : 50;
        var ky = kf.posY !== undefined ? kf.posY : 50;
        var curAngle = kf.angle !== undefined ? kf.angle : 90;

        var compassHtml = '<div class="direction-compass-dial" title="Select Gradient Direction">';
        compassOptions.forEach(function (opt) {
          var isActive = (kx === opt.x && ky === opt.y) || (curAngle === opt.angle);
          var activeClass = isActive ? 'active' : '';
          compassHtml += '<button class="compass-notch ' + activeClass + ' kf-compass-btn" data-pct="' + kf.percent + '" data-x="' + opt.x + '" data-y="' + opt.y + '" data-angle="' + opt.angle + '" title="' + opt.title + '" style="' + opt.style + '">' + opt.label + '</button>';
        });
        compassHtml += '<div class="compass-center-badge">' + curAngle + '\u00B0</div>';
        compassHtml += '</div>';

        var isSelected = (state.selectedKeyframePct === kf.percent);
        card.style.border = isSelected ? '2px solid var(--color-seaweed)' : '1px solid var(--border-color)';
        card.style.cursor = 'pointer';
        card.dataset.pct = kf.percent;

        var colorsHtml = '<div style="display: flex; gap: 4px; justify-content: center; margin-top: 2px; margin-bottom: 2px;">';
        var kfColors = kf.colors || state.gradientColors || ['#216869', '#49a078'];
        kfColors.forEach(function (c, i) {
          colorsHtml += '<button class="kf-color-swatch-btn" data-pct="' + kf.percent + '" data-index="' + i + '" style="width: 22px; height: 22px; border-radius: 5px; background: ' + c + '; border: 1.5px solid rgba(255,255,255,0.8); box-shadow: 0 1px 3px rgba(0,0,0,0.3); cursor: pointer; pointer-events: auto; flex-shrink: 0;"></button>';
        });
        colorsHtml += '</div>';

        card.innerHTML =
          '<div style="display: flex; align-items: center; justify-content: space-between; pointer-events: none;">' +
          '<div style="display: flex; align-items: center; gap: 4px;">' +
          '<span class="keyframe-time-tag" style="font-size:0.68rem; min-width:32px;">' + kf.percent + '%</span>' +
          '<span style="font-size: 0.65rem; color: var(--text-muted); font-family: var(--font-mono);">' + sec + 's</span>' +
          '</div>' +
          '<button class="color-stop-remove-btn" data-pct="' + kf.percent + '"' + (sorted.length <= 2 ? ' disabled' : '') + ' style="width:20px; height:20px; pointer-events: auto;">' +
          '<i class="ph-fill ph-x" style="font-size: 10px;"></i>' +
          '</button>' +
          '</div>' +
          '<div style="pointer-events: auto;">' + compassHtml + '</div>' +
          colorsHtml;

        list.appendChild(card);
      });

      // Select Keyframe
      list.querySelectorAll('.keyframe-item-card').forEach(function (card) {
        card.addEventListener('click', function (e) {
          if (!e.target.closest('button') && !e.target.closest('input')) {
            audioManager.play('pop');
            var pct = Number(card.dataset.pct);
            state.selectedKeyframePct = pct;
            var kf = state.keyframes.find(function (k) { return k.percent === pct; });
            if (kf) {
              state.currentTime = (kf.percent / 100) * state.animationDuration;
              updateTimelineUI();
              if (kf.colors) state.gradientColors = kf.colors.slice();
              if (kf.angle !== undefined) state.gradientAngle = kf.angle;
              $('angle-slider').value = state.gradientAngle;
              $('angle-val').textContent = state.gradientAngle + '\u00B0';
              if (typeof renderColorStops === 'function') renderColorStops();
              renderKeyframesList(); // update border
              updateGradientPreview();
              updateCssOutput();
            }
          }
        });
      });

      // Bind Compass Direction Buttons
      list.querySelectorAll('.kf-compass-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          audioManager.play('pop');
          var pct = Number(btn.dataset.pct);
          var targetKf = state.keyframes.find(function (k) { return k.percent === pct; });
          if (targetKf) {
            state.currentTime = (targetKf.percent / 100) * state.animationDuration;
            updateTimelineUI();
            targetKf.posX = Number(btn.dataset.x);
            targetKf.posY = Number(btn.dataset.y);
            targetKf.angle = Number(btn.dataset.angle);
            if (state.selectedKeyframePct === pct) {
              state.gradientAngle = targetKf.angle;
              $('angle-slider').value = state.gradientAngle;
              $('angle-val').textContent = state.gradientAngle + '\u00B0';
            }
            renderKeyframesList();
            updateGradientPreview();
            updateCssOutput();
          }
        });
      });

      // Remove Keyframe Buttons
      list.querySelectorAll('.color-stop-remove-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          audioManager.play('pop');
          var pct = Number(btn.dataset.pct);
          if (state.keyframes.length > 2) {
            state.keyframes = state.keyframes.filter(function (k) { return k.percent !== pct; });
            if (state.selectedKeyframePct === pct) {
              state.selectedKeyframePct = state.keyframes[0].percent;
            }
            renderTimelineMarkers();
            renderKeyframesList();
            updateGradientPreview();
            updateCssOutput();
          }
        });
      });

      // Keyframe Colors (Custom In-App Modal Color Picker)
      list.querySelectorAll('.kf-color-swatch-btn').forEach(function (swatch) {
        swatch.addEventListener('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          audioManager.play('pop');
          var pct = Number(swatch.dataset.pct);
          var idx = Number(swatch.dataset.index);
          var targetKf = state.keyframes.find(function (k) { return k.percent === pct; });
          if (targetKf) {
            state.currentTime = (targetKf.percent / 100) * state.animationDuration;
            updateTimelineUI();
            if (!targetKf.colors) targetKf.colors = state.gradientColors.slice();
            var initColor = targetKf.colors[idx] || '#216869';
            openCustomColorPicker(initColor, function (newColor) {
              targetKf.colors[idx] = newColor;
              renderKeyframesList();
              updateGradientPreview();
              updateCssOutput();
            });
          }
        });
      });
    }

    function updateTimelineUI() {
      var pct = (state.currentTime / state.animationDuration) * 100;
      pct = Math.min(100, Math.max(0, pct));

      $('timeline-progress-fill').style.width = pct + '%';
      $('scrubber-knob').style.left = pct + '%';
      $('timeline-slider').value = pct;

      var curSec = state.currentTime.toFixed(1);
      var totSec = state.animationDuration.toFixed(1);
      $('timeline-timestamp').textContent = (curSec < 10 ? '0' + curSec : curSec) + 's / 0' + totSec + 's';
    }

    function toggleMediaPlay() {
      if (state.activeTab === 'video') {
        var video = $('video-player-el');
        if (video) {
          if (video.paused) {
            video.play();
            if ($('btn-media-play')) $('btn-media-play').innerHTML = '<i class="ph-fill ph-pause"></i>';
          } else {
            video.pause();
            if ($('btn-media-play')) $('btn-media-play').innerHTML = '<i class="ph-fill ph-play"></i>';
          }
          audioManager.play('pop');
        }
        return;
      }

      state.isPlaying = !state.isPlaying;
      var btn = $('btn-media-play');
      if (btn) {
        btn.innerHTML = state.isPlaying ? '<i class="ph-fill ph-pause"></i>' : '<i class="ph-fill ph-play"></i>';
      }
      audioManager.play('pop');

      if (state.isPlaying) {
        if (state.currentTime >= state.animationDuration) state.currentTime = 0;
        _lastAnimTime = performance.now();
        if (animatedLoopFrame) cancelAnimationFrame(animatedLoopFrame);
        animatedLoopFrame = requestAnimationFrame(startAnimatedGradientLoop);
      } else {
        if (animatedLoopFrame) {
          cancelAnimationFrame(animatedLoopFrame);
          animatedLoopFrame = null;
        }
        startAnimatedGradientLoop(); // Render static frame once on pause
      }
    }

    function updateGradientPreview() {
      _updateGradientPreview();
    }

    function buildLinearGradientCss() {
      var angle = state.gradientAngle || 90;
      var cols = state.gradientColors || ['#FF6B6B', '#49A078'];
      var mid = state.gradientMidpoint !== undefined ? state.gradientMidpoint : 50;

      if (cols.length === 2) {
        return 'linear-gradient(' + angle + 'deg, ' + cols[0] + ', ' + mid + '%, ' + cols[1] + ')';
      } else {
        var colorStops = [];
        for (var i = 0; i < cols.length; i++) {
          if (i === 0) colorStops.push(cols[i] + ' 0%');
          else if (i === cols.length - 1) colorStops.push(cols[i] + ' 100%');
          else colorStops.push(cols[i] + ' ' + mid + '%');
        }
        return 'linear-gradient(' + angle + 'deg, ' + colorStops.join(', ') + ')';
      }
    }

    function _updateGradientPreview() {
      var preview = $('gradient-live-viewport');
      if (!preview) return;
      var mode = state.gradientMode;

      // Purge lingering canvas overlay when in static modes
      if (mode !== 'animated') {
        if (typeof animatedLoopFrame !== 'undefined' && animatedLoopFrame) {
          cancelAnimationFrame(animatedLoopFrame);
          animatedLoopFrame = null;
        }
        preview.querySelectorAll('canvas').forEach(function (c) { c.remove(); });
      }

      var noiseDataUri = state.enableNoise ? generateNoiseSvgDataUri(state.noiseFrequency, state.noiseOpacity) : '';
      var noiseUrl = state.enableNoise ? "url('" + noiseDataUri + "')" : '';

      preview.style.animation = '';

      if (mode === 'linear') {
        var css = buildLinearGradientCss();
        preview.style.background = '';
        preview.style.backgroundColor = '';
        preview.style.backgroundImage = state.enableNoise ? noiseUrl + ', ' + css : css;
        preview.style.backgroundSize = state.enableNoise ? 'auto, 100% 100%' : '100% 100%';

      } else if (mode === 'positional') {
        var posData = computePositionalBaseAndRadii(state.positionalPoints || []);
        var posCssStr = posData.cssGradients.join(', ');
        preview.style.background = '';
        preview.style.backgroundImage = state.enableNoise ? noiseUrl + ', ' + posCssStr : posCssStr;
        preview.style.backgroundColor = posData.baseColor;
        preview.style.backgroundSize = '';

      } else if (mode === '4-corner') {
        var ints = state.meshIntensities || [70, 70, 70, 70];
        var parts = [
          'radial-gradient(farthest-corner at top left, ' + state.meshColors[0] + ' 0%, ' + hexToRgba(state.meshColors[0], 0) + ' ' + (ints[0] * 1.2) + '%)',
          'radial-gradient(farthest-corner at top right, ' + state.meshColors[1] + ' 0%, ' + hexToRgba(state.meshColors[1], 0) + ' ' + (ints[1] * 1.2) + '%)',
          'radial-gradient(farthest-corner at bottom right, ' + state.meshColors[2] + ' 0%, ' + hexToRgba(state.meshColors[2], 0) + ' ' + (ints[2] * 1.2) + '%)',
          'radial-gradient(farthest-corner at bottom left, ' + state.meshColors[3] + ' 0%, ' + hexToRgba(state.meshColors[3], 0) + ' ' + (ints[3] * 1.2) + '%)'
        ];
        var meshCss = parts.join(', ');
        preview.style.background = '';
        preview.style.backgroundImage = state.enableNoise ? noiseUrl + ', ' + meshCss : meshCss;

      } else if (mode === 'animated') {
        startAnimatedGradientLoop();
      }
    }

    function lerpColor(c1, c2, t) {
      if (!c1) return c2 || '#000000';
      if (!c2) return c1;
      var c1rgb = hexToRgba(c1, 1).match(/\d+/g).map(Number);
      var c2rgb = hexToRgba(c2, 1).match(/\d+/g).map(Number);
      var r = Math.round(c1rgb[0] + (c2rgb[0] - c1rgb[0]) * t);
      var g = Math.round(c1rgb[1] + (c2rgb[1] - c1rgb[1]) * t);
      var b = Math.round(c1rgb[2] + (c2rgb[2] - c1rgb[2]) * t);
      return rgbToHex(r, g, b);
    }

    function interpolateKeyframePos(pct) {
      var sorted = state.keyframes.slice().sort(function (a, b) { return a.percent - b.percent; });
      var defColors = state.gradientColors || ['#216869', '#49a078'];
      if (sorted.length === 0) return { posX: 50, posY: 50, angle: 90, colors: defColors };

      var kFirst = sorted[0];
      var kLast = sorted[sorted.length - 1];

      if (pct <= kFirst.percent) {
        return {
          posX: kFirst.posX !== undefined ? kFirst.posX : 50,
          posY: kFirst.posY !== undefined ? kFirst.posY : 50,
          angle: kFirst.angle !== undefined ? kFirst.angle : 90,
          colors: kFirst.colors || defColors
        };
      }
      if (pct >= kLast.percent) {
        return {
          posX: kLast.posX !== undefined ? kLast.posX : 50,
          posY: kLast.posY !== undefined ? kLast.posY : 50,
          angle: kLast.angle !== undefined ? kLast.angle : 90,
          colors: kLast.colors || defColors
        };
      }

      for (var i = 0; i < sorted.length - 1; i++) {
        var k1 = sorted[i];
        var k2 = sorted[i + 1];
        if (pct >= k1.percent && pct <= k2.percent) {
          var range = k2.percent - k1.percent;
          var t = range === 0 ? 0 : (pct - k1.percent) / range;

          var a1 = k1.angle !== undefined ? k1.angle : 90;
          var a2 = k2.angle !== undefined ? k2.angle : 90;
          var x1 = k1.posX !== undefined ? k1.posX : 50;
          var x2 = k2.posX !== undefined ? k2.posX : 50;
          var y1 = k1.posY !== undefined ? k1.posY : 50;
          var y2 = k2.posY !== undefined ? k2.posY : 50;

          // Angle interpolation (shortest path)
          var da = (a2 - a1) % 360;
          if (da > 180) da -= 360;
          if (da < -180) da += 360;

          var colors = [];
          var c1List = k1.colors || defColors;
          var c2List = k2.colors || defColors;
          var maxLen = Math.max(c1List.length, c2List.length);
          for (var c = 0; c < maxLen; c++) {
            var col1 = c1List[c] || c1List[c1List.length - 1];
            var col2 = c2List[c] || c2List[c2List.length - 1];
            colors.push(lerpColor(col1, col2, t));
          }

          return {
            posX: x1 + (x2 - x1) * t,
            posY: y1 + (y2 - y1) * t,
            angle: a1 + da * t,
            colors: colors
          };
        }
      }
      return { posX: 50, posY: 50, angle: 90, colors: defColors };
    }

    function getKeyframePosString(kf) {
      var x = kf.posX !== undefined ? kf.posX : 50;
      var y = kf.posY !== undefined ? kf.posY : 50;
      return x + '% ' + y + '%';
    }

    var cssOutputTimer = null;
    function updateCssOutput() {
      if (cssOutputTimer) cancelAnimationFrame(cssOutputTimer);
      cssOutputTimer = requestAnimationFrame(_updateCssOutput);
    }

    function _updateCssOutput() {
      var mode = state.gradientMode;
      var output = '';
      var noiseDataUri = state.enableNoise ? generateNoiseSvgDataUri(state.noiseFrequency, state.noiseOpacity) : '';
      var noiseUrl = state.enableNoise ? "url('" + noiseDataUri + "')" : '';

      if (mode === 'linear') {
        var css = buildLinearGradientCss();
        output = '/* Linear Gradient */\nbackground-image: ' + (state.enableNoise ? noiseUrl + ', ' + css : css) + ';';

      } else if (mode === 'positional') {
        var posData = computePositionalBaseAndRadii(state.positionalPoints || []);
        var posCssStr = posData.cssGradients.join(', ');
        output = '/* Positional Gradient */\nbackground-image: ' + (state.enableNoise ? noiseUrl + ', ' + posCssStr : posCssStr) + ';\nbackground-color: ' + posData.baseColor + ';';

      } else if (mode === '4-corner') {
        var ints = state.meshIntensities || [70, 70, 70, 70];
        var parts = [
          'radial-gradient(at top left, ' + state.meshColors[0] + ', transparent ' + ints[0] + '%)',
          'radial-gradient(at top right, ' + state.meshColors[1] + ', transparent ' + ints[1] + '%)',
          'radial-gradient(at bottom right, ' + state.meshColors[2] + ', transparent ' + ints[2] + '%)',
          'radial-gradient(at bottom left, ' + state.meshColors[3] + ', transparent ' + ints[3] + '%)'
        ];
        output = '/* 4-Corner Mesh Gradient */\nbackground-image: ' + (state.enableNoise ? noiseUrl + ', ' + parts.join(', ') : parts.join(', ')) + ';\nbackground-color: ' + state.meshColors[0] + ';';

      } else if (mode === '6-corner') {
        var ints6 = state.mesh6Intensities || [70, 70, 70, 70, 70, 70];
        var parts6 = [
          'radial-gradient(at top left, ' + state.mesh6Colors[0] + ', transparent ' + ints6[0] + '%)',
          'radial-gradient(at top center, ' + state.mesh6Colors[1] + ', transparent ' + ints6[1] + '%)',
          'radial-gradient(at top right, ' + state.mesh6Colors[2] + ', transparent ' + ints6[2] + '%)',
          'radial-gradient(at bottom right, ' + state.mesh6Colors[5] + ', transparent ' + ints6[5] + '%)',
          'radial-gradient(at bottom center, ' + state.mesh6Colors[4] + ', transparent ' + ints6[4] + '%)',
          'radial-gradient(at bottom left, ' + state.mesh6Colors[3] + ', transparent ' + ints6[3] + '%)'
        ];
        output = '/* 6-Corner Mesh Gradient */\nbackground-image: ' + (state.enableNoise ? noiseUrl + ', ' + parts6.join(', ') : parts6.join(', ')) + ';\nbackground-color: ' + state.mesh6Colors[0] + ';';

      } else if (mode === 'fluid') {
        var fluidPartsCss = state.fluidPoints.map(function (pt) {
          var posX = Math.round(pt.x * 100);
          var posY = Math.round(pt.y * 100);
          var radiusPct = Math.round((pt.radius || 0.65) * 100);
          return 'radial-gradient(circle at ' + posX + '% ' + posY + '%, ' + pt.color + ', transparent ' + radiusPct + '%)';
        });
        output = '/* Freeform Fluid Canvas Mesh */\nbackground-image: ' + (state.enableNoise ? noiseUrl + ', ' + fluidPartsCss.join(', ') : fluidPartsCss.join(', ')) + ';\nbackground-color: ' + (state.fluidPoints[0] ? state.fluidPoints[0].color : '#111') + ';';

      } else if (mode === 'animated') {
        var animCss = 'linear-gradient(' + state.gradientAngle + 'deg, ' + state.gradientColors.join(', ') + ')';
        var bgImg = state.enableNoise ? noiseUrl + ', ' + animCss : animCss;
        var bgSize = state.enableNoise ? 'auto, 400% 400%' : '400% 400%';
        var animationName = state.enableNoise ? 'moveGradientWithNoise' : 'moveGradient';

        var kfBlock = '@keyframes ' + animationName + ' {\n';
        state.keyframes.forEach(function (kf) {
          var pos = state.enableNoise ? '0% 0%, ' + getKeyframePosString(kf) : getKeyframePosString(kf);
          kfBlock += '  ' + kf.percent + '% { background-position: ' + pos + '; }\n';
        });
        kfBlock += '}';

        output = '/* Animated Gradient */\n' +
          'background-image: ' + bgImg + ';\n' +
          'background-size: ' + bgSize + ';\n' +
          'animation: ' + animationName + ' ' + state.animationDuration + 's ease infinite;\n\n' +
          kfBlock;
      }

      state.lastGeneratedCss = output;
      return output;
    }

    function showToast(message, durationMs) {
      var container = $('toast-container');
      if (!container) return;
      var existing = container.querySelector('.toast-notification');
      if (existing) existing.remove();
      var toast = document.createElement('div');
      toast.className = 'toast-notification';
      toast.setAttribute('role', 'status');
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(function () {
        toast.classList.add('fade-out');
        setTimeout(function () { toast.remove(); }, 200);
      }, durationMs || 2500);
    }

    function copyGeneratedCss() {
      var css = updateCssOutput();
      var done = function (ok) {
        showToast(ok ? 'CSS copied!' : 'Copy failed — select and copy manually.', 2500);
        if (ok) audioManager.play('pop');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(css).then(function () { done(true); }).catch(function () {
          try {
            var ta = document.createElement('textarea');
            ta.value = css; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); ta.remove();
            done(true);
          } catch (err) { done(false); }
        });
      } else {
        try {
          var ta2 = document.createElement('textarea');
          ta2.value = css; document.body.appendChild(ta2); ta2.select();
          document.execCommand('copy'); ta2.remove();
          done(true);
        } catch (err) { done(false); }
      }
    }

    function handleExportGradient(resolution) {
      state.isGradientExportMenuOpen = false;
      hide($('gradient-export-menu'));

      if (state.gradientMode === 'animated' || state.gradientMode === 'aurora' || state.gradientMode === 'lavalamp') {
        exportAnimatedGradientVideo(resolution);
      } else {
        exportStaticGradientImage(resolution);
      }
    }

    // Static PNG Image Exporter
    function exportStaticGradientImage(resolution) {
      var width = resolution.width;
      var height = resolution.height;

      triggerSnappyExportProgress('Exporting Gradient (' + resolution.label + ')', function () {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');

        function drawAndDownload() {
          try {
            canvas.toBlob(function (blob) {
              if (!blob) {
                console.error('Gradient export failed: canvas.toBlob returned null');
                return;
              }
              var url = URL.createObjectURL(blob);
              var link = document.createElement('a');
              var timestamp = new Date().getTime();
              link.download = 'gradial_gradient_' + width + 'x' + height + '_' + timestamp + '.png';
              link.href = url;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(function () { URL.revokeObjectURL(url); }, 10000);

              var btnSpan = $('gradient-export-main-btn').querySelector('span');
              if (btnSpan) {
                btnSpan.textContent = 'Exported!';
                setTimeout(function () {
                  btnSpan.textContent = 'Export PNG';
                }, 2000);
              }
            }, 'image/png', 1.0);
          } catch (err) {
            console.error('Export failed:', err);
          }
        }

        var mode = state.gradientMode;

        if (mode === 'linear') {
          var angle = state.gradientAngle;
          var rad = (angle - 90) * (Math.PI / 180);
          var length = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
          var halfLength = length / 2;
          var cx = width / 2;
          var cy = height / 2;

          var x0 = cx - Math.cos(rad) * halfLength;
          var y0 = cy - Math.sin(rad) * halfLength;
          var x1 = cx + Math.cos(rad) * halfLength;
          var y1 = cy + Math.sin(rad) * halfLength;

          var grad = ctx.createLinearGradient(x0, y0, x1, y1);
          var midRatio = (state.gradientMidpoint !== undefined ? state.gradientMidpoint : 50) / 100;
          state.gradientColors.forEach(function (color, i) {
            var stopPct = i / Math.max(1, state.gradientColors.length - 1);
            if (i > 0 && i < state.gradientColors.length - 1) stopPct = midRatio;
            grad.addColorStop(stopPct, color);
          });
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);

        } else if (mode === 'positional') {
          var posData = computePositionalBaseAndRadii(state.positionalPoints || []);

          ctx.fillStyle = posData.baseColor;
          ctx.fillRect(0, 0, width, height);

          (state.positionalPoints || []).forEach(function (pt) {
            var cx = pt.x * width;
            var cy = pt.y * height;
            var intensity = pt.intensity !== undefined ? Number(pt.intensity) : 85;
            var radiusVal = pt.radius !== undefined ? Number(pt.radius) : 0.7;
            var radius = radiusVal * (intensity / 85) * Math.max(width, height);

            var rGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            rGrad.addColorStop(0, pt.color);
            rGrad.addColorStop(1, hexToRgba(pt.color, 0));

            ctx.fillStyle = rGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          });

        } else if (mode === '4-corner') {
          var r_avg = 0, g_avg = 0, b_avg = 0;
          for (var i = 0; i < 4; i++) {
            var rgb = hexToRgba(state.meshColors[i], 1).match(/\d+/g).map(Number);
            r_avg += rgb[0]; g_avg += rgb[1]; b_avg += rgb[2];
          }
          ctx.fillStyle = 'rgb(' + Math.round(r_avg / 4) + ',' + Math.round(g_avg / 4) + ',' + Math.round(b_avg / 4) + ')';
          ctx.fillRect(0, 0, width, height);

          var ints = state.meshIntensities || [70, 70, 70, 70];
          var corners = [
            { x: 0, y: 0, color: state.meshColors[0], intensity: ints[0] },
            { x: width, y: 0, color: state.meshColors[1], intensity: ints[1] },
            { x: width, y: height, color: state.meshColors[2], intensity: ints[2] },
            { x: 0, y: height, color: state.meshColors[3], intensity: ints[3] }
          ];

          var diagLen = Math.sqrt(width * width + height * height);

          corners.reverse().forEach(function (c) {
            var radius = diagLen * 0.8 * ((c.intensity || 70) / 100) * 1.5;
            var rGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
            rGrad.addColorStop(0, c.color);
            rGrad.addColorStop(1, hexToRgba(c.color, 0));
            ctx.fillStyle = rGrad;
            ctx.fillRect(0, 0, width, height);
          });
        }

        if (state.enableNoise) {
          var noiseCanvasBuffer = createSeamlessNoisePatternCanvas(state.noiseOpacity);
          var pattern = ctx.createPattern(noiseCanvasBuffer, 'repeat');
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, width, height);
        }

        drawAndDownload();
      });
    }

    async function exportAnimatedGradientVideo(resolution) {
      var width = resolution.width;
      var height = resolution.height;
      width = width % 2 === 0 ? width : width + 1;
      height = height % 2 === 0 ? height : height + 1;

      var overlay = $('export-modal-overlay');
      var titleEl = $('export-modal-title');
      var statusEl = $('export-modal-status');
      var percentEl = $('export-modal-percent');
      var fillEl = $('export-progress-fill');
      var iconBox = $('export-icon-container');

      var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      var useWebM = isFirefox || state.defaultExportFormat === 'webm';
      var ext = useWebM ? 'webm' : 'mp4';

      titleEl.textContent = 'Exporting ' + ext.toUpperCase() + ' Video (' + resolution.label + ')';
      statusEl.textContent = useWebM ? 'Loading WebM Engine...' : 'Initializing WebCodecs...';
      percentEl.textContent = '0%';
      fillEl.style.width = '0%';
      iconBox.innerHTML = '<i class="ph-fill ph-video-camera animate-spin" style="font-size: 22px; color: var(--color-seaweed);"></i>';
      show(overlay);

      if (useWebM && !window.WebMMuxer) {
        try {
          await new Promise((resolve, reject) => {
            var script = document.createElement('script');
            script.src = 'https://unpkg.com/webm-muxer/build/webm-muxer.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        } catch (e) {
          console.error('Failed to load WebMMuxer', e);
          statusEl.textContent = 'Error: Failed to load WebM engine.';
          return;
        }
      }

      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      var noiseCanvasBuffer = state.enableNoise ? createSeamlessNoisePatternCanvas(state.noiseOpacity) : null;

      var fps = state.defaultExportFps || 60;
      var totalDurationSec = state.animationDuration || 5;
      var totalFrames = Math.round(totalDurationSec * fps);

      let muxer;
      try {
        if (useWebM) {
          muxer = new WebMMuxer.Muxer({
            target: new WebMMuxer.ArrayBufferTarget(),
            video: { codec: 'V_VP8', width: width, height: height }
          });
        } else {
          muxer = new Mp4Muxer.Muxer({
            target: new Mp4Muxer.ArrayBufferTarget(),
            video: { codec: 'avc', width: width, height: height },
            fastStart: false
          });
        }
      } catch (e) {
        console.error('Muxer not loaded!', e);
        statusEl.textContent = 'Error: muxer not loaded.';
        return;
      }

      let encoderError = null;
      let videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: e => {
          console.error('VideoEncoder error:', e);
          encoderError = e;
        }
      });

      let exportBitrate = state.defaultExportBitrate || resolution.bitrate || 40000000;

      let config;
      if (useWebM) {
        config = {
          codec: 'vp8',
          width: width,
          height: height,
          bitrate: exportBitrate,
          framerate: fps
        };
        videoEncoder.configure(config);
      } else {
        let codecString = 'avc1.640028'; // High Profile Level 4.0
        if (width >= 3840 || height >= 2160) {
          codecString = 'avc1.640034'; // Level 5.2
        } else if (width >= 2560 || height >= 1440) {
          codecString = 'avc1.640032'; // Level 5.1
        } else if (width >= 1920 || height >= 1080) {
          codecString = 'avc1.64002A'; // Level 4.2
        }

        config = {
          codec: codecString,
          width: width,
          height: height,
          bitrate: exportBitrate,
          bitrateMode: 'constant',
          latencyMode: 'quality',
          framerate: fps,
          avc: { format: 'avc' }
        };

        try {
          let support = await VideoEncoder.isConfigSupported(config);
          if (!support.supported) {
            console.warn("High profile H.264 not supported by this browser, falling back to Baseline...");
            config.codec = 'avc1.42E01F';
            support = await VideoEncoder.isConfigSupported(config);

            if (!support.supported) {
              delete config.bitrateMode;
              delete config.latencyMode;
            }
          }
        } catch (e) {
          config.codec = 'avc1.42E01F';
          delete config.bitrateMode;
          delete config.latencyMode;
        }
        videoEncoder.configure(config);
      }

      state.isExportingCancelled = false;

      for (let currentFrame = 0; currentFrame < totalFrames; currentFrame++) {
        if (state.isExportingCancelled) {
          hide(overlay);
          showToast('Export cancelled');
          try { if (videoEncoder) videoEncoder.close(); } catch (e) { }
          return;
        }

        if (encoderError) {
          statusEl.textContent = 'Encoder error: ' + (encoderError.message || encoderError);
          return;
        }

        var curPct = (currentFrame / Math.max(1, totalFrames - 1)) * 100;
        var displayPct = Math.round((currentFrame / totalFrames) * 100);

        fillEl.style.width = displayPct + '%';
        percentEl.textContent = displayPct + '%';
        statusEl.textContent = 'Rendering Frame ' + (currentFrame + 1) + '/' + totalFrames + '...';

        drawAnimatedGradientFrame(ctx, width, height, currentFrame / fps);

        if (noiseCanvasBuffer) {
          var pattern = ctx.createPattern(noiseCanvasBuffer, 'repeat');
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, width, height);
        }

        // Throttle encoder queue to prevent memory allocation spikes on 4K
        while (videoEncoder.encodeQueueSize > 4) {
          await new Promise(r => setTimeout(r, 15));
        }

        let frame = new VideoFrame(canvas, { timestamp: Math.round((currentFrame * 1e6) / fps), alpha: 'discard' });
        videoEncoder.encode(frame, { keyFrame: currentFrame % 30 === 0 });
        frame.close();

        if (currentFrame % 5 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      statusEl.textContent = 'Finalizing Video...';
      try {
        await videoEncoder.flush();
        muxer.finalize();
      } catch (err) {
        console.error('Finalize error:', err);
        statusEl.textContent = 'Export error: ' + (err.message || err);
        return;
      }
      let buffer = muxer.target.buffer;

      var blob = new Blob([buffer], { type: isFirefox ? 'video/webm' : 'video/mp4' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      var timestamp = new Date().getTime();
      link.download = 'gradial_animation_' + width + 'x' + height + '_' + timestamp + '.' + ext;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      iconBox.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size: 22px; color: var(--color-seaweed);"></i>';
      statusEl.textContent = 'Video Export Complete!';
      fillEl.style.width = '100%';
      percentEl.textContent = '100%';
      if (typeof audioManager !== 'undefined') audioManager.play('success');

      setTimeout(function () { hide(overlay); }, 600);
    }

    function refreshLucideIcons() {
      // No-op: Phosphor icons render via CSS classes automatically
    }

    function updateSliderFill(slider) {
      if (!slider) return;
      var min = parseFloat(slider.min);
      if (isNaN(min)) min = 0;
      var max = parseFloat(slider.max);
      if (isNaN(max)) max = 100;
      var val = parseFloat(slider.value);
      if (isNaN(val)) val = 0;
      var pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
      pct = Math.max(0, Math.min(100, pct));
      slider.style.setProperty('--slider-fill', pct.toFixed(1) + '%');
      slider.style.background = '';
    }

    function initSliderFills() {
      document.querySelectorAll('input[type="range"]').forEach(function (slider) {
        updateSliderFill(slider);
        if (!slider._fillBound) {
          slider.addEventListener('input', function () { updateSliderFill(slider); });
          slider.addEventListener('change', function () { updateSliderFill(slider); });
          slider._fillBound = true;
        }
      });
    }

    // Global listener to update slider track fill in real-time as user drags any range slider
    document.addEventListener('input', function (e) {
      if (e.target && e.target.matches && e.target.matches('input[type="range"]')) {
        updateSliderFill(e.target);
      }
    });

    function captureCurrentSnapshot() {
      if (!editorCanvas || editorCanvas.width === 0) return null;
      return {
        image: editorCanvas.toDataURL('image/png'),
        targetColor: state.targetColor ? { r: state.targetColor.r, g: state.targetColor.g, b: state.targetColor.b } : null,
        targetColorPicked: state.targetColorPicked,
        tolerance: $('tolerance-slider') ? Number($('tolerance-slider').value) : (state.tolerance || 15),
        smoothing: $('smoothing-slider') ? Number($('smoothing-slider').value) : (state.smoothing || 2),
        feather: $('edge-feather-slider') ? Number($('edge-feather-slider').value) : (state.edgeFeather || 28),
        tone: state.imgStylePad ? state.imgStylePad.tone : 0,
        warmth: state.imgStylePad ? state.imgStylePad.warmth : 0,
        lut: state.imgLut || 'none',
        blur: $('filter-blur') ? Number($('filter-blur').value) : 0,
        hue: $('filter-hue') ? Number($('filter-hue').value) : 0,
        brightness: $('filter-brightness') ? Number($('filter-brightness').value) : 100,
        contrast: $('filter-contrast') ? Number($('filter-contrast').value) : 100,
        saturate: $('filter-saturate') ? Number($('filter-saturate').value) : 100
      };
    }

    function pushUndoState() {
      var snap = captureCurrentSnapshot();
      if (!snap) return;
      if (!state.undoStack) state.undoStack = [];

      if (state.undoStack.length > 0) {
        var last = state.undoStack[state.undoStack.length - 1];
        if (last.image === snap.image && last.tolerance === snap.tolerance && last.feather === snap.feather && last.tone === snap.tone && last.warmth === snap.warmth && last.lut === snap.lut && last.blur === snap.blur && last.hue === snap.hue) {
          return;
        }
      }

      if (state.undoStack.length >= 50) state.undoStack.shift();
      state.undoStack.push(snap);
      state.redoStack = [];
      updateUndoRedoButtons();
    }

    function handleUndo() {
      if (!state.undoStack || state.undoStack.length <= 1) return;
      if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');

      var currentSnap = captureCurrentSnapshot();
      if (currentSnap) {
        if (!state.redoStack) state.redoStack = [];
        state.redoStack.push(currentSnap);
      }

      state.undoStack.pop();
      var prevSnap = state.undoStack[state.undoStack.length - 1];
      restoreUndoState(prevSnap);
    }

    function handleRedo() {
      if (!state.redoStack || state.redoStack.length === 0) return;
      if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');

      var nextSnap = state.redoStack.pop();
      if (nextSnap) {
        var currentSnap = captureCurrentSnapshot();
        if (currentSnap && state.undoStack) {
          state.undoStack.push(currentSnap);
        }
        restoreUndoState(nextSnap);
      }
    }

    function restoreUndoState(snapshot) {
      if (!snapshot || !editorCanvas || !editorCtx) return;
      var img = new Image();
      img.onload = function () {
        editorCanvas.width = img.width;
        editorCanvas.height = img.height;
        editorCtx.clearRect(0, 0, img.width, img.height);
        editorCtx.drawImage(img, 0, 0);

        if (snapshot.targetColor) {
          state.targetColor = { r: snapshot.targetColor.r, g: snapshot.targetColor.g, b: snapshot.targetColor.b };
          if (typeof updateColorDisplay === 'function') updateColorDisplay();
        }
        if (snapshot.targetColorPicked !== undefined) {
          state.targetColorPicked = snapshot.targetColorPicked;
        }

        if (snapshot.tolerance !== undefined && $('tolerance-slider')) {
          $('tolerance-slider').value = snapshot.tolerance;
          if ($('tolerance-val')) $('tolerance-val').textContent = snapshot.tolerance + '%';
          state.tolerance = Number(snapshot.tolerance);
        }
        if (snapshot.smoothing !== undefined && $('smoothing-slider')) {
          $('smoothing-slider').value = snapshot.smoothing;
          if ($('smoothing-val')) $('smoothing-val').textContent = snapshot.smoothing;
          state.smoothing = Number(snapshot.smoothing);
        }
        if (snapshot.feather !== undefined && $('edge-feather-slider')) {
          $('edge-feather-slider').value = snapshot.feather;
          if ($('edge-feather-val')) $('edge-feather-val').textContent = snapshot.feather + '%';
          state.edgeFeather = Number(snapshot.feather);
        }
        if (snapshot.blur !== undefined && $('filter-blur')) {
          $('filter-blur').value = snapshot.blur;
          if ($('filter-blur-val')) $('filter-blur-val').textContent = snapshot.blur + 'px';
        }
        if (snapshot.hue !== undefined && $('filter-hue')) {
          $('filter-hue').value = snapshot.hue;
          if ($('filter-hue-val')) $('filter-hue-val').textContent = snapshot.hue + '\u00B0';
        }

        if (snapshot.tone !== undefined && snapshot.warmth !== undefined && state.imgStylePad) {
          state.imgStylePad.tone = snapshot.tone;
          state.imgStylePad.warmth = snapshot.warmth;
          if ($('img-style-pad-puck')) {
            $('img-style-pad-puck').style.left = (50 + snapshot.warmth * 0.5) + '%';
            $('img-style-pad-puck').style.top = (50 - snapshot.tone * 0.5) + '%';
          }
          if ($('img-style-pad-readout')) {
            $('img-style-pad-readout').textContent = 'Tone: ' + (snapshot.tone > 0 ? '+' : '') + Math.round(snapshot.tone) + ' | Warmth: ' + (snapshot.warmth > 0 ? '+' : '') + Math.round(snapshot.warmth);
          }
        }

        if (snapshot.lut !== undefined) {
          state.imgLut = snapshot.lut;
          if (typeof renderLutGrid === 'function') {
            renderLutGrid('img-lut-grid', state.imgLut, function (lutId) {
              state.imgLut = lutId;
              if (typeof updatePreviewFromEditorCanvas === 'function') updatePreviewFromEditorCanvas();
            });
          }
        }

        try { initSliderFills(); } catch(e) {}
        if (typeof updatePreviewFromEditorCanvas === 'function') updatePreviewFromEditorCanvas();
        updateUndoRedoButtons();
      };
      img.src = snapshot.image;
    }

    function updateUndoRedoButtons() {
      ['image-undo-btn', 'img-undo-btn'].forEach(function (id) {
        var btn = $(id);
        if (btn) btn.disabled = !state.undoStack || state.undoStack.length <= 1;
      });
      ['image-redo-btn', 'img-redo-btn'].forEach(function (id) {
        var btn = $(id);
        if (btn) btn.disabled = !state.redoStack || state.redoStack.length === 0;
      });
    }

    function triggerVideoStudioLoader(callback) {
      if (typeof callback === 'function') callback();
    }

    function switchTab(tab) {
      if (!tab) return;
      state.activeTab = tab;

      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('studio-active', tab === 'video');
      }

      ['tab-btn-image', 'studio-tab-btn-image'].forEach(function(id) {
        var el = $(id);
        if (el) el.classList.toggle('active', tab === 'image');
      });
      ['tab-btn-gradient', 'studio-tab-btn-gradient'].forEach(function(id) {
        var el = $(id);
        if (el) el.classList.toggle('active', tab === 'gradient');
      });
      ['tab-btn-video', 'studio-tab-btn-video'].forEach(function(id) {
        var el = $(id);
        if (el) el.classList.toggle('active', tab === 'video');
      });

      if ($('studio-brand-home-btn')) {
        $('studio-brand-home-btn').onclick = function() { switchTab('image'); };
      }
      if ($('studio-open-settings-btn')) {
        $('studio-open-settings-btn').onclick = function() {
          var modal = $('settings-modal-overlay');
          if (modal) modal.classList.remove('hidden');
        };
      }

      if ($('sidebar-image-controls')) toggle($('sidebar-image-controls'), tab === 'image');
      if ($('sidebar-gradient-controls')) toggle($('sidebar-gradient-controls'), tab === 'gradient');
      if ($('sidebar-video-controls')) toggle($('sidebar-video-controls'), tab === 'video');

      var imgLayout = $('workspace-image-layout');
      var gradLayout = $('workspace-gradient-layout');
      var vidLayout = $('workspace-video-layout');

      if (imgLayout) toggle(imgLayout, tab === 'image');
      if (gradLayout) toggle(gradLayout, tab === 'gradient');
      if (vidLayout) toggle(vidLayout, tab === 'video');

      if (tab === 'gradient') {
        if (vidLayout) vidLayout.classList.remove('video-studio-mode');
        if (typeof renderColorStops === 'function') renderColorStops();
        if (typeof renderPositionalPointsList === 'function') renderPositionalPointsList();
        if (typeof renderGradientResolutions === 'function') renderGradientResolutions();
        if (typeof updateGradientPreview === 'function') updateGradientPreview();
        if (typeof updateCssOutput === 'function') updateCssOutput();
      } else if (tab === 'image') {
        if (vidLayout) vidLayout.classList.remove('video-studio-mode');
        if (state.imageObj) {
          show($('source-canvas-wrap'));
          hide($('upload-placeholder'));
        } else {
          show($('upload-placeholder'));
          hide($('source-canvas-wrap'));
        }
      } else if (tab === 'video') {
        if (vidLayout) vidLayout.classList.add('video-studio-mode');
        if (typeof initVideoTab === 'function') {
          initVideoTab();
        }
        var activeRailBtn = document.querySelector('#video-studio-rail .rail-item.active') || $('btn-rail-captions');
        if (activeRailBtn) activeRailBtn.click();

        var video = $('video-player-el');
        if (video && video.src && video.src !== 'about:blank' && video.src !== location.href) {
          video.style.display = 'block';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.objectFit = 'contain';
          show(video);
          show($('video-controls-bar'));
          show($('pro-canvas-overlay'));
          if ($('video-empty-state')) $('video-empty-state').classList.add('hidden');
        } else {
          if ($('video-empty-state')) $('video-empty-state').classList.remove('hidden');
          hide(video);
          hide($('video-controls-bar'));
          hide($('pro-canvas-overlay'));
        }
      }
      try { refreshLucideIcons(); } catch(ex) {}
    }

    function initApp() {
      processingCanvas = $('processing-canvas');
      exportCanvas = $('export-canvas');
      editorCanvas = $('editor-canvas');
      if (editorCanvas) {
        editorCtx = editorCanvas.getContext('2d', { willReadFrequently: true });
      }

      // Default color stops
      state.colorStops = [
        { color: '#FF3366' },
        { color: '#33CCFF' },
        { color: '#FF9933' }
      ];

      state.origCanvas = document.createElement('canvas');
      state.origCtx = state.origCanvas.getContext('2d', { willReadFrequently: true });

      refreshLucideIcons();

      try { loadTheme(); } catch (e) { console.error(e); }
      try { loadPreferences(); } catch (e) { console.error(e); }
      try { bindEvents(); } catch (e) { console.error(e); }
      try { if (typeof updateColorDisplay === 'function') updateColorDisplay(); } catch (e) { console.error(e); }
      try { if (typeof renderImageExportBlock === 'function') renderImageExportBlock(); } catch (e) { console.error(e); }
      try { if (typeof renderColorStops === 'function') renderColorStops(); } catch (e) { console.error(e); }
      try { if (typeof renderPositionalPointsList === 'function') renderPositionalPointsList(); } catch (e) { console.error(e); }
      try { if (typeof renderCornerGrid === 'function') renderCornerGrid(); } catch (e) { console.error(e); }
      try { if (typeof renderTimelineMarkers === 'function') renderTimelineMarkers(); } catch (e) { console.error(e); }
      try { if (typeof renderKeyframesList === 'function') renderKeyframesList(); } catch (e) { console.error(e); }
      try { if (typeof renderGradientResolutions === 'function') renderGradientResolutions(); } catch (e) { console.error(e); }
      try { if (typeof updateImageControlsState === 'function') updateImageControlsState(); } catch (e) { console.error(e); }
      try { if (typeof initVideoTab === 'function') initVideoTab(); } catch (e) { console.error(e); }
      try { switchTab('image'); } catch (e) { console.error(e); }
      try { updateGradientPreview(); } catch (e) { console.error(e); }
      try { updateCssOutput(); } catch (e) { console.error(e); }
      try { updateGroqKeyUI(); } catch (e) { console.error(e); }
      try { refreshLucideIcons(); } catch (e) { console.error(e); }
    }

    function updateGroqKeyUI() {
      var vidBadge = $('video-key-status-badge');
      var vidNotice = $('video-key-notice-text');
      if (vidBadge) {
        vidBadge.textContent = 'AI Transcribe Ready';
        vidBadge.style.color = 'var(--accent-primary)';
        if (vidNotice) vidNotice.textContent = 'Groq Whisper AI is connected and ready for speech-to-text AI subtitle generation.';
      }
    }

    function renderLayersList() {
      // Stub to prevent ReferenceErrors
    }

    function bindEvents() {
      // Settings Modal
      if ($('open-settings-btn')) {
        $('open-settings-btn').addEventListener('click', function () {
          audioManager.play('pop');
          show($('settings-modal-overlay'));
          initSliderFills();
        });
      }
      if ($('open-my-gradial-btn')) {
        $('open-my-gradial-btn').addEventListener('click', function () {
          audioManager.play('pop');
          show($('settings-modal-overlay'));
          initSliderFills();
        });
      }

      if ($('close-settings-btn')) {
        $('close-settings-btn').addEventListener('click', function () {
          audioManager.play('pop');
          hide($('settings-modal-overlay'));
        });
      }

      // Event delegation for theme cards and settings category sidebar
      if ($('settings-modal-overlay')) {
        $('settings-modal-overlay').addEventListener('click', function (e) {
          var card = e.target.closest('.theme-card');
          if (card) {
            audioManager.play('pop');
            document.querySelectorAll('.theme-card').forEach(function (c) { c.classList.remove('active'); });
            card.classList.add('active');
            applyTheme(card.getAttribute('data-theme'));
          }

          var navBtn = e.target.closest('.settings-nav-item');
          if (navBtn) {
            audioManager.play('pop');
            var targetSection = navBtn.getAttribute('data-settings-section');
            document.querySelectorAll('.settings-nav-item').forEach(function (btn) {
              btn.classList.toggle('active', btn === navBtn);
            });
            document.querySelectorAll('.settings-section-panel').forEach(function (panel) {
              var match = panel.id === 'settings-section-' + targetSection;
              panel.classList.toggle('active', match);
              panel.classList.toggle('hidden', !match);
            });
          }
        });
      }

      // Sound Toggle
      var soundBtn = $('setting-sound-toggle');
      if (soundBtn) {
        soundBtn.addEventListener('click', function () {
          var isCurrentlyMuted = soundBtn.classList.contains('active');
          var newMuted = isCurrentlyMuted;
          audioManager.setMuted(newMuted);
          updateSoundUI(!newMuted);
          localStorage.setItem('gradial-sound-muted', newMuted);
          if (!newMuted) audioManager.play('pop');
        });
      }

      // Volume Slider
      var volSlider = $('setting-volume-slider');
      if (volSlider) {
        volSlider.addEventListener('input', function (e) {
          var val = Number(e.target.value) / 100;
          audioManager.setVolume(val);
          if ($('setting-volume-val')) $('setting-volume-val').textContent = e.target.value + '%';
          localStorage.setItem('gradial-sound-volume', val);
        });
      }

      // Motion Modes
      if ($('setting-motion-smooth')) {
        $('setting-motion-smooth').addEventListener('click', function () {
          audioManager.play('pop');
          setMotionUI('smooth');
        });
      }
      if ($('setting-motion-snappy')) {
        $('setting-motion-snappy').addEventListener('click', function () {
          audioManager.play('pop');
          setMotionUI('snappy');
        });
      }

      // Downsampling & GPU Offloading
      if ($('setting-downsample-05')) {
        $('setting-downsample-05').addEventListener('click', function () { setDownsampleRatio(0.5); audioManager.play('pop'); });
      }
      if ($('setting-downsample-10')) {
        $('setting-downsample-10').addEventListener('click', function () { setDownsampleRatio(1.0); audioManager.play('pop'); });
      }
      if ($('setting-gpu-offload-btn')) {
        $('setting-gpu-offload-btn').addEventListener('click', function () { setGpuOffload(!state.useGpuOffloading); audioManager.play('pop'); });
      }

      // Export Defaults
      if ($('setting-export-fmt-mp4')) {
        $('setting-export-fmt-mp4').addEventListener('click', function () { setExportFormat('mp4'); audioManager.play('pop'); });
      }
      if ($('setting-export-fmt-webm')) {
        $('setting-export-fmt-webm').addEventListener('click', function () { setExportFormat('webm'); audioManager.play('pop'); });
      }
      if ($('setting-export-fps-60')) {
        $('setting-export-fps-60').addEventListener('click', function () { setExportFps(60); audioManager.play('pop'); });
      }
      if ($('setting-export-fps-30')) {
        $('setting-export-fps-30').addEventListener('click', function () { setExportFps(30); audioManager.play('pop'); });
      }
      if ($('setting-export-bitrate-slider')) {
        $('setting-export-bitrate-slider').addEventListener('input', function (e) {
          setExportBitrate(e.target.value);
        });
      }
      if ($('setting-export-alpha-toggle')) {
        $('setting-export-alpha-toggle').addEventListener('click', function () {
          setExportAlpha(!state.defaultExportAlpha);
          audioManager.play('pop');
        });
      }

      // Copy Hotkey Cheatsheet
      if ($('copy-hotkeys-btn')) {
        $('copy-hotkeys-btn').addEventListener('click', function () {
          var cheatsheet = [
            "Gradial Keyboard Shortcuts:",
            "1 / 2 / 3 - Switch Workspace Mode (Image / Gradient / Video)",
            "Space - Pan / Hand Tool",
            "Ctrl + Z - Undo Image Edit",
            "Ctrl + Shift + Z - Redo Image Edit",
            "M - Mute / Toggle Sound Effects",
            "Ctrl + E - Export Animation"
          ].join("\n");
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(cheatsheet).then(function () {
              showToast('Hotkey Cheatsheet copied to clipboard!', 2500);
              audioManager.play('pop');
            });
          }
        });
      }

      // Tab Switching (Image, Gradient, Video)
      ['image', 'gradient', 'video'].forEach(function (tab) {
        ['tab-btn-' + tab, 'studio-tab-btn-' + tab].forEach(function (id) {
          var btn = $(id);
          if (btn) {
            btn.addEventListener('click', function (e) {
              if (e) e.preventDefault();
              try {
                if (typeof audioManager !== 'undefined') {
                  try { audioManager.init(); } catch (ae) {}
                  try { audioManager.play('woosh'); } catch (ae) {}
                }
              } catch (ex) {}
              switchTab(tab);
            });
          }
        });
      });

      // Global Event Delegation for data-tab elements
      document.addEventListener('click', function (e) {
        var tabBtn = e.target.closest ? e.target.closest('[data-tab]') : null;
        if (tabBtn) {
          var targetTab = tabBtn.getAttribute('data-tab');
          if (targetTab === 'image' || targetTab === 'gradient' || targetTab === 'video') {
            try {
              if (typeof audioManager !== 'undefined') {
                try { audioManager.play('woosh'); } catch (ae) {}
              }
            } catch (ex) {}
            switchTab(targetTab);
          }
        }
      });

      // Copy CSS button
      if ($('copy-css-btn')) {
        $('copy-css-btn').addEventListener('click', copyGeneratedCss);
      }

      // File Upload
      if ($('file-input-element')) {
        $('file-input-element').addEventListener('change', function (e) {
          audioManager.play('pop');
          handleImageUpload(e);
        });
      }

      // Image Eraser Settings
      if ($('eraser-mode-color')) {
        $('eraser-mode-color').addEventListener('click', function () {
          audioManager.play('pop');
          state.eraserToolMode = 'color';
          this.classList.add('active');
          if ($('eraser-mode-brush')) $('eraser-mode-brush').classList.remove('active');
          if ($('eraser-mode-pan')) $('eraser-mode-pan').classList.remove('active');
          hide($('brush-controls-panel'));
          updatePickingState();
        });
      }

      if ($('eraser-mode-brush')) {
        $('eraser-mode-brush').addEventListener('click', function () {
          audioManager.play('pop');
          state.eraserToolMode = 'brush';
          this.classList.add('active');
          if ($('eraser-mode-color')) $('eraser-mode-color').classList.remove('active');
          if ($('eraser-mode-pan')) $('eraser-mode-pan').classList.remove('active');
          show($('brush-controls-panel'));
          state.isPickingColor = false;
          updatePickingState();
        });
      }

      if ($('eraser-mode-pan')) {
        $('eraser-mode-pan').addEventListener('click', function () {
          audioManager.play('pop');
          state.eraserToolMode = 'pan';
          this.classList.add('active');
          if ($('eraser-mode-color')) $('eraser-mode-color').classList.remove('active');
          if ($('eraser-mode-brush')) $('eraser-mode-brush').classList.remove('active');
          hide($('brush-controls-panel'));
          state.isPickingColor = false;
          updatePickingState();
        });
      }

      // Pick Color from Swatch / Box
      var targetColorBox = $('target-color-box');
      if (targetColorBox) {
        targetColorBox.addEventListener('click', function () {
          audioManager.play('pop');
          if (!state.imageObj) return;
          state.isPickingColor = !state.isPickingColor;
          updatePickingState();
        });
      }

      if ($('pick-color-btn')) {
        $('pick-color-btn').addEventListener('click', function () {
          audioManager.play('pop');
          if (!state.imageObj) return;
          state.isPickingColor = !state.isPickingColor;
          updatePickingState();
        });
      }

      // Brush Action (Erase vs Restore)
      if ($('brush-action-erase')) {
        $('brush-action-erase').addEventListener('click', function () {
          audioManager.play('pop');
          state.brushAction = 'erase';
          this.classList.add('active');
          if ($('brush-action-restore')) $('brush-action-restore').classList.remove('active');
        });
      }

      if ($('brush-action-restore')) {
        $('brush-action-restore').addEventListener('click', function () {
          audioManager.play('pop');
          state.brushAction = 'restore';
          this.classList.add('active');
          if ($('brush-action-erase')) $('brush-action-erase').classList.remove('active');
        });
      }

      // Tolerance Slider
      if ($('tolerance-slider')) {
        $('tolerance-slider').addEventListener('input', function (e) {
          state.tolerance = Number(e.target.value);
          if ($('tolerance-val')) $('tolerance-val').textContent = state.tolerance + '%';
          if (state.tolerance > 0 && state.targetColor) {
            state.targetColorPicked = true;
          } else if (state.tolerance === 0) {
            state.targetColorPicked = false;
          }
          scheduleProcessing();
        });
      }

      // --- AI Auto Background Removal & Depth of Field (Client-Side WASM) ---
      var selectedAiModel = 'small'; // 'small' (fast) or 'medium' (high quality)

      state.backdropMode = state.backdropMode || 'transparent'; // 'transparent', 'mesh', 'solid'
      state.backdropSolidColor = state.backdropSolidColor || '#171B19';
      state.defaultExportAlpha = true; // Enabled true PNG alpha by default!

      if ($('ai-bg-model-fast')) {
        $('ai-bg-model-fast').addEventListener('click', function () {
          selectedAiModel = 'small';
          $('ai-bg-model-fast').classList.add('active');
          if ($('ai-bg-model-quality')) $('ai-bg-model-quality').classList.remove('active');
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }

      if ($('ai-bg-model-quality')) {
        $('ai-bg-model-quality').addEventListener('click', function () {
          selectedAiModel = 'medium';
          $('ai-bg-model-quality').classList.add('active');
          if ($('ai-bg-model-fast')) $('ai-bg-model-fast').classList.remove('active');
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }

      // Backdrop replacement switcher
      ['transparent', 'mesh', 'solid'].forEach(function (modeKey) {
        var btn = $('bg-replace-' + modeKey);
        if (btn) {
          btn.addEventListener('click', function () {
            state.backdropMode = modeKey;
            ['transparent', 'mesh', 'solid'].forEach(function (m) {
              var b = $('bg-replace-' + m);
              if (b) b.classList.toggle('active', m === modeKey);
            });
            var solidRow = $('bg-solid-color-row');
            if (solidRow) toggle(solidRow, modeKey === 'solid');
            if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
            updatePreviewFromEditorCanvas();
          });
        }
      });

      if ($('bg-solid-color-picker')) {
        $('bg-solid-color-picker').addEventListener('click', function () {
          if (typeof openCustomColorPicker === 'function') {
            openCustomColorPicker(state.backdropSolidColor || '#171B19', function (newHex) {
              state.backdropSolidColor = newHex;
              if ($('bg-solid-color-swatch')) $('bg-solid-color-swatch').style.backgroundColor = newHex;
              updatePreviewFromEditorCanvas();
            });
          }
        });
      }

      // AI Auto Remove BG
      if ($('ai-remove-bg-btn')) {
        $('ai-remove-bg-btn').addEventListener('click', function () {
          if (!editorCanvas || !editorCtx || !state.imageObj) {
            if (typeof showToast === 'function') showToast('Please upload an image first');
            return;
          }

          if (typeof pushUndoState === 'function') pushUndoState();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');

          var statusBox = $('ai-bg-status-container');
          var statusText = $('ai-bg-status-text');
          var percentText = $('ai-bg-percent-text');
          var progressBar = $('ai-bg-progress-bar');
          var btn = $('ai-remove-bg-btn');

          if (statusBox) statusBox.classList.remove('hidden');
          if (btn) btn.disabled = true;

          function updateProgress(msg, pct) {
            if (statusText) statusText.textContent = msg;
            if (percentText) percentText.textContent = pct + '%';
            if (progressBar) progressBar.style.width = pct + '%';
          }

          updateProgress('Loading AI Model...', 5);

          editorCanvas.toBlob(function (imageBlob) {
            if (!imageBlob) {
              updateProgress('Error creating image blob', 0);
              if (btn) btn.disabled = false;
              return;
            }

            updateProgress('Downloading WASM AI Model...', 15);

            import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm').then(function (module) {
              var removeBackground = module.default || module.removeBackground || module;
              updateProgress('Segmenting Background...', 30);

              return removeBackground(imageBlob, {
                model: selectedAiModel,
                progress: function (key, current, total) {
                  if (total > 0) {
                    var p = Math.round(30 + (current / total) * 65);
                    updateProgress('Processing AI Model...', p);
                  }
                }
              });
            }).then(function (resultBlob) {
              updateProgress('Rendering Result...', 98);

              var resultUrl = URL.createObjectURL(resultBlob);
              var newImg = new Image();
              newImg.onload = function () {
                // CRITICAL SKIN COLOR PRESERVATION FIX: Disable manual color distance keyer so skin tones are 100% untouched
                state.targetColorPicked = false;
                state.tolerance = 0;
                state.isAiBgRemoved = true;

                state.imageObj = newImg;
                if (state.origCanvas) {
                  state.origCanvas.width = newImg.width;
                  state.origCanvas.height = newImg.height;
                  state.origCtx.clearRect(0, 0, newImg.width, newImg.height);
                  state.origCtx.drawImage(newImg, 0, 0);
                }
                updateProgress('Background Removed!', 100);
                setTimeout(function () {
                  if (statusBox) statusBox.classList.add('hidden');
                  if (btn) btn.disabled = false;
                }, 2000);
                scheduleProcessing();
                if (typeof showToast === 'function') showToast('AI Background Removal Complete!');
              };
              newImg.src = resultUrl;
            }).catch(function (err) {
              console.warn('AI BG model failed or offline:', err);
              updateProgress('AI Model Offline', 0);
              if (btn) btn.disabled = false;
              if (typeof showToast === 'function') showToast('AI Model Offline — check internet connection.');
            });
          }, 'image/png');
        });
      }

      // AI Depth of Field (Background Bokeh Blur)
      if ($('ai-dof-btn')) {
        $('ai-dof-btn').addEventListener('click', function () {
          if (!editorCanvas || !editorCtx || !state.imageObj) {
            if (typeof showToast === 'function') showToast('Please upload an image first');
            return;
          }

          var dofContainer = $('dof-blur-container');
          if (dofContainer) toggle(dofContainer);

          if (typeof pushUndoState === 'function') pushUndoState();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');

          var statusBox = $('ai-bg-status-container');
          var statusText = $('ai-bg-status-text');
          var percentText = $('ai-bg-percent-text');
          var progressBar = $('ai-bg-progress-bar');

          if (statusBox) statusBox.classList.remove('hidden');

          function updateProgress(msg, pct) {
            if (statusText) statusText.textContent = msg;
            if (percentText) percentText.textContent = pct + '%';
            if (progressBar) progressBar.style.width = pct + '%';
          }

          updateProgress('AI Segmenting Subject...', 10);

          var originalImage = state.imageObj;
          var blurPx = $('dof-blur-slider') ? Number($('dof-blur-slider').value) : 12;

          editorCanvas.toBlob(function (imageBlob) {
            if (!imageBlob) return;

            import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm').then(function (module) {
              var removeBackground = module.default || module.removeBackground || module;
              updateProgress('Creating Depth-of-Field Mask...', 40);

              return removeBackground(imageBlob, {
                model: selectedAiModel,
                progress: function (key, current, total) {
                  if (total > 0) {
                    var p = Math.round(40 + (current / total) * 50);
                    updateProgress('Processing Bokeh...', p);
                  }
                }
              });
            }).then(function (maskBlob) {
              updateProgress('Compositing Bokeh Layers...', 95);

              var maskImg = new Image();
              maskImg.onload = function () {
                var w = originalImage.width;
                var h = originalImage.height;

                var compCanvas = document.createElement('canvas');
                compCanvas.width = w;
                compCanvas.height = h;
                var cctx = compCanvas.getContext('2d');

                // 1. Draw 100% Opaque Blurred Background Layer (using origCanvas to prevent hole bleeding)
                cctx.clearRect(0, 0, w, h);
                cctx.filter = 'blur(' + blurPx + 'px)';
                if (state.origCanvas) {
                  cctx.drawImage(state.origCanvas, 0, 0, w, h);
                } else {
                  cctx.drawImage(originalImage, 0, 0, w, h);
                }
                cctx.filter = 'none';

                // 2. Draw Sharp Subject Cutout Layer on top
                cctx.drawImage(maskImg, 0, 0, w, h);

                var resImg = new Image();
                resImg.onload = function () {
                  state.imageObj = resImg;
                  state.targetColorPicked = false;
                  state.tolerance = 0;
                  state.edgeFeather = 0;

                  if ($('tolerance-slider')) $('tolerance-slider').value = 0;
                  if ($('tolerance-val')) $('tolerance-val').textContent = '0%';
                  if ($('edge-feather-slider')) $('edge-feather-slider').value = 0;
                  if ($('edge-feather-val')) $('edge-feather-val').textContent = '0%';

                  if (state.origCanvas) {
                    state.origCanvas.width = w;
                    state.origCanvas.height = h;
                    state.origCtx.clearRect(0, 0, w, h);
                    state.origCtx.drawImage(resImg, 0, 0);
                  }
                  updateProgress('Depth of Field Complete!', 100);
                  setTimeout(function () {
                    if (statusBox) statusBox.classList.add('hidden');
                  }, 2000);
                  scheduleProcessing();
                  if (typeof showToast === 'function') showToast('Depth-of-Field Bokeh Applied!');
                };
                resImg.src = compCanvas.toDataURL('image/png');
              };
              maskImg.src = URL.createObjectURL(maskBlob);
            }).catch(function (err) {
              console.warn('AI DOF error:', err);
              if (statusBox) statusBox.classList.add('hidden');
            });
          }, 'image/png');
        });
      }

      if ($('dof-blur-slider')) {
        $('dof-blur-slider').addEventListener('input', function (e) {
          var val = Number(e.target.value);
          if ($('dof-blur-val')) $('dof-blur-val').textContent = val + 'px';
        });
      }


      // Brush Size Slider
      if ($('brush-size-slider')) {
        $('brush-size-slider').addEventListener('input', function (e) {
          state.brushSize = Number(e.target.value);
          if ($('brush-size-val')) $('brush-size-val').textContent = state.brushSize + 'px';
          updateCanvasCursor();
        });
      }

      // Rotational Angle Suite (Dial Wheel, Number Input, Slider, Presets)
      function updateAngle(newAngle) {
        state.gradientAngle = Math.round((Number(newAngle) % 360 + 360) % 360);
        var slider = $('angle-slider');
        if (slider) {
          slider.value = state.gradientAngle;
          updateSliderFill(slider);
        }
        if ($('angle-val')) $('angle-val').textContent = state.gradientAngle + '\u00B0';
        if ($('angle-dial-needle')) $('angle-dial-needle').style.transform = 'rotate(' + state.gradientAngle + 'deg)';

        syncSelectedKeyframe();
        updateGradientPreview();
        updateCssOutput();
      }

      if ($('angle-slider')) {
        $('angle-slider').addEventListener('input', function (e) {
          updateAngle(e.target.value);
        });
      }

      if ($('gradient-midpoint-slider')) {
        $('gradient-midpoint-slider').addEventListener('input', function (e) {
          var val = Number(e.target.value);
          state.gradientMidpoint = val;
          if ($('gradient-midpoint-val')) $('gradient-midpoint-val').textContent = val + '%';
          renderCanvasHandlesOverlay();
          updateGradientPreview();
          updateCssOutput();
        });
      }

      var angleDial = $('angle-dial-wheel');
      if (angleDial) {
        var isDraggingDial = false;
        function handleDialEvent(e) {
          var rect = angleDial.getBoundingClientRect();
          var clientX = e.touches ? e.touches[0].clientX : e.clientX;
          var clientY = e.touches ? e.touches[0].clientY : e.clientY;
          var dx = clientX - (rect.left + rect.width / 2);
          var dy = clientY - (rect.top + rect.height / 2);
          var deg = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360);
          updateAngle(deg);
        }

        angleDial.addEventListener('mousedown', function (e) {
          isDraggingDial = true;
          handleDialEvent(e);
        });
        angleDial.addEventListener('touchstart', function (e) {
          isDraggingDial = true;
          handleDialEvent(e);
        }, { passive: true });

        document.addEventListener('mousemove', function (e) {
          if (isDraggingDial) handleDialEvent(e);
        });
        document.addEventListener('touchmove', function (e) {
          if (isDraggingDial) handleDialEvent(e);
        }, { passive: true });

        document.addEventListener('mouseup', function () { isDraggingDial = false; });
        document.addEventListener('touchend', function () { isDraggingDial = false; });
      }

      // Add Color Stop
      if ($('add-color-stop-btn')) {
        $('add-color-stop-btn').addEventListener('click', function () {
          audioManager.play('pop');
          state.gradientColors.push('#9cc5a1');
          syncSelectedKeyframe();
          renderColorStops();
          updateGradientPreview();
          updateCssOutput();
        });
      }

      // Image Filters — 60FPS Instant DOM CSS Filter Feedback + Debounced PNG Bake
      var filterBakeTimer = null;
      function updateFilters(isDragging) {
        var prevImg = $('preview-result-img');
        if (prevImg) {
          prevImg.style.filter = buildImageFilterCss(1);
        }
        if (filterBakeTimer) clearTimeout(filterBakeTimer);
        filterBakeTimer = setTimeout(function () {
          updatePreviewFromEditorCanvas();
        }, isDragging ? 100 : 0);
      }

      ['brightness', 'contrast', 'saturate', 'blur', 'hue'].forEach(function (filter) {
        var slider = $('filter-' + filter);
        if (slider) {
          slider.addEventListener('input', function (e) {
            state.imageFilters[filter] = Number(e.target.value);
            var unit = filter === 'blur' ? 'px' : (filter === 'hue' ? '\u00B0' : '%');
            if ($('filter-' + filter + '-val')) $('filter-' + filter + '-val').textContent = state.imageFilters[filter] + unit;
            updateFilters(true);
          });
          slider.addEventListener('change', function () {
            updateFilters(false);
          });
        }
      });

      // Quick Effect Toggles (Grayscale / Sepia / Invert) — simple on/off
      [['filter-toggle-grayscale', 'grayscale'], ['filter-toggle-sepia', 'sepia'], ['filter-toggle-invert', 'invert']].forEach(function (pair) {
        var btn = $(pair[0]);
        if (btn) {
          btn.addEventListener('click', function () {
            audioManager.play('pop');
            var on = state.imageFilters[pair[1]] > 0;
            state.imageFilters[pair[1]] = on ? 0 : 100;
            btn.classList.toggle('active', !on);
            updateFilters();
          });
        }
      });

      // Rotate / Flip
      if ($('image-rotate-btn')) {
        $('image-rotate-btn').addEventListener('click', function () {
          if (!editorCanvas || !editorCtx || !state.imageObj) return;
          pushUndoState();
          audioManager.play('pop');
          var w = state.imageObj.width, h = state.imageObj.height;
          var tmp = document.createElement('canvas');
          tmp.width = h; tmp.height = w;
          var tctx = tmp.getContext('2d');
          tctx.translate(h / 2, w / 2);
          tctx.rotate(Math.PI / 2);
          tctx.drawImage(state.imageObj, -w / 2, -h / 2);
          var dataUrl = tmp.toDataURL('image/png');
          var newImg = new Image();
          newImg.onload = function () {
            state.imageObj = newImg;
            if (state.origCanvas) {
              state.origCanvas.width = h; state.origCanvas.height = w;
              state.origCtx.clearRect(0, 0, h, w);
              state.origCtx.drawImage(newImg, 0, 0);
            }
            scheduleProcessing();
          };
          newImg.src = dataUrl;
        });
      }

      if ($('image-flip-h-btn')) {
        $('image-flip-h-btn').addEventListener('click', function () {
          if (!editorCanvas || !editorCtx || !state.imageObj) return;
          pushUndoState();
          audioManager.play('pop');
          var w = state.imageObj.width, h = state.imageObj.height;
          var tmp = document.createElement('canvas');
          tmp.width = w; tmp.height = h;
          var tctx = tmp.getContext('2d');
          tctx.translate(w, 0);
          tctx.scale(-1, 1);
          tctx.drawImage(state.imageObj, 0, 0);
          var dataUrl = tmp.toDataURL('image/png');
          var newImg = new Image();
          newImg.onload = function () {
            state.imageObj = newImg;
            if (state.origCanvas) {
              state.origCanvas.width = w; state.origCanvas.height = h;
              state.origCtx.clearRect(0, 0, w, h);
              state.origCtx.drawImage(newImg, 0, 0);
            }
            scheduleProcessing();
          };
          newImg.src = dataUrl;
        });
      }

      if ($('image-flip-v-btn')) {
        $('image-flip-v-btn').addEventListener('click', function () {
          if (!editorCanvas || !editorCtx || !state.imageObj) return;
          pushUndoState();
          audioManager.play('pop');
          var w = state.imageObj.width, h = state.imageObj.height;
          var tmp = document.createElement('canvas');
          tmp.width = w; tmp.height = h;
          var tctx = tmp.getContext('2d');
          tctx.translate(0, h);
          tctx.scale(1, -1);
          tctx.drawImage(state.imageObj, 0, 0);
          var dataUrl = tmp.toDataURL('image/png');
          var newImg = new Image();
          newImg.onload = function () {
            state.imageObj = newImg;
            if (state.origCanvas) {
              state.origCanvas.width = w; state.origCanvas.height = h;
              state.origCtx.clearRect(0, 0, w, h);
              state.origCtx.drawImage(newImg, 0, 0);
            }
            scheduleProcessing();
          };
          newImg.src = dataUrl;
        });
      }

      // Photoshop-Style Layers Controls
      if ($('add-layer-btn')) {
        $('add-layer-btn').addEventListener('click', function () {
          audioManager.play('pop');
          var newId = 'layer-' + Date.now();
          var count = state.layers.length + 1;
          state.layers.push({ id: newId, name: 'Layer ' + count, opacity: 100, blendMode: 'normal', visible: true });
          state.activeLayerId = newId;
          renderLayersList();
          pushUndoState();
        });
      }

      if ($('delete-layer-btn')) {
        $('delete-layer-btn').addEventListener('click', function () {
          audioManager.play('pop');
          deleteLayerById(state.activeLayerId);
          pushUndoState();
        });
      }

      // Selection & Retouch Tools
      [['tool-select-rect', 'rect'], ['tool-select-lasso', 'lasso'], ['tool-select-wand', 'wand'], ['tool-clone-stamp', 'clone'], ['tool-healing-brush', 'heal']].forEach(function (pair) {
        var btn = $(pair[0]);
        if (btn) {
          btn.addEventListener('click', function () {
            audioManager.play('pop');
            state.currentTool = pair[1];
            document.querySelectorAll('#sidebar-image-controls .segmented-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            if (editorCanvas) {
              editorCanvas.style.cursor = pair[1] === 'heal' || pair[1] === 'clone' ? 'crosshair' : 'default';
            }
          });
        }
      });

      // Undo / Redo Click Listeners
      ['image-undo-btn', 'img-undo-btn'].forEach(function (id) {
        var btn = $(id);
        if (btn) {
          btn.addEventListener('click', function () {
            handleUndo();
          });
        }
      });

      ['image-redo-btn', 'img-redo-btn'].forEach(function (id) {
        var btn = $(id);
        if (btn) {
          btn.addEventListener('click', function () {
            handleRedo();
          });
        }
      });

      // Automatically Push Undo Snapshot on Slider Commit (release)
      ['tolerance-slider', 'smoothing-slider', 'edge-feather-slider', 'filter-blur', 'filter-hue', 'filter-brightness', 'filter-contrast', 'filter-saturate', 'levels-gamma-slider'].forEach(function (id) {
        var slider = $(id);
        if (slider) {
          slider.addEventListener('change', function () {
            pushUndoState();
          });
        }
      });

      // Levels Gamma Slider
      if ($('levels-gamma-slider')) {
        $('levels-gamma-slider').addEventListener('input', function (e) {
          state.levelsGamma = Number(e.target.value) / 100;
          if ($('levels-gamma-val')) $('levels-gamma-val').textContent = state.levelsGamma.toFixed(1);
          updatePreviewFromEditorCanvas();
        });
      }

      // Edge Feather (background removal edge softness)
      if ($('edge-feather-slider')) {
        $('edge-feather-slider').addEventListener('input', function (e) {
          state.edgeFeather = Number(e.target.value);
          if ($('edge-feather-val')) $('edge-feather-val').textContent = state.edgeFeather + '%';
          scheduleProcessing();
        });
      }



      // Interactive Canvas Mouse Events & Pan/Zoom
      var wrap = $('source-canvas-wrap');

      function applyTransform() {
        editorCanvas.style.transform = 'translate(' + state.canvasTransform.panX + 'px, ' + state.canvasTransform.panY + 'px) scale(' + state.canvasTransform.scale + ')';
      }

      wrap.addEventListener('wheel', function (e) {
        e.preventDefault();
        var zoomIntensity = 0.05;
        var wheel = e.deltaY < 0 ? 1 : -1;
        var zoom = Math.exp(wheel * zoomIntensity);

        var rect = wrap.getBoundingClientRect();
        var mouseX = e.clientX - rect.left;
        var mouseY = e.clientY - rect.top;

        // Adjust pan to zoom towards mouse
        state.canvasTransform.panX = mouseX - (mouseX - state.canvasTransform.panX) * zoom;
        state.canvasTransform.panY = mouseY - (mouseY - state.canvasTransform.panY) * zoom;
        state.canvasTransform.scale *= zoom;

        applyTransform();
      }, { passive: false });

      wrap.addEventListener('mousedown', function (e) {
        if (e.button === 1 || (e.button === 0 && (e.shiftKey || state.spacebarDown || state.eraserToolMode === 'pan'))) {
          // Middle click, Shift+Click, Spacebar+Click, or Pan Mode active
          state.isPanning = true;
          state.lastPanMouseX = e.clientX;
          state.lastPanMouseY = e.clientY;
          wrap.style.cursor = 'grabbing';
        } else {
          handleCanvasMouseDown(e);
        }
      });

      window.addEventListener('mousemove', function (e) {
        if (state.isPanning) {
          var dx = e.clientX - state.lastPanMouseX;
          var dy = e.clientY - state.lastPanMouseY;
          state.canvasTransform.panX += dx;
          state.canvasTransform.panY += dy;
          state.lastPanMouseX = e.clientX;
          state.lastPanMouseY = e.clientY;
          applyTransform();
        } else {
          handleCanvasMouseMove(e);
        }
      });

      window.addEventListener('mouseup', function (e) {
        if (state.isPanning) {
          state.isPanning = false;
          wrap.style.cursor = state.spacebarDown || state.eraserToolMode === 'pan' ? 'grab' : '';
        }
        handleCanvasMouseUp(e);
      });

      // Spacebar Panning Support
      window.addEventListener('keydown', function (e) {
        if (e.code === 'Space' && !state.spacebarDown && state.activeTab === 'image') {
          e.preventDefault();
          state.spacebarDown = true;
          if (!state.isPanning) wrap.style.cursor = 'grab';
        }
      });
      window.addEventListener('keyup', function (e) {
        if (e.code === 'Space') {
          e.preventDefault();
          state.spacebarDown = false;
          if (!state.isPanning && state.eraserToolMode !== 'pan') wrap.style.cursor = '';
        }
      });

      // Gradient Type Mode
      document.querySelectorAll('#sidebar-gradient-controls .segmented-btn[data-gmode]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          audioManager.play('pop');
          state.gradientMode = btn.dataset.gmode;
          document.querySelectorAll('#sidebar-gradient-controls .segmented-btn[data-gmode]').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          updateGradientSections();
          updateGradientPreview();
          updateCssOutput();
        });
      });

      // Animated DaVinci Fusion Effects controls (Displacement & Blur)
      if ($('animated-displacement-slider')) {
        $('animated-displacement-slider').addEventListener('input', function (e) {
          var val = Number(e.target.value);
          state.animatedDisplacement = val;
          if ($('animated-displacement-val')) $('animated-displacement-val').textContent = val + '%';
          if (state.selectedKeyframePct !== null) {
            var kf = state.keyframes.find(function (k) { return k.percent === state.selectedKeyframePct; });
            if (kf) kf.noise = val;
          }
          updateGradientPreview();
          if (!state.isPlaying) startAnimatedGradientLoop();
        });
      }
      if ($('animated-blur-slider')) {
        $('animated-blur-slider').addEventListener('input', function (e) {
          var val = Number(e.target.value);
          state.animatedBlur = val;
          if ($('animated-blur-val')) $('animated-blur-val').textContent = val + 'px';
          if (state.selectedKeyframePct !== null) {
            var kf = state.keyframes.find(function (k) { return k.percent === state.selectedKeyframePct; });
            if (kf) kf.blur = val;
          }
          updateGradientPreview();
          if (!state.isPlaying) startAnimatedGradientLoop();
        });
      }


      // Add Positional Point
      var addPosBtn = $('add-positional-point-btn');
      if (addPosBtn) {
        addPosBtn.addEventListener('click', function () {
          audioManager.play('pop');
          var randomColor = QUICK_PALETTE_COLORS[Math.floor(Math.random() * QUICK_PALETTE_COLORS.length)];
          var newPt = {
            x: Math.round((0.2 + Math.random() * 0.6) * 100) / 100,
            y: Math.round((0.2 + Math.random() * 0.6) * 100) / 100,
            color: randomColor,
            intensity: 85,
            radius: 0.70
          };
          state.positionalPoints.push(newPt);
          renderPositionalPointsList();
          renderCanvasHandlesOverlay();
          updateGradientPreview();
          updateCssOutput();
        });
      }

      // Add Freeform Fluid Point
      var addFluidBtn = $('add-fluid-point-btn');
      if (addFluidBtn) {
        addFluidBtn.addEventListener('click', function () {
          audioManager.play('pop');
          var randomColor = QUICK_PALETTE_COLORS[Math.floor(Math.random() * QUICK_PALETTE_COLORS.length)];
          var newPt = {
            id: Date.now(),
            x: Math.round((0.2 + Math.random() * 0.6) * 100) / 100,
            y: Math.round((0.2 + Math.random() * 0.6) * 100) / 100,
            color: randomColor,
            intensity: 85,
            radius: 0.65
          };
          state.fluidPoints.push(newPt);
          renderFluidPointsList();
          renderCanvasHandlesOverlay();
          updateGradientPreview();
          updateCssOutput();
        });
      }

      // 3D Liquid Lava Lamp Controls & Color Pickers
      var cpTrigger1 = $('lava-cp-trigger1');
      if (cpTrigger1) {
        cpTrigger1.addEventListener('click', function () {
          openCustomColorPicker(state.lavaLamp.waxColor1, function (newCol) {
            state.lavaLamp.waxColor1 = newCol;
            if ($('lava-swatch1')) $('lava-swatch1').style.backgroundColor = newCol;
            if ($('lava-wax-color1-text')) $('lava-wax-color1-text').value = newCol.toUpperCase();
          });
        });
      }

      var cpTrigger2 = $('lava-cp-trigger2');
      if (cpTrigger2) {
        cpTrigger2.addEventListener('click', function () {
          openCustomColorPicker(state.lavaLamp.waxColor2, function (newCol) {
            state.lavaLamp.waxColor2 = newCol;
            if ($('lava-swatch2')) $('lava-swatch2').style.backgroundColor = newCol;
            if ($('lava-wax-color2-text')) $('lava-wax-color2-text').value = newCol.toUpperCase();
          });
        });
      }

      var cpTriggerBg = $('lava-cp-trigger-bg');
      if (cpTriggerBg) {
        cpTriggerBg.addEventListener('click', function () {
          openCustomColorPicker(state.lavaLamp.bgColor, function (newCol) {
            state.lavaLamp.bgColor = newCol;
            if ($('lava-swatch-bg')) $('lava-swatch-bg').style.backgroundColor = newCol;
            if ($('lava-bg-color-text')) $('lava-bg-color-text').value = newCol.toUpperCase();
          });
        });
      }

      if ($('lava-wax-color1-text')) {
        $('lava-wax-color1-text').addEventListener('input', function (e) {
          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            state.lavaLamp.waxColor1 = e.target.value;
            if ($('lava-swatch1')) $('lava-swatch1').style.backgroundColor = e.target.value;
          }
        });
      }

      if ($('lava-wax-color2-text')) {
        $('lava-wax-color2-text').addEventListener('input', function (e) {
          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            state.lavaLamp.waxColor2 = e.target.value;
            if ($('lava-swatch2')) $('lava-swatch2').style.backgroundColor = e.target.value;
          }
        });
      }

      if ($('lava-bg-color-text')) {
        $('lava-bg-color-text').addEventListener('input', function (e) {
          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            state.lavaLamp.bgColor = e.target.value;
            if ($('lava-swatch-bg')) $('lava-swatch-bg').style.backgroundColor = e.target.value;
          }
        });
      }

      if ($('lava-blob-count-slider')) {
        $('lava-blob-count-slider').addEventListener('input', function (e) {
          state.lavaLamp.blobCount = Number(e.target.value);
          if ($('lava-blob-count-val')) $('lava-blob-count-val').textContent = state.lavaLamp.blobCount;
          state.lavaLamp.blobs = []; // reinit
          initLavaLampBlobs();
        });
      }

      if ($('lava-speed-slider')) {
        $('lava-speed-slider').addEventListener('input', function (e) {
          state.lavaLamp.speed = Number(e.target.value);
          if ($('lava-speed-val')) $('lava-speed-val').textContent = state.lavaLamp.speed.toFixed(1) + 'x';
        });
      }

      if ($('lava-viscosity-slider')) {
        $('lava-viscosity-slider').addEventListener('input', function (e) {
          state.lavaLamp.viscosity = Number(e.target.value);
          if ($('lava-viscosity-val')) $('lava-viscosity-val').textContent = state.lavaLamp.viscosity.toFixed(1) + 'x';
        });
      }

      if ($('lava-specular-toggle-btn')) {
        $('lava-specular-toggle-btn').addEventListener('click', function () {
          audioManager.play('pop');
          state.lavaLamp.specular = !state.lavaLamp.specular;
          this.classList.toggle('active', state.lavaLamp.specular);
          if ($('lava-specular-dot')) $('lava-specular-dot').style.background = state.lavaLamp.specular ? 'var(--color-seaweed)' : 'var(--color-muted-teal)';
        });
      }


      // Texture Noise Toggle
      if ($('noise-toggle-btn')) {
        $('noise-toggle-btn').addEventListener('click', function () {
          audioManager.play('pop');
          state.enableNoise = !state.enableNoise;
          this.classList.toggle('active', state.enableNoise);
          if ($('noise-dot')) $('noise-dot').style.background = state.enableNoise ? 'var(--color-seaweed)' : 'var(--color-muted-teal)';
          toggle($('noise-controls-panel'), state.enableNoise);
          updateGradientPreview();
          updateCssOutput();
        });
      }

      // Noise Sliders
      if ($('noise-freq-slider')) {
        $('noise-freq-slider').addEventListener('input', function (e) {
          state.noiseFrequency = Number(e.target.value);
          if ($('noise-freq-val')) $('noise-freq-val').textContent = state.noiseFrequency.toFixed(2);
          updateGradientPreview();
          updateCssOutput();
        });
      }

      if ($('noise-opacity-slider')) {
        $('noise-opacity-slider').addEventListener('input', function (e) {
          state.noiseOpacity = Number(e.target.value);
          if ($('noise-opacity-val')) $('noise-opacity-val').textContent = Math.round(state.noiseOpacity * 100) + '%';
          updateGradientPreview();
          updateCssOutput();
        });
      }

      // Animation Duration Speed Slider
      var animDurSlider = $('animation-duration-slider');
      if (animDurSlider) {
        animDurSlider.addEventListener('input', function (e) {
          state.animationDuration = Number(e.target.value);
          if ($('animation-duration-val')) $('animation-duration-val').textContent = state.animationDuration.toFixed(1) + 's';
          updateTimelineUI();
          updateGradientPreview();
          updateCssOutput();
        });
      }

      // MEDIA PLAYER TIMELINE CONTROLS
      if ($('timeline-slider')) {
        $('timeline-slider').addEventListener('input', function (e) {
          var pct = Number(e.target.value);
          state.currentTime = (pct / 100) * state.animationDuration;
          updateTimelineUI();
          updateGradientPreview();
        });
      }

      // Media Controls Row
      if ($('btn-media-play')) {
        $('btn-media-play').addEventListener('click', function () {
          audioManager.play('pop');
          toggleMediaPlay();
        });
      }

      if ($('btn-media-prev')) {
        $('btn-media-prev').addEventListener('click', function () {
          audioManager.play('pop');
          var sorted = state.keyframes.slice().sort(function (a, b) { return a.percent - b.percent; });
          var curPct = (state.currentTime / state.animationDuration) * 100;
          var prevKf = sorted[0];
          for (var i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i].percent < curPct - 1) {
              prevKf = sorted[i];
              break;
            }
          }
          state.currentTime = (prevKf.percent / 100) * state.animationDuration;
          updateTimelineUI();
          updateGradientPreview();
        });
      }

      if ($('btn-media-next')) {
        $('btn-media-next').addEventListener('click', function () {
          audioManager.play('pop');
          var sorted = state.keyframes.slice().sort(function (a, b) { return a.percent - b.percent; });
          var curPct = (state.currentTime / state.animationDuration) * 100;
          var nextKf = sorted[sorted.length - 1];
          for (var i = 0; i < sorted.length; i++) {
            if (sorted[i].percent > curPct + 1) {
              nextKf = sorted[i];
              break;
            }
          }
          state.currentTime = (nextKf.percent / 100) * state.animationDuration;
          updateTimelineUI();
          updateGradientPreview();
        });
      }

      if ($('add-keyframe-current-btn')) {
        $('add-keyframe-current-btn').addEventListener('click', function () {
          audioManager.play('pop');
          var curPct = Math.round((state.currentTime / state.animationDuration) * 100);
          state.keyframes = state.keyframes.filter(function (k) { return Math.abs(k.percent - curPct) > 2; });
          state.keyframes.push({
            percent: curPct,
            time: state.currentTime,
            posX: 50,
            posY: 50,
            colors: state.gradientColors ? state.gradientColors.slice() : ['#FF6B6B', '#49A078'],
            angle: state.gradientAngle || 90,
            noise: 35,
            seedRate: 1.0,
            blur: 0
          });
          state.selectedKeyframePct = curPct;
          state.keyframes.sort(function (a, b) { return a.percent - b.percent; });
          renderTimelineMarkers();
          renderKeyframesList();
          updateGradientPreview();
          updateCssOutput();
        });
      }

      // Gradient Export Controls
      if ($('gradient-export-main-btn')) {
        $('gradient-export-main-btn').addEventListener('click', function () {
          var targetRes = state.selectedExportResolution || (typeof GRADIENT_RESOLUTIONS !== 'undefined' ? GRADIENT_RESOLUTIONS[0] : { width: 1920, height: 1080, label: 'FHD' });
          handleExportGradient(targetRes);
        });
      }

      if ($('gradient-export-chevron-btn')) {
        $('gradient-export-chevron-btn').addEventListener('click', function (e) {
          e.stopPropagation();
          state.isGradientExportMenuOpen = !state.isGradientExportMenuOpen;
          renderGradientResolutions();
          toggle($('gradient-export-menu'), state.isGradientExportMenuOpen);
        });
      }

      // (old Generated-CSS-panel copy/download buttons removed — Copy CSS button above handles this now)

      // Close Dropdowns on Click Outside
      document.addEventListener('mousedown', function (e) {
        var menu = $('gradient-export-menu');
        var anchor = $('gradient-export-dropdown-anchor');
        if (anchor && !anchor.contains(e.target)) {
          state.isGradientExportMenuOpen = false;
          hide(menu);
        }
        var imgMenu = $('image-export-menu-sk');
        var imgAnchor = $('image-export-dropdown-anchor');
        if (imgAnchor && !imgAnchor.contains(e.target)) {
          state.isImageExportMenuOpen = false;
          if (imgMenu) hide(imgMenu);
        }
      });

      // Terms & Conditions Modal
      function openTermsModal() {
        audioManager.play('pop');
        show($('terms-modal-overlay'));
      }
      function closeTermsModal() {
        hide($('terms-modal-overlay'));
      }
      document.querySelectorAll('#open-terms-modal-btn, .open-terms-modal-btn, .terms-link-btn').forEach(function (btn) {
        btn.addEventListener('click', openTermsModal);
      });
      if ($('terms-modal-close-btn')) $('terms-modal-close-btn').addEventListener('click', closeTermsModal);
      if ($('terms-modal-accept-btn')) $('terms-modal-accept-btn').addEventListener('click', closeTermsModal);

      // Export Modal Cancellation
      function cancelExportModal() {
        audioManager.play('pop');
        state.isExportingCancelled = true;
        hide($('export-modal-overlay'));
        if (typeof showToast === 'function') showToast('Export cancelled');
      }
      if ($('export-modal-cancel-btn')) $('export-modal-cancel-btn').addEventListener('click', cancelExportModal);
      if ($('export-modal-close-btn')) $('export-modal-close-btn').addEventListener('click', cancelExportModal);

      // Global ESC Key Close Handler for All Modals
      window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.code === 'Escape') {
          if ($('terms-modal-overlay') && !$('terms-modal-overlay').classList.contains('hidden')) closeTermsModal();
          if ($('export-modal-overlay') && !$('export-modal-overlay').classList.contains('hidden')) cancelExportModal();
          if ($('settings-modal-overlay') && !$('settings-modal-overlay').classList.contains('hidden')) {
            if (typeof closeSettingsModal === 'function') closeSettingsModal();
          }
          if ($('color-picker-modal-overlay') && !$('color-picker-modal-overlay').classList.contains('hidden')) {
            if (typeof closeCustomColorPicker === 'function') closeCustomColorPicker();
          }
        }

        if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'z') {
          if (state.activeTab === 'image') {
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
          }
        } else if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'y') {
          if (state.activeTab === 'image') {
            e.preventDefault();
            handleRedo();
          }
        }
      });

      // Initialize Image Tab 2D Style Pad & LUT Presets Grid
      initStylePad({
        touchId: 'img-style-pad-touch',
        dotsId: 'img-style-pad-dots',
        puckId: 'img-style-pad-puck',
        glowId: 'img-style-pad-glow',
        readoutId: 'img-style-pad-readout',
        resetBtnId: 'img-style-pad-reset-btn',
        onChange: function (tone, warmth, isFinal) {
          state.imgStylePad.tone = tone;
          state.imgStylePad.warmth = warmth;
          if (isFinal) {
            if ($('preview-result-img')) $('preview-result-img').style.filter = '';
            pushUndoState();
            updatePreviewFromEditorCanvas();
          } else {
            var prev = $('preview-result-img');
            if (prev) {
              var c = 100 + (tone * 0.3);
              var h = warmth * 0.4;
              prev.style.filter = 'contrast(' + c + '%) hue-rotate(' + h + 'deg)';
            }
          }
        }
      });

      renderLutGrid('img-lut-grid', state.imgLut, function (lutId) {
        state.imgLut = lutId;
        updatePreviewFromEditorCanvas();
      });

      var imgLutSlider = $('img-lut-strength-slider');
      if (imgLutSlider) {
        imgLutSlider.addEventListener('input', function (e) {
          state.imgLutStrength = Number(e.target.value);
          if ($('img-lut-strength-val')) $('img-lut-strength-val').textContent = state.imgLutStrength + '%';
          updatePreviewFromEditorCanvas();
        });
      }

      initVideoTab();
    }

    // --- Video Tab (upload, live color grading, resize+sharpen, export) ---
    var videoState = { scale: 1, recorder: null, audioCtx: null };

    var VIDEO_LUT_PRESETS = [
      { id: 'normal', title: 'Normal', sub: 'Standard Color', color: 'linear-gradient(135deg, #64748b, #334155)' },
      { id: 'tonal-blue', title: 'Tonal Blue', sub: 'Moody Cyan/Navy Matrix', color: 'linear-gradient(135deg, #0284c7, #0f172a)' },
      { id: 'tonal-sand', title: 'Tonal Sand', sub: 'Desert Amber Tones', color: 'linear-gradient(135deg, #d97706, #78350f)' },
      { id: 'explorer-teal', title: 'Explorer Teal', sub: 'Teal & Orange Blockbuster', color: 'linear-gradient(135deg, #0d9488, #ea580c)' },
      { id: 'dark-monochrome', title: 'Dark Monochrome', sub: 'Dramatic Silver Film', color: 'linear-gradient(135deg, #cbd5e1, #020617)' },
      { id: 'cashmere', title: 'Cashmere', sub: 'Soft Muted Matte', color: 'linear-gradient(135deg, #fef3c7, #d97706)' },
      { id: 'golden-age', title: 'Golden Age', sub: '70s Vintage Warmth', color: 'linear-gradient(135deg, #fbbf24, #b45309)' },
      { id: 'century', title: 'Century', sub: 'Deep Forest Teal', color: 'linear-gradient(135deg, #059669, #064e3b)' },
      { id: 'pacific-coast', title: 'Pacific Coast', sub: 'Deep Ocean Cyan', color: 'linear-gradient(135deg, #06b6d4, #1e3a8a)' },
      { id: 'super-gold', title: 'Super Gold', sub: 'Golden Hour Sunset Glow', color: 'linear-gradient(135deg, #f59e0b, #dc2626)' },
      { id: 'earthy-monochrome', title: 'Earthy Monochrome', sub: 'Sepia Bronze Tone', color: 'linear-gradient(135deg, #a16207, #451a03)' }
    ];

    function getVideoLutCss(lutId) {
      switch (lutId) {
        case 'tonal-blue':
          return 'sepia(0.25) hue-rotate(170deg) saturate(1.4) contrast(1.15)';
        case 'tonal-sand':
          return 'sepia(0.35) hue-rotate(-20deg) saturate(1.25) contrast(1.1)';
        case 'explorer-teal':
          return 'contrast(1.2) saturate(1.35) hue-rotate(-15deg)';
        case 'dark-monochrome':
          return 'grayscale(1) contrast(1.4) brightness(0.9)';
        case 'cashmere':
          return 'sepia(0.2) saturate(0.85) contrast(0.95) brightness(1.05)';
        case 'golden-age':
          return 'sepia(0.4) saturate(1.2) hue-rotate(-10deg) contrast(1.1)';
        case 'century':
          return 'hue-rotate(90deg) saturate(0.9) contrast(1.15)';
        case 'pacific-coast':
          return 'hue-rotate(150deg) saturate(1.35) contrast(1.1)';
        case 'super-gold':
          return 'sepia(0.5) saturate(1.5) hue-rotate(-25deg) contrast(1.2)';
        case 'earthy-monochrome':
          return 'grayscale(0.85) sepia(0.5) contrast(1.25)';
        default:
          return '';
      }
    }

    function renderVideoLutGrid(gridId, currentLutId, onSelectLutCallback) {
      var container = $(gridId);
      if (!container) return;
      container.innerHTML = '';
      container.className = 'lut-grid-3d';

      VIDEO_LUT_PRESETS.forEach(function (lut) {
        var card = document.createElement('div');
        card.className = 'lut-pill-card' + (lut.id === (currentLutId || 'normal') ? ' active' : '');
        card.dataset.lut = lut.id;
        card.innerHTML =
          '<div class="lut-sphere-preview" style="background:' + lut.color + '"></div>' +
          '<div class="lut-pill-info">' +
          '<div class="lut-pill-title">' + lut.title + '</div>' +
          '<div class="lut-pill-sub">' + lut.sub + '</div>' +
          '</div>';

        card.addEventListener('click', function () {
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
          container.querySelectorAll('.lut-pill-card').forEach(function (c) { c.classList.remove('active'); });
          card.classList.add('active');
          if (onSelectLutCallback) onSelectLutCallback(lut.id);
          showToast('Applied ' + lut.title + ' LUT', 2000);
        });

        container.appendChild(card);
      });
    }

    function buildVideoFilterCss() {
      var bEl = $('vid-brightness-slider') || $('vid-brightness');
      var cEl = $('vid-contrast-slider') || $('vid-contrast');
      var sEl = $('vid-saturate-slider') || $('vid-saturate');
      var tEl = $('vid-temp-slider') || $('vid-temp');

      var bRaw = bEl ? parseFloat(bEl.value) : 0;
      var cRaw = cEl ? parseFloat(cEl.value) : 0;
      var sRaw = sEl ? parseFloat(sEl.value) : 0;
      var tRaw = tEl ? parseFloat(tEl.value) : 0;

      var b = 100 + (bRaw * 1.2);
      var c = 100 + (cRaw * 1.2);
      var s = 100 + (sRaw * 1.5);

      var css = 'brightness(' + b.toFixed(1) + '%) contrast(' + c.toFixed(1) + '%) saturate(' + s.toFixed(1) + '%)';

      if (tRaw !== 0) {
        if (tRaw > 0) {
          css += ' sepia(' + (tRaw * 0.8).toFixed(1) + '%) hue-rotate(' + (-tRaw * 0.15).toFixed(1) + 'deg)';
        } else {
          css += ' hue-rotate(' + (-tRaw * 0.5).toFixed(1) + 'deg) saturate(' + (100 + Math.abs(tRaw)*0.5).toFixed(1) + '%)';
        }
      }

      if (state.vidStylePad) {
        var t = state.vidStylePad.tone || 0;
        var w = state.vidStylePad.warmth || 0;

        if (w > 0) {
          css += ' sepia(' + (w * 0.35).toFixed(1) + '%) hue-rotate(' + (-w * 0.15).toFixed(1) + 'deg)';
        } else if (w < 0) {
          css += ' hue-rotate(' + (-w * 0.5).toFixed(1) + 'deg)';
        }

        if (t !== 0) {
          css += ' contrast(' + (100 + t * 0.25).toFixed(1) + '%) brightness(' + (100 + t * 0.15).toFixed(1) + '%)';
        }
      }

      var lutCss = getVideoLutCss(state.vidLut || 'normal');
      if (lutCss) {
        css += ' ' + lutCss;
      }

      return css;
    }

    function refreshVideoGrading() {
      var css = buildVideoFilterCss();
      var video = $('video-player-el');
      if (video) {
        video.style.filter = css;
        video.style.setProperty('filter', css, 'important');
      }
      var vStage = $('video-canvas-stage');
      if (vStage) {
        vStage.style.filter = css;
        vStage.style.setProperty('filter', css, 'important');
      }
      var sCanvas = $('sample-video-canvas');
      if (sCanvas) {
        sCanvas.style.filter = css;
        sCanvas.style.setProperty('filter', css, 'important');
      }
      state.currentVideoFilterCss = css;
    }

    function initColorAdjustmentsControls() {
      var sliders = [
        { id: 'vid-brightness-slider', valId: 'vid-brightness-val', suffix: '%' },
        { id: 'vid-contrast-slider', valId: 'vid-contrast-val', suffix: '%' },
        { id: 'vid-saturate-slider', valId: 'vid-saturate-val', suffix: '%' },
        { id: 'vid-temp-slider', valId: 'vid-temp-val', suffix: '' }
      ];

      sliders.forEach(function (item) {
        var el = $(item.id);
        var valBadge = $(item.valId);
        if (el && !el.dataset.colorBound) {
          el.dataset.colorBound = 'true';
          var updateHandler = function () {
            var val = parseFloat(el.value);
            if (valBadge) valBadge.textContent = (val > 0 ? '+' : '') + val + item.suffix;
            refreshVideoGrading();
            try { initSliderFills(); } catch (e) {}
          };
          el.addEventListener('input', updateHandler);
          el.addEventListener('change', updateHandler);
        }
      });

      var resetBtn = $('btn-reset-video-grading');
      if (resetBtn && !resetBtn.dataset.colorBound) {
        resetBtn.dataset.colorBound = 'true';
        resetBtn.addEventListener('click', function () {
          sliders.forEach(function (item) {
            var el = $(item.id);
            var valBadge = $(item.valId);
            if (el) el.value = 0;
            if (valBadge) valBadge.textContent = '0' + item.suffix;
          });
          refreshVideoGrading();
          try { initSliderFills(); } catch (e) {}
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
          showToast('Adjustments reset to default', 1800);
        });
      }
    }

    // =========================================================
    // REACTIVE CAPTION STORE & DATA MODEL (MILESTONE 2 - R1)
    // =========================================================

    function synthesizeWordTimestampsForSegment(text, start, end) {
      if (!text || typeof text !== 'string') return [];
      var cleanText = text.trim();
      if (!cleanText) return [];

      var words = cleanText.split(/\s+/).filter(Boolean);
      if (words.length === 0) return [];

      var numStart = Math.max(0, Number(start) || 0);
      var numEnd = Math.max(numStart + 0.05, Number(end) || (numStart + 1.0));
      var totalDuration = numEnd - numStart;

      var charLengths = words.map(function (w) { return Math.max(1, w.length); });
      var totalChars = charLengths.reduce(function (sum, len) { return sum + len; }, 0);

      var result = [];
      var currentStart = numStart;

      for (var i = 0; i < words.length; i++) {
        var proportion = charLengths[i] / totalChars;
        var rawDuration = totalDuration * proportion;
        var wDuration = Math.max(0.05, Math.round(rawDuration * 1000) / 1000);

        var wStart = Math.round(currentStart * 1000) / 1000;
        var wEnd = (i === words.length - 1) ? Math.round(numEnd * 1000) / 1000 : Math.round((currentStart + wDuration) * 1000) / 1000;

        if (wEnd <= wStart) {
          wEnd = Math.round((wStart + 0.05) * 1000) / 1000;
        }

        result.push({
          id: 'w_' + i,
          text: words[i],
          start: wStart,
          end: wEnd,
          colorOverride: null
        });

        currentStart = wEnd;
      }

      return result;
    }

    function normalizeCaptionTimestamps(segments) {
      if (!Array.isArray(segments)) return [];

      return segments.map(function (seg, segIdx) {
        var segId = seg.id || ('seg_' + segIdx);
        var segText = (seg.text || '').trim();

        var segStart = Math.max(0, Math.round((Number(seg.start) || 0) * 1000) / 1000);
        var segEnd = Math.max(segStart + 0.05, Math.round((Number(seg.end) || (segStart + 1.0)) * 1000) / 1000);

        var words = seg.words;

        if (!Array.isArray(words) || words.length === 0) {
          words = synthesizeWordTimestampsForSegment(segText, segStart, segEnd);
        } else {
          var prevWEnd = segStart;
          words = words.map(function (w, wIdx) {
            var wId = w.id || ('w_' + segIdx + '_' + wIdx);
            var wText = (w.text || w.word || '').trim();

            var wStart = Math.max(prevWEnd, Math.max(0, Math.round((Number(w.start) || prevWEnd) * 1000) / 1000));
            var wEnd = Math.round((Number(w.end) || (wStart + 0.05)) * 1000) / 1000;

            if (wEnd < wStart + 0.05) {
              wEnd = Math.round((wStart + 0.05) * 1000) / 1000;
            }

            prevWEnd = wEnd;

            return {
              id: wId,
              text: wText,
              start: wStart,
              end: wEnd,
              colorOverride: w.colorOverride !== undefined ? w.colorOverride : null
            };
          });

          if (words.length > 0) {
            segEnd = Math.max(segEnd, words[words.length - 1].end);
          }
        }

        return {
          id: segId,
          start: segStart,
          end: segEnd,
          text: segText,
          words: words,
          styleOverride: seg.styleOverride || undefined
        };
      });
    }

    var defaultCaptionStyle = {
      fontFamily: 'Outfit',
      fontSize: 24,
      fontWeight: '700',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      textTransform: 'none',
      colorType: 'solid',
      solidColor: '#FFFFFF',
      gradientStops: [
        { color: '#8A2BE2', position: 0 },
        { color: '#4169E1', position: 100 }
      ],
      gradientAngle: 90,
      activeWordColor: '#FFD700',
      backgroundColor: 'rgba(10, 10, 15, 0.85)',
      backgroundOpacity: 0.85,
      positionX: 50,
      positionY: 85,
      presetId: 'default'
    };

    var defaultTransitionPreset = {
      id: 'default',
      name: 'Karaoke Highlight',
      type: 'karaoke-highlight',
      duration: 0.3,
      easing: 'ease-out'
    };

    var _subscribers = [];

    var _state = {
      segments: [],
      globalStyle: Object.assign({}, defaultCaptionStyle),
      transition: Object.assign({}, defaultTransitionPreset),
      selectedSegmentId: null,
      selectedWordId: null,
      history: [[]],
      historyIndex: 0
    };

    var _isNotifying = false;
    var _notifyPending = false;

    var CaptionStore = {
      getState: function () {
        return JSON.parse(JSON.stringify(_state));
      },

      getSegments: function () {
        return JSON.parse(JSON.stringify(_state.segments || []));
      },

      getSegment: function (id) {
        if (!id) return null;
        var seg = (_state.segments || []).find(function (s) { return s.id === id; });
        return seg ? JSON.parse(JSON.stringify(seg)) : null;
      },

      deleteSegment: function (id) {
        if (!id) return false;
        var currentSegments = (_state.segments || []).slice();
        var idx = currentSegments.findIndex(function (s) { return s.id === id; });
        if (idx === -1) return false;
        currentSegments.splice(idx, 1);
        var newSelectedId = _state.selectedSegmentId === id ? null : _state.selectedSegmentId;
        var newSelectedWordId = _state.selectedSegmentId === id ? null : _state.selectedWordId;
        this.setState({
          segments: currentSegments,
          selectedSegmentId: newSelectedId,
          selectedWordId: newSelectedWordId
        }, true);
        return true;
      },

      updateSegmentStyleOverride: function (id, override) {
        if (!id) return false;
        var currentSegments = (_state.segments || []).slice();
        var idx = currentSegments.findIndex(function (s) { return s.id === id; });
        if (idx === -1) return false;

        var oldSeg = currentSegments[idx];
        var updatedSeg = Object.assign({}, oldSeg, {
          styleOverride: Object.assign({}, oldSeg.styleOverride || {}, override || {})
        });

        currentSegments[idx] = updatedSeg;
        this.setState({ segments: currentSegments }, true);
        return true;
      },

      splitSegmentAt: function (id, playheadTime) {
        var currentSegments = (_state.segments || []).slice();
        var targetSeg = null;
        var targetIdx = -1;

        if (id) {
          targetIdx = currentSegments.findIndex(function (s) { return s.id === id; });
          if (targetIdx !== -1) targetSeg = currentSegments[targetIdx];
        }

        var video = typeof document !== 'undefined' ? document.getElementById('video-player-el') : null;
        var t = (playheadTime !== undefined && playheadTime !== null && !isNaN(playheadTime)) ? Number(playheadTime) : (video ? video.currentTime : null);

        if (!targetSeg && t !== null) {
          targetIdx = currentSegments.findIndex(function (s) { return t >= s.start && t <= s.end; });
          if (targetIdx !== -1) targetSeg = currentSegments[targetIdx];
        }

        if (!targetSeg) {
          if (_state.selectedSegmentId) {
            targetIdx = currentSegments.findIndex(function (s) { return s.id === _state.selectedSegmentId; });
            if (targetIdx !== -1) targetSeg = currentSegments[targetIdx];
          }
        }

        if (!targetSeg) return false;

        if (t === null || isNaN(t) || t <= targetSeg.start || t >= targetSeg.end) {
          t = Math.round(((targetSeg.start + targetSeg.end) / 2) * 1000) / 1000;
        }

        var seg = targetSeg;
        var words = seg.words || [];
        var words1 = [], words2 = [];

        if (words.length > 0) {
          words.forEach(function (w) {
            if (w.end <= t) {
              words1.push(w);
            } else if (w.start >= t) {
              words2.push(w);
            } else {
              var mid = (w.start + w.end) / 2;
              if (t >= mid) {
                words1.push(Object.assign({}, w, { end: t }));
              } else {
                words2.push(Object.assign({}, w, { start: t }));
              }
            }
          });
        }

        var seg1, seg2;
        if (words1.length > 0 && words2.length > 0) {
          var end1 = t;
          var start2 = t;
          seg1 = {
            id: seg.id + '_1',
            start: seg.start,
            end: end1,
            text: words1.map(function (w) { return w.text; }).join(' '),
            words: words1,
            styleOverride: seg.styleOverride ? JSON.parse(JSON.stringify(seg.styleOverride)) : undefined
          };
          seg2 = {
            id: 'seg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            start: start2,
            end: seg.end,
            text: words2.map(function (w) { return w.text; }).join(' '),
            words: words2,
            styleOverride: seg.styleOverride ? JSON.parse(JSON.stringify(seg.styleOverride)) : undefined
          };
        } else {
          var textParts = (seg.text || '').trim().split(/\s+/);
          var half = Math.max(1, Math.floor(textParts.length / 2));
          var text1 = textParts.slice(0, half).join(' ') || seg.text;
          var text2 = textParts.slice(half).join(' ') || seg.text;

          seg1 = {
            id: seg.id + '_1',
            start: seg.start,
            end: t,
            text: text1,
            words: synthesizeWordTimestampsForSegment(text1, seg.start, t),
            styleOverride: seg.styleOverride ? JSON.parse(JSON.stringify(seg.styleOverride)) : undefined
          };
          seg2 = {
            id: 'seg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            start: t,
            end: seg.end,
            text: text2,
            words: synthesizeWordTimestampsForSegment(text2, t, seg.end),
            styleOverride: seg.styleOverride ? JSON.parse(JSON.stringify(seg.styleOverride)) : undefined
          };
        }

        currentSegments.splice(targetIdx, 1, seg1, seg2);
        this.setState({
          segments: currentSegments,
          selectedSegmentId: seg1.id,
          selectedWordId: null
        }, true);

        return true;
      },

      updateSegmentBounds: function (id, newStart, newEnd, recordHistory) {
        if (!id) return false;
        var currentSegments = (_state.segments || []).slice();
        var idx = currentSegments.findIndex(function (s) { return s.id === id; });
        if (idx === -1) return false;

        var oldSeg = currentSegments[idx];
        var sStart = Math.max(0, Math.round(newStart * 1000) / 1000);
        var sEnd = Math.max(sStart + 0.1, Math.round(newEnd * 1000) / 1000);

        var oldDur = Math.max(0.05, oldSeg.end - oldSeg.start);
        var newDur = sEnd - sStart;

        var updatedWords = (oldSeg.words || []).map(function (w) {
          var relStart = (w.start - oldSeg.start) / oldDur;
          var relEnd = (w.end - oldSeg.start) / oldDur;
          var wStart = Math.max(sStart, Math.round((sStart + relStart * newDur) * 1000) / 1000);
          var wEnd = Math.min(sEnd, Math.max(wStart + 0.05, Math.round((sStart + relEnd * newDur) * 1000) / 1000));
          return Object.assign({}, w, { start: wStart, end: wEnd });
        });

        var updatedSeg = Object.assign({}, oldSeg, {
          start: sStart,
          end: sEnd,
          words: updatedWords
        });

        currentSegments[idx] = updatedSeg;
        this.setState({ segments: currentSegments }, recordHistory !== false);
        return true;
      },

      moveSegment: function (id, newStart, recordHistory) {
        if (!id) return false;
        var currentSegments = (_state.segments || []).slice();
        var idx = currentSegments.findIndex(function (s) { return s.id === id; });
        if (idx === -1) return false;

        var oldSeg = currentSegments[idx];
        var duration = oldSeg.end - oldSeg.start;
        var sStart = Math.max(0, Math.round(newStart * 1000) / 1000);
        var sEnd = Math.round((sStart + duration) * 1000) / 1000;
        var delta = sStart - oldSeg.start;

        var updatedWords = (oldSeg.words || []).map(function (w) {
          return Object.assign({}, w, {
            start: Math.max(0, Math.round((w.start + delta) * 1000) / 1000),
            end: Math.max(0.05, Math.round((w.end + delta) * 1000) / 1000)
          });
        });

        var updatedSeg = Object.assign({}, oldSeg, {
          start: sStart,
          end: sEnd,
          words: updatedWords
        });

        currentSegments[idx] = updatedSeg;
        this.setState({ segments: currentSegments }, recordHistory !== false);
        return true;
      },

      subscribe: function (fn) {
        if (typeof fn !== 'function') return function () {};
        if (_subscribers.indexOf(fn) === -1) {
          _subscribers.push(fn);
        }
        return function () {
          _subscribers = _subscribers.filter(function (s) { return s !== fn; });
        };
      },

      notify: function () {
        if (_isNotifying) {
          _notifyPending = true;
          return;
        }
        _isNotifying = true;
        do {
          _notifyPending = false;
          var currentSubscribers = _subscribers.slice();
          currentSubscribers.forEach(function (fn) {
            if (_subscribers.indexOf(fn) !== -1) {
              try {
                fn(CaptionStore.getState());
              } catch (e) {
                console.error('CaptionStore subscriber error:', e);
              }
            }
          });
        } while (_notifyPending);
        _isNotifying = false;
      },

      pushHistory: function () {
        var snapshot = JSON.parse(JSON.stringify(_state.segments || []));
        if (_state.historyIndex < _state.history.length - 1) {
          _state.history = _state.history.slice(0, _state.historyIndex + 1);
        }
        _state.history.push(snapshot);
        if (_state.history.length > 50) {
          _state.history.shift();
        }
        _state.historyIndex = _state.history.length - 1;
      },

      canUndo: function () {
        return _state.historyIndex > 0;
      },

      canRedo: function () {
        return _state.historyIndex >= 0 && _state.historyIndex < _state.history.length - 1;
      },

      undo: function () {
        if (!this.canUndo()) return false;
        _state.historyIndex--;
        var prevSnapshot = JSON.parse(JSON.stringify(_state.history[_state.historyIndex]));
        this.setState({ segments: prevSnapshot }, false);
        return true;
      },

      redo: function () {
        if (!this.canRedo()) return false;
        _state.historyIndex++;
        var nextSnapshot = JSON.parse(JSON.stringify(_state.history[_state.historyIndex]));
        this.setState({ segments: nextSnapshot }, false);
        return true;
      },

      setState: function (updates, recordHistory) {
        if (recordHistory === undefined) recordHistory = true;
        if (!updates || typeof updates !== 'object') return this.getState();

        var segmentsChanged = false;

        if (updates.segments !== undefined && Array.isArray(updates.segments)) {
          _state.segments = normalizeCaptionTimestamps(updates.segments);
          segmentsChanged = true;
        }

        if (updates.globalStyle !== undefined && typeof updates.globalStyle === 'object') {
          var mergedStyle = Object.assign({}, _state.globalStyle, updates.globalStyle);
          if (updates.globalStyle.gradientStops && Array.isArray(updates.globalStyle.gradientStops)) {
            mergedStyle.gradientStops = JSON.parse(JSON.stringify(updates.globalStyle.gradientStops));
          } else if (_state.globalStyle && _state.globalStyle.gradientStops) {
            mergedStyle.gradientStops = JSON.parse(JSON.stringify(_state.globalStyle.gradientStops));
          }
          _state.globalStyle = mergedStyle;
        }

        if (updates.transition !== undefined && typeof updates.transition === 'object') {
          _state.transition = Object.assign({}, _state.transition, updates.transition);
        }

        if (updates.selectedSegmentId !== undefined) {
          _state.selectedSegmentId = updates.selectedSegmentId;
        }

        if (updates.selectedWordId !== undefined) {
          _state.selectedWordId = updates.selectedWordId;
        }

        if (segmentsChanged && recordHistory) {
          this.pushHistory();
        }

        this.notify();
        this.syncLegacyState();

        return this.getState();
      },

      syncLegacyState: function () {
        if (typeof videoSubState !== 'undefined' && videoSubState) {
          videoSubState.segments = JSON.parse(JSON.stringify(_state.segments));
          if (_state.globalStyle) {
            videoSubState.fontSize = _state.globalStyle.fontSize;
            videoSubState.textColor = _state.globalStyle.solidColor;
            videoSubState.bgColor = _state.globalStyle.backgroundColor;
          }
          if (typeof segmentsToVTT === 'function') {
            videoSubState.vttText = segmentsToVTT(_state.segments);
          }
          if (typeof segmentsToSRT === 'function') {
            videoSubState.srtText = segmentsToSRT(_state.segments);
          }
        }
      }
    };

    CaptionStore.subscribe(function () {
      if (typeof renderProCaptionsList === 'function') renderProCaptionsList();
      if (typeof updateVideoSubtitleOverlay === 'function') updateVideoSubtitleOverlay();
      if (typeof renderProTimeline === 'function') renderProTimeline();
      if (typeof applyGlobalStyleToOverlay === 'function') applyGlobalStyleToOverlay();
    });

    if (typeof window !== 'undefined') {
      window.CaptionStore = CaptionStore;
      window.synthesizeWordTimestampsForSegment = synthesizeWordTimestampsForSegment;
      window.normalizeCaptionTimestamps = normalizeCaptionTimestamps;
      window.renderProCaptionsList = function () { if (typeof renderProCaptionsList === 'function') return renderProCaptionsList.apply(this, arguments); };
      window.renderProTimeline = function () { if (typeof renderProTimeline === 'function') return renderProTimeline.apply(this, arguments); };
      window.splitSegmentAtIndex = function () { if (typeof splitSegmentAtIndex === 'function') return splitSegmentAtIndex.apply(this, arguments); };
      window.mergeSegmentWithNext = function () { if (typeof mergeSegmentWithNext === 'function') return mergeSegmentWithNext.apply(this, arguments); };
      window.deleteSegmentAtIndex = function () { if (typeof deleteSegmentAtIndex === 'function') return deleteSegmentAtIndex.apply(this, arguments); };
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.CaptionStore = CaptionStore;
      globalThis.synthesizeWordTimestampsForSegment = synthesizeWordTimestampsForSegment;
      globalThis.normalizeCaptionTimestamps = normalizeCaptionTimestamps;
      globalThis.renderProTimeline = function () { if (typeof renderProTimeline === 'function') return renderProTimeline.apply(this, arguments); };
      globalThis.renderProCaptionsList = function () { if (typeof renderProCaptionsList === 'function') return renderProCaptionsList.apply(this, arguments); };
      globalThis.splitSegmentAtIndex = function () { if (typeof splitSegmentAtIndex === 'function') return splitSegmentAtIndex.apply(this, arguments); };
      globalThis.mergeSegmentWithNext = function () { if (typeof mergeSegmentWithNext === 'function') return mergeSegmentWithNext.apply(this, arguments); };
      globalThis.deleteSegmentAtIndex = function () { if (typeof deleteSegmentAtIndex === 'function') return deleteSegmentAtIndex.apply(this, arguments); };
    }

    var videoSubState = {
      segments: [],
      vttText: '',
      srtText: '',
      burnCaptions: true,
      currentSegmentText: '',
      position: 'bottom',
      fontSize: 22,
      textColor: '#FFFF00',
      bgColor: 'rgba(0,0,0,0.85)'
    };

    if (typeof window !== 'undefined') {
      window.videoSubState = videoSubState;
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.videoSubState = videoSubState;
    }

    // Client-side Studio Web Audio Engine: High-Pass Filter (80Hz) + Dynamics Compressor + Hardware Gain + 200ms Soft Silence Pad
    async function extractAudioBlobFromVideo(videoFile, onProgress) {
      onProgress(10);
      var arrayBuffer = await videoFile.arrayBuffer();
      onProgress(25);

      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      onProgress(45);

      // Fast peak estimation for hardware GainNode scaling
      var rawChannel = audioBuffer.getChannelData(0);
      var maxPeak = 0;
      var step = Math.max(1, Math.floor(rawChannel.length / 50000));
      for (var p = 0; p < rawChannel.length; p += step) {
        var absVal = Math.abs(rawChannel[p]);
        if (absVal > maxPeak) maxPeak = absVal;
      }
      var normGain = (maxPeak > 0 && maxPeak < 0.85) ? Math.min(0.89 / maxPeak, 4.0) : 1.0;
      onProgress(60);

      // 16kHz Mono Offline Context with 200ms lead-in padding to prevent 0.0s word clipping
      var targetSampleRate = 16000;
      var padSec = 0.2; // 200ms padding
      var totalSamples = Math.ceil((audioBuffer.duration + padSec * 2) * targetSampleRate);
      var offlineCtx = new OfflineAudioContext(1, totalSamples, targetSampleRate);

      // 1. Audio Source
      var source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      // 2. High-Pass Biquad Filter (Cuts sub-bass mic rumble & AC hum below 80Hz)
      var highPass = offlineCtx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 80;

      // 3. Dynamics Compressor (Normalizes whispers and loud spoken words)
      var compressor = offlineCtx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // 4. Gain Normalizer Node
      var gainNode = offlineCtx.createGain();
      gainNode.gain.value = normGain;

      // Connect Signal Chain: Source -> HighPass -> Compressor -> Gain -> Output
      source.connect(highPass);
      highPass.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(offlineCtx.destination);

      source.start(padSec);

      var renderedBuffer = await offlineCtx.startRendering();
      onProgress(85);

      // Encode AudioBuffer to 16-bit PCM WAV Blob
      var wavBlob = audioBufferToWavBlob(renderedBuffer);
      onProgress(100);
      return wavBlob;
    }

    function audioBufferToWavBlob(buffer) {
      var numChannels = buffer.numberOfChannels;
      var sampleRate = buffer.sampleRate;
      var format = 1; // PCM
      var bitDepth = 16;
      var samples = buffer.getChannelData(0);
      var bufferLength = samples.length * 2;
      var dataLength = bufferLength;
      var wavBuffer = new ArrayBuffer(44 + dataLength);
      var view = new DataView(wavBuffer);

      function writeString(offset, string) {
        for (var i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      }

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataLength, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, format, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
      view.setUint16(32, numChannels * (bitDepth / 8), true);
      view.setUint16(34, bitDepth, true);
      writeString(36, 'data');
      view.setUint32(40, dataLength, true);

      var offset = 44;
      for (var i = 0; i < samples.length; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }

      return new Blob([wavBuffer], { type: 'audio/wav' });
    }

    function formatVttTimestamp(seconds) {
      var h = Math.floor(seconds / 3600);
      var m = Math.floor((seconds % 3600) / 60);
      var s = (seconds % 60).toFixed(3);
      var hStr = String(h).padStart(2, '0');
      var mStr = String(m).padStart(2, '0');
      var parts = s.split('.');
      var secStr = String(parts[0]).padStart(2, '0');
      var msStr = String(parts[1] || '000').padEnd(3, '0').slice(0, 3);
      return hStr + ':' + mStr + ':' + secStr + '.' + msStr;
    }

    function formatSrtTimestamp(seconds) {
      var h = Math.floor(seconds / 3600);
      var m = Math.floor((seconds % 3600) / 60);
      var s = (seconds % 60).toFixed(3);
      var hStr = String(h).padStart(2, '0');
      var mStr = String(m).padStart(2, '0');
      var parts = s.split('.');
      var secStr = String(parts[0]).padStart(2, '0');
      var msStr = String(parts[1] || '000').padEnd(3, '0').slice(0, 3);
      return hStr + ':' + mStr + ':' + secStr + ',' + msStr;
    }

    function segmentsToVTT(segments) {
      var out = 'WEBVTT\n\n';
      segments.forEach(function (seg) {
        out += formatVttTimestamp(seg.start) + ' --> ' + formatVttTimestamp(seg.end) + '\n';
        out += seg.text.trim() + '\n\n';
      });
      return out;
    }

    function segmentsToSRT(segments) {
      var out = '';
      segments.forEach(function (seg, idx) {
        out += (idx + 1) + '\n';
        out += formatSrtTimestamp(seg.start) + ' --> ' + formatSrtTimestamp(seg.end) + '\n';
        out += seg.text.trim() + '\n\n';
      });
      return out;
    }

    function urduToRoman(text) {
      if (!text || !/[\u0600-\u06FF]/.test(text)) return text;
      
      var urduMap = {
        'آ': 'aa', 'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't', 'ث': 's',
        'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ڈ': 'd', 'ذ': 'z',
        'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's',
        'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
        'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n', 'و': 'o',
        'ہ': 'h', 'ھ': 'h', 'ء': '', 'ی': 'i', 'ے': 'e', 'َ': 'a', 'ُ': 'u', 'ِ': 'i'
      };

      var res = '';
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        res += urduMap[ch] !== undefined ? urduMap[ch] : ch;
      }
      return res.replace(/\s+/g, ' ').trim();
    }

    function devanagariToRoman(text) {
      if (!text) return text;
      
      // Convert any Urdu/Perso-Arabic characters to Roman Hinglish
      if (/[\u0600-\u06FF]/.test(text)) {
        text = urduToRoman(text);
      }

      // If text is already in Roman script without Devanagari characters, return as is
      if (!/[\u0900-\u097F]/.test(text)) return text;

      var vowels_clean = {
        'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
        'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au'
      };

      var matras = {
        'ा': 'aa', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
        'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h'
      };

      var consonants = {
        'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
        'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
        'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
        'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
        'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
        'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h'
      };

      var nukta_map = {
        'क': 'q', 'ख': 'kh', 'ग': 'g', 'ज': 'z', 'ड': 'r', 'ढ': 'rh', 'फ': 'f'
      };

      var words = text.split(' ');
      var out_words = [];
      var wordOrigins = [];

      for (var wIdx = 0; wIdx < words.length; wIdx++) {
        var word = words[wIdx];

        // English/non-Devanagari words are preserved EXACTLY as-is (never modified)
        if (!/[\u0900-\u097F]/.test(word)) {
          out_words.push(word);
          wordOrigins.push(false);
          continue;
        }
        wordOrigins.push(true);

        var prefix = "";
        var suffix = "";
        var w = word;

        while (w && !(w.charCodeAt(0) >= 0x0900 && w.charCodeAt(0) <= 0x097F)) {
          prefix += w[0];
          w = w.slice(1);
        }
        while (w && !(w.charCodeAt(w.length - 1) >= 0x0900 && w.charCodeAt(w.length - 1) <= 0x097F)) {
          suffix = w[w.length - 1] + suffix;
          w = w.slice(0, -1);
        }

        if (!w) {
          out_words.append ? out_words.push(prefix + suffix) : out_words.push(prefix + suffix);
          continue;
        }

        var chars = Array.from(w);
        var i = 0;
        var n = chars.length;
        var res = [];

        while (i < n) {
          var c = chars[i];
          var cons_val = null;

          if (consonants[c] && (i + 1 < n) && chars[i + 1] === '़') {
            cons_val = nukta_map[c] || consonants[c];
            i += 2;
          } else if (consonants[c]) {
            cons_val = consonants[c];
            i += 1;
          }

          if (cons_val !== null) {
            var next_c = i < n ? chars[i] : null;
            if (next_c && matras[next_c]) {
              res.push(cons_val + matras[next_c]);
              i += 1;
            } else if (next_c === '्') {
              res.push(cons_val);
              i += 1;
            } else {
              if (i >= n) {
                if (chars.length === 1 || (chars.length === 2 && chars[1] === '़')) {
                  res.push(cons_val + 'a');
                } else {
                  res.push(cons_val);
                }
              } else {
                res.push(cons_val + 'a');
              }
            }
          } else if (vowels_clean[c]) {
            res.push(vowels_clean[c]);
            i += 1;
          } else if (matras[c]) {
            res.push(matras[c]);
            i += 1;
          } else {
            res.push(c === '।' ? '.' : c);
            i += 1;
          }
        }

        var wordStr = res.join('');
        // Clean double consonant clusters, diphthongs & Hindi Schwa syncope (e.g. aapake -> aapke, karana -> karna)
        wordStr = wordStr.replace(/chch/g, 'ch')
                         .replace(/shsh/g, 'sh')
                         .replace(/aahie/g, 'ahiye')
                         .replace(/ahie/g, 'ahiye')
                         .replace(/aake$/g, 'ake')
                         .replace(/aaka$/g, 'aka')
                         .replace(/aaki$/g, 'aki')
                         .replace(/apake/g, 'apke')
                         .replace(/apaka/g, 'apka')
                         .replace(/apaki/g, 'apki')
                         .replace(/aapake/g, 'aapke')
                         .replace(/aapaka/g, 'aapka')
                         .replace(/aapaki/g, 'aapki')
                         .replace(/karana/g, 'karna')
                         .replace(/karane/g, 'karne')
                         .replace(/karani/g, 'karni')
                         .replace(/karata/g, 'karta')
                         .replace(/karate/g, 'karte')
                         .replace(/karati/g, 'karti')
                         .replace(/sakata/g, 'sakta')
                         .replace(/sakate/g, 'sakte')
                         .replace(/sakati/g, 'sakti')
                         .replace(/aa$/, 'a');

        out_words.push(prefix + wordStr + suffix);
      }

      // Comprehensive Hinglish phonetic correction dictionary
            var dictOverrides = {
'aapake':'aapke',
'aapaka':'aapka',
'aapaki':'aapki',
'aapako':'aapko',
'aapane':'aapne',
'humara':'humara',
'humare':'humare',
'humari':'humari',
'humko':'humko',
'humein':'humein',
'tumhara':'tumhara',
'tumhare':'tumhare',
'tumhari':'tumhari',
'tumko':'tumko',
'tumhein':'tumhein',
'apna':'apna',
'apne':'apne',
'apni':'apni',
'mera':'mera',
'mere':'mere',
'meri':'meri',
'mujhe':'mujhe',
'mujhko':'mujhko',
'mujhse':'mujhse',
'tera':'tera',
'tere':'tere',
'teri':'teri',
'tujhe':'tujhe',
'tujhko':'tujhko',
'tujhse':'tujhse',
'iska':'iska',
'iske':'iske',
'iski':'iski',
'isko':'isko',
'ismein':'ismein',
'isse':'isse',
'uska':'uska',
'uske':'uske',
'uski':'uski',
'usko':'usko',
'usmein':'usmein',
'usse':'usse',
'jiska':'jiska',
'jiske':'jiske',
'jiski':'jiski',
'jisko':'jisko',
'jismein':'jismein',
'jisse':'jisse',
'kiska':'kiska',
'kiske':'kiske',
'kiski':'kiski',
'kisko':'kisko',
'kismein':'kismein',
'kisse':'kisse',
'karana':'karna',
'karane':'karne',
'karani':'karni',
'karata':'karta',
'karate':'karte',
'karati':'karti',
'karunga':'karunga',
'karungi':'karungi',
'karoge':'karoge',
'karenge':'karenge',
'karke':'karke',
'karo':'karo',
'sikhana':'seekhna',
'sikhane':'seekhne',
'sikhaney':'seekhne',
'sikha':'seekha',
'seekhenge':'seekhenge',
'seekho':'seekho',
'lutane':'seekhna',
'lutna':'seekhna',
'dekhana':'dekhna',
'dekhane':'dekhne',
'dekha':'dekha',
'dekhe':'dekhe',
'dekho':'dekho',
'dekhenge':'dekhenge',
'dekhte':'dekhte',
'bolanaa':'bolna',
'bolane':'bolne',
'bola':'bola',
'bole':'bole',
'bolo':'bolo',
'bolenge':'bolenge',
'bolte':'bolte',
'sunanaa':'sunna',
'sunane':'sunne',
'suna':'suna',
'sune':'sune',
'suno':'suno',
'sunenge':'sunenge',
'sunte':'sunte',
'samajhana':'samjhna',
'samajhane':'samjhne',
'samjha':'samjha',
'samjhe':'samjhe',
'samjho':'samjho',
'samjhenge':'samjhenge',
'padhanaa':'padhna',
'padhane':'padhne',
'padha':'padha',
'padhe':'padhe',
'padho':'padho',
'padhenge':'padhenge',
'likhana':'likhna',
'likhane':'likhne',
'likha':'likha',
'likhe':'likhe',
'likho':'likho',
'likhenge':'likhenge',
'aanaa':'aana',
'aane':'aane',
'aaya':'aaya',
'aaye':'aaye',
'aao':'aao',
'aayenge':'aayenge',
'aate':'aate',
'jaanaa':'jaana',
'jaane':'jaane',
'gaya':'gaya',
'gaye':'gaye',
'gayi':'gayi',
'jaao':'jao',
'jaayenge':'jaayenge',
'jaate':'jaate',
'laanaa':'laana',
'laane':'laane',
'laaya':'laaya',
'laaye':'laaye',
'laao':'laao',
'laayenge':'laayenge',
'dena':'dena',
'dene':'dene',
'diya':'diya',
'diye':'diye',
'de':'de',
'deo':'deo',
'dijiye':'dijiye',
'dete':'dete',
'lena':'lena',
'lene':'lene',
'liya':'liya',
'liye':'liye',
'le':'le',
'leo':'leo',
'lijiye':'lijiye',
'lete':'lete',
'banana':'banana',
'banane':'banane',
'banaya':'banaya',
'banaye':'banaye',
'banao':'banao',
'banega':'banega',
'bhejna':'bhejna',
'bhejne':'bhejne',
'bheja':'bheja',
'bheje':'bheje',
'bhejo':'bhejo',
'milna':'milna',
'milne':'milne',
'mila':'mila',
'mile':'mile',
'milo':'milo',
'milega':'milega',
'milte':'milte',
'sochna':'sochna',
'sochne':'sochne',
'socha':'socha',
'soche':'soche',
'socho':'socho',
'sochte':'sochte',
'khaanaa':'khana',
'khane':'khane',
'khaya':'khaya',
'khaye':'khaye',
'khao':'khao',
'piinaa':'peena',
'peene':'peene',
'piya':'piya',
'piye':'piye',
'piyo':'piyo',
'sonaa':'sona',
'sone':'sone',
'soya':'soya',
'soye':'soye',
'so':'so',
'jagnaa':'jagna',
'jagne':'jagne',
'jaga':'jaga',
'jage':'jage',
'jago':'jago',
'chalna':'chalna',
'chalne':'chalne',
'chala':'chala',
'chale':'chale',
'chalo':'chalo',
'chalega':'chalega',
'uthana':'uthna',
'uthne':'uthne',
'utha':'utha',
'uthe':'uthe',
'utho':'utho',
'baithana':'baithna',
'baithne':'baithne',
'baitha':'baitha',
'baithe':'baithe',
'baitho':'baitho',
'hasnaa':'hasna',
'hasne':'hasne',
'hansa':'hansa',
'hanse':'hanse',
'hanso':'hanso',
'ronaa':'rona',
'rone':'rone',
'roya':'roya',
'roye':'roye',
'ro':'ro',
'yadi':'agar',
'agar':'agar',
'magar':'magar',
'lekin':'lekin',
'par':'par',
'chaahie':'chahiye',
'chaahieh':'chahiye',
'chahie':'chahiye',
'chahieh':'chahiye',
'kyunki':'kyunki',
'kyu':'kyun',
'kyun':'kyun',
'taki':'taki',
'bohot':'bohot',
'bohut':'bohot',
'bahut':'bohot',
'bilkul':'bilkul',
'shayad':'shayad',
'hamesha':'hamesha',
'kabhi':'kabhi',
'waisa':'waisa',
'waise':'waise',
'waisi':'waisi',
'jaisa':'jaisa',
'jaise':'jaise',
'jaisi':'jaisi',
'kaisa':'kaisa',
'kaise':'kaise',
'kaisi':'kaisi',
'utna':'utna',
'utne':'utne',
'utni':'utni',
'jitna':'jitna',
'jitne':'jitne',
'jitni':'jitni',
'kitna':'kitna',
'kitne':'kitne',
'kitni':'kitni',
'thoda':'thoda',
'thode':'thode',
'thodi':'thodi',
'bada':'bada',
'bade':'bade',
'badi':'badi',
'chhota':'chhota',
'chhote':'chhote',
'chhoti':'chhoti',
'achha':'achha',
'achhe':'achhe',
'achhi':'achhi',
'sach':'sach',
'jhooth':'jhooth',
'phir':'phir',
'wapas':'wapas',
'dhyan':'dhyan',
'zaroori':'zaroori',
'zaroor':'zaroor',
'yaad':'yaad',
'pata':'pata',
'editing':'editing',
'aditing':'editing',
'edting':'editing',
'screen':'screen',
'skreen':'screen',
'skrin':'screen',
'recording':'recording',
'rikording':'recording',
'rikarding':'recording',
'microphone':'microphone',
'mikrofon':'microphone',
'mic':'mic',
'maik':'mic',
'camera':'camera',
'kaimra':'camera',
'kaimera':'camera',
'software':'software',
'sophktvear':'software',
'sophtver':'software',
'application':'application',
'eplikeshn':'application',
'app':'app',
'aip':'app',
'eip':'app',
'website':'website',
'vebasait':'website',
'vebsait':'website',
'link':'link',
'linck':'link',
'linhk':'link',
'profile':'profile',
'prophail':'profile',
'prophile':'profile',
'bio':'bio',
'bayo':'bio',
'description':'description',
'diskripshn':'description',
'diskripshan':'description',
'share':'share',
'shaeyar':'share',
'sheyar':'share',
'workflow':'workflow',
'varkphlo':'workflow',
'varkphlou':'workflow',
'process':'process',
'proses':'process',
'strategy':'strategy',
'strateji':'strategy',
'tutorial':'tutorial',
'tutoryal':'tutorial',
'tutoriyala':'tutorial',
'beginner':'beginner',
'bijinar':'beginner',
'advanced':'advanced',
'edvansd':'advanced',
'masterclass':'masterclass',
'masterklas':'masterclass',
'creator':'creator',
'kriyetar':'creator',
'kreyatar':'creator',
'influencer':'influencer',
'inphluensar':'influencer',
'vlog':'vlog',
'vlaog':'vlog',
'viral':'viral',
'vairal':'viral',
'shorts':'shorts',
'short':'short',
'reels':'reels',
'rils':'reels',
'rilsa':'reels',
'feed':'feed',
'phid':'feed',
'explore':'explore',
'eksplor':'explore',
'page':'page',
'pej':'page',
'analytics':'analytics',
'enalitiks':'analytics',
'monetization':'monetization',
'monetaijeshn':'monetization',
'sponsor':'sponsor',
'sponsar':'sponsor',
'collaboration':'collaboration',
'kolabreshn':'collaboration',
'brand':'brand',
'braand':'brand',
'marketing':'marketing',
'graphic':'graphic',
'grephik':'graphic',
'thumbnail':'thumbnail',
'thambnel':'thumbnail',
'thamnel':'thumbnail',
'preset':'preset',
'priset':'preset',
'transition':'transition',
'tranjishn':'transition',
'tranjishan':'transition',
'overlay':'overlay',
'overle':'overlay',
'render':'render',
'rendar':'render',
'export':'export',
'eksport':'export',
'resolution':'resolution',
'rezolushn':'resolution',
'fps':'fps',
'phps':'fps',
'frame':'frame',
'phrem':'frame',
'clip':'clip',
'klip':'clip',
'timeline':'timeline',
'taimlain':'timeline',
'keyframe':'keyframe',
'kiphrem':'keyframe',
'layer':'layer',
'leyar':'layer',
'mask':'mask',
'effect':'effect',
'ephekt':'effect',
'iphekt':'effect',
'color':'color',
'kalar':'color',
'filter':'filter',
'philtar':'filter',
'sound':'sound',
'saund':'sound',
'track':'track',
'traek':'track',
'voiceover':'voiceover',
'voisovar':'voiceover',
'script':'script',
'skript':'script',
'scene':'scene',
'sin':'scene',
'take':'take',
'tek':'take',
'shot':'shot',
'cut':'cut',
'kat':'cut',
'trim':'trim',
'split':'split',
'loop':'loop',
'lup':'loop',
'speed':'speed',
'spid':'speed',
'slowmo':'slowmo',
'slomo':'slowmo',
'timelapse':'timelapse',
'taimleps':'timelapse',
'motion':'motion',
'moshn':'motion',
'vfx':'vfx',
'vphx':'vfx',
'sfx':'sfx',
'sphx':'sfx',
'zoom':'zoom',
'jum':'zoom',
'crop':'crop',
'kraop':'crop',
'rotate':'rotate',
'rotet':'rotate',
'scale':'scale',
'skel':'scale',
'opacity':'opacity',
'opesiti':'opacity',
'font':'font',
'phont':'font',
'text':'text',
'tekst':'text',
'style':'style',
'stail':'style',
'template':'template',
'templet':'template',
'asset':'asset',
'eset':'asset',
'element':'element',
'eliment':'element',
'design':'design',
'dizain':'design',
'folder':'folder',
'pholder':'folder',
'file':'file',
'phail':'file',
'format':'format',
'phormet':'format',
'save':'save',
'sev':'save',
'import':'import',
'version':'version',
'varzhn':'version',
'update':'update',
'updet':'update',
'bug':'bug',
'bag':'bug',
'feature':'feature',
'phichar':'feature',
'tool':'tool',
'tul':'tool',
'setting':'setting',
'seting':'setting',
'option':'option',
'opshn':'option',
'custom':'custom',
'kastam':'custom',
'default':'default',
'dipholt':'default',
'manual':'manual',
'menual':'manual',
'auto':'auto',
'oto':'auto',
'system':'system',
'sistam':'system',
'device':'device',
'divais':'device',
'storage':'storage',
'storij':'storage',
'memory':'memory',
'memori':'memory',
'ram':'ram',
'gpu':'gpu',
'cpu':'cpu',
'processor':'processor',
'prosesar':'processor',
'engine':'engine',
'enjin':'engine',
'performance':'performance',
'parphormens':'performance',
'quality':'quality',
'kvaliti':'quality',
'hd':'hd',
'haidiphinisn':'hd',
'4k':'4k',
'phor-ke':'4k',
'high':'high',
'haai':'high',
'low':'low',
'lo':'low',
'medium':'medium',
'midiyam':'medium',
'best':'best',
'top':'top',
'pro':'pro',
'max':'max',
'maks':'max',
'ultra':'ultra',
'ultrra':'ultra',
'super':'super',
'supar':'super',
'fast':'fast',
'phast':'fast',
'easy':'easy',
'iji':'easy',
'simple':'simple',
'simpl':'simple',
'quick':'quick',
'kvik':'quick',
'smooth':'smooth',
'smuth':'smooth',
'clean':'clean',
'klin':'clean',
'perfect':'perfect',
'parphekt':'perfect',
'awesome':'awesome',
'osam':'awesome',
'amazing':'amazing',
'amezing':'amazing',
'incredible':'incredible',
'inkredibl':'incredible',
'crazy':'crazy',
'krezi':'crazy',
'insane':'insane',
'insen':'insane',
'cool':'cool',
'kul':'cool',
'nice':'nice',
'nais':'nice',
'great':'great',
'gret':'great',
'good':'good',
'gud':'good',
'bad':'bad',
'baed':'bad',
'wrong':'wrong',
'rong':'wrong',
'right':'right',
'rait':'right',
'true':'true',
'tru':'true',
'false':'false',
'phalss':'false',
'yes':'yes',
'no':'no',
'okay':'okay',
'oke':'okay',
'ok':'ok',
'fine':'fine',
'phain':'fine',
'sure':'sure',
'shyor':'sure',
'doubt':'doubt',
'daut':'doubt',
'question':'question',
'kveschn':'question',
'answer':'answer',
'ansar':'answer',
'problem':'problem',
'problam':'problem',
'solution':'solution',
'solushn':'solution',
'tip':'tip',
'trick':'trick',
'trik':'trick',
'hack':'hack',
'haek':'hack',
'idea':'idea',
'aidiya':'idea',
'concept':'concept',
'konsept':'concept',
'logic':'logic',
'lojik':'logic',
'reason':'reason',
'rizan':'reason',
'fact':'fact',
'phaekt':'fact',
'example':'example',
'egzampl':'example',
'demo':'demo',
'test':'test',
'review':'review',
'rivyu':'review',
'result':'result',
'rizalt':'result',
'output':'output',
'autput':'output',
'input':'input',
'feedback':'feedback',
'phidbaek':'feedback',
'response':'response',
'rispons':'response',
'reply':'reply',
'riplai':'reply',
'bro':'bro',
'brou':'bro',
'dude':'dude',
'dud':'dude',
'dyud':'dude',
'vibe':'vibe',
'vaib':'vibe',
'vibes':'vibes',
'vaibs':'vibes',
'cringe':'cringe',
'krinj':'cringe',
'flex':'flex',
'phleks':'flex',
'hype':'hype',
'haip':'hype',
'ghost':'ghost',
'gost':'ghost',
'slay':'slay',
'sles':'slay',
'sus':'sus',
'sas':'sus',
'cap':'cap',
'kaep':'cap',
'nocap':'nocap',
'nokaep':'nocap',
'toxic':'toxic',
'toksik':'toxic',
'savage':'savage',
'sevej':'savage',
'literal':'literal',
'litral':'literal',
'literally':'literally',
'litrali':'literally',
'basically':'basically',
'besikali':'basically',
'actually':'actually',
'akchuali':'actually',
'akchuli':'actually',
'obviously':'obviously',
'obviyali':'obviously',
'definitely':'definitely',
'dephinitli':'definitely',
'honestly':'honestly',
'honestli':'honestly',
'seriously':'seriously',
'siriyasli':'seriously',
'random':'random',
'rendam':'random',
'weird':'weird',
'viyard':'weird',
'legend':'legend',
'lijennd':'legend',
'legendary':'legendary',
'lijenndari':'legendary',
'goat':'goat',
'got':'goat',
'boss':'boss',
'bos':'boss',
'guy':'guy',
'gai':'guy',
'guys':'guys',
'gaiz':'guys',
'game':'game',
'gem':'game',
'gamer':'gamer',
'gemar':'gamer',
'gameplay':'gameplay',
'gemplay':'gameplay',
'stream':'stream',
'strim':'stream',
'streamer':'streamer',
'strimar':'streamer',
'live':'live',
'laiv':'live',
'lobby':'lobby',
'lobi':'lobby',
'match':'match',
'maech':'match',
'player':'player',
'pleyar':'player',
'headshot':'headshot',
'hedshot':'headshot',
'kill':'kill',
'kil':'kill',
'clutch':'clutch',
'klach':'clutch',
'noob':'noob',
'nub':'noob',
'lag':'lag',
'laeg':'lag',
'ping':'ping',
'server':'server',
'sarvar':'server',
'patch':'patch',
'paech':'patch',
'skin':'skin',
'rank':'rank',
'raenk':'rank',
'level':'level',
'leval':'level',
'quest':'quest',
'kvest':'quest',
'mission':'mission',
'mishn':'mission',
'controller':'controller',
'kontrolar':'controller',
'console':'console',
'konsol':'console',
'pc':'pc',
'pisi':'pc',
'office':'office',
'ophis':'office',
'job':'job',
'career':'career',
'kariyar':'career',
'salary':'salary',
'selari':'salary',
'money':'money',
'mani':'money',
'client':'client',
'klaint':'client',
'meeting':'meeting',
'miting':'meeting',
'deadline':'deadline',
'dedlain':'deadline',
'presentation':'presentation',
'prajenteshn':'presentation',
'interview':'interview',
'intarvyu':'interview',
'resume':'resume',
'rizyum':'resume',
'skill':'skill',
'skil':'skill',
'skills':'skills',
'skils':'skills',
'growth':'growth',
'groth':'growth',
'profit':'profit',
'prophit':'profit',
'investment':'investment',
'finance':'finance',
'phainens':'finance',
'crypto':'crypto',
'kripto':'crypto',
'trading':'trading',
'treding':'trading',
'market':'market',
'startup':'startup',
'startap':'startup',
'startups':'startups',
'startaps':'startups',
'entrepreneur':'entrepreneur',
'entraprenyur':'entrepreneur',
'agency':'agency',
'ejensi':'agency',
'freelance':'freelance',
'phrilans':'freelance',
'remote':'remote',
'rimot':'remote',
'work':'work',
'vark':'work',
'target':'target',
'taarget':'target',
'goals':'goals',
'gols':'goals',
'focus':'focus',
'phokas':'focus',
'mindset':'mindset',
'maindset':'mindset',
'discipline':'discipline',
'disiplin':'discipline',
'gym':'gym',
'jim':'gym',
'workout':'workout',
'varkaut':'workout',
'fitness':'fitness',
'phitnes':'fitness',
'diet':'diet',
'daait':'diet',
'protein':'protein',
'protin':'protein',
'health':'health',
'helth':'health',
'travel':'travel',
'treval':'travel',
'trip':'trip',
'vacation':'vacation',
'vekeshn':'vacation',
'flight':'flight',
'phlait':'flight',
'hotel':'hotel',
'food':'food',
'phud':'food',
'cafe':'cafe',
'kaephe':'cafe',
'coffee':'coffee',
'kophi':'coffee',
'party':'party',
'parti':'party',
'outfit':'outfit',
'autphit':'outfit',
'fashion':'fashion',
'phaeshn':'fashion',
'shopping':'shopping',
'shoping':'shopping',
'weekend':'weekend',
'vikend':'weekend',
'math':'math',
'maeth':'math',
'science':'science',
'sains':'science',
'physics':'physics',
'phijiks':'physics',
'coding':'coding',
'koding':'coding',
'developer':'developer',
'divelapar':'developer',
'engineer':'engineer',
'enjiniyar':'engineer',
'AI':'AI',
'aiai':'AI',
'model':'model',
'modl':'model',
'prompt':'prompt',
'database':'database',
'databes':'database',
'api':'api',
'eapi':'api',
'code':'code',
'kod':'code',
'python':'python',
'paithan':'python',
'javascript':'javascript',
'javaskript':'javascript',
'react':'react',
'riyakt':'react',
'cloud':'cloud',
'klaud':'cloud'
};

      // Per-word dictionary lookup (only for Devanagari-origin words, NEVER English)
      for (var dIdx = 0; dIdx < out_words.length; dIdx++) {
        if (!wordOrigins[dIdx]) continue;

        var rawW = out_words[dIdx];
        var lead = '';
        var trail = '';

        var leadM = rawW.match(/^([^a-zA-Z0-9]+)/);
        if (leadM) {
          lead = leadM[1];
          rawW = rawW.slice(lead.length);
        }

        var trailM = rawW.match(/([^a-zA-Z0-9]+)$/);
        if (trailM) {
          trail = trailM[1];
          rawW = rawW.slice(0, -trail.length);
        }

        var lookupKey = rawW.toLowerCase();
        if (dictOverrides[lookupKey]) {
          var rep = dictOverrides[lookupKey];
          if (rawW[0] && rawW[0] === rawW[0].toUpperCase()) {
            rep = rep.charAt(0).toUpperCase() + rep.slice(1);
          }
          out_words[dIdx] = lead + rep + trail;
        }
      }

      return out_words.join(' ');
    }

    function splitSegmentsIntoShortCaptions(segments, maxWords) {
      if (!segments || !segments.length) return [];
      maxWords = maxWords || 7;

      var result = [];

      segments.forEach(function (seg) {
        var text = (seg.text || '').trim();
        if (!text) return;

        var totalDuration = seg.end - seg.start;
        if (totalDuration <= 0) return;

        // Split text by sentence punctuation (. ! ? । \n) using safe regex
        var rawParts = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
        var subUnits = [];

        rawParts.forEach(function (part) {
          part = part.trim();
          if (!part) return;

          var words = part.split(/\s+/);
          if (words.length <= maxWords) {
            subUnits.push(part);
          } else {
            // Split long sentence into maxWords word chunks
            for (var w = 0; w < words.length; w += maxWords) {
              subUnits.push(words.slice(w, w + maxWords).join(' '));
            }
          }
        });

        if (subUnits.length <= 1) {
          result.push({
            id: seg.id,
            start: seg.start,
            end: seg.end,
            text: text
          });
          return;
        }

        // Calculate total character count of all subUnits
        var totalChars = subUnits.reduce(function (sum, u) { return sum + u.length; }, 0);
        if (totalChars <= 0) {
          result.push(seg);
          return;
        }

        var runningStart = seg.start;
        subUnits.forEach(function (unit, idx) {
          var unitDuration = totalDuration * (unit.length / totalChars);
          var unitEnd = (idx === subUnits.length - 1) ? seg.end : (runningStart + unitDuration);

          result.push({
            id: (seg.id || 0) + '_' + idx,
            start: Math.round(runningStart * 100) / 100,
            end: Math.round(unitEnd * 100) / 100,
            text: unit
          });

          runningStart = unitEnd;
        });
      });

      return result;
    }

    function groupWordsIntoSubtitles(words, maxWords, maxGap) {
      if (!words || !words.length) return null;
      maxWords = maxWords || 6;
      maxGap = maxGap || 0.5;

      var captions = [];
      var currGroup = [];

      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (!currGroup.length) {
          currGroup.push(w);
          continue;
        }

        var prevW = currGroup[currGroup.length - 1];
        var gap = w.start - prevW.end;
        var hasPunct = /[.!?।\n,]/.test(prevW.word || prevW.text || '');

        if (currGroup.length >= maxWords || gap > maxGap || hasPunct) {
          var cText = currGroup.map(function(item) { return item.word || item.text || ''; }).join(' ').trim();
          if (cText) {
            var formattedWords = currGroup.map(function(item, wIdx) {
              return {
                id: 'w_' + captions.length + '_' + wIdx,
                text: (item.word || item.text || '').trim(),
                start: Math.round(item.start * 1000) / 1000,
                end: Math.round(item.end * 1000) / 1000,
                colorOverride: null
              };
            });
            captions.push({
              id: 'word_cue_' + captions.length,
              start: Math.round(currGroup[0].start * 1000) / 1000,
              end: Math.round(currGroup[currGroup.length - 1].end * 1000) / 1000,
              text: cText,
              words: formattedWords
            });
          }
          currGroup = [w];
        } else {
          currGroup.push(w);
        }
      }

      if (currGroup.length) {
        var cTextFinal = currGroup.map(function(item) { return item.word || item.text || ''; }).join(' ').trim();
        if (cTextFinal) {
          var formattedWordsFinal = currGroup.map(function(item, wIdx) {
            return {
              id: 'w_' + captions.length + '_' + wIdx,
              text: (item.word || item.text || '').trim(),
              start: Math.round(item.start * 1000) / 1000,
              end: Math.round(item.end * 1000) / 1000,
              colorOverride: null
            };
          });
          captions.push({
            id: 'word_cue_' + captions.length,
            start: Math.round(currGroup[0].start * 1000) / 1000,
            end: Math.round(currGroup[currGroup.length - 1].end * 1000) / 1000,
            text: cTextFinal,
            words: formattedWordsFinal
          });
        }
      }

      return captions;
    }

    async function transcribeVideoAudioWithGroq(audioBlob, apiKey, mode, onProgress) {
      onProgress(40, 'Generating speech-to-text AI subtitles...');

      function buildFormData(modelName) {
        var formData = new FormData();
        formData.append('file', audioBlob, 'audio.wav');
        formData.append('model', modelName);
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'segment');
        formData.append('timestamp_granularities[]', 'word');

        if (mode === 'hinglish_roman') {
          formData.append('language', 'hi');
          formData.append('prompt', 'यह एक conversational Hinglish वीडियो है। हिंदी शब्द देवनागरी में और इंग्लिश शब्द Roman script में लिखें, जैसे video editing, learn, if I want to, simple, easy, guys, content, workflow, software, computer, channel, link, subscribe. Do not output Urdu script.');
        } else if (mode === 'en' || mode === 'english_only') {
          formData.append('language', 'en');
          formData.append('prompt', 'Clear and articulate English speech transcription.');
        } else if (mode === 'hi') {
          formData.append('language', 'hi');
          formData.append('prompt', 'स्पष्ट हिंदी संवाद प्रतिलेखन।');
        }
        return formData;
      }

      var res = null;

      // 1. Primary Route: Vercel Serverless API Proxy (/api/transcribe) reading GROQ_API_KEY env var
      try {
        var serverlessFormData = buildFormData('whisper-large-v3');
        res = await fetch('/api/transcribe', {
          method: 'POST',
          body: serverlessFormData
        });
      } catch (proxyErr) {
        console.warn('/api/transcribe serverless proxy notice:', proxyErr);
      }

      // 2. Secondary Fallback: Direct Groq API call if /api/transcribe returned non-200 or is unavailable
      if (!res || !res.ok) {
        var keyToUse = (apiKey || (typeof state !== 'undefined' && state.groqApiKey ? state.groqApiKey : '')).trim();
        if (keyToUse) {
          async function requestGroqDirect(modelName) {
            var formData = buildFormData(modelName);
            return await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + keyToUse },
              body: formData
            });
          }

          res = await requestGroqDirect('whisper-large-v3');
          if (!res || !res.ok) {
            res = await requestGroqDirect('whisper-large-v3-turbo');
          }
        }
      }

      if (!res || !res.ok) {
        var errText = res ? await res.text() : 'No response from transcription service';
        throw new Error('Groq Transcription API Error (' + (res ? res.status : 500) + '): ' + errText);
      }

      onProgress(90, 'Processing VTT/SRT subtitles...');
      var data = await res.json();
      var segments = [];

      var rawSegments = data.segments || [];

      // Process EVERY segment in data.segments to guarantee START, MIDDLE, and END coverage!
      if (rawSegments && rawSegments.length > 0) {
        rawSegments.forEach(function (seg) {
          if (seg.words && seg.words.length > 0) {
            var segSub = groupWordsIntoSubtitles(seg.words, 4, 0.4);
            if (segSub && segSub.length > 0) {
              segments = segments.concat(segSub);
              return;
            }
          }
          var segChunk = splitSegmentsIntoShortCaptions([seg], 4);
          if (segChunk && segChunk.length > 0) {
            segments = segments.concat(segChunk);
          }
        });
      }

      // Secondary Strategy: Top-level data.words fallback
      if ((!segments || segments.length === 0) && data.words && data.words.length > 0) {
        segments = groupWordsIntoSubtitles(data.words, 4, 0.4);
      }

      // Tertiary Strategy: Raw text fallback if segment array is empty
      if (!segments || segments.length === 0) {
        if (data.text && data.text.trim()) {
          segments = [{ id: 'raw_0', start: 0, end: 5, text: data.text.trim() }];
        } else {
          throw new Error('No speech detected in this video file.');
        }
      }

      // Subtract 200ms audio padding offset for frame-accurate zero-lag subtitle sync
      var padSec = 0.2;
      segments.forEach(function (seg, segIdx) {
        seg.start = Math.max(0, Math.round((seg.start - padSec) * 1000) / 1000);
        seg.end = Math.max(seg.start + 0.05, Math.round((seg.end - padSec) * 1000) / 1000);

        if (seg.words && seg.words.length > 0) {
          seg.words.forEach(function (w, wIdx) {
            w.id = 'w_' + segIdx + '_' + wIdx;
            w.start = Math.max(0, Math.round((w.start - padSec) * 1000) / 1000);
            w.end = Math.max(w.start + 0.05, Math.round((w.end - padSec) * 1000) / 1000);
            if (w.colorOverride === undefined) w.colorOverride = null;
          });
        } else {
          seg.words = synthesizeWordTimestampsForSegment(seg.text, seg.start, seg.end);
        }
      });

      // If mode is Hinglish Roman, convert Devanagari text into natural Roman Hinglish
      if (mode === 'hinglish_roman') {
        segments.forEach(function (seg) {
          seg.text = devanagariToRoman(seg.text);
          if (seg.words) {
            seg.words.forEach(function (w) {
              w.text = devanagariToRoman(w.text);
            });
          }
        });
      }

      segments = normalizeCaptionTimestamps(segments);

      CaptionStore.setState({ segments: segments }, true);

      onProgress(100, 'AI Subtitles Ready!');
      return segments;
    }

    
    // =========================================================
    // MILESTONE 5: EXPANDED STYLE PANEL (TEXT TAB) ENGINE
    // =========================================================

    window._stylingScope = 'global'; // 'global' or 'selected'

    var _loadedFonts = {};

    function ensureFontLoaded(fontFamily) {
      if (!fontFamily) return;
      var cleanFont = fontFamily.trim();
      var key = cleanFont.toLowerCase();
      if (_loadedFonts[key]) return;
      _loadedFonts[key] = true;

      var fontMap = {
        'outfit': 'Outfit:wght@400;600;700;800;900',
        'inter': 'Inter:wght@400;600;700;800;900',
        'plus jakarta sans': 'Plus+Jakarta+Sans:wght@400;600;700;800',
        'jetbrains mono': 'JetBrains+Mono:wght@400;700;800',
        'montserrat': 'Montserrat:wght@400;600;700;800;900',
        'poppins': 'Poppins:wght@400;600;700;800',
        'oswald': 'Oswald:wght@400;600;700',
        'playfair display': 'Playfair+Display:ital,wght@0,400;0,700;0,900;1,400',
        'space grotesk': 'Space+Grotesk:wght@400;600;700',
        'cinzel': 'Cinzel:wght@400;700;900',
        'anton': 'Anton',
        'bebas neue': 'Bebas+Neue'
      };

      var query = fontMap[key];
      if (!query) return;

      var linkId = 'gfont-link-' + key.replace(/[^a-z0-9]/g, '');
      if (document.getElementById(linkId)) return;

      var link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=' + query + '&display=swap';
      document.head.appendChild(link);
    }

    function updateStyleStore(updates) {
      var state = CaptionStore.getState();
      var selectedId = state.selectedSegmentId;
      var scope = window._stylingScope || 'global';

      if (scope === 'selected' && selectedId) {
        CaptionStore.updateSegmentStyleOverride(selectedId, updates);
      } else {
        CaptionStore.setState({ globalStyle: updates }, false);
      }

      applyGlobalStyleToOverlay();
      if (typeof updateVideoSubtitleOverlay === 'function') updateVideoSubtitleOverlay();
    }

    function applyGlobalStyleToOverlay() {
      var state = CaptionStore.getState();
      var gs = state.globalStyle || {};

      var video = $('video-player-el');
      var currTime = video ? (video.currentTime || 0) : 0;
      var activeSeg = (state.segments || []).find(function (s) {
        return currTime >= s.start && currTime <= s.end;
      });

      // Preview target segment
      var previewSeg = activeSeg;
      if (!previewSeg && state.selectedSegmentId) {
        previewSeg = (state.segments || []).find(function (s) { return s.id === state.selectedSegmentId; });
      }

      var effectiveStyle = Object.assign({}, gs, previewSeg && previewSeg.styleOverride ? previewSeg.styleOverride : {});

      var overlayWrapper = $('pro-canvas-overlay');
      var subBox = $('video-subtitle-text');
      if (!subBox) return;

      var tmplId = effectiveStyle.presetId || effectiveStyle.templateId || 'bubble_3d';
      subBox.className = 'gradial-caption-box template-' + tmplId + ' preset-' + tmplId;

      var fontFam = effectiveStyle.fontFamily || 'Outfit';
      ensureFontLoaded(fontFam);

      var fontSz = effectiveStyle.fontSize || 24;
      var fontWt = effectiveStyle.fontWeight || '800';
      var fontSt = effectiveStyle.fontStyle || 'normal';
      var fontDec = effectiveStyle.textDecoration || 'none';
      var fontAlign = effectiveStyle.textAlign || 'center';
      var letterSp = effectiveStyle.letterSpacing !== undefined ? effectiveStyle.letterSpacing : 0;
      var lineHt = effectiveStyle.lineHeight !== undefined ? effectiveStyle.lineHeight : 1.2;

      subBox.style.setProperty('font-family', fontFam + ', sans-serif', 'important');
      subBox.style.setProperty('font-size', fontSz + 'px', 'important');
      subBox.style.setProperty('font-weight', fontWt, 'important');
      subBox.style.setProperty('font-style', fontSt, 'important');
      subBox.style.setProperty('text-decoration', fontDec, 'important');
      subBox.style.setProperty('text-align', fontAlign, 'important');
      subBox.style.setProperty('letter-spacing', letterSp + 'px', 'important');
      subBox.style.setProperty('line-height', lineHt, 'important');

      var wordEls = subBox.querySelectorAll('.gradial-word');
      wordEls.forEach(function (w) {
        w.style.setProperty('font-family', fontFam + ', sans-serif', 'important');
      });

      var textTransformVal = effectiveStyle.textCase || effectiveStyle.textTransform || 'none';
      if (textTransformVal) {
        subBox.style.setProperty('text-transform', textTransformVal, 'important');
      }

      // Color Type & Solid vs Gradient Text Styling
      if (effectiveStyle.colorType === 'gradient') {
        var g1 = effectiveStyle.gradientStop1 || '#00FF88';
        var g2 = effectiveStyle.gradientStop2 || '#00E5FF';
        var gradAngle = effectiveStyle.gradientAngle !== undefined ? effectiveStyle.gradientAngle : 90;
        subBox.style.setProperty('background', 'linear-gradient(' + gradAngle + 'deg, ' + g1 + ', ' + g2 + ')', 'important');
        subBox.style.setProperty('-webkit-background-clip', 'text', 'important');
        subBox.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        subBox.style.setProperty('color', 'transparent', 'important');
      } else {
        subBox.style.removeProperty('-webkit-background-clip');
        subBox.style.removeProperty('-webkit-text-fill-color');
        var solCol = effectiveStyle.solidColor || '#FFFFFF';
        subBox.style.setProperty('color', solCol, 'important');
      }

      if (overlayWrapper) {
        overlayWrapper.style.left = (effectiveStyle.positionX !== undefined ? effectiveStyle.positionX : 50) + '%';
        overlayWrapper.style.top = (effectiveStyle.positionY !== undefined ? effectiveStyle.positionY : 85) + '%';
      }
    }

    // Sync style panel UI controls from CaptionStore.globalStyle or selected segment styleOverride
    function syncStylePanelFromStore() {
      var state = CaptionStore.getState();
      var gs = state.globalStyle || {};
      var selectedId = state.selectedSegmentId;
      var scope = window._stylingScope || 'global';

      var seg = (scope === 'selected' && selectedId) ? (state.segments || []).find(function (s) { return s.id === selectedId; }) : null;
      var effective = Object.assign({}, gs, seg && seg.styleOverride ? seg.styleOverride : {});

      // Scope buttons
      if ($('btn-scope-all')) $('btn-scope-all').classList.toggle('active', scope === 'global');
      if ($('btn-scope-selected')) $('btn-scope-selected').classList.toggle('active', scope === 'selected');

      // Typography
      if ($('pro-style-font-family')) $('pro-style-font-family').value = effective.fontFamily || 'Outfit';
      if ($('pro-style-font-size-slider')) $('pro-style-font-size-slider').value = effective.fontSize || 24;
      if ($('pro-style-font-size-num')) $('pro-style-font-size-num').value = effective.fontSize || 24;

      if ($('pro-style-letter-spacing')) $('pro-style-letter-spacing').value = effective.letterSpacing !== undefined ? effective.letterSpacing : 0;
      if ($('pro-style-letter-spacing-val')) $('pro-style-letter-spacing-val').textContent = (effective.letterSpacing !== undefined ? effective.letterSpacing : 0) + 'px';

      if ($('pro-style-line-height')) $('pro-style-line-height').value = effective.lineHeight !== undefined ? effective.lineHeight : 1.2;
      if ($('pro-style-line-height-val')) $('pro-style-line-height-val').textContent = effective.lineHeight !== undefined ? effective.lineHeight : 1.2;

      // Format & Case
      var isBold = (effective.fontWeight === '700' || effective.fontWeight === '800' || effective.fontWeight === 'bold');
      var isItalic = (effective.fontStyle === 'italic');
      var isUnderline = (effective.textDecoration === 'underline');

      if ($('pro-btn-bold')) $('pro-btn-bold').classList.toggle('active', isBold);
      if ($('pro-btn-italic')) $('pro-btn-italic').classList.toggle('active', isItalic);
      if ($('pro-btn-underline')) $('pro-btn-underline').classList.toggle('active', isUnderline);

      if ($('pro-style-text-case')) $('pro-style-text-case').value = effective.textCase || effective.textTransform || 'none';

      // Colors
      var isGrad = (effective.colorType === 'gradient');
      if ($('pro-color-mode-solid')) $('pro-color-mode-solid').classList.toggle('active', !isGrad);
      if ($('pro-color-mode-gradient')) $('pro-color-mode-gradient').classList.toggle('active', isGrad);

      if ($('pro-color-solid-panel')) {
        $('pro-color-solid-panel').classList.remove('hidden');
        $('pro-color-solid-panel').style.display = isGrad ? 'none' : 'block';
      }
      if ($('pro-color-gradient-panel')) {
        $('pro-color-gradient-panel').classList.remove('hidden');
        $('pro-color-gradient-panel').style.display = isGrad ? 'flex' : 'none';
      }

      var solidCol = effective.solidColor || '#FFFFFF';
      if ($('pro-style-solid-color-picker')) $('pro-style-solid-color-picker').value = solidCol;
      if ($('pro-style-color-swatch')) $('pro-style-color-swatch').style.backgroundColor = solidCol;

      if ($('pro-grad-stop-1')) $('pro-grad-stop-1').value = effective.gradientStop1 || '#00FF88';
      if ($('pro-grad-stop-2')) $('pro-grad-stop-2').value = effective.gradientStop2 || '#00E5FF';
      if ($('pro-style-gradient-angle')) $('pro-style-gradient-angle').value = effective.gradientAngle || 90;
      if ($('gradient-angle-val')) $('gradient-angle-val').textContent = (effective.gradientAngle || 90) + '°';

      try { initSliderFills(); } catch (e) {}
    }

    function renderGradientStopsEditor() {
      // Stub for legacy call
    }

    function initStylePanel() {
      // Scope Buttons
      if ($('btn-scope-all')) {
        $('btn-scope-all').addEventListener('click', function () {
          window._stylingScope = 'global';
          syncStylePanelFromStore();
          applyGlobalStyleToOverlay();
        });
      }
      if ($('btn-scope-selected')) {
        $('btn-scope-selected').addEventListener('click', function () {
          window._stylingScope = 'selected';
          syncStylePanelFromStore();
          applyGlobalStyleToOverlay();
        });
      }

      // Font Family
      if ($('pro-style-font-family')) {
        $('pro-style-font-family').addEventListener('change', function (e) {
          updateStyleStore({ fontFamily: e.target.value });
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }

      // Font Size Slider ↔ Numeric
      if ($('pro-style-font-size-slider')) {
        $('pro-style-font-size-slider').addEventListener('input', function (e) {
          var val = parseInt(e.target.value);
          if ($('pro-style-font-size-num')) $('pro-style-font-size-num').value = val;
          updateStyleStore({ fontSize: val });
        });
      }
      if ($('pro-style-font-size-num')) {
        $('pro-style-font-size-num').addEventListener('input', function (e) {
          var val = Math.min(120, Math.max(12, parseInt(e.target.value) || 24));
          if ($('pro-style-font-size-slider')) $('pro-style-font-size-slider').value = val;
          updateStyleStore({ fontSize: val });
        });
      }
      if ($('btn-reset-font-size')) {
        $('btn-reset-font-size').addEventListener('click', function () {
          if ($('pro-style-font-size-slider')) $('pro-style-font-size-slider').value = 24;
          if ($('pro-style-font-size-num')) $('pro-style-font-size-num').value = 24;
          updateStyleStore({ fontSize: 24 });
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }

      // Letter Spacing
      if ($('pro-style-letter-spacing')) {
        $('pro-style-letter-spacing').addEventListener('input', function (e) {
          var val = parseFloat(e.target.value) || 0;
          if ($('pro-style-letter-spacing-val')) $('pro-style-letter-spacing-val').textContent = val + 'px';
          updateStyleStore({ letterSpacing: val });
        });
      }
      if ($('btn-reset-letter-spacing')) {
        $('btn-reset-letter-spacing').addEventListener('click', function () {
          if ($('pro-style-letter-spacing')) $('pro-style-letter-spacing').value = 0;
          if ($('pro-style-letter-spacing-val')) $('pro-style-letter-spacing-val').textContent = '0px';
          updateStyleStore({ letterSpacing: 0 });
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }

      // Line Height
      if ($('pro-style-line-height')) {
        $('pro-style-line-height').addEventListener('input', function (e) {
          var val = parseFloat(e.target.value) || 1.2;
          if ($('pro-style-line-height-val')) $('pro-style-line-height-val').textContent = val;
          updateStyleStore({ lineHeight: val });
        });
      }
      if ($('btn-reset-line-height')) {
        $('btn-reset-line-height').addEventListener('click', function () {
          if ($('pro-style-line-height')) $('pro-style-line-height').value = 1.2;
          if ($('pro-style-line-height-val')) $('pro-style-line-height-val').textContent = '1.2';
          updateStyleStore({ lineHeight: 1.2 });
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }

      // Format B / I / U
      if ($('pro-btn-bold')) {
        $('pro-btn-bold').addEventListener('click', function () {
          var isBold = $('pro-btn-bold').classList.contains('active');
          updateStyleStore({ fontWeight: isBold ? '400' : '800' });
          syncStylePanelFromStore();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }
      if ($('pro-btn-italic')) {
        $('pro-btn-italic').addEventListener('click', function () {
          var isItalic = $('pro-btn-italic').classList.contains('active');
          updateStyleStore({ fontStyle: isItalic ? 'normal' : 'italic' });
          syncStylePanelFromStore();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }
      if ($('pro-btn-underline')) {
        $('pro-btn-underline').addEventListener('click', function () {
          var isUnderline = $('pro-btn-underline').classList.contains('active');
          updateStyleStore({ textDecoration: isUnderline ? 'none' : 'underline' });
          syncStylePanelFromStore();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }

      // Text Transform Case
      if ($('pro-style-text-case')) {
        $('pro-style-text-case').addEventListener('change', function (e) {
          updateStyleStore({ textCase: e.target.value, textTransform: e.target.value });
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }

      // Color Mode (Solid vs Gradient)
      if ($('pro-color-mode-solid')) {
        $('pro-color-mode-solid').addEventListener('click', function () {
          updateStyleStore({ colorType: 'solid' });
          syncStylePanelFromStore();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }
      if ($('pro-color-mode-gradient')) {
        $('pro-color-mode-gradient').addEventListener('click', function () {
          updateStyleStore({ colorType: 'gradient' });
          syncStylePanelFromStore();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }

      // Solid Color Picker Trigger & Input
      if ($('pro-style-color-trigger')) {
        $('pro-style-color-trigger').addEventListener('click', function () {
          if ($('pro-style-solid-color-picker')) $('pro-style-solid-color-picker').click();
        });
      }
      if ($('pro-style-solid-color-picker')) {
        $('pro-style-solid-color-picker').addEventListener('input', function (e) {
          var col = e.target.value;
          if ($('pro-style-color-swatch')) $('pro-style-color-swatch').style.backgroundColor = col;
          updateStyleStore({ solidColor: col });
        });
      }

      // Gradient Stops & Angle
      if ($('pro-grad-stop-1')) {
        $('pro-grad-stop-1').addEventListener('input', function (e) {
          updateStyleStore({ gradientStop1: e.target.value });
        });
      }
      if ($('pro-grad-stop-2')) {
        $('pro-grad-stop-2').addEventListener('input', function (e) {
          updateStyleStore({ gradientStop2: e.target.value });
        });
      }
      if ($('pro-style-gradient-angle')) {
        $('pro-style-gradient-angle').addEventListener('input', function (e) {
          var val = parseInt(e.target.value);
          if ($('gradient-angle-val')) $('gradient-angle-val').textContent = val + '°';
          updateStyleStore({ gradientAngle: val });
        });
      }

      // Direct Drag on Overlay
      var overlayEl = $('pro-canvas-overlay');
      var viewport = $('video-preview-viewport');
      if (overlayEl && viewport) {
        var _dragState = null;
        overlayEl.addEventListener('mousedown', function(e) {
          e.preventDefault();
          var rect = viewport.getBoundingClientRect();
          _dragState = {
            startX: e.clientX,
            startY: e.clientY,
            startPosX: CaptionStore.getState().globalStyle.positionX || 50,
            startPosY: CaptionStore.getState().globalStyle.positionY || 85,
            vpW: rect.width,
            vpH: rect.height
          };
        });
        document.addEventListener('mousemove', function(e) {
          if (!_dragState) return;
          var dx = e.clientX - _dragState.startX;
          var dy = e.clientY - _dragState.startY;
          var newX = Math.min(100, Math.max(0, Math.round(_dragState.startPosX + (dx / _dragState.vpW) * 100)));
          var newY = Math.min(100, Math.max(0, Math.round(_dragState.startPosY + (dy / _dragState.vpH) * 100)));
          updateStyleStore({ positionX: newX, positionY: newY });
          if ($('pro-style-pos-x')) $('pro-style-pos-x').value = newX;
          if ($('pro-style-pos-x-num')) $('pro-style-pos-x-num').value = newX;
          if ($('pro-style-pos-y')) $('pro-style-pos-y').value = newY;
          if ($('pro-style-pos-y-num')) $('pro-style-pos-y-num').value = newY;
        });
        document.addEventListener('mouseup', function() {
          if (_dragState) { _dragState = null; try { initSliderFills(); } catch(ex) {} }
        });
      }

      syncStylePanelFromStore();
    }

    // =========================================================
    // MILESTONE 6: TEMPLATE PRESETS (Full CaptionStyle Objects)
    // =========================================================

    var gradialTemplatePresets = [
      {
        id: 'tmpl-liquid-glass', name: 'Liquid Glass',
        desc: 'Frosted glass with translucent depth',
        style: { fontFamily: 'Inter', fontSize: 28, fontWeight: '700', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', textTransform: 'none', colorType: 'gradient', solidColor: '#FFFFFF', gradientStops: [{ color: '#E0E7FF', position: 0 }, { color: '#A5B4FC', position: 50 }, { color: '#818CF8', position: 100 }], gradientAngle: 135, activeWordColor: '#C7D2FE', positionX: 50, positionY: 85 }
      },
      {
        id: 'tmpl-synthwave', name: 'Synthwave',
        desc: 'Retro-futuristic neon vibes',
        style: { fontFamily: 'Bungee', fontSize: 30, fontWeight: '400', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', textTransform: 'uppercase', colorType: 'gradient', solidColor: '#FF00FF', gradientStops: [{ color: '#FF006E', position: 0 }, { color: '#FF00FF', position: 50 }, { color: '#00F0FF', position: 100 }], gradientAngle: 90, activeWordColor: '#FFFF00', positionX: 50, positionY: 85 }
      },
      {
        id: 'tmpl-nord', name: 'Nord',
        desc: 'Arctic, clean Scandinavian palette',
        style: { fontFamily: 'Inter', fontSize: 24, fontWeight: '600', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', textTransform: 'none', colorType: 'solid', solidColor: '#ECEFF4', gradientStops: [{ color: '#88C0D0', position: 0 }, { color: '#5E81AC', position: 100 }], gradientAngle: 180, activeWordColor: '#88C0D0', positionX: 50, positionY: 85 }
      },
      {
        id: 'tmpl-terminal', name: 'Terminal',
        desc: 'Monospaced hacker aesthetic',
        style: { fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: '700', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', textTransform: 'none', colorType: 'solid', solidColor: '#00FF88', gradientStops: [{ color: '#00FF88', position: 0 }, { color: '#00CC6A', position: 100 }], gradientAngle: 90, activeWordColor: '#FFFFFF', positionX: 50, positionY: 85 }
      },
      {
        id: 'tmpl-frutiger-aero', name: 'Frutiger Aero',
        desc: 'Glossy Y2K translucent style',
        style: { fontFamily: 'Poppins', fontSize: 26, fontWeight: '700', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', textTransform: 'none', colorType: 'gradient', solidColor: '#FFFFFF', gradientStops: [{ color: '#43E97B', position: 0 }, { color: '#38F9D7', position: 50 }, { color: '#72EDF2', position: 100 }], gradientAngle: 120, activeWordColor: '#FFFFFF', positionX: 50, positionY: 82 }
      },
      {
        id: 'tmpl-claymorphic', name: 'Claymorphic',
        desc: 'Soft, inflated 3D clay look',
        style: { fontFamily: 'Outfit', fontSize: 32, fontWeight: '800', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', textTransform: 'none', colorType: 'gradient', solidColor: '#FBBF24', gradientStops: [{ color: '#F472B6', position: 0 }, { color: '#FBBF24', position: 50 }, { color: '#34D399', position: 100 }], gradientAngle: 45, activeWordColor: '#FFFFFF', positionX: 50, positionY: 85 }
      }
    ];

    function renderTemplateCards() {
      var grid = $('gradial-templates-grid');
      if (!grid) return;
      grid.innerHTML = '';
      var gs = CaptionStore.getState().globalStyle;

      gradialTemplatePresets.forEach(function(tmpl) {
        var card = document.createElement('div');
        var isActive = gs.presetId === tmpl.id;
        card.className = 'gradial-template-card' + (isActive ? ' active-template' : '');
        card.dataset.tmplId = tmpl.id;

        // Build preview style
        var previewStyle = 'font-family:' + tmpl.style.fontFamily + ', sans-serif; font-weight:' + tmpl.style.fontWeight + '; font-size:14px; text-transform:' + (tmpl.style.textTransform || 'none') + ';';
        if (tmpl.style.colorType === 'gradient' && tmpl.style.gradientStops && tmpl.style.gradientStops.length >= 2) {
          var stops = tmpl.style.gradientStops.map(function(s) { return s.color + ' ' + s.position + '%'; }).join(', ');
          previewStyle += 'background:linear-gradient(' + tmpl.style.gradientAngle + 'deg, ' + stops + '); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;';
        } else {
          previewStyle += 'color:' + (tmpl.style.solidColor || '#fff') + ';';
        }

        card.innerHTML =
          '<div class="template-card-name">' + escapeHTML(tmpl.name) + '</div>' +
          '<div class="template-card-desc">' + escapeHTML(tmpl.desc) + '</div>' +
          '<div class="template-card-preview" style="' + previewStyle + '">The quick brown fox</div>';

        card.addEventListener('click', function() {
          var newStyle = Object.assign({}, tmpl.style, { presetId: tmpl.id });
          CaptionStore.setState({ globalStyle: newStyle }, false);
          syncStylePanelFromStore();
          applyGlobalStyleToOverlay();
          renderTemplateCards();
          audioManager.play('pop');
        });

        grid.appendChild(card);
      });
    }

    // =========================================================
    // MILESTONE 6: TRANSITION PRESETS & ANIMATION ENGINE
    // =========================================================

    var gradialTransitionPresets = [
      { id: 'trans-fade', name: 'Fade In', type: 'fade', icon: 'ph-eye', desc: 'Smooth opacity entrance', duration: 0.3, easing: 'ease-out' },
      { id: 'trans-scale-pop', name: 'Scale Pop', type: 'scale-pop', icon: 'ph-arrows-out', desc: 'Bouncy scale entrance', duration: 0.35, easing: 'elastic' },
      { id: 'trans-slide-up', name: 'Slide Up', type: 'slide-up', icon: 'ph-arrow-up', desc: 'Smooth upward slide', duration: 0.3, easing: 'ease-out' },
      { id: 'trans-typewriter', name: 'Typewriter', type: 'typewriter', icon: 'ph-terminal', desc: 'Character-by-character reveal', duration: 0.05, easing: 'linear' },
      { id: 'trans-karaoke', name: 'Karaoke Highlight', type: 'karaoke-highlight', icon: 'ph-music-notes', desc: 'Progressive word tinting', duration: 0.3, easing: 'ease-out' }
    ];

    function renderTransitionCards() {
      var container = $('gradial-transitions-list');
      if (!container) return;
      container.innerHTML = '';
      var currentTrans = CaptionStore.getState().transition;

      gradialTransitionPresets.forEach(function(trans) {
        var card = document.createElement('div');
        var isActive = currentTrans && currentTrans.id === trans.id;
        card.className = 'gradial-transition-card' + (isActive ? ' active-transition' : '');
        card.dataset.transId = trans.id;

        card.innerHTML =
          '<div style="display:flex; align-items:center; gap:10px;">' +
            '<div class="transition-icon-box"><i class="ph ' + trans.icon + '" style="font-size:16px;"></i></div>' +
            '<div>' +
              '<div class="transition-card-name">' + escapeHTML(trans.name) + '</div>' +
              '<div class="transition-card-desc">' + escapeHTML(trans.desc) + '</div>' +
            '</div>' +
          '</div>' +
          (isActive ? '<div class="transition-active-badge">ACTIVE</div>' : '');

        card.addEventListener('click', function() {
          CaptionStore.setState({ transition: { id: trans.id, name: trans.name, type: trans.type, duration: trans.duration, easing: trans.easing } }, false);
          renderTransitionCards();
          audioManager.play('pop');
          try { refreshLucideIcons(); } catch(e) {}
        });

        container.appendChild(card);
      });

      try { refreshLucideIcons(); } catch(e) {}
    }

    // =========================================================
    // GRADIAL'S PRO CAPTION PRESETS & LIVE STUDIO ENGINE (KALAKAAR PARITY)
    // =========================================================

    var gradialCaptionPresets = [
      { id: 'preset-style-classic', title: 'Gradial Classic Glow', font: "'Outfit', sans-serif", textColor: '#FFFFFF', activeColor: '#55FF00', preview: 'EDITING VIDEOS' },
      { id: 'preset-style-cyberpunk', title: 'Gradial Cyberpunk', font: "'Bungee', cursive", textColor: '#00F2FE', activeColor: '#FFE600', preview: 'WELCOME TO GRADIAL' },
      { id: 'preset-style-pink-pill', title: 'Gradial Pink Underline', font: "'Inter', sans-serif", textColor: '#FFFFFF', activeColor: '#FF007A', preview: 'The quick brown fox' },
      { id: 'preset-style-ali-abdaal', title: 'Gradial Ali Abdaal Pill', font: "'Inter', sans-serif", textColor: '#FFFFFF', activeColor: '#FFFFFF', preview: 'The quick brown fox' },
      { id: 'preset-style-mumbai-gold', title: 'Gradial Mumbai Gold', font: "'Anton', sans-serif", textColor: '#FFD700', activeColor: '#FFFFFF', preview: 'THE QUICK BROWN' },
      { id: 'preset-style-bubble-cyan', title: 'Gradial Bubble Cyan', font: "'Poppins', sans-serif", textColor: '#FFFFFF', activeColor: '#00D2FF', preview: 'The quick brown fox' },
      { id: 'preset-style-beast-red', title: 'Gradial Beast Red', font: "'Impact', sans-serif", textColor: '#FF0033', activeColor: '#FFFF00', preview: 'BEAST MODE ON' },
      { id: 'preset-style-clean-motion', title: 'Gradial Clean Motion', font: "'Outfit', sans-serif", textColor: '#FFFFFF', activeColor: '#00F2FE', preview: 'The quick brown fox' }
    ];

    if (!videoSubState.preset) {
      videoSubState.preset = 'preset-style-classic';
    }

    function escapeHTML(str) {
      if (typeof escapeHtml === 'function') return escapeHtml(str);
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function renderGradialPresetCards() {
      var grid = $('gradial-caption-presets-grid');
      if (!grid) return;
      grid.innerHTML = '';

      gradialCaptionPresets.forEach(function(preset) {
        var card = document.createElement('div');
        card.className = 'gradial-preset-card' + (videoSubState.preset === preset.id ? ' active-preset' : '');
        card.dataset.presetId = preset.id;

        card.innerHTML = 
          '<div class="preset-title">' + escapeHTML(preset.title) + '</div>' +
          '<div class="preset-preview-box ' + preset.id + '">' +
            '<span class="gradial-word">Hello</span> ' +
            '<span class="gradial-word gradial-word-active">' + escapeHTML(preset.preview) + '</span>' +
          '</div>';

        card.addEventListener('click', function() {
          videoSubState.preset = preset.id;
          document.querySelectorAll('.gradial-preset-card').forEach(function(el) { el.classList.remove('active-preset'); });
          card.classList.add('active-preset');
          audioManager.play('pop');
          updateVideoSubtitleOverlay();
        });

        grid.appendChild(card);
      });
    }

    var _editingWordState = null; // { segId: string, wordId: string }
    var _captionsSearchQuery = '';
    var _searchInputWired = false;

    function formatSegmentTime(sec) {
      if (isNaN(sec) || !isFinite(sec) || sec < 0) sec = 0;
      var m = Math.floor(sec / 60);
      var s = Math.floor(sec % 60);
      var ms = Math.round((sec % 1) * 1000);
      if (ms >= 1000) { s += 1; ms -= 1000; }
      if (s >= 60) { m += 1; s -= 60; }
      var mStr = String(m).padStart(2, '0');
      var sStr = String(s).padStart(2, '0');
      var msStr = String(ms).padStart(3, '0');
      return mStr + ':' + sStr + '.' + msStr;
    }

    function splitSegmentAtIndex(idx) {
      var state = CaptionStore.getState();
      var segments = (state.segments || []).slice();
      if (idx < 0 || idx >= segments.length) return;

      var seg = segments[idx];
      var words = seg.words || [];
      var splitWordIndex = -1;

      // 1. Check if a word in this segment is currently selected
      if (state.selectedWordId && words.length > 0) {
        var foundIdx = words.findIndex(function (w) { return w.id === state.selectedWordId; });
        if (foundIdx > 0 && foundIdx < words.length) {
          splitWordIndex = foundIdx;
        }
      }

      // 2. Check playhead position
      var video = $('video-player-el');
      if (splitWordIndex === -1 && video && words.length > 1) {
        var curTime = video.currentTime;
        if (curTime > seg.start && curTime < seg.end) {
          for (var i = 1; i < words.length; i++) {
            if (curTime <= words[i].start) {
              splitWordIndex = i;
              break;
            }
          }
          if (splitWordIndex === -1 && curTime >= words[words.length - 1].start) {
            splitWordIndex = words.length - 1;
          }
        }
      }

      // 3. Fallback: split at midpoint of words or duration
      if (splitWordIndex <= 0 || splitWordIndex >= words.length) {
        if (words.length >= 2) {
          splitWordIndex = Math.floor(words.length / 2);
        } else {
          splitWordIndex = -1;
        }
      }

      var seg1, seg2;
      if (splitWordIndex > 0 && splitWordIndex < words.length) {
        var words1 = words.slice(0, splitWordIndex);
        var words2 = words.slice(splitWordIndex);
        var end1 = words1[words1.length - 1].end;
        var start2 = words2[0].start;
        if (end1 > start2) end1 = start2;

        seg1 = {
          id: seg.id + '_1',
          start: seg.start,
          end: end1,
          text: words1.map(function (w) { return w.text; }).join(' '),
          words: words1,
          styleOverride: seg.styleOverride
        };

        seg2 = {
          id: 'seg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          start: start2,
          end: seg.end,
          text: words2.map(function (w) { return w.text; }).join(' '),
          words: words2,
          styleOverride: seg.styleOverride
        };
      } else {
        var mid = Math.round(((seg.start + seg.end) / 2) * 1000) / 1000;
        var textParts = (seg.text || '').trim().split(/\s+/);
        var half = Math.max(1, Math.floor(textParts.length / 2));
        var text1 = textParts.slice(0, half).join(' ') || seg.text;
        var text2 = textParts.slice(half).join(' ') || seg.text;

        seg1 = {
          id: seg.id + '_1',
          start: seg.start,
          end: mid,
          text: text1,
          words: synthesizeWordTimestampsForSegment(text1, seg.start, mid),
          styleOverride: seg.styleOverride
        };

        seg2 = {
          id: 'seg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          start: mid,
          end: seg.end,
          text: text2,
          words: synthesizeWordTimestampsForSegment(text2, mid, seg.end),
          styleOverride: seg.styleOverride
        };
      }

      segments.splice(idx, 1, seg1, seg2);
      CaptionStore.setState({ segments: segments, selectedSegmentId: seg1.id, selectedWordId: null }, true);
    }

    function mergeSegmentWithNext(idx) {
      var state = CaptionStore.getState();
      var segments = (state.segments || []).slice();
      if (idx < 0 || idx >= segments.length - 1) return;

      var seg1 = segments[idx];
      var seg2 = segments[idx + 1];

      var mergedWords = (seg1.words || []).concat(seg2.words || []);
      var mergedText = (seg1.text + ' ' + seg2.text).trim();

      var mergedSeg = {
        id: seg1.id,
        start: seg1.start,
        end: seg2.end,
        text: mergedText,
        words: mergedWords.length > 0 ? mergedWords : synthesizeWordTimestampsForSegment(mergedText, seg1.start, seg2.end),
        styleOverride: seg1.styleOverride || seg2.styleOverride
      };

      segments.splice(idx, 2, mergedSeg);
      CaptionStore.setState({ segments: segments, selectedSegmentId: mergedSeg.id, selectedWordId: null }, true);
    }

    function deleteSegmentAtIndex(idx) {
      var state = CaptionStore.getState();
      var segments = (state.segments || []).slice();
      if (idx < 0 || idx >= segments.length) return;

      segments.splice(idx, 1);
      var nextSelectedId = segments[idx] ? segments[idx].id : (segments[idx - 1] ? segments[idx - 1].id : null);
      CaptionStore.setState({ segments: segments, selectedSegmentId: nextSelectedId, selectedWordId: null }, true);
    }

    function closeAllSegmentDropdowns() {
      document.querySelectorAll('.caption-segment-dropdown').forEach(function (el) {
        el.remove();
      });
    }

    function renderProCaptionsList() {
      var container = $('pro-captions-list-scroll');
      if (!container) return;

      var state = CaptionStore.getState();
      var segments = state.segments || [];

      if (!segments || segments.length === 0) {
        container.innerHTML = 
          '<div id="pro-captions-empty-notice" style="text-align:center; padding:40px 20px; color:var(--text-muted); font-size:0.8rem; line-height:1.5;">' +
            '<i class="ph-fill ph-sparkle" style="font-size:24px; color:var(--accent-primary); margin-bottom:8px;"></i><br>' +
            'No AI captions generated.<br>Click "Generate AI Subtitles" in the sidebar!' +
          '</div>';
        return;
      }

      // Preserve active input focus & selection state
      var activeEl = document.activeElement;
      var focusedInputInfo = null;
      if (activeEl && container.contains(activeEl)) {
        if (activeEl.classList.contains('caption-segment-input')) {
          focusedInputInfo = {
            type: 'segment',
            idx: activeEl.dataset.idx,
            selStart: activeEl.selectionStart,
            selEnd: activeEl.selectionEnd
          };
        } else if (activeEl.classList.contains('word-token-input')) {
          focusedInputInfo = {
            type: 'word',
            segId: activeEl.dataset.segId,
            wordId: activeEl.dataset.wordId,
            selStart: activeEl.selectionStart,
            selEnd: activeEl.selectionEnd
          };
        }
      }

      var searchInput = $('captions-search-input');
      if (searchInput && !_searchInputWired) {
        _searchInputWired = true;
        searchInput.addEventListener('input', function (e) {
          _captionsSearchQuery = (e.target.value || '').toLowerCase().trim();
          renderProCaptionsList();
        });
      }

      var query = _captionsSearchQuery;

      container.innerHTML = '';

      segments.forEach(function (seg, idx) {
        var segId = seg.id || ('seg_' + idx);
        var matchesSearch = !query ||
          (seg.text || '').toLowerCase().includes(query) ||
          (seg.words || []).some(function (w) { return (w.text || '').toLowerCase().includes(query); });

        var card = document.createElement('div');
        card.className = 'caption-segment-card' + (segId === state.selectedSegmentId ? ' active-segment' : '');
        card.dataset.id = segId;
        card.dataset.index = idx;
        card.dataset.text = seg.text || '';
        if (!matchesSearch) {
          card.style.display = 'none';
        }

        var timeBadgeStr = formatSegmentTime(seg.start) + ' - ' + formatSegmentTime(seg.end);

        // Header
        var headerEl = document.createElement('div');
        headerEl.className = 'caption-segment-header';
        headerEl.innerHTML = 
          '<span class="caption-segment-num">' + (idx + 1) + '</span>' +
          '<span class="caption-segment-time">' + escapeHTML(timeBadgeStr) + '</span>' +
          '<div class="caption-segment-actions">' +
            '<button class="caption-segment-more-btn" title="Segment Options" data-idx="' + idx + '">' +
              '<i class="ph-fill ph-dots-three"></i>' +
            '</button>' +
          '</div>';

        // Body with line input
        var bodyEl = document.createElement('div');
        bodyEl.className = 'caption-segment-body';
        bodyEl.innerHTML = 
          '<input type="text" class="caption-segment-input" value="' + escapeHTML(seg.text || '') + '" data-idx="' + idx + '" placeholder="Enter caption text...">';

        // Word chips container
        var wordsContainerEl = document.createElement('div');
        wordsContainerEl.className = 'caption-words-container';

        var words = seg.words || [];
        words.forEach(function (word, wIdx) {
          var wordId = word.id || ('w_' + idx + '_' + wIdx);
          var isWordSelected = (wordId === state.selectedWordId);
          var isEditing = (_editingWordState && _editingWordState.segId === segId && _editingWordState.wordId === wordId);

          var wordChip = document.createElement('div');
          wordChip.className = 'caption-word-token' + (isWordSelected ? ' active-word-token' : '');
          wordChip.dataset.segId = segId;
          wordChip.dataset.wordId = wordId;
          wordChip.dataset.wordIdx = wIdx;

          if (isEditing) {
            wordChip.innerHTML = 
              '<input type="text" class="word-token-input" value="' + escapeHTML(word.text || '') + '" data-seg-id="' + segId + '" data-word-id="' + wordId + '" data-word-idx="' + wIdx + '">';
          } else {
            var chipHTML = '';
            if (word.colorOverride) {
              chipHTML += '<span class="word-color-dot" style="background-color:' + escapeHTML(word.colorOverride) + '" title="Tint: ' + escapeHTML(word.colorOverride) + '"></span>' +
                          '<span class="word-color-clear-btn" data-seg-idx="' + idx + '" data-word-idx="' + wIdx + '" title="Clear Tint">&times;</span>';
            }
            chipHTML += '<span class="word-token-text">' + escapeHTML(word.text || '') + '</span>' +
                        '<button class="word-token-tint-btn" title="Set Tint Color" data-seg-idx="' + idx + '" data-word-idx="' + wIdx + '"><i class="ph-fill ph-palette" style="font-size:11px;"></i></button>' +
                        '<button class="word-token-edit-btn" title="Edit Word" data-seg-id="' + segId + '" data-word-id="' + wordId + '"><i class="ph-fill ph-pencil-simple" style="font-size:11px;"></i></button>';
            wordChip.innerHTML = chipHTML;
          }

          wordsContainerEl.appendChild(wordChip);
        });

        card.appendChild(headerEl);
        card.appendChild(bodyEl);
        card.appendChild(wordsContainerEl);
        container.appendChild(card);
      });

      attachCaptionsListEventListeners(container);

      // Restore focus
      if (focusedInputInfo) {
        if (focusedInputInfo.type === 'segment') {
          var restoredInput = container.querySelector('.caption-segment-input[data-idx="' + focusedInputInfo.idx + '"]');
          if (restoredInput) {
            restoredInput.focus();
            try { restoredInput.setSelectionRange(focusedInputInfo.selStart, focusedInputInfo.selEnd); } catch (e) {}
          }
        } else if (focusedInputInfo.type === 'word') {
          var restoredWordInput = container.querySelector('.word-token-input[data-word-id="' + focusedInputInfo.wordId + '"]');
          if (restoredWordInput) {
            restoredWordInput.focus();
            try { restoredWordInput.setSelectionRange(focusedInputInfo.selStart, focusedInputInfo.selEnd); } catch (e) {}
          }
        }
      }

      refreshLucideIcons();
    }

    function attachCaptionsListEventListeners(container) {
      // 1. Line-level Segment Input Listener
      container.querySelectorAll('.caption-segment-input').forEach(function (inputEl) {
        inputEl.addEventListener('input', function (e) {
          var idx = parseInt(e.target.dataset.idx, 10);
          var state = CaptionStore.getState();
          var currentSegments = (state.segments || []).slice();
          if (currentSegments[idx]) {
            var updatedText = e.target.value;
            var oldWords = currentSegments[idx].words || [];
            var newWordsArray = (updatedText.trim().split(/\s+/)).filter(Boolean);

            var finalWords;
            if (newWordsArray.length === oldWords.length && newWordsArray.length > 0) {
              finalWords = oldWords.map(function (w, i) {
                return Object.assign({}, w, { text: newWordsArray[i] });
              });
            } else {
              var synthesized = synthesizeWordTimestampsForSegment(updatedText, currentSegments[idx].start, currentSegments[idx].end);
              finalWords = synthesized.map(function (w, i) {
                if (oldWords[i] && oldWords[i].colorOverride) {
                  return Object.assign({}, w, { colorOverride: oldWords[i].colorOverride });
                }
                return w;
              });
            }

            currentSegments[idx] = Object.assign({}, currentSegments[idx], {
              text: updatedText,
              words: finalWords
            });

            CaptionStore.setState({ segments: currentSegments }, true);
          }
          updateVideoSubtitleOverlay();
        });
      });

      // 2. Card click selection & Video Playhead Sync
      container.querySelectorAll('.caption-segment-card').forEach(function (card) {
        card.addEventListener('click', function (e) {
          if (e.target.closest('.caption-segment-more-btn') ||
              e.target.closest('.caption-segment-dropdown') ||
              e.target.closest('.caption-word-token') ||
              e.target.closest('.caption-segment-input')) {
            return;
          }
          var segId = card.dataset.id;
          var idx = parseInt(card.dataset.index, 10);
          var state = CaptionStore.getState();
          var seg = (state.segments || [])[idx];

          CaptionStore.setState({ selectedSegmentId: segId, selectedWordId: null }, false);

          var video = $('video-player-el');
          if (video && seg && isFinite(seg.start)) {
            video.currentTime = seg.start;
            if (typeof updateVideoProgressUI === 'function') updateVideoProgressUI();
          }
        });
      });

      // 3. Segment Input Focus - select segment
      container.querySelectorAll('.caption-segment-input').forEach(function (inputEl) {
        inputEl.addEventListener('focus', function () {
          var idx = parseInt(inputEl.dataset.idx, 10);
          var state = CaptionStore.getState();
          var seg = (state.segments || [])[idx];
          if (seg && seg.id !== state.selectedSegmentId) {
            CaptionStore.setState({ selectedSegmentId: seg.id, selectedWordId: null }, false);
          }
        });
      });

      // 4. Word Token Selection & Video Playhead Sync
      container.querySelectorAll('.caption-word-token').forEach(function (wordChip) {
        wordChip.addEventListener('click', function (e) {
          if (e.target.closest('.word-token-tint-btn') ||
              e.target.closest('.word-color-clear-btn') ||
              e.target.closest('.word-token-edit-btn') ||
              e.target.closest('.word-token-input')) {
            return;
          }
          e.stopPropagation();
          var segId = wordChip.dataset.segId;
          var wordId = wordChip.dataset.wordId;
          var segIdx = parseInt(wordChip.closest('.caption-segment-card').dataset.index, 10);
          var wordIdx = parseInt(wordChip.dataset.wordIdx, 10);

          var state = CaptionStore.getState();
          var seg = (state.segments || [])[segIdx];
          var word = seg && seg.words ? seg.words[wordIdx] : null;

          CaptionStore.setState({ selectedSegmentId: segId, selectedWordId: wordId }, false);

          var video = $('video-player-el');
          if (video) {
            var targetTime = (word && isFinite(word.start)) ? word.start : (seg ? seg.start : 0);
            video.currentTime = targetTime;
            if (typeof updateVideoProgressUI === 'function') updateVideoProgressUI();
          }
        });

        // Double Click to Edit Word
        wordChip.addEventListener('dblclick', function (e) {
          e.stopPropagation();
          var segId = wordChip.dataset.segId;
          var wordId = wordChip.dataset.wordId;
          _editingWordState = { segId: segId, wordId: wordId };
          renderProCaptionsList();
        });
      });

      // 5. Word Edit Buttons
      container.querySelectorAll('.word-token-edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var segId = btn.dataset.segId;
          var wordId = btn.dataset.wordId;
          _editingWordState = { segId: segId, wordId: wordId };
          renderProCaptionsList();
        });
      });

      // 6. Word Token Mini Input Handlers
      container.querySelectorAll('.word-token-input').forEach(function (wordInput) {
        function commitWordEdit() {
          if (!_editingWordState) return;
          var segId = wordInput.dataset.segId;
          var wordId = wordInput.dataset.wordId;
          var newWordText = wordInput.value.trim();

          var state = CaptionStore.getState();
          var currentSegments = (state.segments || []).slice();
          var segIdx = currentSegments.findIndex(function (s) { return s.id === segId; });

          if (segIdx !== -1) {
            var seg = Object.assign({}, currentSegments[segIdx]);
            var words = (seg.words || []).slice();
            var wordIdx = words.findIndex(function (w) { return w.id === wordId; });

            if (wordIdx !== -1) {
              words[wordIdx] = Object.assign({}, words[wordIdx], { text: newWordText || words[wordIdx].text });
              seg.words = words;
              seg.text = words.map(function (w) { return w.text; }).join(' ');
              currentSegments[segIdx] = seg;
              CaptionStore.setState({ segments: currentSegments }, true);
            }
          }

          _editingWordState = null;
          renderProCaptionsList();
          updateVideoSubtitleOverlay();
        }

        wordInput.addEventListener('blur', commitWordEdit);
        wordInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            wordInput.blur();
          } else if (e.key === 'Escape') {
            _editingWordState = null;
            renderProCaptionsList();
          }
        });
      });

      // 7. Per-Word Color Tint Popover Launcher
      container.querySelectorAll('.word-token-tint-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var segIdx = parseInt(btn.dataset.segIdx, 10);
          var wordIdx = parseInt(btn.dataset.wordIdx, 10);

          var state = CaptionStore.getState();
          var seg = (state.segments || [])[segIdx];
          var word = seg && seg.words ? seg.words[wordIdx] : null;
          if (!word) return;

          var currentColor = word.colorOverride || '#FFD700';
          if (typeof openCustomColorPicker === 'function') {
            openCustomColorPicker(currentColor, function (newColor) {
              var currentSegments = (CaptionStore.getState().segments || []).slice();
              if (currentSegments[segIdx] && currentSegments[segIdx].words[wordIdx]) {
                var updatedSeg = Object.assign({}, currentSegments[segIdx]);
                var updatedWords = updatedSeg.words.slice();
                updatedWords[wordIdx] = Object.assign({}, updatedWords[wordIdx], { colorOverride: newColor });
                updatedSeg.words = updatedWords;
                currentSegments[segIdx] = updatedSeg;
                CaptionStore.setState({ segments: currentSegments }, true);
                renderProCaptionsList();
                updateVideoSubtitleOverlay();
              }
            });
          }
        });
      });

      // 8. Clear Color Tint Button
      container.querySelectorAll('.word-color-clear-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var segIdx = parseInt(btn.dataset.segIdx, 10);
          var wordIdx = parseInt(btn.dataset.wordIdx, 10);

          var currentSegments = (CaptionStore.getState().segments || []).slice();
          if (currentSegments[segIdx] && currentSegments[segIdx].words[wordIdx]) {
            var updatedSeg = Object.assign({}, currentSegments[segIdx]);
            var updatedWords = updatedSeg.words.slice();
            updatedWords[wordIdx] = Object.assign({}, updatedWords[wordIdx], { colorOverride: null });
            updatedSeg.words = updatedWords;
            currentSegments[segIdx] = updatedSeg;
            CaptionStore.setState({ segments: currentSegments }, true);
            renderProCaptionsList();
            updateVideoSubtitleOverlay();
          }
        });
      });

      // 9. Three-Dot Segment Dropdown Menu Button
      container.querySelectorAll('.caption-segment-more-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var idx = parseInt(btn.dataset.idx, 10);
          var parentActions = btn.closest('.caption-segment-actions');
          if (!parentActions) return;

          var existing = parentActions.querySelector('.caption-segment-dropdown');
          closeAllSegmentDropdowns();
          if (existing) return;

          var state = CaptionStore.getState();
          var isLast = (idx === (state.segments || []).length - 1);

          var dropdown = document.createElement('div');
          dropdown.className = 'caption-segment-dropdown';
          dropdown.innerHTML = 
            '<div class="dropdown-item" data-action="split"><i class="ph-fill ph-scissors" style="font-size:13px;"></i> Split Segment</div>' +
            '<div class="dropdown-item' + (isLast ? ' disabled' : '') + '" data-action="merge"><i class="ph-fill ph-arrows-merge" style="font-size:13px;"></i> Merge with Next</div>' +
            '<div class="dropdown-item danger" data-action="delete"><i class="ph-fill ph-trash" style="font-size:13px;"></i> Delete Segment</div>';

          dropdown.querySelectorAll('.dropdown-item').forEach(function (item) {
            item.addEventListener('click', function (itemEvt) {
              itemEvt.stopPropagation();
              var action = item.dataset.action;
              closeAllSegmentDropdowns();

              if (action === 'split') {
                splitSegmentAtIndex(idx);
              } else if (action === 'merge') {
                mergeSegmentWithNext(idx);
              } else if (action === 'delete') {
                deleteSegmentAtIndex(idx);
              }
              renderProCaptionsList();
              updateVideoSubtitleOverlay();
            });
          });

          parentActions.appendChild(dropdown);
          refreshLucideIcons();
        });
      });
    }

    // Global Click Listener to Close Dropdown Menus
    if (typeof document !== 'undefined') {
      document.addEventListener('click', function (e) {
        if (e.target && !e.target.closest('.caption-segment-actions')) {
          closeAllSegmentDropdowns();
        }
      });
    }

    var _subOverlayRafId = null;
    var _lastRenderedWordsHTML = '';
    var _lastRenderedSegId = null;

    function startSubOverlayLoop() {
      if (_subOverlayRafId) cancelAnimationFrame(_subOverlayRafId);
      function loop() {
        var video = $('video-player-el');
        if (video && !video.paused) {
          updateVideoSubtitleOverlay();
          _subOverlayRafId = requestAnimationFrame(loop);
        }
      }
      _subOverlayRafId = requestAnimationFrame(loop);
    }

    function updateVideoSubtitleOverlay(forceRefresh) {
      var video = $('video-player-el');
      var currTime = video ? (video.currentTime || 0) : 0;
      var isPlaying = video ? !video.paused : false;
      var state = CaptionStore.getState();

      var frameSpec = resolveCaptionFrame(currTime, 1280, 720);

      // Fallback to selectedSegmentId if video is paused & no segment active
      if (!frameSpec && !isPlaying && state.selectedSegmentId) {
        var selSeg = (state.segments || []).find(function (s) { return s.id === state.selectedSegmentId; });
        if (selSeg) {
          frameSpec = resolveCaptionFrame(selSeg.start + 0.05, 1280, 720);
        }
      }

      var subBoxEl = $('video-subtitle-text');
      var overlayEl = $('video-subtitle-overlay');

      if (frameSpec && frameSpec.words && frameSpec.words.length > 0) {
        var wordsHTML = frameSpec.words.map(function (w) {
          var cls = 'gradial-word' + (w.isActive ? ' gradial-word-active' : '');
          var styleAttr = '';
          if (w.isActive && frameSpec.activeWordColor) {
            styleAttr = ' style="color:' + escapeHTML(frameSpec.activeWordColor) + ' !important;"';
          } else if (w.colorOverride) {
            styleAttr = ' style="color:' + escapeHTML(w.colorOverride) + ' !important;"';
          }
          return '<span class="' + cls + '"' + styleAttr + '>' + escapeHTML(w.text) + '</span>';
        }).join(' ');

        if (!forceRefresh && _lastRenderedWordsHTML === wordsHTML && _lastRenderedSegId === frameSpec.segmentId) {
          if (overlayEl) show(overlayEl);
          if ($('pro-canvas-overlay')) show($('pro-canvas-overlay'));
          return;
        }

        _lastRenderedWordsHTML = wordsHTML;
        _lastRenderedSegId = frameSpec.segmentId;

        if (subBoxEl) {
          subBoxEl.innerHTML = wordsHTML;
          applyGlobalStyleToOverlay();
        }
        if (overlayEl) show(overlayEl);
        if ($('pro-canvas-overlay')) show($('pro-canvas-overlay'));
      } else {
        _lastRenderedWordsHTML = '';
        _lastRenderedSegId = null;
        var fontsTab = $('drawer-tab-text');
        var isFontsActive = fontsTab && !fontsTab.classList.contains('hidden');

        if (isFontsActive && subBoxEl) {
          subBoxEl.innerHTML = '<span class="gradial-word gradial-word-active">Sample Subtitle Preview</span>';
          applyGlobalStyleToOverlay();
          if (overlayEl) show(overlayEl);
          if ($('pro-canvas-overlay')) show($('pro-canvas-overlay'));
        } else {
          if (overlayEl) hide(overlayEl);
        }
      }
    }

    // =========================================================
    // MILESTONE 4: INTERACTIVE TIMELINE TRACK & PLAYHEAD SYNC
    // =========================================================
    var _isTimelineDragging = false;

    function getTimelinePixelsPerSecond() {
      var zoomSlider = typeof document !== 'undefined' ? document.getElementById('timeline-zoom-slider') : null;
      var zoomScale = zoomSlider ? (parseFloat(zoomSlider.value) || 1.0) : 1.0;
      return 60 * zoomScale;
    }

    function formatTimecode(seconds) {
      if (isNaN(seconds) || seconds < 0) seconds = 0;
      var hrs = Math.floor(seconds / 3600);
      var mins = Math.floor((seconds % 3600) / 60);
      var secs = Math.floor(seconds % 60);
      var ms = Math.floor((seconds % 1) * 100);

      var mStr = String(mins).padStart(2, '0');
      var sStr = String(secs).padStart(2, '0');
      var msStr = String(ms).padStart(2, '0');

      if (hrs > 0) {
        var hStr = String(hrs).padStart(2, '0');
        return hStr + ':' + mStr + ':' + sStr + '.' + msStr;
      }
      return mStr + ':' + sStr + '.' + msStr;
    }

    function renderProTimeline() {
      if (typeof document === 'undefined') return;
      var scrollContainer = $('pro-timeline-track-scroll');
      var trackContent = $('pro-timeline-track-content');
      var rulerEl = $('pro-timeline-ruler');
      var blocksLayer = $('pro-timeline-blocks-layer');
      var video = $('video-player-el');

      if (!blocksLayer || !rulerEl || !trackContent) return;

      var pps = getTimelinePixelsPerSecond();
      var segments = CaptionStore.getSegments();
      var state = CaptionStore.getState();

      var videoDur = (video && !isNaN(video.duration) && video.duration > 0) ? video.duration : 0;
      var maxSegEnd = 0;
      segments.forEach(function (s) {
        if (s.end > maxSegEnd) maxSegEnd = s.end;
      });
      var totalSec = Math.max(videoDur, maxSegEnd, 10);

      var containerWidth = scrollContainer ? scrollContainer.clientWidth : 800;
      var totalWidth = Math.max(containerWidth, Math.ceil(totalSec * pps + 100));

      trackContent.style.width = totalWidth + 'px';

      // 1. Render Ruler Ticks
      rulerEl.innerHTML = '';
      var tickStep = pps >= 120 ? 1 : (pps >= 60 ? 2 : 5);
      for (var sec = 0; sec <= totalSec + 5; sec += tickStep) {
        var posX = sec * pps;
        if (posX > totalWidth) break;
        var tick = document.createElement('div');
        tick.style.position = 'absolute';
        tick.style.left = posX + 'px';
        tick.style.top = '0';
        tick.style.bottom = '0';
        tick.style.borderLeft = '1px solid rgba(255,255,255,0.12)';
        tick.style.paddingLeft = '5px';
        tick.style.paddingTop = '2px';
        tick.style.fontSize = '0.65rem';
        tick.style.fontFamily = "'JetBrains Mono', 'Roboto Mono', monospace";
        tick.style.fontWeight = '600';
        tick.style.color = '#94a3b8';
        tick.style.userSelect = 'none';
        tick.style.pointerEvents = 'none';
        tick.style.fontVariantNumeric = 'tabular-nums';

        var mins = Math.floor(sec / 60);
        var secs = sec % 60;
        tick.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        rulerEl.appendChild(tick);
      }

      // 2. Render Blocks Layer
      blocksLayer.innerHTML = '';
      var activeTemplate = (state.globalStyle && (state.globalStyle.templateId || state.globalStyle.presetId)) ? (state.globalStyle.templateId || state.globalStyle.presetId) : 'aero_bubble';
      var templateAccents = {
        'aero_bubble': { bg: 'rgba(45, 212, 160, 0.18)', border: '#2dd4a0', text: '#eafff6' },
        'luna_glass': { bg: 'rgba(59, 130, 246, 0.22)', border: '#3b82f6', text: '#eff6ff' },
        'terminal_type': { bg: 'rgba(57, 255, 20, 0.18)', border: '#39ff14', text: '#f0fdf4' },
        'nord_frost': { bg: 'rgba(136, 192, 208, 0.22)', border: '#88c0d0', text: '#eceff4' },
        'synth_neon': { bg: 'rgba(255, 46, 151, 0.22)', border: '#ff2e97', text: '#fff1f2' }
      };
      var acc = templateAccents[activeTemplate] || templateAccents['aero_bubble'];

      segments.forEach(function (seg) {
        var left = Math.round(seg.start * pps);
        var width = Math.max(36, Math.round((seg.end - seg.start) * pps));

        var block = document.createElement('div');
        block.className = 'clip-block clip-block--caption pro-timeline-block' + (seg.id === state.selectedSegmentId ? ' selected active-block' : '');
        block.dataset.id = seg.id;
        block.style.left = left + 'px';
        block.style.width = width + 'px';
        block.title = (seg.text || '') + ' (' + seg.start.toFixed(2) + 's - ' + seg.end.toFixed(2) + 's)';

        block.innerHTML =
          '<span class="clip-resize-handle clip-resize-handle--start block-handle-left" data-action="resize-left" title="Drag to adjust start"></span>' +
          (width > 50 ? '<i class="ph-fill ph-text-t" style="font-size:11px; flex-shrink:0;"></i>' : '') +
          '<span class="clip-caption-text">' + escapeHTML(seg.text || 'Caption') + '</span>' +
          '<span class="clip-resize-handle clip-resize-handle--end block-handle-right" data-action="resize-right" title="Drag to adjust end"></span>';

        block.addEventListener('click', function (e) {
          if (_isTimelineDragging) return;
          e.stopPropagation();
          CaptionStore.setState({ selectedSegmentId: seg.id, selectedWordId: null }, false);
          if (video) {
            video.currentTime = seg.start;
            updateProTimelinePlayhead();
          }
        });

        attachBlockDragHandlers(block, seg);
        blocksLayer.appendChild(block);
      });

      // 3. Update Playhead Position & Timecode
      updateProTimelinePlayhead();
    }

    function updateProTimelinePlayhead() {
      if (typeof document === 'undefined') return;
      var playheadEl = $('pro-timeline-playhead');
      var video = $('video-player-el');
      var timecodeEl = $('pro-timeline-timecode');
      var pps = getTimelinePixelsPerSecond();

      var curTime = video ? (video.currentTime || 0) : 0;
      var totalDur = video ? (video.duration || 0) : 0;

      if (playheadEl) {
        playheadEl.style.left = (curTime * pps) + 'px';
      }

      if (timecodeEl) {
        timecodeEl.textContent = formatTimecode(curTime) + ' / ' + formatTimecode(totalDur);
      }
    }

    function attachBlockDragHandlers(blockEl, seg) {
      var leftHandle = blockEl.querySelector('.block-handle-left');
      var rightHandle = blockEl.querySelector('.block-handle-right');

      function startDrag(e, dragType) {
        if (_isTimelineDragging) return;
        e.stopPropagation();
        if (e.preventDefault) e.preventDefault();

        _isTimelineDragging = true;
        var segId = seg.id;
        var startX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        var initialStart = seg.start;
        var initialEnd = seg.end;
        var pps = getTimelinePixelsPerSecond();
        var video = $('video-player-el');

        CaptionStore.setState({ selectedSegmentId: segId, selectedWordId: null }, false);

        function onMove(moveEvt) {
          if (!_isTimelineDragging) return;
          var currentX = moveEvt.clientX || (moveEvt.touches && moveEvt.touches[0] ? moveEvt.touches[0].clientX : 0);
          var deltaX = currentX - startX;
          var deltaTime = deltaX / pps;

          if (dragType === 'resize-left') {
            var newStart = Math.max(0, Math.min(initialEnd - 0.1, initialStart + deltaTime));
            CaptionStore.updateSegmentBounds(segId, newStart, initialEnd, false);
            if (video) video.currentTime = newStart;
          } else if (dragType === 'resize-right') {
            var newEnd = Math.max(initialStart + 0.1, initialEnd + deltaTime);
            CaptionStore.updateSegmentBounds(segId, initialStart, newEnd, false);
            if (video) video.currentTime = newEnd;
          } else if (dragType === 'move') {
            var newStartPos = Math.max(0, initialStart + deltaTime);
            CaptionStore.moveSegment(segId, newStartPos, false);
            if (video) video.currentTime = newStartPos;
          }
          updateProTimelinePlayhead();
        }

        function onEnd() {
          if (!_isTimelineDragging) return;
          _isTimelineDragging = false;

          if (typeof window !== 'undefined') {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
          }

          CaptionStore.setState({ segments: CaptionStore.getSegments() }, true);
          if (typeof renderProCaptionsList === 'function') renderProCaptionsList();
          if (typeof updateVideoSubtitleOverlay === 'function') updateVideoSubtitleOverlay();
        }

        if (typeof window !== 'undefined') {
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onEnd);
          window.addEventListener('touchmove', onMove, { passive: false });
          window.addEventListener('touchend', onEnd);
        }
      }

      if (leftHandle) {
        leftHandle.addEventListener('mousedown', function (e) { startDrag(e, 'resize-left'); });
        leftHandle.addEventListener('touchstart', function (e) { startDrag(e, 'resize-left'); }, { passive: false });
      }

      if (rightHandle) {
        rightHandle.addEventListener('mousedown', function (e) { startDrag(e, 'resize-right'); });
        rightHandle.addEventListener('touchstart', function (e) { startDrag(e, 'resize-right'); }, { passive: false });
      }

      blockEl.addEventListener('mousedown', function (e) {
        if (e.target.closest('.block-handle-left') || e.target.closest('.block-handle-right')) return;
        startDrag(e, 'move');
      });
      blockEl.addEventListener('touchstart', function (e) {
        if (e.target.closest('.block-handle-left') || e.target.closest('.block-handle-right')) return;
        startDrag(e, 'move');
      }, { passive: false });
    }

    function initProTimelineEvents() {
      if (typeof document === 'undefined') return;
      var trackScroll = $('pro-timeline-track-scroll');
      var trackContent = $('pro-timeline-track-content');
      var zoomSlider = $('timeline-zoom-slider');
      var video = $('video-player-el');

      if (zoomSlider) {
        zoomSlider.addEventListener('input', function () {
          renderProTimeline();
        });
        zoomSlider.addEventListener('change', function () {
          renderProTimeline();
        });
      }

      if (trackContent) {
        var isScrubbing = false;

        function seekTimelineToMouse(e) {
          var rect = trackContent.getBoundingClientRect();
          var pps = getTimelinePixelsPerSecond();
          var clickX = e.clientX - rect.left;
          var targetTime = Math.max(0, clickX / pps);

          if (video) {
            video.currentTime = targetTime;
            updateProTimelinePlayhead();
          }
        }

        trackContent.addEventListener('mousedown', function (e) {
          if (e.target.closest('.pro-timeline-block')) return;
          isScrubbing = true;
          seekTimelineToMouse(e);

          function onScrubMove(moveEvt) {
            if (!isScrubbing) return;
            seekTimelineToMouse(moveEvt);
          }

          function onScrubEnd() {
            isScrubbing = false;
            if (typeof window !== 'undefined') {
              window.removeEventListener('mousemove', onScrubMove);
              window.removeEventListener('mouseup', onScrubEnd);
            }
          }

          if (typeof window !== 'undefined') {
            window.addEventListener('mousemove', onScrubMove);
            window.addEventListener('mouseup', onScrubEnd);
          }
        });
      }

      if (video) {
        video.addEventListener('timeupdate', function () {
          updateProTimelinePlayhead();
        });
      }

      var btnAddSubtitle = $('btn-timeline-add-subtitle');
      var btnUndo = $('btn-timeline-undo');
      var btnRedo = $('btn-timeline-redo');
      var btnSplit = $('btn-timeline-split');
      var btnDelete = $('btn-timeline-delete');

      if (btnAddSubtitle) {
        btnAddSubtitle.addEventListener('click', function () {
          var video = $('video-player-el');
          var curTime = video ? (video.currentTime || 0) : 0;
          var startTime = Math.max(0, curTime);
          var endTime = startTime + 2.5;

          var newSeg = {
            id: 'seg_' + Date.now(),
            start: parseFloat(startTime.toFixed(2)),
            end: parseFloat(endTime.toFixed(2)),
            text: 'New Subtitle Text',
            words: [
              { id: 'w_' + Date.now() + '_1', text: 'New', start: parseFloat(startTime.toFixed(2)), end: parseFloat((startTime + 0.8).toFixed(2)) },
              { id: 'w_' + Date.now() + '_2', text: 'Subtitle', start: parseFloat((startTime + 0.8).toFixed(2)), end: parseFloat((startTime + 1.6).toFixed(2)) },
              { id: 'w_' + Date.now() + '_3', text: 'Text', start: parseFloat((startTime + 1.6).toFixed(2)), end: parseFloat(endTime.toFixed(2)) }
            ]
          };

          CaptionStore.addSegment(newSeg);
          if (typeof renderProCaptionsList === 'function') renderProCaptionsList();
          if (typeof renderProTimeline === 'function') renderProTimeline();
          if (typeof updateVideoSubtitleOverlay === 'function') updateVideoSubtitleOverlay();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        });
      }

      if (btnUndo) {
        btnUndo.addEventListener('click', function () {
          CaptionStore.undo();
        });
      }

      if (btnRedo) {
        btnRedo.addEventListener('click', function () {
          CaptionStore.redo();
        });
      }

      if (btnSplit) {
        btnSplit.addEventListener('click', function () {
          var state = CaptionStore.getState();
          var video = $('video-player-el');
          var curTime = video ? video.currentTime : null;
          CaptionStore.splitSegmentAt(state.selectedSegmentId, curTime);
        });
      }

      if (btnDelete) {
        btnDelete.addEventListener('click', function () {
          var state = CaptionStore.getState();
          if (state.selectedSegmentId) {
            CaptionStore.deleteSegment(state.selectedSegmentId);
          }
        });
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', function (e) {
          var activeTag = document.activeElement ? document.activeElement.tagName : '';
          var isEditingText = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || (document.activeElement && document.activeElement.isContentEditable);
          if (isEditingText) return;

          var isCtrlOrCmd = e.ctrlKey || e.metaKey;

          if (isCtrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            e.preventDefault();
            CaptionStore.undo();
          } else if ((isCtrlOrCmd && e.key.toLowerCase() === 'y') || (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z')) {
            e.preventDefault();
            CaptionStore.redo();
          } else if (e.key === 'Delete' || e.key === 'Backspace') {
            var state = CaptionStore.getState();
            if (state.selectedSegmentId) {
              e.preventDefault();
              CaptionStore.deleteSegment(state.selectedSegmentId);
            }
          } else if (e.key.toLowerCase() === 's' && (!isCtrlOrCmd || isCtrlOrCmd)) {
            e.preventDefault();
            var state = CaptionStore.getState();
            var video = $('video-player-el');
            var curTime = video ? video.currentTime : null;
            CaptionStore.splitSegmentAt(state.selectedSegmentId, curTime);
          }
        });
      }
    }

    if (typeof window !== 'undefined') {
      window.renderProTimeline = renderProTimeline;
      window.updateProTimelinePlayhead = updateProTimelinePlayhead;
      window.initProTimelineEvents = initProTimelineEvents;
      window.getTimelinePixelsPerSecond = getTimelinePixelsPerSecond;
      window.formatTimecode = formatTimecode;
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.renderProTimeline = renderProTimeline;
      globalThis.updateProTimelinePlayhead = updateProTimelinePlayhead;
      globalThis.initProTimelineEvents = initProTimelineEvents;
      globalThis.getTimelinePixelsPerSecond = getTimelinePixelsPerSecond;
      globalThis.formatTimecode = formatTimecode;
    }

    function loadDemoSampleVideo() {
      try {
        if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
        if (typeof showToast === 'function') showToast('Generating Interactive Demo Video...', 2500);
        var video = $('video-player-el');
        if (!video) return;

        var canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        var ctx = canvas.getContext('2d');

        var stream = canvas.captureStream(30);
        var recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        var chunks = [];

        recorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        recorder.onstop = function () {
          var blob = new Blob(chunks, { type: 'video/webm' });
          var url = URL.createObjectURL(blob);
          video.src = url;
          video.load();
          video.style.display = 'block';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.objectFit = 'contain';
          show(video);
          show($('video-controls-bar'));
          show($('pro-canvas-overlay'));
          if ($('video-empty-state')) {
            $('video-empty-state').classList.add('hidden');
            $('video-empty-state').style.display = 'none';
          }
          if ($('video-dropzone')) {
            $('video-dropzone').classList.add('hidden');
            $('video-dropzone').style.display = 'none';
          }

          if ($('video-file-name')) $('video-file-name').textContent = 'Gradial_Demo_Sample.mp4';

          video.onloadedmetadata = function () {
            if (typeof updateVideoProgressUI === 'function') updateVideoProgressUI();
            if (typeof renderProTimeline === 'function') renderProTimeline();
            if (typeof applyGlobalStyleToOverlay === 'function') applyGlobalStyleToOverlay();
          };

          var sampleSegs = [
            {
              id: 'seg_demo_1',
              start: 0.0,
              end: 2.5,
              text: 'Welcome to Gradial Video Studio!',
              words: [
                { id: 'w1', text: 'Welcome', start: 0.0, end: 0.8 },
                { id: 'w2', text: 'to', start: 0.8, end: 1.2 },
                { id: 'w3', text: 'Gradial', start: 1.2, end: 1.8 },
                { id: 'w4', text: 'Video', start: 1.8, end: 2.2 },
                { id: 'w5', text: 'Studio!', start: 2.2, end: 2.5 }
              ]
            },
            {
              id: 'seg_demo_2',
              start: 2.5,
              end: 5.5,
              text: 'Edit AI subtitles word by word live.',
              words: [
                { id: 'w6', text: 'Edit', start: 2.5, end: 3.1 },
                { id: 'w7', text: 'AI', start: 3.1, end: 3.6 },
                { id: 'w8', text: 'subtitles', start: 3.6, end: 4.3 },
                { id: 'w9', text: 'word', start: 4.3, end: 4.7 },
                { id: 'w10', text: 'by', start: 4.7, end: 4.9 },
                { id: 'w11', text: 'word', start: 4.9, end: 5.2 },
                { id: 'w12', text: 'live.', start: 5.2, end: 5.5 }
              ]
            },
            {
              id: 'seg_demo_3',
              start: 5.5,
              end: 8.0,
              text: 'Export styled videos with karaoke effects!',
              words: [
                { id: 'w13', text: 'Export', start: 5.5, end: 6.1 },
                { id: 'w14', text: 'styled', start: 6.1, end: 6.6 },
                { id: 'w15', text: 'videos', start: 6.6, end: 7.1 },
                { id: 'w16', text: 'with', start: 7.1, end: 7.4 },
                { id: 'w17', text: 'karaoke', start: 7.4, end: 7.7 },
                { id: 'w18', text: 'effects!', start: 7.7, end: 8.0 }
              ]
            }
          ];

          if (typeof CaptionStore !== 'undefined' && CaptionStore.setState) {
            CaptionStore.setState({ segments: sampleSegs }, true);
          }
          if (typeof renderProCaptionsList === 'function') renderProCaptionsList();
          if (typeof renderProTimeline === 'function') renderProTimeline();
          if (typeof showToast === 'function') showToast('Demo Sample Video & Captions Loaded!', 3000);
        };

        recorder.start();
        var durationMs = 800;
        var fps = 30;
        var interval = 1000 / fps;
        var elapsed = 0;

        function animate() {
          elapsed += interval;
          var t = elapsed / 1000;

          var grad = ctx.createLinearGradient(0, 0, 1280, 720);
          var h1 = (t * 30) % 360;
          var h2 = (h1 + 120) % 360;
          grad.addColorStop(0, 'hsl(' + h1 + ', 75%, 12%)');
          grad.addColorStop(1, 'hsl(' + h2 + ', 75%, 8%)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1280, 720);

          for (var i = 0; i < 24; i++) {
            var px = (Math.sin(t * 0.8 + i) * 0.5 + 0.5) * 1280;
            var py = (Math.cos(t * 0.6 + i * 1.5) * 0.5 + 0.5) * 720;
            var pr = 12 + Math.sin(t * 2 + i) * 8;
            ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = 'rgba(18, 24, 36, 0.85)';
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(440, 260, 400, 180, 20);
          } else {
            ctx.rect(440, 260, 400, 180);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#00FF88';
          ctx.font = '900 24px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('GRADIAL VIDEO STUDIO', 640, 320);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '600 16px Inter, sans-serif';
          ctx.fillText('Interactive Demo Sample • 1080p', 640, 360);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '600 14px monospace';
          ctx.fillText('00:0' + Math.floor(t) + '.00 / 00:08.00', 640, 400);

          if (elapsed < durationMs) {
            setTimeout(animate, interval);
          } else {
            recorder.stop();
          }
        }
        animate();
      } catch(ex) {
        console.error('loadDemoSampleVideo error:', ex);
      }
    }

    function initToneWarmthStylePad() {
      initStylePad({
        touchId: 'vid-style-pad-touch',
        dotsId: 'vid-style-pad-dots',
        puckId: 'vid-style-pad-puck',
        glowId: 'vid-style-pad-glow',
        readoutId: 'vid-style-pad-readout',
        resetBtnId: 'btn-reset-tone-warmth',
        onChange: function (tone, warmth) {
          state.vidStylePad = { tone: tone, warmth: warmth };
          refreshVideoGrading();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
          if (typeof showToast === 'function') showToast('Tone & Warmth reset to default', 2000);
        }
      });
    }



    function renderTemplateCards() {
      var grid = $('vs-templates-grid') || $('gradial-templates-grid');
      if (!grid) return;

      var templates = [
        {
          id: 'beast_pop',
          name: 'Gradial HyperPop 3D',
          desc: 'High-energy 3D title with dynamic active word bounce',
          previewHTML: '<span style="font-weight:900; font-family:\'Impact\',sans-serif; font-size:1.1rem; color:#FFF; -webkit-text-stroke:2px #000; filter:drop-shadow(0 3px 0 #000);">THE <span style="color:#FFE600; -webkit-text-fill-color:#FFE600; font-size:1.25rem;">QUICK</span></span>',
          style: { fontFamily: 'Impact, sans-serif', fontWeight: '900', color: '#FFFFFF', backgroundColor: 'transparent' }
        },
        {
          id: 'beast_gold',
          name: 'Gradial Amber Spark',
          desc: 'Vibrant gold headline with deep volumetric shadow',
          previewHTML: '<span style="font-weight:900; font-family:\'Outfit\',sans-serif; color:#FFE600; text-shadow:2px 2px 0 #000;">The quick <span style="color:#FFF; text-shadow:0 0 10px #FFE600, 2px 2px 0 #000;">brown</span> fox</span>',
          style: { fontFamily: 'Outfit, sans-serif', fontWeight: '900', color: '#FFE600', backgroundColor: 'transparent' }
        },
        {
          id: 'gadzhi_clean',
          name: 'Gradial Pure Luxe',
          desc: 'Minimalist dark glass pill with emerald active glow',
          previewHTML: '<span style="font-weight:800; font-family:\'Plus Jakarta Sans\',sans-serif; color:#FFF;">The quick <span style="color:#00FF88; text-shadow:0 0 8px #00FF88;">brown</span> fox</span>',
          style: { fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: '800', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.85)' }
        },
        {
          id: 'editorial_delhi',
          name: 'Gradial Velvet Editorial',
          desc: 'Classic serif & sans-serif hybrid with glowing radial aura',
          previewHTML: '<span style="font-weight:700; font-family:\'Playfair Display\',serif; color:#FFF;">The quick <span style="font-style:italic; color:#00FFCC; text-shadow:0 0 14px #00FFCC;">brown</span> fox</span>',
          style: { fontFamily: 'Playfair Display, serif', fontWeight: '700', color: '#FFFFFF', backgroundColor: 'rgba(15,17,16,0.9)' }
        },
        {
          id: 'abdaal_pill',
          name: 'Gradial Frost Capsule',
          desc: 'Clean white frosted pill container with cyan word contrast',
          previewHTML: '<span style="font-weight:800; font-family:\'Inter\',sans-serif; color:#111827; background:#FFF; padding:4px 12px; border-radius:99px;">The quick <span style="color:#00E5FF;">brown</span></span>',
          style: { fontFamily: 'Inter, sans-serif', fontWeight: '800', color: '#111827', backgroundColor: '#FFFFFF' }
        },
        {
          id: 'viral_pop',
          name: 'Gradial Kinetic Pop',
          desc: 'ALL CAPS dynamic pop-up text with electric green highlight',
          previewHTML: '<span style="font-weight:900; font-family:\'Outfit\',sans-serif; color:#FFF;">WE DIDNT <span style="color:#39FF14; font-size:1.15rem; text-shadow:0 0 10px #39FF14;">MAKE</span> MONEY</span>',
          style: { fontFamily: 'Outfit, sans-serif', fontWeight: '900', color: '#FFFFFF', backgroundColor: 'transparent' }
        },
        {
          id: 'shadow_impact',
          name: 'Gradial 3D Impact',
          desc: 'Dual-line extruded 3D title with warm amber radiance',
          previewHTML: '<span style="font-weight:900; font-family:\'Impact\',sans-serif; color:#FFB703; text-shadow:2px 2px 0 #000;">WELCOME <span style="color:#FFF; text-shadow:0 0 10px #FFB703;">HOME</span></span>',
          style: { fontFamily: 'Impact, sans-serif', fontWeight: '900', color: '#FFB703', backgroundColor: 'transparent' }
        },
        {
          id: 'mumbai_script',
          name: 'Gradial Neon Calligraphy',
          desc: 'Condensed yellow lead with italic script accent backlight',
          previewHTML: '<span style="font-weight:800; font-family:\'Oswald\',sans-serif; color:#FFE600;">THE QUICK <span style="font-family:\'Playfair Display\',serif; font-style:italic; color:#FFF; text-shadow:0 0 10px #FFE600;">brown</span></span>',
          style: { fontFamily: 'Oswald, sans-serif', fontWeight: '800', color: '#FFE600', backgroundColor: 'rgba(10,10,10,0.88)' }
        },
        {
          id: 'shamani_glow',
          name: 'Gradial Solar Aura',
          desc: 'Wide tracking uppercase title with soft solar halo',
          previewHTML: '<span style="font-weight:900; font-family:\'Outfit\',sans-serif; color:#FFF;">THE QUICK <span style="color:#FFE600; text-shadow:0 0 10px #FFE600;">BROWN</span></span>',
          style: { fontFamily: 'Outfit, sans-serif', fontWeight: '900', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.82)' }
        },
        {
          id: 'cyber_kalakar',
          name: 'Gradial Cyber Matrix',
          desc: 'High-contrast neon green matrix title with ambient backlight',
          previewHTML: '<span style="font-weight:900; font-family:\'Space Grotesk\',sans-serif; color:#39FF14; text-shadow:0 0 12px #39FF14;">WELCOME <span style="color:#FFF;">TO GRADIAL</span></span>',
          style: { fontFamily: 'Space Grotesk, sans-serif', fontWeight: '900', color: '#39FF14', backgroundColor: 'rgba(5,15,8,0.92)' }
        },
        {
          id: 'bubble_3d',
          name: 'Gradial Signature Cyan',
          desc: 'Default glossy cyan glass pill with vibrant outer aura',
          previewHTML: '<span style="font-weight:900; font-family:\'Outfit\',sans-serif; color:#FFF; background:linear-gradient(180deg,#005577,#001A2C); padding:4px 12px; border-radius:99px; border:1px solid #00F0FF;">QUICK <span style="color:#00E5FF;">BROWN</span></span>',
          style: { fontFamily: 'Outfit, sans-serif', fontWeight: '900', color: '#FFFFFF', backgroundColor: 'rgba(0, 85, 119, 0.9)' }
        }
      ];

      grid.innerHTML = '';
      templates.forEach(function (tmpl) {
        var card = document.createElement('div');
        var currentState = CaptionStore.getState();
        var isAct = currentState.globalStyle && (currentState.globalStyle.templateId === tmpl.id || currentState.globalStyle.presetId === tmpl.id);
        card.className = 'gradial-template-card' + (isAct ? ' active-template' : '');

        card.innerHTML = 
          '<div class="template-card-name" style="font-weight:800; font-size:0.84rem; color:var(--text-white); margin-bottom:2px;">' + tmpl.name + '</div>' +
          '<div class="template-card-desc" style="font-size:0.72rem; color:var(--text-sub); margin-bottom:8px;">' + tmpl.desc + '</div>' +
          '<div class="template-card-preview-wrap" style="padding: 12px; display: flex; justify-content: center; align-items: center; min-height: 52px; background: rgba(0,0,0,0.6); border-radius: 10px; border: 1px solid var(--border-subtle);">' +
            tmpl.previewHTML +
          '</div>';

        card.addEventListener('click', function () {
          var currentGS = CaptionStore.getState().globalStyle || {};
          currentGS.presetId = tmpl.id;
          currentGS.templateId = tmpl.id;
          currentGS.fontFamily = tmpl.style.fontFamily.split(',')[0].trim();
          currentGS.solidColor = tmpl.style.color;
          currentGS.backgroundColor = tmpl.style.backgroundColor;
          currentGS.fontWeight = tmpl.style.fontWeight || '800';

          ensureFontLoaded(currentGS.fontFamily);
          
          CaptionStore.setState({ globalStyle: currentGS }, true);
          
          if (typeof applyGlobalStyleToOverlay === 'function') applyGlobalStyleToOverlay();
          if (typeof syncStylePanelFromStore === 'function') syncStylePanelFromStore();
          renderTemplateCards();
          if (typeof renderProTimeline === 'function') renderProTimeline();
          if (typeof updateVideoSubtitleOverlay === 'function') updateVideoSubtitleOverlay();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
          showToast('Applied ' + tmpl.name + ' Template!', 2000);
        });

        grid.appendChild(card);
      });
    }

    function renderTransitionCards() {
      var list = $('vs-transitions-list') || $('gradial-transitions-list');
      if (!list) return;

      var transitions = [
        { id: 'fade', name: 'Cross Dissolve', desc: 'Smooth opacity fade between phrases', icon: 'ph-film-strip' },
        { id: 'slide', name: 'Slide In', desc: 'Sleek upward slide transition', icon: 'ph-arrows-out-cardinal' },
        { id: 'pop', name: 'Pop Zoom', desc: 'Dynamic scale bounce for emphasis', icon: 'ph-arrows-out' },
        { id: 'karaoke', name: 'Word Karaoke Highlight', desc: 'Active word glows as spoken', icon: 'ph-sparkle' }
      ];

      var activeTrans = videoSubState.transition || 'karaoke';
      list.innerHTML = '';
      transitions.forEach(function (tr) {
        var card = document.createElement('div');
        card.className = 'gradial-transition-card' + (activeTrans === tr.id ? ' active-transition' : '');
        card.innerHTML = 
          '<div style="display:flex; align-items:center; gap:10px;">' +
            '<div class="transition-icon-box"><i class="ph ' + tr.icon + '" style="font-size:16px;"></i></div>' +
            '<div>' +
              '<div class="transition-card-name">' + tr.name + '</div>' +
              '<div class="transition-card-desc">' + tr.desc + '</div>' +
            '</div>' +
          '</div>' +
          (activeTrans === tr.id ? '<span class="transition-active-badge">Active</span>' : '');

        card.addEventListener('click', function () {
          videoSubState.transition = tr.id;
          renderTransitionCards();
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
          showToast('Transition set to ' + tr.name, 2000);
        });

        list.appendChild(card);
      });
      try { refreshLucideIcons(); } catch(ex) {}
    }


    function initVideoTab() {
      if (window._videoTabInitialized) return;
      window._videoTabInitialized = true;
      initProTimelineEvents();
      renderProTimeline();
      
      // Render LUT Grid immediately on init
      if (typeof renderVideoLutGrid === 'function') {
        renderVideoLutGrid('vid-lut-grid', state.vidLut || 'normal', function (lutId) {
          state.vidLut = lutId;
          refreshVideoGrading();
        });
      }

      // Render Templates & Transitions immediately on init
      if (typeof renderTemplateCards === 'function') renderTemplateCards();
      if (typeof renderTransitionCards === 'function') renderTransitionCards();

      // Initialize 2D Tone & Warmth StylePad
      initToneWarmthStylePad();

      var uploadBtn = $('video-upload-btn');
      var fileInput = $('video-file-input');
      var video = $('video-player-el');

      // Helper function to load a video file into stage & application state
      function loadVideoFile(file) {
        if (!file) return;
        if (typeof audioManager !== 'undefined' && audioManager.play) {
          audioManager.play('pop');
        }

        state.videoFile = file;

        var url = URL.createObjectURL(file);
        if (video) {
          video.src = url;
          video.load();
          video.style.display = 'block';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.objectFit = 'contain';
          show(video);
          show($('video-player-control-deck'));
          show($('pro-canvas-overlay'));
          if ($('video-empty-state')) {
            $('video-empty-state').classList.add('hidden');
            $('video-empty-state').style.display = 'none';
          }
          if ($('video-dropzone')) {
            $('video-dropzone').classList.add('hidden');
            $('video-dropzone').style.display = 'none';
          }

          video.onloadedmetadata = function () {
            if (typeof updateVideoProgressUI === 'function') updateVideoProgressUI();
            if (typeof renderProTimeline === 'function') renderProTimeline();
            if (typeof applyGlobalStyleToOverlay === 'function') applyGlobalStyleToOverlay();
          };
        }

        document.querySelectorAll('#video-file-name').forEach(function (el) {
          el.textContent = file.name;
        });

        ['video-transcribe-block', 'video-grading-block', 'video-resize-block', 'video-lut-block'].forEach(function (id) {
          var el = $(id);
          if (el) {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
          }
        });

        var exportBtn = $('video-export-btn');
        if (exportBtn) {
          exportBtn.style.opacity = '1';
          exportBtn.style.pointerEvents = 'auto';
          exportBtn.disabled = false;
        }
      }

      // Dropzone click handlers
      ['video-empty-state', 'video-dropzone', 'btn-empty-dropzone-click'].forEach(function (id) {
        var el = $(id);
        if (el && fileInput) {
          el.addEventListener('click', function () {
            fileInput.click();
          });
        }
      });

      // Quick Upload Button in drawer
      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function () {
          fileInput.click();
        });
      }

      // File input change handler
      if (fileInput) {
        fileInput.addEventListener('change', function (e) {
          var file = e.target.files[0];
          if (file) loadVideoFile(file);
        });
      }

      // Full HTML5 Drag-and-Drop Event Listeners
      var dropTargets = [
        $('video-empty-state'),
        $('video-dropzone'),
        $('btn-empty-dropzone-click'),
        $('video-canvas-stage')
      ];

      dropTargets.forEach(function (target) {
        if (!target) return;

        ['dragenter', 'dragover'].forEach(function (eventName) {
          target.addEventListener(eventName, function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) {
              e.dataTransfer.dropEffect = 'copy';
            }
            if ($('video-empty-state')) $('video-empty-state').classList.add('drag-over');
            if ($('video-dropzone')) $('video-dropzone').classList.add('drag-over');
          }, false);
        });

        ['dragleave', 'dragend'].forEach(function (eventName) {
          target.addEventListener(eventName, function (e) {
            e.preventDefault();
            e.stopPropagation();
            if ($('video-empty-state')) $('video-empty-state').classList.remove('drag-over');
            if ($('video-dropzone')) $('video-dropzone').classList.remove('drag-over');
          }, false);
        });

        target.addEventListener('drop', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if ($('video-empty-state')) $('video-empty-state').classList.remove('drag-over');
          if ($('video-dropzone')) $('video-dropzone').classList.remove('drag-over');

          var dt = e.dataTransfer;
          if (dt && dt.files && dt.files.length > 0) {
            var file = dt.files[0];
            if (fileInput) {
              try {
                fileInput.files = dt.files;
              } catch (err) {
                // Ignore if read-only in older engines
              }
            }
            loadVideoFile(file);
          }
        }, false);
      });

      // Rail Navigation Handler
      ['captions', 'text', 'templates', 'color', 'export'].forEach(function(target) {
        var btn = $('btn-rail-' + target);
        if (btn) {
          btn.addEventListener('click', function() {
            try { localStorage.setItem('gradial-studio-subtab', target); } catch(e) {}
            document.querySelectorAll('.rail-item').forEach(function(el) { el.classList.remove('active'); });
            document.querySelectorAll('.drawer-tab-content').forEach(function(el) { el.classList.add('hidden'); });
            
            btn.classList.add('active');
            var targetDrawer = $('drawer-tab-' + target);
            if (targetDrawer) targetDrawer.classList.remove('hidden');
            
            if (target === 'text' && typeof syncStylePanelFromStore === 'function') syncStylePanelFromStore();
            if (target === 'templates') {
              if (typeof renderTemplateCards === 'function') renderTemplateCards();
              if (typeof renderTransitionCards === 'function') renderTransitionCards();
            }
            if (target === 'color') {
              renderVideoLutGrid('vid-lut-grid', state.vidLut || 'normal', function (lutId) {
                state.vidLut = lutId;
                refreshVideoGrading();
              });
              if (typeof initColorAdjustmentsControls === 'function') initColorAdjustmentsControls();
            }
            
            if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
            try { refreshLucideIcons(); } catch(ex) {}
          });
        }
      });

      // Quick Subtitles Header Button
      if ($('btn-generate-subtitles-header')) {
        $('btn-generate-subtitles-header').addEventListener('click', function() {
          var captionsRail = $('btn-rail-captions');
          if (captionsRail) captionsRail.click();
          var transBtn = $('btn-generate-subtitles');
          if (transBtn) transBtn.click();
        });
      }

      // Drawer Export Button & Dropdown Menu
      var expChevron = $('video-export-chevron-btn');
      var expMenu = $('video-export-menu');
      if (expChevron && expMenu) {
        expChevron.addEventListener('click', function(e) {
          e.stopPropagation();
          expMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', function(e) {
          if (expMenu && !expMenu.classList.contains('hidden') && !e.target.closest('#video-export-dropdown-anchor')) {
            expMenu.classList.add('hidden');
          }
        });

        expMenu.querySelectorAll('.dropdown-item-sk').forEach(function(item) {
          item.addEventListener('click', function(e) {
            expMenu.querySelectorAll('.dropdown-item-sk').forEach(function(el) { el.classList.remove('active'); });
            item.classList.add('active');
            var resScale = parseFloat(item.dataset.resolution) || 1;
            videoState.scale = resScale;
            if ($('video-scale-select')) $('video-scale-select').value = String(resScale);
            expMenu.classList.add('hidden');
            if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
            if (typeof exportGradedVideo === 'function') exportGradedVideo();
          });
        });
      }

      if ($('video-drawer-export-btn')) {
        $('video-drawer-export-btn').addEventListener('click', function() {
          if (typeof exportGradedVideo === 'function') exportGradedVideo();
        });
      }

      if ($('btn-export-download-srt')) {
        $('btn-export-download-srt').addEventListener('click', function() {
          var segments = typeof CaptionStore !== 'undefined' ? CaptionStore.getSegments() : [];
          if (!segments || segments.length === 0) {
            showToast('No subtitles to export. Generate AI captions first!', 3000);
            return;
          }
          var srtText = typeof segmentsToSRT === 'function' ? segmentsToSRT(segments) : '';
          downloadTextFile(srtText, 'gradial_subtitles_' + Date.now() + '.srt', 'text/plain');
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
          showToast('Downloaded .SRT Subtitles!', 2500);
        });
      }

      if ($('btn-export-download-vtt')) {
        $('btn-export-download-vtt').addEventListener('click', function() {
          var segments = typeof CaptionStore !== 'undefined' ? CaptionStore.getSegments() : [];
          if (!segments || segments.length === 0) {
            showToast('No subtitles to export. Generate AI captions first!', 3000);
            return;
          }
          var vttText = typeof segmentsToVTT === 'function' ? segmentsToVTT(segments) : '';
          downloadTextFile(vttText, 'gradial_subtitles_' + Date.now() + '.vtt', 'text/vtt');
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
          showToast('Downloaded .VTT Subtitles!', 2500);
        });
      }

      // Groq Key Settings Handlers
      if ($('toggle-groq-key-vis-settings')) {
        $('toggle-groq-key-vis-settings').addEventListener('click', function () {
          var input = $('settings-groq-api-key-input');
          if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
          }
        });
      }

      if ($('settings-groq-api-key-input')) {
        $('settings-groq-api-key-input').value = state.groqApiKey || '';
        $('settings-groq-api-key-input').addEventListener('input', function (e) {
          state.groqApiKey = e.target.value;
          localStorage.setItem('gradial_groq_api_key', e.target.value);
          var statusSpan = $('settings-groq-key-status');
          if (statusSpan) {
            statusSpan.textContent = 'Not Checked';
            statusSpan.style.color = 'var(--text-sub)';
          }
          updateGroqKeyUI();
        });
      }

      if ($('check-groq-api-key-btn')) {
        $('check-groq-api-key-btn').addEventListener('click', async function () {
          var key = (state.groqApiKey || '').trim();
          var statusSpan = $('settings-groq-key-status');
          if (!key) {
            if (statusSpan) {
              statusSpan.textContent = 'No Key Entered';
              statusSpan.style.color = '#FF4444';
            }
            showToast('Please enter a Groq API key to check.', 3000);
            audioManager.play('error');
            return;
          }

          if (statusSpan) {
            statusSpan.textContent = 'Testing Key...';
            statusSpan.style.color = 'var(--accent-primary)';
          }

          try {
            var res = await fetch('https://api.groq.com/openai/v1/models', {
              headers: { 'Authorization': 'Bearer ' + key }
            });
            if (res.ok) {
              if (statusSpan) {
                statusSpan.textContent = '✓ Valid API Key';
                statusSpan.style.color = '#39FF14';
              }
              showToast('Groq API Key is valid and ready!', 3000);
              audioManager.play('success');
            } else {
              if (statusSpan) {
                statusSpan.textContent = '✕ Invalid API Key';
                statusSpan.style.color = '#FF4444';
              }
              showToast('Invalid Groq API Key (HTTP ' + res.status + ')', 3000);
              audioManager.play('error');
            }
          } catch (err) {
            if (statusSpan) {
              statusSpan.textContent = '✕ Connection Error';
              statusSpan.style.color = '#FF4444';
            }
            showToast('Error testing key: ' + err.message, 3000);
            audioManager.play('error');
          }
        });
      }

      function openSettingsModalFromStudio(focusApiKey) {
        if (typeof audioManager !== 'undefined') audioManager.play('pop');
        var overlay = $('settings-modal-overlay');
        if (overlay) {
          overlay.classList.remove('hidden');
          overlay.style.display = 'flex';
          overlay.style.zIndex = '10000000';
        }
        document.querySelectorAll('.settings-nav-item').forEach(function (el) { el.classList.remove('active'); });
        document.querySelectorAll('.settings-section-panel').forEach(function (el) {
          el.classList.add('hidden');
          el.classList.remove('active');
          el.style.display = '';
        });
        
        var section = focusApiKey ? 'export' : 'themes';
        var targetNav = document.querySelector('[data-settings-section="' + section + '"]');
        var targetPanel = $('settings-section-' + section);
        if (targetNav) targetNav.classList.add('active');
        if (targetPanel) {
          targetPanel.classList.remove('hidden');
          targetPanel.classList.add('active');
          targetPanel.style.display = '';
        }
        if (focusApiKey) {
          var keyInp = $('settings-groq-api-key-input');
          if (keyInp) setTimeout(function () { keyInp.focus(); }, 150);
        }
      }

      if ($('btn-open-settings-api-key')) {
        $('btn-open-settings-api-key').addEventListener('click', function () {
          openSettingsModalFromStudio(true);
        });
      }

      if ($('btn-video-studio-settings')) {
        $('btn-video-studio-settings').addEventListener('click', function () {
          openSettingsModalFromStudio(false);
        });
      }

    async function generateAudioPeakSegments(videoSource, fallbackDuration) {
      try {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var arrayBuffer;
        if (videoSource && videoSource.arrayBuffer) {
          arrayBuffer = await videoSource.arrayBuffer();
        } else if (videoSource && videoSource.src && !videoSource.src.startsWith('file:')) {
          var res = await fetch(videoSource.src);
          arrayBuffer = await res.arrayBuffer();
        } else {
          return null;
        }

        var audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        var rawData = audioBuffer.getChannelData(0);
        var sr = audioBuffer.sampleRate;
        var dur = audioBuffer.duration || fallbackDuration || 10;

        var frameSamples = Math.floor(sr * 0.2);
        var totalFrames = Math.floor(rawData.length / frameSamples);
        var energyList = [];

        for (var f = 0; f < totalFrames; f++) {
          var sumSq = 0;
          var offset = f * frameSamples;
          for (var i = 0; i < frameSamples; i++) {
            var val = rawData[offset + i];
            sumSq += val * val;
          }
          var rms = Math.sqrt(sumSq / frameSamples);
          energyList.push({ start: (f * frameSamples) / sr, end: ((f + 1) * frameSamples) / sr, energy: rms });
        }

        var maxE = energyList.reduce(function(m, e) { return Math.max(m, e.energy); }, 0);
        var thresh = maxE * 0.18;

        var speechBlocks = [];
        var currBlock = null;

        energyList.forEach(function(item) {
          if (item.energy >= thresh) {
            if (!currBlock) {
              currBlock = { start: item.start, end: item.end };
            } else {
              currBlock.end = item.end;
            }
          } else {
            if (currBlock) {
              if (currBlock.end - currBlock.start >= 0.5) {
                speechBlocks.push(currBlock);
              }
              currBlock = null;
            }
          }
        });
        if (currBlock && currBlock.end - currBlock.start >= 0.5) {
          speechBlocks.push(currBlock);
        }

        if (speechBlocks.length === 0) return null;

        return speechBlocks.map(function(blk, bIdx) {
          var sStart = parseFloat(blk.start.toFixed(2));
          var sEnd = parseFloat(blk.end.toFixed(2));
          var text = 'Video Speech Segment ' + (bIdx + 1);
          return {
            id: 'seg_wave_' + bIdx + '_' + Date.now(),
            start: sStart,
            end: sEnd,
            text: text,
            words: synthesizeWordTimestampsForSegment(text, sStart, sEnd)
          };
        });
      } catch (err) {
        console.warn('generateAudioPeakSegments error:', err);
        return null;
      }
    }

    // AI Subtitles Generation Handler
    var handleGenerateCaptions = async function () {
      var file = state.videoFile;
      var video = $('video-player-el');
      var apiKey = (state.groqApiKey || '').trim();

      if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');

      if ($('subtitles-progress-container')) show($('subtitles-progress-container'));
      if ($('subtitles-progress-fill')) $('subtitles-progress-fill').style.width = '15%';
      if ($('subtitles-progress-text')) $('subtitles-progress-text').textContent = 'Extracting Audio Track...';
      if ($('subtitles-progress-pct')) $('subtitles-progress-pct').textContent = '15%';

      var segments = [];

      try {
        var audioBlob = null;
        var sourceToExtract = file;
        
        if (!sourceToExtract && video && video.src) {
          try {
            var fetchRes = await fetch(video.src);
            sourceToExtract = await fetchRes.blob();
          } catch (fErr) {
            console.warn('Could not fetch video.src blob:', fErr);
          }
        }

        if (sourceToExtract) {
          audioBlob = await extractAudioBlobFromVideo(sourceToExtract, function (pct) {
            var p = Math.round(15 + (pct * 0.35));
            if ($('subtitles-progress-fill')) $('subtitles-progress-fill').style.width = p + '%';
            if ($('subtitles-progress-pct')) $('subtitles-progress-pct').textContent = p + '%';
          });
        }

        var modeSelect = $('transcribe-language-mode');
        var mode = modeSelect ? modeSelect.value : 'hinglish_roman';

        if (audioBlob) {
          segments = await transcribeVideoAudioWithGroq(audioBlob, apiKey, mode, function (pct, statusText) {
            var p = Math.round(50 + (pct * 0.5));
            if ($('subtitles-progress-fill')) $('subtitles-progress-fill').style.width = p + '%';
            if ($('subtitles-progress-pct')) $('subtitles-progress-pct').textContent = p + '%';
            if ($('subtitles-progress-text')) $('subtitles-progress-text').textContent = statusText;
          });
        }

        if (!segments || segments.length === 0) {
          throw new Error('No speech detected in this video.');
        }

        videoSubState.segments = segments;
        videoSubState.selectedSegmentId = segments.length > 0 ? segments[0].id : null;

        if (typeof CaptionStore !== 'undefined' && CaptionStore.setState) {
            CaptionStore.setState({
              segments: segments,
              selectedSegmentId: segments.length > 0 ? segments[0].id : null
            }, true);
        }

        showToast('Whisper AI transcribed ' + segments.length + ' video speech segments!', 3500);

        if (typeof renderProCaptionsList === 'function') renderProCaptionsList();
        if (typeof renderProTimeline === 'function') renderProTimeline();
        if (typeof updateVideoSubtitleOverlay === 'function') updateVideoSubtitleOverlay();
        if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('success');

        if ($('subtitle-style-controls')) show($('subtitle-style-controls'));
        if ($('pro-canvas-overlay')) show($('pro-canvas-overlay'));

      } catch (err) {
        console.warn('Groq transcription API failed:', err);
        showToast('Transcription error: ' + (err.message || 'Error executing Whisper AI transcription.'), 4500);
      } finally {
        setTimeout(function () {
          if ($('subtitles-progress-container')) hide($('subtitles-progress-container'));
        }, 1000);
      }
    };

      ['btn-generate-ai-captions', 'btn-generate-subtitles', 'btn-generate-subtitles-old'].forEach(function(btnId) {
        var btn = $(btnId);
        if (btn) {
          btn.addEventListener('click', handleGenerateCaptions);
        }
      });

      function updateVideoProgressUI() {
        if (!video || !video.src) return;
        var currTime = video.currentTime || 0;
        var dur = video.duration;
        if (!isFinite(dur) || isNaN(dur) || dur <= 0) return;

        var pct = Math.min(100, Math.max(0, (currTime / dur) * 100));

        var slider = $('vid-seekbar-slider');
        var curTc = $('vid-timecode-current');
        var totTc = $('vid-timecode-total');
        var proTc = $('pro-timeline-timecode');

        if (slider && !window._isSeekingVideo) slider.value = pct;
        if (curTc) curTc.textContent = formatTimecode(currTime);
        if (totTc) totTc.textContent = formatTimecode(dur);
        if (proTc) proTc.textContent = formatTimecode(currTime) + ' / ' + formatTimecode(dur);

        // Sync timeline playhead scrubber position matching exact timeline pixels
        if (typeof updateProTimelinePlayhead === 'function') {
          updateProTimelinePlayhead();
        }
      }

      function startVideoProgressLoop() {
        if (window._vidProgressAnimFrame) cancelAnimationFrame(window._vidProgressAnimFrame);
        function tick() {
          if (video && !video.paused && !video.ended) {
            if (!window._isSeekingVideo) {
              updateVideoProgressUI();
            }
            window._vidProgressAnimFrame = requestAnimationFrame(tick);
          }
        }
        tick();
      }

      // Live Subtitles Sync & Transport Bar Progress Sync on Video Events
      if (video) {
        video.addEventListener('play', function () {
          var btn = $('btn-vid-play-pause');
          if (btn) btn.innerHTML = '<i class="ph-fill ph-pause" style="font-size:16px;"></i>';
          startVideoProgressLoop();
        });

        video.addEventListener('pause', function () {
          var btn = $('btn-vid-play-pause');
          if (btn) btn.innerHTML = '<i class="ph-fill ph-play" style="font-size:16px;"></i>';
          updateVideoProgressUI();
        });

        video.addEventListener('ended', function () {
          var btn = $('btn-vid-play-pause');
          if (btn) btn.innerHTML = '<i class="ph-fill ph-play" style="font-size:16px;"></i>';
          video.currentTime = 0;
          updateVideoProgressUI();
        });

        ['timeupdate', 'seeking', 'seeked', 'loadedmetadata', 'durationchange'].forEach(function (ev) {
          video.addEventListener(ev, function () {
            if (!window._isSeekingVideo) {
              updateVideoProgressUI();
            }
          });
        });

        video.addEventListener('timeupdate', function () {
          var currTime = video.currentTime;
          var activeSeg = videoSubState.segments.find(function (s) {
            return currTime >= s.start && currTime <= s.end;
          });

          var subTextEl = $('video-subtitle-text');
          var overlayEl = $('video-subtitle-overlay');

          if (activeSeg && activeSeg.text) {
            if (subTextEl) subTextEl.textContent = activeSeg.text.trim();
            if (overlayEl) show(overlayEl);
          } else {
            if (overlayEl) hide(overlayEl);
          }
        });
      }

      function formatTimecode(sec) {
        if (isNaN(sec) || !isFinite(sec)) return '00:00';
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      }

      // Header Upload Video Button
      if ($('btn-header-upload-video') && fileInput) {
        $('btn-header-upload-video').addEventListener('click', function () {
          audioManager.play('pop');
          fileInput.click();
        });
      }

      // Back to Gradial Button — switches to Image tab
      if ($('btn-back-to-gradial')) {
        $('btn-back-to-gradial').addEventListener('click', function () {
          audioManager.play('pop');
          if (typeof switchTab === 'function') {
            switchTab('image');
          }
        });
      }

      // Play / Pause Button
      if ($('btn-vid-play-pause')) {
        $('btn-vid-play-pause').addEventListener('click', function () {
          if (!video || !video.src) return;
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        });
      }

      // Skip -5s Button
      ['btn-vid-skip-back', 'btn-vid-rewind'].forEach(function(id) {
        var btn = $(id);
        if (btn) {
          btn.addEventListener('click', function () {
            if (!video || !video.src) return;
            audioManager.play('pop');
            video.currentTime = Math.max(0, video.currentTime - 5);
            updateVideoProgressUI();
          });
        }
      });

      // Skip +5s Button
      ['btn-vid-skip-forward', 'btn-vid-forward'].forEach(function(id) {
        var btn = $(id);
        if (btn) {
          btn.addEventListener('click', function () {
            if (!video || !video.src || isNaN(video.duration)) return;
            audioManager.play('pop');
            video.currentTime = Math.min(video.duration, video.currentTime + 5);
            updateVideoProgressUI();
          });
        }
      });

      // Video Seekbar Slider
      if ($('vid-seekbar-slider')) {
        $('vid-seekbar-slider').addEventListener('input', function (e) {
          if (!video || !video.src || !isFinite(video.duration) || isNaN(video.duration) || video.duration <= 0) return;
          var pct = parseFloat(e.target.value);
          video.currentTime = (pct / 100) * video.duration;
          updateVideoProgressUI();
        });
      }

      // Mute / Unmute Button
      if ($('btn-vid-mute')) {
        $('btn-vid-mute').addEventListener('click', function () {
          if (!video) return;
          video.muted = !video.muted;
          $('btn-vid-mute').style.color = video.muted ? '#FF4444' : 'var(--text-muted)';
        });
      }

      // Volume Slider
      if ($('vid-volume-slider')) {
        $('vid-volume-slider').addEventListener('input', function (e) {
          if (!video) return;
          var val = parseFloat(e.target.value);
          video.volume = val;
          if (video.muted && val > 0) video.muted = false;
        });
      }

      // Fullscreen Button
      if ($('btn-vid-fullscreen')) {
        $('btn-vid-fullscreen').addEventListener('click', function () {
          var container = $('video-preview-viewport') || video;
          if (!container) return;
          if (!document.fullscreenElement) {
            if (container.requestFullscreen) container.requestFullscreen();
          } else {
            if (document.exitFullscreen) document.exitFullscreen();
          }
        });
      }

      ['sub-pos-bottom', 'sub-pos-center', 'sub-pos-top'].forEach(function (id) {
        var btn = $(id);
        if (!btn) return;
        btn.addEventListener('click', function () {
          audioManager.play('pop');
          ['sub-pos-bottom', 'sub-pos-center', 'sub-pos-top'].forEach(function (bId) {
            if ($(bId)) $(bId).classList.remove('active');
          });
          btn.classList.add('active');
          videoSubState.position = id.replace('sub-pos-', '');
          updateSubtitleOverlayStyle();
        });
      });

      if ($('sub-font-size-slider')) {
        $('sub-font-size-slider').addEventListener('input', function (e) {
          videoSubState.fontSize = Number(e.target.value);
          if ($('sub-font-size-val')) $('sub-font-size-val').textContent = videoSubState.fontSize + 'px';
          updateSubtitleOverlayStyle();
        });
      }

      if ($('sub-text-color-picker')) {
        $('sub-text-color-picker').addEventListener('input', function (e) {
          videoSubState.textColor = e.target.value;
          updateSubtitleOverlayStyle();
        });
      }

      if ($('sub-bg-color-picker')) {
        $('sub-bg-color-picker').addEventListener('input', function (e) {
          videoSubState.bgColor = e.target.value;
          updateSubtitleOverlayStyle();
        });
      }

      if ($('toggle-burn-captions')) {
        $('toggle-burn-captions').addEventListener('click', function () {
          audioManager.play('pop');
          this.classList.toggle('active');
          videoSubState.burnCaptions = this.classList.contains('active');
          showToast('Burn Captions on Export: ' + (videoSubState.burnCaptions ? 'Enabled' : 'Disabled'), 2000);
        });
      }

      function updateSubtitleOverlayStyle() {
        var overlay = $('video-subtitle-overlay');
        var textEl = $('video-subtitle-text');
        if (!overlay || !textEl) return;

        if (videoSubState.position === 'top') {
          overlay.style.bottom = 'auto';
          overlay.style.top = '10%';
          overlay.style.transform = 'translateX(-50%)';
        } else if (videoSubState.position === 'center') {
          overlay.style.top = '50%';
          overlay.style.bottom = 'auto';
          overlay.style.transform = 'translate(-50%, -50%)';
        } else {
          overlay.style.top = 'auto';
          overlay.style.bottom = '10%';
          overlay.style.transform = 'translateX(-50%)';
        }

        textEl.style.fontSize = videoSubState.fontSize + 'px';
        textEl.style.color = videoSubState.textColor;
        textEl.style.backgroundColor = videoSubState.bgColor;
      }

      // VTT / SRT Exports
      if ($('btn-download-vtt')) {
        $('btn-download-vtt').addEventListener('click', function () {
          if (!videoSubState.vttText) return;
          downloadTextFile(videoSubState.vttText, 'gradial_subtitles.vtt', 'text/vtt');
        });
      }

      if ($('btn-download-srt')) {
        $('btn-download-srt').addEventListener('click', function () {
          if (!videoSubState.srtText) return;
          downloadTextFile(videoSubState.srtText, 'gradial_subtitles.srt', 'text/plain');
        });
      }

      function downloadTextFile(content, filename, mimeType) {
        var blob = new Blob([content], { type: mimeType });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      }

      ['vid-brightness', 'vid-contrast', 'vid-saturate', 'vid-temp', 'vid-hue', 'vid-sharpen'].forEach(function (id) {
        var slider = $(id);
        if (!slider) return;
        slider.addEventListener('input', function () {
          var valEl = $(id + '-val');
          if (valEl) {
            var unit = id === 'vid-hue' ? '\u00B0' : (id === 'vid-temp' ? '' : '%');
            valEl.textContent = slider.value + unit;
          }
          refreshVideoGrading();
        });
      });

      // Reset Color Grading
      if ($('btn-reset-video-grading')) {
        $('btn-reset-video-grading').addEventListener('click', function () {
          audioManager.play('pop');
          ['vid-brightness', 'vid-contrast', 'vid-saturate', 'vid-temp', 'vid-hue', 'vid-sharpen'].forEach(function (id) {
            var sl = $(id);
            if (sl) { sl.value = 0; }
            var valEl = $(id + '-val');
            if (valEl) {
              var unit = id === 'vid-hue' ? '\u00B0' : (id === 'vid-temp' ? '' : '%');
              valEl.textContent = '0' + unit;
            }
          });
          state.vidStylePad = { tone: 0, warmth: 0 };
          if ($('vid-style-pad-puck')) {
            $('vid-style-pad-puck').style.left = '50%';
            $('vid-style-pad-puck').style.top = '50%';
          }
          if ($('vid-style-pad-glow')) {
            $('vid-style-pad-glow').style.left = '50%';
            $('vid-style-pad-glow').style.top = '50%';
          }
          if ($('vid-style-pad-readout')) {
            $('vid-style-pad-readout').textContent = 'Tone: 0 | Warmth: 0';
          }
          refreshVideoGrading();
        });
      }

      [['vid-scale-1x', 1], ['vid-scale-15x', 1.5], ['vid-scale-2x', 2]].forEach(function (pair) {
        var btn = $(pair[0]);
        if (!btn) return;
        btn.addEventListener('click', function () {
          audioManager.play('pop');
          videoState.scale = pair[1];
          document.querySelectorAll('#video-resize-block .segmented-btn').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
      });
    }

    function initGradialExportPopupModal() {
      var optionsModal = $('gradial-export-options-modal');
      var closeBtn = $('btn-close-export-options');
      var startExportBtn = $('btn-start-video-export');
      var srtBtn = $('btn-popup-download-srt');
      var vttBtn = $('btn-popup-download-vtt');

      function openExportPopup() {
        if (!optionsModal) return;
        var video = $('video-player-el');
        var sourceEl = (video && video.src && video.videoWidth) ? video : null;
        if (!sourceEl) {
          showToast('Please load a video first.', 2500);
          return;
        }
        show(optionsModal);
        if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
      }

      function closeExportPopup() {
        if (optionsModal) hide(optionsModal);
      }

      if (closeBtn) closeBtn.addEventListener('click', closeExportPopup);

      if (optionsModal) {
        optionsModal.addEventListener('click', function (e) {
          if (e.target === optionsModal) closeExportPopup();
        });
      }

      // Bind all export buttons in the UI to open this Popup Modal ONLY
      var triggerIds = ['studio-top-export-btn', 'btn-export-header', 'btn-rail-export', 'video-drawer-export-btn', 'video-export-btn', 'studio-drawer-export-btn', 'top-bar-export-btn'];
      triggerIds.forEach(function (id) {
        var btn = $(id);
        if (btn) {
          btn.addEventListener('click', function (e) {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            // Ensure side export drawer is permanently hidden
            var sideDrawer = $('sidebar-video-controls');
            if (sideDrawer) hide(sideDrawer);
            openExportPopup();
          });
        }
      });

      if (srtBtn) {
        srtBtn.addEventListener('click', function () {
          var segments = (CaptionStore.getState().segments || (videoSubState && videoSubState.segments) || []);
          if (!segments || segments.length === 0) {
            showToast('No subtitle segments found to export.', 2500);
            return;
          }
          var srtText = typeof segmentsToSRT === 'function' ? segmentsToSRT(segments) : '';
          if (!srtText) {
            showToast('Failed to generate SRT subtitles.', 2500);
            return;
          }
          downloadTextFile(srtText, 'gradial_subtitles_' + Date.now() + '.srt', 'text/plain');
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
          showToast('Downloaded .SRT Subtitles!', 2500);
        });
      }

      if (vttBtn) {
        vttBtn.addEventListener('click', function () {
          var segments = (CaptionStore.getState().segments || (videoSubState && videoSubState.segments) || []);
          if (!segments || segments.length === 0) {
            showToast('No subtitle segments found to export.', 2500);
            return;
          }
          var vttText = typeof segmentsToVTT === 'function' ? segmentsToVTT(segments) : '';
          if (!vttText) {
            showToast('Failed to generate VTT subtitles.', 2500);
            return;
          }
          downloadTextFile(vttText, 'gradial_subtitles_' + Date.now() + '.vtt', 'text/plain');
          if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
          showToast('Downloaded .VTT Subtitles!', 2500);
        });
      }

      if (startExportBtn) {
        startExportBtn.addEventListener('click', function () {
          closeExportPopup();
          exportGradedVideo();
        });
      }
    }

    // =========================================================
    // PART 4: SINGLE SOURCE OF TRUTH CAPTION RESOLVER & RENDERER
    // =========================================================

    function resolveCaptionFrame(currTime, canvasW, canvasH) {
      var state = (typeof CaptionStore !== 'undefined' && CaptionStore.getState) ? CaptionStore.getState() : {};
      var segments = state.segments || (typeof videoSubState !== 'undefined' ? videoSubState.segments : []) || [];
      if (!segments || segments.length === 0) return null;

      var activeSeg = segments.find(function (s) {
        return currTime >= s.start && currTime <= s.end;
      });
      if (!activeSeg || !activeSeg.text || !activeSeg.text.trim()) return null;

      var globalStyle = state.globalStyle || {};
      var transition = state.transition || {};
      var effectiveStyle = Object.assign({}, defaultCaptionStyle || {}, globalStyle, activeSeg.styleOverride || {});

      var fontFamily = effectiveStyle.fontFamily || (typeof videoSubState !== 'undefined' ? videoSubState.fontFamily : 'Outfit') || 'Outfit';
      var rawFontSize = effectiveStyle.fontSize || (typeof videoSubState !== 'undefined' ? parseInt(videoSubState.fontSize) : 24) || 24;
      var fontSize = Math.max(16, Math.round(rawFontSize * (canvasH / 720)));
      var fontWeight = effectiveStyle.fontWeight || '800';
      var fontStyle = effectiveStyle.fontStyle || 'normal';
      var textAlign = effectiveStyle.textAlign || 'center';
      var textTransform = effectiveStyle.textCase || effectiveStyle.textTransform || (typeof videoSubState !== 'undefined' && videoSubState.textTransform === 'uppercase' ? 'uppercase' : 'none');

      var colorType = effectiveStyle.colorType || 'solid';
      var solidColor = effectiveStyle.solidColor || (typeof videoSubState !== 'undefined' ? videoSubState.textColor : '#FFFFFF') || '#FFFFFF';
      var activeWordColor = effectiveStyle.activeWordColor || (typeof videoSubState !== 'undefined' ? videoSubState.activeWordColor : '#00FF88') || '#00FF88';
      var bgColor = effectiveStyle.backgroundColor || (typeof videoSubState !== 'undefined' ? videoSubState.bgColor : 'rgba(10, 10, 15, 0.85)') || 'rgba(10, 10, 15, 0.85)';
      var bgOpacity = effectiveStyle.backgroundOpacity !== undefined ? effectiveStyle.backgroundOpacity : 0.85;

      var gradientStops = effectiveStyle.gradientStops || [
        { color: '#8A2BE2', position: 0 },
        { color: '#4169E1', position: 100 }
      ];
      var gradientAngle = effectiveStyle.gradientAngle !== undefined ? effectiveStyle.gradientAngle : 90;

      var posX = effectiveStyle.positionX !== undefined ? effectiveStyle.positionX : 50;
      var posY = effectiveStyle.positionY !== undefined ? effectiveStyle.positionY : (typeof videoSubState !== 'undefined' ? (videoSubState.position === 'top' ? 15 : (videoSubState.position === 'center' ? 50 : 85)) : 85);

      var templateId = effectiveStyle.presetId || effectiveStyle.templateId || 'default';

      // Words breakdown & rock-solid word timing algorithm
      var words = activeSeg.text.trim().split(/\s+/);
      var numWords = words.length;
      var segDuration = Math.max(0.1, activeSeg.end - activeSeg.start);
      var segWords = (activeSeg.words && activeSeg.words.length > 0) ? activeSeg.words : null;

      var wordRanges = [];
      if (segWords && segWords.length > 0) {
        for (var wIdx = 0; wIdx < numWords; wIdx++) {
          var wo = segWords[wIdx];
          if (wo && isFinite(wo.start) && isFinite(wo.end)) {
            var s = wo.start >= activeSeg.start ? wo.start : (activeSeg.start + wo.start);
            var e = wo.end >= activeSeg.start ? wo.end : (activeSeg.start + wo.end);
            if (e <= s) e = s + 0.1;
            wordRanges.push({ start: s, end: e, text: wo.text || words[wIdx], colorOverride: wo.colorOverride });
          } else {
            wordRanges.push(null);
          }
        }
      }

      var totalChars = words.reduce(function (a, b) { return a + b.length; }, 0) || 1;
      var charAcc = 0;
      var fallbackRanges = words.map(function (w) {
        var wStart = activeSeg.start + (charAcc / totalChars) * segDuration;
        charAcc += w.length;
        var wEnd = activeSeg.start + (charAcc / totalChars) * segDuration;
        return { start: wStart, end: wEnd, text: w };
      });

      var activeIndex = -1;
      for (var idx = 0; idx < numWords; idx++) {
        var range = (wordRanges[idx] && isFinite(wordRanges[idx].start)) ? wordRanges[idx] : fallbackRanges[idx];
        var nextRange = (idx + 1 < numWords)
          ? ((wordRanges[idx + 1] && isFinite(wordRanges[idx + 1].start)) ? wordRanges[idx + 1] : fallbackRanges[idx + 1])
          : null;

        var windowStart = range.start;
        var windowEnd = nextRange ? Math.min(nextRange.start, activeSeg.end) : activeSeg.end;

        if (currTime >= windowStart && currTime < windowEnd) {
          activeIndex = idx;
          break;
        }
      }

      if (activeIndex === -1) {
        if (currTime < activeSeg.start) activeIndex = 0;
        else activeIndex = numWords - 1;
      }

      var wordSpecs = words.map(function (w, idx) {
        var wordObj = segWords ? segWords[idx] : null;
        var wText = wordObj ? (wordObj.text || w) : w;
        if (textTransform === 'uppercase') wText = wText.toUpperCase();
        else if (textTransform === 'lowercase') wText = wText.toLowerCase();

        return {
          text: wText,
          isActive: (idx === activeIndex),
          colorOverride: wordObj ? wordObj.colorOverride : null
        };
      });

      // Calculate animation transforms
      var scale = 1.0;
      var opacity = 1.0;
      var translateY = 0;
      var transType = transition.type || transition.id || 'karaoke-highlight';
      var transDur = transition.duration || 0.3;

      var timeFromStart = currTime - activeSeg.start;
      var timeFromEnd = activeSeg.end - currTime;

      if (transType === 'pop-in') {
        if (timeFromStart < transDur) {
          var p = timeFromStart / transDur;
          scale = 0.7 + 0.3 * p;
          opacity = p;
        }
      } else if (transType === 'fade') {
        if (timeFromStart < transDur) {
          opacity = timeFromStart / transDur;
        } else if (timeFromEnd < transDur) {
          opacity = Math.max(0, timeFromEnd / transDur);
        }
      } else if (transType === 'slide-up') {
        if (timeFromStart < transDur) {
          var p = timeFromStart / transDur;
          translateY = (1 - p) * 30;
          opacity = p;
        }
      } else if (transType === 'bounce') {
        if (timeFromStart < transDur) {
          var p = timeFromStart / transDur;
          scale = 0.8 + 0.3 * Math.sin(p * Math.PI);
        }
      }

      return {
        segmentId: activeSeg.id,
        fontFamily: fontFamily,
        fontSize: fontSize,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        textAlign: textAlign,
        textTransform: textTransform,
        colorType: colorType,
        solidColor: solidColor,
        gradientStops: gradientStops,
        gradientAngle: gradientAngle,
        activeWordColor: activeWordColor,
        bgColor: bgColor,
        bgOpacity: bgOpacity,
        positionX: posX,
        positionY: posY,
        templateId: templateId,
        words: wordSpecs,
        scale: scale,
        opacity: opacity,
        translateY: translateY
      };
    }

    function drawCaptionOnCanvas(ctx, frameSpec, canvasW, canvasH) {
      if (!frameSpec || !frameSpec.words || frameSpec.words.length === 0) return;

      ctx.save();

      var anchorX = (frameSpec.positionX / 100) * canvasW;
      var anchorY = (frameSpec.positionY / 100) * canvasH + (frameSpec.translateY || 0);

      ctx.translate(anchorX, anchorY);
      if (frameSpec.scale !== 1) ctx.scale(frameSpec.scale, frameSpec.scale);
      if (frameSpec.opacity !== undefined) ctx.globalAlpha = frameSpec.opacity;

      var fontSize = frameSpec.fontSize;
      var fontStr = frameSpec.fontStyle + ' ' + frameSpec.fontWeight + ' ' + fontSize + 'px "' + frameSpec.fontFamily + '", sans-serif';
      ctx.font = fontStr;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Measure word widths
      var measuredWords = frameSpec.words.map(function (w) {
        var width = ctx.measureText(w.text + ' ').width;
        return {
          text: w.text,
          width: width,
          isActive: w.isActive,
          colorOverride: w.colorOverride
        };
      });

      var totalWidth = measuredWords.reduce(function (acc, item) { return acc + item.width; }, 0);
      var paddingH = fontSize * 0.6;
      var boxW = Math.min(canvasW * 0.92, totalWidth + paddingH * 2);
      var boxH = fontSize * 1.6;
      var boxX = -boxW / 2;
      var boxY = -boxH / 2;

      // Background Container Styling based on templateId
      var tmpl = frameSpec.templateId;
      if (tmpl === 'tmpl-terminal' || tmpl === 'terminal_type') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = Math.max(1, fontSize * 0.05);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 4);
        else ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();
        ctx.stroke();
      } else if (tmpl === 'tmpl-liquid-glass' || tmpl === 'aero_bubble') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = Math.max(1, fontSize * 0.04);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, fontSize * 0.4);
        else ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();
        ctx.stroke();
      } else if (tmpl === 'tmpl-synthwave' || tmpl === 'synth_neon') {
        ctx.fillStyle = 'rgba(20, 10, 35, 0.85)';
        ctx.strokeStyle = '#FF007A';
        ctx.lineWidth = Math.max(2, fontSize * 0.06);
        ctx.shadowColor = '#FF007A';
        ctx.shadowBlur = fontSize * 0.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, fontSize * 0.3);
        else ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (frameSpec.bgColor && frameSpec.bgOpacity > 0) {
        ctx.fillStyle = frameSpec.bgColor;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, fontSize * 0.4);
        else ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();
      }

      // Text Rendering Word-by-Word
      var currentX = -totalWidth / 2;
      ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';

      // Build Gradient if gradient mode
      var gradientFill = null;
      if (frameSpec.colorType === 'gradient' && frameSpec.gradientStops && frameSpec.gradientStops.length >= 2) {
        var angleRad = (frameSpec.gradientAngle || 90) * (Math.PI / 180);
        var halfW = totalWidth / 2;
        var x1 = -Math.cos(angleRad) * halfW;
        var y1 = -Math.sin(angleRad) * (boxH / 2);
        var x2 = Math.cos(angleRad) * halfW;
        var y2 = Math.sin(angleRad) * (boxH / 2);

        gradientFill = ctx.createLinearGradient(x1, y1, x2, y2);
        frameSpec.gradientStops.forEach(function (stop) {
          var pos = stop.position !== undefined ? (stop.position > 1 ? stop.position / 100 : stop.position) : 0;
          gradientFill.addColorStop(Math.min(1, Math.max(0, pos)), stop.color);
        });
      }

      measuredWords.forEach(function (item) {
        var wordCenterX = currentX + item.width / 2;

        ctx.save();

        if (item.isActive) {
          // Active Word Pop & Text Glow
          ctx.translate(wordCenterX, 0);
          ctx.scale(1.14, 1.14);
          wordCenterX = 0;

          var activeCol = frameSpec.activeWordColor || '#00FF88';
          ctx.fillStyle = activeCol;

          // Template pill styles for active words
          if (tmpl === 'preset-style-pink-pill') {
            ctx.fillStyle = '#FF007A';
            var pW = item.width + 10;
            var pH = fontSize * 1.2;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-pW/2, -pH/2, pW, pH, 6);
            else ctx.rect(-pW/2, -pH/2, pW, pH);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
          } else if (tmpl === 'preset-style-ali-abdaal') {
            ctx.fillStyle = '#FFFFFF';
            var pW = item.width + 12;
            var pH = fontSize * 1.2;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-pW/2, -pH/2, pW, pH, 6);
            else ctx.rect(-pW/2, -pH/2, pW, pH);
            ctx.fill();
            ctx.fillStyle = '#000000';
          } else if (tmpl === 'preset-style-bubble-cyan') {
            ctx.fillStyle = '#00D2FF';
            var pW = item.width + 14;
            var pH = fontSize * 1.25;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-pW/2, -pH/2, pW, pH, 16);
            else ctx.rect(-pW/2, -pH/2, pW, pH);
            ctx.fill();
            ctx.fillStyle = '#000000';
          } else {
            ctx.shadowColor = activeCol;
            ctx.shadowBlur = fontSize * 0.4;
          }
        } else if (item.colorOverride) {
          ctx.fillStyle = item.colorOverride;
        } else if (gradientFill) {
          ctx.fillStyle = gradientFill;
        } else {
          ctx.fillStyle = frameSpec.solidColor || '#FFFFFF';
        }

        ctx.strokeText(item.text, wordCenterX, 0);
        ctx.fillText(item.text, wordCenterX, 0);
        ctx.restore();

        currentX += item.width;
      });

      ctx.restore();
    }

    function drawSubtitleOnExportCanvas(ctx, currTime, canvasW, canvasH) {
      var frameSpec = resolveCaptionFrame(currTime, canvasW, canvasH);
      if (frameSpec) {
        drawCaptionOnCanvas(ctx, frameSpec, canvasW, canvasH);
      }
    }

    // =========================================================
    // PART 2: DECOUPLED SEEK-AND-DRAW WEBCODECS VIDEO EXPORTER
    // =========================================================

    function seekVideoTo(videoEl, timeSec) {
      return new Promise(function (resolve) {
        if (Math.abs(videoEl.currentTime - timeSec) < 0.005) {
          resolve();
          return;
        }
        var onSeeked = function () {
          videoEl.removeEventListener('seeked', onSeeked);
          resolve();
        };
        videoEl.addEventListener('seeked', onSeeked);
        videoEl.currentTime = timeSec;
      });
    }

    async function exportVideoWebCodecs(options) {
      var sourceEl = options.sourceEl;
      var durationSec = options.durationSec;
      var fps = options.fps || 60;
      var width = options.width;
      var height = options.height;
      var popupBurn = options.popupBurn !== false;
      var onProgress = options.onProgress;
      var onCancelCheck = options.onCancelCheck;

      if (typeof VideoEncoder === 'undefined' || typeof Mp4Muxer === 'undefined') {
        throw new Error('WebCodecs VideoEncoder or Mp4Muxer unavailable');
      }

      // 1. Audio Track Extraction & Pre-encoding
      var audioBuffer = null;
      var audioTrackConfig = null;

      try {
        var arrayBuffer = null;
        var fileToRead = (typeof state !== 'undefined' && state && state.videoFile) ? state.videoFile : null;
        if (fileToRead) {
          arrayBuffer = await fileToRead.arrayBuffer();
        } else if (sourceEl && sourceEl.src) {
          var res = await fetch(sourceEl.src);
          arrayBuffer = await res.arrayBuffer();
        }

        if (arrayBuffer) {
          var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          if (audioBuffer && audioBuffer.numberOfChannels > 0) {
            audioTrackConfig = {
              codec: 'aac',
              numberOfChannels: Math.min(2, audioBuffer.numberOfChannels),
              sampleRate: audioBuffer.sampleRate
            };
          }
        }
      } catch (audioErr) {
        console.warn('[Export] Audio track extraction notice:', audioErr);
      }

      var filterString = buildVideoFilterCss();

      var canvas = (typeof OffscreenCanvas !== 'undefined')
        ? new OffscreenCanvas(width, height)
        : document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      var ctx = canvas.getContext('2d', { willReadFrequently: true, desynchronized: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      var muxerOptions = {
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: width,
          height: height
        },
        fastStart: 'in-memory',
        firstTimestampBehavior: 'offset'
      };

      if (audioTrackConfig && typeof AudioEncoder !== 'undefined') {
        muxerOptions.audio = audioTrackConfig;
      }

      var muxer = new Mp4Muxer.Muxer(muxerOptions);

      // Encode Audio Track if available
      if (audioTrackConfig && audioBuffer && typeof AudioEncoder !== 'undefined') {
        try {
          var audioEncoder = new AudioEncoder({
            output: function (chunk, meta) {
              muxer.addAudioChunk(chunk, meta);
            },
            error: function (e) {
              console.error('[WebCodecs] AudioEncoder error:', e);
            }
          });

          audioEncoder.configure({
            codec: 'mp4a.40.2',
            numberOfChannels: audioTrackConfig.numberOfChannels,
            sampleRate: audioTrackConfig.sampleRate,
            bitrate: 128000
          });

          var numChannels = audioTrackConfig.numberOfChannels;
          var sampleRate = audioTrackConfig.sampleRate;
          var totalSamples = Math.min(audioBuffer.length, Math.ceil(durationSec * sampleRate));

          var chunkSize = 1024;
          for (var sampleOffset = 0; sampleOffset < totalSamples; sampleOffset += chunkSize) {
            var frameCount = Math.min(chunkSize, totalSamples - sampleOffset);
            var planarData = new Float32Array(frameCount * numChannels);

            for (var ch = 0; ch < numChannels; ch++) {
              var channelData = audioBuffer.getChannelData(ch);
              var subData = channelData.subarray(sampleOffset, sampleOffset + frameCount);
              planarData.set(subData, ch * frameCount);
            }

            var timestampUs = Math.round((sampleOffset / sampleRate) * 1_000_000);
            var audioFrame = new AudioData({
              format: 'f32-planar',
              sampleRate: sampleRate,
              numberOfChannels: numChannels,
              numberOfFrames: frameCount,
              timestamp: timestampUs,
              data: planarData
            });

            audioEncoder.encode(audioFrame);
            audioFrame.close();
          }

          await audioEncoder.flush();
        } catch (audioEncErr) {
          console.warn('[Export] AudioEncoder notice:', audioEncErr);
        }
      }

      // Encode Video Frames
      var encoderError = null;
      var videoEncoder = new VideoEncoder({
        output: function (chunk, meta) {
          muxer.addVideoChunk(chunk, meta);
        },
        error: function (e) {
          console.error('[WebCodecs] VideoEncoder error:', e);
          encoderError = e;
        }
      });

      var codecConfig = {
        codec: 'avc1.640028',
        width: width,
        height: height,
        bitrate: 12_000_000,
        framerate: fps
      };

      var supported = await VideoEncoder.isConfigSupported(codecConfig);
      if (!supported || !supported.supported) {
        codecConfig.codec = 'avc1.42E01E';
        supported = await VideoEncoder.isConfigSupported(codecConfig);
        if (!supported || !supported.supported) {
          throw new Error('H.264 WebCodecs configuration unsupported by browser.');
        }
      }

      videoEncoder.configure(codecConfig);

      var totalFrames = Math.max(1, Math.round(durationSec * fps));
      var frameDurationUs = Math.round(1_000_000 / fps);

      sourceEl.pause();

      for (var i = 0; i < totalFrames; i++) {
        if (onCancelCheck && onCancelCheck()) {
          try { videoEncoder.close(); } catch (e) {}
          throw new Error('Export cancelled');
        }

        if (encoderError) throw encoderError;

        var timestampSec = i / fps;

        await seekVideoTo(sourceEl, timestampSec);

        ctx.save();
        if (filterString) ctx.filter = filterString;
        ctx.drawImage(sourceEl, 0, 0, width, height);
        ctx.restore();

        if (popupBurn) {
          try {
            drawSubtitleOnExportCanvas(ctx, timestampSec, width, height);
          } catch (subErr) {
            console.error('Subtitle render error at timestamp', timestampSec, subErr);
          }
        }

        var frame = new VideoFrame(canvas, {
          timestamp: Math.round(i * frameDurationUs),
          duration: frameDurationUs
        });

        videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
        frame.close();

        if (i % 15 === 0 || i === totalFrames - 1) {
          onProgress?.(Math.round((i / totalFrames) * 100));
          await new Promise(function (resolve) { setTimeout(resolve, 0); });
        }
      }

      await videoEncoder.flush();
      muxer.finalize();

      return new Blob([muxer.target.buffer], { type: 'video/mp4' });
    }

    // Main Export Entry Point
    async function exportGradedVideo() {
      var video = $('video-player-el');
      var sourceEl = (video && video.src && video.videoWidth) ? video : null;
      if (!sourceEl) {
        showToast('Please load a video first.', 2500);
        return;
      }

      var popupScale = $('popup-video-scale-select') ? parseFloat($('popup-video-scale-select').value) : (videoState.scale || 1);
      var popupBurn = $('popup-burn-captions-toggle') ? $('popup-burn-captions-toggle').checked : true;
      var formatReq = $('popup-video-format-select') ? $('popup-video-format-select').value : 'mp4';

      var w = Math.round((sourceEl.videoWidth || 1280) * popupScale);
      var h = Math.round((sourceEl.videoHeight || 720) * popupScale);
      w = w % 2 === 0 ? w : w + 1;
      h = h % 2 === 0 ? h : h + 1;

      var durationSec = (sourceEl.duration && !isNaN(sourceEl.duration) && sourceEl.duration > 0) ? sourceEl.duration : 5;

      var isCancelledRef = { isCancelled: false };
      var cancelBtn = $('export-modal-cancel-btn');
      if (cancelBtn) {
        cancelBtn.onclick = function () {
          isCancelledRef.isCancelled = true;
          hide($('export-modal-overlay'));
          showToast('Export cancelled', 2000);
        };
      }

      if ($('export-modal-title')) $('export-modal-title').textContent = 'Exporting Video';
      if ($('export-modal-status')) $('export-modal-status').textContent = 'Processing...';
      if ($('export-progress-fill')) $('export-progress-fill').style.width = '0%';
      if ($('export-modal-percent')) $('export-modal-percent').textContent = '0%';
      show($('export-modal-overlay'));

      var useWebCodecs = (typeof VideoEncoder !== 'undefined' && typeof Mp4Muxer !== 'undefined');

      if (useWebCodecs) {
        try {
          var blob = await exportVideoWebCodecs({
            sourceEl: sourceEl,
            durationSec: durationSec,
            fps: 60,
            width: w,
            height: h,
            popupBurn: popupBurn,
            onProgress: function (pct) {
              if ($('export-progress-fill')) $('export-progress-fill').style.width = pct + '%';
              if ($('export-modal-percent')) $('export-modal-percent').textContent = pct + '%';
              if ($('export-modal-status')) $('export-modal-status').textContent = 'Processing...';
            },
            onCancelCheck: function () { return isCancelledRef.isCancelled; }
          });

          if (isCancelledRef.isCancelled) return;

          var fileExt = 'mp4';
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'exported_video_' + Date.now() + '.' + fileExt;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 10000);

          showToast('Video exported successfully.', 3500);
          hide($('export-modal-overlay'));
          sourceEl.currentTime = 0;
          return;
        } catch (webcodecsErr) {
          if (isCancelledRef.isCancelled) return;
          console.warn('[Export] WebCodecs notice:', webcodecsErr);
        }
      }

      // MediaRecorder Fallback Path
      try {
        var result = await exportGradedVideoMediaRecorder(sourceEl, w, h, popupBurn, formatReq, durationSec, isCancelledRef);
        if (isCancelledRef.isCancelled) return;
        var url2 = URL.createObjectURL(result.blob);
        var a2 = document.createElement('a');
        a2.href = url2;
        a2.download = 'exported_video_' + Date.now() + '.' + result.fileExt;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
        setTimeout(function () { URL.revokeObjectURL(url2); }, 10000);

        showToast('Video exported successfully.', 3500);
        hide($('export-modal-overlay'));
        sourceEl.currentTime = 0;
      } catch (fbErr) {
        if (isCancelledRef.isCancelled) return;
        showToast('Export failed: ' + (fbErr.message || fbErr), 4000);
        hide($('export-modal-overlay'));
      }
    }

    // Top Bar Export Buttons Handler
      ['top-bar-export-btn', 'studio-top-export-btn'].forEach(function(btnId) {
        var btn = $(btnId);
        if (btn) {
          btn.addEventListener('click', function() {
            var tab = state.activeTab || 'video';
            if (tab === 'video') {
              var exportRail = $('btn-rail-export');
              if (exportRail) exportRail.click();
              showToast('Video & Subtitle Export panel opened!', 2500);
            } else if (tab === 'gradient') {
              var gradExport = $('gradient-export-main-btn');
              if (gradExport) gradExport.click();
            } else if (tab === 'image') {
              var imgResult = $('preview-result-img');
              if (imgResult && imgResult.src && !imgResult.classList.contains('hidden')) {
                var a = document.createElement('a');
                a.href = imgResult.src;
                a.download = 'gradial_erased_' + Date.now() + '.png';
                a.click();
                showToast('Downloaded Erased Image Result!', 2500);
              } else {
                showToast('Upload an image to export result!', 2500);
              }
            }
            if (typeof audioManager !== 'undefined' && audioManager.play) audioManager.play('pop');
          });
        }
      });

      // Render Pro Studio Panels
      try {
        renderGradialPresetCards();
        renderProCaptionsList();
      } catch(e) { console.error(e); }

      // Customizer Sidebar Tab Switching & Style Panel Init
      try { initStylePanel(); } catch(e) { console.error('initStylePanel error:', e); }
      try { renderTemplateCards(); } catch(e) { console.error(e); }
      try { renderTransitionCards(); } catch(e) { console.error(e); }
      
      ['presets', 'text', 'position', 'templates', 'transitions'].forEach(function(tabName) {
        var btn = $('tab-btn-' + tabName);
        if (btn) {
          btn.addEventListener('click', function() {
            document.querySelectorAll('.pro-tab-btn').forEach(function(el) {
              el.style.color = 'var(--text-muted)';
              el.style.borderBottom = 'none';
            });
            document.querySelectorAll('.pro-tab-content').forEach(function(el) { el.classList.add('hidden'); });

            btn.style.color = 'var(--accent-primary, #00FF88)';
            btn.style.borderBottom = '2px solid var(--accent-primary, #00FF88)';
            var targetContent = $('tab-content-' + tabName);
            if (targetContent) show(targetContent);
            
            // Render dynamic content when switching to these tabs
            if (tabName === 'templates') renderTemplateCards();
            if (tabName === 'transitions') renderTransitionCards();
            if (tabName === 'text') syncStylePanelFromStore();
            
            audioManager.play('pop');
            try { refreshLucideIcons(); } catch(e) {}
          });
        }
      });

      // Transition Settings Controls
      if ($('transition-duration-slider')) {
        $('transition-duration-slider').addEventListener('input', function(e) {
          var val = parseFloat(e.target.value);
          if ($('transition-duration-val')) $('transition-duration-val').textContent = val.toFixed(2) + 's';
          var ct = CaptionStore.getState().transition;
          CaptionStore.setState({ transition: Object.assign({}, ct, { duration: val }) }, false);
        });
      }
      if ($('transition-easing-select')) {
        $('transition-easing-select').addEventListener('change', function(e) {
          var ct = CaptionStore.getState().transition;
          CaptionStore.setState({ transition: Object.assign({}, ct, { easing: e.target.value }) }, false);
        });
      }

      // Text Transform Buttons (Format tab)
      if ($('btn-text-case-upper')) {
        $('btn-text-case-upper').addEventListener('click', function() {
          $('btn-text-case-upper').classList.add('active');
          if ($('btn-text-case-normal')) $('btn-text-case-normal').classList.remove('active');
          CaptionStore.setState({ globalStyle: { textTransform: 'uppercase' } }, false);
          applyGlobalStyleToOverlay();
          audioManager.play('pop');
        });
      }
      if ($('btn-text-case-normal')) {
        $('btn-text-case-normal').addEventListener('click', function() {
          $('btn-text-case-normal').classList.add('active');
          if ($('btn-text-case-upper')) $('btn-text-case-upper').classList.remove('active');
          CaptionStore.setState({ globalStyle: { textTransform: 'none' } }, false);
          applyGlobalStyleToOverlay();
          audioManager.play('pop');
        });
      }

      // Add Caption Segment Button Handler
      if ($('btn-add-caption-segment')) {
        $('btn-add-caption-segment').addEventListener('click', function() {
          var video = $('video-player-el');
          var startTime = video ? (video.currentTime || 0) : 0;
          var newText = 'New Caption Text';
          var segStart = Math.round(startTime * 100) / 100;
          var segEnd = Math.round((startTime + 2.5) * 100) / 100;
          var newSeg = {
            id: 'seg_' + Date.now(),
            start: segStart,
            end: segEnd,
            text: newText,
            words: synthesizeWordTimestampsForSegment(newText, segStart, segEnd)
          };
          var currentSegments = (CaptionStore.getState().segments || []).slice();
          currentSegments.push(newSeg);
          currentSegments.sort(function(a, b) { return a.start - b.start; });
          CaptionStore.setState({ segments: currentSegments }, true);
          renderProCaptionsList();
          updateVideoSubtitleOverlay();
          audioManager.play('pop');
        });
      }

      // Live Subtitle Overlay Timeupdate Listener Upgrade
      var vidEl = $('video-player-el');
      if (vidEl) {
        vidEl.addEventListener('play', startSubOverlayLoop);
        vidEl.addEventListener('playing', startSubOverlayLoop);
        vidEl.addEventListener('seeked', function() {
          updateVideoSubtitleOverlay();
        });
        vidEl.addEventListener('timeupdate', function() {
          updateVideoSubtitleOverlay();
        });
      }

      initGradialExportPopupModal();
      initSliderFills();
      refreshLucideIcons();

      // Run initial splash loader screen dismissal
      runInitialAppLoader();

    function runInitialAppLoader() {
      var loader = $('gradial-initial-loader');
      var bar = $('initial-progress-bar');
      var status = $('initial-loader-status');
      var percentEl = $('initial-loader-percent');
      if (!loader) return;

      var currentPct = 0;
      var steps = [
        { pct: 25, text: 'Igniting Studio Core & Theme Engine...' },
        { pct: 55, text: 'Loading Canvas & Vector Pipelines...' },
        { pct: 85, text: 'Pre-rendering Waveform & Studio Timelines...' },
        { pct: 100, text: 'Studio Ready. Welcome to Gradial!' }
      ];

      var stepIdx = 0;
      var interval = setInterval(function () {
        currentPct += 10;
        if (bar) bar.style.width = Math.min(100, currentPct) + '%';
        if (percentEl) percentEl.textContent = Math.min(100, currentPct) + '%';

        if (stepIdx < steps.length && currentPct >= steps[stepIdx].pct) {
          if (status) status.textContent = steps[stepIdx].text;
          stepIdx++;
        }

        if (currentPct >= 100) {
          clearInterval(interval);
          loader.classList.add('dismissed');
          setTimeout(function () {
            loader.style.display = 'none';
          }, 400);
        }
      }, 30);

      // Failsafe safety timeout: guarantee loader disappears after 1.5 seconds max
      setTimeout(function() {
        if (loader) {
          loader.classList.add('dismissed');
          loader.style.display = 'none';
        }
      }, 1500);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }

  })();
