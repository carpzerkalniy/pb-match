const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const labels = { confirmed: 'Подтверждённая основа', mixed: 'Есть открытые решения', proposal: 'Вариант для обсуждения' };
const stepCountLabel = (count) => `${count} ${count % 10 === 1 && count % 100 !== 11 ? 'шаг' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'шага' : 'шагов'}`;
let data;
let renderScreen;
let selectedId = '';
let selectedStep = 0;
let mode = 'step';
let visible = [];
let lastWrittenHash = '';
let mapControls;
let pageView = 'map';

function hasQuestions(scenario) {
  return scenario.question_ids.length > 0 || scenario.decisions_needed.length > 0;
}

function statusBadge(scenario) {
  return `<span class="status-badge ${escapeHTML(scenario.status)}">${scenario.scope === 'archive' ? 'Архив / невыбранный вариант' : labels[scenario.status]}</span>`;
}

function richText(value) {
  // References are local scenario IDs only, never arbitrary URLs from the data.
  return escapeHTML(value).replace(/\bU\d{2}\b/g, (id) => data.scenarios.some((scenario) => scenario.id === id)
    ? `<a href="#${id}" data-scenario-ref="${id}">${id}</a>` : id);
}

function listHTML(values) {
  return `<ul>${values.map((value) => `<li>${richText(value)}</li>`).join('')}</ul>`;
}

function validate(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.categories) || !Array.isArray(input.scenarios) || !input.scenarios.length) {
    throw new Error('Ожидается непустой каталог сценариев версии 1.');
  }
  const ids = new Set();
  const categoryIds = new Set(input.categories.map((category) => category.id));
  for (const scenario of input.scenarios) {
    if (!/^U\d{2}$/.test(scenario.id) || ids.has(scenario.id) || !categoryIds.has(scenario.category) || !labels[scenario.status] || !['mvp','archive'].includes(scenario.scope)) {
      throw new Error('В каталоге найдены неверные ID, категории или статусы.');
    }
    ids.add(scenario.id);
    for (const field of ['preconditions', 'source_refs', 'question_ids', 'steps', 'exceptions', 'decisions_needed']) {
      if (!Array.isArray(scenario[field])) throw new Error(`В сценарии ${scenario.id} отсутствует список ${field}.`);
    }
    if (!scenario.steps.length || scenario.steps.some((step) => !step.screen || typeof step.screen.kind !== 'string')) {
      throw new Error(`В сценарии ${scenario.id} отсутствуют экраны шагов.`);
    }
  }
  return input;
}

function getFiltered() {
  const query = $('#search').value.trim().toLocaleLowerCase('ru');
  const category = $('#category').value;
  const status = $('#status').value;
  const questionsOnly = $('#questions-only').checked;
  const scope = $('#scope').value;
  return data.scenarios.filter((scenario) => (scope === 'all' || scenario.scope === scope)
    && (category === 'all' || scenario.category === category)
    && (status === 'all' || scenario.status === status)
    && (!questionsOnly || hasQuestions(scenario))
    && (!query || JSON.stringify(scenario).toLocaleLowerCase('ru').includes(query)));
}

function resetFilters() {
  $('#search').value = '';
  $('#category').value = 'all';
  $('#status').value = 'all';
  $('#questions-only').checked = false;
}

function renderList() {
  const scope = $('#scope').value;
  const total = data.scenarios.filter(scenario => scope === 'all' || scenario.scope === scope).length;
  $('#total-count').textContent = total;
  $('#filtered-count').textContent = `Найдено ${visible.length} из ${total}`;
  $('#scenario-list').innerHTML = visible.length ? data.categories.map((category) => {
    const scenarios = visible.filter((scenario) => scenario.category === category.id);
    if (!scenarios.length) return '';
    return `<h3 class="category-heading">${escapeHTML(category.title)} · ${scenarios.length}</h3>${scenarios.map((scenario) => `<button type="button" class="scenario-item" data-scenario="${scenario.id}" aria-current="${scenario.id === selectedId}">
      <span class="item-top"><span class="scenario-id">${scenario.id}</span><span class="status-dot ${scenario.status}" title="${labels[scenario.status]}"></span></span>
      <span class="item-title">${escapeHTML(scenario.title)}</span><span class="item-meta">${stepCountLabel(scenario.steps.length)} · ${hasQuestions(scenario) ? 'есть вопросы' : 'без открытых развилок'}</span>
    </button>`).join('')}`;
  }).join('') : '<div class="empty-state">Нет сценариев с такими условиями.<br>Убери часть фильтров или верни полный каталог.<br><button type="button" data-action="reset">Показать все сценарии</button></div>';
}

function screenHTML(step, scenario) {
  try {
    return renderScreen(step, scenario);
  } catch (error) {
    console.error('Screen preview failed:', scenario.id, step.id, error);
    return '<div class="error-panel"><p>Экран пока не отрисован. Проверь описание шага ниже; следующий шаг — исправить его шаблон в screens.js.</p></div>';
  }
}

function stageHTML(scenario) {
  const step = scenario.steps[selectedStep];
  return `<div class="step-tabs" aria-label="Шаги сценария">${scenario.steps.map((item, index) => `<button class="step-tab" type="button" data-step="${index}" aria-current="${index === selectedStep ? 'step' : 'false'}"><span class="step-number">${index + 1}</span>${escapeHTML(item.title)}</button>`).join('')}</div>
    <div class="step-stage"><div class="step-copy"><p class="step-counter">Шаг ${selectedStep + 1} из ${scenario.steps.length}</p><h4>${escapeHTML(step.title)}</h4>
      <div class="action-block"><h5>Действие гостя</h5><p>${richText(step.action)}</p></div>
      <div class="action-block"><h5>Ответ приложения</h5><p>${richText(step.response)}</p></div>
      <div class="step-controls"><button type="button" data-action="previous" ${selectedStep === 0 ? 'disabled' : ''}>← Назад</button><button class="next" type="button" data-action="next" ${selectedStep === scenario.steps.length - 1 ? 'disabled' : ''}>Следующий шаг →</button></div>
    </div><div class="phone-panel"><p class="preview-label">Вид в Mini App</p><div class="screen-mount">${screenHTML(step, scenario)}</div><p class="preview-caption">Адаптация исходного хаба · кнопки не отправляют данные</p></div></div>`;
}

function storyboardHTML(scenario) {
  return `<div class="storyboard">${scenario.steps.map((step, index) => `<section class="story-card"><p class="step-counter">Шаг ${index + 1} из ${scenario.steps.length}</p><h4>${escapeHTML(step.title)}</h4><div class="screen-mount">${screenHTML(step, scenario)}</div><span class="story-text-label">Действие гостя</span><p>${richText(step.action)}</p><span class="story-text-label">Ответ приложения</span><p>${richText(step.response)}</p><button class="show-step" type="button" data-step="${index}">Открыть шаг ${index + 1} →</button></section>`).join('')}</div>`;
}

function renderDetail() {
  const scenario = data.scenarios.find((item) => item.id === selectedId);
  if (!scenario || !visible.length) {
    $('#scenario-detail').innerHTML = '<div class="context-card"><h3>Выбери сценарий</h3><p>Под текущие фильтры ничего не подходит. Сбрось фильтры, чтобы продолжить просмотр.</p></div>';
    return;
  }
  selectedStep = Math.min(Math.max(0, selectedStep), scenario.steps.length - 1);
  const category = data.categories.find((item) => item.id === scenario.category);
  const questions = scenario.question_ids.map((id) => `<span class="question-tag">${escapeHTML(id)}</span>`).join('');
  $('#scenario-detail').innerHTML = `<header class="detail-header"><div class="detail-overline"><span>${scenario.id} · ${escapeHTML(category.title)}</span>${statusBadge(scenario)}</div>
    <h2>${escapeHTML(scenario.title)}</h2>${scenario.scope === 'archive' ? `<p class="archive-warning">${escapeHTML(scenario.archive_note)}</p>` : ''}<p class="summary">${richText(scenario.summary)}</p>
    <div class="detail-actions"><button type="button" data-action="copy">Скопировать ссылку на сценарий ↗</button><button type="button" class="review-modal-note" data-review-notes>Замечание к сценарию</button><span class="copy-status" aria-live="polite"></span></div></header>
    <div class="context-grid"><section class="context-card"><h3>С чего начинается</h3><p>${richText(scenario.trigger)}</p></section><section class="context-card"><h3>Что должно быть выполнено</h3>${listHTML(scenario.preconditions)}</section></div>
    <div class="step-heading"><h3>Путь · ${stepCountLabel(scenario.steps.length)}</h3><div class="view-toggle" aria-label="Режим просмотра"><button type="button" data-view="step" aria-pressed="${mode === 'step'}">По шагам</button><button type="button" data-view="all" aria-pressed="${mode === 'all'}">Все экраны</button></div></div>
    <div id="step-view">${mode === 'all' ? storyboardHTML(scenario) : stageHTML(scenario)}</div>
    <div class="notes-grid"><section class="notes-card"><h3>Результат</h3><p>${richText(scenario.outcome)}</p></section>
      <section class="notes-card"><h3>Исключения и переходы</h3>${scenario.exceptions.length ? listHTML(scenario.exceptions) : '<p>Отдельные исключения не выделены.</p>'}</section>
      ${hasQuestions(scenario) ? `<section class="notes-card wide decisions"><h3>Что нужно решить перед реализацией</h3>${scenario.decisions_needed.length ? listHTML(scenario.decisions_needed) : '<p>Базовая механика согласована; связанные детали вынесены в вопросы ниже.</p>'}${questions ? `<div class="question-tags">${questions}</div>` : ''}</section>` : ''}
      <section class="notes-card wide"><h3>Основание в текущем ТЗ</h3><div class="source-list">${scenario.source_refs.map((source) => `<span class="source-ref">${escapeHTML(source)}</span>`).join('')}</div></section></div>`;
}

function writeHash() {
  if (!selectedId) return;
  const parameters = new URLSearchParams();
  if (selectedStep) parameters.set('step', String(selectedStep + 1));
  if (mode === 'all') parameters.set('view', 'all');
  const hash = `#${selectedId}${parameters.size ? `?${parameters}` : ''}`;
  lastWrittenHash = hash;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

function readHash() {
  let hash;
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
  const [id, query = ''] = hash.split('?');
  if (!data.scenarios.some((scenario) => scenario.id === id)) return false;
  const params = new URLSearchParams(query);
  selectedId = id;
  $('#scope').value = data.scenarios.find(scenario => scenario.id === id).scope;
  selectedStep = Math.max(0, (Number.parseInt(params.get('step') || '1', 10) || 1) - 1);
  mode = params.get('view') === 'all' ? 'all' : 'step';
  return true;
}

function refresh({ fromFilter = false } = {}) {
  visible = getFiltered();
  if (visible.length && !visible.some((scenario) => scenario.id === selectedId)) {
    selectedId = visible[0].id;
    selectedStep = 0;
  }
  renderList();
  renderDetail();
  mapControls?.setScope($('#scope').value);
  mapControls?.setSelected(selectedId);
  if (visible.length) writeHash();
  if (!fromFilter && pageView === 'catalog') $('#scenario-list [aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
}

function selectScenario(id) {
  if (!data.scenarios.some((scenario) => scenario.id === id)) return;
  if (!getFiltered().some((scenario) => scenario.id === id)) resetFilters();
  if ($('#scope').value !== 'all') $('#scope').value = data.scenarios.find(scenario => scenario.id === id).scope;
  selectedId = id;
  selectedStep = 0;
  refresh();
  if (window.matchMedia('(max-width: 800px)').matches) {
    $('#scenario-detail .detail-header')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
}

async function copyLink() {
  writeHash();
  const notice = $('.copy-status');
  try {
    await navigator.clipboard.writeText(location.href);
    notice.textContent = 'Ссылка скопирована';
  } catch {
    notice.textContent = 'Скопируй адрес из строки браузера — выбранный сценарий уже в ссылке.';
  }
}

function onClick(event) {
  const button = event.target.closest('button');
  const link = event.target.closest('[data-scenario-ref]');
  if (link) { event.preventDefault(); selectScenario(link.dataset.scenarioRef); return; }
  if (!button || button.disabled) return;
  if (button.dataset.scenario) { selectScenario(button.dataset.scenario); return; }
  if (button.dataset.step !== undefined) {
    selectedStep = Number(button.dataset.step);
    mode = 'step';
    renderDetail();
    writeHash();
    $('.step-tab[aria-current="step"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return;
  }
  if (button.dataset.view) {
    mode = button.dataset.view;
    renderDetail();
    writeHash();
    $(`[data-view="${mode}"]`)?.focus({ preventScroll: true });
    return;
  }
  switch (button.dataset.action) {
    case 'reset': resetFilters(); refresh({ fromFilter: true }); break;
    case 'copy': void copyLink(); break;
    case 'previous':
      selectedStep -= 1; renderDetail(); writeHash();
      ($('#scenario-detail [data-action="previous"]:not(:disabled)') || $('#scenario-detail [data-action="next"]'))?.focus({ preventScroll: true });
      break;
    case 'next':
      selectedStep += 1; renderDetail(); writeHash();
      ($('#scenario-detail [data-action="next"]:not(:disabled)') || $('#scenario-detail [data-action="previous"]'))?.focus({ preventScroll: true });
      break;
  }
}

function setPageView(view) {
  pageView = view;
  $('#workspace').hidden = view !== 'catalog';
  $('#situation-map').hidden = view !== 'map';
  document.querySelectorAll('[data-page-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pageView === view)));
  if (view === 'map') mapControls?.refresh();
}

function showError(error) {
  $('#loading').hidden = true;
  $('#workspace').hidden = true;
  $('#situation-map').hidden = true;
  $('#page-views').hidden = true;
  const panel = $('#load-error');
  panel.hidden = false;
  const localHelp = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
    ? '<p>Для локального просмотра: запусти из корня проекта <code>python tools/dev_server.py</code>. Если сервер уже работает, проверь наличие <code>scenarios/data/scenarios.json</code> и <code>scenarios/screens.js</code>.</p>' : '';
  panel.innerHTML = `<h2>Карта сценариев пока не загрузилась</h2><p>${escapeHTML(error.message)}</p><p>Нажми «Повторить загрузку». Если ошибка осталась, сохрани её текст и адрес страницы в замечания — по ним проверим загрузку.</p>${localHelp}<button type="button" id="retry-load">Повторить загрузку</button><button type="button" class="review-modal-note" data-review-notes>Записать замечание</button>`;
  $('#retry-load').addEventListener('click', () => location.reload());
}

async function init() {
  try {
    const [response, screens, mapModule] = await Promise.all([fetch('./data/scenarios.json', { cache: 'no-store' }), import('./screens.js?v=base-room-20261008'), import('./situation-map.js')]);
    if (!response.ok) throw new Error(`Каталог сценариев недоступен (HTTP ${response.status}).`);
    if (typeof screens.renderScreen !== 'function') throw new Error('Модуль экранов не содержит renderScreen.');
    data = validate(await response.json());
    renderScreen = screens.renderScreen;
    $('#category').insertAdjacentHTML('beforeend', data.categories.map((category) => `<option value="${escapeHTML(category.id)}">${escapeHTML(category.title)}</option>`).join(''));
    $('#total-count').textContent = data.scenarios.length;
    $('#version-label').textContent = `MVP от ${data.generated_at} · ${data.scenarios.filter(s => s.scope === 'mvp').length} текущих / ${data.scenarios.filter(s => s.scope === 'archive').length} архивных путей`;
    if (!readHash()) selectedId = data.scenarios[0].id;
    $('#page-views').hidden = false;
    $('#situation-map').hidden = false;
    mapControls = mapModule.createSituationMap({ host: $('#situation-map'), data, renderScreen, onScopeChange: scope => {
      $('#scope').value = scope; resetFilters(); refresh({fromFilter:true});
    }, onSelect: (id,step) => {
      if (!getFiltered().some(scenario => scenario.id === id)) resetFilters();
      if ($('#scope').value !== 'all') $('#scope').value = data.scenarios.find(scenario => scenario.id === id).scope;
      selectedId=id; selectedStep=step; refresh({fromFilter:true});
    }, onOpenDetails: id => {
      setPageView('catalog'); selectScenario(id);
      $('#scenario-detail').scrollIntoView({ block: 'start' });
    }});
    $('#page-views').addEventListener('click', event => {
      const button = event.target.closest('[data-page-view]');
      if (button) setPageView(button.dataset.pageView);
    });
    // Existing links to a specific step or storyboard retain the detailed view.
    setPageView(location.hash.includes('?') ? 'catalog' : 'map');
    $('#loading').hidden = true;
    for (const selector of ['#search', '#category', '#status', '#questions-only', '#scope']) {
      $(selector).addEventListener(selector === '#search' ? 'input' : 'change', () => {
        if (selector === '#scope') resetFilters();
        refresh({ fromFilter: true });
      });
    }
    $('#reset-filters').addEventListener('click', () => { resetFilters(); refresh({ fromFilter: true }); });
    $('#workspace').addEventListener('click', onClick);
    window.addEventListener('hashchange', () => {
      if (location.hash === lastWrittenHash) return;
      if (readHash()) { resetFilters(); setPageView(location.hash.includes('?') ? 'catalog' : 'map'); refresh(); }
    });
    refresh();
  } catch (error) {
    console.error('Scenario gallery failed:', error);
    showError(error);
  }
}

void init();
