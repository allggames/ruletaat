(function () {
  // Lista de premios (tal como me diste)
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

  const LOCK_KEY = 'ruleta_locked_date_v1';

  function todayKey() { return new Date().toISOString().slice(0,10); }
  function lockForToday() { try { localStorage.setItem(LOCK_KEY, todayKey()); } catch(e){} }
  function isLockedToday() { try { return localStorage.getItem(LOCK_KEY) === todayKey(); } catch(e){ return false; } }
  window.__ruleta_clearLock = () => { try { localStorage.removeItem(LOCK_KEY); console.info('Ruleta lock cleared'); } catch(e){} };

  // Esperar DOM
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const canvas = document.getElementById('wheel-canvas');
      if (!canvas) { console.error('No se encontró canvas#wheel-canvas'); return; }
      const rotor = document.getElementById('wheel-rotor');
      const spinBtn = document.getElementById('spin-btn');
      const modal = document.getElementById('prize-modal');
      const prizeText = document.getElementById('prize-text');
      const prizeTitle = document.getElementById('prize-title') || (modal && modal.querySelector('h2'));
      const closeModal = document.getElementById('close-modal');
      const tryAgainBtn = document.getElementById('try-again-btn'); // opcional
      const pointer = document.querySelector('.pointer');

      if (!rotor) console.warn('No se encontró #wheel-rotor (rotor).');
      if (!spinBtn) console.warn('No se encontró #spin-btn (botón Girar).');
      if (!modal) console.warn('No se encontró #prize-modal (modal).');
      if (!prizeText) console.warn('No se encontró #prize-text (texto premio).');
      if (!pointer) console.warn('No se encontró .pointer (puntero).');

      const ctx = canvas.getContext('2d');
      if (!ctx) { console.error('No se pudo obtener contexto 2D del canvas'); return; }

      // Ajustar canvas para DPR y tamaño CSS
      function adaptCanvasForDPR() {
        const rect = canvas.getBoundingClientRect();
        const cssWidth = rect.width || 500;
        const cssHeight = rect.height || cssWidth;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.round(cssWidth * dpr));
        canvas.height = Math.max(1, Math.round(cssHeight * dpr));
        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { width: cssWidth, height: cssHeight, dpr };
      }

      let { width: cssSize } = adaptCanvasForDPR();
      let size = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
      let cx = size / 2;
      let cy = size / 2;
      let radius = size / 2 - 10;

      function updateSizes() {
        const rect = canvas.getBoundingClientRect();
        cssSize = rect.width || cssSize;
        adaptCanvasForDPR();
        size = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
        cx = size / 2;
        cy = size / 2;
        radius = size / 2 - 10;
      }

      // Dibuja la ruleta en canvas
      function drawWheel() {
        const len = prizes.length;
        const angle = (2 * Math.PI) / len;
        ctx.clearRect(0, 0, size, size);
        ctx.save();

        // Offset para que el segmento 0 esté apuntando arriba
        const offset = -Math.PI / 2;

        for (let i = 0; i < len; i++) {
          const start = offset + i * angle;
          const end = start + angle;

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, start, end);
          ctx.closePath();
          ctx.fillStyle = `hsl(${(i * 360 / len)}, 70%, 60%)`;
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Texto rotado
          ctx.save();
          ctx.translate(cx, cy);
          const textAngle = start + angle / 2;
          ctx.rotate(textAngle);
          ctx.fillStyle = '#021226';
          const fontSize = Math.max(12, Math.floor(radius / 8));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(prizes[i], radius - 12, 6);
          ctx.restore();
        }

        // Centro decorativo
        ctx.beginPath();
        ctx.arc(cx, cy, 36, 0, Math.PI * 2);
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

      // Confetti (simple)
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
            p.vy += 0.25;
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

      // Sonido breve
      function playWinSound() {
        try {
          const actx = new (window.AudioContext || window.webkitAudioContext)();
          const now = actx.currentTime;
          const o1 = actx.createOscillator();
          const o2 = actx.createOscillator();
          const g = actx.createGain();
          o1.type = 'sine'; o2.type = 'triangle';
          o1.frequency.value = 880; o2.frequency.value = 660;
          g.gain.value = 0.0001;
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
          o1.connect(g); o2.connect(g); g.connect(actx.destination);
          o1.start(now); o2.start(now + 0.01);
          o1.stop(now + 1.05); o2.stop(now + 1.05);
        } catch(e) { console.warn('Audio no disponible', e); }
      }

      // Estado
      let isSpinning = false;
      let lastStopDegrees = 0;

      // Gira la ruleta
      function spin() {
        if (isSpinning) return;
        if (isLockedToday()) {
          alert('Ya usaste tu intento por hoy. Vuelve mañana.');
          return;
        }
        isSpinning = true;
        if (spinBtn) spinBtn.disabled = true;

        const extraRotations = 5 + Math.floor(Math.random() * 3);
        const randomExtraDeg = Math.random() * 360;
        const stopAt = 360 * extraRotations + randomExtraDeg;

        if (rotor) {
          rotor.style.transition = 'transform 5s cubic-bezier(.14,.99,.38,1)';
          rotor.style.transform = `rotate(${stopAt}deg)`;
        } else {
          finalizeRotation(stopAt);
        }

        if (rotor) {
          const onEnd = () => {
            finalizeRotation(stopAt);
            rotor.removeEventListener('transitionend', onEnd);
          };
          rotor.addEventListener('transitionend', onEnd);
        }
      }

      function finalizeRotation(stopAt) {
        const finalNormalized = stopAt % 360;
        const finalNorm360 = (finalNormalized + 360) % 360;
        lastStopDegrees = finalNorm360;

        if (rotor) {
          rotor.style.transition = '';
          rotor.style.transform = `rotate(${finalNorm360}deg)`;
        }

        const winnerIndex = computeIndexFromRotation(finalNorm360);
        const prize = prizes[winnerIndex];

        // Rebote puntero
        if (pointer) {
          pointer.classList.remove('bounce');
          void pointer.offsetWidth;
          pointer.classList.add('bounce');
        }

        // Confetti y sonido
        const wheelRect = (rotor || canvas).getBoundingClientRect();
        const confettiX = Math.round(wheelRect.left + wheelRect.width / 2);
        const confettiY = Math.round(wheelRect.top + 20);
        setTimeout(()=> {
          launchConfettiAt(confettiX, confettiY, { count: 100, duration: 2300 });
          playWinSound();
        }, 180);

        // Determinar allowTryAgain (compara en minúsculas)
        const prizeNormalized = String(prize || '').trim().toLowerCase();
        const allowTryAgain = prizeNormalized.startsWith('otro intento');

        // Manejo de bloqueo por día
        if (!allowTryAgain) {
          lockForToday();
          if (spinBtn) spinBtn.disabled = true;
        } else {
          if (spinBtn) spinBtn.disabled = false;
        }

        // Actualizar modal contenido y botones según el tipo de premio
        if (prizeTitle) {
          prizeTitle.textContent = allowTryAgain ? 'Volvamos a intentar' : '¡Felicidades!';
        }
        if (prizeText) {
          // Aquí: si es OTRO INTENTO no mostramos la frase (dejamos vacío)
          prizeText.textContent = allowTryAgain ? '' : prize;
        }
        if (tryAgainBtn) {
          if (allowTryAgain) {
            tryAgainBtn.disabled = false;
            tryAgainBtn.textContent = 'Otra vuelta';
            tryAgainBtn.title = 'Haz otra vuelta ahora';
            // Sobrescribir comportamiento: cerrar modal y girar inmediatamente
            tryAgainBtn.onclick = function () {
              if (modal) modal.classList.add('hidden');
              // Pequeña demora para que el modal cierre visualmente
              setTimeout(() => { spin(); }, 120);
            };
          } else {
            tryAgainBtn.disabled = true;
            tryAgainBtn.textContent = 'Otro intento';
            tryAgainBtn.title = 'No disponible para este premio';
            tryAgainBtn.onclick = null;
          }
        }

        // Mostrar modal si existe
        if (modal) modal.classList.remove('hidden');

        isSpinning = false;
      }

      // Listeners seguros
      if (spinBtn) spinBtn.addEventListener('click', spin);
      if (tryAgainBtn && !tryAgainBtn.onclick) {
        // En caso no se sobrescriba, asegurar que cierra modal y habilita spin
        tryAgainBtn.addEventListener('click', () => {
          if (tryAgainBtn.disabled) return;
          if (modal) modal.classList.add('hidden');
          if (spinBtn) { spinBtn.disabled = false; spinBtn.focus(); }
        });
      }
      if (closeModal) {
        closeModal.addEventListener('click', () => {
          if (modal) modal.classList.add('hidden');
        });
      }

      // Redimensionar al cambiar ventana
      window.addEventListener('resize', () => {
        try { updateSizes(); drawWheel(); } catch(e) { console.error(e); }
      });

      // Inicialización final: adaptar tamaño y dibujar
      updateSizes();
      drawWheel();

      // Si ya hay bloqueo hoy, deshabilitar botón Girar en carga
      if (spinBtn) {
        spinBtn.disabled = isLockedToday();
      }

      console.info('Wheel inicializada correctamente.');
    } catch (err) {
      console.error('Error inicializando ruleta:', err);
    }
  });
})();
