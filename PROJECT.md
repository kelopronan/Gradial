# Project: Gradial Video Studio — Final Parity & Refinement Build

## Architecture
- Single Page Application / Desktop UI for Gradial Video Studio.
- Key modules: Top Header bar, Drawer navigation & tabs, Video Stage Player, 2D StylePad, Bottom Timeline & Transport control deck.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration | Codebase inspection & structure mapping | none | DONE |
| 2 | Milestone R1 | Upload Action & 42px Header | M1 | IN_PROGRESS |
| 3 | Milestone R2 | 2D StylePad & 11 LUT Cards | M1 | PLANNED |
| 4 | Milestone R3 | Full-Width Timeline & Transport Deck | M1 | PLANNED |
| 5 | Milestone R4 | Custom Dark Dropdowns & Typography | M1 | PLANNED |
| 6 | Milestone AI | AI Speech Transcription & Word Captions | M1 | PLANNED |
| 7 | Milestone Audit| E2E Verification & Forensic Integrity Audit | M2, M3, M4, M5, M6 | PLANNED |

## Interface Contracts
### Header ↔ Player / Studio
- Header locked at fixed 42px height (`#video-studio-header`). Single prominent "#btn-header-upload-video" button triggering file input.

### StylePad ↔ Video Player
- 2D Puck touch/drag on `#vid-style-pad-touch` driving Tone (-100 to +100) and Warmth (-100 to +100).
- Live CSS filters (`buildVideoFilterCss()`) applied to `#video-player-el`.

### Timeline ↔ Audio / Subtitles
- Full-width 100% bottom timeline (`#pro-video-timeline-container`).
- "Transcribe Audio with AI" (`#btn-generate-subtitles`) populates word-level caption blocks both in Captions Drawer list (`renderProCaptionsList`) and Timeline tracks (`renderProTimeline`).

## Code Layout
- `index.html`: Main HTML structure for Gradial Video Studio (Header, Drawers, Stage, Video Player, Timeline, Transport Deck).
- `style.css`: Studio theme styles (`.video-studio-mode`), layout locks, 42px header, 100% timeline, .sk-select dropdowns.
- `app.js`: Interactive logic (File Upload & HTML5 Dropzone, 2D StylePad touch drag, LUT presets, Transport Deck sync, AI transcription engine).

