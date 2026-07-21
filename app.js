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

  var MAX_COLOR_DISTANCE = Math.sqrt(255 * 255 * 3);

  function createSeamlessNoisePatternCanvas(opacity) {
    var size = 256;
    var nCanvas = document.createElement('canvas');
    nCanvas.width = size;
    nCanvas.height = size;
    var nCtx = nCanvas.getContext('2d');
    var imgData = nCtx.createImageData(size, size);
    var data = imgData.data;
    var alphaBase = (opacity || 0.12) * 0.4; // Soften the noise
    for (var i = 0; i < data.length; i += 4) {
      // Create organic film-grain style noise (black/white mix)
      var isWhite = Math.random() > 0.5;
      var val = isWhite ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = Math.random() * alphaBase * 255;
    }
    nCtx.putImageData(imgData, 0, 0);
    return nCanvas;
  }

  function generateNoiseSvgDataUri(frequency, opacity) {
    var canvas = createSeamlessNoisePatternCanvas(opacity);
    return canvas.toDataURL('image/png');
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
      { pct: 100, msg: 'Export Complete! 🎉' }
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

  function updateColorPickerUI() {
    cpState.hex = hsvToHex(cpState.h, cpState.s, cpState.v);
    
    // Update sat-val area background to pure hue
    $('cp-sat-val-area').style.backgroundColor = hsvToHex(cpState.h, 100, 100);
    
    // Position thumbs
    var svThumb = $('cp-sat-val-thumb');
    svThumb.style.left = cpState.s + '%';
    svThumb.style.top = (100 - cpState.v) + '%';
    svThumb.style.backgroundColor = cpState.hex;

    var hueThumb = $('cp-hue-thumb');
    hueThumb.style.left = (cpState.h / 360 * 100) + '%';

    // Update hex input & preview
    $('cp-hex-input').value = cpState.hex.toUpperCase();
    $('cp-preview-swatch').style.backgroundColor = cpState.hex;
  }

  function setupColorPickerEvents() {
    $('color-picker-close-btn').addEventListener('click', function() {
      audioManager.play('woosh');
      hide($('color-picker-modal-overlay'));
    });

    $('cp-apply-btn').addEventListener('click', function() {
      audioManager.play('pop');
      if (currentCpCallback) currentCpCallback(cpState.hex);
      hide($('color-picker-modal-overlay'));
    });

    $('cp-hex-input').addEventListener('change', function(e) {
      var val = e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        var hsv = hexToHsv(val);
        cpState.h = hsv.h; cpState.s = hsv.s; cpState.v = hsv.v;
        updateColorPickerUI();
      }
    });

    // Quick Palette
    var qpContainer = $('cp-quick-palette');
    if (qpContainer.children.length === 0) {
      QUICK_PALETTE_COLORS.forEach(function(qc) {
        var btn = document.createElement('div');
        btn.style.cssText = 'width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 2px 6px rgba(0,0,0,0.4); transition: transform 0.15s ease;';
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

    function handleSVDOMouseEvent(e) {
      var rect = $('cp-sat-val-area').getBoundingClientRect();
      var x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      var y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      cpState.s = (x / rect.width) * 100;
      cpState.v = 100 - ((y / rect.height) * 100);
      updateColorPickerUI();
    }

    // Dragging Logic for Hue Track
    var isDraggingHue = false;
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

    function handleHueMouseEvent(e) {
      var rect = $('cp-hue-track').getBoundingClientRect();
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
    updateColorPickerUI();
    show($('color-picker-modal-overlay'));
  }

  var state = {
    activeTab: 'image',

    // Eraser / Image
    imageSrc: null,
    imageObj: null,
    targetColor: { r: 255, g: 255, b: 255 },
    tolerance: 15,
    edgeFeather: 20,
    eraserToolMode: 'color', // 'color' | 'brush'
    brushSize: 30,
    brushAction: 'erase', // 'erase' | 'restore'
    isPickingColor: false,
    isBrushing: false,
    lastBrushX: 0,
    lastBrushY: 0,
    exportScale: 1,
    isImageExportMenuOpen: false,

    // Offscreen Original Image Canvas for Restore Brush
    origCanvas: null,
    origCtx: null,

    // Gradient
    gradientMode: 'linear', // 'linear' | '4-corner' | 'animated'
    gradientColors: ['#216869', '#49a078'],
    meshColors: ['#216869', '#49a078', '#9cc5a1', '#1f2421'],
    meshIntensities: [70, 70, 70, 70], // Per-corner intensity %: [TL, TR, BR, BL]
    gradientAngle: 90,
    animationDuration: 5.0, // seconds

    // Image Filters
    imageFilters: { brightness: 100, contrast: 100, saturate: 100, blur: 0, hue: 0, grayscale: 0, sepia: 0, invert: 0 },
    
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
    { label: 'Mobile HD', width: 1080, height: 1920 },
    { label: 'Square HD', width: 1080, height: 1080 },
    { label: '1080p FHD', width: 1920, height: 1080 },
    { label: '1440p QHD', width: 2560, height: 1440 },
    { label: '4K UHD', width: 3840, height: 2160 }
  ];

  var QUICK_PALETTE_COLORS = ['#216869', '#49A078', '#9CC5A1', '#FF6B6B', '#A66CFF', '#F0A500'];

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
  }

  function applyTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem('gradial-theme', themeName);
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

        // Auto-sample top-left pixel
        var sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 1; sampleCanvas.height = 1;
        var sctx = sampleCanvas.getContext('2d');
        sctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
        var pData = sctx.getImageData(0, 0, 1, 1).data;
        if (pData.length >= 4) {
          state.targetColor = { r: pData[0], g: pData[1], b: pData[2] };
        }

        // Setup Offscreen Canvas for Original Image (Restore brush reference)
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
        $('pick-color-btn').disabled = false;
        $('tolerance-slider').disabled = false;

        hide($('upload-placeholder'));
        show($('source-canvas-wrap'));
        $('upload-label-text').textContent = 'Change Image';

        updateColorDisplay();
        scheduleProcessing();
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
    editorCtx.lineWidth = state.brushSize;
    editorCtx.lineCap = 'round';
    editorCtx.lineJoin = 'round';

    if (state.brushAction === 'erase') {
      // Hardware-accelerated GPU destination-out composite mode
      editorCtx.globalCompositeOperation = 'destination-out';
      editorCtx.beginPath();
      editorCtx.moveTo(x1, y1);
      editorCtx.lineTo(x2, y2);
      editorCtx.stroke();
    } else {
      // Restore Mode: Clip path & draw original image portion back
      editorCtx.beginPath();
      editorCtx.moveTo(x1, y1);
      editorCtx.lineTo(x2, y2);
      editorCtx.clip();
      editorCtx.drawImage(state.origCanvas, 0, 0);
    }

    editorCtx.restore();
  }

  function updateColorDisplay() {
    var hex = rgbToHex(state.targetColor.r, state.targetColor.g, state.targetColor.b);
    $('target-color-thumb').style.backgroundColor = hex;
    $('target-color-hex').textContent = hex.toUpperCase();
  }

  function scheduleProcessing() {
    if (processTimer) clearTimeout(processTimer);
    show($('processing-spinner'));

    processTimer = setTimeout(function () {
      requestAnimationFrame(function () {
        processColorEraser();
      });
    }, 50);
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
      updatePreviewFromEditorCanvas();

    } catch (e) {
      console.error('Eraser processing error:', e);
    } finally {
      hide($('processing-spinner'));
    }
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
    // Bake filters into a scratch canvas — CSS `style.filter` on <canvas> is NOT
    // captured by toDataURL(), so filters must be drawn through ctx.filter instead
    // or the Preview Result panel silently ignores every filter slider.
    var tmp = document.createElement('canvas');
    tmp.width = editorCanvas.width;
    tmp.height = editorCanvas.height;
    var tctx = tmp.getContext('2d');
    tctx.filter = buildImageFilterCss(1);
    tctx.drawImage(editorCanvas, 0, 0);

    var url = tmp.toDataURL('image/png');
    var prevImg = $('preview-result-img');
    prevImg.src = url;
    show(prevImg);
    hide($('preview-placeholder-text'));
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

      // Apply CSS Filters to the canvas context so they are baked into the PNG
      ctx.filter = buildImageFilterCss(state.exportScale);

      ctx.drawImage(state.imageObj || editorCanvas, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none'; // reset

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
                return '<button class="dropdown-item-sk' + (state.exportScale === scale ? ' selected' : '') + '" data-scale="' + scale + '">' +
                  '<span>' + scale + 'x' + (scale === 1 ? ' (Original)' : '') + '</span>' +
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

    // Hex Text Inputs
    list.querySelectorAll('.text-input-sk').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var idx = Number(inp.dataset.idx);
        var val = inp.value;
        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
          state.gradientColors[idx] = val;
          syncSelectedKeyframe();
          renderColorStops();
          updateGradientPreview();
          updateCssOutput();
        }
      });
    });

    // Quick Color Dots (1-Click Preset Pop)
    list.querySelectorAll('.quick-color-dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        var idx = Number(dot.dataset.idx);
        var qc = dot.dataset.qc;
        state.gradientColors[idx] = qc;
        syncSelectedKeyframe();
          renderColorStops();
        updateGradientPreview();
        updateCssOutput();
      });
    });

    // Remove Stop Buttons
    list.querySelectorAll('.color-stop-remove-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.gradientColors.length <= 2) return;
        var idx = Number(btn.dataset.idx);
        state.gradientColors.splice(idx, 1);
        syncSelectedKeyframe();
          renderColorStops();
        updateGradientPreview();
        updateCssOutput();
      });
    });
  }

  function renderCornerGrid() {
    var grid = $('corner-grid-list');
    var labels = ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'];
    var stateMap = [0, 1, 3, 2];
    grid.innerHTML = '';

    labels.forEach(function (label, idx) {
      var stateIdx = stateMap[idx];
      var color = state.meshColors[stateIdx];
      var intensity = state.meshIntensities[stateIdx] !== undefined ? state.meshIntensities[stateIdx] : 70;

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

    // Custom Color Pickers
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

    // Hex Inputs
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

    // Quick Color Dots for Corner Mesh
    grid.querySelectorAll('.quick-color-dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        var sidx = Number(dot.dataset.sidx);
        var qc = dot.dataset.qc;
        state.meshColors[sidx] = qc;
        renderCornerGrid();
        updateGradientPreview();
        updateCssOutput();
      });
    });

    // Per-Corner Intensity Sliders
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
  }  function renderGradientResolutions() {
    var list = $('gradient-resolutions-list');
    list.innerHTML = '';
    GRADIENT_RESOLUTIONS.forEach(function (res) {
      var btn = document.createElement('button');
      btn.className = 'dropdown-item-sk';
      btn.innerHTML =
        '<span>' + res.label + '</span>' +
        '<span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted);">' + res.width + 'x' + res.height + '</span>';
      btn.addEventListener('click', function () {
        handleExportGradient(res);
      });
      list.appendChild(btn);
    });
  }

  function updateGradientSections() {
    var mode = state.gradientMode;
    toggle($('color-stops-container'), mode === 'linear');
    toggle($('corner-mesh-container'), mode === '4-corner');
    toggle($('angle-container'), mode === 'linear');
    toggle($('media-timeline-container'), mode === 'animated');

    if (mode === '4-corner') {
      renderCornerGrid();
    }

    // Dynamic Export Button Label
    var exportBtn = $('gradient-export-main-btn');
    if (exportBtn) {
      var icon = mode === 'animated' ? 'video' : 'download';
      var label = mode === 'animated' ? 'Export Video (MP4)' : 'Export FHD';
      exportBtn.innerHTML = '<i data-lucide="' + icon + '"></i><span>' + label + '</span>';
      if (window.lucide) lucide.createIcons();
    }
  }

  function renderTimelineMarkers() {
    var layer = $('timeline-markers-layer');
    if (!layer) return;
    layer.innerHTML = '';

    state.keyframes.forEach(function (kf) {
      var marker = document.createElement('div');
      marker.className = 'timeline-marker';
      marker.style.left = kf.percent + '%';
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
          $('btn-media-play').innerHTML = '<i data-lucide="pause"></i>';
        } else {
          video.pause();
          $('btn-media-play').innerHTML = '<i data-lucide="play"></i>';
        }
        if (window.lucide) lucide.createIcons();
        audioManager.play('pop');
      }
      return;
    }

    state.isPlaying = !state.isPlaying;
    var btn = $('btn-media-play');
    btn.innerHTML = state.isPlaying ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
    if (window.lucide) lucide.createIcons();
    audioManager.play('pop');

    if (state.isPlaying) {
      if (state.currentTime >= state.animationDuration) state.currentTime = 0;
      var lastTime = performance.now();

      function animLoop(now) {
        if (!state.isPlaying) return;
        var dt = (now - lastTime) / 1000;
        lastTime = now;

        state.currentTime += dt;
        if (state.currentTime >= state.animationDuration) {
          state.currentTime = 0;
        }

        updateTimelineUI();
        updateGradientPreview();
        state.animationFrameId = requestAnimationFrame(animLoop);
      }
      state.animationFrameId = requestAnimationFrame(animLoop);
    } else {
      if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    }
  }

  function updateGradientPreview() {
    var preview = $('gradient-live-viewport');
    var mode = state.gradientMode;

    var noiseDataUri = state.enableNoise ? generateNoiseSvgDataUri(state.noiseFrequency, state.noiseOpacity) : '';
    var noiseUrl = state.enableNoise ? "url('" + noiseDataUri + "')" : '';

    preview.style.animation = '';

    if (mode === 'linear') {
      var css = 'linear-gradient(' + state.gradientAngle + 'deg, ' + state.gradientColors.join(', ') + ')';
      preview.style.backgroundImage = state.enableNoise ? noiseUrl + ', ' + css : css;
      preview.style.backgroundSize = '';
      preview.style.backgroundColor = '';

    } else if (mode === '4-corner') {
      var ints = state.meshIntensities || [70, 70, 70, 70];
      var parts = [
        'radial-gradient(farthest-corner at top left, ' + state.meshColors[0] + ' 0%, ' + hexToRgba(state.meshColors[0], 0) + ' ' + (ints[0]*1.2) + '%)',
        'radial-gradient(farthest-corner at top right, ' + state.meshColors[1] + ' 0%, ' + hexToRgba(state.meshColors[1], 0) + ' ' + (ints[1]*1.2) + '%)',
        'radial-gradient(farthest-corner at bottom right, ' + state.meshColors[2] + ' 0%, ' + hexToRgba(state.meshColors[2], 0) + ' ' + (ints[2]*1.2) + '%)',
        'radial-gradient(farthest-corner at bottom left, ' + state.meshColors[3] + ' 0%, ' + hexToRgba(state.meshColors[3], 0) + ' ' + (ints[3]*1.2) + '%)'
      ];
      var meshCss = parts.join(', ');
      
      var r=0, g=0, b=0;
      for(var i=0; i<4; i++) {
        var rgb = hexToRgba(state.meshColors[i], 1).match(/\d+/g).map(Number);
        r += rgb[0]; g += rgb[1]; b += rgb[2];
      }
      var baseColor = 'rgb(' + Math.round(r/4) + ',' + Math.round(g/4) + ',' + Math.round(b/4) + ')';
      
      preview.style.backgroundImage = state.enableNoise ? noiseUrl + ', ' + meshCss : meshCss;
      preview.style.backgroundColor = baseColor;
      preview.style.backgroundSize = '';

    } else if (mode === 'animated') {
      var curPct = (state.currentTime / state.animationDuration) * 100;
      var kfState = interpolateKeyframePos(curPct);
      var animCss = 'linear-gradient(' + kfState.angle + 'deg, ' + (kfState.colors ? kfState.colors.join(', ') : state.gradientColors.join(', ')) + ')';

      preview.style.backgroundColor = '';
      preview.style.backgroundImage = state.enableNoise ? noiseUrl + ', ' + animCss : animCss;
      preview.style.backgroundSize = state.enableNoise ? 'auto, 100% 100%' : '100% 100%';
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

  function updateCssOutput() {
    var mode = state.gradientMode;
    var output = '';
    var noiseDataUri = state.enableNoise ? generateNoiseSvgDataUri(state.noiseFrequency, state.noiseOpacity) : '';
    var noiseUrl = state.enableNoise ? "url('" + noiseDataUri + "')" : '';

    if (mode === 'linear') {
      var css = 'linear-gradient(' + state.gradientAngle + 'deg, ' + state.gradientColors.join(', ') + ')';
      output = '/* Linear Gradient */\nbackground-image: ' + (state.enableNoise ? noiseUrl + ', ' + css : css) + ';';

    } else if (mode === '4-corner') {
      var ints = state.meshIntensities || [70, 70, 70, 70];
      var parts = [
        'radial-gradient(at top left, ' + state.meshColors[0] + ', transparent ' + ints[0] + '%)',
        'radial-gradient(at top right, ' + state.meshColors[1] + ', transparent ' + ints[1] + '%)',
        'radial-gradient(at bottom right, ' + state.meshColors[2] + ', transparent ' + ints[2] + '%)',
        'radial-gradient(at bottom left, ' + state.meshColors[3] + ', transparent ' + ints[3] + '%)'
      ];
      output = '/* Mesh Gradient */\nbackground-image: ' + (state.enableNoise ? noiseUrl + ', ' + parts.join(', ') : parts.join(', ')) + ';\nbackground-color: #1f2421; /* Fallback */';

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

    if (state.gradientMode === 'animated') {
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
    var ext = isFirefox ? 'webm' : 'mp4';

    titleEl.textContent = 'Exporting ' + ext.toUpperCase() + ' Video (' + resolution.label + ')';
    statusEl.textContent = isFirefox ? 'Loading WebM Engine...' : 'Initializing WebCodecs...';
    percentEl.textContent = '0%';
    fillEl.style.width = '0%';
    iconBox.innerHTML = '<i data-lucide="video" class="animate-spin" style="width: 22px; height: 22px; color: var(--color-seaweed);"></i>';
    if (window.lucide) lucide.createIcons();
    show(overlay);

    if (isFirefox && !window.WebMMuxer) {
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

    var fps = 60;
    var totalDurationSec = state.animationDuration || 5;
    var totalFrames = Math.round(totalDurationSec * fps);

    let muxer;
    try {
      if (isFirefox) {
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

    let config;
    if (isFirefox) {
      config = {
        codec: 'vp8',
        width: width,
        height: height,
        bitrate: 40000000,
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
        bitrate: 40000000,
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

    for (let currentFrame = 0; currentFrame < totalFrames; currentFrame++) {
      if (encoderError) {
        statusEl.textContent = 'Encoder error: ' + (encoderError.message || encoderError);
        return;
      }

      var curPct = (currentFrame / Math.max(1, totalFrames - 1)) * 100;
      var displayPct = Math.round((currentFrame / totalFrames) * 100);

      fillEl.style.width = displayPct + '%';
      percentEl.textContent = displayPct + '%';
      statusEl.textContent = 'Rendering Frame ' + (currentFrame + 1) + '/' + totalFrames + '...';

      var kfState = typeof interpolateKeyframePos !== 'undefined' ? interpolateKeyframePos(curPct) : {posX:50, posY:50, angle:90, colors: state.gradientColors};
      var posX = kfState.posX;
      var posY = kfState.posY;
      var angle = kfState.angle;
      var colors = kfState.colors || state.gradientColors;

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
      colors.forEach(function (color, i) {
        grad.addColorStop(i / Math.max(1, colors.length - 1), color);
      });
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

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
    statusEl.textContent = 'Video Export Complete! 🎉';
    fillEl.style.width = '100%';
    percentEl.textContent = '100%';
    if (window.lucide) lucide.createIcons();
    if (typeof audioManager !== 'undefined') audioManager.play('success');

    setTimeout(function () { hide(overlay); }, 600);
  }

  function initApp() {
    processingCanvas = $('processing-canvas');
    exportCanvas = $('export-canvas');
    editorCanvas = $('editor-canvas');
    editorCtx = editorCanvas.getContext('2d', { willReadFrequently: true });
    
    // Default color stops
    state.colorStops = [
      { color: '#FF3366' },
      { color: '#33CCFF' },
      { color: '#FF9933' }
    ];

    state.origCanvas = document.createElement('canvas');
    state.origCtx = state.origCanvas.getContext('2d', { willReadFrequently: true });

    if (window.lucide) {
      lucide.createIcons();
    }

    loadTheme();
    loadPreferences();
    bindEvents();
    updateColorDisplay();
    renderImageExportBlock();
    renderColorStops();
    renderCornerGrid();
    renderTimelineMarkers();
    renderKeyframesList();
    renderGradientResolutions();
    updateGradientPreview();
    updateCssOutput();
  }

  function bindEvents() {
    // Settings Modal
    $('open-settings-btn').addEventListener('click', function() {
      audioManager.play('pop');
      show($('settings-modal-overlay'));
    });
    if ($('open-my-gradial-btn')) {
      $('open-my-gradial-btn').addEventListener('click', function() {
        audioManager.play('pop');
        show($('settings-modal-overlay'));
      });
    }
    
    $('close-settings-btn').addEventListener('click', function() {
      audioManager.play('pop');
      hide($('settings-modal-overlay'));
    });
    
    // Use event delegation for theme cards so dynamically added themes work
    $('settings-modal-overlay').addEventListener('click', function(e) {
      var card = e.target.closest('.theme-card');
      if (card) {
        audioManager.play('pop');
        document.querySelectorAll('.theme-card').forEach(function(c) { c.classList.remove('active'); });
        card.classList.add('active');
        applyTheme(card.getAttribute('data-theme'));
      }
    });

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

    // Grid Modes
    if ($('setting-grid-dark')) {
      $('setting-grid-dark').addEventListener('click', function() {
        audioManager.play('pop');
        setGridUI('dark');
      });
    }
    if ($('setting-grid-light')) {
      $('setting-grid-light').addEventListener('click', function() {
        audioManager.play('pop');
        setGridUI('light');
      });
    }

    // Tab Switching
    $('tab-btn-image').addEventListener('click', function () {
      audioManager.init();
      audioManager.play('woosh');
      switchTab('image');
    });
    $('tab-btn-gradient').addEventListener('click', function () {
      audioManager.init();
      audioManager.play('woosh');
      switchTab('gradient');
    });
    if ($('tab-btn-video')) {
      $('tab-btn-video').addEventListener('click', function () {
        audioManager.init();
        audioManager.play('woosh');
        switchTab('video');
      });
    }

    // Copy CSS button (replaces the old always-visible Generated CSS panel)
    if ($('copy-css-btn')) {
      $('copy-css-btn').addEventListener('click', copyGeneratedCss);
    }

    // File Upload
    $('file-input-element').addEventListener('change', function(e) {
      audioManager.play('pop');
      handleImageUpload(e);
    });

    // Image Eraser Settings
    $('eraser-mode-color').addEventListener('click', function () {
      audioManager.play('pop');
      state.eraserToolMode = 'color';
      this.classList.add('active');
      $('eraser-mode-brush').classList.remove('active');
      $('eraser-mode-pan').classList.remove('active');
      hide($('brush-controls-panel'));
      updatePickingState();
    });

    $('eraser-mode-brush').addEventListener('click', function () {
      audioManager.play('pop');
      state.eraserToolMode = 'brush';
      this.classList.add('active');
      $('eraser-mode-color').classList.remove('active');
      $('eraser-mode-pan').classList.remove('active');
      show($('brush-controls-panel'));
      state.isPickingColor = false;
      updatePickingState();
    });
    
    $('eraser-mode-pan').addEventListener('click', function () {
      audioManager.play('pop');
      state.eraserToolMode = 'pan';
      this.classList.add('active');
      $('eraser-mode-color').classList.remove('active');
      $('eraser-mode-brush').classList.remove('active');
      hide($('brush-controls-panel'));
      state.isPickingColor = false;
      updatePickingState();
    });

    // Pick Color Button
    $('pick-color-btn').addEventListener('click', function () {
      audioManager.play('pop');
      if (!state.imageObj) return;
      state.isPickingColor = !state.isPickingColor;
      updatePickingState();
    });

    // Brush Action (Erase vs Restore)
    $('brush-action-erase').addEventListener('click', function () {
      audioManager.play('pop');
      state.brushAction = 'erase';
      this.classList.add('active');
      $('brush-action-restore').classList.remove('active');
    });

    $('brush-action-restore').addEventListener('click', function () {
      audioManager.play('pop');
      state.brushAction = 'restore';
      this.classList.add('active');
      $('brush-action-erase').classList.remove('active');
    });

    // Image Filters
    function updateFilters() {
      updatePreviewFromEditorCanvas();
    }

    ['brightness', 'contrast', 'saturate', 'blur', 'hue'].forEach(function(filter) {
      var slider = $('filter-' + filter);
      if (slider) {
        slider.addEventListener('input', function(e) {
          state.imageFilters[filter] = Number(e.target.value);
          var unit = filter === 'blur' ? 'px' : (filter === 'hue' ? '°' : '%');
          if ($('filter-' + filter + '-val')) $('filter-' + filter + '-val').textContent = state.imageFilters[filter] + unit;
          updateFilters();
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
    [['image-flip-h-btn', -1, 1], ['image-flip-v-btn', 1, -1]].forEach(function(cfg) {
      var btn = $(cfg[0]);
      if (btn) {
        btn.addEventListener('click', function () {
          if (!state.imageObj) return;
          audioManager.play('pop');
          var w = editorCanvas.width, h = editorCanvas.height;
          var tmp = document.createElement('canvas');
          tmp.width = w; tmp.height = h;
          var tctx = tmp.getContext('2d');
          tctx.drawImage(editorCanvas, 0, 0);
          editorCtx.save();
          editorCtx.clearRect(0, 0, w, h);
          editorCtx.translate(cfg[1] < 0 ? w : 0, cfg[2] < 0 ? h : 0);
          editorCtx.scale(cfg[1], cfg[2]);
          editorCtx.drawImage(tmp, 0, 0);
          editorCtx.restore();
          updatePreviewFromEditorCanvas();
        });
      }
    });

    // Edge Feather (background removal edge softness)
    if ($('edge-feather-slider')) {
      $('edge-feather-slider').addEventListener('input', function (e) {
        state.edgeFeather = Number(e.target.value);
        if ($('edge-feather-val')) $('edge-feather-val').textContent = state.edgeFeather + '%';
        scheduleProcessing();
      });
    }

    // Tolerance Slider
    $('tolerance-slider').addEventListener('input', function (e) {
      state.tolerance = Number(e.target.value);
      $('tolerance-val').textContent = state.tolerance + '%';
      scheduleProcessing();
    });

    // Brush Size Slider
    $('brush-size-slider').addEventListener('input', function (e) {
      state.brushSize = Number(e.target.value);
      $('brush-size-val').textContent = state.brushSize + 'px';
      updateCanvasCursor();
    });

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

    // Angle Slider
    $('angle-slider').addEventListener('input', function (e) {
      state.gradientAngle = Number(e.target.value);
      $('angle-val').textContent = state.gradientAngle + '°';
      syncSelectedKeyframe();
      updateGradientPreview();
      updateCssOutput();
    });

    // Add Color Stop
    $('add-color-stop-btn').addEventListener('click', function () {
      audioManager.play('pop');
      state.gradientColors.push('#9cc5a1');
      syncSelectedKeyframe();
      renderColorStops();
      updateGradientPreview();
      updateCssOutput();
    });


    // Texture Noise Toggle
    $('noise-toggle-btn').addEventListener('click', function () {
      audioManager.play('pop');
      state.enableNoise = !state.enableNoise;
      this.classList.toggle('active', state.enableNoise);
      $('noise-dot').style.background = state.enableNoise ? 'var(--color-seaweed)' : 'var(--color-muted-teal)';
      toggle($('noise-controls-panel'), state.enableNoise);
      updateGradientPreview();
      updateCssOutput();
    });

    // Noise Sliders
    $('noise-freq-slider').addEventListener('input', function (e) {
      state.noiseFrequency = Number(e.target.value);
      $('noise-freq-val').textContent = state.noiseFrequency.toFixed(2);
      updateGradientPreview();
      updateCssOutput();
    });

    $('noise-opacity-slider').addEventListener('input', function (e) {
      state.noiseOpacity = Number(e.target.value);
      $('noise-opacity-val').textContent = Math.round(state.noiseOpacity * 100) + '%';
      updateGradientPreview();
      updateCssOutput();
    });

    // Animation Duration Speed Slider
    var animDurSlider = $('animation-duration-slider');
    if (animDurSlider) {
      animDurSlider.addEventListener('input', function (e) {
        state.animationDuration = Number(e.target.value);
        $('animation-duration-val').textContent = state.animationDuration.toFixed(1) + 's';
        updateTimelineUI();
        updateGradientPreview();
        updateCssOutput();
      });
    }

    // MEDIA PLAYER TIMELINE CONTROLS
    $('timeline-slider').addEventListener('input', function (e) {
      var pct = Number(e.target.value);
      state.currentTime = (pct / 100) * state.animationDuration;
      updateTimelineUI();
      updateGradientPreview();
    });

    // Media Controls Row
    $('btn-media-play').addEventListener('click', function() {
      audioManager.play('pop');
      toggleMediaPlay();
    });

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

    $('add-keyframe-current-btn').addEventListener('click', function () {
      audioManager.play('pop');
      var curPct = Math.round((state.currentTime / state.animationDuration) * 100);
      state.keyframes = state.keyframes.filter(function (k) { return Math.abs(k.percent - curPct) > 2; });
      state.keyframes.push({
        percent: curPct,
        time: state.currentTime,
        posX: 50,
        posY: 50
      });
      state.keyframes.sort(function (a, b) { return a.percent - b.percent; });
      renderTimelineMarkers();
      renderKeyframesList();
      updateGradientPreview();
      updateCssOutput();
    });

    // Gradient Export Controls
    $('gradient-export-main-btn').addEventListener('click', function () {
      handleExportGradient(GRADIENT_RESOLUTIONS[2]);
    });

    $('gradient-export-chevron-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      state.isGradientExportMenuOpen = !state.isGradientExportMenuOpen;
      toggle($('gradient-export-menu'), state.isGradientExportMenuOpen);
    });

    // (old Generated-CSS-panel copy/download buttons removed — Copy CSS button above handles this now)

    // Close Dropdowns on Click Outside
    document.addEventListener('mousedown', function (e) {
      var menu = $('gradient-export-menu');
      var anchor = $('gradient-export-dropdown-anchor');
      if (anchor && !anchor.contains(e.target)) {
        state.isGradientExportMenuOpen = false;
        hide(menu);
      }

      var imgMenu = document.getElementById('image-export-menu-sk');
      var imgAnchor = document.getElementById('image-export-anchor-sk');
      if (imgAnchor && !imgAnchor.contains(e.target)) {
        state.isImageExportMenuOpen = false;
        hide(imgMenu);
      }
    });

    initVideoTab();
  }

  // --- Video Tab (upload, live color grading, resize+sharpen, export) ---
  var videoState = { scale: 1, recorder: null, audioCtx: null };

  function buildVideoFilterCss() {
    var temp = Number($('vid-temp') ? $('vid-temp').value : 0);
    var matrix = $('vid-temp-matrix');
    if (matrix) {
      var t = (temp / 100) * 0.14;
      matrix.setAttribute('values',
        '1 0 0 0 ' + t + '  0 1 0 0 0  0 0 1 0 ' + (-t) + '  0 0 0 1 0');
    }
    var b = $('vid-brightness') ? $('vid-brightness').value : 100;
    var c = $('vid-contrast') ? $('vid-contrast').value : 100;
    var s = $('vid-saturate') ? $('vid-saturate').value : 100;
    var h = $('vid-hue') ? $('vid-hue').value : 0;
    
    // Real-time playback uses standard CSS filters (no sharpen) to maintain 60fps
    return 'url(#vid-temp-filter) brightness(' + b + '%) contrast(' + c + '%) ' +
           'saturate(' + s + '%) hue-rotate(' + h + 'deg)';
  }

  function refreshVideoGrading() {
    var video = $('video-player-el');
    if (video) video.style.filter = buildVideoFilterCss();
  }

  function initVideoTab() {
    var uploadBtn = $('video-upload-btn');
    var fileInput = $('video-file-input');
    if (!uploadBtn || !fileInput) return;

    uploadBtn.addEventListener('click', function () { fileInput.click(); });

    fileInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      audioManager.play('pop');

      var video = $('video-player-el');
      var url = URL.createObjectURL(file);
      video.src = url;
      show(video);
      hide($('video-empty-state'));
      $('video-file-name').textContent = file.name;

      ['video-grading-block', 'video-resize-block'].forEach(function (id) {
        var el = $(id);
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      });
      var exportBtn = $('video-export-btn');
      exportBtn.style.opacity = '1';
      exportBtn.style.pointerEvents = 'auto';
      exportBtn.disabled = false;
    });

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
    if (!video || !video.src || !video.videoWidth) return;
    if (typeof MediaRecorder === 'undefined') {
      showToast('This browser can\'t export video (no MediaRecorder support).', 3000);
      return;
    }

    var w = Math.round(video.videoWidth * videoState.scale);
    var h = Math.round(video.videoHeight * videoState.scale);
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    var stream = canvas.captureStream(60); // 60 FPS Export

    // Try to carry audio through; silently continue video-only if unavailable.
    try {
      if (!videoState.audioCtx) videoState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var srcNode = videoState.audioCtx.createMediaElementSource(video);
      var dest = videoState.audioCtx.createMediaStreamDestination();
      srcNode.connect(dest);
      srcNode.connect(videoState.audioCtx.destination);
      dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
    } catch (err) {
      console.warn('Audio export unavailable, exporting video-only:', err);
    }

    var mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    var recorder = new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 16000000 });
    var chunks = [];
    recorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = function () {
      var blob = new Blob(chunks, { type: 'video/webm' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'gradial_graded_' + Date.now() + '.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      showToast('Video exported successfully!', 2500);
      hide($('export-modal-overlay'));
      var exportPreview = $('export-preview-container');
      if (exportPreview) exportPreview.classList.add('hidden');
    };

    // Show Export UI
    $('export-modal-title').textContent = 'Exporting Video...';
    $('export-modal-status').textContent = 'Applying true convolution matrix...';
    $('export-progress-fill').style.width = '0%';
    $('export-modal-percent').textContent = '0%';
    show($('export-modal-overlay'));

    // Configure high-quality export filter string
    var b = $('vid-brightness') ? $('vid-brightness').value : 100;
    var c = $('vid-contrast') ? $('vid-contrast').value : 100;
    var s = $('vid-saturate') ? $('vid-saturate').value : 100;
    var h = $('vid-hue') ? $('vid-hue').value : 0;
    var sharpen = $('vid-sharpen') ? Number($('vid-sharpen').value) : 0;
    
    var sharpenMatrix = $('vid-export-sharpen-matrix');
    var exportColorMatrix = $('vid-export-color-matrix');
    var tempMatrix = $('vid-temp-matrix');
    
    if (exportColorMatrix && tempMatrix) {
        exportColorMatrix.setAttribute('values', tempMatrix.getAttribute('values'));
    }

    if (sharpenMatrix) {
      if (sharpen > 0) {
        var center = 1 + (sharpen * 0.05);
        var edge = -(sharpen * 0.05) / 8;
        var k = [edge, edge, edge, edge, center, edge, edge, edge, edge].join(' ');
        sharpenMatrix.setAttribute('kernelMatrix', k);
      } else {
        sharpenMatrix.setAttribute('kernelMatrix', '0 0 0 0 1 0 0 0 0');
      }
    }
    var filterString = 'url(#vid-export-filter) brightness(' + b + '%) contrast(' + c + '%) saturate(' + s + '%) hue-rotate(' + h + 'deg)';

    // Setup Export Preview Canvas
    var previewCanvas = $('export-preview-canvas');
    var previewCtx = null;
    if (previewCanvas) {
       previewCanvas.width = w;
       previewCanvas.height = h;
       previewCtx = previewCanvas.getContext('2d');
       $('export-preview-container').classList.remove('hidden');
    }

    video.currentTime = 0;
    video.play();
    recorder.start();

    function drawFrame() {
      if (video.paused || video.ended) {
        if (recorder.state !== 'inactive') recorder.stop();
        return;
      }
      ctx.filter = filterString;
      ctx.drawImage(video, 0, 0, w, h);
      
      if (previewCtx) {
        previewCtx.drawImage(canvas, 0, 0, w, h);
      }
      
      var pct = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
      if (!isNaN(pct)) {
        $('export-progress-fill').style.width = pct + '%';
        $('export-modal-percent').textContent = pct + '%';
        $('export-modal-status').textContent = 'Rendering Frame (' + pct + '%)...';
      }

      requestAnimationFrame(drawFrame);
    }
    requestAnimationFrame(drawFrame);
  }

  // --- Tab Switcher ---

  function switchTab(tab) {
    state.activeTab = tab;
    $('tab-btn-image').classList.toggle('active', tab === 'image');
    $('tab-btn-gradient').classList.toggle('active', tab === 'gradient');
    if ($('tab-btn-video')) $('tab-btn-video').classList.toggle('active', tab === 'video');

    toggle($('sidebar-image-controls'), tab === 'image');
    toggle($('sidebar-gradient-controls'), tab === 'gradient');
    if ($('sidebar-video-controls')) toggle($('sidebar-video-controls'), tab === 'video');
    toggle($('workspace-image-layout'), tab === 'image');
    toggle($('workspace-gradient-layout'), tab === 'gradient');
    if ($('workspace-video-layout')) toggle($('workspace-video-layout'), tab === 'video');

    if (tab === 'gradient') {
      updateGradientPreview();
      updateCssOutput();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
