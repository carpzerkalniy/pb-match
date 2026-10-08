// Local review map. Connections group situations; they do not select product policy.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const statuses = {confirmed:'Подтверждённая основа', mixed:'Есть открытые решения', proposal:'Вариант для обсуждения'};

export function createSituationMap({host, data, renderScreen, onOpenDetails, onSelect, onScopeChange}) {
  let zoom = 1;
  let active;
  let activeStep = 0;
  let hoverTimer;
  let hideTimer;
  let selected = '';
  let scope = 'mvp';
  const scopedScenarios = () => data.scenarios.filter(s => scope === 'all' || s.scope === scope);
  const scopedCategories = () => data.categories.filter(category => scopedScenarios().some(s => s.category === category.id));
  const scopeLabel = s => s.scope === 'archive' ? 'Архив / невыбранный вариант' : statuses[s.status];
  const compact = () => matchMedia('(max-width: 700px)').matches;
  const list = values => `<ul>${values.map(value => `<li>${esc(value)}</li>`).join('')}</ul>`;
  const mainPath = (data.main_path || []).map(item => ({...data.scenarios.find(s => s.id === item.id), pathLabel:item.label})).filter(s => s.id);
  host.innerHTML = `<div class="map-heading"><div><h2>Карта ситуаций</h2><p>Наведись на ситуацию, чтобы увидеть экран. Нажми — откроются все её шаги.</p></div><div class="map-legend">${Object.entries(statuses).map(([key,label]) => `<span><i class="status-dot ${key}"></i>${label}</span>`).join('')}</div></div>
    <div class="map-scope" aria-label="Набор ситуаций"><button type="button" data-map-scope="mvp" aria-pressed="true">Текущий MVP</button><button type="button" data-map-scope="archive" aria-pressed="false">Архив / варианты</button><button type="button" data-map-scope="all" aria-pressed="false">Всё вместе</button><a href="./data/scenarios-2026-10-05.json">Исходные 40 сценариев · 05.10 ↗</a></div>
    <div class="map-main-path"><span>Основная линия MVP</span>${mainPath.map((s,i) => `${i ? '<b aria-hidden="true">→</b>' : ''}<button type="button" data-map-open="${s.id}">${esc(s.id)} · ${esc(s.pathLabel)}</button>`).join('')}</div>
    <div class="map-toolbar"><label>Найти ситуацию<input type="search" id="map-search" placeholder="Слово или вопрос: Q03a" autocomplete="off"></label><span id="map-found" role="status"></span><div class="map-zoom" aria-label="Масштаб карты"><button type="button" data-map-zoom="out" aria-label="Уменьшить карту">−</button><output id="map-scale">100%</output><button type="button" data-map-zoom="in" aria-label="Увеличить карту">+</button><button type="button" data-map-zoom="fit">По ширине</button><button type="button" data-map-zoom="reset">100%</button></div></div>
    <p class="map-hint">Сначала показан текущий MVP. Архив хранит историю и альтернативы; его старые формулировки не отменяют поздние решения. Поиск ниже ищет сценарии документа, а не людей. Линии группируют ситуации, не делают все шаги обязательными.</p>
    <div class="map-viewport" tabindex="0" aria-label="Диаграмма ситуаций. Узлы открываются по Enter или касанию."><div class="map-size"><div class="map-stage"><svg class="map-lines" aria-hidden="true"></svg><div class="map-root"><span>ПБ·мэтч</span><strong>Основная комната</strong><small></small></div><div class="map-branches"></div></div></div></div>
    <aside class="map-hover" aria-label="Предпросмотр ситуации" hidden></aside>
    <dialog class="situation-modal" aria-labelledby="situation-title"><div class="modal-top"><span>Ситуация и её экран</span><button type="button" data-modal-close aria-label="Закрыть окно">✕</button></div><div class="modal-content"></div></dialog>`;
  const viewport = host.querySelector('.map-viewport');
  const stage = host.querySelector('.map-stage');
  const size = host.querySelector('.map-size');
  const hover = host.querySelector('.map-hover');
  const dialog = host.querySelector('dialog');

  function renderBranches() {
    hideHover();
    const categories = scopedCategories();
    host.querySelector('.map-root strong').textContent = scope === 'archive' ? 'История / варианты' : 'Основная комната';
    host.querySelector('.map-root small').textContent = `${scopedScenarios().length} ситуаций · ${categories.length} веток`;
    host.querySelector('.map-main-path').hidden = scope === 'archive';
    host.querySelectorAll('[data-map-scope]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mapScope === scope)));
    host.querySelector('.map-branches').innerHTML = categories.map((category,index) => `<section class="map-branch ${category.id === 'archive' ? 'map-archive-branch' : ''}"><h3><span>${String(index+1).padStart(2,'0')}</span>${esc(category.title)}</h3><div class="map-leaves">${scopedScenarios().filter(s => s.category === category.id).map(s => `<button type="button" class="map-node ${s.status}" data-map-open="${s.id}" aria-label="${esc(s.id + '. ' + s.title + '. ' + scopeLabel(s))}" aria-haspopup="dialog"><span class="node-id">${s.id}<i class="status-dot ${s.status}"></i></span><span class="node-title">${esc(s.title)}</span><span class="node-tail">${s.steps.length} шагов${s.question_ids.length ? ' · '+esc(s.question_ids.join(', ')) : ''}</span></button>`).join('')}</div></section>`).join('');
    search(); highlight(); requestAnimationFrame(drawLines);
  }
  function setScope(value) {
    if (!['mvp','archive','all'].includes(value) || value === scope) return;
    scope = value; renderBranches();
  }

  function drawLines() {
    if (host.hidden) return;
    const svg = host.querySelector('.map-lines');
    const bounds = stage.getBoundingClientRect();
    const factor = compact() ? 1 : zoom;
    const point = (el, edge) => {
      const r = el.getBoundingClientRect();
      return {x:(r.left+r.width/2-bounds.left)/factor, y:((edge === 'top' ? r.top : r.bottom)-bounds.top)/factor};
    };
    const root = point(host.querySelector('.map-root'), 'bottom');
    const paths = [...host.querySelectorAll('.map-branch h3')].map((header,index) => {
      const end = point(header,'top');
      if (compact()) return `<path d="M ${root.x} ${root.y} H 12 V ${end.y-15} H ${end.x} V ${end.y}"/>`;
      if (index < 4) return `<path d="M ${root.x} ${root.y} V ${root.y+28} H ${end.x} V ${end.y}"/>`;
      // Later branches follow a side trunk, avoiding the first row of situations.
      const side = index < 6 ? 12 : stage.offsetWidth-12;
      return `<path d="M ${root.x} ${root.y} V ${root.y+15} H ${side} V ${end.y-27} H ${end.x} V ${end.y}"/>`;
    });
    svg.setAttribute('viewBox', `0 0 ${stage.offsetWidth} ${stage.offsetHeight}`);
    svg.innerHTML = paths.join('');
    size.style.width = compact() ? '100%' : `${stage.offsetWidth*factor}px`;
    size.style.height = `${stage.offsetHeight*factor}px`;
  }
  function setZoom(value) {
    hideHover();
    zoom = Math.min(1.4,Math.max(.45,value));
    if (compact()) size.style.width = '100%';
    stage.style.transform = compact() ? 'none' : `scale(${zoom})`;
    host.querySelector('#map-scale').textContent = `${Math.round(zoom*100)}%`;
    requestAnimationFrame(drawLines);
  }
  function fit() { setZoom(compact() ? 1 : Math.min(1,(viewport.clientWidth-18)/1340)); }
  function hideHover() {
    clearTimeout(hoverTimer); clearTimeout(hideTimer);
    hover.hidden = true;
  }
  function showHover(node) {
    if (compact() || !matchMedia('(hover: hover)').matches || dialog.open) return;
    const scenario = data.scenarios.find(s => s.id === node.dataset.mapOpen);
    if (!scenario) return;
    hover.innerHTML = `<div class="hover-caption"><strong>${esc(scenario.id)}.01 · ${esc(scenario.steps[0].title)}</strong><span>${esc(scopeLabel(scenario))}</span></div><div class="hover-phone">${renderScreen(scenario.steps[0],scenario)}</div><button type="button" data-map-open="${scenario.id}">Открыть все шаги →</button>`;
    hover.hidden = false;
    const r = node.getBoundingClientRect();
    const w = hover.offsetWidth, h = hover.offsetHeight;
    const x = r.right+w+16 < innerWidth ? r.right+12 : r.left-w-12;
    hover.style.left = `${Math.min(innerWidth-w-8,Math.max(8,x))}px`;
    hover.style.top = `${Math.max(8,Math.min(innerHeight-h-8,r.top))}px`;
  }
  function renderModal() {
    const step = active.steps[activeStep];
    const tabs = active.steps.map((item,index) => `<button type="button" data-modal-step="${index}" aria-current="${index===activeStep ? 'step' : 'false'}" aria-label="Шаг ${index+1}: ${esc(item.title)}">${index+1}</button>`).join('');
    dialog.querySelector('.modal-content').innerHTML = `
      <header class="modal-heading"><span class="status-badge ${active.status}">${esc(scopeLabel(active))}</span><h2 id="situation-title">${esc(active.id)} · ${esc(active.title)}</h2>${active.scope === 'archive' ? `<p class="archive-warning">${esc(active.archive_note)}</p>` : ''}<p>${esc(active.summary)}</p></header>
      <div class="modal-navigator"><div><p class="step-counter">Шаг ${activeStep+1} из ${active.steps.length} · ${esc(step.title)}</p><div class="modal-step-tabs" aria-label="Шаги ситуации">${tabs}</div></div><div class="modal-step-controls"><button type="button" data-modal-move="-1" ${activeStep===0 ? 'disabled' : ''}>← Назад</button><button type="button" data-modal-move="1" ${activeStep===active.steps.length-1 ? 'disabled' : ''}>Следующий →</button></div></div>
      <div class="modal-layout"><div class="modal-description"><h3>${esc(step.title)}</h3><h4>Действие участника / администратора</h4><p>${esc(step.action)}</p><h4>Ответ приложения</h4><p>${esc(step.response)}</p>
      <details><summary>Условия и результат</summary><h4>Начало</h4><p>${esc(active.trigger)}</p>${list(active.preconditions)}<h4>Результат</h4><p>${esc(active.outcome)}</p></details>
      ${active.decisions_needed.length ? `<div class="modal-questions"><h4>Что ещё нужно решить</h4>${list(active.decisions_needed)}</div>` : ''}<button type="button" class="modal-details" data-modal-details>Подробное описание сценария ↗</button><button type="button" class="review-modal-note" data-review-notes>Замечание к этому шагу</button></div>
      <div class="modal-phone"><span class="preview-label">Адаптация исходного хаба · вымышленные данные</span>${renderScreen(step,active)}</div></div>`;
  }
  function openScenario(id) {
    active = data.scenarios.find(s => s.id === id);
    if (!active) return;
    hideHover(); activeStep = 0; selected = id; highlight();
    onSelect?.(id,activeStep);
    renderModal();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('[data-modal-close]').focus({preventScroll:true});
  }
  function highlight() {
    host.querySelectorAll('.map-node').forEach(node => node.setAttribute('aria-current',String(node.dataset.mapOpen === selected)));
  }
  function search() {
    hideHover();
    const query = host.querySelector('#map-search').value.trim().toLocaleLowerCase('ru');
    const found = new Set(scopedScenarios().filter(s => !query || JSON.stringify(s).toLocaleLowerCase('ru').includes(query)).map(s => s.id));
    host.querySelectorAll('.map-node').forEach(node => {
      node.classList.toggle('map-muted',!found.has(node.dataset.mapOpen));
      node.classList.toggle('map-hit',Boolean(query) && found.has(node.dataset.mapOpen));
    });
    host.querySelector('#map-found').textContent = `Найдено ${found.size} из ${scopedScenarios().length}`;
  }
  host.addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.mapScope) { setScope(button.dataset.mapScope); onScopeChange?.(scope); return; }
    if (button.dataset.mapOpen) { openScenario(button.dataset.mapOpen); return; }
    if (button.hasAttribute('data-modal-close')) { dialog.close(); return; }
    if (button.hasAttribute('data-modal-details')) { const id=active.id; dialog.close(); onOpenDetails(id); return; }
    if (button.dataset.modalStep !== undefined || button.dataset.modalMove) {
      activeStep = button.dataset.modalStep !== undefined ? Number(button.dataset.modalStep) : activeStep+Number(button.dataset.modalMove);
      onSelect?.(active.id,activeStep);
      renderModal();
      dialog.querySelector(`[data-modal-step="${activeStep}"]`).focus({preventScroll:true});
      return;
    }
    if (button.dataset.mapZoom) {
      const action = button.dataset.mapZoom;
      if (action === 'fit') fit();
      else setZoom(action === 'reset' ? 1 : zoom+(action === 'in' ? .15 : -.15));
    }
  });
  dialog.addEventListener('click',event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => host.querySelector(`.map-node[data-map-open="${selected}"]`)?.focus({preventScroll:true}));
  host.querySelector('#map-search').addEventListener('input',search);
  host.addEventListener('pointerover',event => {
    const node = event.target.closest('.map-node');
    if (!node || node.contains(event.relatedTarget)) return;
    clearTimeout(hideTimer); clearTimeout(hoverTimer);
    hoverTimer = setTimeout(()=>showHover(node),350);
  });
  host.addEventListener('pointerout',event => {
    const node = event.target.closest('.map-node');
    if (!node || node.contains(event.relatedTarget)) return;
    clearTimeout(hoverTimer);
    hideTimer=setTimeout(hideHover,180);
  });
  hover.addEventListener('pointerenter',()=>{ clearTimeout(hideTimer); });
  hover.addEventListener('pointerleave',()=>{ hideTimer=setTimeout(hideHover,180); });
  document.addEventListener('keydown',event=>{ if(event.key==='Escape') hideHover(); });
  let pointerPosition;
  let drag;
  viewport.addEventListener('scroll',()=>{
    hideHover();
    if (!pointerPosition || drag) return;
    hoverTimer=setTimeout(()=>{
      const node=document.elementFromPoint(pointerPosition?.x ?? -1,pointerPosition?.y ?? -1)?.closest('.map-node');
      if (node && viewport.contains(node)) showHover(node);
    },350);
  });
  viewport.addEventListener('pointerleave',()=>{pointerPosition=null;});
  viewport.addEventListener('pointerdown',event=>{
    if(event.button!==0 || event.target.closest('button,input') || compact()) return;
    drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};
    viewport.setPointerCapture(event.pointerId); viewport.classList.add('map-dragging'); hideHover();
  });
  viewport.addEventListener('pointermove',event=>{pointerPosition={x:event.clientX,y:event.clientY};if(drag){viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY;}});
  const stopDrag=()=>{drag=null;viewport.classList.remove('map-dragging');};
  viewport.addEventListener('pointerup',stopDrag);
  viewport.addEventListener('pointercancel',stopDrag);
  new ResizeObserver(()=>requestAnimationFrame(drawLines)).observe(stage);
  let previousCompact=compact();
  window.addEventListener('resize',()=>{hideHover();if(previousCompact!==compact()){previousCompact=compact();fit();}else requestAnimationFrame(drawLines);});
  renderBranches(); requestAnimationFrame(fit);
  return {setSelected(id){selected=id;highlight();}, setScope, refresh(){requestAnimationFrame(drawLines);}};
}
