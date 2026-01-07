(function () {
  // --- CONFIGURACIÓN DE PREMIOS ---
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

  const emojis = [
    "🌟", "🔱", "🎁", "⚡", "🔥", "👀", "✨", "💰"
  ];

  const orangeTones = [
    '#ff8a3d', '#ff7a15', '#ff9f4a', '#ff6a00',
    '#ffb069', '#ff942a', '#ff7f3c', '#ffab66'
  ];

  // --- VARIABLES GLOBALES ---
  let lightsOn = true;
  let isSpinning = false;
  
  // Variables de dimensiones
  let size = 0, cx = 0, cy = 0, radius = 0;

  // --- UTILIDADES ---
  const LOCK_KEY = 'ruleta_locked_date_v1';
  const PRIZE_KEY = 'ruleta_saved_prize_v1';
  const TIME_KEY = 'ruleta_saved_time_v1';

  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function lockForToday() { try { localStorage.setItem(LOCK_KEY, todayKey()); } catch (e) { } }
  function isLockedToday() { try { return localStorage.getItem(LOCK_KEY) === todayKey(); } catch (e) { return false } }
  
  function savePrizeDetails(prizeName, timeString) {
      try { localStorage.setItem(PRIZE_KEY, prizeName); localStorage.setItem(TIME_KEY, timeString); } catch (e) {}
  }
  function getSavedPrize() {
      try { return { name: localStorage.getItem(PRIZE_KEY), time: localStorage.getItem(TIME_KEY) }; } catch (e) { return null; }
  }
  
  function shade(hex, percent) {
    const f = hex.slice(1);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent) / 100;
    const R = parseInt(f.substring(0, 2), 16), G = parseInt(f.substring(2, 4), 16), B = parseInt(f.substring(4, 6), 16);
    return `rgb(${Math.round((t - R) * p) + R},${Math.round((t - G) * p) + G},${Math.round((t - B) * p) + B})`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('wheel-canvas');
    const rotor = document.getElementById('wheel-rotor');
    const spinBtn = document.getElementById('spin-btn');
    const modal = document.getElementById('prize-modal');
    const prizeText = document.getElementById('prize-text');
    const prizeTitle = document.getElementById('prize-title');
    const closeModal = document.getElementById('close-modal');
    const tryAgainBtn = document.getElementById('try-again-btn');
    const pointer = document.querySelector('.pointer');
    const dateEl = document.getElementById('prize-date');

    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // --- 1. FUNCIÓN DE TAMAÑO ---
    function updateDimensions() {
      if (isSpinning) return;
      const rect = canvas.getBoundingClientRect();
      const cssWidth = rect.width || 340; // Default a 340 si falla
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = cssWidth * dpr;
      canvas.height = cssWidth * dpr;
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssWidth + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      size = cssWidth;
      cx = size / 2;
      cy = size / 2;
      radius = (size / 2) - 10;
      drawWheel();
    }

    // --- 2. DIBUJO ---
    function drawLightOn(x, y, r) {
      const radial = ctx.createRadialGradient(x - r/3, y - r/3, 1, x, y, r);
      radial.addColorStop(0, '#fff'); radial.addColorStop(1, '#f0aa28');
      ctx.beginPath(); ctx.fillStyle = radial; ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    function drawLightOff(x, y, r) {
      ctx.beginPath(); ctx.fillStyle = '#7a2b00'; ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    function drawCenterKnob(x, y, r) {
      const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      g.addColorStop(0, '#ffd86b'); g.addColorStop(1, '#d99b2a');
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.fillStyle = '#fff6d8'; ctx.fill();
      // Estrella simple
      ctx.beginPath();
      const outerR = r * 0.4, innerR = r * 0.16;
      for (let i=0; i<5; i++) {
        const a = (Math.PI*2 * i)/5 - Math.PI/2;
        ctx.lineTo(x + Math.cos(a)*outerR, y + Math.sin(a)*outerR);
        ctx.lineTo(x + Math.cos(a + Math.PI/5)*innerR, y + Math.sin(a + Math.PI/5)*innerR);
      }
      ctx.closePath(); ctx.fillStyle = '#ffb84d'; ctx.fill();
    }

    // *** MAGIA: TEXTO QUE SE AUTO-AJUSTA ***
    function drawSegmentTextCurved(text, startAngle, endAngle, rad) {
        if (!text) return;
        ctx.save();
        ctx.fillStyle = '#3a1f00'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        
        // 1. Calculamos el espacio disponible (arco)
        const arcLength = rad * (endAngle - startAngle);
        
        // 2. Empezamos con un tamaño de fuente ideal (12% del radio)
        let fontSize = Math.floor(rad * 0.12); 
        ctx.font = `700 ${fontSize}px 'Lexend', sans-serif`;

        // 3. SI EL TEXTO ES MUY LARGO, ACHICAMOS LA FUENTE HASTA QUE QUEPA
        // "Mientras el texto mida más del 85% del hueco, achica la letra"
        while (ctx.measureText(text).width > arcLength * 0.85 && fontSize > 8) {
             fontSize--;
             ctx.font = `700 ${fontSize}px 'Lexend', sans-serif`;
        }

        const totalTextWidth = ctx.measureText(text).width;
        let currentAngle = (startAngle + (endAngle - startAngle) / 2) - (totalTextWidth / rad) / 2;

        for (let i = 0; i < text.length; i++) {
            const char = text[i]; const charWidth = ctx.measureText(char).width;
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(currentAngle + (charWidth / rad) / 2);
            ctx.translate(rad, 0); ctx.rotate(Math.PI / 2); ctx.fillText(char, 0, 0); ctx.restore();
            currentAngle += charWidth / rad;
        }
        ctx.restore();
    }

    function drawEmojiCentered(emoji, startAngle, endAngle, rad) {
        if (!emoji) return;
        // El tamaño del emoji ahora es dinámico: 15% del radio de la rueda
        const fontSize = Math.floor(radius * 0.15); 
        ctx.save();
        ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const midAngle = startAngle + (endAngle - startAngle) / 2;
        ctx.translate(cx, cy); ctx.rotate(midAngle); ctx.translate(rad, 0); ctx.rotate(Math.PI / 2);
        ctx.fillText(emoji, 0, 0); ctx.restore();
    }

    function drawWheel() {
      ctx.clearRect(0, 0, size, size);
      const len = prizes.length;
      const segmentAngle = (2 * Math.PI) / len;

      // Borde
      const rimOuter = radius + 8, rimInner = radius;
      const g = ctx.createLinearGradient(0, cy - rimOuter, 0, cy + rimOuter);
      g.addColorStop(0, '#ffd86b'); g.addColorStop(1, '#d99b2a');
      ctx.beginPath(); ctx.arc(cx, cy, rimOuter, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, rimInner, 0, Math.PI * 2); ctx.fillStyle = '#d99b2a'; ctx.fill();

      // Segmentos
      const segOuter = radius - 2;
      for (let i = 0; i < len; i++) {
        const start = -Math.PI / 2 + i * segmentAngle;
        const end = start + segmentAngle;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, segOuter, start, end); ctx.closePath();
        
        const fillColor = orangeTones[i % orangeTones.length];
        const segG = ctx.createLinearGradient(cx + Math.cos(start+segmentAngle/2)*segOuter, cy + Math.sin(start+segmentAngle/2)*segOuter, cx, cy);
        segG.addColorStop(0, shade(fillColor, -10)); segG.addColorStop(1, shade(fillColor, 10));
        ctx.fillStyle = segG; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();

        // TEXTO: Lo ponemos un poco más adentro (-15% del radio)
        drawSegmentTextCurved(prizes[i], start, end, segOuter * 0.85);
        // EMOJI: Lo ponemos más al centro (-35% del radio)
        drawEmojiCentered(emojis[i], start, end, segOuter * 0.65);
      }

      // Luces
      const lights = 12;
      for (let i = 0; i < lights; i++) {
        const ang = -Math.PI/2 + (i/lights)*Math.PI*2;
        const lx = cx + Math.cos(ang)*(rimOuter-5), ly = cy + Math.sin(ang)*(rimOuter-5);
        if (lightsOn ? (i%2===0) : (i%2!==0)) drawLightOn(lx, ly, 5); else drawLightOff(lx, ly, 5);
      }
      
      // Centro
      drawCenterKnob(cx, cy, radius * 0.20 * 2.2);
    }

    function spin() {
      if (isSpinning) return;
      if (isLockedToday()) { alert('Ya usaste tu intento por hoy.'); return; }
      isSpinning = true; spinBtn.disabled = true;
      const stopAt = 360 * (5 + Math.floor(Math.random()*3)) + Math.random() * 360;
      if (rotor) {
        rotor.style.transition = 'transform 5s cubic-bezier(.14,.99,.38,1)';
        rotor.style.transform = `rotate(${stopAt}deg)`;
        const onEnd = () => { rotor.removeEventListener('transitionend', onEnd); finalizeRotation(stopAt); };
        rotor.addEventListener('transitionend', onEnd);
      }
    }

    function finalizeRotation(stopAt) {
      const finalDeg = stopAt % 360;
      if (rotor) { rotor.style.transition = 'none'; rotor.style.transform = `rotate(${finalDeg}deg)`; }
      
      const segmentDeg = 360 / prizes.length;
      const index = Math.floor(((360 - finalDeg + segmentDeg/2) % 360) / segmentDeg);
      const prize = prizes[index];

      if (pointer) { pointer.classList.remove('bounce'); void pointer.offsetWidth; pointer.classList.add('bounce'); }
      const rect = rotor.getBoundingClientRect();
      launchConfetti(rect.left + rect.width/2, rect.top);
      playWinSound();
      showPrizeModal(prize);
    }

    function showPrizeModal(prize, savedTime = null) {
        const prizeNormalized = String(prize || '').trim().toLowerCase();
        const isTryAgain = prizeNormalized.startsWith('otro intento');
        if (prizeTitle) prizeTitle.textContent = isTryAgain ? '¡Sigue intentando!' : '¡Felicidades!';
        if (prizeText) prizeText.textContent = isTryAgain ? '¡Tienes otra oportunidad!' : prize;

        let timeString = savedTime;
        if (!timeString && !isTryAgain) {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            timeString = `Reclamado: ${day}/${month}/${now.getFullYear()}, ${hours}:${minutes}`;
        }

        if (dateEl) {
            if (isTryAgain) dateEl.style.display = 'none';
            else { dateEl.style.display = 'block'; dateEl.textContent = timeString; }
        }

        if (!isTryAgain) {
            lockForToday();
            savePrizeDetails(prize, timeString);
        }

        if (isTryAgain) {
            if (tryAgainBtn) { tryAgainBtn.style.display = 'inline-block'; tryAgainBtn.disabled = false; tryAgainBtn.onclick = () => { modal.classList.add('hidden'); setTimeout(spin, 200); }; }
            if (closeModal) closeModal.style.display = 'none';
        } else {
            if (tryAgainBtn) tryAgainBtn.style.display = 'none';
            if (closeModal) { closeModal.style.display = 'inline-block'; closeModal.textContent = 'ACEPTAR'; }
        }
        if (modal) modal.classList.remove('hidden');
        isSpinning = false;
        if (isTryAgain && spinBtn) spinBtn.disabled = false;
    }

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    if (spinBtn) {
        spinBtn.addEventListener('click', spin);
        if (isLockedToday()) {
            spinBtn.disabled = true;
            const savedData = getSavedPrize();
            if (savedData && savedData.name) showPrizeModal(savedData.name, savedData.time);
        }
    }
    if (closeModal) closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    setInterval(() => { lightsOn = !lightsOn; drawWheel(); }, 500);
    if (document.fonts) document.fonts.ready.then(drawWheel);
  });

  function launchConfetti(x, y) {
      const c = document.createElement('canvas');
      c.style.position='fixed'; c.style.inset='0'; c.style.pointerEvents='none'; c.style.zIndex='9999';
      document.body.appendChild(c);
      const ctx = c.getContext('2d');
      c.width = window.innerWidth; c.height = window.innerHeight;
      const particles = Array.from({length: 80}, () => ({ x: x, y: y, vx: (Math.random()-0.5)*10, vy: (Math.random()-1)*10 - 5, color: `hsl(${Math.random()*360}, 100%, 50%)`, life: 100 }));
      function step() {
          ctx.clearRect(0,0,c.width,c.height);
          particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.life--; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 8, 8); });
          if(particles.some(p => p.life > 0)) requestAnimationFrame(step); else c.remove();
      }
      step();
  }
  function playWinSound() { try { const A = new (window.AudioContext || window.webkitAudioContext)(); const o = A.createOscillator(); o.connect(A.destination); o.type='triangle'; o.frequency.setValueAtTime(600, A.currentTime); o.frequency.exponentialRampToValueAtTime(1000, A.currentTime+0.1); o.start(); o.stop(A.currentTime+0.5); } catch(e){} }
})();
