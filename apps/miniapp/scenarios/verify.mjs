// Offline verification of the review artifact, not Telegram/business API tests.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {renderScreen, screenKinds} from './screens.js';

const data = JSON.parse(readFileSync(new URL('./data/scenarios.json', import.meta.url), 'utf8'));
const historical = JSON.parse(readFileSync(new URL('./data/scenarios-2026-10-05.json', import.meta.url), 'utf8'));
const ids = new Set();
let states = 0;
for (const scenario of data.scenarios) {
  assert.match(scenario.id, /^U\d{2}$/);
  assert(!ids.has(scenario.id), `Duplicate ID ${scenario.id}`);
  ids.add(scenario.id);
  assert(['mvp', 'archive'].includes(scenario.scope));
  assert(['confirmed', 'mixed', 'proposal'].includes(scenario.status));
  assert(data.categories.some(c => c.id === scenario.category));
  assert(scenario.steps.length);
  for (const field of ['preconditions', 'source_refs', 'question_ids', 'exceptions', 'decisions_needed']) assert(Array.isArray(scenario[field]));
  for (const step of scenario.steps) {
    assert(screenKinds.includes(step.screen.kind), `${scenario.id}/${step.id}: unknown screen kind`);
    const html = renderScreen(step, scenario);
    assert(html.includes(`data-screen-kind="${step.screen.kind}"`));
    assert(!html.includes('Этот экран нужно уточнить перед реализацией.'), `${scenario.id}/${step.id}: fallback`);
    assert(!html.includes('undefined'));
    assert(!/https?:\/\/|<iframe|<script/i.test(html), `${scenario.id}/${step.id}: unexpected remote resource`);
    if (scenario.scope === 'mvp') {
      assert(!html.includes('Бейдж 12'), `${scenario.id}: unaccepted badge field in current phone`);
      assert(!html.includes('Ждём разрешения Леры'), `${scenario.id}: both-grant policy in current phone`);
      assert(!html.includes('Контакты остаются закрытыми до разрешения обоих'), `${scenario.id}: both-grant policy`);
    }
    states++;
  }
}
for (const old of historical.scenarios) {
  const retained = data.scenarios.find(s => s.id === old.id);
  assert(retained, `Historical deep link missing ${old.id}`);
  if (retained.scope === 'archive') {
    assert.deepEqual(retained.steps, old.steps, `${old.id}: archived steps changed`);
    assert(retained.archive_note);
  }
}
for (const path of data.main_path) assert(data.scenarios.some(s => s.id === path.id && s.scope === 'mvp'));
const byId = id => data.scenarios.find(s => s.id === id);
for (const id of ['U23','U25','U34','U35','U37','U38']) assert.equal(byId(id).scope, 'archive');
for (const id of ['U02','U17','U21','U28']) assert(byId(id).migrated_to, `${id}: lost mandatory check`);
assert(byId('U01').steps.some(st => st.screen.state === 'invalid_session'));
assert(byId('U24').steps.some(st => st.screen.state === 'contact_reconsent'));
assert(byId('U42').summary.includes('Старые мэтчи остаются'));
assert(byId('U44').steps.some(st => st.response.includes('старые мэтчи')));
// P-027: the first room never asks for a key, including new guests later.
for (const scenario of data.scenarios.filter(s => s.scope === 'mvp')) {
  assert(scenario.steps.every(st => st.screen.kind !== 'key'), `${scenario.id}: a key became mandatory in the base room`);
}
const baseEntry = byId('U01').steps.find(st => st.screen.state === 'base_room_entry');
assert(baseEntry, 'Missing server-checked Telegram entry into the base room');
assert(baseEntry.response.includes('Telegram-сессию') && baseEntry.response.includes('блокировку'));
assert.equal(baseEntry.id, 'key_entry', 'Legacy U01.02 step identity was lost');
assert(baseEntry.legacy_id_note.includes('P-027'));
const baseEntryHTML = renderScreen(baseEntry, byId('U01'));
assert(!baseEntryHTML.includes('js-input'), 'Base-room entry still has a key input');
assert(baseEntryHTML.includes('без ключа') && baseEntryHTML.includes('отдельные действия'));
assert(byId('U36').steps.some(st => st.id === 'resume' && st.response.includes('без ключа')));
assert(byId('U36').steps.some(st => st.id === 'new_guest' && st.response.includes('без ключа') && st.response.includes('отдельно')));
assert.equal(byId('U41').scope, 'archive', 'Future room keys leaked into mandatory MVP');
assert.equal(byId('U41').preview_context, 'future_room');
assert(byId('U41').archive_note.includes('последующих комнат'));
assert(!data.main_path.some(st => st.id === 'U41'));
assert(byId('U41').steps.every(st => st.screen.kind === 'key'));
assert(renderScreen(byId('U41').steps[0], byId('U41')).includes('Вариант следующей комнаты'));
assert(byId('U43').steps.some(st => st.response.includes('блокировка') && st.response.includes('без ключа')));
assert(byId('U44').steps.every(st => st.screen.kind === 'blocked'));
assert(byId('U44').steps.some(st => st.response.includes('без ключа') && st.response.includes('не отменяет блокировку')));
const escaped = renderScreen({screen:{kind:'key', heading:'<img src=x onerror=alert(1)>'}}, {scope:'mvp'});
assert(escaped.includes('&lt;img'));
assert(!escaped.includes('<img src=x'));
console.log(`OK: ${data.scenarios.filter(s => s.scope === 'mvp').length} MVP + ${data.scenarios.filter(s => s.scope === 'archive').length} archive; ${states} rendered steps; ${historical.scenarios.length} old IDs preserved.`);
