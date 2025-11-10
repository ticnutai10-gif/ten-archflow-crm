const LS_KEY = "app-debug-logs";
const EVT = "debuglog:changed";
const MAX = 1000;

function _read() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function _write(items) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items.slice(-MAX)));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function logEntry({ level = "info", source = "app", event = "", message = "", data = null }) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    source,
    event,
    message,
    data,
  };
  const items = _read();
  items.push(entry);
  _write(items);
  return entry;
}

export const logInfo = (source, event, message = "", data = null) =>
  logEntry({ level: "info", source, event, message, data });
export const logWarn = (source, event, message = "", data = null) =>
  logEntry({ level: "warn", source, event, message, data });
export const logError = (source, event, message = "", data = null) =>
  logEntry({ level: "error", source, event, message, data });

export function listLogs() {
  return _read().slice().reverse();
}

export function clearLogs() {
  _write([]);
}

export function subscribeToLogs(callback) {
  const handler = () => {
    try {
      callback(listLogs());
    } catch {}
  };
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}