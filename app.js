(function() { 'use strict';

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

    var cssGradients = points.map(function(pt) {
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
  function show(el) { if(el) el.classList.remove('hidden'); }
  function hide(el) { if(el) el.classList.add('hidden'); }
  function toggle(el, visible) { visible ? show(el) : hide(el); }

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
      setMuted: function(muted) { isMuted = muted; },
      setVolume: function(vol) { volumeLevel = Math.max(0, Math.min(1, vol)); },
      play: function(type) {
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
          [523.25, 659.25, 783.99].forEach(function(freq, idx) {
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
          [440, 554.37, 659.25, 880].forEach(function(freq, idx) {
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
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          audioManager.play('woosh');
          hide(overlay);
        }
      });
    }

    var closeBtn = $('color-picker-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        audioManager.play('woosh');
        hide($('color-picker-modal-overlay'));
      });
    }

    var applyBtn = $('cp-apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        audioManager.play('pop');
        if (currentCpCallback) currentCpCallback(cpState.hex);
        hide($('color-picker-modal-overlay'));
      });
    }

    if ($('cp-hex-input')) {
      $('cp-hex-input').addEventListener('input', function(e) {
        var val = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          var hsv = hexToHsv(val);
          cpState.h = hsv.h; cpState.s = hsv.s; cpState.v = hsv.v;
          updateColorPickerUI();
        }
      });
    }

    ['cp-r-input', 'cp-g-input', 'cp-b-input'].forEach(function(id) {
      var inp = $(id);
      if (inp) {
        inp.addEventListener('input', function() {
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
      QUICK_PALETTE_COLORS.forEach(function(qc) {
        var btn = document.createElement('div');
        btn.style.cssText = 'width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 2px 6px rgba(0,0,0,0.4); transition: transform 0.15s ease;';
        btn.style.backgroundColor = qc;
        btn.addEventListener('mouseenter', function() { btn.style.transform = 'scale(1.2)'; btn.style.borderColor = '#ffffff'; });
        btn.addEventListener('mouseleave', function() { btn.style.transform = 'scale(1)'; btn.style.borderColor = 'rgba(255,255,255,0.2)'; });
        btn.addEventListener('click', function() {
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
      $('cp-sat-val-area').addEventListener('mousedown', function(e) {
        isDraggingSV = true;
        handleSVDOMouseEvent(e);
      });
      document.addEventListener('mousemove', function(e) {
        if (isDraggingSV) handleSVDOMouseEvent(e);
      });
      document.addEventListener('mouseup', function() {
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
      $('cp-hue-track').addEventListener('mousedown', function(e) {
        isDraggingHue = true;
        handleHueMouseEvent(e);
      });
      document.addEventListener('mousemove', function(e) {
        if (isDraggingHue) handleHueMouseEvent(e);
      });
      document.addEventListener('mouseup', function() {
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

    // Eraser / Image / Layers / Retouching
    imageSrc: null,
    imageObj: null,
    targetColor: { r: 255, g: 255, b: 255 },
    tolerance: 15,
    edgeFeather: 20,
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
      var kf = state.keyframes.find(function(k) { return k.percent === state.selectedKeyframePct; });
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
        data[i]     = Math.round(origR * (1 - strength) + transformed.r * strength);
        data[i + 1] = Math.round(origG * (1 - strength) + transformed.g * strength);
        data[i + 2] = Math.round(origB * (1 - strength) + transformed.b * strength);
      } else {
        data[i]     = transformed.r;
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

    LUT_PRESETS.forEach(function(lut) {
      var card = document.createElement('div');
      card.className = 'lut-card' + (lut.id === currentLutId ? ' active' : '');
      card.dataset.lut = lut.id;
      card.innerHTML = 
        '<div class="lut-preview-swatch" style="background:' + lut.color + '"></div>' +
        '<div style="overflow:hidden;">' +
          '<div class="lut-card-title">' + lut.title + '</div>' +
          '<div class="lut-card-sub">' + lut.sub + '</div>' +
        '</div>' +
        '<div class="lut-active-badge"></div>';

      card.addEventListener('click', function() {
        audioManager.play('pop');
        container.querySelectorAll('.lut-card').forEach(function(c) { c.classList.remove('active'); });
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

    touchArea.addEventListener('pointerdown', function(e) {
      isDragging = true;
      touchArea.setPointerCapture(e.pointerId);
      audioManager.play('pop');
      handlePointerEvent(e, false);
    });

    touchArea.addEventListener('pointermove', function(e) {
      if (isDragging) {
        handlePointerEvent(e, false);
      }
    });

    touchArea.addEventListener('pointerup', function(e) {
      if (isDragging) {
        isDragging = false;
        try { touchArea.releasePointerCapture(e.pointerId); } catch(err) {}
        handlePointerEvent(e, true);
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
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
    document.querySelectorAll('.canvas-element').forEach(function(el) {
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
      document.querySelectorAll('.theme-card').forEach(function(c) {
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
        state.targetColorPicked = false; // Don't auto-erase on upload

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
        updatePreviewFromEditorCanvas();
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

    if (state.targetColorPicked) {
      try {
        var imageData = editorCtx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
        var data = imageData.data;
        var distanceThreshold = (state.tolerance / 100) * MAX_COLOR_DISTANCE;
        var tr = state.targetColor.r;
        var tg = state.targetColor.g;
        var tb = state.targetColor.b;
        // Edge Feather: soften the cutoff into a ramp instead of a hard on/off edge,
        // so erased edges anti-alias instead of looking jagged.
        var featherBand = ((state.edgeFeather || 0) / 100) * MAX_COLOR_DISTANCE * 0.35;

        for (var i = 0; i < data.length; i += 4) {
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
              var t = (dist - innerEdge) / (outerEdge - innerEdge); // 0 (matched) -> 1 (kept)
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
    var f = state.imageFilters;
    return 'brightness(' + f.brightness + '%) ' +
           'contrast(' + f.contrast + '%) ' +
           'saturate(' + f.saturate + '%) ' +
           'hue-rotate(' + (f.hue || 0) + 'deg) ' +
           'grayscale(' + (f.grayscale || 0) + '%) ' +
           'sepia(' + (f.sepia || 0) + '%) ' +
           'invert(' + (f.invert || 0) + '%) ' +
           'blur(' + (f.blur * scale) + 'px)';
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
    tctx.imageSmoothingEnabled = true;
    tctx.imageSmoothingQuality = 'high';
    tctx.filter = buildImageFilterCss(1);
    tctx.drawImage(editorCanvas, 0, 0, previewW, previewH);

    // Apply LUT & 2D Style Pad to lightweight preview image data (0 lag)
    if ((state.imgLut && state.imgLut !== 'none') || state.imgStylePad.tone !== 0 || state.imgStylePad.warmth !== 0) {
      var imgData = tctx.getImageData(0, 0, tmp.width, tmp.height);
      applyLutAndStylePadToImageData(imgData, state.imgLut, state.imgLutStrength, state.imgStylePad.tone, state.imgStylePad.warmth);
      tctx.putImageData(imgData, 0, 0);
    }

    var url = tmp.toDataURL('image/jpeg', 0.88);
    var prevImg = $('preview-result-img');
    if (prevImg) {
      prevImg.src = url;
      show(prevImg);
    }
    if ($('preview-placeholder-text')) hide($('preview-placeholder-text'));
    renderImageExportBlock();
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

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // If Alpha Channel Transparency is DISABLED, fill background with solid white (#FFFFFF)
      if (!state.defaultExportAlpha) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Apply CSS Filters to the canvas context so they are baked into the PNG
      ctx.filter = buildImageFilterCss(state.exportScale);

      ctx.drawImage(editorCanvas, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none'; // reset

      // Apply LUT & 2D Style Pad to export canvas image data
      if ((state.imgLut && state.imgLut !== 'none') || state.imgStylePad.tone !== 0 || state.imgStylePad.warmth !== 0) {
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyLutAndStylePadToImageData(imgData, state.imgLut, state.imgLutStrength, state.imgStylePad.tone, state.imgStylePad.warmth);
        ctx.putImageData(imgData, 0, 0);
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
            if (window.lucide) lucide.createIcons();
            setTimeout(function () {
              btn.innerHTML = '<i data-lucide="download"></i><span>Export PNG</span>';
              if (window.lucide) lucide.createIcons();
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

    if (state.imageObj) {
      block.innerHTML =
        '<div class="status-pill"><i data-lucide="check-circle"></i> Ready to export</div>' +
        '<div style="height: 10px;"></div>' +
        '<div style="position: relative;" id="image-export-anchor-sk">' +
          '<div style="display: flex; gap: 8px;">' +
            '<button class="btn-sk btn-primary-sk" id="image-export-main-btn" style="flex: 1;">' +
              '<i data-lucide="download"></i> <span>Export PNG</span>' +
            '</button>' +
            '<button class="btn-sk btn-icon-sk" id="image-export-scale-btn">' +
              '<i data-lucide="settings"></i>' +
            '</button>' +
          '</div>' +
          '<div class="dropdown-menu-sk hidden" id="image-export-menu-sk">' +
            '<div class="dropdown-header-sk">Resolution Scale</div>' +
            '<div style="padding: 4px;">' +
              [0.5, 1, 2, 4].map(function (scale) {
                var isSelected = state.exportScale === scale;
                return '<button class="dropdown-item-sk' + (isSelected ? ' selected' : '') + '" data-scale="' + scale + '">' +
                  '<span>' + scale + 'x' + (scale === 1 ? ' (Original)' : '') + '</span>' +
                  (isSelected ? '<i data-lucide="check" style="width: 14px; height: 14px; color: var(--accent-primary);"></i>' : '') +
                '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="height: 8px;"></div>' +
        '<button class="btn-sk btn-danger-sk" id="image-clear-all-btn">' +
          '<i data-lucide="rotate-ccw"></i> Clear Image' +
        '</button>';

      if (window.lucide) lucide.createIcons();

      document.getElementById('image-export-main-btn').addEventListener('click', handleImageExport);
      document.getElementById('image-export-scale-btn').addEventListener('click', function (e) {
        e.stopPropagation();
        state.isImageExportMenuOpen = !state.isImageExportMenuOpen;
        toggle(document.getElementById('image-export-menu-sk'), state.isImageExportMenuOpen);
      });
      document.querySelectorAll('#image-export-menu-sk .dropdown-item-sk').forEach(function (item) {
        item.addEventListener('click', function () {
          state.exportScale = Number(item.dataset.scale);
          state.isImageExportMenuOpen = false;
          renderImageExportBlock();
        });
      });
      document.getElementById('image-clear-all-btn').addEventListener('click', handleClearAllImage);
    } else {
      block.innerHTML = '<div class="status-pill" style="opacity: 0.7;">Upload an image to edit</div>';
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
        openCustomColorPicker(state.gradientColors[idx], function(newColor) {
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

    GRADIENT_RESOLUTIONS.forEach(function (res) {
      var btn = document.createElement('button');
      btn.className = 'dropdown-item-sk';
      btn.type = 'button';
      btn.style.cssText = 'width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: none; background: transparent; color: var(--text-main); font-weight: 700; font-size: 0.84rem; cursor: pointer; border-radius: 8px; transition: background 0.15s ease; white-space: nowrap; gap: 12px;';
      
      var bitrateBadge = isAnimatedMode ? '<span class="res-bitrate-badge" style="font-family: var(--font-main); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.02em; padding: 2px 8px; border-radius: 999px; background: var(--bg-recessed); color: var(--accent-primary); border: 1px solid var(--border-color); display: inline-flex; align-items: center;">' + currentMbps + '</span>' : '';
      
      btn.innerHTML =
        '<div style="display:flex; align-items:center; gap:8px; white-space:nowrap; overflow:hidden;">' +
          '<span style="font-weight:700;">' + res.label + '</span>' +
          bitrateBadge +
        '</div>' +
        '<span style="font-family:var(--font-mono); font-size:0.75rem; opacity:0.75; white-space:nowrap; flex-shrink:0;">' + res.width + ' × ' + res.height + '</span>';

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        handleExportGradient(res);
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
      var icon = isVideoMode ? 'video' : 'download';
      var label = isVideoMode ? 'Export Video (MP4)' : 'Export FHD';
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
        openCustomColorPicker(state.meshColors[sidx], function(newColor) {
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
          '<div class="slider-info-row"><span class="slider-title">Spread Radius</span><span class="slider-val-badge">' + Math.round((pt.radius||0.65) * 100) + '%</span></div>' +
          '<input type="range" class="fluid-radius-slider" min="0.2" max="1.2" step="0.05" value="' + (pt.radius||0.65) + '" data-fidx="' + idx + '">' +
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
        openCustomColorPicker(state.fluidPoints[fidx].color, function(newColor) {
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
          '<div style="display: flex; align-items: center; gap: 6px;">' +
            '<span class="corner-card-label" style="font-weight: 700; font-size: 0.78rem; color: var(--accent-primary);">Point #' + (idx + 1) + '</span>' +
            '<span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted);">(' + Math.round(pt.x * 100) + '%, ' + Math.round(pt.y * 100) + '%)</span>' +
          '</div>' +
          '<button class="positional-point-remove-btn btn-sk btn-icon-sk" data-pidx="' + idx + '"' + ((state.positionalPoints.length <= 2) ? ' disabled' : '') + ' style="width: 22px; height: 22px; padding: 0;">' +
            '<i data-lucide="x" style="width:12px; height:12px;"></i>' +
          '</button>' +
        '</div>' +
        '<div style="display: flex; align-items: center; gap: 8px;">' +
          '<div class="color-picker-wrap custom-cp-trigger" data-pidx="' + idx + '" style="width: 28px; height: 28px; cursor: pointer;">' +
            '<div class="color-picker-swatch" style="background-color: ' + pt.color + '; pointer-events: none;"></div>' +
          '</div>' +
          '<input type="text" class="text-input-sk positional-hex-input" value="' + pt.color.toUpperCase() + '" data-pidx="' + idx + '" style="flex: 1; font-size: 0.75rem; padding: 4px 6px;">' +
        '</div>' +
        '<div class="quick-palette-row">' +
          quickDotsHtml +
        '</div>' +
        '<div style="display: flex; flex-direction: column; gap: 4px;">' +
          '<div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-sub);">' +
            '<span>Intensity</span>' +
            '<span class="positional-intensity-badge" style="font-family: var(--font-mono); font-weight: 700; color: var(--color-seaweed);">' + (pt.intensity || 85) + '%</span>' +
          '</div>' +
          '<input type="range" class="positional-intensity-slider sk-slider" min="20" max="150" value="' + (pt.intensity || 85) + '" data-pidx="' + idx + '">' +
        '</div>' +
        '<div style="display: flex; flex-direction: column; gap: 4px;">' +
          '<div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-sub);">' +
            '<span>Spread Radius</span>' +
            '<span class="positional-radius-badge" style="font-family: var(--font-mono); font-weight: 700; color: var(--color-seaweed);">' + Math.round((pt.radius || 0.7) * 100) + '%</span>' +
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
        openCustomColorPicker(state.positionalPoints[pidx].color, function(newColor) {
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
    if (mode !== '4-corner' && mode !== '6-corner' && mode !== 'fluid' && mode !== 'positional') return;

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
      handlesData = state.fluidPoints.map(function(pt, idx) {
        return { label: '#' + (idx + 1), x: pt.x, y: pt.y, color: pt.color, type: 'fluid', idx: idx };
      });
    } else if (mode === 'positional') {
      handlesData = (state.positionalPoints || []).map(function(pt, idx) {
        return { label: '#' + (idx + 1), x: pt.x, y: pt.y, color: pt.color, type: 'positional', idx: idx };
      });
    }

    handlesData.forEach(function(h) {
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

      handleEl.addEventListener('pointerdown', function(e) {
        isDragging = true;
        handleEl.classList.add('dragging');
        handleEl.setPointerCapture(e.pointerId);
        audioManager.play('pop');
        e.stopPropagation();
      });

      handleEl.addEventListener('pointermove', onPointerMove);

      handleEl.addEventListener('pointerup', function(e) {
        if (isDragging) {
          isDragging = false;
          handleEl.classList.remove('dragging');
          try { handleEl.releasePointerCapture(e.pointerId); } catch(err) {}
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

    colors.forEach(function(col, idx) {
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
      var sec = ( (kf.percent / 100) * state.animationDuration ).toFixed(1);
      var card = document.createElement('div');
      card.className = 'keyframe-item-card';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'stretch';
      card.style.gap = '4px';

      var kx = kf.posX !== undefined ? kf.posX : 50;
      var ky = kf.posY !== undefined ? kf.posY : 50;
      var curAngle = kf.angle !== undefined ? kf.angle : 90;

      var compassHtml = '<div class="direction-compass-dial" title="Select Gradient Direction">';
      compassOptions.forEach(function(opt) {
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
      kfColors.forEach(function(c, i) {
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
          var kf = state.keyframes.find(function(k) { return k.percent === pct; });
          if(kf) {
            state.currentTime = (kf.percent / 100) * state.animationDuration;
            updateTimelineUI();
            if (kf.colors) state.gradientColors = kf.colors.slice();
            if (kf.angle !== undefined) state.gradientAngle = kf.angle;
            $('angle-slider').value = state.gradientAngle;
            $('angle-val').textContent = state.gradientAngle + '°';
            if(typeof renderColorStops === 'function') renderColorStops();
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
        if(state.keyframes.length > 2) {
          state.keyframes = state.keyframes.filter(function(k) { return k.percent !== pct; });
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
        var targetKf = state.keyframes.find(function(k) { return k.percent === pct; });
        if (targetKf) {
          state.currentTime = (targetKf.percent / 100) * state.animationDuration;
          updateTimelineUI();
          if (!targetKf.colors) targetKf.colors = state.gradientColors.slice();
          var initColor = targetKf.colors[idx] || '#216869';
          openCustomColorPicker(initColor, function(newColor) {
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
      preview.querySelectorAll('canvas').forEach(function(c) { c.remove(); });
    }

    var noiseDataUri = state.enableNoise ? generateNoiseSvgDataUri(state.noiseFrequency, state.noiseOpacity) : '';
    var noiseUrl = state.enableNoise ? "url('" + noiseDataUri + "')" : '';

    preview.style.animation = '';

    if (mode === 'linear') {
      var css = 'linear-gradient(' + state.gradientAngle + 'deg, ' + state.gradientColors.join(', ') + ')';
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
        'radial-gradient(farthest-corner at top left, ' + state.meshColors[0] + ' 0%, ' + hexToRgba(state.meshColors[0], 0) + ' ' + (ints[0]*1.2) + '%)',
        'radial-gradient(farthest-corner at top right, ' + state.meshColors[1] + ' 0%, ' + hexToRgba(state.meshColors[1], 0) + ' ' + (ints[1]*1.2) + '%)',
        'radial-gradient(farthest-corner at bottom right, ' + state.meshColors[2] + ' 0%, ' + hexToRgba(state.meshColors[2], 0) + ' ' + (ints[2]*1.2) + '%)',
        'radial-gradient(farthest-corner at bottom left, ' + state.meshColors[3] + ' 0%, ' + hexToRgba(state.meshColors[3], 0) + ' ' + (ints[3]*1.2) + '%)'
      ];
      var meshCss = parts.join(', ');
      preview.style.background = '';
      preview.style.backgroundImage = state.enableNoise ? noiseUrl + ', ' + meshCss : meshCss;

    } else if (mode === 'animated') {
      startAnimatedGradientLoop();
    }
  }

  function lerpColor(c1, c2, t) {
    if(!c1) return c2 || '#000000';
    if(!c2) return c1;
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
        for(var c=0; c<maxLen; c++) {
          var col1 = c1List[c] || c1List[c1List.length-1];
          var col2 = c2List[c] || c2List[c2List.length-1];
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
      var css = 'linear-gradient(' + state.gradientAngle + 'deg, ' + state.gradientColors.join(', ') + ')';
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
      var fluidPartsCss = state.fluidPoints.map(function(pt) {
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
              setTimeout(function () { btnSpan.textContent = 'Export FHD'; }, 2000);
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
        state.gradientColors.forEach(function (color, i) {
          grad.addColorStop(i / Math.max(1, state.gradientColors.length - 1), color);
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
        var r_avg=0, g_avg=0, b_avg=0;
        for(var i=0; i<4; i++) {
          var rgb = hexToRgba(state.meshColors[i], 1).match(/\d+/g).map(Number);
          r_avg += rgb[0]; g_avg += rgb[1]; b_avg += rgb[2];
        }
        ctx.fillStyle = 'rgb(' + Math.round(r_avg/4) + ',' + Math.round(g_avg/4) + ',' + Math.round(b_avg/4) + ')';
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
    } catch(e) {
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
        try { if (videoEncoder) videoEncoder.close(); } catch (e) {}
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

    loadTheme();
    loadPreferences();
    bindEvents();
    if (typeof updateColorDisplay === 'function') updateColorDisplay();
    if (typeof renderImageExportBlock === 'function') renderImageExportBlock();
    if (typeof renderColorStops === 'function') renderColorStops();
    if (typeof renderPositionalPointsList === 'function') renderPositionalPointsList();
    if (typeof renderCornerGrid === 'function') renderCornerGrid();
    if (typeof renderTimelineMarkers === 'function') renderTimelineMarkers();
    if (typeof renderKeyframesList === 'function') renderKeyframesList();
    if (typeof renderGradientResolutions === 'function') renderGradientResolutions();
    if (typeof updateImageControlsState === 'function') {
      updateImageControlsState();
    }
    updateGradientPreview();
    updateCssOutput();
    initSliderFills();
    renderLayersList();
    refreshLucideIcons();
  }

  function renderLayersList() {
    // Stub to prevent ReferenceErrors
  }

  function bindEvents() {
    // Settings Modal
    if ($('open-settings-btn')) {
      $('open-settings-btn').addEventListener('click', function() {
        audioManager.play('pop');
        show($('settings-modal-overlay'));
        initSliderFills();
      });
    }
    if ($('open-my-gradial-btn')) {
      $('open-my-gradial-btn').addEventListener('click', function() {
        audioManager.play('pop');
        show($('settings-modal-overlay'));
        initSliderFills();
      });
    }
    
    if ($('close-settings-btn')) {
      $('close-settings-btn').addEventListener('click', function() {
        audioManager.play('pop');
        hide($('settings-modal-overlay'));
      });
    }
    
    // Event delegation for theme cards and settings category sidebar
    if ($('settings-modal-overlay')) {
      $('settings-modal-overlay').addEventListener('click', function(e) {
        var card = e.target.closest('.theme-card');
        if (card) {
          audioManager.play('pop');
          document.querySelectorAll('.theme-card').forEach(function(c) { c.classList.remove('active'); });
          card.classList.add('active');
          applyTheme(card.getAttribute('data-theme'));
        }

        var navBtn = e.target.closest('.settings-nav-item');
        if (navBtn) {
          audioManager.play('pop');
          var targetSection = navBtn.getAttribute('data-settings-section');
          document.querySelectorAll('.settings-nav-item').forEach(function(btn) {
            btn.classList.toggle('active', btn === navBtn);
          });
          document.querySelectorAll('.settings-section-panel').forEach(function(panel) {
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
      soundBtn.addEventListener('click', function() {
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
      volSlider.addEventListener('input', function(e) {
        var val = Number(e.target.value) / 100;
        audioManager.setVolume(val);
        if ($('setting-volume-val')) $('setting-volume-val').textContent = e.target.value + '%';
        localStorage.setItem('gradial-sound-volume', val);
      });
    }

    // Motion Modes
    if ($('setting-motion-smooth')) {
      $('setting-motion-smooth').addEventListener('click', function() {
        audioManager.play('pop');
        setMotionUI('smooth');
      });
    }
    if ($('setting-motion-snappy')) {
      $('setting-motion-snappy').addEventListener('click', function() {
        audioManager.play('pop');
        setMotionUI('snappy');
      });
    }

    // Downsampling & GPU Offloading
    if ($('setting-downsample-05')) {
      $('setting-downsample-05').addEventListener('click', function() { setDownsampleRatio(0.5); audioManager.play('pop'); });
    }
    if ($('setting-downsample-10')) {
      $('setting-downsample-10').addEventListener('click', function() { setDownsampleRatio(1.0); audioManager.play('pop'); });
    }
    if ($('setting-gpu-offload-btn')) {
      $('setting-gpu-offload-btn').addEventListener('click', function() { setGpuOffload(!state.useGpuOffloading); audioManager.play('pop'); });
    }

    // Export Defaults
    if ($('setting-export-fmt-mp4')) {
      $('setting-export-fmt-mp4').addEventListener('click', function() { setExportFormat('mp4'); audioManager.play('pop'); });
    }
    if ($('setting-export-fmt-webm')) {
      $('setting-export-fmt-webm').addEventListener('click', function() { setExportFormat('webm'); audioManager.play('pop'); });
    }
    if ($('setting-export-fps-60')) {
      $('setting-export-fps-60').addEventListener('click', function() { setExportFps(60); audioManager.play('pop'); });
    }
    if ($('setting-export-fps-30')) {
      $('setting-export-fps-30').addEventListener('click', function() { setExportFps(30); audioManager.play('pop'); });
    }
    if ($('setting-export-bitrate-slider')) {
      $('setting-export-bitrate-slider').addEventListener('input', function(e) {
        setExportBitrate(e.target.value);
      });
    }
    if ($('setting-export-alpha-toggle')) {
      $('setting-export-alpha-toggle').addEventListener('click', function() {
        setExportAlpha(!state.defaultExportAlpha);
        audioManager.play('pop');
      });
    }

    // Copy Hotkey Cheatsheet
    if ($('copy-hotkeys-btn')) {
      $('copy-hotkeys-btn').addEventListener('click', function() {
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
          navigator.clipboard.writeText(cheatsheet).then(function() {
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
      $('file-input-element').addEventListener('change', function(e) {
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
        scheduleProcessing();
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

      angleDial.addEventListener('mousedown', function(e) {
        isDraggingDial = true;
        handleDialEvent(e);
      });
      angleDial.addEventListener('touchstart', function(e) {
        isDraggingDial = true;
        handleDialEvent(e);
      }, { passive: true });

      document.addEventListener('mousemove', function(e) {
        if (isDraggingDial) handleDialEvent(e);
      });
      document.addEventListener('touchmove', function(e) {
        if (isDraggingDial) handleDialEvent(e);
      }, { passive: true });

      document.addEventListener('mouseup', function() { isDraggingDial = false; });
      document.addEventListener('touchend', function() { isDraggingDial = false; });
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

    ['brightness', 'contrast', 'saturate', 'blur', 'hue'].forEach(function(filter) {
      var slider = $('filter-' + filter);
      if (slider) {
        slider.addEventListener('input', function(e) {
          state.imageFilters[filter] = Number(e.target.value);
          var unit = filter === 'blur' ? 'px' : (filter === 'hue' ? '°' : '%');
          if ($('filter-' + filter + '-val')) $('filter-' + filter + '-val').textContent = state.imageFilters[filter] + unit;
          updateFilters(true);
        });
        slider.addEventListener('change', function() {
          updateFilters(false);
        });
      }
    });

    // Quick Effect Toggles (Grayscale / Sepia / Invert) — simple on/off
    [['filter-toggle-grayscale', 'grayscale'], ['filter-toggle-sepia', 'sepia'], ['filter-toggle-invert', 'invert']].forEach(function(pair) {
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
        if (!state.imageObj) return;
        audioManager.play('pop');
        var w = editorCanvas.width, h = editorCanvas.height;
        var tmp = document.createElement('canvas');
        tmp.width = h; tmp.height = w;
        var tctx = tmp.getContext('2d');
        tctx.translate(h / 2, w / 2);
        tctx.rotate(Math.PI / 2);
        tctx.drawImage(editorCanvas, -w / 2, -h / 2);
        editorCanvas.width = h; editorCanvas.height = w;
        editorCtx.clearRect(0, 0, h, w);
        editorCtx.drawImage(tmp, 0, 0);
        updatePreviewFromEditorCanvas();
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

    // Undo / Redo
    if ($('img-undo-btn')) {
      $('img-undo-btn').addEventListener('click', function () {
        audioManager.play('pop');
        if (state.undoStack.length > 0) {
          var snapshot = state.undoStack.pop();
          state.redoStack.push(editorCanvas.toDataURL('image/png'));
          restoreUndoState(snapshot);
        }
      });
    }

    if ($('img-redo-btn')) {
      $('img-redo-btn').addEventListener('click', function () {
        audioManager.play('pop');
        if (state.redoStack.length > 0) {
          var snapshot = state.redoStack.pop();
          state.undoStack.push(editorCanvas.toDataURL('image/png'));
          restoreUndoState(snapshot);
        }
      });
    }

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

    wrap.addEventListener('wheel', function(e) {
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
    }, {passive: false});

    wrap.addEventListener('mousedown', function(e) {
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
    
    window.addEventListener('mousemove', function(e) {
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

    window.addEventListener('mouseup', function(e) {
      if (state.isPanning) {
        state.isPanning = false;
        wrap.style.cursor = state.spacebarDown || state.eraserToolMode === 'pan' ? 'grab' : '';
      }
      handleCanvasMouseUp(e);
    });

    // Spacebar Panning Support
    window.addEventListener('keydown', function(e) {
      if (e.code === 'Space' && !state.spacebarDown && state.activeTab === 'image') {
        e.preventDefault();
        state.spacebarDown = true;
        if (!state.isPanning) wrap.style.cursor = 'grab';
      }
    });
    window.addEventListener('keyup', function(e) {
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
      $('animated-displacement-slider').addEventListener('input', function(e) {
        var val = Number(e.target.value);
        state.animatedDisplacement = val;
        if ($('animated-displacement-val')) $('animated-displacement-val').textContent = val + '%';
        if (state.selectedKeyframePct !== null) {
          var kf = state.keyframes.find(function(k) { return k.percent === state.selectedKeyframePct; });
          if (kf) kf.noise = val;
        }
        updateGradientPreview();
        if (!state.isPlaying) startAnimatedGradientLoop();
      });
    }
    if ($('animated-blur-slider')) {
      $('animated-blur-slider').addEventListener('input', function(e) {
        var val = Number(e.target.value);
        state.animatedBlur = val;
        if ($('animated-blur-val')) $('animated-blur-val').textContent = val + 'px';
        if (state.selectedKeyframePct !== null) {
          var kf = state.keyframes.find(function(k) { return k.percent === state.selectedKeyframePct; });
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
      $('btn-media-play').addEventListener('click', function() {
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
        handleExportGradient(GRADIENT_RESOLUTIONS[2]);
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
    });

    // Terms & Conditions Modal
    function openTermsModal() {
      audioManager.play('pop');
      show($('terms-modal-overlay'));
    }
    function closeTermsModal() {
      hide($('terms-modal-overlay'));
    }
    if ($('open-terms-modal-btn')) $('open-terms-modal-btn').addEventListener('click', openTermsModal);
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

  function buildVideoFilterCss() {
    var b = $('vid-brightness') ? $('vid-brightness').value : 100;
    var c = $('vid-contrast') ? $('vid-contrast').value : 100;
    var s = $('vid-saturate') ? $('vid-saturate').value : 100;
    var h = $('vid-hue') ? $('vid-hue').value : 0;
    
    return 'brightness(' + b + '%) contrast(' + c + '%) saturate(' + s + '%) hue-rotate(' + h + 'deg)';
  }

  function refreshVideoGrading() {
    var video = $('video-player-el');
    if (video) video.style.filter = buildVideoFilterCss();
    var sCanvas = $('sample-video-canvas');
    if (sCanvas) sCanvas.style.filter = buildVideoFilterCss();
  }

  var sampleVidAnimFrame = null;
  function loadSampleVideoPreview() {
    var viewport = $('video-preview-viewport');
    if (!viewport) return;

    var video = $('video-player-el');
    var empty = $('video-empty-state');
    if (empty) hide(empty);

    var sCanvas = $('sample-video-canvas');
    if (!sCanvas) {
      sCanvas = document.createElement('canvas');
      sCanvas.id = 'sample-video-canvas';
      sCanvas.width = 1280;
      sCanvas.height = 720;
      sCanvas.style.maxWidth = '100%';
      sCanvas.style.maxHeight = '100%';
      sCanvas.style.borderRadius = 'var(--radius-md)';
      sCanvas.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
      viewport.appendChild(sCanvas);
    }
    sCanvas.style.display = 'block';
    if (video) hide(video);

    if ($('video-file-name')) $('video-file-name').textContent = 'Interactive Sample Video Active';

    ['video-grading-block', 'video-resize-block', 'video-style-pad-block', 'video-lut-block'].forEach(function (id) {
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

    state.isSampleVideoActive = true;
    startSampleVideoLoop();
  }

  function startSampleVideoLoop() {
    var sCanvas = $('sample-video-canvas');
    if (!sCanvas || !state.isSampleVideoActive) return;

    var ctx = sCanvas.getContext('2d');
    var nowSec = performance.now() / 1000;
    var w = sCanvas.width;
    var h = sCanvas.height;

    // High quality video test pattern
    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    var r1 = ctx.createRadialGradient(
      w * 0.3 + Math.sin(nowSec * 1.2) * 200,
      h * 0.4 + Math.cos(nowSec * 1.5) * 150, 20,
      w * 0.3, h * 0.4, 400
    );
    r1.addColorStop(0, '#00f0ff');
    r1.addColorStop(0.6, '#7000ff');
    r1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = r1;
    ctx.fillRect(0, 0, w, h);

    var r2 = ctx.createRadialGradient(
      w * 0.7 + Math.cos(nowSec * 1.1) * 200,
      h * 0.6 + Math.sin(nowSec * 1.4) * 150, 20,
      w * 0.7, h * 0.6, 350
    );
    r2.addColorStop(0, '#ff007f');
    r2.addColorStop(0.5, '#ffaa00');
    r2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = r2;
    ctx.fillRect(0, 0, w, h);

    sampleVidAnimFrame = requestAnimationFrame(startSampleVideoLoop);
  }

  function initVideoTab() {
    var uploadBtn = $('video-upload-btn');
    var sampleBtn = $('btn-load-sample-video');
    var fileInput = $('video-file-input');

    if (sampleBtn) {
      sampleBtn.addEventListener('click', function () {
        audioManager.play('pop');
        loadSampleVideoPreview();
      });
    }

    initStylePad({
      touchId: 'vid-style-pad-touch',
      dotsId: 'vid-style-pad-dots',
      puckId: 'vid-style-pad-puck',
      glowId: 'vid-style-pad-glow',
      readoutId: 'vid-style-pad-readout',
      onChange: function (tone, warmth, isFinal) {
        state.vidStylePad.tone = tone;
        state.vidStylePad.warmth = warmth;
        if (isFinal) {
          if ($('sample-video-canvas')) $('sample-video-canvas').style.filter = buildVideoFilterCss();
          refreshVideoGrading();
        } else {
          var sCanvas = $('sample-video-canvas');
          if (sCanvas) {
            var c = 100 + (tone * 0.3);
            var h = warmth * 0.4;
            sCanvas.style.filter = buildVideoFilterCss() + ' contrast(' + c + '%) hue-rotate(' + h + 'deg)';
          }
        }
      }
    });

    renderLutGrid('vid-lut-grid', state.vidLut, function (lutId) {
      state.vidLut = lutId;
      refreshVideoGrading();
    });

    var vidLutSlider = $('vid-lut-strength-slider');
    if (vidLutSlider) {
      vidLutSlider.addEventListener('input', function (e) {
        state.vidLutStrength = Number(e.target.value);
        if ($('vid-lut-strength-val')) $('vid-lut-strength-val').textContent = state.vidLutStrength + '%';
        refreshVideoGrading();
      });
    }

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        audioManager.play('pop');

        state.isSampleVideoActive = false;
        var sCanvas = $('sample-video-canvas');
        if (sCanvas) sCanvas.style.display = 'none';

        var video = $('video-player-el');
        var url = URL.createObjectURL(file);
        video.src = url;
        show(video);
        hide($('video-empty-state'));
        $('video-file-name').textContent = file.name;

        ['video-grading-block', 'video-resize-block', 'video-style-pad-block', 'video-lut-block'].forEach(function (id) {
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
    var sCanvas = $('sample-video-canvas');
    var sourceEl = (video && video.src && video.videoWidth) ? video : (sCanvas || null);
    if (!sourceEl) {
      showToast('Please load a video or sample preview first.', 2500);
      return;
    }

    var w = Math.round((sourceEl.videoWidth || sourceEl.width || 1280) * videoState.scale);
    var h = Math.round((sourceEl.videoHeight || sourceEl.height || 720) * videoState.scale);
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    var stream = canvas.captureStream(60);
    var mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    var recorder = new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 16000000 });
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
    $('export-modal-status').textContent = 'Encoding graded video frames...';
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

      var pct = Math.min(100, Math.round((elapsed / durationSec) * 100));
      $('export-progress-fill').style.width = pct + '%';
      $('export-modal-percent').textContent = pct + '%';
      $('export-modal-status').textContent = 'Encoding (' + pct + '%)...';

      requestAnimationFrame(drawFrame);
    }
    requestAnimationFrame(drawFrame);
  }

  function initSampleImageCanvas() {
    var canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    var ctx = canvas.getContext('2d');

    // Background gradient
    var bgGrad = ctx.createLinearGradient(0, 0, 1200, 800);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.4, '#1e1b4b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 800);

    // Glowing vibrant shapes & orbs for testing eraser/retouch tools
    // Orb 1: Cyan/Blue glow
    var r1 = ctx.createRadialGradient(350, 320, 20, 350, 320, 280);
    r1.addColorStop(0, '#00f0ff');
    r1.addColorStop(0.5, '#3b82f6');
    r1.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = r1;
    ctx.beginPath();
    ctx.arc(350, 320, 280, 0, Math.PI * 2);
    ctx.fill();

    // Orb 2: Target Color (Vibrant Magenta #FF3366)
    var r2 = ctx.createRadialGradient(850, 480, 20, 850, 480, 250);
    r2.addColorStop(0, '#FF3366');
    r2.addColorStop(0.6, '#ec4899');
    r2.addColorStop(1, 'rgba(236, 72, 153, 0)');
    ctx.fillStyle = r2;
    ctx.beginPath();
    ctx.arc(850, 480, 250, 0, Math.PI * 2);
    ctx.fill();

    // Orb 3: Emerald Accent
    var r3 = ctx.createRadialGradient(600, 250, 10, 600, 250, 180);
    r3.addColorStop(0, '#10b981');
    r3.addColorStop(0.7, '#059669');
    r3.addColorStop(1, 'rgba(5, 150, 105, 0)');
    ctx.fillStyle = r3;
    ctx.beginPath();
    ctx.arc(600, 250, 180, 0, Math.PI * 2);
    ctx.fill();

    // Modern card shape in center
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    var x = 300, y = 200, w = 600, h = 400, r = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Typography
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GRADIAL STUDIO', 600, 380);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 18px "Inter", sans-serif';
    ctx.fillText('Skeuomorphic Color Eraser & Gradient Engine', 600, 420);
    ctx.restore();

    var sampleDataUrl = canvas.toDataURL('image/png');
    var img = new Image();
    img.onload = function () {
      state.imageObj = img;
      state.imageSrc = sampleDataUrl;

      if (!state.origCanvas) {
        state.origCanvas = document.createElement('canvas');
        state.origCtx = state.origCanvas.getContext('2d', { willReadFrequently: true });
      }
      state.origCanvas.width = img.width;
      state.origCanvas.height = img.height;
      state.origCtx.drawImage(img, 0, 0);

      if (editorCanvas) {
        editorCanvas.width = img.width;
        editorCanvas.height = img.height;
        if (editorCtx) {
          editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
          editorCtx.drawImage(img, 0, 0);
        }
      }

      state.undoStack = [];
      state.redoStack = [];

      var pBtn = $('pick-color-btn'); if (pBtn) pBtn.disabled = false;
      var tSld = $('tolerance-slider'); if (tSld) tSld.disabled = false;

      hide($('upload-placeholder'));
      show($('source-canvas-wrap'));
      if ($('upload-label-text')) $('upload-label-text').textContent = 'Change Image';

      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
      if (typeof updateCanvasTransform === 'function') updateCanvasTransform();
      state.targetColorHex = '#FF3366';
      if ($('target-color-thumb')) $('target-color-thumb').style.backgroundColor = '#FF3366';
      if ($('target-color-hex')) $('target-color-hex').textContent = '#FF3366';

      scheduleProcessing();
      refreshLucideIcons();
    };
    img.src = sampleDataUrl;
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
      if (typeof loadSampleVideoPreview === 'function') {
        loadSampleVideoPreview();
      }
    }
    refreshLucideIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
