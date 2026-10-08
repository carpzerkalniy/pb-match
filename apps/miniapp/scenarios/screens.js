// Scenario illustrations only. No guest data, persistence or contact API.
export const screenKinds = Object.freeze(['launch', 'identity', 'access_pending', 'access_denied', 'rooms', 'profile', 'photo', 'catalog', 'likes', 'matches_empty', 'match', 'consent', 'contact', 'contact_missing', 'notification', 'event_closed', 'error', 'moderation', 'deleted', 'qr', 'key', 'room_home', 'participation', 'audience', 'card', 'match_list', 'crm_contact', 'bot_message', 'admin_participants', 'admin_access', 'blocked']);

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, cls = '') => `<svg class="js-icon ${esc(cls)}" viewBox="0 0 24 24" aria-hidden="true">${({heart:'<path d="M20.5 5.7c-2-2.1-5.2-2.1-7.2 0L12 7l-1.3-1.3c-2-2.1-5.2-2.1-7.2 0s-2 5.5 0 7.6L12 21l8.5-7.7c2-2.1 2-5.5 0-7.6Z"/>',person:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',rooms:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/>',check:'<path d="m5 12 4 4L19 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',alert:'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.1"/>',bell:'<path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4Zm5 3h4"/>',camera:'<rect x="3" y="6" width="18" height="15" rx="3"/><path d="m8 6 1-3h6l1 3"/><circle cx="12" cy="13" r="4"/>',wifi:'<path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0m-3 4v.1M3 3l18 18"/>',trash:'<path d="M4 7h16M9 7V3h6v4M6 7l1 14h10l1-14M10 10v7m4-7v7"/>',telegram:'<path d="m3 11 18-7-4 17-6-6-4 3 1-6 9-5-6 8"/>'})[name] || ''}</svg>`;

function portrait(variant = 'mira', small = false) {
  const isOther = variant === 'sasha';
  return `<svg class="js-portrait ${small ? 'js-portrait-small' : ''}" viewBox="0 0 320 240" role="img" aria-label="Иллюстрация вымышленного гостя"><rect width="320" height="240" fill="${isOther ? '#312330' : '#33241E'}"/><circle cx="${isOther ? 60 : 270}" cy="45" r="92" fill="${isOther ? '#FB3399' : '#FF3E00'}" opacity=".2"/><circle cx="160" cy="97" r="43" fill="#CFAA90"/><path d="M111 90c-8-53 92-63 96-3l-19-19-33 8-40 39Z" fill="#21161C"/><path d="M110 188c4-55 97-55 102 0l16 52H94Z" fill="${isOther ? '#FB3399' : '#FDEB95'}"/><path d="M144 137v25q16 20 32 0v-25" fill="#CFAA90"/><path d="M145 112q15 10 30 0" fill="none" stroke="#805D52" stroke-width="2"/><circle cx="145" cy="98" r="2" fill="#21161C"/><circle cx="175" cy="98" r="2" fill="#21161C"/><path d="M160 99v10" stroke="#AA8069" stroke-width="2"/><text x="16" y="222" fill="#F0E6F4" opacity=".45" font-size="9" font-family="Arial">ВЫМЫШЛЕННЫЙ ГОСТЬ</text></svg>`;
}
const pill = (text, variant = 'yellow', disabled = false) => text ? `<button type="button" class="js-pill js-pill-${variant}"${disabled ? ' disabled' : ''}>${esc(text)}</button>` : '';
const actionText = (screen, key, fallback) => Object.hasOwn(screen, key) ? screen[key] : fallback;
const actions = (screen, defaults = {}) => `<div class="js-actions">${pill(actionText(screen, 'primary_label', defaults.primary), defaults.variant || 'yellow', defaults.disabled)}${pill(actionText(screen, 'secondary_label', defaults.secondary), 'ghost')}</div>`;
const note = (text, style = '') => `<div class="js-note ${esc(style)}">${esc(text)}</div>`;
const title = screen => `<h2 class="js-title">${esc(screen.heading)}</h2>${screen.body ? `<p class="js-sub">${esc(screen.body)}</p>` : ''}`;
const label = text => `<p class="js-label">${esc(text)}</p>`;
const hero = name => `<div class="js-symbol">${icon(name)}</div>`;
const pair = () => `<div class="js-pair"><div>${portrait('sasha', true)}</div><span>${icon('heart')}</span><div>${portrait('mira', true)}</div></div>`;
const badge = (text, tone = '') => `<span class="js-badge ${esc(tone)}">${esc(text)}</span>`;

function tabs(active = 'rooms', count = 0, current = false) {
  return `<nav class="js-tabs" aria-label="Разделы макета">${[['rooms',current ? 'Комната' : 'Комнаты'],['matches','Мэтчи'],['profile','Профиль']].map(([id,text]) => `<div class="js-tab ${id === active ? 'js-on' : ''}">${icon(id === 'matches' ? 'heart' : id === 'profile' ? 'person' : 'rooms')}${esc(text)}${id === 'matches' && count ? '<span class="js-tab-count">1</span>' : ''}</div>`).join('')}</nav>`;
}
function personCard(s, selected = false) {
  return `<article class="js-person-card">${portrait()}<div class="js-card-body"><div class="js-name-line"><h3>Лера</h3><span>Бейдж 12</span></div><p class="js-description">Люблю музыку, прогулки и спонтанные планы.</p>${pill(actionText(s,'primary_label',selected ? '♥ Симпатия сохранена' : '♡ Нравится'), selected ? 'orange' : 'yellow', Boolean(s.primary_disabled))}</div></article>`;
}

// Current MVP illustrations live separately from the unchanged historical states.
// Navigation labels, fields and copy are sketches, not additional accepted requirements.
function drawMvp(s, scenario) {
  const t = title(s);
  const state = String(s.state || '');
  const helper = text => `<p class="js-quiet">${esc(text)}</p>`;
  const guest = (variant, name, description) => `<div class="js-mini-person">${portrait(variant,true)}<div><h3>${esc(name)}</h3><p>${esc(description)}</p></div></div>`;
  switch (s.kind) {
    case 'qr':
      return [t + `<article class="js-room js-live"><p class="js-label">Базовая комната без ключа</p><h3>Знакомства ПБ</h3><div class="js-qr-placeholder" role="img" aria-label="Условная заглушка QR, не рабочий код">${icon('telegram')}<span>QR открывает приложение</span></div>${actions(s)}</article>` + note('Приложение откроется в Telegram. Для первой комнаты ключ не нужен.') + helper('Здесь изображена заглушка. Рабочего QR и бота нет.'), 'rooms'];
    case 'identity':
      if (state !== 'base_room_entry') return null;
      return [t + hero('telegram') + `<article class="js-room js-surface">${label('Аккаунт проверен')}<h3>В базовую комнату</h3><p>Она открыта без ключа для первого и любого следующего гостя.</p>${actions(s)}</article>` + note('Профиль, участие и передача контакта — отдельные действия.'), 'rooms'];
    case 'key':
      return [t + hero('lock') + `<article class="js-room js-surface">${label('Вариант следующей комнаты')}<h3>Ключ комнаты</h3><div class="js-field"><span>Ключ</span><div class="js-input js-placeholder">ПРИМЕР · НЕ РАБОТАЕТ</div></div>${state === 'key_error' ? note('Ключ не принят. Уточни его у организатора.', 'js-warning') : helper('Тип, выдача и сроки ключей ещё обсуждаются.')}${actions(s)}</article>` + note('Первая базовая комната доступна без ключа.') + helper('Участие и передача контакта включаются отдельно.'), 'rooms'];
    case 'room_home':
      return [t + `<article class="js-room js-live"><div class="js-pulse"><i></i>Доступ открыт</div><h3>Базовая комната</h3><p>Вход без ключа. Продолжаем знакомиться после вечеринки.</p>${actions(s)}</article><article class="js-room js-surface"><h3>Твой режим</h3><p>Профиль, участие и разрешение на контакт — разные действия.</p></article>`, 'rooms'];
    case 'participation': {
      const off = state === 'participation_off';
      const current = state === 'participation_current';
      return [t + `<article class="js-room js-surface"><div class="js-participation"><div><h3>Сейчас участвую</h3><p>${current ? 'Сохранённый режим' : off ? 'Выключено' : 'Включено'}</p></div><span class="js-toggle ${current ? 'js-toggle-unknown' : off ? '' : 'js-toggle-on'}" aria-label="${current ? 'Сохранённое положение, пример не выбирает значение' : off ? 'Участие выключено' : 'Участие включено'}">${current ? '?' : '<i></i>'}</span></div>${current ? note('Повторный вход не меняет твой выбор.') : off ? note('Карточка скрыта. Новые лайки и пары остановлены. Старые мэтчи остаются.') : note('Твою карточку могут видеть подходящие участники.')}${actions(s)}</article><article class="js-room js-surface"><h3>Контакты отдельно</h3><p>Пауза не отзывает разрешения на контакт. Их можно прекратить у конкретной пары.</p></article>` + helper('Начальное положение и просмотр карточек на паузе ещё обсуждаются.'), 'profile'];
    }
    case 'audience':
      return [t + hero('person') + `<article class="js-room js-surface"><h3>Выбор аудитории</h3><p>Здесь будут согласованные варианты.</p>${note('Пол, варианты выбора и значение по умолчанию пока не утверждены.')}</article>`, 'rooms'];
    case 'card': {
      if (state === 'card_empty') return [t + `<div class="js-empty">${hero('person')}<h3>Пока нет карточек</h3><p>Загляни позже или посмотри свои мэтчи.</p>${actions(s)}</div>`, 'rooms'];
      const liked = state === 'card_liked';
      const rejected = state === 'card_rejected';
      const sending = state === 'card_sending';
      const error = state === 'card_error';
      const reactionButtons = state === 'card_unliked' ? `<div class="js-swipe-actions">${pill('✕ Дизлайк','ghost')}${pill('♥ Лайк')}</div>` : pill(s.primary_label, liked ? 'orange' : 'yellow', sending);
      return [t + `<p class="js-label">Основная комната · одна карточка</p><article class="js-person-card">${portrait()}<div class="js-card-body"><h3>Лера</h3><p class="js-description">Люблю музыку, прогулки и спонтанные планы.</p>${reactionButtons}${error ? note('Выбор не подтверждён сервером.', 'js-warning') : liked ? note('Симпатия сохранена.', 'js-positive') : rejected ? note('Дизлайк сохранён. Мэтч и передача контакта не возникают.') : ''}</div></article>` + helper('← Дизлайк · свайп · Лайк →') + helper('Лайк не передаёт контакт.'), 'rooms'];
    }
    case 'match_list': {
      const empty = state === 'matches_empty' || state === 'matches_ended';
      if (empty) return [t + `<div class="js-empty">${hero('heart')}<h3>${state === 'matches_ended' ? 'Эта взаимность завершена' : 'Пока без взаимностей'}</h3><p>${state === 'matches_ended' ? 'Контакт по этой паре больше не выдаётся.' : 'Мэтчи появляются сразу, когда симпатия взаимна.'}</p>${actions(s)}</div>`, 'matches'];
      const shared = state === 'matches_owner_shared';
      return [t + (state === 'matches_paused' ? note('Поиск на паузе. Здесь остаются твои прежние мэтчи.') : '') + `<article class="js-room js-surface js-match-row">${guest('mira','Лера','Взаимная симпатия')}<div class="js-divider"></div><p>${shared ? 'Твой контакт разрешён для Леры' : 'Ты ещё не разрешил свой контакт для Леры'}</p><p class="js-quiet">Контакт Леры пока закрыт</p>${pill(s.primary_label,shared ? 'ghost' : 'yellow')}</article>` + note('Это действие для одной пары. Общего разрешения всем нет.'), 'matches', 1];
    }
    case 'match':
      return [t + `<article class="js-room js-live js-match-hero">${label('Взаимная симпатия')}${pair()}<h3>Вы понравились<br>друг другу</h3><p>Ты и Лера · основная комната</p></article><article class="js-room js-surface">${icon('lock')}<p>Контакты пока закрыты. Каждый отдельно разрешает передачу своего контакта.</p>${state === 'rematch_new_consent' ? note('Это новая пара. Прежнее разрешение не переносится.') : ''}${actions(s)}</article>`, 'matches',1];
    case 'consent':
      if (state === 'independent_ask') return [t + `<article class="js-room js-surface">${guest('mira','Лера','Разрешение только для этой пары')}<div class="js-divider"></div>${label('Твой подтверждённый контакт')}<p class="js-contact-handle">@pb_demo_self</p><p>Разрешить Лере получить этот контакт?</p>${actions(s)}</article>` + note('Её решение независимо. Её контакт остаётся закрытым до её согласия.') + helper('Условный контакт; типы контактов ещё обсуждаются.'), 'matches',1];
      // Other consent states use their historical presentation, whose semantics remain valid.
      return null;
    case 'crm_contact': {
      const known = state === 'crm_verified_candidate';
      return [t + hero(known ? 'person' : 'lock') + `<article class="js-room js-surface"><h3>${known ? 'Контакт из CRM' : 'Подтверди контакт'}</h3><p>${known ? 'Только при проверенной связи с твоей записью.' : 'Чтобы показать твой контакт, нужно подтвердить, что он принадлежит тебе.'}</p>${known ? `<p class="js-contact-handle">@pb_demo_self</p>${actions(s)}` : note('Способ связывания ещё выбираем. Чужие данные не подставляются.')}</article>` + note('Подтверждение своего контакта не передаёт его мэтчам.'), 'profile'];
    }
    case 'bot_message': {
      const failure = /disabled|failed/.test(state);
      return [t + `<div class="js-bot-message"><div class="js-bot-head">${icon('telegram')}ПБ Мэтч<span>· бот</span></div><p>${state === 'bot_entry' ? 'Открывай Mini App, чтобы знакомиться в основной комнате.' : failure ? 'Результаты можно посмотреть в Mini App.' : 'У тебя есть обновление в ПБ Мэтч. Открой приложение, чтобы посмотреть.'}</p>${actions(s)}</div>` + note(failure ? 'Недоставленное сообщение не отменяет мэтч.' : 'В сообщении нет контактов. Точные поводы уведомлений ещё обсуждаются.'), 'matches'];
    }
    case 'admin_participants': {
      const blocked = state === 'admin_blocked';
      return [t + label('Админский режим · основная комната') + `<article class="js-room js-surface">${guest('mira','Лера',blocked ? 'Доступ закрыт' : 'Доступ открыт')}${blocked ? badge('Заблокирована') : actions(s)}</article><article class="js-room js-surface">${guest('sasha','Саша','Доступ открыт')}</article>` + note('Фотографии — синтетические. Доступ к админке проверяет сервер.'), 'admin'];
    }
    case 'admin_access':
      return [t + `<article class="js-room js-surface">${portrait()}<h3>Лера</h3><p>Скрыть карточку и закрыть доступ к данным и действиям базовой комнаты?</p>${note('Вход без ключа и личное включение участия не снимают блокировку.')}${actions(s,{variant:'orange'})}</article>` + helper('Новые уведомления комнаты этому участнику тоже прекращаются.'), 'admin'];
    case 'blocked':
      return [t + hero('lock') + `<article class="js-room js-surface"><h3>Доступ закрыт организатором</h3><p>Обратись к организатору, чтобы разобраться.</p></article>` + note('Вход без ключа не снимает запрет. Это не пауза поиска.'), 'blocked'];
    default:
      return null;
  }
}

function draw(screen, scenario) {
  if (scenario.scope === 'mvp' || scenario.preview_context === 'future_room') {
    const current = drawMvp(screen, scenario);
    if (current) return current;
  }
  const state = screen.state;
  const stateString = typeof state === 'string' ? state : JSON.stringify(state || {});
  const has = pattern => new RegExp(pattern, 'i').test(stateString);
  const context = `${scenario.id || ''} ${scenario.title || ''} ${screen.heading || ''} ${stateString}`;
  const matches = pattern => new RegExp(pattern, 'i').test(context);
  const s = {...screen, heading: screen.heading || 'ПБ Мэтч'};
  const t = title(s);
  switch (s.kind) {
    case 'launch':
      return [t + `<article class="js-room js-live">${label('Знакомства на вечере')}<h3>ПБ.Миксер</h3><p>Фото · симпатии · взаимности</p>${has('verifying|loading|retry_auth|resume_check') ? '<div class="js-loading-indicator"><span></span><span></span><span></span></div>' : actions(s, {primary:'Открыть в Telegram'})}</article><div class="js-info-row">${icon('telegram')}<p>${has('verifying|loading|retry_auth|resume_check') ? 'Проверяем вход и участие' : 'Вход через твой аккаунт Telegram'}</p></div>` + note('Ты выбираешь, кому передать свой контакт. Лайк сам по себе его не раскрывает.'), 'rooms'];
    case 'identity':
      if (has('invalid_session')) return [t + hero('telegram') + `<article class="js-room js-surface"><h3>Вход ещё не подтверждён</h3><p>Открой приложение через бота в Telegram.</p>${actions(s)}</article>`,'rooms'];
      return [t + hero(has('expired|invalid|ошиб|истек') ? 'alert' : 'telegram') + `<article class="js-room js-surface">${label('Твой аккаунт')}<div class="js-account"><span class="js-avatar"></span><div><h3>Саша</h3><p>Аккаунт Telegram</p></div>${badge(has('checking|loading|pending') ? 'Проверяем' : 'Вход')}</div></article>${actions(s, {primary:'Продолжить'})}` + note('Чтобы попасть в комнату, нужно подтвердить участие в этом вечере.'), 'rooms'];
    case 'access_pending':
      return [t + hero('clock') + `<article class="js-room js-surface">${label('ПБ.Миксер')}${badge('Ждём подтверждения')}<h3>Подойди к организатору</h3><p>Покажи открытое приложение на стойке регистрации.</p><div class="js-progress-list"><span class="js-done">${icon('check')}Вход через Telegram</span><span>${icon('clock')}Подтверждение участия</span><span>${icon('rooms')}Комната вечера</span></div></article>${actions(s,{primary:'Проверить ещё раз',secondary:'Назад'})}`, 'rooms'];
    case 'access_denied':
      return [t + hero('lock') + `<article class="js-room js-surface">${label('Комната пока закрыта')}<h3>Нужна помощь организатора</h3><p>${esc(matches('conflict|linked|друг|связан|неоднознач') ? 'Не удалось однозначно подтвердить твоё участие. Организатор поможет разобраться.' : 'Для этой комнаты участие не подтверждено. Если ты на вечере, подойди на регистрацию.')}</p></article>${actions(s,{primary:'Проверить снова',secondary:'К комнатам'})}`,'rooms'];
    case 'rooms': {
      const empty = has('empty|no_event|no_room|available_rooms|нет|без');
      const waiting = has('before|not_open|not_started|waiting|готов|scheduled');
      const profileAction = /профил/i.test(s.secondary_label || '');
      return [t + (empty ? `<article class="js-room js-surface">${hero('rooms')}<h3>Найди свой вечер</h3><p>Открой ссылку или QR-код от организатора.</p>${actions(s,{primary:'Как попасть на вечер'})}</article>` : `<article class="js-room ${waiting ? 'js-surface' : 'js-live'}"><div class="js-pulse"><i></i>${waiting ? 'Скоро начнём' : 'Ты здесь'}</div><h3>ПБ.Миксер</h3><p>${waiting ? 'Участие подтверждено · лайки откроются позже' : '18 гостей с анкетой · голосование идёт'}</p><div class="js-room-row"><span>${has('match') ? '♥ 1 мэтч за вечер' : 'Пока без мэтчей'}</span>${pill(actionText(s,'primary_label','Смотреть'))}</div></article><div class="js-divider"></div>${label('Твои знакомства')}<article class="js-room js-surface"><h3>${profileAction ? 'Твоя карточка' : 'Твои мэтчи'}</h3><p>${profileAction ? 'Фото и несколько слов о себе.' : 'Взаимности появляются сразу.'}</p>${pill(actionText(s,'secondary_label','Смотреть'),'ghost')}</article>`) + note('Лайк не передаёт контакт. Разрешение нужно дать отдельно.'),'rooms', has('match') ? 1 : 0];
    }
    case 'profile':
      return [t + `<div class="js-profile-photo">${has('empty|new|incomplete|draft|fresh|photo_required_pending') ? `<div class="js-photo-placeholder">${icon('camera')}<span>Твоё фото</span></div>` : portrait('sasha')}</div>${pill('Выбрать фото','ghost')}<div class="js-field"><span>Имя</span><div class="js-input">Саша</div></div><div class="js-field"><span>О себе</span><div class="js-input js-textarea">${has('empty|new|incomplete|draft|fresh|photo_required_pending') ? '<span class="js-placeholder">О чём любишь разговаривать?</span>' : 'Люблю живую музыку и новые знакомства. Давай поговорим о любимых местах в городе.'}</div></div>${actions(s,{primary:'Сохранить профиль'})}` + (has('saved|ready|published') ? note('Профиль готов. Можно знакомиться.', 'js-positive') : ''),'profile'];
    case 'photo':
      if (has('photo_upload_failed')) return [t + `<div class="js-photo-preview">${portrait('sasha')}</div><div class="js-note js-warning">${icon('wifi')}<span>Не удалось загрузить фото. Выбранное изображение осталось здесь — проверь связь и повтори.</span></div>${actions(s)}`,'profile'];
      return [t + `<div class="js-photo-preview">${has('missing') ? `<div class="js-photo-placeholder">${icon('camera')}<span>Твоё фото</span></div>` : has('error|invalid|failed|rejected|size') ? `<div class="js-photo-placeholder js-photo-error">${icon('alert')}<span>Фото не загружено</span></div>` : portrait('sasha')}${has('crop|preview|ready|selected') ? '<div class="js-crop-grid" aria-hidden="true"></div>' : ''}</div>${has('upload|loading|progress') && !has('failed') ? `<div class="js-upload-progress"><span></span></div>${note('Загружаем фото…')}` : note(has('error|invalid|failed|rejected|size') ? 'Выбери другое изображение и попробуй ещё раз.' : has('missing') ? 'Фото не будет выбрано без твоего действия.' : 'Убедись, что на фото хорошо видно тебя.')}${actions(s,{primary:'Использовать фото',secondary:'Выбрать другое'})}`,'profile'];
    case 'catalog': {
      const empty = has('empty|none|no_candidates|no_guest|catalog_waiting');
      const filter = has('filter|audience_pending|preferences|selection');
      return [t + `<div class="js-catalog-toolbar"><span>ПБ.Миксер</span>${pill(filter ? 'Кого показывать' : 'Выбор гостей','ghost')}</div>${filter ? `<article class="js-room js-surface">${label('Твой выбор')}<h3>Кого показывать?</h3><p>Выбери аудиторию для знакомства.</p>${note('Здесь появятся варианты выбора.')}${actions(s,{primary:'Применить'})}</article>` : empty ? `<div class="js-empty">${hero('person')}<h3>Пока нет карточек</h3><p>Гости ещё присоединяются. Загляни чуть позже.</p>${actions(s,{primary:'Обновить'})}</div>` : personCard(s,has('^liked$|selected'))}${!filter && !empty ? `${pill(s.secondary_label,'ghost')}<p class="js-quiet">Контакт появится только после взаимности и отдельного согласия.</p>` : ''}`,'rooms'];
    }
    case 'likes': {
      if (has('like_sending|mutual_race')) return [t + personCard({...s,primary_label:'Сохраняем…',primary_disabled:true}) + `<article class="js-room js-surface"><div class="js-info-row">${icon('clock')}<p>Ждём подтверждения</p></div><div class="js-loading-indicator"><span></span><span></span><span></span></div><p>${has('mutual_race') ? 'Проверяем, взаимна ли ваша симпатия.' : 'Сохраняем твой выбор.'}</p></article>`,'rooms'];
      if (has('unlike_confirmation')) return [t + `<article class="js-room js-surface"><div class="js-mini-person">${portrait('mira',true)}<div><h3>Лера</h3><p>Твоя симпатия</p></div>${icon('heart')}</div>${note('Если симпатия была взаимной, мэтч перестанет быть актуальным. Уже увиденный контакт нельзя отозвать.')}${actions(s)}</article>`,'rooms'];
      if (has('source_conflict')) return [t + hero('alert') + `<article class="js-room js-surface"><h3>Нужна проверка выбора</h3><div class="js-progress-list"><span>${icon('person')}Выбор в приложении</span><span>${icon('alert')}Ручной ввод отличается</span><span>${icon('clock')}Проверка организатора</span></div>${actions(s)}</article>`,'rooms'];
      const offline = has('offline|failed|unsent|error|pending');
      const removed = has('removed|unliked|withdrawn');
      return [t + personCard({...s, primary_label: removed ? '♡ Нравится' : offline ? 'Повторить отправку' : '♥ Симпатия сохранена'}, !offline && !removed) + `<div class="js-note ${offline ? 'js-warning' : 'js-positive'}">${icon(offline ? 'wifi' : 'check')}<span>${esc(offline ? 'Симпатия пока не сохранена. Проверь связь и повтори.' : removed ? 'Симпатия снята.' : 'Твоя симпатия сохранена. Если она взаимная, мэтч появится сразу.')}</span></div>${actions(s)}`,'rooms'];
    }
    case 'matches_empty':
      if (has('match_ended')) return [t + hero('heart') + `<article class="js-room js-surface"><h3>Эта взаимность завершена</h3><p>Для этой пары контакт больше не выдаётся.</p>${actions(s)}</article>`,'matches'];
      if (has('manual_result')) return [t + hero('clock') + `<article class="js-room js-surface"><h3>Проверяем результат</h3><p>Обратись к организатору, чтобы получить свой итог.</p>${actions(s)}</article>`,'matches'];
      return [t + `<div class="js-empty">${hero('heart')}<h3>${matches('closed|final|закрыт|заверш|итог') ? 'В этот раз без мэтчей' : 'Пока без взаимностей'}</h3><p>${matches('closed|final|закрыт|заверш|итог') ? 'Спасибо, что знакомился. До встречи на следующем вечере ПБ.' : 'Отмечай тех, кто понравился. Как только симпатия станет взаимной, она появится здесь.'}</p>${actions(s,{primary:matches('closed|final|закрыт|заверш|итог') ? 'К комнатам' : 'Посмотреть гостей'})}</div>`,'matches'];
    case 'match':
      return [t + `<article class="js-room js-live js-match-hero">${label('Взаимная симпатия')}${pair()}<h3>Вы понравились<br>друг другу</h3><p>Ты и Лера · ПБ.Миксер</p></article><article class="js-room js-surface"><div class="js-info-row">${icon('lock')}<p>Контакты пока закрыты</p></div><p>Чтобы поделиться своим контактом, нужно отдельное разрешение.</p>${actions(s,{primary:'Перейти к согласию'})}</article>`,'matches',1];
    case 'consent': {
      if (has('policy_pending')) return [t + `<article class="js-room js-surface"><div class="js-mini-person">${portrait('mira',true)}<div><h3>Лера</h3><p>Взаимная симпатия</p></div></div><div class="js-divider"></div><div class="js-info-row">${icon('lock')}<p>Контакты закрыты</p></div><p>Передача контакта пока недоступна. Взаимная симпатия уже видна.</p></article>${actions({...s,primary_label:''},{secondary:'Назад к мэтчам'})}`,'matches',1];
      if (has('consent_revoke')) return [t + hero('lock') + `<article class="js-room js-surface">${label('Твоё разрешение для Леры')}<h3>${has('revoked') ? 'Контакт снова закрыт' : 'Остановить передачу'}</h3><p>${has('revoked') ? 'Контакт больше не выдаётся по этому разрешению.' : 'Подтверди, если больше не хочешь разрешать новые запросы на свой контакт.'}</p>${note('Уже увиденный контакт невозможно вернуть назад.')}${actions(s)}</article>`,'matches',1];
      if (has('contact_reconsent')) return [t + hero('lock') + `<article class="js-room js-surface"><h3>Новое значение закрыто</h3><p>Предыдущее разрешение не распространяется на новый контакт.</p>${actions(s)}</article>`,'matches',1];
      if (has('blanket_draft')) return [t + `<article class="js-room js-surface">${label('Взаимности этого вечера')}<h3>Отдельное общее разрешение</h3><div class="js-info-row">${icon('lock')}<p>Контакт пока закрыт</p></div><p>Охват разрешения и порядок его отзыва ещё нужно определить.</p>${actions(s)}</article>`,'matches',1];
      if (has('independent_offered')) return [t + `<article class="js-room js-surface"><div class="js-mini-person">${portrait('mira',true)}<div><h3>Лера</h3><p>Взаимная симпатия</p></div></div><div class="js-divider"></div><div class="js-info-row">${icon('check')}<p>Твой контакт разрешён для Леры</p></div><div class="js-info-row">${icon('lock')}<p>Контакт Леры пока закрыт</p></div>${actions(s)}</article>`,'matches',1];
      const waiting = has('waiting|pending_other|awaiting|one_approved|granted|approved');
      const declined = has('declined|refused|revoked|denied');
      const global = has('global|all_mutual|blanket');
      return [t + `<article class="js-room js-surface"><div class="js-mini-person">${portrait('mira',true)}<div><h3>Лера</h3><p>Взаимная симпатия</p></div></div><div class="js-divider"></div>${label(global ? 'Согласие для взаимностей' : 'Твой контакт для Леры')}${waiting ? `<div class="js-info-row">${icon('clock')}<p>Ждём разрешения Леры</p></div>` : declined ? '<p>Ты не разрешил передавать контакт.</p>' : `<p>${esc(global ? 'Разрешить передачу выбранного контакта людям, с которыми у тебя взаимность?' : 'Ты разрешаешь передать Лере этот контакт?')}</p><p class="js-contact-handle">@pb_demo_self</p>`}${waiting ? badge('Твоё разрешение получено','js-positive') : declined ? badge('Передача не разрешена') : `<div class="js-unchecked">${icon('lock')}<span>Ничего не разрешено заранее</span></div>`}</article>${waiting ? note('Контакты остаются закрытыми до разрешения обоих.') : declined ? note('Взаимная симпатия остаётся. Твой контакт не передан.') : note('Лайк и согласие на передачу контакта — два отдельных действия.')}${actions(s,{primary:waiting ? 'К мэтчу' : declined ? 'Вернуться к мэтчу' : 'Разрешить передачу', secondary:waiting || declined ? '' : 'Пока не передавать'})}`,'matches',1];
    }
    case 'contact':
      return [t + `<article class="js-room js-live">${label('Взаимная симпатия')}${pair()}<h3>Лера</h3></article><article class="js-room js-surface"><div class="js-info-row">${icon('check')}<p>Передача разрешена</p></div>${label('Контакт Леры')}<p class="js-contact-handle">@pb_demo_guest</p>${actions(s,{primary:'Открыть Telegram',secondary:'К мэтчам'})}</article>${note('Иллюстрация обмена после нужного согласия. Контакт вымышленный.')}`,'matches',1];
    case 'contact_missing':
      return [t + hero('person') + `<article class="js-room js-surface">${label('Твой контакт')}<h3>Как с тобой связаться?</h3><p>Для обмена нужен контакт, который ты готов передать.</p><div class="js-field"><span>Контакт</span><div class="js-input js-placeholder">Добавь способ связи</div></div>${note('Контакт не появится в карточке и не передастся без отдельного разрешения.')}</article>${actions(s,{primary:'Сохранить контакт',secondary:'Позже'})}`,'profile'];
    case 'notification': {
      if (has('paper_review')) return [t + hero('clock') + `<article class="js-room js-surface"><h3>Резервный выбор на проверке</h3><p>Организатор сверит твои симпатии и поможет получить результат.</p>${note('Передача контакта и здесь требует отдельного разрешения.')}${actions(s)}</article>`,'matches'];
      const denied = has('denied|declined|blocked|disabled|refused|failed');
      const incoming = has('received|message|sent|delivered|notification_enabled|final_notification') && !denied;
      return [t + hero('bell') + (incoming ? `<article class="js-bot-message"><div class="js-bot-head">${icon('telegram')}<strong>ПБ Мэтч</strong><span>бот</span></div><p>${matches('final|closed|итог') ? 'Результаты твоего вечера готовы.' : 'У тебя новая взаимная симпатия ♥'}</p><p>Посмотреть результат можно в приложении.</p>${pill(s.primary_label || 'Открыть ПБ Мэтч','yellow')}</article>` : `<article class="js-room js-surface"><h3>${denied ? 'Результат есть в приложении' : 'Узнай о взаимности'}</h3><p>${denied ? 'Сообщения от бота отключены. Ты можешь посмотреть свои мэтчи здесь.' : 'Разреши боту написать тебе, когда появится взаимная симпатия.'}</p>${actions(s,{primary:denied ? 'Посмотреть мэтчи' : 'Разрешить сообщения',secondary:denied ? 'Настроить уведомления' : 'Сейчас не нужно'})}</article>`) + note('Контакты гостей в уведомлении не показываются.'),'matches',incoming ? 1 : 0];
    }
    case 'event_closed':
      if (has('stale_result')) return [t + hero('lock') + `<article class="js-room js-surface"><h3>Проверим актуальный доступ</h3><p>Старая взаимность или доступ к событию могли измениться. Контакт не показывается.</p>${actions(s)}</article>`,'matches'];
      return [t + `<article class="js-room js-surface">${badge('Голосование завершено')}<h3>ПБ.Миксер</h3><p>Новые симпатии на этом вечере больше не принимаются.</p></article>${matches('empty|none|no_match|без мэтч|нет взаим') ? `<div class="js-empty">${hero('heart')}<h3>В этот раз без мэтчей</h3><p>Спасибо за вечер. До встречи на ПБ!</p></div>` : `<article class="js-room js-surface">${label('Твои результаты')}<div class="js-mini-person">${portrait('mira',true)}<div><h3>Лера</h3><p>Взаимная симпатия</p></div>${icon('heart')}</div>${note('Контакт остаётся закрытым без отдельного согласия.')}</article>`}${actions(s,{primary:'Посмотреть результаты'})}`,'matches', matches('empty|none|no_match|без мэтч') ? 0 : 1];
    case 'error': {
      if (has('manual_fallback')) return [t + hero('person') + `<article class="js-room js-surface"><h3>Подойди к организатору</h3><p>Он поможет со входом и голосованием. Бумажный резерв для пилота обсуждается.</p>${actions(s)}</article>`,'rooms'];
      const offline = matches('network|offline|connection|связ|сеть|отправ|сохран');
      return [t + hero(offline ? 'wifi' : 'alert') + `<article class="js-room js-surface"><h3>${offline ? 'Попробуем ещё раз' : 'Нужен новый вход'}</h3><p>${esc(offline ? 'Не удалось выполнить действие. Проверь интернет и повтори.' : 'Открой приложение заново через Telegram. Если проблема останется, обратись к организатору.')}</p></article>${offline ? note('Последнее действие пока не подтверждено. Мы не показываем его как сохранённое.','js-warning') : ''}${actions(s,{primary:offline ? 'Повторить' : 'Открыть заново',secondary:'К комнатам'})}`,'rooms'];
    }
    case 'moderation': {
      const restricted = has('blocked|excluded|restricted|removed');
      const reported = has('reported|submitted|sent|complete|report_review');
      return [t + hero(restricted ? 'lock' : 'alert') + `<article class="js-room js-surface"><h3>${restricted ? 'Участие ограничено' : reported ? 'Организатор получил сообщение' : 'Помощь организатора'}</h3><p>${esc(restricted ? 'Чтобы разобраться, обратись к организатору вечера.' : reported ? 'Если нужна помощь сейчас, подойди к организатору лично.' : 'Если тебе некомфортно или нужна помощь, расскажи организатору.')}</p>${!restricted && !reported ? `<div class="js-field"><span>Что произошло?</span><div class="js-input js-textarea js-placeholder">Напиши несколько слов</div></div>` : ''}</article>${actions(s,{primary:restricted ? 'Проверить статус' : reported ? 'К комнате' : 'Отправить сообщение',secondary:reported || restricted ? '' : 'Отмена'})}`,'rooms'];
    }
    case 'deleted': {
      if (has('delete_scope_pending')) return [t + hero('trash') + `<article class="js-room js-surface"><h3>Уточняем порядок удаления</h3><p>Объём удаления и сроки хранения ещё нужно определить.</p>${actions(s)}</article>`,'profile'];
      const done = has('deleted|complete|done|success') && !has('confirm|request');
      return [t + hero(done ? 'check' : 'trash') + `<article class="js-room js-surface"><h3>${done ? 'Профиль удалён' : 'Удалить профиль?'}</h3><p>${esc(done ? 'Твоя карточка больше не показывается гостям.' : 'Карточка больше не будет видна гостям. Перед удалением нужно подтвердить действие.')}</p>${!done ? note('Удаление не может стереть контакт, который другой человек уже увидел.') : ''}</article>${actions(s,{primary:done ? 'К комнатам' : 'Подтвердить удаление',secondary:done ? '' : 'Оставить профиль',variant:done ? 'yellow' : 'orange'})}`,'profile'];
    }
    default:
      return [t + `<article class="js-room js-surface">${hero('rooms')}<p>Этот экран нужно уточнить перед реализацией.</p>${actions(s,{primary:'Назад'})}</article>`,'rooms'];
  }
}

/** Pure presentation: input strings are escaped, buttons perform no API actions. */
export function renderScreen(step, scenario = {}) {
  const screen = step?.screen || {kind:'error',heading:'Экран не найден'};
  const [body, active, count] = draw(screen, scenario);
  const current = scenario.scope === 'mvp' || scenario.preview_context === 'future_room';
  const footer = current && ['qr','key','blocked','admin_participants','admin_access','bot_message'].includes(screen.kind) ? '' : tabs(active,count,current);
  const stepIndex = scenario.steps?.indexOf(step) ?? -1;
  const mockupId = scenario.id && stepIndex >= 0 ? `${scenario.id}.${String(stepIndex + 1).padStart(2, '0')}` : 'Макет';
  const mockupTitle = step?.title || screen.heading || 'Экран';
  const mockupLabel = `${mockupId} — ${mockupTitle}`;
  const reviewHash = scenario.id && stepIndex >= 0 ? `#${scenario.id}?step=${stepIndex + 1}` : '';
  const caption = `<div class="mockup-caption" data-mockup-label="${esc(mockupLabel)}"><span class="mockup-code">${esc(mockupId)}</span><span class="mockup-title">${esc(mockupTitle)}</span><button type="button" class="mockup-note" data-review-notes data-review-context="${esc(mockupLabel)}" data-review-hash="${esc(reviewHash)}" aria-label="${esc('Замечание к ' + mockupLabel)}">Правка</button></div>`;
  return caption + `<section class="journey-phone" data-screen-kind="${esc(screen.kind)}" role="group" aria-label="${esc(screen.heading || step?.title || 'Макет экрана')}"><header class="js-bar"><div class="js-mark">ПБ<span>·</span>мэтч</div><span class="js-avatar" aria-hidden="true"></span></header><div class="js-body">${body}</div>${footer}</section>`;
}

