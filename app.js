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
    iconBox.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 22px; height: 22px; color: var(--color-seaweed);"></i>';
    if (window.lucide) lucide.createIcons();

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
          iconBox.innerHTML = '<i data-lucide="check-circle-2" style="width: 22px; height: 22px; color: var(--color-seaweed);"></i>';
          if (window.lucide) lucide.createIcons();

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
        btn.innerHTML = '<i data-lucide="volume-2"></i> <span id="setting-sound-text">Enabled</span>';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i data-lucide="volume-x"></i> <span id="setting-sound-text">Muted</span>';
      }
      if (window.lucide) lucide.createIcons();
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
      document.body.className = savedTheme;
      document.querySelectorAll('.theme-card').forEach(function (c) {
        c.classList.remove('active');
        if (c.getAttribute('data-theme') === savedTheme) {
          c.classList.add('active');
        }
      });
    }
    initSliderFills();
  }

  function applyTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem('gradial-theme', themeName);
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
    if (state.isPickingColor) {
      btn.innerHTML = '<i data-lucide="pipette"></i><span>Click pixel on image...</span>';
      btn.style.borderColor = 'var(--color-seaweed)';
    } else {
      btn.innerHTML = '<i data-lucide="pipette"></i><span>Pick Color from Image</span>';
      btn.style.borderColor = 'rgba(255,255,255,0.05)';
    }
    if (window.lucide) lucide.createIcons();
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
            btn.innerHTML = '<i data-lucide="check"></i><span>Exported!</span>';
            refreshLucideIcons();
            setTimeout(function () {
              btn.innerHTML = '<i data-lucide="download"></i><span>Export PNG</span>';
              refreshLucideIcons();
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
          var checkIcon = isSelected ? '<i data-lucide="check" style="width:14px; height:14px; color:var(--accent-primary);"></i> ' : '';
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
          '<i data-lucide="download"></i>' +
          '<span>Export PNG</span>' +
          '</button>' +
          '<button class="btn-sk btn-icon-sk" id="image-export-chevron-btn" title="Select Resolution" style="flex-shrink: 0; width: 42px; padding: 0; display: flex; align-items: center; justify-content: center;">' +
          '<i data-lucide="' + (isMenuOpen ? 'chevron-up' : 'chevron-down') + '"></i>' +
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
            '<i data-lucide="rotate-ccw"></i> Clear Image' +
            '</button>' : ''
          );

        if (window.lucide) lucide.createIcons();

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
            '<i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>' +
            '</button>' +
            '</div>' +
            '<div class="quick-palette-row">' +
            '<span class="quick-palette-label">Presets:</span>' +
            quickDotsHtml +
            '</div>';

          list.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();

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
          var checkIcon = isSelected ? '<i data-lucide="check" style="width:14px; height:14px; color:var(--accent-primary); flex-shrink:0;"></i>' : '<span style="width:14px; flex-shrink:0;"></span>';

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
        if (window.lucide) lucide.createIcons();
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
          var icon = isVideoMode ? 'video' : 'download';
          var label = isVideoMode ? 'Export Video (MP4)' : 'Export PNG';
          exportBtn.innerHTML = '<i data-lucide="' + icon + '"></i><span>' + label + '</span>';
          if (window.lucide) lucide.createIcons();
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
            '<button class="fluid-point-remove-btn" data-fidx="' + idx + '"' + (state.fluidPoints.length <= 2 ? ' disabled' : '') + '><i data-lucide="x" style="width:12px; height:12px;"></i></button>' +
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

        if (window.lucide) lucide.createIcons();

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
            '<i data-lucide="x" style="width:12px; height:12px;"></i>' +
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

        if (window.lucide) lucide.createIcons();

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
          if ($('angle-val')) $('angle-val').textContent = state.gradientAngle + '°';
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
        { label: '', x: 50, y: 0, angle: 0, title: 'Top (0°)', style: 'top: 2px; left: 26px;' },
        { label: '', x: 100, y: 0, angle: 45, title: 'Top Right (45°)', style: 'top: 9px; left: 43px;' },
        { label: '', x: 100, y: 50, angle: 90, title: 'Right (90°)', style: 'top: 26px; left: 50px;' },
        { label: '', x: 100, y: 100, angle: 135, title: 'Bottom Right (135°)', style: 'top: 43px; left: 43px;' },
        { label: '', x: 50, y: 100, angle: 180, title: 'Bottom (180°)', style: 'top: 50px; left: 26px;' },
        { label: '', x: 0, y: 100, angle: 225, title: 'Bottom Left (225°)', style: 'top: 43px; left: 9px;' },
        { label: '', x: 0, y: 50, angle: 270, title: 'Left (270°)', style: 'top: 26px; left: 2px;' },
        { label: '', x: 0, y: 0, angle: 315, title: 'Top Left (315°)', style: 'top: 9px; left: 9px;' }
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
        compassHtml += '<div class="compass-center-badge">' + curAngle + '°</div>';
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
          '<i data-lucide="x" style="width: 10px; height: 10px;"></i>' +
          '</button>' +
          '</div>' +
          '<div style="pointer-events: auto;">' + compassHtml + '</div>' +
          colorsHtml;

        list.appendChild(card);
      });

      if (window.lucide) lucide.createIcons();

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
              $('angle-val').textContent = state.gradientAngle + '°';
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
              $('angle-val').textContent = state.gradientAngle + '°';
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
            if ($('btn-media-play')) $('btn-media-play').innerHTML = '<i data-lucide="pause"></i>';
          } else {
            video.pause();
            if ($('btn-media-play')) $('btn-media-play').innerHTML = '<i data-lucide="play"></i>';
          }
          if (window.lucide) lucide.createIcons();
          audioManager.play('pop');
        }
        return;
      }

      state.isPlaying = !state.isPlaying;
      var btn = $('btn-media-play');
      if (btn) {
        btn.innerHTML = state.isPlaying ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
        if (window.lucide) lucide.createIcons();
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
      iconBox.innerHTML = '<i data-lucide="video" class="animate-spin" style="width: 22px; height: 22px; color: var(--color-seaweed);"></i>';
      if (window.lucide) lucide.createIcons();
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

      iconBox.innerHTML = '<i data-lucide="check-circle-2" style="width: 22px; height: 22px; color: var(--color-seaweed);"></i>';
      statusEl.textContent = 'Video Export Complete!';
      fillEl.style.width = '100%';
      percentEl.textContent = '100%';
      if (window.lucide) lucide.createIcons();
      if (typeof audioManager !== 'undefined') audioManager.play('success');

      setTimeout(function () { hide(overlay); }, 600);
    }

    function refreshLucideIcons() {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        try {
          window.lucide.createIcons();
        } catch (err) {
          console.warn('Lucide icon render error:', err);
        }
      }
      // Schedule asynchronous fallback passes to ensure icons rendered dynamically or during tab switches are always transformed
      setTimeout(function () {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          try { window.lucide.createIcons(); } catch (e) { }
        }
      }, 80);
      setTimeout(function () {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          try { window.lucide.createIcons(); } catch (e) { }
        }
      }, 350);
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
      var key = (state.groqApiKey || '').trim();
      var settingsInput = $('settings-groq-api-key-input');
      if (settingsInput && settingsInput.value !== key) {
        settingsInput.value = key;
      }

      var vidBadge = $('video-key-status-badge');
      var vidNotice = $('video-key-notice-text');
      if (vidBadge) {
        if (key) {
          vidBadge.textContent = 'API Key Configured';
          vidBadge.style.color = 'var(--accent-primary)';
          if (vidNotice) vidNotice.textContent = 'Groq API key is configured and ready for speech-to-text AI subtitle generation.';
        } else {
          vidBadge.textContent = 'No API Key';
          vidBadge.style.color = '#FF4444';
          if (vidNotice) vidNotice.textContent = 'No API key inserted for subtitle generation. Please configure your Groq API key in Settings.';
        }
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

      // Tab Switching
      if ($('tab-btn-image')) {
        $('tab-btn-image').addEventListener('click', function () {
          audioManager.init();
          audioManager.play('woosh');
          switchTab('image');
        });
      }
      if ($('tab-btn-gradient')) {
        $('tab-btn-gradient').addEventListener('click', function () {
          audioManager.init();
          audioManager.play('woosh');
          switchTab('gradient');
        });
      }
      if ($('tab-btn-video')) {
        $('tab-btn-video').addEventListener('click', function () {
          audioManager.init();
          audioManager.play('woosh');
          switchTab('video');
        });
      }

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
        if ($('angle-val')) $('angle-val').textContent = state.gradientAngle + '°';
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
            var unit = filter === 'blur' ? 'px' : (filter === 'hue' ? '°' : '%');
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

      VIDEO_LUT_PRESETS.forEach(function (lut) {
        var card = document.createElement('div');
        card.className = 'lut-card' + (lut.id === (currentLutId || 'normal') ? ' active' : '');
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

    function buildVideoFilterCss() {
      var b = $('vid-brightness') ? parseFloat($('vid-brightness').value) : 100;
      var c = $('vid-contrast') ? parseFloat($('vid-contrast').value) : 100;
      var s = $('vid-saturate') ? parseFloat($('vid-saturate').value) : 100;
      var h = $('vid-hue') ? parseFloat($('vid-hue').value) : 0;

      var css = 'brightness(' + b + '%) contrast(' + c + '%) saturate(' + s + '%) hue-rotate(' + h + 'deg)';

      if (state.vidStylePad) {
        var t = state.vidStylePad.tone || 0;
        var w = state.vidStylePad.warmth || 0;

        if (w > 0) {
          css += ' sepia(' + (w * 0.35) + ') hue-rotate(' + (-w * 15) + 'deg)';
        } else if (w < 0) {
          css += ' hue-rotate(' + (-w * 50) + 'deg)';
        }

        if (t !== 0) {
          css += ' contrast(' + (100 + t * 25) + '%) brightness(' + (100 + t * 15) + '%)';
        }
      }

      var lutCss = getVideoLutCss(state.vidLut || 'normal');
      if (lutCss) {
        css += ' ' + lutCss;
      }

      return css;
    }

    function refreshVideoGrading() {
      var video = $('video-player-el');
      if (video) video.style.filter = buildVideoFilterCss();
      var sCanvas = $('sample-video-canvas');
      if (sCanvas) sCanvas.style.filter = buildVideoFilterCss();
    }

    // =========================================================
    // AI VIDEO AUDIO TRANSCRIPTION & SUBTITLES ENGINE (GROQ WHISPER)
    // =========================================================

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

    // Client-side Web Audio Slicer & Downsampler to 16kHz Mono WAV Blob
    async function extractAudioBlobFromVideo(videoFile, onProgress) {
      onProgress(10);
      var arrayBuffer = await videoFile.arrayBuffer();
      onProgress(30);

      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      onProgress(60);

      // Downsample to 16,000 Hz Mono channel for ultra-lightweight transcription file size
      var targetSampleRate = 16000;
      var offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate);
      var source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);

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

    function devanagariToRoman(text) {
      if (!text) return text;
      
      // If text is already in Roman script without Devanagari characters, return as is
      if (!/[\u0900-\u097F]/.test(text)) return text;

      var vowels_clean = {
        'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
        'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au'
      };

      var matras = {
        'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
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

      for (var wIdx = 0; wIdx < words.length; wIdx++) {
        var word = words[wIdx];
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
        // Clean double vowels for natural readability
        wordStr = wordStr.replace(/aa/g, 'a')
                         .replace(/ee/g, 'i')
                         .replace(/oo/g, 'u')
                         .replace(/chch/g, 'ch');
        
        // Capitalize word if prefix has start of sentence or line
        out_words.push(prefix + wordStr + suffix);
      }

      var finalResult = out_words.join(' ');

      // Dictionary of standard phonetic overrides for ultra-crisp Hinglish output
      var dictOverrides = {
'aa':'aa',
'aakhari':'aakhari',
'aakhri':'aakhri',
'aana':'aana',
'aane':'aane',
'aao':'aao',
'aaoge':'aaoge',
'aap':'aap',
'aapas':'aapas',
'aapka':'aapka',
'aapke':'aapke',
'aapki':'aapki',
'aapko':'aapko',
'aasan':'aasan',
'aasmaan':'aasmaan',
'aate':'aate',
'aath':'aath',
'aati':'aati',
'aavaaz':'aawaz',
'aawaz':'aawaz',
'aaya':'aaya',
'aaye':'aaye',
'aayi':'aayi',
'about':'about',
'account':'account',
'achchhaa':'achha',
'achha':'achha',
'achhe':'achhe',
'achhi':'achhi',
'actor':'actor',
'address':'address',
'adhtalis':'adhtalis',
'adhtis':'adhtis',
'admin':'admin',
'adrak':'adrak',
'agar':'agar',
'alert':'alert',
'algebraic':'algebraic',
'amazing':'amazing',
'andar':'andar',
'angry':'angry',
'answer':'answer',
'anthanbe':'anthanbe',
'apna':'apna',
'apne':'apne',
'apne-aap':'apne-aap',
'apni':'apni',
'app':'app',
'aray':'arey',
'arey':'arey',
'asaman':'aasmaan',
'ask':'ask',
'assi':'assi',
'atharah':'atharah',
'athhattar':'athhattar',
'athsath':'athsath',
'athtaees':'athtaees',
'atthasi':'atthasi',
'atthawan':'atthawan',
'audio':'audio',
'aunga':'aunga',
'aungi':'aungi',
'aur':'aur',
'avaz':'aawaz',
'awesome':'awesome',
'baad':'baad',
'baahar':'bahar',
'baarish':'baarish',
'baat':'baat',
'baatein':'baatein',
'back':'back',
'bad':'bad',
'bada':'bada',
'bade':'bade',
'badi':'badi',
'baees':'baees',
'bahar':'bahar',
'bahattar':'bahattar',
'bahut':'bohot',
'bana':'bana',
'banana':'banana',
'banane':'banane',
'banao':'banao',
'banbe':'banbe',
'bane':'bane',
'banega':'banega',
'bani':'bani',
'bank':'bank',
'bante':'bante',
'banti':'banti',
'barah':'barah',
'barish':'baarish',
'bas':'bas',
'basath':'basath',
'bata':'bata',
'batana':'batana',
'batane':'batane',
'batao':'batao',
'bataya':'bataya',
'bataye':'bataye',
'battees':'battees',
'bawanj':'bawanj',
'bayasi':'bayasi',
'bech':'bech',
'becha':'becha',
'bechna':'bechna',
'bechne':'bechne',
'becho':'becho',
'beech':'beech',
'bees':'bees',
'best':'best',
'bhai':'bhai',
'bhaiyya':'bhaiyya',
'bhej':'bhej',
'bheja':'bheja',
'bheje':'bheje',
'bhejna':'bhejna',
'bhejne':'bhejne',
'bhejo':'bhejo',
'bhi':'bhi',
'bilkul':'bilkul',
'bohot':'bohot',
'bol':'bol',
'bolna':'bolna',
'bolne':'bolne',
'bolo':'bolo',
'bolta':'bolta',
'bolte':'bolte',
'bolti':'bolti',
'boss':'boss',
'breakdown':'breakdown',
'brother':'brother',
'brotherhood':'brotherhood',
'business':'business',
'buy':'buy',
'byalis':'byalis',
'call':'call',
'camera':'camera',
'card':'card',
'cash':'cash',
'chaar':'chaar',
'chaaye':'chai',
'chahiye':'chahiye',
'chahiyein':'chahiyein',
'chai':'chai',
'chal':'chal',
'chala':'chala',
'chale':'chale',
'chalega':'chalega',
'chali':'chali',
'chalis':'chalis',
'chalna':'chalna',
'chalne':'chalne',
'chalo':'chalo',
'chalte':'chalte',
'chalti':'chalti',
'champion':'champion',
'change':'change',
'channel':'channel',
'charo':'charo',
'chat':'chat',
'chaubees':'chaubees',
'chaudah':'chaudah',
'chauhattar':'chauhattar',
'chauntis':'chauntis',
'chauranbe':'chauranbe',
'chaurasi':'chaurasi',
'chausath':'chausath',
'chauwan':'chauwan',
'chawalis':'chawalis',
'cheeni':'cheeni',
'cheez':'cheez',
'cheezein':'cheezein',
'chhabbees':'chhabbees',
'chhappan':'chhappan',
'chhattees':'chhattees',
'chhe':'chhe',
'chhihattar':'chhihattar',
'chhiyalas':'chhiyalas',
'chhiyanbe':'chhiyanbe',
'chhiyasath':'chhiyasath',
'chhiyasi':'chhiyasi',
'chhod':'chhod',
'chhoda':'chhoda',
'chhode':'chhode',
'chhodna':'chhodna',
'chhodne':'chhodne',
'chhodo':'chhodo',
'chhota':'chhota',
'chhote':'chhote',
'chhoti':'chhoti',
'choose':'choose',
'cinema':'cinema',
'cinemax':'cinemax',
'city':'city',
'class':'class',
'clear':'clear',
'click':'click',
'close':'close',
'code':'code',
'coder':'coder',
'coffee':'coffee',
'college':'college',
'comment':'comment',
'complete':'complete',
'complex':'complex',
'computer':'computer',
'connect':'connect',
'contact':'contact',
'content':'content',
'cool':'cool',
'cost':'cost',
'country':'country',
'course':'course',
'crafting':'crafting',
'crazy':'crazy',
'creator':'creator',
'crore':'crore',
'customer':'customer',
'das':'das',
'date':'date',
'day':'day',
'de':'de',
'dekh':'dekh',
'dekha':'dekha',
'dekhe':'dekhe',
'dekhenge':'dekhenge',
'dekhi':'dekhi',
'dekhna':'dekhna',
'dekhne':'dekhne',
'dekho':'dekho',
'dekhte':'dekhte',
'dekhti':'dekhti',
'delete':'delete',
'delhi':'delhi',
'delivery':'delivery',
'dena':'dena',
'dene':'dene',
'deo':'deo',
'desh':'desh',
'design':'design',
'designer':'designer',
'dete':'dete',
'deti':'deti',
'developer':'developer',
'dhoop':'dhoop',
'di':'di',
'dijiye':'dijiye',
'dil':'dil',
'dilchasp':'dilchasp',
'dimaag':'dimaag',
'din':'din',
'director':'director',
'disable':'disable',
'disconnect':'disconnect',
'discount':'discount',
'diya':'diya',
'diye':'diye',
'do':'do',
'done':'done',
'dono':'dono',
'doodh':'doodh',
'door':'door',
'doosra':'doosra',
'doosre':'doosre',
'doosri':'doosri',
'dopahar':'dopahar',
'dost':'dost',
'dosti':'dosti',
'download':'download',
'dukan':'dukan',
'duniya':'duniya',
'easy':'easy',
'edit':'edit',
'editor':'editor',
'ek':'ek',
'ek-saath':'ek-saath',
'elaichi':'elaichi',
'elsichi':'elaichi',
'empty':'empty',
'enable':'enable',
'end':'end',
'english':'english',
'enjoy':'enjoy',
'equation':'equation',
'error':'error',
'evening':'evening',
'exam':'exam',
'excited':'excited',
'export':'export',
'family':'family',
'fashion':'fashion',
'fast':'fast',
'fauran':'fauran',
'film':'film',
'find':'find',
'finish':'finish',
'fir':'phir',
'food':'food',
'free':'free',
'friend':'friend',
'full':'full',
'fun':'fun',
'future':'future',
'gaadi':'gaadi',
'galat':'galat',
'gam':'gam',
'game':'game',
'gamer':'gamer',
'gaon':'gaon',
'garmi':'garmi',
'gaya':'gaya',
'gaye':'gaye',
'gayi':'gayi',
'ghanta':'ghanta',
'ghante':'ghante',
'ghar':'ghar',
'goal':'goal',
'good':'good',
'guest':'guest',
'gyarah':'gyarah',
'ha':'ha',
'haan':'haan',
'hafta':'hafta',
'hafte':'hafte',
'hamesha':'hamesha',
'hanji':'hanji',
'happy':'happy',
'har':'har',
'hard':'hard',
'hate':'hate',
'hawa':'hawa',
'hazaar':'hazaar',
'hear':'hear',
'heavy':'heavy',
'help':'help',
'hero':'hero',
'heroine':'heroine',
'hindi':'hindi',
'hinglish':'hinglish',
'ho':'ho',
'hoga':'hoga',
'hoge':'hoge',
'hogi':'hogi',
'home':'home',
'hona':'hona',
'hone':'hone',
'hospital':'hospital',
'hota':'hota',
'hote':'hote',
'hotel':'hotel',
'hoti':'hoti',
'hua':'hua',
'hue':'hue',
'hui':'hui',
'hum':'hum',
'humara':'humara',
'humare':'humare',
'humari':'humari',
'humein':'humein',
'humko':'humko',
'hustle':'hustle',
'identification':'identification',
'ikatalis':'ikatalis',
'ikattees':'ikattees',
'ikawanj':'ikawanj',
'ikhattar':'ikhattar',
'ikkees':'ikkees',
'iksath':'iksath',
'ikyanbe':'ikyanbe',
'ikyasi':'ikyasi',
'image':'image',
'imkaan':'imkaan',
'import':'import',
'influencer':'influencer',
'info':'info',
'internet':'internet',
'is':'is',
'isiki':'isiki',
'isiko':'isiko',
'islambad':'islambad',
'isliye':'isliyeh',
'ismein':'ismein',
'isse':'isse',
'ja':'ja',
'jaate':'jaate',
'jaati':'jaati',
'jaisa':'jaisa',
'jaise':'jaise',
'jaisi':'jaisi',
'jana':'jana',
'jane':'jane',
'jao':'jao',
'jaoge':'jaoge',
'jaunga':'jaunga',
'jaungi':'jaungi',
'jaye':'jaye',
'job':'job',
'kaafi':'kaafi',
'kaam':'kaam',
'kab':'kab',
'kafee':'kafi',
'kafi':'kafi',
'kaha':'kahan',
'kahan':'kahann',
'kahan-se':'kahann-se',
'kaisa':'kaisa',
'kaise':'kaise',
'kaisi':'kaisi',
'kam':'kam',
'kar':'kar',
'karachi':'karachi',
'karenge':'karenge',
'karke':'karke',
'karna':'karna',
'karne':'karne',
'karo':'karo',
'karoge':'karoge',
'karsakte':'karsakte',
'karta':'karta',
'karte':'karte',
'karti':'karti',
'kaun':'kaun',
'keypad':'keypad',
'khaas':'khaas',
'khaastaur':'khaastaur',
'khabar':'khabar',
'khana':'khana',
'khane':'khane',
'khao':'khao',
'khareed':'khareed',
'khareeda':'khareeda',
'khareedna':'khareedna',
'khareedne':'khareedne',
'khareedo':'khareedo',
'khass':'khass',
'khaya':'khaya',
'khayal':'khayal',
'khaye':'khaye',
'khayein':'khayein',
'khud':'khud',
'khushi':'khushi',
'ki':'ki',
'kisey':'kisey',
'kisi':'kisi',
'kisi-ka':'kisi-ka',
'kisi-ko':'kisi-ko',
'kisi-se':'kisi-se',
'kiska':'kiska',
'kiske':'kiske',
'kiski':'kiski',
'kisko':'kisko',
'kisse':'kisse',
'kitna':'kitna',
'kitne':'kitne',
'kitni':'kitni',
'kiya':'kiya',
'kiye':'kiye',
'koi':'koi',
'kuch':'kuch',
'kuchh':'kuchh',
'kya':'kya',
'kyaa':'kya',
'kyonki':'kyunki',
'kyu':'kyun',
'kyun':'kyunn',
'kyunki':'kyunki',
'laa':'laa',
'laana':'laana',
'laane':'laane',
'laao':'laao',
'laaya':'laaya',
'laaye':'laaye',
'lahore':'lahore',
'lakh':'lakh',
'le':'le',
'lekin':'lekin',
'lena':'lena',
'lene':'lene',
'leo':'leo',
'lete':'lete',
'leti':'leti',
'li':'li',
'life':'life',
'light':'light',
'lijiye':'lijiye',
'like':'like',
'likh':'likh',
'likha':'likha',
'likhe':'likhe',
'likhi':'likhi',
'likhna':'likhna',
'likhne':'likhne',
'likho':'likho',
'likhte':'likhte',
'listen':'listen',
'live':'live',
'liya':'liya',
'liye':'liye',
'load':'load',
'look':'look',
'loop':'loop',
'loss':'loss',
'love':'love',
'maalum':'maalum',
'mad':'mad',
'madam':'madam',
'magar':'magar',
'mahina':'mahina',
'mahine':'mahine',
'main':'main',
'maken':'maken',
'malum':'maalum',
'market':'market',
'marks':'marks',
'mat':'mat',
'match':'match',
'mausam':'mausam',
'mazmoon':'mazmoon',
'mehenga':'mehenga',
'menu':'menu',
'mera':'mera',
'mere':'mere',
'meri':'meri',
'message':'message',
'mil':'mil',
'mila':'mila',
'mile':'mile',
'milega':'milega',
'mili':'mili',
'milna':'milna',
'milne':'milne',
'milo':'milo',
'milte':'milte',
'milti':'milti',
'minute':'minute',
'mobile':'mobile',
'money':'money',
'month':'month',
'morning':'morning',
'movie':'movie',
'mujhe':'mujhe',
'mukammal':'mukammal',
'mumbai':'mumbai',
'mushkil':'mushkil',
'music':'music',
'mute':'mute',
'na':'na',
'naam':'naam',
'nabbe':'nabbe',
'nahi':'nahi',
'nahin':'nahin',
'namak':'namak',
'nau':'nau',
'nauasi':'nauasi',
'neeche':'neeche',
'next':'next',
'nice':'nice',
'night':'night',
'ninanbe':'ninanbe',
'notification':'notification',
'number':'number',
'offer':'offer',
'offline':'offline',
'online':'online',
'open':'open',
'options':'options',
'order':'order',
'paanch':'paanch',
'paancho':'paancho',
'pachanbe':'pachanbe',
'pachas':'pachas',
'pachasi':'pachasi',
'pachhattar':'pachhattar',
'pachhees':'pachhees',
'pachpan':'pachpan',
'padega':'padega',
'padege':'padege',
'padegi':'padegi',
'padh':'padh',
'padha':'padha',
'padhe':'padhe',
'padhi':'padhi',
'padhna':'padhna',
'padhne':'padhne',
'padho':'padho',
'padhte':'padhte',
'paid':'paid',
'painsath':'painsath',
'paintalis':'paintalis',
'paintis':'paintis',
'pakad':'pakad',
'pakadna':'pakadna',
'pakadne':'pakadne',
'pakda':'pakda',
'pakde':'pakde',
'pakdo':'pakdo',
'pandrah':'pandrah',
'pani':'pani',
'party':'party',
'parunt':'parunt',
'pass':'pass',
'password':'password',
'past':'past',
'pata':'pata',
'pataa':'pataa',
'pause':'pause',
'pay':'pay',
'payment':'payment',
'peeche':'peeche',
'peena':'peena',
'peene':'peene',
'pehla':'pehla',
'pehle':'pehle',
'pehli':'pehli',
'phir':'phir',
'phone':'phone',
'photo':'photo',
'pick':'pick',
'picture':'picture',
'piya':'piya',
'piye':'piye',
'piyo':'piyo',
'play':'play',
'player':'player',
'post':'post',
'present':'present',
'press':'press',
'price':'price',
'privacy':'privacy',
'product':'product',
'profile':'profile',
'punjab':'punjab',
'quality':'quality',
'question':'question',
'raat':'raat',
'raha':'raha',
'rahe':'rahe',
'rahi':'rahi',
'raho':'raho',
'rakh':'rakh',
'rakha':'rakha',
'rakhe':'rakhe',
'rakhi':'rakhi',
'rakhna':'rakhna',
'rakhne':'rakhne',
'rakho':'rakho',
'rakhte':'rakhte',
'random':'random',
'rasta':'rasta',
'ready':'ready',
'receive':'receive',
'reel':'reel',
'refresh':'refresh',
'reh':'reh',
'rehata':'rehata',
'rehati':'rehati',
'rehna':'rehna',
'rehne':'rehne',
'remove':'remove',
'repeat':'repeat',
'reply':'reply',
'reset':'reset',
'restaurant':'restaurant',
'result':'result',
'ring':'ring',
'rok':'rok',
'roka':'roka',
'roke':'roke',
'roki':'roki',
'rokna':'rokna',
'rokne':'rokne',
'roko':'roko',
'roman':'roman',
'roti':'roti',
'saaf':'saaf',
'saal':'saal',
'saamne':'saamne',
'saare':'saare',
'saari':'saari',
'saat':'saat',
'saath':'saath',
'sab':'sab',
'sabkuch':'sabkuch',
'sad':'sad',
'sadak':'sadak',
'sahi':'sahi',
'saintalis':'saintalis',
'saintis':'saintis',
'sakatee':'sakti',
'sake':'sake',
'sakenge':'sakenge',
'sakoge':'sakoge',
'sakongi':'sakongi',
'sakta':'sakta',
'sakte':'sakte',
'sakti':'sakti',
'salary':'salary',
'sale':'sale',
'samajh':'samajh',
'samajha':'samajha',
'samajhe':'samajhe',
'samajhi':'samajhi',
'samajhna':'samajhna',
'samajhne':'samajhne',
'samajho':'samajho',
'samajhte':'samajhte',
'samay':'samay',
'samjha':'samjha',
'samjhana':'samjhana',
'samjhane':'samjhane',
'samjhao':'samjhao',
'samjhaye':'samjhaye',
'saph':'saaf',
'sardi':'sardi',
'sasta':'sasta',
'sathattar':'sathattar',
'satrah':'satrah',
'satsath':'satsath',
'sattaees':'sattaees',
'sattanbe':'sattanbe',
'sattar':'sattar',
'sattasi':'sattasi',
'sattawan':'sattawan',
'sau':'sau',
'save':'save',
'say':'say',
'school':'school',
'science':'science',
'score':'score',
'script':'script',
'scroll':'scroll',
'search':'search',
'second':'second',
'seekh':'seekh',
'seekha':'seekha',
'seekhe':'seekhe',
'seekhna':'seekhna',
'seekhne':'seekhne',
'seekho':'seekho',
'select':'select',
'sell':'sell',
'send':'send',
'service':'service',
'setting':'setting',
'settings':'settings',
'shaam':'shaam',
'shaayad':'shayad',
'share':'share',
'shayad':'shayad',
'shehar':'shehar',
'shop':'shop',
'short':'short',
'shorts':'shorts',
'simple':'simple',
'singer':'singer',
'sir':'sir',
'sirf':'sirf',
'sitare':'sitare',
'sitaron':'sitaron',
'slow':'slow',
'soch':'soch',
'socha':'socha',
'soche':'soche',
'sochi':'sochi',
'sochna':'sochna',
'sochne':'sochne',
'socho':'socho',
'sochte':'sochte',
'software':'software',
'solah':'solah',
'song':'song',
'sound':'sound',
'speak':'speak',
'start':'start',
'stop':'stop',
'story':'story',
'stream':'stream',
'student':'student',
'style':'style',
'subah':'subah',
'subscribe':'subscribe',
'subtitle':'subtitle',
'subtitles':'subtitles',
'success':'success',
'sun':'sun',
'suna':'suna',
'sunai':'sunai',
'sunaya':'sunaya',
'sunaye':'sunaye',
'sunna':'sunna',
'sunne':'sunne',
'suno':'suno',
'sunte':'sunte',
'sunti':'sunti',
'super':'super',
'support':'support',
'swipe':'swipe',
'switch':'switch',
'sync':'sync',
'system':'system',
'taaki':'taki',
'taare':'taare',
'taki':'taki',
'talk':'talk',
'tap':'tap',
'tareeka':'tareeka',
'tarika':'tarika',
'tathaa':'tathaa',
'teacher':'teacher',
'team':'team',
'teees':'teees',
'teen':'teen',
'teeno':'teeno',
'tees':'tees',
'teesra':'teesra',
'teesri':'teesri',
'tell':'tell',
'tentalis':'tentalis',
'tentees':'tentees',
'tera':'tera',
'terah':'terah',
'tere':'tere',
'teri':'teri',
'terms':'terms',
'test':'test',
'testing':'testing',
'thoda':'thoda',
'thode':'thode',
'thodi':'thodi',
'tihattar':'tihattar',
'time':'time',
'tiranbe':'tiranbe',
'tirasi':'tirasi',
'tirpan':'tirpan',
'tirsath':'tirsath',
'to':'to',
'today':'today',
'toggle':'toggle',
'toh':'toh',
'tomorrow':'tomorrow',
'trend':'trend',
'trophy':'trophy',
'troubleshoot':'troubleshoot',
'tu':'tu',
'tujhe':'tujhe',
'tum':'tum',
'tumhara':'tumhara',
'tumhare':'tumhare',
'tumhari':'tumhari',
'tumhein':'tumhein',
'tumhen':'tumhein',
'turant':'turant',
'turn':'turn',
'uapar':'uapar',
'unantis':'unantis',
'unasi':'unasi',
'unchas':'unchas',
'understanding':'understanding',
'unhattar':'unhattar',
'university':'university',
'unmute':'unmute',
'unnees':'unnees',
'unsath':'unsath',
'untalis':'untalis',
'update':'update',
'upload':'upload',
'urdu':'urdu',
'us':'us',
'user':'user',
'usiki':'usiki',
'usiko':'usiko',
'usliye':'usliyeh',
'usmein':'usmein',
'usse':'usse',
'vibe':'vibe',
'video':'video',
'view':'view',
'viral':'viral',
'voice':'voice',
'volume':'volume',
'waisa':'waisa',
'waise':'waise',
'waisi':'waisi',
'walkthrough':'walkthrough',
'waqt':'waqt',
'warna':'warna',
'warning':'warning',
'website':'website',
'week':'week',
'weirdo':'weirdo',
'wifi':'wifi',
'win':'win',
'winner':'winner',
'wo':'woh',
'woh':'wohh',
'world':'world',
'worst':'worst',
'ya':'ya',
'yaaar':'yaar',
'yaar':'yaar',
'yadi':'yadi',
'ye':'yeh',
'year':'year',
'yeh':'yehh',
'yesterday':'yesterday',
'zabardast':'zabardast',
'zabrrdast':'zabardast',
'zameen':'zameen',
'zaroor':'zaroor',
'zaroori':'zaroori',
'zarur':'zaroor',
'zaruri':'zaroori',
'zindagi':'zindagi',
'ziyada':'ziyada',
'zoom':'zoom',
'zyada':'zyada'
};

      Object.keys(dictOverrides).forEach(function(key) {
        var reg = new RegExp('\\b' + key + '\\b', 'gi');
        finalResult = finalResult.replace(reg, function(match) {
          if (match[0] === match[0].toUpperCase()) {
            return dictOverrides[key].charAt(0).toUpperCase() + dictOverrides[key].slice(1);
          }
          return dictOverrides[key];
        });
      });

      return finalResult;
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
        var hasPunct = /[.!?।\n,]/.test(prevW.word);

        if (currGroup.length >= maxWords || gap > maxGap || hasPunct) {
          var cText = currGroup.map(function(item) { return item.word; }).join(' ').trim();
          if (cText) {
            captions.push({
              id: 'word_cue_' + captions.length,
              start: Math.round(currGroup[0].start * 100) / 100,
              end: Math.round(currGroup[currGroup.length - 1].end * 100) / 100,
              text: cText
            });
          }
          currGroup = [w];
        } else {
          currGroup.push(w);
        }
      }

      if (currGroup.length) {
        var cTextFinal = currGroup.map(function(item) { return item.word; }).join(' ').trim();
        if (cTextFinal) {
          captions.push({
            id: 'word_cue_' + captions.length,
            start: Math.round(currGroup[0].start * 100) / 100,
            end: Math.round(currGroup[currGroup.length - 1].end * 100) / 100,
            text: cTextFinal
          });
        }
      }

      return captions;
    }

    async function transcribeVideoAudioWithGroq(audioBlob, apiKey, mode, onProgress) {
      onProgress(40, 'Sending audio to Groq Whisper AI...');

      var formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');
      formData.append('timestamp_granularities[]', 'segment');

      if (mode === 'hinglish_roman') {
        // Set language='hi' so Groq Whisper model achieves 99%+ articulate Hindi acoustic recognition
        formData.append('language', 'hi');
        formData.append('prompt', 'अरे सुनो! क्या तुम्हें मेरी आवाज़ साफ़ सुनाई दे रही है? आज का मौसम काफ़ी अच्छा है, लेकिन शायद शाम तक बारिश हो सकती है। clear Hindi speech transcription.');
      } else if (mode === 'en') {
        formData.append('language', 'en');
        formData.append('prompt', 'Clear English transcript captions.');
      } else if (mode === 'hi') {
        formData.append('language', 'hi');
      }

      var res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey.trim() },
        body: formData
      });

      if (!res.ok) {
        var errText = await res.text();
        throw new Error('Groq Transcription API Error (' + res.status + '): ' + errText);
      }

      onProgress(90, 'Processing VTT/SRT subtitles...');
      var data = await res.json();
      var segments = null;

      // Primary Strategy: Use word-level timestamps for millisecond precision & zero-lag sync
      if (data.words && data.words.length > 0) {
        segments = groupWordsIntoSubtitles(data.words, 6, 0.5);
      }

      // Secondary Strategy: Proportional segment chunking fallback
      if (!segments || segments.length === 0) {
        var rawSegments = data.segments || [];
        segments = splitSegmentsIntoShortCaptions(rawSegments, 6);
      }

      // If mode is Hinglish Roman, convert the ultra-accurate Devanagari text into natural Roman Hinglish
      if (mode === 'hinglish_roman') {
        segments.forEach(function (seg) {
          seg.text = devanagariToRoman(seg.text);
        });
      }

      videoSubState.segments = segments;
      videoSubState.vttText = segmentsToVTT(segments);
      videoSubState.srtText = segmentsToSRT(segments);

      onProgress(100, 'AI Subtitles Ready!');
      return segments;
    }

    function initVideoTab() {
      if (window._videoTabInitialized) return;
      window._videoTabInitialized = true;

      var uploadBtn = $('video-upload-btn');
      var fileInput = $('video-file-input');
      var video = $('video-player-el');

      initStylePad({
        touchId: 'vid-style-pad-touch',
        dotsId: 'vid-style-pad-dots',
        puckId: 'vid-style-pad-puck',
        glowId: 'vid-style-pad-glow',
        readoutId: 'vid-style-pad-readout',
        onChange: function (tone, warmth, isFinal) {
          state.vidStylePad = state.vidStylePad || {};
          state.vidStylePad.tone = tone;
          state.vidStylePad.warmth = warmth;
          refreshVideoGrading();
        }
      });

      renderVideoLutGrid('vid-lut-grid', state.vidLut || 'normal', function (lutId) {
        state.vidLut = lutId;
        refreshVideoGrading();
      });

      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function () { fileInput.click(); });
        fileInput.addEventListener('change', function (e) {
          var file = e.target.files[0];
          if (!file) return;
          audioManager.play('pop');

          state.videoFile = file;

          var url = URL.createObjectURL(file);
          video.src = url;
          show(video);
          show($('video-controls-bar'));
          hide($('video-empty-state'));
          $('video-file-name').textContent = file.name;

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

      if ($('btn-open-settings-api-key')) {
        $('btn-open-settings-api-key').addEventListener('click', function () {
          audioManager.play('pop');
          show($('settings-modal-overlay'));
          document.querySelectorAll('.settings-nav-item').forEach(function (el) { el.classList.remove('active'); });
          document.querySelectorAll('.settings-section-panel').forEach(function (el) { el.classList.add('hidden'); });
          var targetNav = document.querySelector('[data-settings-section="export"]');
          var targetPanel = $('settings-section-export');
          if (targetNav) targetNav.classList.add('active');
          if (targetPanel) show(targetPanel);
          var keyInp = $('settings-groq-api-key-input');
          if (keyInp) setTimeout(function () { keyInp.focus(); }, 150);
        });
      }

      // AI Subtitles Generation Handler
      if ($('btn-generate-subtitles')) {
        $('btn-generate-subtitles').addEventListener('click', async function () {
          var apiKey = (state.groqApiKey || '').trim();
          if (!apiKey) {
            showToast('No API key inserted for subtitle generation. Please configure your Groq API key in Settings.', 4000);
            audioManager.play('error');
            return;
          }

          var file = state.videoFile;
          if (!file && (!video || !video.src)) {
            showToast('Please upload a video file to generate AI subtitles.', 3000);
            return;
          }

          audioManager.play('pop');
          show($('subtitles-progress-container'));
          $('subtitles-progress-bar').style.width = '10%';
          $('subtitles-progress-text').textContent = 'Extracting Audio Track...';
          $('subtitles-progress-pct').textContent = '10%';

          try {
            var audioBlob;
            if (file) {
              audioBlob = await extractAudioBlobFromVideo(file, function (pct) {
                var p = Math.round(pct * 0.4);
                $('subtitles-progress-bar').style.width = p + '%';
                $('subtitles-progress-pct').textContent = p + '%';
              });
            } else {
              var fetchRes = await fetch(video.src);
              var fetchedFile = await fetchRes.blob();
              audioBlob = await extractAudioBlobFromVideo(fetchedFile, function (pct) {
                var p = Math.round(pct * 0.4);
                $('subtitles-progress-bar').style.width = p + '%';
                $('subtitles-progress-pct').textContent = p + '%';
              });
            }

            var modeSelect = $('transcribe-language-mode');
            var mode = modeSelect ? modeSelect.value : 'hinglish_roman';

            var segments = await transcribeVideoAudioWithGroq(audioBlob, apiKey, mode, function (pct, statusText) {
              var p = Math.round(40 + (pct * 0.6));
              $('subtitles-progress-bar').style.width = p + '%';
              $('subtitles-progress-pct').textContent = p + '%';
              $('subtitles-progress-text').textContent = statusText;
            });

            showToast('Generated ' + segments.length + ' AI Captions!', 3000);
            audioManager.play('success');

            show($('subtitle-style-controls'));
            show($('video-subtitle-overlay'));

          } catch (err) {
            console.error(err);
            showToast('AI Subtitle Generation failed: ' + err.message, 4000);
            audioManager.play('error');
          } finally {
            setTimeout(function () {
              hide($('subtitles-progress-container'));
            }, 3000);
          }
        });
      }

      function updateVideoProgressUI() {
        if (!video || !video.src) return;
        var currTime = video.currentTime || 0;
        var dur = video.duration;
        if (!isFinite(dur) || isNaN(dur) || dur <= 0) return;

        var pct = Math.min(100, Math.max(0, (currTime / dur) * 100));

        var fill = $('vid-seek-progress-fill');
        var handle = $('vid-seek-handle');
        var display = $('vid-timecode-display');

        if (fill) fill.style.setProperty('width', pct + '%', 'important');
        if (handle) handle.style.setProperty('left', pct + '%', 'important');
        if (display) display.textContent = formatTimecode(currTime) + ' / ' + formatTimecode(dur);
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
          if (btn) btn.innerHTML = '<i data-lucide="pause" style="width:16px; height:16px;"></i>';
          refreshLucideIcons();
          startVideoProgressLoop();
        });

        video.addEventListener('pause', function () {
          var btn = $('btn-vid-play-pause');
          if (btn) btn.innerHTML = '<i data-lucide="play" style="width:16px; height:16px;"></i>';
          refreshLucideIcons();
          updateVideoProgressUI();
        });

        video.addEventListener('ended', function () {
          var btn = $('btn-vid-play-pause');
          if (btn) btn.innerHTML = '<i data-lucide="play" style="width:16px; height:16px;"></i>';
          refreshLucideIcons();
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

      // Rewind -10s Button
      if ($('btn-vid-rewind')) {
        $('btn-vid-rewind').addEventListener('click', function () {
          if (!video || !video.src) return;
          audioManager.play('pop');
          video.currentTime = Math.max(0, video.currentTime - 10);
          updateVideoProgressUI();
        });
      }

      // Forward +10s Button
      if ($('btn-vid-forward')) {
        $('btn-vid-forward').addEventListener('click', function () {
          if (!video || !video.src || isNaN(video.duration)) return;
          audioManager.play('pop');
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          updateVideoProgressUI();
        });
      }

      // Smooth Timeline Dragging & Click-to-Seek
      var seekTrack = $('vid-seek-track-container');
      if (seekTrack) {
        window._isSeekingVideo = false;

        function handleSeekPos(e) {
          if (!video || !video.src || !isFinite(video.duration) || isNaN(video.duration) || video.duration <= 0) return;

          var rect = seekTrack.getBoundingClientRect();
          var offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
          var pct = Math.min(1, Math.max(0, offsetX / rect.width));
          var targetTime = pct * video.duration;

          video.currentTime = targetTime;
          updateVideoProgressUI();
        }

        seekTrack.addEventListener('mousedown', function (e) {
          window._isSeekingVideo = true;
          handleSeekPos(e);
        });

        window.addEventListener('mousemove', function (e) {
          if (window._isSeekingVideo) {
            handleSeekPos(e);
          }
        });

        window.addEventListener('mouseup', function () {
          if (window._isSeekingVideo) {
            window._isSeekingVideo = false;
            updateVideoProgressUI();
          }
        });
      }

      if ($('vid-volume-slider')) {
        $('vid-volume-slider').addEventListener('input', function (e) {
          if (!video) return;
          video.volume = Number(e.target.value) / 100;
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
            var unit = id === 'vid-hue' ? '°' : (id === 'vid-temp' ? '' : '%');
            valEl.textContent = slider.value + unit;
          }
          refreshVideoGrading();
        });
      });

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

      var exportBtn = $('video-export-btn');
      if (exportBtn) exportBtn.addEventListener('click', exportGradedVideo);
    }

    function exportGradedVideo() {
      var video = $('video-player-el');
      var sourceEl = (video && video.src && video.videoWidth) ? video : null;
      if (!sourceEl) {
        showToast('Please load a video first.', 2500);
        return;
      }

      var w = Math.round((sourceEl.videoWidth || 1280) * videoState.scale);
      var h = Math.round((sourceEl.videoHeight || 720) * videoState.scale);
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      var canvasStream = canvas.captureStream(60);
      var combinedStream = new MediaStream();

      // 1. Add color-graded & captioned video track from canvas
      canvasStream.getVideoTracks().forEach(function (vt) {
        combinedStream.addTrack(vt);
      });

      // 2. Extract and attach original audio track from source video
      if (sourceEl && sourceEl.tagName === 'VIDEO') {
        try {
          var vidStream = sourceEl.captureStream ? sourceEl.captureStream() : (sourceEl.mozCaptureStream ? sourceEl.mozCaptureStream() : null);
          if (vidStream && vidStream.getAudioTracks().length > 0) {
            vidStream.getAudioTracks().forEach(function (at) {
              combinedStream.addTrack(at);
            });
          } else if (window.AudioContext || window.webkitAudioContext) {
            if (!videoState.audioCtx) {
              videoState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (!videoState.audioSrcNode) {
              videoState.audioSrcNode = videoState.audioCtx.createMediaElementSource(sourceEl);
              videoState.audioDest = videoState.audioCtx.createMediaStreamDestination();
              videoState.audioSrcNode.connect(videoState.audioDest);
              videoState.audioSrcNode.connect(videoState.audioCtx.destination);
            }
            if (videoState.audioDest && videoState.audioDest.stream) {
              videoState.audioDest.stream.getAudioTracks().forEach(function (at) {
                combinedStream.addTrack(at);
              });
            }
          }
        } catch (audioErr) {
          console.warn('Could not attach audio track to video export:', audioErr);
        }
      }

      var mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      var recorder = new MediaRecorder(combinedStream, { mimeType: mimeType, videoBitsPerSecond: 16000000 });
      var chunks = [];
      recorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = function () {
        var blob = new Blob(chunks, { type: 'video/webm' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'gradial_graded_video_' + Date.now() + '.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
        showToast('Video exported successfully!', 2500);
        hide($('export-modal-overlay'));
      };

      $('export-modal-title').textContent = 'Exporting Video...';
      $('export-modal-status').textContent = 'Encoding graded video frames & captions...';
      $('export-progress-fill').style.width = '0%';
      $('export-modal-percent').textContent = '0%';
      show($('export-modal-overlay'));

      var filterString = buildVideoFilterCss();

      if (sourceEl.tagName === 'VIDEO') {
        sourceEl.currentTime = 0;
        sourceEl.play();
      }
      recorder.start();

      var durationSec = (sourceEl.duration && !isNaN(sourceEl.duration)) ? sourceEl.duration : 5;
      var startTime = performance.now();

      function drawFrame() {
        var elapsed = (performance.now() - startTime) / 1000;
        if (elapsed >= durationSec || (sourceEl.tagName === 'VIDEO' && sourceEl.ended)) {
          if (recorder.state !== 'inactive') recorder.stop();
          return;
        }
        ctx.filter = filterString;
        ctx.drawImage(sourceEl, 0, 0, w, h);

        // Burn active subtitle text on export if enabled
        if (videoSubState.burnCaptions && sourceEl.currentTime) {
          var currTime = sourceEl.currentTime;
          var activeSeg = videoSubState.segments.find(function (s) {
            return currTime >= s.start && currTime <= s.end;
          });
          if (activeSeg && activeSeg.text) {
            ctx.filter = 'none';
            ctx.font = '800 ' + Math.round(w * 0.035) + 'px Outfit, sans-serif';
            ctx.textAlign = 'center';
            var txt = activeSeg.text.trim();
            var textY = h * 0.88;
            
            // Draw background highlight box
            var metrics = ctx.measureText(txt);
            var boxW = metrics.width + 30;
            var boxH = Math.round(w * 0.05);
            ctx.fillStyle = videoSubState.bgColor || 'rgba(0,0,0,0.85)';
            ctx.fillRect((w / 2) - (boxW / 2), textY - (boxH * 0.75), boxW, boxH);

            ctx.fillStyle = videoSubState.textColor || '#FFFF00';
            ctx.fillText(txt, w / 2, textY);
          }
        }

        var pct = Math.min(100, Math.round((elapsed / durationSec) * 100));
        $('export-progress-fill').style.width = pct + '%';
        $('export-modal-percent').textContent = pct + '%';
        $('export-modal-status').textContent = 'Encoding (' + pct + '%)...';

        requestAnimationFrame(drawFrame);
      }
      requestAnimationFrame(drawFrame);
    }

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
      audioManager.play('pop');

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
      audioManager.play('pop');

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
          updateColorDisplay();
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
          if ($('filter-hue-val')) $('filter-hue-val').textContent = snapshot.hue + '°';
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
          renderLutGrid('img-lut-grid', state.imgLut, function (lutId) {
            state.imgLut = lutId;
            updatePreviewFromEditorCanvas();
          });
        }

        initSliderFills();
        updatePreviewFromEditorCanvas();
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

    // --- Tab Switcher ---

    function switchTab(tab) {
      state.activeTab = tab;
      if ($('tab-btn-image')) $('tab-btn-image').classList.toggle('active', tab === 'image');
      if ($('tab-btn-gradient')) $('tab-btn-gradient').classList.toggle('active', tab === 'gradient');
      if ($('tab-btn-video')) $('tab-btn-video').classList.toggle('active', tab === 'video');

      if ($('sidebar-image-controls')) toggle($('sidebar-image-controls'), tab === 'image');
      if ($('sidebar-gradient-controls')) toggle($('sidebar-gradient-controls'), tab === 'gradient');
      if ($('sidebar-video-controls')) toggle($('sidebar-video-controls'), tab === 'video');
      if ($('workspace-image-layout')) toggle($('workspace-image-layout'), tab === 'image');
      if ($('workspace-gradient-layout')) toggle($('workspace-gradient-layout'), tab === 'gradient');
      if ($('workspace-video-layout')) toggle($('workspace-video-layout'), tab === 'video');

      if (tab === 'gradient') {
        renderColorStops();
        renderPositionalPointsList();
        renderGradientResolutions();
        updateGradientPreview();
        updateCssOutput();
      } else if (tab === 'image') {
        if (state.imageObj) {
          show($('source-canvas-wrap'));
          hide($('upload-placeholder'));
        } else {
          show($('upload-placeholder'));
          hide($('source-canvas-wrap'));
        }
      } else if (tab === 'video') {
        if (typeof initVideoTab === 'function') {
          initVideoTab();
        }
        var video = $('video-player-el');
        if (!video || !video.src) {
          show($('video-empty-state'));
        }
      }
      initSliderFills();
      refreshLucideIcons();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
    window.addEventListener('load', function () {
      refreshLucideIcons();
      setTimeout(refreshLucideIcons, 100);
      setTimeout(refreshLucideIcons, 500);
    });

  }) ();
