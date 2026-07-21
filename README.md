# Gradial

**Gradial** is a lightning-fast, highly aesthetic web application for generating beautiful gradients, editing image backgrounds, and color grading videos. It runs entirely in the browser at a butter-smooth 60fps, built with vanilla HTML, CSS, and JS (no heavy frameworks).

## Story Behind The App
My friend **[Ahmad2012k](https://github.com/Ahmad2012k)** provided the creative direction and assistance for many of the features in this app. I decided to build it based on his creative advice! He suggested the features, and I developed them from scratch.

## Credits & Acknowledgments
- **Creative Assistance:** [Ahmad2012k](https://github.com/Ahmad2012k)

## Features
- **Magic Image Eraser & Touch-Up:** Upload images, pick target colors with pipette precision, adjust tolerance and edge feathering, use the manual Erase/Restore brush, apply image filters (brightness, contrast, saturation, blur, hue, grayscale, sepia, invert), and perform transform actions (rotation & H/V flipping).
- **Gradient Generator:** Create stunning Linear and 4-Corner Mesh gradients with custom per-corner intensity controls and procedural texture noise grain overlays.
- **Gradient Animator & Compact Timeline:** Configure a timeline with keyframes. Each keyframe supports interactive Direction Compass Dials and color palettes, which interpolate smoothly over time with skeuomorphic progress bar scrubbing, play/pause controls, and compact keyframe management.
- **Flawless High-Bitrate Video Export:** Powered by modern `WebCodecs API` (`VideoEncoder`) and `mp4-muxer.js`, Gradial exports crisp MP4 video animations directly in your browser without any server processing.
- **Video Grading Studio:** Upload video files, grade color channels (brightness, contrast, saturation, temperature, hue), sharpen output, and upscale with high-quality resampling presets (1x, 1.5x, 2x).
- **10 Aesthetic Themes & Custom HSV Color Studio:** Switch between 10 skeuomorphic color themes (e.g. *Seaweed Default*, *Golden Sand*, *Fire & Ice*, *Neon Noir*, *Sakura*), adjust UI motion, toggle transparency grids, and utilize an overhauled glassmorphic HSV Color Studio modal with circular preset swatches.
- **Synthesized Audio UX:** Real-time procedural UI sound effects powered by the Web Audio API.
- **Zero Dependencies:** The core application logic requires no build steps or bundlers. Just open it and it works.

## Tech Stack
- **HTML5 / CSS3 / JavaScript (Vanilla)**
- **Canvas 2D API** for image processing, brush rendering, and gradient generation
- **Web Audio API** for synthesized UI sound effects
- **WebCodecs API** (`VideoEncoder`) & `mp4-muxer` for exporting high-quality MP4 video animations


## License
This project is proprietary and closed-source. All rights are reserved. See the `LICENSE` file for details.

