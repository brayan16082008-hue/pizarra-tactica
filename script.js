const canvas = document.getElementById('tacticalCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvasContainer');
const boardWrapper = document.getElementById('boardWrapper');
const tokensLayer = document.getElementById('tokensLayer');
const presetMap = document.getElementById('presetMap');
const mapLoader = document.getElementById('mapLoader');
const brushSize = document.getElementById('brushSize');
const sizeVal = document.getElementById('sizeVal');
const zoomVal = document.getElementById('zoomVal');

let currentTool = 'pen';
let currentColor = '#ff9f1c';
let currentSize = 4;
let isDrawing = false;
let startX = 0;
let startY = 0;
let snapshot = null;
let history = [];
let backgroundImage = null;

// Zoom y Desplazamiento
let scale = 0.75;
let panX = 0;
let panY = 0;
let isPanning = false;
let isSpacePressed = false;
let panStartX = 0;
let panStartY = 0;

const markers = {
  squad: '🎯',
  enemy: '💀',
  drop: '🪂',
  flag: '🚩'
};

function updateTransform() {
  boardWrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  zoomVal.textContent = Math.round(scale * 100);
}

function adjustInitialScale() {
  if (window.innerWidth <= 768) {
    scale = (window.innerWidth * 0.92) / canvas.width;
  } else {
    scale = 0.75;
  }
  panX = 0;
  panY = 0;
  updateTransform();
}

function drawDefaultGrid() {
  ctx.fillStyle = '#1e2229';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#2a303a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= canvas.width; i += 50) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
  }
  ctx.fillStyle = '#6c757d';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Elige un mapa del menú o sube una imagen para comenzar', canvas.width / 2, canvas.height / 2);
}

function loadMapFromSource(src) {
  const img = new Image();
  img.onload = () => {
    backgroundImage = img;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    history = [];
    saveState();
  };
  img.onerror = () => {
    alert(`No se encontró "${src}". Asegúrate de guardar la imagen con ese nombre dentro de la carpeta "mapas/".`);
    presetMap.value = "";
  };
  img.src = src;
}

drawDefaultGrid();
saveState();
adjustInitialScale();

presetMap.addEventListener('change', (e) => {
  if (e.target.value) loadMapFromSource(e.target.value);
});

mapLoader.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    presetMap.value = "";
    loadMapFromSource(event.target.result);
  };
  reader.readAsDataURL(file);
});

document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool;
  });
});

document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentColor = btn.dataset.color;
  });
});

brushSize.addEventListener('input', (e) => {
  currentSize = e.target.value;
  sizeVal.textContent = currentSize;
});

container.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = 0.1;
  scale = e.deltaY < 0 ? Math.min(scale + zoomFactor, 3.0) : Math.max(scale - zoomFactor, 0.35);
  updateTransform();
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
    isSpacePressed = true;
    canvas.style.cursor = 'grab';
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    isSpacePressed = false;
    isPanning = false;
    canvas.classList.remove('grabbing');
    canvas.style.cursor = 'crosshair';
  }
});

document.getElementById('resetViewBtn').addEventListener('click', adjustInitialScale);

function getMousePos(e) {
  const rect = boardWrapper.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / scale,
    y: (e.clientY - rect.top) / scale
  };
}

function drawArrow(fromX, fromY, toX, toY) {
  const headlen = 14 + Number(currentSize);
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = currentColor;
  ctx.fill();
}

canvas.addEventListener('mousedown', (e) => {
  if (isSpacePressed || e.button === 1) {
    e.preventDefault();
    isPanning = true;
    panStartX = e.clientX - panX;
    panStartY = e.clientY - panY;
    canvas.classList.add('grabbing');
    return;
  }

  if (e.button !== 0) return;
  const pos = getMousePos(e);
  startX = pos.x;
  startY = pos.y;

  if (currentTool === 'text') {
    const label = prompt('Escribe el nombre o call (ej. "Soporte", "Rotación N"):');
    if (label && label.trim() !== '') {
      const fontSize = 16 + Number(currentSize) * 1.5;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(label.trim(), startX, startY);
      ctx.fillStyle = currentColor;
      ctx.fillText(label.trim(), startX, startY);
      saveState();
    }
    return;
  }

  if (markers[currentTool]) {
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(markers[currentTool], startX, startY);
    saveState();
    return;
  }

  isDrawing = true;
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
});

window.addEventListener('mousemove', (e) => {
  if (isPanning) {
    panX = e.clientX - panStartX;
    panY = e.clientY - panStartY;
    updateTransform();
    return;
  }

  if (!isDrawing) return;
  const pos = getMousePos(e);

  ctx.strokeStyle = currentColor;
  ctx.lineWidth = currentSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (currentTool === 'pen') {
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  } else {
    ctx.putImageData(snapshot, 0, 0);
    if (currentTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'arrow') {
      drawArrow(startX, startY, pos.x, pos.y);
    } else if (currentTool === 'circle') {
      const radius = Math.hypot(pos.x - startX, pos.y - startY);
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
});

window.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false;
    canvas.classList.remove('grabbing');
  }
  if (isDrawing) {
    isDrawing = false;
    saveState();
  }
});

function saveState() {
  if (history.length > 25) history.shift();
  history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

document.getElementById('undoBtn').addEventListener('click', () => {
  if (history.length > 1) {
    history.pop();
    ctx.putImageData(history[history.length - 1], 0, 0);
  }
});

document.getElementById('clearBtn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    drawDefaultGrid();
  }
  tokensLayer.innerHTML = '';
  history = [];
  saveState();
});
// --- CATÁLOGO DE EQUIPOS LIGA LATAM ---
const latamTeams = [
  { name: 'LYON', tag: 'LYON', color: '#d97706', logo: 'logos/lyon.png' },
  { name: 'Blue Cheese', tag: 'BC', color: '#2563eb', logo: 'logos/bluecheese.png' },
  { name: 'GunDynasty', tag: 'GD', color: '#dc2626', logo: 'logos/gundynasty.png' },
  { name: 'HNS Esports', tag: 'HNS', color: '#7c3aed', logo: 'logos/hns.png' },
  { name: 'Leviatán', tag: 'LEV', color: '#0284c7', logo: 'logos/leviatan.png' },
  { name: 'Nova Legion', tag: 'NVL', color: '#e11d48', logo: 'logos/novalegion.png' },
  { name: 'Infinity', tag: 'INF', color: '#eab308', logo: 'logos/infinity.png' },
  { name: '9z Globant', tag: '9Z', color: '#6d28d9', logo: 'logos/9z.png' },
  { name: 'All Glory', tag: 'AGG', color: '#16a34a', logo: 'logos/allglory.png' },
  { name: 'CACM Sports', tag: 'CACM', color: '#4f46e5', logo: 'logos/cacm.png' },
  { name: 'Bloody Bros', tag: 'BB', color: '#991b1b', logo: 'logos/bloody.png' },
  { name: 'FD Quisqueya', tag: 'FDQ', color: '#0d9488', logo: 'logos/quisqueya.png' },
  { name: 'Estorm DRK', tag: 'EST', color: '#0891b2', logo: 'logos/estorm.png' },
  { name: 'LMG Esports', tag: 'LMG', color: '#ea580c', logo: 'logos/lmg.png' },
  { name: 'Movistar Koi', tag: 'FGO', color: '#b91c1c', logo: 'logos/koi.png' }
];

const latamGrid = document.getElementById('latamGrid');
const teamTagInput = document.getElementById('teamTag');
const teamColorInput = document.getElementById('teamColor');

function buildLatamSelector() {
  latamGrid.innerHTML = '';
  latamTeams.forEach(team => {
    const card = document.createElement('div');
    card.className = 'latam-card';
    card.title = `Colocar a ${team.name} en el mapa`;

    const img = document.createElement('img');
    img.src = team.logo;
    img.alt = team.name;
    img.onerror = () => {
      img.remove();
      const fallback = document.createElement('div');
      fallback.className = 'logo-fallback';
      fallback.style.backgroundColor = team.color;
      fallback.textContent = team.tag;
      card.insertBefore(fallback, card.firstChild);
    };

    const label = document.createElement('span');
    label.textContent = team.name;

    card.appendChild(img);
    card.appendChild(label);
    card.addEventListener('click', () => spawnTokenOnMap(team));
    latamGrid.appendChild(card);
  });
}

function spawnTokenOnMap(team) {
  const token = document.createElement('div');
  token.className = 'map-token';
  token.style.left = '500px';
  token.style.top = '500px';
  token.dataset.name = team.name;
  token.dataset.tag = team.tag;
  token.dataset.color = team.color;
  token.title = 'Arrastra para mover | Doble clic para quitar del mapa';

  const img = document.createElement('img');
  img.src = team.logo || '';
  img.alt = team.name;
  img.onerror = () => {
    img.remove();
    const fallback = document.createElement('div');
    fallback.className = 'token-fallback';
    fallback.style.backgroundColor = team.color;
    fallback.textContent = team.tag;
    token.insertBefore(fallback, token.firstChild);
  };

  const nameTag = document.createElement('div');
  nameTag.className = 'token-name';
  nameTag.textContent = team.name;

  token.appendChild(img);
  token.appendChild(nameTag);

  let dragging = false;

  const onDrag = (clientX, clientY) => {
    if (!dragging) return;
    const rect = boardWrapper.getBoundingClientRect();
    const x = Math.max(0, Math.min(1000, (clientX - rect.left) / scale));
    const y = Math.max(0, Math.min(1000, (clientY - rect.top) / scale));
    token.style.left = `${x}px`;
    token.style.top = `${y}px`;
  };

  token.addEventListener('mousedown', (e) => { e.stopPropagation(); dragging = true; });
  window.addEventListener('mousemove', (e) => onDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', () => { dragging = false; });

  token.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    dragging = true;
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (dragging && e.touches[0]) {
      onDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener('touchend', () => { dragging = false; });
  token.addEventListener('dblclick', () => token.remove());

  tokensLayer.appendChild(token);
}

buildLatamSelector();

document.getElementById('addTeamBtn').addEventListener('click', () => {
  const name = teamTagInput.value.trim().toUpperCase();
  if (!name) return;
  spawnTokenOnMap({
    name: name,
    tag: name.slice(0, 4),
    color: teamColorInput.value,
    logo: ''
  });
  teamTagInput.value = '';
});

// Exportar imagen incluyendo mapa, trazos, logos y nombres debajo
document.getElementById('saveBtn').addEventListener('click', () => {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const eCtx = exportCanvas.getContext('2d');
  eCtx.drawImage(canvas, 0, 0);

  document.querySelectorAll('.map-token').forEach(tok => {
    const x = parseFloat(tok.style.left);
    const y = parseFloat(tok.style.top);
    const imgEl = tok.querySelector('img');

    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      eCtx.drawImage(imgEl, x - 19, y - 24, 38, 38);
    } else {
      eCtx.fillStyle = tok.dataset.color || '#ff9f1c';
      eCtx.strokeStyle = '#ffffff';
      eCtx.lineWidth = 2;
      eCtx.beginPath();
      eCtx.arc(x, y - 6, 18, 0, Math.PI * 2);
      eCtx.fill();
      eCtx.stroke();

      eCtx.fillStyle = '#ffffff';
      eCtx.font = 'bold 11px sans-serif';
      eCtx.textAlign = 'center';
      eCtx.textBaseline = 'middle';
      eCtx.fillText(tok.dataset.tag, x, y - 6);
    }

    const label = tok.dataset.name;
    eCtx.font = 'bold 10px sans-serif';
    const textWidth = eCtx.measureText(label).width + 10;
    eCtx.fillStyle = 'rgba(18, 20, 23, 0.9)';
    eCtx.fillRect(x - textWidth / 2, y + 16, textWidth, 14);
    eCtx.fillStyle = '#ffffff';
    eCtx.textAlign = 'center';
    eCtx.textBaseline = 'middle';
    eCtx.fillText(label, x, y + 23);
  });

  const link = document.createElement('a');
  link.download = 'rotacion-ffws-latam.png';
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
});

// --- SOPORTE TÁCTIL EN CANVAS (CELULAR Y TABLET) ---
let isTouchPanning = false;

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (e.touches.length === 2) {
    isDrawing = false;
    isTouchPanning = true;
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    panStartX = midX - panX;
    panStartY = midY - panY;
    return;
  }

  const touch = e.touches[0];
  canvas.dispatchEvent(new MouseEvent('mousedown', {
    clientX: touch.clientX,
    clientY: touch.clientY,
    button: 0
  }));
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (e.touches.length === 2 && isTouchPanning) {
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    panX = midX - panStartX;
    panY = midY - panStartY;
    updateTransform();
    return;
  }

  const touch = e.touches[0];
  window.dispatchEvent(new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  }));
}, { passive: false });

canvas.addEventListener('touchend', () => {
  isTouchPanning = false;
  window.dispatchEvent(new MouseEvent('mouseup'));
});
