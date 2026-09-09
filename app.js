/* ═══════════════════════════════════════════════════════════════
   app.js — GC Creator Application Logic (Multi-Element)

   State management, canvas rendering, drag & drop, layer
   management, context-sensitive properties, animation test.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /* ─────────────────────────────────────────────────────────────
     GLOBAL STATE
     ───────────────────────────────────────────────────────────── */
  const state = {
    elements: [],      // Array ordered by z-index (0 = bottom)
    selectedId: null,
    nextId: 1,
    globalDuration: 5000,
    canvasZoom: 1,
    canvasPanX: 0,
    canvasPanY: 0,
  };

  // ── Reference dimensions (OBS output) ──
  const REF_W = 1920;
  const REF_H = 1080;

  function canvasScale() {
    return canvasRenderScale() * state.canvasZoom;
  }

  function canvasRenderScale() {
    return $('canvas').offsetWidth / REF_W;
  }

  /* ─────────────────────────────────────────────────────────────
     ELEMENT CRUD
     ───────────────────────────────────────────────────────────── */
  function addElement(type, overrides = {}) {
    const id = state.nextId++;
    const defaults = _elementDefaults(type, id);
    const el = { ...defaults, ...overrides, id, type };
    state.elements.push(el);
    selectElement(id);
    renderAll();
    return el;
  }

  function removeElement(id) {
    const idx = state.elements.findIndex(e => e.id === id);
    if (idx === -1) return;
    state.elements.splice(idx, 1);
    if (state.selectedId === id) state.selectedId = null;
    renderAll();
  }

  function updateElement(id, props) {
    const el = getElement(id);
    if (!el) return;
    Object.assign(el, props);
  }

  function getElement(id) {
    return state.elements.find(e => e.id === id) || null;
  }

  function getSelectedElement() {
    return state.selectedId ? getElement(state.selectedId) : null;
  }

  function selectElement(id) {
    state.selectedId = id;
    renderLayers();
    renderProperties();
    updatePositionLabel();
    _updateCanvasSelection();
  }

  function _elementDefaults(type, id) {
    const base = { 
      visible: true, locked: false, x: 200, y: 500,
      rotation: 0,
      animIn: 'fadeIn', animOut: 'fadeOut', animDuration: 500, animDelay: 0, animOutDelay: 0
    };

    switch (type) {
      case 'text':
        return {
          ...base,
          name: `Texto ${id}`,
          variableName: '',
          content: 'Novo Texto',
          fontFamily: 'Inter',
          fontSize: 28,
          fontWeight: '600',
          color: '#ffffff',
          shadowX: 0, shadowY: 2, shadowBlur: 4, shadowColor: '#000000',
          bgColor: '#1e2140', bgOpacity: 0.85,
          borderRadius: 8, paddingV: 12, paddingH: 24,
        };
      case 'image':
        return {
          ...base,
          name: `Imagem ${id}`,
          src: '',
          width: 300, height: 200,
          objectFit: 'cover',
          opacity: 1, borderRadius: 0,
        };
      case 'shape':
        return {
          ...base,
          name: `Forma ${id}`,
          shapeType: 'rect',
          width: 400, height: 80,
          fillColor: '#6366f1', fillOpacity: 1,
          strokeColor: '#ffffff', strokeWidth: 0,
          borderRadius: 8,
          triangleStyle: 'isosceles',
          starPoints: 5,
        };
    }
  }

  /* ─────────────────────────────────────────────────────────────
     CANVAS RENDERING
     ───────────────────────────────────────────────────────────── */
  function renderCanvas() {
    const canvas = $('canvas');
    const emptyState = $('canvas-empty');
    const s = canvasRenderScale();

    // Remove old canvas elements (keep empty state)
    canvas.querySelectorAll('.canvas-element').forEach(el => el.remove());

    // Show/hide empty state
    if (state.elements.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }

    // Render each element (z-index order = array order)
    state.elements.forEach((el, idx) => {
      const dom = _createCanvasElement(el, s, idx);
      canvas.appendChild(dom);
    });

    _updateCanvasSelection();
  }

  function _createCanvasElement(el, s, zIdx) {
    const div = document.createElement('div');
    div.className = 'canvas-element';
    div.dataset.id = el.id;
    div.style.zIndex = zIdx + 1;
    div.style.left = (el.x * s) + 'px';
    div.style.top = (el.y * s) + 'px';
    if (el.rotation) div.style.transform = `rotate(${el.rotation}deg)`;

    if (!el.visible) div.classList.add('hidden-layer');
    if (el.locked) div.classList.add('locked');

    switch (el.type) {
      case 'text':  _renderTextElement(div, el, s); break;
      case 'image': _renderImageElement(div, el, s); break;
      case 'shape': _renderShapeElement(div, el, s); break;
    }

    // Add resize handles for image and shape
    if (el.type !== 'text') {
      div.style.width = (el.width * s) + 'px';
      div.style.height = (el.height * s) + 'px';
      ['nw','ne','sw','se'].forEach(pos => {
        const h = document.createElement('div');
        h.className = `resize-handle rh-${pos}`;
        h.dataset.handle = pos;
        div.appendChild(h);
      });
    }

    // Rotation handle (always, for all types)
    const rotHandle = document.createElement('div');
    rotHandle.className = 'rotate-handle';
    rotHandle.dataset.handle = 'rotate';
    div.appendChild(rotHandle);

    return div;
  }

  function _renderTextElement(div, el, s) {
    div.classList.add('canvas-el-text');
    const inner = document.createElement('div');
    inner.className = 'el-text-inner';

    const r = parseInt(el.bgColor.slice(1,3),16);
    const g = parseInt(el.bgColor.slice(3,5),16);
    const b = parseInt(el.bgColor.slice(5,7),16);
    inner.style.background = `rgba(${r},${g},${b},${el.bgOpacity})`;
    inner.style.borderRadius = (el.borderRadius * s) + 'px';
    inner.style.padding = `${el.paddingV * s}px ${el.paddingH * s}px`;

    const span = document.createElement('span');
    span.className = 'el-text-content';
    span.textContent = el.content;
    span.style.fontFamily = `'${el.fontFamily}', sans-serif`;
    span.style.fontSize = (el.fontSize * s) + 'px';
    span.style.fontWeight = el.fontWeight;
    span.style.color = el.color;
    span.style.textShadow = `${el.shadowX * s}px ${el.shadowY * s}px ${el.shadowBlur * s}px ${el.shadowColor}`;
    span.style.lineHeight = '1.2';

    inner.appendChild(span);
    div.appendChild(inner);
  }

  function _renderImageElement(div, el, s) {
    div.classList.add('canvas-el-image');
    if (el.src) {
      const img = document.createElement('img');
      img.className = 'el-image-content';
      img.src = el.src;
      img.style.objectFit = el.objectFit;
      img.style.opacity = el.opacity;
      img.style.borderRadius = (el.borderRadius * s) + 'px';
      img.draggable = false;
      div.appendChild(img);
    } else {
      // Placeholder
      const ph = document.createElement('div');
      ph.className = 'el-image-content';
      ph.style.display = 'flex';
      ph.style.alignItems = 'center';
      ph.style.justifyContent = 'center';
      ph.style.background = 'rgba(255,255,255,0.05)';
      ph.style.border = '1px dashed rgba(255,255,255,0.15)';
      ph.style.borderRadius = (el.borderRadius * s) + 'px';
      ph.style.color = '#565e82';
      ph.style.fontSize = (12 * s) + 'px';
      ph.textContent = 'Sem imagem';
      div.appendChild(ph);
    }
  }

  function _renderShapeElement(div, el, s) {
    div.classList.add('canvas-el-shape');
    if (['triangle', 'star', 'diamond', 'hexagon'].includes(el.shapeType)) {
      const svg = _createPolygonSvg(el, s);
      div.appendChild(svg);
      return;
    }

    const shape = document.createElement('div');
    shape.className = 'el-shape-content';
    const r = parseInt(el.fillColor.slice(1,3),16), g = parseInt(el.fillColor.slice(3,5),16), b = parseInt(el.fillColor.slice(5,7),16);
    shape.style.background = `rgba(${r},${g},${b},${el.fillOpacity})`;
    if (el.strokeWidth > 0) shape.style.border = `${el.strokeWidth * s}px solid ${el.strokeColor}`;
    shape.style.borderRadius = el.shapeType === 'circle' ? '50%' : (el.borderRadius * s) + 'px';
    div.appendChild(shape);
  }

  // SVG avoids clip-path cutting off the stroke and lets polygon corners be rounded.
  function _createPolygonSvg(el, s) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const w = el.width, h = el.height, sw = Math.min(el.strokeWidth || 0, Math.min(w, h) / 2);
    svg.classList.add('el-shape-content');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', _roundedPolygonPath(_shapePoints(el, w, h, sw / 2), Math.max(0, el.borderRadius || 0)));
    path.setAttribute('fill', _hexRgba(el.fillColor, el.fillOpacity));
    if (sw) { path.setAttribute('stroke', el.strokeColor); path.setAttribute('stroke-width', sw); path.setAttribute('stroke-linejoin', 'round'); }
    svg.appendChild(path);
    return svg;
  }

  function _hexRgba(hex, opacity) {
    return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${opacity})`;
  }

  function _shapePoints(el, w, h, inset) {
    const x = inset, y = inset, iw = Math.max(1, w - inset * 2), ih = Math.max(1, h - inset * 2);
    if (el.shapeType === 'triangle') {
      if (el.triangleStyle === 'right') return [[x,y], [x,y+ih], [x+iw,y+ih]];
      if (el.triangleStyle === 'equilateral') {
        const side = Math.min(iw, ih / (Math.sqrt(3) / 2)), th = side * Math.sqrt(3) / 2;
        const ox = x + (iw - side) / 2, oy = y + (ih - th) / 2;
        return [[ox + side / 2, oy], [ox, oy + th], [ox + side, oy + th]];
      }
      return [[x + iw / 2,y], [x,y + ih], [x + iw,y + ih]];
    }
    if (el.shapeType === 'diamond') return [[x+iw/2,y], [x+iw,y+ih/2], [x+iw/2,y+ih], [x,y+ih/2]];
    if (el.shapeType === 'hexagon') return [[x+iw*.25,y], [x+iw*.75,y], [x+iw,y+ih/2], [x+iw*.75,y+ih], [x+iw*.25,y+ih], [x,y+ih/2]];
    const count = Math.max(3, Math.min(12, Number(el.starPoints) || 5)), cx = x + iw/2, cy = y + ih/2;
    const outerX = iw/2, outerY = ih/2, inner = .45, points = [];
    for (let i = 0; i < count * 2; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / count, radius = i % 2 ? inner : 1;
      points.push([cx + Math.cos(angle) * outerX * radius, cy + Math.sin(angle) * outerY * radius]);
    }
    return points;
  }

  function _roundedPolygonPath(points, radius) {
    if (!radius) return `M ${points.map(p => p.join(' ')).join(' L ')} Z`;
    const before = (a, b, d) => { const dx = b[0]-a[0], dy = b[1]-a[1], l = Math.hypot(dx,dy) || 1; return [b[0]-dx*d/l, b[1]-dy*d/l]; };
    const after = (a, b, d) => { const dx = b[0]-a[0], dy = b[1]-a[1], l = Math.hypot(dx,dy) || 1; return [a[0]+dx*d/l, a[1]+dy*d/l]; };
    const parts = [];
    points.forEach((p, i) => {
      const prev = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length];
      const d = Math.min(radius, Math.hypot(p[0]-prev[0], p[1]-prev[1]) / 2, Math.hypot(p[0]-next[0], p[1]-next[1]) / 2);
      const start = before(prev, p, d), end = after(p, next, d);
      if (i === 0) parts.push(`M ${start[0]} ${start[1]}`); else parts.push(`L ${start[0]} ${start[1]}`);
      parts.push(`Q ${p[0]} ${p[1]} ${end[0]} ${end[1]}`);
    });
    return parts.join(' ') + ' Z';
  }

  function updateCanvasElement(id) {
    // Re-render a single element in-place
    const canvas = $('canvas');
    const s = canvasRenderScale();
    const el = getElement(id);
    if (!el) return;

    const oldDom = canvas.querySelector(`.canvas-element[data-id="${id}"]`);
    const zIdx = state.elements.indexOf(el);
    const newDom = _createCanvasElement(el, s, zIdx);

    if (state.selectedId === id) newDom.classList.add('selected');
    if (oldDom) {
      canvas.replaceChild(newDom, oldDom);
    } else {
      canvas.appendChild(newDom);
    }
  }

  function _updateCanvasSelection() {
    const canvas = $('canvas');
    canvas.querySelectorAll('.canvas-element').forEach(dom => {
      const id = parseInt(dom.dataset.id);
      dom.classList.toggle('selected', id === state.selectedId);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     DRAG & DROP
     ───────────────────────────────────────────────────────────── */
  let drag = { active: false, elId: null, offsetX: 0, offsetY: 0, mode: 'move', handle: '' };
  let resize = { startW: 0, startH: 0, startX: 0, startY: 0, startMouseX: 0, startMouseY: 0 };
  let rotate = { startAngle: 0, startRotation: 0, cx: 0, cy: 0 };
  let spacePanHeld = false;
  let pan = { active: false, startX: 0, startY: 0, originX: 0, originY: 0 };

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
      spacePanHeld = true;
      $('canvas-area').classList.add('is-panning-ready');
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spacePanHeld = false;
      $('canvas-area').classList.remove('is-panning-ready');
    }
  });

  // Pan while zoomed: middle mouse, or hold Space and drag anywhere over the canvas.
  $('canvas-area').addEventListener('mousedown', (e) => {
    if (e.button !== 1 && !spacePanHeld) return;
    pan = { active: true, startX: e.clientX, startY: e.clientY, originX: state.canvasPanX, originY: state.canvasPanY };
    $('canvas-area').classList.add('is-panning');
    e.preventDefault();
    e.stopPropagation();
  }, true);

  document.addEventListener('mousemove', (e) => {
    if (!pan.active) return;
    state.canvasPanX = pan.originX + e.clientX - pan.startX;
    state.canvasPanY = pan.originY + e.clientY - pan.startY;
    _applyCanvasView();
  });
  document.addEventListener('mouseup', () => {
    if (!pan.active) return;
    pan.active = false;
    $('canvas-area').classList.remove('is-panning');
  });

  $('canvas').addEventListener('mousedown', (e) => {
    // Check rotation handle first
    const rotHandleEl = e.target.closest('.rotate-handle');
    if (rotHandleEl) {
      const elDom = rotHandleEl.closest('.canvas-element');
      const id = parseInt(elDom.dataset.id);
      const el = getElement(id);
      if (!el || el.locked) return;
      selectElement(id);
      e.preventDefault();
      e.stopPropagation();

      const rect = elDom.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;

      drag.active = true;
      drag.elId = id;
      drag.mode = 'rotate';
      rotate.startAngle = startAngle;
      rotate.startRotation = el.rotation || 0;
      rotate.cx = cx;
      rotate.cy = cy;
      return;
    }

    // Check resize handles
    const handleEl = e.target.closest('.resize-handle');
    if (handleEl) {
      const elDom = handleEl.closest('.canvas-element');
      const id = parseInt(elDom.dataset.id);
      const el = getElement(id);
      if (!el || el.locked) return;
      selectElement(id);
      e.preventDefault();

      const s = canvasScale();
      drag.active = true;
      drag.elId = id;
      drag.mode = 'resize';
      drag.handle = handleEl.dataset.handle;
      resize.startW = el.width;
      resize.startH = el.height;
      resize.startX = el.x;
      resize.startY = el.y;
      resize.startMouseX = e.clientX;
      resize.startMouseY = e.clientY;
      return;
    }

    // Check element click
    const elDom = e.target.closest('.canvas-element');
    if (elDom) {
      const id = parseInt(elDom.dataset.id);
      const el = getElement(id);
      if (!el || el.locked) return;

      selectElement(id);
      e.preventDefault();

      const s = canvasScale();
      const rect = elDom.getBoundingClientRect();
      drag.active = true;
      drag.elId = id;
      drag.mode = 'move';
      drag.offsetX = e.clientX - rect.left;
      drag.offsetY = e.clientY - rect.top;
    } else {
      // Click on canvas background = deselect
      selectElement(null);
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!drag.active) return;

    const el = getElement(drag.elId);
    if (!el) return;

    // ── ROTATE MODE ──
    if (drag.mode === 'rotate') {
      const currentAngle = Math.atan2(e.clientY - rotate.cy, e.clientX - rotate.cx) * 180 / Math.PI;
      let delta = currentAngle - rotate.startAngle;
      let newRotation = rotate.startRotation + delta;

      // Shift = snap to 15° increments
      if (e.shiftKey) newRotation = Math.round(newRotation / 15) * 15;

      // Normalize to [0, 360)
      newRotation = ((newRotation % 360) + 360) % 360;

      el.rotation = Math.round(newRotation * 10) / 10;

      const canvas = $('canvas');
      const dom = canvas.querySelector(`.canvas-element[data-id="${drag.elId}"]`);
      if (dom) dom.style.transform = `rotate(${el.rotation}deg)`;

      // Sync rotation input in properties panel
      const rotInput = document.querySelector('#properties-content [data-prop="rotation"]');
      if (rotInput) rotInput.value = Math.round(el.rotation);
      const rotBadge = document.querySelector('#properties-content [data-badge="rotation"]');
      if (rotBadge) rotBadge.textContent = Math.round(el.rotation) + '°';
      return;
    }

    const canvas = $('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const s = canvasScale();
    const renderS = canvasRenderScale();
    const guidesContainer = document.getElementById('smart-guides');
    if (guidesContainer) guidesContainer.innerHTML = '';

    if (drag.mode === 'move') {
      let newX = (e.clientX - canvasRect.left - drag.offsetX) / s;
      let newY = (e.clientY - canvasRect.top - drag.offsetY) / s;

      if (!e.ctrlKey) {
        const snapThreshold = 8;
        const dom = canvas.querySelector(`.canvas-element[data-id="${drag.elId}"]`);
        let elW = 0, elH = 0;
        if (dom) {
          elW = dom.offsetWidth / renderS;
          elH = dom.offsetHeight / renderS;
        }

        // Edges/centers of the moving element
        const elLeft   = () => newX;
        const elCenterX= () => newX + elW / 2;
        const elRight  = () => newX + elW;
        const elTop    = () => newY;
        const elCenterY= () => newY + elH / 2;
        const elBottom = () => newY + elH;

        let snappedX = false, snappedY = false;
        const guidesX = []; // { pos (canvas coords), type: 'canvas'|'element' }
        const guidesY = [];

        // ── 1. Snap to canvas edges/center ──
        const canvasTargetsX = [0, REF_W / 2, REF_W];
        const canvasTargetsY = [0, REF_H / 2, REF_H];

        if (!snappedX) {
          for (const t of canvasTargetsX) {
            if (Math.abs(elLeft() - t) < snapThreshold)   { newX = t;           guidesX.push({ pos: t, type: 'canvas' }); snappedX = true; break; }
            if (Math.abs(elCenterX() - t) < snapThreshold){ newX = t - elW / 2; guidesX.push({ pos: t, type: 'canvas' }); snappedX = true; break; }
            if (Math.abs(elRight() - t) < snapThreshold)  { newX = t - elW;     guidesX.push({ pos: t, type: 'canvas' }); snappedX = true; break; }
          }
        }
        if (!snappedY) {
          for (const t of canvasTargetsY) {
            if (Math.abs(elTop() - t) < snapThreshold)    { newY = t;           guidesY.push({ pos: t, type: 'canvas' }); snappedY = true; break; }
            if (Math.abs(elCenterY() - t) < snapThreshold){ newY = t - elH / 2; guidesY.push({ pos: t, type: 'canvas' }); snappedY = true; break; }
            if (Math.abs(elBottom() - t) < snapThreshold) { newY = t - elH;     guidesY.push({ pos: t, type: 'canvas' }); snappedY = true; break; }
          }
        }

        // ── 2. Snap to other elements' edges/centers ──
        for (const other of state.elements) {
          if (other.id === drag.elId) continue;
          const otherDom = canvas.querySelector(`.canvas-element[data-id="${other.id}"]`);
          let oW = 0, oH = 0;
          if (otherDom) { oW = otherDom.offsetWidth / renderS; oH = otherDom.offsetHeight / renderS; }
          else { oW = other.width || 0; oH = other.height || 0; }

          const oL = other.x;
          const oCX = other.x + oW / 2;
          const oR = other.x + oW;
          const oT = other.y;
          const oCY = other.y + oH / 2;
          const oB = other.y + oH;

          const xTargets = [oL, oCX, oR];
          const yTargets = [oT, oCY, oB];

          if (!snappedX) {
            for (const t of xTargets) {
              if (Math.abs(elLeft() - t) < snapThreshold)   { newX = t;           guidesX.push({ pos: t, type: 'element' }); snappedX = true; break; }
              if (Math.abs(elCenterX() - t) < snapThreshold){ newX = t - elW / 2; guidesX.push({ pos: t, type: 'element' }); snappedX = true; break; }
              if (Math.abs(elRight() - t) < snapThreshold)  { newX = t - elW;     guidesX.push({ pos: t, type: 'element' }); snappedX = true; break; }
            }
          }
          if (!snappedY) {
            for (const t of yTargets) {
              if (Math.abs(elTop() - t) < snapThreshold)    { newY = t;           guidesY.push({ pos: t, type: 'element' }); snappedY = true; break; }
              if (Math.abs(elCenterY() - t) < snapThreshold){ newY = t - elH / 2; guidesY.push({ pos: t, type: 'element' }); snappedY = true; break; }
              if (Math.abs(elBottom() - t) < snapThreshold) { newY = t - elH;     guidesY.push({ pos: t, type: 'element' }); snappedY = true; break; }
            }
          }

          if (snappedX && snappedY) break;
        }

        // ── 3. Draw guides ──
        if (guidesContainer) {
          guidesX.forEach(g => {
            const line = document.createElement('div');
            line.className = `smart-guide-v guide-${g.type}`;
            line.style.left = (g.pos * renderS) + 'px';
            guidesContainer.appendChild(line);
          });
          guidesY.forEach(g => {
            const line = document.createElement('div');
            line.className = `smart-guide-h guide-${g.type}`;
            line.style.top = (g.pos * renderS) + 'px';
            guidesContainer.appendChild(line);
          });
        }
      }

      // Constrain
      newX = Math.max(0, Math.min(newX, REF_W - 20));
      newY = Math.max(0, Math.min(newY, REF_H - 20));

      el.x = Math.round(newX);
      el.y = Math.round(newY);

      // Update DOM directly for performance
      const dom = canvas.querySelector(`.canvas-element[data-id="${drag.elId}"]`);
      if (dom) {
        dom.style.left = (el.x * renderS) + 'px';
        dom.style.top = (el.y * renderS) + 'px';
      }

      updatePositionLabel();
      _syncPositionInputs();

    } else if (drag.mode === 'resize') {
      const dx = (e.clientX - resize.startMouseX) / s;
      const dy = (e.clientY - resize.startMouseY) / s;
      const handle = drag.handle;

      let newW = resize.startW;
      let newH = resize.startH;
      let newX = resize.startX;
      let newY = resize.startY;

      if (handle.includes('e')) { newW = resize.startW + dx; }
      if (handle.includes('w')) { newW = resize.startW - dx; newX = resize.startX + dx; }
      if (handle.includes('s')) { newH = resize.startH + dy; }
      if (handle.includes('n')) { newH = resize.startH - dy; newY = resize.startY + dy; }

      // ── Snap resize edges to canvas/elements ──
      if (!e.ctrlKey) {
        const snapThreshold = 8;
        const edgeR = newX + newW;
        const edgeB = newY + newH;

        const snapTargetsX = [0, REF_W / 2, REF_W, ...state.elements
          .filter(o => o.id !== drag.elId)
          .flatMap(o => { const oW = o.width || 0; return [o.x, o.x + oW / 2, o.x + oW]; })
        ];
        const snapTargetsY = [0, REF_H / 2, REF_H, ...state.elements
          .filter(o => o.id !== drag.elId)
          .flatMap(o => { const oH = o.height || 0; return [o.y, o.y + oH / 2, o.y + oH]; })
        ];

        if (handle.includes('e')) {
          for (const t of snapTargetsX) {
            if (Math.abs(edgeR - t) < snapThreshold) {
              newW = t - newX;
              if (guidesContainer) {
                const line = document.createElement('div');
                line.className = 'smart-guide-v guide-canvas';
                line.style.left = (t * renderS) + 'px';
                guidesContainer.appendChild(line);
              }
              break;
            }
          }
        }
        if (handle.includes('w')) {
          for (const t of snapTargetsX) {
            if (Math.abs(newX - t) < snapThreshold) {
              const oldR = resize.startX + resize.startW;
              newX = t; newW = oldR - t;
              if (guidesContainer) {
                const line = document.createElement('div');
                line.className = 'smart-guide-v guide-canvas';
                line.style.left = (t * renderS) + 'px';
                guidesContainer.appendChild(line);
              }
              break;
            }
          }
        }
        if (handle.includes('s')) {
          for (const t of snapTargetsY) {
            if (Math.abs(edgeB - t) < snapThreshold) {
              newH = t - newY;
              if (guidesContainer) {
                const line = document.createElement('div');
                line.className = 'smart-guide-h guide-canvas';
                line.style.top = (t * renderS) + 'px';
                guidesContainer.appendChild(line);
              }
              break;
            }
          }
        }
        if (handle.includes('n')) {
          for (const t of snapTargetsY) {
            if (Math.abs(newY - t) < snapThreshold) {
              const oldB = resize.startY + resize.startH;
              newY = t; newH = oldB - t;
              if (guidesContainer) {
                const line = document.createElement('div');
                line.className = 'smart-guide-h guide-canvas';
                line.style.top = (t * renderS) + 'px';
                guidesContainer.appendChild(line);
              }
              break;
            }
          }
        }
      }

      newW = Math.max(20, Math.round(newW));
      newH = Math.max(20, Math.round(newH));
      newX = Math.round(newX);
      newY = Math.round(newY);

      el.width = newW;
      el.height = newH;
      el.x = newX;
      el.y = newY;

      const dom = canvas.querySelector(`.canvas-element[data-id="${drag.elId}"]`);
      if (dom) {
        dom.style.left = (el.x * renderS) + 'px';
        dom.style.top = (el.y * renderS) + 'px';
        dom.style.width = (el.width * renderS) + 'px';
        dom.style.height = (el.height * renderS) + 'px';
      }

      updatePositionLabel();
      _syncPositionInputs();
      _syncSizeInputs();
    }
  });

  document.addEventListener('mouseup', () => {
    if (drag.active) {
      drag.active = false;
      drag.elId = null;
      const guidesContainer = document.getElementById('smart-guides');
      if (guidesContainer) guidesContainer.innerHTML = '';
    }
  });

  function _syncPositionInputs() {
    const el = getSelectedElement();
    if (!el) return;
    const xi = document.querySelector('#properties-content [data-prop="x"]');
    const yi = document.querySelector('#properties-content [data-prop="y"]');
    if (xi) xi.value = el.x;
    if (yi) yi.value = el.y;
  }

  function _syncSizeInputs() {
    const el = getSelectedElement();
    if (!el) return;
    const wi = document.querySelector('#properties-content [data-prop="width"]');
    const hi = document.querySelector('#properties-content [data-prop="height"]');
    if (wi) wi.value = el.width;
    if (hi) hi.value = el.height;
  }

  function updatePositionLabel() {
    const el = getSelectedElement();
    const label = $('gc-position-label');
    if (el) {
      label.textContent = `X: ${el.x}   Y: ${el.y}`;
    } else {
      label.textContent = 'Nenhum elemento selecionado';
    }
  }

  /* ─────────────────────────────────────────────────────────────
     LAYER PANEL
     ───────────────────────────────────────────────────────────── */
  function renderLayers() {
    const list = $('layers-list');

    if (state.elements.length === 0) {
      list.innerHTML = '<div class="layers-empty">Nenhuma camada</div>';
      return;
    }

    // Render in reverse order (top layer first, like Photoshop)
    let html = '';
    for (let i = state.elements.length - 1; i >= 0; i--) {
      const el = state.elements[i];
      const selected = el.id === state.selectedId;
      const typeIcon = { text: 'type', image: 'image', shape: 'square' }[el.type];
      const visIcon = el.visible ? 'eye' : 'eye-off';
      const lockIcon = el.locked ? 'lock' : 'unlock';

      html += `
        <div class="layer-item ${selected ? 'selected' : ''}" data-id="${el.id}" draggable="true">
          <button class="layer-vis-btn ${el.visible ? '' : 'off'}" data-action="toggle-vis" title="Visibilidade">
            <i data-lucide="${visIcon}" class="w-3.5 h-3.5"></i>
          </button>
          <div class="layer-type-icon">
            <i data-lucide="${typeIcon}" class="w-3.5 h-3.5"></i>
          </div>
          <span class="layer-name">${_escapeHtml(el.name)}</span>
          <button class="layer-rename-btn" data-action="rename" title="Renomear elemento">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
          </button>
          <button class="layer-lock-btn ${el.locked ? 'on' : ''}" data-action="toggle-lock" title="Travar">
            <i data-lucide="${lockIcon}" class="w-3.5 h-3.5"></i>
          </button>
          <button class="layer-del-btn" data-action="delete" title="Remover">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;
    }

    list.innerHTML = html;
    lucide.createIcons();
  }

  // Layer events (event delegation)
  let draggedLayerId = null;

  $('layers-list').addEventListener('dragstart', (e) => {
    const item = e.target.closest('.layer-item');
    if (!item) return;
    draggedLayerId = parseInt(item.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    item.classList.add('dragging');
  });

  $('layers-list').addEventListener('dragover', (e) => {
    e.preventDefault();
    const item = e.target.closest('.layer-item');
    if (item && parseInt(item.dataset.id) !== draggedLayerId) {
      const rect = item.getBoundingClientRect();
      const offset = e.clientY - rect.top;
      if (offset < rect.height / 2) {
        item.classList.add('drop-target-top');
        item.classList.remove('drop-target-bottom');
      } else {
        item.classList.add('drop-target-bottom');
        item.classList.remove('drop-target-top');
      }
    }
  });

  $('layers-list').addEventListener('dragleave', (e) => {
    const item = e.target.closest('.layer-item');
    if (item) item.classList.remove('drop-target-top', 'drop-target-bottom');
  });

  $('layers-list').addEventListener('drop', (e) => {
    e.preventDefault();
    const item = e.target.closest('.layer-item');
    if (item) {
      item.classList.remove('drop-target-top', 'drop-target-bottom');
      const targetId = parseInt(item.dataset.id);
      if (draggedLayerId !== null && targetId !== draggedLayerId) {
        const draggedIdx = state.elements.findIndex(el => el.id === draggedLayerId);
        const targetIdx = state.elements.findIndex(el => el.id === targetId);
        if (draggedIdx > -1 && targetIdx > -1) {
          const rect = item.getBoundingClientRect();
          const offset = e.clientY - rect.top;
          const draggedEl = state.elements.splice(draggedIdx, 1)[0];
          
          const newTargetIdx = state.elements.findIndex(el => el.id === targetId);
          if (offset < rect.height / 2) {
            state.elements.splice(newTargetIdx + 1, 0, draggedEl);
          } else {
            state.elements.splice(newTargetIdx, 0, draggedEl);
          }
          renderAll();
        }
      }
    }
    draggedLayerId = null;
  });

  $('layers-list').addEventListener('dragend', (e) => {
    const item = e.target.closest('.layer-item');
    if (item) item.classList.remove('dragging');
    document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('drop-target-top', 'drop-target-bottom'));
  });
  $('layers-list').addEventListener('click', (e) => {
    const item = e.target.closest('.layer-item');
    if (!item) return;
    const id = parseInt(item.dataset.id);

    const action = e.target.closest('[data-action]');
    if (action) {
      const act = action.dataset.action;
      const el = getElement(id);
      if (!el) return;

      if (act === 'toggle-vis') {
        el.visible = !el.visible;
        renderAll();
      } else if (act === 'rename') {
        const name = window.prompt('Novo nome do elemento:', el.name);
        if (name !== null && name.trim()) {
          el.name = name.trim();
          renderLayers();
          renderProperties();
        }
      } else if (act === 'toggle-lock') {
        el.locked = !el.locked;
        renderAll();
      } else if (act === 'delete') {
        removeElement(id);
      }
    } else {
      // Click on layer item = select
      selectElement(id);
    }
  });

  // Layer reorder
  $('btn-layer-up').addEventListener('click', () => {
    const el = getSelectedElement();
    if (!el) return;
    const idx = state.elements.indexOf(el);
    if (idx < state.elements.length - 1) {
      state.elements.splice(idx, 1);
      state.elements.splice(idx + 1, 0, el);
      renderAll();
    }
  });

  $('btn-layer-down').addEventListener('click', () => {
    const el = getSelectedElement();
    if (!el) return;
    const idx = state.elements.indexOf(el);
    if (idx > 0) {
      state.elements.splice(idx, 1);
      state.elements.splice(idx - 1, 0, el);
      renderAll();
    }
  });

  /* ─────────────────────────────────────────────────────────────
     PROPERTIES PANEL (Context-Sensitive)
     ───────────────────────────────────────────────────────────── */
  function renderProperties() {
    const container = $('properties-content');
    const badge = $('props-type-badge');
    const el = getSelectedElement();

    if (!el) {
      container.innerHTML = `
        <div class="empty-props">
          <i data-lucide="mouse-pointer-click" class="w-8 h-8 text-surface-700"></i>
          <p class="text-surface-500 text-xs mt-2">Selecione um elemento</p>
        </div>
      `;
      badge.className = 'props-type-badge hidden';
      lucide.createIcons();
      return;
    }

    // Update type badge
    const typeLabels = { text: 'Texto', image: 'Imagem', shape: 'Forma' };
    badge.textContent = typeLabels[el.type];
    badge.className = `props-type-badge type-${el.type}`;

    let html = '';

    // ── Common: Name + Position + Rotation ──
    html += _propSection('Geral', `
      <div class="field-group">
        <label class="field-label">Nome</label>
        <input type="text" class="field-input" data-prop="name" value="${_escAttr(el.name)}" />
      </div>
      <div class="grid grid-cols-2 gap-2 mt-2">
        <div class="field-group">
          <label class="field-label">X</label>
          <input type="number" class="field-input text-center" data-prop="x" data-type="number" value="${el.x}" />
        </div>
        <div class="field-group">
          <label class="field-label">Y</label>
          <input type="number" class="field-input text-center" data-prop="y" data-type="number" value="${el.y}" />
        </div>
      </div>
      <div class="field-group mt-2">
        <label class="field-label" style="justify-content:space-between">
          <span>Rotação</span>
          <button class="btn-reset-rotation" data-prop-reset="rotation" title="Resetar para 0°" style="font-size:10px;background:none;border:none;color:#565e82;cursor:pointer;padding:2px 4px;border-radius:4px;transition:color 0.2s">
            <span>↺ 0°</span>
          </button>
        </label>
        <div class="flex items-center gap-2">
          <input type="range" class="field-range flex-1" data-prop="rotation" data-type="float" min="0" max="360" step="0.5" value="${el.rotation || 0}" />
          <span class="field-value-badge" data-badge="rotation">${Math.round(el.rotation || 0)}°</span>
        </div>
      </div>
    `);

    // ── Type-specific ──
    switch (el.type) {
      case 'text':  html += _textProperties(el); break;
      case 'image': html += _imageProperties(el); break;
      case 'shape': html += _shapeProperties(el); break;
    }

    html += _propSection('Animação', `
      <div class="grid grid-cols-2 gap-2">
        <div class="field-group">
          <label class="field-label">Entrada</label>
          <select class="field-select" data-prop="animIn">
            <option value="fadeIn" ${el.animIn === 'fadeIn' ? 'selected' : ''}>Fade In</option>
            <option value="slideInLeft" ${el.animIn === 'slideInLeft' ? 'selected' : ''}>Slide Esq</option>
            <option value="slideInRight" ${el.animIn === 'slideInRight' ? 'selected' : ''}>Slide Dir</option>
            <option value="slideInBottom" ${el.animIn === 'slideInBottom' ? 'selected' : ''}>Slide Baixo</option>
            <option value="scaleIn" ${el.animIn === 'scaleIn' ? 'selected' : ''}>Scale In</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label">Saída</label>
          <select class="field-select" data-prop="animOut">
            <option value="fadeOut" ${el.animOut === 'fadeOut' ? 'selected' : ''}>Fade Out</option>
            <option value="slideOutLeft" ${el.animOut === 'slideOutLeft' ? 'selected' : ''}>Slide Esq</option>
            <option value="slideOutRight" ${el.animOut === 'slideOutRight' ? 'selected' : ''}>Slide Dir</option>
            <option value="slideOutBottom" ${el.animOut === 'slideOutBottom' ? 'selected' : ''}>Slide Baixo</option>
            <option value="scaleOut" ${el.animOut === 'scaleOut' ? 'selected' : ''}>Scale Out</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-2">
        <div class="field-group">
          <label class="field-label" title="Duração da animação">Dur. (ms)</label>
          <input type="number" class="field-input text-center" data-prop="animDuration" data-type="number" value="${el.animDuration}" min="100" step="50" />
        </div>
        <div class="field-group">
          <label class="field-label" title="Atraso na entrada">In (ms)</label>
          <input type="number" class="field-input text-center" data-prop="animDelay" data-type="number" value="${el.animDelay}" min="0" step="50" />
        </div>
        <div class="field-group">
          <label class="field-label" title="Atraso na saída">Out (ms)</label>
          <input type="number" class="field-input text-center" data-prop="animOutDelay" data-type="number" value="${el.animOutDelay}" min="0" step="50" />
        </div>
      </div>
    `);

    container.innerHTML = html;
    _bindPropertyEvents();
    lucide.createIcons();
  }

  function _textProperties(el) {
    let html = '';

    // Variable + Content
    html += _propSection('Conteúdo', `
      <div class="field-group">
        <label class="field-label">Variável <span class="text-surface-600 text-[9px] normal-case">(para export: &amp;nome&amp;)</span></label>
        <input type="text" class="field-input font-mono text-xs" data-prop="variableName" value="${_escAttr(el.variableName)}" placeholder="ex: nome, descricao" />
      </div>
      <div class="field-group mt-2">
        <label class="field-label">Texto (preview)</label>
        <input type="text" class="field-input" data-prop="content" value="${_escAttr(el.content)}" />
      </div>
    `);

    // Typography
    html += _propSection('Tipografia', `
      <div class="field-group">
        <label class="field-label">Fonte (Google Fonts)</label>
        <input type="text" class="field-input" data-prop="fontFamily" value="${_escAttr(el.fontFamily)}" placeholder="ex: Roboto" />
      </div>
      <div class="field-group mt-2">
        <label class="field-label">Tamanho</label>
        <div class="flex items-center gap-2">
          <input type="range" class="field-range flex-1" data-prop="fontSize" data-type="number" min="10" max="80" value="${el.fontSize}" />
          <span class="field-value-badge" data-badge="fontSize">${el.fontSize}px</span>
        </div>
      </div>
      <div class="field-group mt-2">
        <label class="field-label">Peso</label>
        <select class="field-select" data-prop="fontWeight">
          ${[['300','Light'],['400','Regular'],['500','Medium'],['600','Semibold'],['700','Bold'],['800','Extra Bold']].map(([v,l]) =>
            `<option value="${v}" ${el.fontWeight === v ? 'selected' : ''}>${l} (${v})</option>`
          ).join('')}
        </select>
      </div>
      <div class="field-group mt-2">
        <label class="field-label">Cor</label>
        <div class="flex items-center gap-2" data-color-prop="color">
          <input type="color" class="field-color" value="${el.color}" />
          <input type="text" class="field-input flex-1 font-mono text-xs" value="${el.color}" />
        </div>
      </div>
    `);

    // Shadow
    html += _propSection('Sombra do Texto', `
      <div class="grid grid-cols-3 gap-2">
        <div class="field-group"><span class="text-[10px] text-surface-500">X</span>
          <input type="number" class="field-input text-center" data-prop="shadowX" data-type="number" value="${el.shadowX}" min="-20" max="20" /></div>
        <div class="field-group"><span class="text-[10px] text-surface-500">Y</span>
          <input type="number" class="field-input text-center" data-prop="shadowY" data-type="number" value="${el.shadowY}" min="-20" max="20" /></div>
        <div class="field-group"><span class="text-[10px] text-surface-500">Blur</span>
          <input type="number" class="field-input text-center" data-prop="shadowBlur" data-type="number" value="${el.shadowBlur}" min="0" max="50" /></div>
      </div>
      <div class="flex items-center gap-2 mt-1" data-color-prop="shadowColor">
        <input type="color" class="field-color" value="${el.shadowColor}" />
        <span class="text-[10px] text-surface-500">Cor da sombra</span>
      </div>
    `);

    // Background
    html += _propSection('Fundo', `
      <div class="field-group">
        <label class="field-label">Cor</label>
        <div class="flex items-center gap-2" data-color-prop="bgColor">
          <input type="color" class="field-color" value="${el.bgColor}" />
          <input type="text" class="field-input flex-1 font-mono text-xs" value="${el.bgColor}" />
        </div>
      </div>
      <div class="field-group mt-2">
        <label class="field-label">Opacidade</label>
        <div class="flex items-center gap-2">
          <input type="range" class="field-range flex-1" data-prop="bgOpacity" data-type="float" min="0" max="1" step="0.01" value="${el.bgOpacity}" />
          <span class="field-value-badge" data-badge="bgOpacity">${Math.round(el.bgOpacity * 100)}%</span>
        </div>
      </div>
      <div class="field-group mt-2">
        <label class="field-label">Border Radius</label>
        <div class="flex items-center gap-2">
          <input type="range" class="field-range flex-1" data-prop="borderRadius" data-type="number" min="0" max="40" value="${el.borderRadius}" />
          <span class="field-value-badge" data-badge="borderRadius">${el.borderRadius}px</span>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 mt-2">
        <div class="field-group"><span class="text-[10px] text-surface-500">Padding V</span>
          <input type="number" class="field-input text-center" data-prop="paddingV" data-type="number" value="${el.paddingV}" min="0" max="60" /></div>
        <div class="field-group"><span class="text-[10px] text-surface-500">Padding H</span>
          <input type="number" class="field-input text-center" data-prop="paddingH" data-type="number" value="${el.paddingH}" min="0" max="80" /></div>
      </div>
    `);

    return html;
  }

  function _imageProperties(el) {
    let html = '';

    html += _propSection('Imagem', `
      <button class="btn-upload" id="btn-change-image">
        <i data-lucide="upload" class="w-4 h-4"></i>
        ${el.src ? 'Trocar Imagem' : 'Carregar Imagem'}
      </button>
      ${el.src ? `<img src="${el.src}" class="img-preview-thumb" />` : ''}
      <div class="grid grid-cols-2 gap-2 mt-3">
        <div class="field-group"><label class="field-label">Largura</label>
          <input type="number" class="field-input text-center" data-prop="width" data-type="number" value="${el.width}" min="10" /></div>
        <div class="field-group"><label class="field-label">Altura</label>
          <input type="number" class="field-input text-center" data-prop="height" data-type="number" value="${el.height}" min="10" /></div>
      </div>
      <div class="field-group mt-2">
        <label class="field-label">Ajuste</label>
        <select class="field-select" data-prop="objectFit">
          ${['cover','contain','fill','none'].map(v =>
            `<option value="${v}" ${el.objectFit === v ? 'selected' : ''}>${v}</option>`
          ).join('')}
        </select>
      </div>
    `);

    html += _propSection('Estilo', `
      <div class="field-group">
        <label class="field-label">Opacidade</label>
        <div class="flex items-center gap-2">
          <input type="range" class="field-range flex-1" data-prop="opacity" data-type="float" min="0" max="1" step="0.01" value="${el.opacity}" />
          <span class="field-value-badge" data-badge="opacity">${Math.round(el.opacity * 100)}%</span>
        </div>
      </div>
      <div class="field-group mt-2">
        <label class="field-label">Border Radius</label>
        <div class="flex items-center gap-2">
          <input type="range" class="field-range flex-1" data-prop="borderRadius" data-type="number" min="0" max="100" value="${el.borderRadius}" />
          <span class="field-value-badge" data-badge="borderRadius">${el.borderRadius}px</span>
        </div>
      </div>
    `);

    return html;
  }

  function _shapeProperties(el) {
    let html = '';

    html += _propSection('Forma', `
      <div class="field-group">
        <label class="field-label">Tipo</label>
        <select class="field-select" data-prop="shapeType">
          <option value="rect" ${el.shapeType === 'rect' ? 'selected' : ''}>Retângulo</option>
          <option value="circle" ${el.shapeType === 'circle' ? 'selected' : ''}>Círculo</option>
          <option value="triangle" ${el.shapeType === 'triangle' ? 'selected' : ''}>Triângulo</option>
          <option value="star" ${el.shapeType === 'star' ? 'selected' : ''}>Estrela</option>
          <option value="diamond" ${el.shapeType === 'diamond' ? 'selected' : ''}>Losango</option>
          <option value="hexagon" ${el.shapeType === 'hexagon' ? 'selected' : ''}>Hexágono</option>
        </select>
      </div>
      ${el.shapeType === 'triangle' ? `<div class="field-group mt-2">
        <label class="field-label">Formato do triângulo</label>
        <select class="field-select" data-prop="triangleStyle">
          <option value="isosceles" ${el.triangleStyle === 'isosceles' ? 'selected' : ''}>Isósceles</option>
          <option value="equilateral" ${el.triangleStyle === 'equilateral' ? 'selected' : ''}>Equilátero</option>
          <option value="right" ${el.triangleStyle === 'right' ? 'selected' : ''}>Retângulo</option>
        </select>
      </div>` : ''}
      ${el.shapeType === 'star' ? `<div class="field-group mt-2">
        <label class="field-label">Número de pontas</label>
        <div class="flex items-center gap-2">
          <input type="range" class="field-range flex-1" data-prop="starPoints" data-type="number" min="3" max="12" value="${el.starPoints || 5}" />
          <span class="field-value-badge" data-badge="starPoints">${el.starPoints || 5}</span>
        </div>
      </div>` : ''}
      <div class="grid grid-cols-2 gap-2 mt-2">
        <div class="field-group"><label class="field-label">Largura</label>
          <input type="number" class="field-input text-center" data-prop="width" data-type="number" value="${el.width}" min="10" /></div>
        <div class="field-group"><label class="field-label">Altura</label>
          <input type="number" class="field-input text-center" data-prop="height" data-type="number" value="${el.height}" min="10" /></div>
      </div>
    `);

    html += _propSection('Preenchimento', `
      <div class="field-group">
        <label class="field-label">Cor</label>
        <div class="flex items-center gap-2" data-color-prop="fillColor">
          <input type="color" class="field-color" value="${el.fillColor}" />
          <input type="text" class="field-input flex-1 font-mono text-xs" value="${el.fillColor}" />
        </div>
      </div>
      <div class="field-group mt-2">
        <label class="field-label">Opacidade</label>
        <div class="flex items-center gap-2">
          <input type="range" class="field-range flex-1" data-prop="fillOpacity" data-type="float" min="0" max="1" step="0.01" value="${el.fillOpacity}" />
          <span class="field-value-badge" data-badge="fillOpacity">${Math.round(el.fillOpacity * 100)}%</span>
        </div>
      </div>
    `);

    html += _propSection('Contorno', `
      <div class="flex items-center gap-2" data-color-prop="strokeColor">
        <input type="color" class="field-color" value="${el.strokeColor}" />
        <span class="text-[10px] text-surface-500">Cor</span>
      </div>
      <div class="field-group mt-2">
        <label class="field-label">Espessura</label>
        <div class="flex items-center gap-2">
          <input type="range" class="field-range flex-1" data-prop="strokeWidth" data-type="number" min="0" max="20" value="${el.strokeWidth}" />
          <span class="field-value-badge" data-badge="strokeWidth">${el.strokeWidth}px</span>
        </div>
      </div>
    `);

    if (el.shapeType !== 'circle') {
      html += _propSection('Borda', `
        <div class="field-group">
          <label class="field-label">Border Radius</label>
          <div class="flex items-center gap-2">
            <input type="range" class="field-range flex-1" data-prop="borderRadius" data-type="number" min="0" max="100" value="${el.borderRadius}" />
            <span class="field-value-badge" data-badge="borderRadius">${el.borderRadius}px</span>
          </div>
        </div>
      `);
    }

    return html;
  }

  // ── Property Event Binding (centralized, DRY) ──

  function _bindPropertyEvents() {
    const container = $('properties-content');
    const el = getSelectedElement();
    if (!el) return;

    // Standard data-prop inputs (text, number, range, select)
    container.querySelectorAll('[data-prop]').forEach(input => {
      const events = (input.type === 'range') ? ['input'] :
                     (input.tagName === 'SELECT') ? ['change'] : ['input'];

      events.forEach(evt => {
        input.addEventListener(evt, () => {
          const prop = input.dataset.prop;
          let value = input.value;
          const dtype = input.dataset.type;

          if (dtype === 'number') value = parseInt(value) || 0;
          else if (dtype === 'float') value = parseFloat(value) || 0;

          if (prop === 'fontFamily') {
            const fontName = value.trim();
            if (fontName) {
              const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
              const linkId = 'font-' + fontName.replace(/ /g, '-').toLowerCase();
              if (!document.getElementById(linkId)) {
                const link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                link.href = fontUrl;
                document.head.appendChild(link);
              }
            }
          }

          updateElement(el.id, { [prop]: value });
          updateCanvasElement(el.id);

          // Shape-specific controls depend on the selected shape.
          if (prop === 'shapeType') {
            renderProperties();
            return;
          }

          // Update badge if exists
          const badge = container.querySelector(`[data-badge="${prop}"]`);
          if (badge) {
            if (prop === 'rotation') badge.textContent = Math.round(value) + '°';
            else if (dtype === 'float') badge.textContent = Math.round(value * 100) + '%';
            else if (prop === 'starPoints') badge.textContent = value;
            else badge.textContent = value + 'px';
          }

          // Update position label
          if (prop === 'x' || prop === 'y') updatePositionLabel();
          // Update layer name
          if (prop === 'name') renderLayers();
        });
      });
    });

    // Color fields (picker + hex sync)
    container.querySelectorAll('[data-color-prop]').forEach(field => {
      const prop = field.dataset.colorProp;
      const picker = field.querySelector('input[type="color"]');
      const hex = field.querySelector('input[type="text"]');

      if (picker) {
        picker.addEventListener('input', () => {
          if (hex) hex.value = picker.value;
          updateElement(el.id, { [prop]: picker.value });
          updateCanvasElement(el.id);
        });
      }

      if (hex) {
        hex.addEventListener('input', () => {
          if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) {
            if (picker) picker.value = hex.value;
            updateElement(el.id, { [prop]: hex.value });
            updateCanvasElement(el.id);
          }
        });
      }
    });

    // Image change button
    const btnChangeImg = container.querySelector('#btn-change-image');
    if (btnChangeImg) {
      btnChangeImg.addEventListener('click', () => {
        _triggerImageUpload(el.id);
      });
    }

    // Reset rotation button
    container.querySelectorAll('[data-prop-reset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const prop = btn.dataset.propReset;
        updateElement(el.id, { [prop]: 0 });
        updateCanvasElement(el.id);
        // Sync range input and badge
        const rangeInput = container.querySelector(`[data-prop="${prop}"]`);
        if (rangeInput) rangeInput.value = 0;
        const badge = container.querySelector(`[data-badge="${prop}"]`);
        if (badge) badge.textContent = prop === 'rotation' ? '0°' : '0px';
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     ADD ELEMENT BUTTONS
     ───────────────────────────────────────────────────────────── */
  $('btn-add-text').addEventListener('click', () => {
    addElement('text');
  });

  $('btn-add-image').addEventListener('click', () => {
    const el = addElement('image');
    _triggerImageUpload(el.id);
  });

  $('btn-add-shape').addEventListener('click', () => {
    addElement('shape');
  });

  // Internal clipboard keeps all element properties, including images and shape options.
  let copiedElement = null;
  function copySelectedElement() {
    const el = getSelectedElement();
    if (!el) { showToast('Selecione um elemento para copiar.'); return; }
    copiedElement = JSON.parse(JSON.stringify(el));
    showToast('Elemento copiado.');
  }

  function pasteElement() {
    if (!copiedElement) { showToast('Nenhum elemento copiado.'); return; }
    const offset = 24;
    const clone = { ...copiedElement, x: Math.min(REF_W - 20, copiedElement.x + offset), y: Math.min(REF_H - 20, copiedElement.y + offset) };
    if (clone.name) clone.name = `${clone.name} (cópia)`;
    addElement(clone.type, clone);
    showToast('Elemento colado.');
  }

  function setCanvasZoom(zoom) {
    state.canvasZoom = Math.max(0.25, Math.min(3, Math.round(zoom * 100) / 100));
    _applyCanvasView();
    $('btn-zoom-reset').textContent = `${Math.round(state.canvasZoom * 100)}%`;
    renderCanvas();
  }
  function _applyCanvasView() {
    $('canvas-wrapper').style.transform = `translate(${state.canvasPanX}px, ${state.canvasPanY}px) scale(${state.canvasZoom})`;
  }
  function resetCanvasView() {
    state.canvasPanX = 0;
    state.canvasPanY = 0;
    setCanvasZoom(1);
  }
  $('btn-zoom-out').addEventListener('click', () => setCanvasZoom(state.canvasZoom - 0.25));
  $('btn-zoom-in').addEventListener('click', () => setCanvasZoom(state.canvasZoom + 0.25));
  $('btn-zoom-reset').addEventListener('click', resetCanvasView);

  // Image upload handler
  function _triggerImageUpload(targetId) {
    const fileInput = $('file-upload');
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          // Scale to fit within reasonable bounds
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          const maxDim = 500;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          updateElement(targetId, {
            src: evt.target.result,
            width: w,
            height: h,
          });
          renderAll();
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
      fileInput.value = ''; // Reset
    };
    fileInput.click();
  }

  /* ─────────────────────────────────────────────────────────────
     SNAP BUTTONS
     ───────────────────────────────────────────────────────────── */
  $('btn-snap-bottom-left').addEventListener('click', () => {
    const el = getSelectedElement();
    if (!el) return;
    const { height } = _elementLogicalSize(el);
    el.x = 60; el.y = REF_H - height - 60;
    updateCanvasElement(el.id);
    updatePositionLabel();
    renderProperties();
  });

  $('btn-snap-bottom-center').addEventListener('click', () => {
    const el = getSelectedElement();
    if (!el) return;
    const { width, height } = _elementLogicalSize(el);
    el.x = (REF_W - width) / 2; el.y = REF_H - height - 60;
    updateCanvasElement(el.id);
    updatePositionLabel();
    renderProperties();
  });

  $('btn-snap-bottom-right').addEventListener('click', () => {
    const el = getSelectedElement();
    if (!el) return;
    const { width, height } = _elementLogicalSize(el);
    el.x = REF_W - width - 60; el.y = REF_H - height - 60;
    updateCanvasElement(el.id);
    updatePositionLabel();
    renderProperties();
  });

  $('btn-snap-center').addEventListener('click', () => {
    const el = getSelectedElement();
    if (!el) return;
    const { width, height } = _elementLogicalSize(el);
    el.x = (REF_W - width) / 2; el.y = (REF_H - height) / 2;
    updateCanvasElement(el.id);
    updatePositionLabel();
    renderProperties();
  });

  function _elementLogicalSize(el) {
    if (el.width && el.height) return { width: el.width, height: el.height };
    const dom = $('canvas').querySelector(`.canvas-element[data-id="${el.id}"]`);
    const scale = canvasRenderScale();
    return {
      width: dom ? dom.offsetWidth / scale : 400,
      height: dom ? dom.offsetHeight / scale : 80,
    };
  }

  /* ─────────────────────────────────────────────────────────────
     KEYBOARD SHORTCUTS
     ───────────────────────────────────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    // Don't trigger when typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const el = getSelectedElement();
      if (el) {
        e.preventDefault();
        removeElement(el.id);
      }
    }

    if (e.key === 'Escape') {
      selectElement(null);
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copySelectedElement();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      pasteElement();
    }
  });

  /* ─────────────────────────────────────────────────────────────
     ACCORDION
     ───────────────────────────────────────────────────────────── */
  document.querySelectorAll('.accordion-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const section = trigger.closest('.accordion-section');
      section.classList.toggle('open');
    });
  });

  /* ─────────────────────────────────────────────────────────────
     ANIMATION TEST (Global)
     ───────────────────────────────────────────────────────────── */
  $('global-duration').addEventListener('input', (e) => {
    state.globalDuration = parseInt(e.target.value) || 0;
  });

  let animationPlaying = false;
  let testAnimTimeout = null;

  function playTestAnimation() {
    if (animationPlaying || state.elements.length === 0) return;
    animationPlaying = true;
    clearTimeout(testAnimTimeout);

    const animNameMap = {
      fadeIn: 'fadeIn', slideInLeft: 'slideInLeft',
      slideInRight: 'slideInRight', slideInBottom: 'slideInBottom',
      scaleIn: 'scaleIn', fadeOut: 'fadeOut',
      slideOutLeft: 'slideOutLeft', slideOutRight: 'slideOutRight',
      slideOutBottom: 'slideOutBottom', scaleOut: 'scaleOut',
    };

    const canvas = $('canvas');
    const allEls = canvas.querySelectorAll('.canvas-element');

    // Reset styles
    allEls.forEach(dom => {
      dom.style.animation = 'none';
      dom.style.opacity = '0';
    });
    void canvas.offsetHeight; // force reflow

    // Apply entrance animations
    state.elements.forEach(el => {
      const dom = canvas.querySelector(`.canvas-element[data-id="${el.id}"]`);
      if (dom) {
        dom.style.animation = `${animNameMap[el.animIn]} ${el.animDuration}ms ease ${el.animDelay}ms both`;
      }
    });

    const holdTime = state.globalDuration > 0 ? state.globalDuration : 2000;
    let maxEnterTime = 0;
    state.elements.forEach(el => {
      const t = el.animDelay + el.animDuration;
      if (t > maxEnterTime) maxEnterTime = t;
    });

    const exitStartTime = maxEnterTime + holdTime;

    testAnimTimeout = setTimeout(() => {
      state.elements.forEach(el => {
        const dom = canvas.querySelector(`.canvas-element[data-id="${el.id}"]`);
        if (dom) {
          dom.style.animation = 'none';
          void dom.offsetHeight;
          dom.style.animation = `${animNameMap[el.animOut]} ${el.animDuration}ms ease ${el.animOutDelay}ms both`;
        }
      });

      let maxExitTime = 0;
      state.elements.forEach(el => {
        const t = el.animOutDelay + el.animDuration;
        if (t > maxExitTime) maxExitTime = t;
      });

      setTimeout(() => {
        allEls.forEach(dom => {
          dom.style.animation = 'none';
          dom.style.opacity = '1';
        });
        animationPlaying = false;
      }, maxExitTime + 50);

    }, exitStartTime);
  }

  $('btn-test-animation').addEventListener('click', playTestAnimation);
  $('btn-test-anim-panel').addEventListener('click', playTestAnimation);

  /* ─────────────────────────────────────────────────────────────
     IMPORT / EDIT EXISTING GC
     ───────────────────────────────────────────────────────────── */
  $('btn-import').addEventListener('click', () => $('file-import').click());

  $('file-import').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (typeof JSZip === 'undefined') {
      showToast('Importação indisponível: JSZip não foi carregado.');
      return;
    }
    if (state.elements.length && !window.confirm('Importar este GC substituirá os elementos atuais. Continuar?')) return;

    try {
      const zip = await JSZip.loadAsync(file);
      const editorFile = zip.file('editor-state.json');
      if (!editorFile) {
        throw new Error('Este pacote não possui dados de edição. Ele precisa ter sido gerado por uma versão recente do GC Creator.');
      }
      const imported = JSON.parse(await editorFile.async('string'));
      if (!Array.isArray(imported.elements) || !imported.elements.every(_isValidImportedElement)) {
        throw new Error('Os dados de edição do pacote são inválidos.');
      }

      // IDs are regenerated to keep selection/layers consistent even with older packages.
      state.elements = imported.elements.map((element, index) => ({ ...element, id: index + 1 }));
      state.nextId = state.elements.length + 1;
      state.selectedId = state.elements.length ? state.elements[state.elements.length - 1].id : null;
      state.globalDuration = Number(imported.globalDuration) || 5000;
      $('global-duration').value = state.globalDuration;
      renderAll();
      showToast(`${state.elements.length} elemento(s) importado(s) para edição.`);
    } catch (err) {
      console.error('Erro ao importar GC:', err);
      showToast(err.message || 'Não foi possível importar este arquivo .gc.');
    }
  });

  function _isValidImportedElement(element) {
    return element && typeof element === 'object' &&
      ['text', 'image', 'shape'].includes(element.type) &&
      typeof element.x === 'number' && typeof element.y === 'number';
  }

  /* ─────────────────────────────────────────────────────────────
     EXPORT
     ───────────────────────────────────────────────────────────── */
  $('btn-export').addEventListener('click', async () => {
    if (state.elements.length === 0) {
      showToast('Adicione pelo menos um elemento antes de exportar.');
      return;
    }

    const result = compileGCPackage(state);

    if (typeof JSZip !== 'undefined') {
      try {
        showToast('Gerando pacote .gc...');
        const zip = new JSZip();
        zip.file('index.html', result.templateHTML);
        zip.file('style.css', result.templateCSS);
        zip.file('script.js', result.templateJS);
        // This file makes the .gc reversible: importing it restores editable layers.
        zip.file('editor-state.json', JSON.stringify({
          version: 2,
          globalDuration: state.globalDuration,
          elements: state.elements,
        }, null, 2));
        
        if (result.assets.length > 0) {
          const assetsFolder = zip.folder('assets');
          result.assets.forEach(asset => {
            const filename = asset.filename.split('/').pop();
            const base64Data = asset.dataUrl.split(',')[1];
            assetsFolder.file(filename, base64Data, { base64: true });
          });
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        if (typeof saveAs !== 'undefined') {
          saveAs(blob, 'lower-third.gc');
        } else {
          // Fallback just in case FileSaver fails to load
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'lower-third.gc';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
        showToast('Download concluído!');
      } catch (err) {
        console.error('Erro ao gerar pacote:', err);
        showToast('Erro ao gerar o pacote .gc');
      }
    } else {
      console.log('HTML:\n', result.templateHTML);
      console.log('CSS:\n', result.templateCSS);
      console.log('JS:\n', result.templateJS);
      showToast('Pacote gerado no console (JSZip não encontrado).');
    }
  });

  /* ─────────────────────────────────────────────────────────────
     RESET
     ───────────────────────────────────────────────────────────── */
  $('btn-reset').addEventListener('click', () => {
    state.elements = [];
    state.selectedId = null;
    state.nextId = 1;
    state.globalDuration = 5000;
    $('global-duration').value = '5000';

    renderAll();
    showToast('Tudo resetado.');
  });

  /* ─────────────────────────────────────────────────────────────
     TOAST
     ───────────────────────────────────────────────────────────── */
  function showToast(message) {
    const toast = $('toast');
    const toastMsg = $('toast-message');
    toastMsg.textContent = message;
    toast.classList.remove('hidden');
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.classList.add('hidden'), 400);
    }, 3000);
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER ALL (convenience)
     ───────────────────────────────────────────────────────────── */
  function renderAll() {
    renderCanvas();
    renderLayers();
    renderProperties();
    updatePositionLabel();
  }

  /* ─────────────────────────────────────────────────────────────
     HELPERS
     ───────────────────────────────────────────────────────────── */
  function _propSection(title, content) {
    return `<div class="prop-section">
      <h4 class="prop-section-title">${title}</h4>
      ${content}
    </div>`;
  }

  function _escAttr(str) {
    return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _escapeHtml(str) {
    return _escAttr(str);
  }

  /* ─────────────────────────────────────────────────────────────
     WINDOW RESIZE — re-render canvas on resize
     ───────────────────────────────────────────────────────────── */
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => renderCanvas(), 100);
  });

  // Ctrl/Cmd + mouse wheel is a quick zoom shortcut while working on details.
  $('canvas-area').addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setCanvasZoom(state.canvasZoom + (e.deltaY < 0 ? 0.1 : -0.1));
      return;
    }
    if (state.canvasZoom > 1) {
      e.preventDefault();
      state.canvasPanX -= e.shiftKey ? e.deltaY : e.deltaX;
      state.canvasPanY -= e.shiftKey ? 0 : e.deltaY;
      _applyCanvasView();
    }
  }, { passive: false });

  /* ─────────────────────────────────────────────────────────────
     INIT
     ───────────────────────────────────────────────────────────── */
  lucide.createIcons();
  renderAll();

})();
