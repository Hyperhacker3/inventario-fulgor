type Entry = { close: () => void; busy: () => boolean };
type Registry = { entries: Entry[]; sentinel: boolean; skipping: boolean; state: unknown };
const registries = new WeakMap<Window, Registry>();
const marker = 'fulgorDialog';

function registry(win: Window) {
  let value = registries.get(win);
  if (value) return value;
  value = { entries: [], sentinel: false, skipping: false, state: null };
  const current = value;
  registries.set(win, current);
  win.addEventListener('popstate', event => {
    if (current.skipping) {
      current.skipping = false; event.stopImmediatePropagation();
      if (current.entries.length && !current.sentinel) {
        win.history.pushState({ [marker]: true }, '', win.location.href); current.sentinel = true;
      }
      return;
    }
    const top = current.entries.at(-1);
    if (!top) return;
    event.stopImmediatePropagation();
    current.sentinel = false;
    if (!top.busy()) top.close();
    win.setTimeout(() => {
      if (current.entries.length && !current.sentinel) {
        win.history.pushState({ [marker]: true }, '', win.location.href);
        current.sentinel = true;
      }
    }, 0);
  }, true);
  return current;
}

export function registerDialogBack(win: Window, close: () => void, busy: () => boolean) {
  const current = registry(win), entry = { close, busy };
  current.entries.push(entry);
  if (!current.sentinel && !current.skipping) {
    current.state = win.history.state;
    win.history.pushState({ [marker]: true }, '', win.location.href);
    current.sentinel = true;
  }
  return () => {
    current.entries = current.entries.filter(value => value !== entry);
    if (!current.entries.length && current.sentinel) {
      current.sentinel = false;
      if (win.history.state?.[marker]) { current.skipping = true; win.history.back(); }
    }
  };
}

export function navigateWithDialogs(win: Window, url: string) {
  const current = registries.get(win);
  if (current?.sentinel && win.history.state?.[marker]) {
    win.history.replaceState(current.state, '', url);
    current.sentinel = false;
  } else win.history.pushState(null, '', url);
}
