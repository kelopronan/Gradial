# Gradial

**Gradial** is a lightning-fast, highly aesthetic web application for generating beautiful gradients, editing image backgrounds, and color grading videos. It runs entirely in the browser at a butter-smooth 60fps, built with vanilla HTML, CSS, and JS (no heavy frameworks).

## Story Behind The App
My friend **[Ahmad2012k](https://github.com/Ahmad2012k)** provided the creative direction and assistance for many of the features in this app. I decided to build it based on his creative advice! He suggested the features, and I developed them from scratch.

## Credits & Acknowledgments
- **Developer & Author:** Developer
- **Creative Assistance:** [Ahmad2012k](https://github.com/Ahmad2012k)

## Features
- **High-Performance Node.js Infrastructure:** Runs on a dedicated, lightning-fast Node.js HTTP server (`server.js`) with gzip asset compression, HTTP caching, and instant startup (`npm start`).
- **60 FPS Hardware-Accelerated Performance:** 0.6x downsampled canvas buffer resolution with GPU bilinear scaling and CSS filter offloading (`filter: blur(...)`) on GPU compositor threads for 0 CPU overhead and buttery 60FPS rendering across all engines.
- **7 Dynamic Animated Gradient Engines & Real-Time Color Sync:**
  - Real-time bidirectional color sync between timeline keyframes, custom color pickers, and all 7 animated engines (Lava Lamp, Radial Wave, Plasma Pulse, Radial Ripple, Mesh Drift, Aurora, Conic Vortex).
  - **Lava Lamp Liquid:** Multi-color 3D liquid metaballs with soft radial falloff, bright specular highlights, ambient caustic background halos, and customization controls for viscosity, wax blur, and blob counts.
  - **Radial Wave (Keyframed):** Multi-center radial keyframe flow engine with position (`posX`, `posY`) and angle interpolation, continuous radial gradient wave pulsing, and keyframe scrubber pins.
  - **Plasma Pulse, Radial Ripple, Mesh Drift, Aurora Borealis & Conic Vortex.**
- **DaVinci Resolve Fusion Animated Gradient Timeline Suite:** Professional timeline video editing suite positioned below the live preview viewport (`#media-timeline-container`), featuring rounded play/pause and keyframe navigation controls matching claymorphic media aesthetics, **Interactive Timeline Scrubber Diamond Pins** (`.timeline-marker-diamond`) rendering at exact timestamp percentages with theme primary accent glowing borders, **+ Keyframe Button** (`#add-keyframe-current-btn`), **Keyframe Cards** with compass direction dials and per-keyframe color swatches, **DaVinci Fusion Effects Sidebar Panel** with Fast Noise Displacement (`#animated-displacement-slider`) and Gaussian Blur Softness (`#animated-blur-slider`) controls, real-time 60FPS Texture Noise canvas overlay, and **DaVinci Resolve Fusion Math Engine** (`interpolateKeyframeAtTime`) interpolating keyframe colors with smooth cosine easing, procedural noise displacement warping, seed rate evolution, and blur diffusion at 60FPS.
- **Bitrate Synchronization & Animated Resolution Export Dropdown:** 1:1 real-time synchronization between Video & Export Defaults in Settings (`state.defaultExportBitrate`) and the Animated Gradient Export Menu (`#gradient-export-menu`), displaying target export bitrates (e.g. `1080p Full HD (40 Mbps)`, `4K Ultra HD (40 Mbps)`) dynamically.
- **Cancel Export Progress Modal & Universal ESC Dismissal:** Snappy export progress modal featuring a prominent **Cancel Export** button to safely interrupt active WebCodecs / MediaRecorder export loops without reloading the page, along with universal `Escape` key handling across all modals.
- **Clean Image Studio Upload Workflow & Contextual Controls:** Starts with a clean upload dropzone (no sample image forced on startup). Automatically grays out and disables tolerance sliders and editing controls when no image is loaded into the canvas, restoring full interactivity instantly upon image upload.
- **0-Lag 60FPS 2D Photographic Style Pad Controller:** Throttled `requestAnimationFrame` render loop with distance-squared proximity math for smooth 2D Tone and Warmth matrix manipulations.
- **Video Studio & Interactive Sample Generator:** Color grading with Photographic Style 2D Controller Pad, 10 Cinematic 3D LUTs, brightness, contrast, saturation, temperature, hue, and sharpen controls.
- **Non-Blank High-Bitrate Video Export:** Powered by modern `WebCodecs API` (`VideoEncoder`), `mp4-muxer.js`, and `webm-muxer.js` VP8 fallback for exporting high-bitrate MP4 and WebM videos directly in your browser.
- **Full Linear Gradients & Color Studio Suite:** Complete linear gradient generator featuring live real-time color picking in Color Studio modal (saturation/value grid, spectrum hue track, hex & RGB inputs), streamlined Rotational Angle suite with **Range Slider (`#angle-slider`)** and **Circle Dial Wheel (`#angle-dial-wheel`)** in 1:1 lockstep, lockstep `--slider-fill` track gradient synchronization across all input channels, canvas overlay layer purging preventing lingering canvas elements from obscuring CSS gradients, instant zero-latency viewport redraw on color change, and high-res PNG export engine (1080p, 2K QHD, 4K UHD, 8K Ultra, Mobile 9:16, Square 1:1).
- **Interactive Positional Canvas Mesh Generator:** Multi-point radial mesh gradient generator featuring interactive canvas drag handles for placing color nodes anywhere on screen in real-time, **Intensity-Weighted Ambient Canvas Base** (`computePositionalBaseAndRadii`) dynamically blending point colors weighted by intensity and radius into an organic ambient backdrop, smooth scaled radial spreads, **+ Add Point** (`#add-positional-point-btn`), **Delete Point (X)** (`.positional-point-remove-btn`), per-point Color Studio pickers, **Intensity Sliders** (20% to 150%), **Spread Radius Sliders** (10% to 150%), texture noise integration, live multi-radial CSS generator, and high-resolution 2D Canvas PNG export engine (1080p, 4K UHD, 8K, 16:9, 9:16).
- **Firefox & WebCodecs Video Encoder Synchronization:** 100% lockstep synchronization between Settings UI (`#setting-export-fmt-mp4`, `#setting-export-fmt-webm`) and backend Video Exporter (`exportAnimatedGradientVideo`). Auto-detects Firefox environment (`isFirefox`) to set default export format to WebM VP8/VP9 in both UI and backend engine simultaneously.
- **Dedicated "My Gradial" Settings Page:** Features category navigation (Themes & Appearance, Audio & Sound Effects, Video & Export Defaults, Hotkey Cheatsheet, and App Specs) with real-time state persistence (`localStorage`) across all 21 themes, Web Audio volume/mute toggles, video bitrate slider (5–50 Mbps), and Alpha Channel Transparency toggle.
- **RSA Engineering Terms & Conditions & Footer:** Includes `© 2026 RSA Engineering. All rights reserved.` and `Terms & Conditions` links on all sidebar tabs (`Image`, `Gradient`, `Video`) with a modal displaying legal license terms.
- **21 Aesthetic Skeuomorphic, Claymorphic & Glassmorphic Themes:**
  - **Standard Modern Themes:** Seaweed Default, Golden Sand (Light Luxe), Fire & Ice, Aqua Blossom, Oxidized Earth, Dusty Slate, Midnight Purple, Sakura, Neon Noir, Ocean Depths, Vampire Velvet, Mystic Steel, Jungle Celadon, Neon Forest, Retro Pop, Nord, Solarized Dark, Synthwave.
  - **Special & Retro Aesthetics (Locked & Blurred):** Frutiger Aero, Terminal, and Windows XP cards blurred out with lock badges indicating *"Special Themes Coming Soon"*.
- **Uniform Tab Navigation Vector Icon Sizing:** All header tab pill buttons (`Image`, `Gradient`, `Video`) use 16px × 16px vector Lucide icons with uniform line weights, text alignment, and colors across all themes.

## Tech Stack
- **HTML5 / CSS3 / JavaScript (Vanilla)**
- **Canvas 2D API** for image processing, brush rendering, and fluid mesh generation
- **Web Audio API** for synthesized UI sound effects
- **WebCodecs API** (`VideoEncoder`) & `mp4-muxer` / `webm-muxer` for exporting high-quality MP4/WebM video animations

## Usage
Simply double-click or open `index.html` directly in any modern web browser! No installation or backend server required.

## License
This project is proprietary and closed-source. All rights are reserved. Copyright (c) 2026 RSA Engineering. See the `LICENSE` file for details.
