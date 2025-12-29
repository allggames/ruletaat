// Lista de premios (edítala como quieras)
const prizes = [
  "PREMIO A ELECCIÓN",
  "3000 FICHAS",
  "PREMIO SORPRESA",
  "100% DE BONUS DOBLE",
  "200% DE BONUS DOBLE",,
  "150% BONUS DOBLE",
  "1500 FICHAS"
  "OTRO INTENTO" // texto que se reconocerá para permitir reintentar
];

const LOCK_KEY = 'ruleta_locked_date_v1';

const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const rotor = document.getElementById('wheel-rotor');
const spinBtn = document.getElementById('spin-btn');
const modal = document.getElementById('prize-modal');
const prizeText = document.getElementById('prize-text');
const closeModal = document.getElementById('close-modal');
const tryAgainBtn = document.getElementById('try-again-btn');
const pointer = document.querySelector('.pointer');

const size = Math.min(canvas.width, canvas.height);
const cx = size / 2;
const cy = size / 2;
const radius = size / 2 - 10;
let isSpinning = false;
let lastWinnerIndex = null;

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
function lockForToday() {
  localStorage.setItem(LOCK_KEY, todayKey());
}
function isLockedToday() {
  return localStorage.getItem(LOCK_KEY) === todayKey();
}
// helper de debug: limpiar bloqueo desde consola
window.__ruleta_clearLock = () => { localStorage.removeItem(LOCK_KEY); console.info('Ruleta lock cleared'); };

// Dibuja la ruleta en canvas
function drawWheel(){
  const len = prizes.length;
  const angle = (2 * Math.PI) / len;
  ctx.clearRect(0,0,size,size);
  ctx.save();

  // Para que el primer segmento comience en el "arriba" (puntero), aplicamos -90deg
  const offset = -Math.PI / 2;

  for(let i=0;i<len;i++){
    const start = offset + i * angle;
    const end = start + angle;

    // color HSL para cada segmento
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = `hsl(${(i * 360 / len)}, 70%, 60%)`;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Texto del segmento (rotado para quedar legible)
    ctx.save();
    ctx.translate(cx, cy);
    const textAngle = start + angle / 2;
    ctx.rotate(textAngle);
    ctx.fillStyle = '#021226';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(prizes[i], radius - 12, 6);
    ctx.restore();
  }

  // Centro decorativo
  ctx.beginPath();
  ctx.arc(cx, cy, 36, 0, Math.PI*2);
  ctx.fillStyle = '#021226';
  ctx.fill();
  ctx.restore();
}

// Calcula índice del segmento apuntado por el puntero dada la rotación final (grados)
function computeIndexFromRotation(finalNormalizedDeg) {
  const len = prizes.length;
  const segmentDeg = 360 / len;
  let bestIdx = 0;
  let bestDist = 1e9;
  for (let i = 0; i < len; i++) {
    const center = (i * segmentDeg + segmentDeg / 2 + finalNormalizedDeg) % 360;
    const dist = Math.min(Math.abs(center - 0), 360 - Math.abs(center - 0));
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// ---- Confetti simple con canvas ----
function launchConfettiAt(x, y, opts = {}) {
  const count = opts.count || 80;
  const duration = opts.duration || 2200;

  const c = document.createElement('canvas');
  c.className = 'confetti-canvas';
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  document.body.appendChild(c);
  const C = c.getContext('2d');

  const colors = ['#ff4757','#ff6b81','#ffd166','#06d6a0','#118ab2','#845EC2'];
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random()-0.5)*80,
      y: y + (Math.random()-0.5)*40,
      vx: (Math.random()-0.5) * 8,
      vy: - (2 + Math.random()*6),
      size: 6 + Math.random()*8,
      color: colors[Math.floor(Math.random()*colors.length)],
      rot: Math.random()*360,
      vrot: (Math.random()-0.5)*20,
      life: 0,
      ttl: 60 + Math.random()*60
    });
  }

  let rafId;
  function update() {
    C.clearRect(0,0,c.width,c.height);
    for (let p of particles) {
      p.vy += 0.25; // gravedad
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      p.life++;
      C.save();
      C.translate(p.x, p.y);
      C.rotate(p.rot * Math.PI / 180);
      C.fillStyle = p.color;
      C.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      C.restore();
    }
    if (particles.every(p => p.life > p.ttl)) {
      cancelAnimationFrame(rafId);
      c.remove();
      return;
    }
    rafId = requestAnimationFrame(update);
  }

  update();
  setTimeout(()=> { if (c.parentNode) c.remove(); }, duration + 300);
}

// ---- Sonido breve con WebAudio ----
function playWinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = 'sine';
    o2.type = 'triangle';
    o1.frequency.value = 880;
    o2.frequency.value = 660;

    g.gain.value = 0.0001;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);

    o1.start(now);
    o2.start(now + 0.01);
    o1.stop(now + 1.05);
    o2.stop(now + 1.05);
  } catch (e) {
    console.warn('No se pudo reproducir sonido.', e);
  }
}

// Función para girar
function spin(){
  if (isSpinning) return;
  if (isLockedToday()) {
    // Seguridad: si está bloqueado no permitir
    alert('Ya usaste tu intento por hoy. Vuelve mañana.');
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;

  const extraRotations = 5 + Math.floor(Math.random() * 3); // 5 a 7 vueltas
  const randomExtraDeg = Math.random() * 360;
  const stopAt = 360 * extraRotations + randomExtraDeg;

  rotor.style.transition = 'transform 5s cubic-bezier(.14,.99,.38,1)';
  rotor.style.transform = `rotate(${stopAt}deg)`;

  const onEnd = () => {
    const finalNormalized = stopAt % 360;
    const finalNorm360 = (finalNormalized + 360) % 360;

    const winnerIndex = computeIndexFromRotation(finalNorm360);
    lastWinnerIndex = winnerIndex;

    rotor.style.transition = '';
    rotor.style.transform = `rotate(${finalNorm360}deg)`;

    // Determinar si el premio obtenido permite "otro intento"
    const prizeNormalized = String(prizes[winnerIndex] || '').trim().toLowerCase();
    const allowTryAgain = prizeNormalized.startsWith('otro intento');

    // Rebote del puntero
    pointer.classList.remove('bounce');
    void pointer.offsetWidth;
    pointer.classList.add('bounce');

    // Lanzar confetti / sonido
    const wheelRect = rotor.getBoundingClientRect();
    const confettiX = Math.round(wheelRect.left + wheelRect.width / 2);
    const confettiY = Math.round(wheelRect.top + 20);

    setTimeout(()=> {
      launchConfettiAt(confettiX, confettiY, { count: 100, duration: 2300 });
      playWinSound();
    }, 180);

    // Configurar modal y botones según si se permite reintentar
    tryAgainBtn.disabled = !allowTryAgain;
    if (!allowTryAgain) {
      tryAgainBtn.title = 'No disponible para este premio';
      // Bloquear el resto del día
      lockForToday();
      spinBtn.disabled = true;
    } else {
      tryAgainBtn.title = 'Cierra el modal y podrás girar otra vez';
      // permitir girar inmediatamente
      spinBtn.disabled = false;
    }

    // Mostrar modal con premio
    setTimeout(()=> {
      prizeText.textContent = prizes[winnerIndex];
      modal.classList.remove('hidden');
      isSpinning = false;
    }, 300);

    rotor.removeEventListener('transitionend', onEnd);
  };

  rotor.addEventListener('transitionend', onEnd);
}

// Handler para "Otro intento" en modal
tryAgainBtn.addEventListener('click', () => {
  if (tryAgainBtn.disabled) return;

  modal.classList.add('hidden');
  // Habilitar y enfocar botón Girar para que el usuario pueda girar otra vez
  spinBtn.disabled = false;
  spinBtn.focus();
});

// Cierre modal (botón Cerrar)
closeModal.addEventListener('click', ()=> {
  modal.classList.add('hidden');
  // Si el premio NO era "Otro intento" mantenemos el bloqueo (ya se asignó)
});

// Inicialización
drawWheel();
// Si ya hubo un bloqueo hoy, deshabilitamos el botón al cargar la página
if (isLockedToday()) {
  spinBtn.disabled = true;
} else {
  spinBtn.disabled = false;
}
spinBtn.addEventListener('click', spin);
