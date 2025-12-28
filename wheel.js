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
// rotor es el que gira; wheel (outer) es el marco que queda fijo (contiene el puntero)
const rotor = document.getElementById('wheel-rotor');
const spinBtn = document.getElementById('spin-btn');
const modal = document.getElementById('prize-modal');
const prizeText = document.getElementById('prize-text');
const closeModal = document.getElementById('close-modal');

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
  // finalNormalizedDeg: rotación aplicada al rotor en grados (0-360)
  const len = prizes.length;
  const segmentDeg = 360 / len;
  // Para cada segmento calculamos la posición angular de su centro después de aplicar la rotación.
  // Los centros iniciales (sin rotación) están a: i*segmentDeg + segmentDeg/2 (medidos desde la "arriba", en sentido horario).
  // Después de rotar la rueda en sentido horario finalNormalizedDeg, el centro se mueve a:
  // centerAngle = (i*segmentDeg + segmentDeg/2 + finalNormalizedDeg) % 360
  // Queremos el i cuyo centerAngle esté más cerca de 0 (la punta superior).
  let bestIdx = 0;
  let bestDist = 1e9;
  for (let i = 0; i < len; i++) {
    const center = (i * segmentDeg + segmentDeg / 2 + finalNormalizedDeg) % 360;
    // distancia mínima angular al 0 (teniendo en cuenta envoltura 360)
    const dist = Math.min(Math.abs(center - 0), 360 - Math.abs(center - 0));
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// Función para girar
function spin(){
  if(isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;

  const len = prizes.length;
  const segmentDeg = 360 / len;

  // Opciones de giro: vueltas completas + offset aleatorio para que no siempre caiga en centros exactos
  const extraRotations = 5 + Math.floor(Math.random() * 3); // 5 a 7 vueltas
  const randomExtraDeg = Math.random() * 360; // cualquier posición dentro de la vuelta
  const stopAt = 360 * extraRotations + randomExtraDeg;

  // Aplicar la rotación al rotor (no al marco)
  rotor.style.transition = 'transform 5s cubic-bezier(.14,.99,.38,1)';
  rotor.style.transform = `rotate(${stopAt}deg)`;

  // Cuando termina la transición, determinamos qué segmento quedó apuntado y mostramos modal
  const onEnd = () => {
    // Normalizar el ángulo final a [0,360)
    const finalNormalized = stopAt % 360;
    // Acotar a 0..360
    const finalNorm360 = (finalNormalized + 360) % 360;

    // calcular el índice real que quedó apuntado
    const winnerIndex = computeIndexFromRotation(finalNorm360);

    // Normalizamos transform a un valor pequeño para evitar transforms con números grandes
    rotor.style.transition = '';
    rotor.style.transform = `rotate(${finalNorm360}deg)`;

    // Mostrar modal con premio correspondiente
    setTimeout(()=> {
      prizeText.textContent = prizes[winnerIndex];
      modal.classList.remove('hidden');
      isSpinning = false;
      spinBtn.disabled = false;
    }, 150); // pequeño delay para suavidad

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
