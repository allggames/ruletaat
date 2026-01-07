(function () {
  // Lista de premios
  // 1. Lista de Textos (Círculo exterior)
  const prizes = [
    "PREMIO A ELECCIÓN",
    "3000 FICHAS",
    "PREMIO SORPRESA",
    "100% BONO DOBLE",
    "200% BONO DOBLE",
    "OTRO INTENTO",
    "150% BONO DOBLE",
    "1500 FICHAS"
  ];

  // 2. Lista de Emojis (Círculo interior - "Abajo")
  // El primero lo dejé vacío porque no pusiste uno en tu lista, 
  // pero puedes poner "⭐" o lo que gustes entre las comillas.
  const emojis = [
    "🌟", // Para PREMIO A ELECCIÓN
    "🔱", // Para 3000 FICHAS
    "🎁", // Para PREMIO SORPRESA
    "⚡", // Para 100% BONO DOBLE
    "🔥", // Para 200% BONO DOBLE
    "👀", // Para OTRO INTENTO
    "✨", // Para 150% BONO DOBLE
    "💰", // Para 1500 FICHAS
   ];

  // Palette: tonos de naranja distintos (cada segmento)
  const orangeTones = [
    '#ff8a3d', '#ff7a15', '#ff9f4a', '#ff6a00',
    '#ffb069', '#ff942a', '#ff7f3c', '#ffab66'
  ];

  const LOCK_KEY = 'ruleta_locked_date_v1';
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function lockForToday() { try { localStorage.setItem(LOCK_KEY, todayKey()); } catch (e) { } }
  function isLockedToday() { try { return localStorage.getItem(LOCK_KEY) === todayKey(); } catch (e) { return false } }
  window.__ruleta_clearLock = () => { try { localStorage.removeItem(LOCK_KEY); console.info('Ruleta lock cleared'); } catch (e) { } };

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
      const tryAgainBtn = document.getElementById('try-again-btn');
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

      // small utility: shade color (hex) by percent (-100..100)
      function shade(hex, percent) {
        const f = hex.slice(1);
        const t = percent < 0 ? 0 : 255;
        const p = Math.abs(percent) / 100;
        const R = parseInt(f.substring(0, 2), 16),
          G = parseInt(f.substring(2, 4), 16),
          B = parseInt(f.substring(4, 6), 16);
        const newR = Math.round((t - R) * p) + R;
        const newG = Math.round((t - G) * p) + G;
        const newB = Math.round((t - B) * p) + B;
        return `rgb(${newR},${newG},${newB})`;
      }

      // Draw light decoration
      function drawLight(x, y, r) {
        const radial = ctx.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r);
        radial.addColorStop(0, 'rgba(255,255,255,0.95)');
        radial.addColorStop(0.2, 'rgba(255,245,200,0.98)');
        radial.addColorStop(1, 'rgba(240,170,40,0.9)');
        ctx.beginPath();
        ctx.fillStyle = radial;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.arc(x - r / 3, y - r / 3, r / 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw center knob
      function drawCenterKnob(x, y, r) {
        const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        g.addColorStop(0, '#ffd86b');
        g.addColorStop(0.5, '#f6bf3a');
        g.addColorStop(1, '#d99b2a');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = '#fff6d8';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - r * 0.28, y - r * 0.36, r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fill();
        drawStar(x, y, Math.max(6, Math.floor(r * 0.36)), Math.max(3, Math.floor(r * 0.14)), '#ffb84d');
      }

      function drawStar(cxS, cyS, outerR, innerR, color) {
        const spikes = 5;
        let rot = Math.PI / 2 * 3;
        ctx.beginPath();
        ctx.moveTo(cxS, cyS - outerR);
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(cxS + Math.cos(rot) * outerR, cyS + Math.sin(rot) * outerR);
          rot += Math.PI / spikes;
          ctx.lineTo(cxS + Math.cos(rot) * innerR, cyS + Math.sin(rot) * innerR);
          rot += Math.PI / spikes;
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.stroke();
      }

      // wrap helper (single, robust)
      function wrapByMeasure(text, maxWidth, ctxRef) {
        if (!text) return [''];
        const words = String(text).split(' ');
        const lines = [];
        let cur = '';
        for (const w of words) {
          const test = cur ? (cur + ' ' + w) : w;
          if (ctxRef.measureText(test).width <= maxWidth) {
            cur = test;
          } else {
            if (cur) lines.push(cur);
            // if the single word is too wide, break by characters
            if (ctxRef.measureText(w).width > maxWidth) {
              let part = '';
              for (const ch of w) {
                if (ctxRef.measureText(part + ch).width <= maxWidth) part += ch;
                else { if (part) lines.push(part); part = ch; }
              }
              if (part) cur = part; else cur = '';
            } else {
              cur = w;
            }
          }
        }
        if (cur) lines.push(cur);
        return lines;
      }

  function drawSegmentTextCurved(text, startAngle, endAngle, radius, fixedFontSize = null) {
        if (!text) return;
        ctx.save();

        ctx.fillStyle = '#3a1f00'; // Color del texto
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        // --- CÁLCULO DE TAMAÑO DE FUENTE ---
        let fontSize;
        if (fixedFontSize) {
            // Si le pasamos un tamaño fijo (para los emojis), usamos ese
            fontSize = fixedFontSize;
        } else {
            // Si no, calculamos dinámicamente (para el texto largo)
            const angleSpan = endAngle - startAngle;
            const arcLength = radius * angleSpan;
            fontSize = Math.floor((arcLength * 0.8) / text.length * 1.4);
            fontSize = Math.min(fontSize, 22); // Maximo para texto
            fontSize = Math.max(fontSize, 12); // Minimo para texto
        }

        ctx.font = `700 ${fontSize}px 'Lexend', sans-serif`;

        // --- CÁLCULOS DE POSICIÓN ---
        const totalTextWidth = ctx.measureText(text).width;
        const totalTextAngle = totalTextWidth / radius;
        let currentAngle = (startAngle + (endAngle - startAngle) / 2) - (totalTextAngle / 2);

        // --- DIBUJO LETRA POR LETRA ---
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const charWidth = ctx.measureText(char).width;
            
            // Ajuste fino: para emojis, a veces el charWidth engaña al navegador.
            // Si es un emoji (fixedFontSize activo), centramos mejor.
            const charCenterAngle = currentAngle + (charWidth / radius) / 2;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(charCenterAngle);
            ctx.translate(radius, 0);
            ctx.rotate(Math.PI / 2); // Rotar para que la base apunte al centro
            ctx.fillText(char, 0, 0);
            ctx.restore();

            currentAngle += charWidth / radius;
        }

        ctx.restore();
      }

// Función exclusiva para dibujar el emoji centrado y sin romperlo
      function drawEmojiCentered(emoji, startAngle, endAngle, radius, size) {
        if (!emoji) return;
        ctx.save();

        // Usamos fuentes específicas de emoji para que se vea a color en Windows/Mac/Móvil
        ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 1. Calcular el ángulo exacto del centro del gajo
        const angleSpan = endAngle - startAngle;
        const midAngle = startAngle + angleSpan / 2;

        // 2. Movernos al sitio
        ctx.translate(cx, cy);      // Ir al centro de la ruleta
        ctx.rotate(midAngle);       // Girar hacia el gajo
        ctx.translate(radius, 0);   // Avanzar hacia afuera hasta el radio deseado
        ctx.rotate(Math.PI / 2);    // Girar 90° para que el emoji "mire" al centro

        // 3. Dibujar el emoji completo de una vez
        ctx.fillText(emoji, 0, 0);

        ctx.restore();
      }
      
      // ---- Wheel drawing (keeps previous look) ----
      function drawWheel() {
        updateSizes();
        ctx.clearRect(0, 0, size, size);

        const len = prizes.length;
        const segmentAngle = (2 * Math.PI) / len;

        // Rim (gold ring)
        const rimOuter = radius + 12;
        const rimInner = radius + 4;
        const g = ctx.createLinearGradient(0, cy - rimOuter, 0, cy + rimOuter);
        g.addColorStop(0, '#ffd86b');
        g.addColorStop(0.5, '#f6bf3a');
        g.addColorStop(1, '#d99b2a');
        ctx.beginPath();
        ctx.arc(cx, cy, rimOuter, 0, Math.PI * 2);
        ctx.arc(cx, cy, rimInner, Math.PI * 2, 0, true);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();

        // subtle bevel
        ctx.beginPath();
        ctx.arc(cx, cy, rimInner - 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.04;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Segments
        const segOuter = radius;
        const segInner = radius * 0.20; // dejar espacio central para el knob (mejor legibilidad)
        for (let i = 0; i < len; i++) {
          const start = -Math.PI / 2 + i * segmentAngle;
          const end = start + segmentAngle;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, segOuter, start, end);
          ctx.closePath();

          const fillColor = orangeTones[i % orangeTones.length] || '#ff8a3d';
          const segG = ctx.createLinearGradient(
            cx + Math.cos(start + segmentAngle / 2) * segOuter,
            cy + Math.sin(start + segmentAngle / 2) * segOuter,
            cx - Math.cos(start + segmentAngle / 2) * segOuter,
            cy - Math.sin(start + segmentAngle / 2) * segOuter
          );
          segG.addColorStop(0, shade(fillColor, -8));
          segG.addColorStop(1, shade(fillColor, 6));
          ctx.fillStyle = segG;
          ctx.fill();

          // thin separators
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, segOuter, start, start + 0.004);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 2;
          ctx.stroke();

          /// ... código anterior (separadores, stroke, etc) ...

          // 1. DIBUJAR EL TEXTO (ARRIBA)
          // Radio: Un poco menos que el borde (ej. -25px)
          const textRadius = segOuter - 25;
          drawSegmentTextCurved(prizes[i], start, end, textRadius);

          // 2. DIBUJAR EL EMOJI (ABAJO)
          // Radio: Más adentro (ej. -55px).
          // Tamaño: Le pasamos '32' como último parámetro para que el emoji sea grande.
        const emojiRadius = segOuter - 55; 
          // Le pasamos '40' como tamaño para que se vea grande y bonito
          drawEmojiCentered(emojis[i], start, end, emojiRadius, 30);
        }

        // Lights around rim
        const lights = 12;
        for (let i = 0; i < lights; i++) {
          const ang = -Math.PI / 2 + (i / lights) * (Math.PI * 2);
          const lx = cx + Math.cos(ang) * (rimOuter - 6);
          const ly = cy + Math.sin(ang) * (rimOuter - 6);
          drawLight(lx, ly, 6);
        }

        // Center knob
        drawCenterKnob(cx, cy, segInner * 2.2);

        // inner shadow
        ctx.beginPath();
        ctx.arc(cx, cy, segOuter, 0, Math.PI * 2);
        const innerShadow = ctx.createRadialGradient(cx, cy, segOuter * 0.6, cx, cy, segOuter);
        innerShadow.addColorStop(0, 'rgba(0,0,0,0)');
        innerShadow.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = innerShadow;
        ctx.fill();
      }

      // compute index from rotation
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

      // Confetti
      function launchConfettiAt(x, y, opts = {}) {
        const count = opts.count || 80;
        const duration = opts.duration || 2200;
        const c = document.createElement('canvas');
        c.className = 'confetti-canvas';
        c.width = window.innerWidth;
        c.height = window.innerHeight;
        document.body.appendChild(c);
        const C = c.getContext('2d');
        const colors = ['#ff4757', '#ff6b81', '#ffd166', '#06d6a0', '#118ab2', '#845EC2'];
        const particles = [];
        for (let i = 0; i < count; i++) {
          particles.push({
            x: x + (Math.random() - 0.5) * 80,
            y: y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 8,
            vy: - (2 + Math.random() * 6),
            size: 6 + Math.random() * 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            rot: Math.random() * 360,
            vrot: (Math.random() - 0.5) * 20,
            life: 0,
            ttl: 60 + Math.random() * 60
          });
        }
        let rafId;
        function update() {
          C.clearRect(0, 0, c.width, c.height);
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
            C.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
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
        setTimeout(() => { if (c.parentNode) c.remove(); }, duration + 300);
      }

      // Sound
      function playWinSound() {
        try {
          const ctxA = new (window.AudioContext || window.webkitAudioContext)();
          const now = ctxA.currentTime;
          const o1 = ctxA.createOscillator();
          const o2 = ctxA.createOscillator();
          const g = ctxA.createGain();
          o1.type = 'sine'; o2.type = 'triangle';
          o1.frequency.value = 880; o2.frequency.value = 660;
          g.gain.value = 0.0001;
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
          o1.connect(g); o2.connect(g); g.connect(ctxA.destination);
          o1.start(now); o2.start(now + 0.01);
          o1.stop(now + 1.05); o2.stop(now + 1.05);
        } catch (e) {
          console.warn('Audio no disponible', e);
        }
      }

      // Spin logic
      let isSpinning = false;
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

        if (rotor) {
          rotor.style.transition = '';
          rotor.style.transform = `rotate(${finalNorm360}deg)`;
        }

        const winnerIndex = computeIndexFromRotation(finalNorm360);
        const prize = prizes[winnerIndex];

        if (pointer) {
          pointer.classList.remove('bounce');
          void pointer.offsetWidth;
          pointer.classList.add('bounce');
        }

        const wheelRect = (rotor || canvas).getBoundingClientRect();
        const confettiX = Math.round(wheelRect.left + wheelRect.width / 2);
        const confettiY = Math.round(wheelRect.top + 20);
        setTimeout(() => {
          launchConfettiAt(confettiX, confettiY, { count: 100, duration: 2300 });
          playWinSound();
        }, 180);

// ... (código anterior donde calculas el winnerIndex y el premio) ...

        const prizeNormalized = String(prize || '').trim().toLowerCase();
        const allowTryAgain = prizeNormalized.startsWith('otro intento');

        // LÓGICA DE BLOQUEO (Solo bloqueamos si NO es otro intento)
        if (!allowTryAgain) {
          lockForToday();
          if (spinBtn) spinBtn.disabled = true;
        } else {
          if (spinBtn) spinBtn.disabled = false;
        }

        // --- AQUÍ EMPIEZA EL CAMBIO DE LOS BOTONES ---

        // 1. Configurar Título y Texto del premio
        if (prizeTitle) {
          prizeTitle.textContent = allowTryAgain ? '¡Sigue intentando!' : '¡Felicidades!';
        }
        if (prizeText) {
          // Si es otro intento, no mostramos texto abajo, si es premio, mostramos cuál es
          prizeText.textContent = allowTryAgain ? '¡Tienes otra oportunidad!' : prize;
        }

        // 2. Controlar la visibilidad de los botones
        if (allowTryAgain) {
          // --- CASO: SALIÓ "OTRO INTENTO" ---
          
          // Mostrar botón de "Otra vuelta"
          if (tryAgainBtn) {
            tryAgainBtn.style.display = 'inline-block'; 
            tryAgainBtn.disabled = false;
            tryAgainBtn.textContent = 'Otra vuelta';
            tryAgainBtn.onclick = function () {
              if (modal) modal.classList.add('hidden');
              setTimeout(() => { spin(); }, 120);
            };
          }

          // Ocultar botón de "Aceptar/Cerrar" (para obligar a girar de nuevo)
          if (closeModal) {
            closeModal.style.display = 'none'; 
          }

        } else {
          // --- CASO: SALIÓ UN PREMIO (DINERO, BONO, ETC) ---

          // Ocultar botón de "Otra vuelta" (ya no sirve)
          if (tryAgainBtn) {
            tryAgainBtn.style.display = 'none';
          }

          // Mostrar botón de "ACEPTAR"
          if (closeModal) {
            closeModal.style.display = 'inline-block';
            closeModal.textContent = 'ACEPTAR'; // <--- Aquí cambiamos el texto
          }
        }

        // Mostrar el modal
        if (modal) modal.classList.remove('hidden');
        isSpinning = false;

      // UI listeners
      if (spinBtn) spinBtn.addEventListener('click', spin);
      if (tryAgainBtn && !tryAgainBtn.onclick) {
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

      window.addEventListener('resize', () => {
        try { updateSizes(); drawWheel(); } catch (e) { console.error(e); }
      });

      // Wait for font to be ready, then draw
      function safeDraw() {
        try { drawWheel(); console.info('Wheel inicializada correctamente.'); } catch (e) { console.error('Error en drawWheel', e); }
      }

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => safeDraw()).catch(() => setTimeout(safeDraw, 60));
        setTimeout(() => safeDraw(), 500);
      } else {
        setTimeout(() => safeDraw(), 40);
      }

      if (spinBtn) spinBtn.disabled = isLockedToday();

    } catch (err) {
      console.error('Error inicializando ruleta:', err);
    }
  });
})();
