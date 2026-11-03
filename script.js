const TABLE = document.getElementById('periodic-table');
const F_BLOCK = document.getElementById('f-block-container');
const LEGEND = document.getElementById('legend');
const MODAL = document.getElementById('modal');
const MODAL_BODY = document.getElementById('modal-body');
const MODAL_CLOSE = document.getElementById('modal-close');

let elementsData = [];

const CATEGORY_LABELS = {
  'alkali metal': 'Щелочные металлы',
  'alkaline earth metal': 'Щелочноземельные металлы',
  'transition metal': 'Переходные металлы',
  'post-transition metal': 'Постпереходные металлы',
  'metalloid': 'Металлоиды',
  'nonmetal': 'Неметаллы',
  'halogen': 'Галогены',
  'noble gas': 'Благородные газы',
  'lanthanide': 'Лантаноиды',
  'actinide': 'Актиноиды',
};

/* ---------- Загрузка локальных данных ---------- */
async function loadData() {
  const response = await fetch('data.json');
  if (!response.ok) throw new Error(`Не удалось загрузить data.json: ${response.status}`);
  const data = await response.json();
  elementsData = data.elements.slice().sort((a, b) => a.number - b.number);
  buildTable();
  buildLegend();
}

/* ---------- Создание ячейки ---------- */
function createCell(el) {
  const cell = document.createElement('div');
  cell.className = 'element-cell';
  cell.dataset.category = el.category || '';
  cell.tabIndex = 0;
  cell.setAttribute('role', 'button');
  cell.setAttribute('aria-label', `${el.name_ru || el.symbol}, номер ${el.number}`);
  cell.title = el.name_ru || el.name || el.symbol;

  cell.innerHTML = `
    <span class="number">${el.number}</span>
    <span class="symbol">${el.symbol}</span>
    <span class="mass">${formatMass(el.mass)}</span>
  `;

  cell.addEventListener('click', () => showElement(el));
  cell.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showElement(el);
    }
  });

  return cell;
}

function formatMass(mass) {
  if (mass === null || mass === undefined) return '';
  if (typeof mass === 'number') {
    return mass.toFixed(3).replace(/\.?0+$/, '');
  }
  return String(mass);
}

/* ---------- Основная таблица (7 × 18) ---------- */
function buildTable() {
  TABLE.innerHTML = '';
  F_BLOCK.innerHTML = '';

  const map = new Map();
  elementsData.forEach((el) => {
    if (el.group != null && el.period != null) {
      map.set(`${el.group}-${el.period}`, el);
    }
  });

  for (let period = 1; period <= 7; period++) {
    for (let group = 1; group <= 18; group++) {
      const el = map.get(`${group}-${period}`);
      if (el) {
        TABLE.appendChild(createCell(el));
      } else {
        const spacer = document.createElement('div');
        spacer.className = 'element-cell spacer';
        TABLE.appendChild(spacer);
      }
    }
  }

  // f-блок: отдельными строками под таблицей.
  // La (57) и Ac (89) уже в основной таблице — здесь только Ce–Lu и Th–Lr.
  buildFBlockRow('Лантаноиды', 58, 71);
  buildFBlockRow('Актиноиды', 90, 103);
}

/* ---------- Строка f-блока ---------- */
function buildFBlockRow(label, startZ, endZ) {
  const row = document.createElement('div');
  row.className = 'f-block-row';

  // Подпись в группах 1–2
  const labelCell = document.createElement('div');
  labelCell.className = 'f-block-label';
  labelCell.textContent = label;
  row.appendChild(labelCell);

  // 14 элементов (58–71 или 90–103)
  for (let z = startZ; z <= endZ; z++) {
    const el = elementsData.find((item) => item.number === z);
    if (el) {
      row.appendChild(createCell(el));
    } else {
      const spacer = document.createElement('div');
      spacer.className = 'element-cell spacer';
      row.appendChild(spacer);
    }
  }

  // 2 пустые ячейки в конце, чтобы получилось 18 колонок
  for (let i = 0; i < 2; i++) {
    const spacer = document.createElement('div');
    spacer.className = 'element-cell spacer';
    row.appendChild(spacer);
  }

  F_BLOCK.appendChild(row);
}

/* ---------- Легенда ---------- */
function buildLegend() {
  LEGEND.innerHTML = '';
  const seen = new Set();
  elementsData.forEach((el) => {
    if (el.category && !seen.has(el.category)) {
      seen.add(el.category);
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.dataset.category = el.category;
      item.innerHTML = `<span class="legend-dot"></span><span>${
        CATEGORY_LABELS[el.category] || el.category
      }</span>`;
      LEGEND.appendChild(item);
    }
  });
}

/* ---------- Форматирование ---------- */
function fmt(value, unit = '', digits = 2) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    return `${value.toFixed(digits).replace(/\.?0+$/, '')} ${unit}`.trim();
  }
  return `${value} ${unit}`.trim();
}

function fmtTemp(kelvin) {
  if (kelvin === null || kelvin === undefined) return '—';
  const c = kelvin - 273.15;
  return `${kelvin} K (${c.toFixed(1)} °C)`;
}

/* ---------- Модальное окно ---------- */
function showElement(el) {
  const stateMap = { Gas: 'Газ', Liquid: 'Жидкость', Solid: 'Твёрдое' };
  const state = stateMap[el.phase] || el.phase || '—';

  let densityText = '—';
  if (el.phase === 'Solid' || el.phase === 'Liquid') {
    if (el.density_g_cm3 != null) densityText = `${el.density_g_cm3} г/см³`;
  } else if (el.phase === 'Gas') {
    densityText = '— (газ при н.у.)';
  }

  const history =
    el.history_ru ||
    `История открытия этого элемента пока не добавлена. Год открытия: ${
      el.discovery_year || 'неизвестен'
    }.`;

  MODAL_BODY.innerHTML = `
    <h2>${el.name_ru || el.name || el.symbol} (${el.symbol})</h2>
    <div class="subtitle">
      Порядковый номер ${el.number} · Период ${el.period || '—'} ·
      Группа ${el.group || '—'} · ${CATEGORY_LABELS[el.category] || el.category || ''}
    </div>

    <div class="props-grid">
      <div class="prop">
        <span class="label">Атомная масса</span>
        <span class="value">${formatMass(el.mass) || '—'}</span>
      </div>
      <div class="prop">
        <span class="label">ЭO</span>
        <span class="value">${fmt(el.electronegativity)}</span>
      </div>
      <div class="prop">
        <span class="label">Температура плавления</span>
        <span class="value">${fmtTemp(el.melt)}</span>
      </div>
      <div class="prop">
        <span class="label">Температура кипения</span>
        <span class="value">${fmtTemp(el.boil)}</span>
      </div>
      <div class="prop">
        <span class="label">Агрегатное состояние (н.у.)</span>
        <span class="value">${state}</span>
      </div>
      <div class="prop">
        <span class="label">Плотность</span>
        <span class="value">${densityText}</span>
      </div>
    </div>

    <div class="history-title">История открытия</div>
    <p class="history-text">${history}</p>
  `;

  MODAL.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/* ---------- Закрытие ---------- */
function closeModal() {
  MODAL.classList.add('hidden');
  document.body.style.overflow = '';
}

MODAL_CLOSE.addEventListener('click', closeModal);
MODAL.addEventListener('click', (e) => {
  if (e.target === MODAL) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !MODAL.classList.contains('hidden')) closeModal();
});

/* ---------- Запуск ---------- */
loadData().catch((err) => {
  console.error(err);
  TABLE.innerHTML = `<p style="color:#f87171;padding:16px;">Ошибка загрузки data.json: ${err.message}</p>`;
});
