// Lista de premios (edítala como quieras)
const prizes = [
  "10 monedas",
  "20 monedas",
  "Un cupón",
  "Nada :(",
  "50 monedas",
  "Premio sorpresa",
  "5 monedas",
  "Bono extra"
];

const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const outer = document.getElementById('wheel');
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
  // Por el offset en el dibujo (-90deg), el segmento 0 ya está en el puntero.
  // Ángulo final: rotaciones completas + (selectedIndex * segmento) + mitad del segmento
  const stopAt = 360 * extraRotations + selectedIndex * segmentDeg + segmentDeg / 2;

  // Aplicar la rotación CSS (la ruleta gira en sentido horario con valores positivos)
  outer.style.transition = 'transform 5s cubic-bezier(.14,.99,.38,1)';
  outer.style.transform = `rotate(${stopAt}deg)`;

  // Cuando termina la transición, mostramos el resultado
  const onEnd = () => {
    outer.style.transition = ''; // limpiar transición
    // Mantener la rotación en estado actual (valor grande). Para evitar overflow visual podemos normalizar:
    const finalNormalized = stopAt % 360;
    outer.style.transform = `rotate(${finalNormalized}deg)`;
    // Mostrar modal con premio
    setTimeout(()=> {
      prizeText.textContent = prizes[selectedIndex];
      modal.classList.remove('hidden');
      isSpinning = false;
      spinBtn.disabled = false;
    }, 300); // pequeño delay para asegurar suavidad
    outer.removeEventListener('transitionend', onEnd);
  };

  outer.addEventListener('transitionend', onEnd);
}

// Cierre modal
closeModal.addEventListener('click', ()=> {
  modal.classList.add('hidden');
});

// Inicialización
drawWheel();
spinBtn.addEventListener('click', spin);

// Redibujar si cambian tamaño (opcional)
window.addEventListener('resize', ()=> {
  // Si quieres adaptar el canvas a CSS size, reestablece width/height y redraw.
  // (En esta demo usamos valores fijos de canvas para simplicidad)
});
