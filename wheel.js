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

  // Para que el primer segmento quede en el "arriba" (puntero), aplicamos -90deg
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

    // Texto del segmento
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

// Función para girar
function spin(){
  if(isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;

  const len = prizes.length;
  const selectedIndex = Math.floor(Math.random() * len);

  // Cantidad de rotaciones extra (vueltas completas) para que la animación se vea bien
  const extraRotations = 5 + Math.floor(Math.random()*3); // 5 a 7 vueltas
  const segmentDeg = 360 / len;

  // Queremos que el centro del segmento seleccionado quede justo debajo del puntero (arriba)
  // Recordar que dibujamos con offset -90deg, por eso segmento 0 queda arriba.
  const stopAt = 360 * extraRotations + selectedIndex * segmentDeg + segmentDeg / 2;

  // Aplicar la rotación al rotor (no al marco)
  rotor.style.transition = 'transform 5s cubic-bezier(.14,.99,.38,1)';
  rotor.style.transform = `rotate(${stopAt}deg)`;

  // Cuando termina la transición, mostramos el resultado
  const onEnd = () => {
    rotor.style.transition = ''; // limpiar transición
    // Normalizar el ángulo para mantener valor pequeño
    const finalNormalized = stopAt % 360;
    rotor.style.transform = `rotate(${finalNormalized}deg)`;
    // Mostrar modal con premio
    setTimeout(()=> {
      prizeText.textContent = prizes[selectedIndex];
      modal.classList.remove('hidden');
      isSpinning = false;
      spinBtn.disabled = false;
    }, 300); // pequeño delay para asegurar suavidad
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
