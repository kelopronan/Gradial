const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/qwert/Downloads/Ahmad ka App/js';

const utils = fs.readFileSync(path.join(dir, 'utils.js'), 'utf8');
const state = fs.readFileSync(path.join(dir, 'state.js'), 'utf8');
const image = fs.readFileSync(path.join(dir, 'image.js'), 'utf8');
const gradCore = fs.readFileSync(path.join(dir, 'gradient-core.js'), 'utf8');
const gradAnim = fs.readFileSync(path.join(dir, 'gradient-animated.js'), 'utf8');
const exp = fs.readFileSync(path.join(dir, 'export.js'), 'utf8');
const main = fs.readFileSync(path.join(dir, 'main.js'), 'utf8');

let out = "(function() { 'use strict';\n\n";

const utilsLines = utils.split('\n');
out += utilsLines.slice(9, 82).join('\n') + '\n\n';
out += utilsLines.slice(84, 179).join('\n') + '\n\n';
out += utilsLines.slice(181, 240).join('\n') + '\n\n';
out += utilsLines.slice(242, 398).join('\n') + '\n\n';

const stateLines = state.split('\n');
out += stateLines.slice(2, 180).join('\n') + '\n\n';

const imageLines = image.split('\n');
out += imageLines.slice(2, 347).join('\n') + '\n\n';

const gradCoreLines = gradCore.split('\n');
out += gradCoreLines.slice(2, 225).join('\n') + '\n\n';

let renderTimelineMarkersFixed = `  function renderTimelineMarkers() {
    var layer = $('timeline-markers-layer');
    if (!layer) return;
    layer.innerHTML = '';

    state.keyframes.forEach(function (kf) {
      var marker = document.createElement('div');
      marker.className = 'timeline-marker';
      marker.style.left = kf.percent + '%';
      layer.appendChild(marker);
    });
  }`;
out += renderTimelineMarkersFixed + '\n\n';

let ga = gradAnim.split('\n');
let renderKeyframesStr = ga.slice(12, 130).join('\n');
renderKeyframesStr = renderKeyframesStr.replace("list.querySelectorAll('.keyframe-card')", "list.querySelectorAll('.keyframe-item-card')");
out += renderKeyframesStr + '\n\n';
out += ga.slice(132, 174).join('\n') + '\n\n';

out += ga.slice(178, 286).join('\n') + '\n\n';

let getKeyframePosStringNew = `  function getKeyframePosString(kf) {
    var x = kf.posX !== undefined ? kf.posX : 50;
    var y = kf.posY !== undefined ? kf.posY : 50;
    return x + '% ' + y + '%';
  }`;
out += getKeyframePosStringNew + '\n\n';
out += ga.slice(288, 329).join('\n') + '\n\n';

let expLines = exp.split('\n');
out += expLines.slice(2, 105).join('\n') + '\n\n';

let videoExportStr = expLines.slice(107, 237).join('\n');
videoExportStr = videoExportStr.replace(
  "var height = resolution.height;",
  "var height = resolution.height;\n    width = width % 2 === 0 ? width : width + 1;\n    height = height % 2 === 0 ? height : height + 1;"
);
videoExportStr = videoExportStr.replace(
  "videoEncoder.encode(frame);",
  "videoEncoder.encode(frame, { keyFrame: currentFrame % 30 === 0 });"
);
videoExportStr = videoExportStr.replace(
  "var cx = (posX / 100) * width;\n      var cy = (posY / 100) * height;",
  "var cx = width / 2;\n      var cy = height / 2;"
);
out += videoExportStr + '\n\n';

let mainLines = main.split('\n');
let initAppStr = mainLines.slice(2, 36).join('\n');
initAppStr = initAppStr.replace("    generateGradient();\n", "");
out += initAppStr + '\n\n';
out += mainLines.slice(40, 488).join('\n') + '\n\n';

out += expLines.slice(241, 245).join('\n') + '\n\n';
out += '})();\n';

fs.writeFileSync('c:/Users/qwert/Downloads/Ahmad ka App/app.js', out);
console.log('App.js compiled successfully.');
