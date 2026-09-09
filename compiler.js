/* ═══════════════════════════════════════════════════════════════
   compiler.js — GC Package Compiler (Multi-Element)

   Exports: compileGCPackage(state)
   Generates templateHTML, templateCSS, templateJS, and an
   assets array from the full editor state.
   ═══════════════════════════════════════════════════════════════ */

/**
 * @param {Object} state - The editor state { elements: [], ... }
 * @returns {{ templateHTML: string, templateCSS: string, templateJS: string, assets: Array }}
 */
function compileGCPackage(state) {
  const ctx = { 
    elements: state.elements, 
    globalDuration: state.globalDuration, 
    assets: [] 
  };

  const templateHTML = _buildHTML(ctx);
  const templateCSS  = _buildCSS(ctx);
  const templateJS   = _buildJS(ctx);

  return { templateHTML, templateCSS, templateJS, assets: ctx.assets };
}

/* ─────────────────────────────────────────────────────────────
   HTML GENERATION
   ───────────────────────────────────────────────────────────── */
function _buildHTML(ctx) {
  let els = '';

  ctx.elements.forEach((el, idx) => {
    const elId = `el-${idx}`;

    switch (el.type) {
      case 'text': {
        const displayText = el.variableName
          ? `&${el.variableName}&`
          : _escHtml(el.content);
        els += `
    <div id="${elId}" class="gc-el gc-el-text">
      <div class="gc-el-inner gc-el-inner-${idx}">
        <span class="gc-text-content"${el.variableName ? ` data-var="${_escAttr(el.variableName)}"` : ''}>${displayText}</span>
      </div>
    </div>`;
        break;
      }

      case 'image': {
        const assetName = `assets/image-${idx}.png`;
        if (el.src) {
          ctx.assets.push({ filename: assetName, dataUrl: el.src });
        }
        els += `
    <div id="${elId}" class="gc-el gc-el-image gc-el-sized-${idx}">
      <img class="gc-img gc-img-${idx}" src="${el.src ? assetName : ''}" alt="" />
    </div>`;
        break;
      }

      case 'shape': {
        els += `
    <div id="${elId}" class="gc-el gc-el-shape gc-el-sized-${idx}">
      <div class="gc-shape gc-shape-${idx}"></div>
    </div>`;
        break;
      }
    }
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <title>GC Lower Third</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="gc-container" class="gc-container">${els}
  </div>
  <script src="script.js"><\/script>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────
   CSS GENERATION
   ───────────────────────────────────────────────────────────── */
function _buildCSS(ctx) {
  const hexRgba = (hex, a) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  // Collect unique fonts
  const fonts = new Set();
  ctx.elements.forEach(el => {
    if (el.type === 'text' && el.fontFamily) fonts.add(el.fontFamily);
  });
  const fontImports = [...fonts].map(f =>
    `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800`
  ).join('&');

  let css = `/* ── GC Lower Third — Auto-generated ── */
* { margin: 0; padding: 0; box-sizing: border-box; }
`;

  if (fontImports) {
    css += `@import url('https://fonts.googleapis.com/css2?${fontImports}&display=swap');\n`;
  }

  css += `
body {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: transparent;
}

.gc-container {
  position: relative;
  width: 1920px;
  height: 1080px;
  opacity: 0;
  pointer-events: none;
}

.gc-el {
  position: absolute;
}
`;

  // Per-element styles
  ctx.elements.forEach((el, idx) => {
    css += `\n/* ── ${el.name} ── */\n`;
    css += `#el-${idx} { left: ${el.x}px; top: ${el.y}px;${el.rotation ? ` transform: rotate(${el.rotation}deg);` : ''} }\n`;

    switch (el.type) {
      case 'text':
        css += `.gc-el-inner-${idx} {
  display: flex; flex-direction: column; gap: 4px;
  padding: ${el.paddingV}px ${el.paddingH}px;
  background: ${hexRgba(el.bgColor, el.bgOpacity)};
  border-radius: ${el.borderRadius}px;
}
.gc-el-inner-${idx} .gc-text-content {
  font-family: '${el.fontFamily}', sans-serif;
  font-size: ${el.fontSize}px;
  font-weight: ${el.fontWeight};
  color: ${el.color};
  text-shadow: ${el.shadowX}px ${el.shadowY}px ${el.shadowBlur}px ${el.shadowColor};
  line-height: 1.2;
  white-space: nowrap;
}\n`;
        break;

      case 'image':
        css += `.gc-el-sized-${idx} { width: ${el.width}px; height: ${el.height}px; }
.gc-img-${idx} {
  width: 100%; height: 100%;
  object-fit: ${el.objectFit};
  opacity: ${el.opacity};
  border-radius: ${el.borderRadius}px;
  display: block;
}\n`;
        break;

      case 'shape': {
        let shapeCSS = `  width: 100%; height: 100%;\n`;
        shapeCSS += `  background: ${hexRgba(el.fillColor, el.fillOpacity)};\n`;
        if (el.strokeWidth > 0) shapeCSS += `  border: ${el.strokeWidth}px solid ${el.strokeColor};\n`;
        if (el.shapeType === 'rect') shapeCSS += `  border-radius: ${el.borderRadius}px;\n`;
        else if (el.shapeType === 'circle') shapeCSS += `  border-radius: 50%;\n`;
        else if (el.shapeType === 'triangle') {
          shapeCSS = `  width: 100%; height: 100%;\n`;
          shapeCSS += `  background: ${hexRgba(el.fillColor, el.fillOpacity)};\n`;
          shapeCSS += `  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);\n`;
        }

        css += `.gc-el-sized-${idx} { width: ${el.width}px; height: ${el.height}px; }
.gc-shape-${idx} {\n${shapeCSS}}\n`;
        break;
      }
    }
  });

  // Animations
  css += `\n/* ── Animations ── */\n`;
  
  ctx.elements.forEach((el, idx) => {
    css += `.gc-enter #el-${idx} { animation: ${el.animIn} ${el.animDuration}ms ease ${el.animDelay}ms both; }\n`;
    css += `.gc-exit  #el-${idx} { animation: ${el.animOut} ${el.animDuration}ms ease ${el.animOutDelay || 0}ms both; }\n`;
  });
  css += '\n';

  const allAnimations = ['fadeIn', 'slideInLeft', 'slideInRight', 'slideInBottom', 'scaleIn', 'fadeOut', 'slideOutLeft', 'slideOutRight', 'slideOutBottom', 'scaleOut'];
  allAnimations.forEach(anim => {
    css += _keyframes(anim, anim) + '\n';
  });

  return css;
}

function _keyframes(name, anim) {
  const map = {
    fadeIn:         [`opacity: 0`,                              `opacity: 1`],
    slideInLeft:    [`opacity: 0; transform: translateX(-80px)`,`opacity: 1; transform: translateX(0)`],
    slideInRight:   [`opacity: 0; transform: translateX(80px)`, `opacity: 1; transform: translateX(0)`],
    slideInBottom:  [`opacity: 0; transform: translateY(60px)`, `opacity: 1; transform: translateY(0)`],
    scaleIn:        [`opacity: 0; transform: scale(0.6)`,       `opacity: 1; transform: scale(1)`],
    fadeOut:        [`opacity: 1`,                              `opacity: 0`],
    slideOutLeft:   [`opacity: 1; transform: translateX(0)`,   `opacity: 0; transform: translateX(-80px)`],
    slideOutRight:  [`opacity: 1; transform: translateX(0)`,   `opacity: 0; transform: translateX(80px)`],
    slideOutBottom: [`opacity: 1; transform: translateY(0)`,   `opacity: 0; transform: translateY(60px)`],
    scaleOut:       [`opacity: 1; transform: scale(1)`,        `opacity: 0; transform: scale(0.6)`],
  };

  const [from, to] = map[anim] || map.fadeIn;
  return `@keyframes ${name} {\n  from { ${from}; }\n  to   { ${to}; }\n}`;
}

/* ─────────────────────────────────────────────────────────────
   JS GENERATION
   ───────────────────────────────────────────────────────────── */
function _buildJS(ctx) {
  // Collect variable names for the update handler
  const vars = [];
  ctx.elements.forEach((el, idx) => {
    if (el.type === 'text' && el.variableName) {
      vars.push({ varName: el.variableName, elId: `el-${idx}` });
    }
  });

  const varMapStr = vars.map(v =>
    `    '${v.varName}': document.querySelector('#${v.elId} .gc-text-content')`
  ).join(',\n');

  return `/* ── GC Renderer Script ── */
(function() {
  'use strict';

  const gcContainer = document.getElementById('gc-container');
  let isVisible = false;
  let hideTimeout = null;
  const defaultDuration = ${ctx.globalDuration};
  const maxEnterTime = ${ctx.elements.length > 0 ? Math.max(...ctx.elements.map(el => el.animDelay + el.animDuration)) : 0};
  const maxExitTime = ${ctx.elements.length > 0 ? Math.max(...ctx.elements.map(el => (el.animOutDelay || 0) + el.animDuration)) : 0};

  /* Map variable names to DOM elements */
  const varElements = {
${varMapStr}
  };

  function updateTexts(data) {
    if (!data) return;
    for (const [key, domEl] of Object.entries(varElements)) {
      if (data[key] !== undefined && domEl) {
        domEl.textContent = data[key];
      }
    }
  }

  function showGC(data) {
    updateTexts(data);
    gcContainer.classList.remove('gc-exit');
    gcContainer.style.opacity = '1';
    gcContainer.classList.add('gc-enter');
    isVisible = true;

    clearTimeout(hideTimeout);
    let duration = defaultDuration;
    if (data && data.duration !== undefined) {
      duration = parseInt(data.duration) || 0;
    }

    if (duration > 0) {
      hideTimeout = setTimeout(() => {
        hideGC();
        channel.postMessage({ action: 'auto_hide' });
      }, maxEnterTime + duration);
    }
  }

  function hideGC() {
    clearTimeout(hideTimeout);
    gcContainer.classList.remove('gc-enter');
    gcContainer.classList.add('gc-exit');
    isVisible = false;
    
    setTimeout(() => {
      if (!isVisible) {
        gcContainer.style.opacity = '0';
        gcContainer.classList.remove('gc-exit');
      }
    }, maxExitTime + 50);
  }

  function toggleGC(data) {
    isVisible ? hideGC() : showGC(data);
  }

  /* ── BroadcastChannel (primary control) ── */
  const channel = new BroadcastChannel('gc-control');
  channel.addEventListener('message', function(event) {
    const msg = event.data;
    switch(msg.action) {
      case 'show':   showGC(msg.data);    break;
      case 'hide':   hideGC();            break;
      case 'toggle': toggleGC(msg.data);  break;
      case 'update': updateTexts(msg.data); break;
    }
  });

  /* ── postMessage (fallback) ── */
  window.addEventListener('message', function(event) {
    const msg = event.data;
    if (!msg || !msg.action) return;
    switch(msg.action) {
      case 'show':   showGC(msg.data);    break;
      case 'hide':   hideGC();            break;
      case 'toggle': toggleGC(msg.data);  break;
      case 'update': updateTexts(msg.data); break;
    }
  });

  console.log('[GC Renderer] Ready. Variables: [${vars.map(v => v.varName).join(', ')}]');
})();
`;
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */
function _escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _escAttr(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
