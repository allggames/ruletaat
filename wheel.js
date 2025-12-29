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

  // Palette: tonos de naranja distintos (cada segmento)
  const orangeTones = [
    '#ff8a3d', // 1
    '#ff7a15',
    '#ff9f4a',
    '#ff6a00',
    '#ffb069',
    '#ff942a',
    '#ff7f3c',
    '#ffab66'
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
      let radius = size / 2 - 8;

      function updateSizes() {
        const rect = canvas.getBoundingClientRect();
        cssSize = rect.width || cssSize;
        adaptCanvasForDPR();
        size = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
        cx = size / 2;
        cy = size / 2;
        radius = size / 2 - 8;
      }

      // --------------------
      // Improved text drawing per-sector:
      // - measureText wrapping
      // - auto-shrink font if necessary
      // - rotate text so it stays upright
      // --------------------
      function drawSegmentText(text, midAngle, segOuter) {
        ctx.save();
        ctx.translate(cx, cy);

        // Normalize angle in degrees 0..360
        let angleDeg = (midAngle * 180 / Math.PI + 360) % 360;

        // Decide whether to flip text so it's always readable
        let drawAngle = midAngle;
        if (angleDeg > 90 && angleDeg < 270) {
          drawAngle += Math.PI;
        }
        ctx.rotate(drawAngle);

        // maximum width for text (pixels) - leave margins
        const maxWidth = segOuter * 0.7;

        // start with font size proportional to radius
        let fontSize = Math.max(12, Math.floor(radius / 8));
        ctx.font = `700 ${fontSize}px 'Lexend', sans-serif`;
        ctx.fillStyle = '#3a1f00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // wrap using measureText
        let lines = wrapByMeasure(text, maxWidth, ctx);

        // if too tall, reduce font size
        const maxTextHeight = segOuter * 0.48; // available vertical space
        while ((lines.length * (fontSize + 2)) > maxTextHeight && fontSize > 9) {
          fontSize--;
          ctx.font = `700 ${fontSize}px 'Lexend', sans-serif`;
          lines = wrapByMeasure(text, maxWidth, ctx);
        }

        const lineHeight = fontSize + 2;
        const dist = segOuter * 0.56; // distance from center where text is drawn

        for (let i = 0; i < lines.length; i++) {
          const offsetY = (i - (lines.length - 1) / 2) * lineHeight;
          ctx.fillText(lines[i], dist, offsetY);
        }

        ctx.restore();
      }

      function wrapByMeasure(text, maxWidth, ctxRef) {
        if (!text) return [''];
        const words = text.split(' ');
        const lines = [];
        let cur = '';
        for (const w of words) {
          const test = cur ? (cur + ' ' + w) : w;
          if (ctxRef.measureText(test).width <= maxWidth) {
            cur = test;
          } else {
            if (cur) lines.push(cur);
            // if single word too long, break by characters
            if (ctxRef.measureText(w).width > maxWidth) {
              const parts = breakWordByMeasure(w, maxWidth, ctxRef);
              // all but last become full lines
              for (let i = 0; i < parts.length - 1; i++) lines.push(parts[i]);
              cur = parts[parts.length - 1];
            } else {
              cur = w;
            }
          }
        }
        if (cur) lines.push(cur);
        return lines;
      }

      function breakWordByMeasure(word, maxWidth, ctxRef) {
        const parts = [];
        let cur = '';
        for (const ch of word) {
          const test = cur + ch;
          if (ctxRef.measureText(test).width <= maxWidth) {
            cur = test;
          } else {
            if (cur) parts.push(cur);
            cur = ch;
          }
        }
        if (cur) parts.push(cur);
        return parts;
      }

      // helper: draw a glossy "light" circle
      function drawLight(x, y, r) {
        const radial = ctx.createRadialGradient(x - r/3, y - r/3, 1, x, y, r);
        radial.addColorStop(0, 'rgba(255,255,255,0.95)');
        radial.addColorStop(0.2, 'rgba(255,245,200,0.98)');
        radial.addColorStop(1, 'rgba(240,170,40,0.9)');
        ctx.beginPath();
        ctx.fillStyle = radial;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        // small highlight
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.arc(x - r/3, y - r/3, r/2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // draw center knob with a star
      function drawCenterKnob(x, y, r) {
        // outer ring
        const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        g.addColorStop(0, '#ffd86b');
        g.addColorStop(0.5, '#f6bf3a');
        g.addColorStop(1, '#d99b2a');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        // inner face
        ctx.beginPath();
        ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = '#fff6d8';
        ctx.fill();
        // small highlight
        ctx.beginPath();
        ctx.arc(x - r * 0.28, y - r * 0.36, r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fill();

        // star in center
        drawStar(x, y, Math.max(6, Math.floor(r * 0.36)), Math.max(3, Math.floor(r * 0.14)), '#ffb84d');
      }

      // draw a star (centered)
      function drawStar(cxS, cyS, outerR, innerR, color) {
        const spikes = 5;
        let rot = Math.PI / 2 * 3;
        let x = cxS;
        let y = cyS;
        ctx.beginPath();
        ctx.moveTo(cxS, cyS - outerR);
        for (let i = 0; i < spikes; i++) {
          x = cxS + Math.cos(rot) * outerR;
          y = cyS + Math.sin(rot) * outerR;
          ctx.lineTo(x, y);
          rot += Math.PI / spikes;
          x = cxS + Math.cos(rot) * innerR;
          y = cyS + Math.sin(rot) * innerR;
          ctx.lineTo(x, y);
          rot += Math.PI / spikes;
        }
        ctx.lineTo(cxS, cyS - outerR);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.stroke();
      }

      // small utility: shade color (hex) by percent (-100..100)
      function shade(hex, percent) {
        const f = hex.slice(1);
        const t = percent < 0 ? 0 : 255;
        const p = Math.abs(percent) / 100;
        const R = parseInt(f.substring(0,2),16),
              G = parseInt(f.substring(2,4),16),
              B = parseInt(f.substring(4,6),16);
        const newR = Math.round((t - R) * p) + R;
        const newG = Math.round((t - G) * p) + G;
        const newB = Math.round((t - B) * p) + B;
        return `rgb(${newR},${newG},${newB})`;
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
          // si es OTRO INTENTO no mostramos texto (vacío)
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
        // In case default handler
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

      // Wait for font to load (so measureText is accurate), then draw
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => drawWheel()).catch(() => drawWheel());
      } else {
        drawWheel();
      }

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
