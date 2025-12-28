// Lista de premios (edítala como quieras)
const prizes = [
  "PREMIO A ELECCIÓN",
  "3000 FICHAS",
  "PREMIO SORPRESA",
  "100% DE BONUS DOBLE",
  "200% DE BONUS DOBLE",
  "OTRO INTENTO",
  "150% BONUS DOBLE",
  "1500 FICHAS"
];

const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const rotor = document.getElementById('wheel-rotor');
const spinBtn = document.getElementById('spin-btn');
const modal = document.getElementById('prize-modal');
const prizeText = document.getElementById('prize-text');
const closeModal = document.getElementById('close-modal');
const pointer = document.querySelector('.pointer');

const size = Math.min(canvas.width, canvas.height);
const cx = size / 2;
const cy = size / 2;
const radius = size / 2 - 10;
let isSpinning = false;

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

  // Crear canvas full-screen
  const c = document.createElement('canvas');
  c.className = 'confetti-canvas';
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  document.body.appendChild(c);
  const C = c.getContext('2d');

  // partículas
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
    // remover las que ya se pasaron
    if (particles.every(p => p.life > p.ttl)) {
      cancelAnimationFrame(rafId);
      c.remove();
      return;
    }
    rafId = requestAnimationFrame(update);
  }

  update();
  // remover tras duration por si acaso
  setTimeout(()=> { if (c.parentNode) c.remove(); }, duration + 300);
}

// ---- Sonido breve con WebAudio ----
function playWinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // Dos osciladores en intervalo mayor para sonar "festivo"
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = 'sine';
    o2.type = 'triangle';
    o1.frequency.value = 880; // A5
    o2.frequency.value = 660; // E5

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
    // Silenciosamente no hacer nada si WebAudio no está disponible
    console.warn('No se pudo reproducir sonido.', e);
  }
}

// Función para girar
function spin(){
  if(isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;

  const len = prizes.length;

  // Vueltas completas + offset aleatorio
  const extraRotations = 5 + Math.floor(Math.random() * 3); // 5 a 7 vueltas
  const randomExtraDeg = Math.random() * 360;
  const stopAt = 360 * extraRotations + randomExtraDeg;

  // Aplicar la rotación al rotor (no al marco)
  rotor.style.transition = 'transform 5s cubic-bezier(.14,.99,.38,1)';
  rotor.style.transform = `rotate(${stopAt}deg)`;

  // Cuando termina la transición, determinamos qué segmento quedó apuntado y mostramos modal
  const onEnd = () => {
    const finalNormalized = stopAt % 360;
    const finalNorm360 = (finalNormalized + 360) % 360;

    const winnerIndex = computeIndexFromRotation(finalNorm360);

    rotor.style.transition = '';
    rotor.style.transform = `rotate(${finalNorm360}deg)`;

    // Rebote del puntero
    pointer.classList.remove('bounce');
    // forzar reflow para reiniciar animación si necesario
    // eslint-disable-next-line no-unused-expressions
    void pointer.offsetWidth;
    pointer.classList.add('bounce');

    // Lanzar confetti desde el centro-superior de la rueda (cálculo en coordenadas de viewport)
    const wheelRect = rotor.getBoundingClientRect();
    const confettiX = Math.round(wheelRect.left + wheelRect.width / 2);
    const confettiY = Math.round(wheelRect.top + 20); // cerca de la punta

    // dar pequeño delay para encadenar efectos
    setTimeout(()=> {
      launchConfettiAt(confettiX, confettiY, { count: 100, duration: 2300 });
      playWinSound();
    }, 180);

    setTimeout(()=> {
      prizeText.textContent = prizes[winnerIndex];
      modal.classList.remove('hidden');
      isSpinning = false;
      spinBtn.disabled = false;
    }, 300); // espera a que el rebote/confetti empiecen

    rotor.removeEventListener('transitionend', onEnd);
  };

  rotor.addEventListener('transitionend', onEnd);
}

// Cierre modal
closeModal.addEventListener('click', ()=> {
  modal.classList.add('hidden');
});

// Inicialización
drawWheel();
spinBtn.addEventListener('click', spin);

// Si redimensionás la ventana podrías querer re-dibujar o reescalar el canvas.
// Para alta densidad de píxeles (retina) puedes ajustar el canvas width/height en JS.
// (Opcional) Ejemplo rápido:
(function adaptCanvasForDPR(){
  const dpr = window.devicePixelRatio || 1;
  const target = Math.min(500, Math.max(320, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.6)));
  canvas.width = target * dpr;
  canvas.height = target * dpr;
  canvas.style.width = target + 'px';
  canvas.style.height = target + 'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  drawWheel();
})();
