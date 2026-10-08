"use strict";
// Review notes remain in this browser. No requests or app state are sent anywhere.
(() => {
  const storageKey = "pbmatch.review.notes.v1";
  let notes = [];
  let storageUsable = true;
  let storageWarning = "";
  let returnFocus = null;

  const node = (tag, className, text) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  };
  function loadNotes() {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed) || parsed.some(item => !item ||
          typeof item.text !== "string" || typeof item.context !== "string" ||
          typeof item.url !== "string" || typeof item.createdAt !== "string")) {
        throw new Error("Invalid notes format");
      }
      notes = parsed;
    } catch {
      storageUsable = false;
      storageWarning = "Не получилось прочитать хранилище. Новые записи останутся только в этой вкладке: скопируй или скачай их до закрытия.";
    }
  }
  loadNotes();

  const dialog = node("dialog", "review-dialog");
  dialog.setAttribute("aria-labelledby", "review-notes-title");
  const head = node("div", "review-dialog-head");
  const title = node("h2", "", "Мои замечания");
  title.id = "review-notes-title";
  const close = node("button", "review-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Закрыть замечания");
  head.append(title, close);
  const body = node("div", "review-dialog-body");
  body.append(node("p", "review-local-label", "Только в браузере этого телефона, без синхронизации. Для передачи скопируй или скачай общий текст."));
  const form = node("form");
  const contextLabel = node("label", "", "Экран или сценарий");
  contextLabel.htmlFor = "review-note-context";
  const context = node("input", "review-input");
  context.id = "review-note-context";
  context.type = "text";
  context.autocomplete = "off";
  context.maxLength = 500;
  const textLabel = node("label", "", "Что хочется изменить?");
  textLabel.htmlFor = "review-note-text";
  const textInput = node("textarea", "review-textarea");
  textInput.id = "review-note-text";
  textInput.maxLength = 4000;
  textInput.required = true;
  textInput.placeholder = "Что ты нажал, чего ожидал и что увидел…";
  const save = node("button", "review-action review-save", "Сохранить замечание");
  save.type = "submit";
  form.append(contextLabel, context, node("p", "review-context-hint", "Ссылка на текущую страницу приложится автоматически."), textLabel, textInput, save);
  const feedback = node("p", "review-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  const listTitle = node("h3", "review-list-title");
  const list = node("ol", "review-note-list");
  const empty = node("p", "review-empty", "Пока нет замечаний. Добавь первую запись после просмотра экрана.");
  const actions = node("div", "review-actions");
  const copy = node("button", "review-action", "Скопировать всё");
  const download = node("button", "review-action", "Скачать .txt");
  const clear = node("button", "review-action review-clear", "Очистить записи");
  [copy, download, clear].forEach(button => { button.type = "button"; });
  actions.append(copy, download, clear);
  const copyLabel = node("p", "review-copy-label", "Выдели текст и скопируй вручную:");
  const fallback = node("textarea", "review-copy-fallback");
  fallback.readOnly = true;
  fallback.setAttribute("aria-label", "Все замечания для ручного копирования");
  copyLabel.hidden = fallback.hidden = true;
  body.append(form, feedback, listTitle, list, empty, actions, copyLabel, fallback);
  dialog.append(head, body);
  document.body.append(dialog);

  const stamp = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
  };
  function render() {
    document.querySelectorAll("[data-review-count]").forEach(count => {
      count.textContent = String(notes.length);
      count.setAttribute("aria-label", `Сохранено записей: ${notes.length}`);
    });
    listTitle.textContent = `Сохранено: ${notes.length}`;
    list.replaceChildren();
    for (const item of [...notes].reverse()) {
      const entry = node("li", "review-note");
      entry.append(node("p", "review-note-context", item.context || "Без названия экрана"),
        node("p", "review-note-time", stamp(item.createdAt)),
        node("p", "review-note-text", item.text),
        node("p", "review-note-url", item.url));
      list.append(entry);
    }
    empty.hidden = notes.length > 0;
    copy.disabled = download.disabled = clear.disabled = notes.length === 0;
  }
  function currentContext() {
    const mapDialog = document.querySelector(".situation-modal[open]");
    if (mapDialog) {
      const caption = mapDialog.querySelector("[data-mockup-label]");
      if (caption) return caption.dataset.mockupLabel;
      return [mapDialog.querySelector("#situation-title")?.textContent,
        mapDialog.querySelector(".step-counter")?.textContent].filter(Boolean).join(" · ");
    }
    const demoPanel = document.querySelector("main.screen section[id$='-panel']:not([hidden])");
    if (demoPanel) return document.querySelector("#demo-mockup-caption")?.dataset.mockupLabel || `Текущий макет · ${demoPanel.querySelector("h1")?.textContent || "экран"}`;
    const detail = document.querySelector("#scenario-detail");
    if (detail && !document.querySelector("#workspace")?.hidden) {
      const allScreens = detail.querySelector('[data-view="all"][aria-pressed="true"]');
      const caption = detail.querySelector("[data-mockup-label]");
      if (!allScreens && caption) return caption.dataset.mockupLabel;
      const stepContext = detail.querySelector('[data-view="all"][aria-pressed="true"]')
        ? "Все экраны" : detail.querySelector(".step-counter")?.textContent;
      return [location.hash.split("?")[0].replace("#", ""),
        detail.querySelector(".detail-header h2")?.textContent,
        stepContext].filter(Boolean).join(" · ");
    }
    return document.querySelector("#page-title, #review-title")?.textContent.replace(/\s+/g, " ").trim() || document.title;
  }
  let capturedUrl = "";
  function openNotes(event) {
    if (dialog.open) return;
    returnFocus = event?.currentTarget || document.activeElement;
    const reviewUrl = new URL(location.href);
    if (returnFocus?.dataset.reviewHash) reviewUrl.hash = returnFocus.dataset.reviewHash;
    capturedUrl = reviewUrl.href;
    context.value = returnFocus?.dataset.reviewContext || currentContext();
    feedback.textContent = storageWarning;
    copyLabel.hidden = fallback.hidden = true;
    render();
    dialog.showModal();
    textInput.focus({preventScroll:true});
  }
  document.addEventListener("click", event => {
    const launcher = event.target.closest("[data-review-notes]");
    if (launcher) {
      event.preventDefault();
      openNotes({currentTarget: launcher});
    }
  });
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const text = textInput.value.trim();
    if (!text) {
      feedback.textContent = "Напиши замечание, чтобы сохранить его.";
      textInput.focus();
      return;
    }
    notes.push({text, context: context.value.trim(), url: capturedUrl, createdAt: new Date().toISOString()});
    if (storageUsable) {
      try { localStorage.setItem(storageKey, JSON.stringify(notes)); }
      catch {
        storageUsable = false;
        storageWarning = "Хранилище браузера недоступно. Записи остаются только в этой вкладке: скопируй или скачай их до закрытия.";
      }
    }
    render();
    textInput.value = "";
    feedback.textContent = storageUsable ? "Сохранено в браузере этого телефона." : storageWarning;
    copyLabel.hidden = fallback.hidden = true;
  });
  function exportText() {
    return "ПБ Мэтч · замечания по стенду\n\n" + notes.map((item, index) =>
      `${index + 1}. ${item.context || "Без названия экрана"}\n${stamp(item.createdAt)}\n${item.url}\n${item.text}`).join("\n\n———\n\n");
  }
  copy.addEventListener("click", async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(exportText());
      feedback.textContent = "Все замечания скопированы. Теперь можно вставить их в сообщение.";
      copyLabel.hidden = fallback.hidden = true;
    } catch {
      fallback.value = exportText();
      copyLabel.hidden = fallback.hidden = false;
      feedback.textContent = "Автоматическое копирование недоступно. Скопируй выделенный текст вручную.";
      fallback.focus();
      fallback.select();
      fallback.setSelectionRange(0, fallback.value.length);
    }
  });
  download.addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob(["\uFEFF", exportText()], {type: "text/plain;charset=utf-8"}));
    const link = node("a");
    link.href = url;
    link.download = `pbmatch-notes-${new Date().toISOString().slice(0, 10)}.txt`;
    body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    feedback.textContent = "Текст подготовлен к скачиванию. Если браузер открыл его для просмотра, сохрани через меню «Поделиться».";
  });
  clear.addEventListener("click", () => {
    if (!window.confirm("Удалить все замечания из этого браузера? Сначала скопируй или скачай то, что нужно сохранить.")) return;
    try {
      localStorage.removeItem(storageKey);
      notes = [];
      storageUsable = true;
      storageWarning = "";
      feedback.textContent = "Все записи удалены из этого браузера.";
    } catch {
      if (storageUsable) {
        feedback.textContent = "Не удалось очистить хранилище браузера. Записи сохранены; попробуй ещё раз.";
        return;
      }
      notes = [];
      feedback.textContent = "Записи этой вкладки очищены. Хранилище браузера недоступно.";
    }
    render();
    copyLabel.hidden = fallback.hidden = true;
  });
  window.addEventListener("storage", event => {
    if ((event.key === storageKey || event.key === null) && storageUsable) {
      loadNotes();
      render();
      if (dialog.open) feedback.textContent = storageWarning || "Записи обновлены из другой вкладки этого браузера.";
    }
  });
  render();
})();
