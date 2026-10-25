// Founding Five Thousand — in-game "Seat open!" notice (ships with kibble-pay seat tracker).
// Polls https://kibble-pay.vercel.app/api/tech → foundingFiveThousand.
// When a seat is open (or a recent open event arrives), shows an in-town notice with plain-language how-to-qualify.
// Title only — never returns / investment language.
export const API = "https://kibble-pay.vercel.app";
export const POLL_MS = 60_000;
export const STORAGE_KEY = "inu.founding.dismissedOpenAt";

export const HOW_TO_BRIEF = [
  "10 seats. Send US$5,000 of $KIBBLE (amount SENT, before fees).",
  "First to hit that threshold get a seat + the Founding Five Thousand title.",
  "Title is permanent — sale or price drop does not remove it.",
  "If a seat-holder sells, they keep the title; the seat opens for the next person who puts in $5,000.",
  "Cosmetic title only — promises nothing. Not financial advice.",
];

export const NOTICE_TITLE = "Seat open!";
export const NOTICE_LEAD = "A Founding Five Thousand seat is open in town.";

export function shouldShowNotice(f, { dismissedAt = null } = {}) {
  // In-town notice is for a seat that opened (sell / freed), not the initial empty tracker.
  if (!f || f.status !== "live") return false;
  if (!(Number(f.openSeats || 0) > 0)) return false;
  const evAt = f.recentOpen?.at;
  if (evAt == null) return false;
  if (dismissedAt != null && Number(dismissedAt) >= Number(evAt)) return false;
  return true;
}

export function noticeKey(f) {
  return String(f?.recentOpen?.at || (f?.openSeats > 0 ? "open" : "none"));
}

export function buildNoticeCopy(f) {
  const n = Number(f?.openSeats || 0);
  const seatBit = f?.recentOpen?.seat != null
    ? `Seat #${f.recentOpen.seat} just opened.`
    : (n === 1 ? "1 seat is open now." : `${n} seats are open now.`);
  return {
    title: NOTICE_TITLE,
    lead: NOTICE_LEAD,
    detail: seatBit,
    howTo: (f?.howToQualify?.bullets?.length ? f.howToQualify.bullets : HOW_TO_BRIEF),
    disclaimer: f?.howToQualify?.disclaimer
      || "Cosmetic title only — promises nothing. Not financial advice. Only put in what you can afford to lose.",
    trackerUrl: f?.trackerUrl || (API + "/inu/tech#seats-sec"),
    rulesUrl: f?.rulesUrl || (API + "/inu/pages/founding-five-thousand.html"),
    filled: f?.filledSeats ?? 0,
    open: n,
    total: f?.seatsTotal ?? 10,
  };
}

export async function fetchFounding({ apiBase = API, f = globalThis.fetch } = {}) {
  try {
    const r = await f(apiBase + "/api/tech", { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.foundingFiveThousand || null;
  } catch {
    return null;
  }
}

function readDismissed(store) {
  try { return Number(store?.getItem?.(STORAGE_KEY) || "0") || 0; } catch { return 0; }
}
function writeDismissed(store, at) {
  try { store?.setItem?.(STORAGE_KEY, String(at || Date.now())); } catch {}
}

/** Mount a dismissible in-game notice card (not just a toast). */
export function showNotice(copy, {
  doc = globalThis.document,
  onDismiss = () => {},
  openUrl = (u) => { try { globalThis.open(u, "_blank", "noopener"); } catch {} },
} = {}) {
  if (!doc) return null;
  let el = doc.getElementById("founding-seat-notice");
  if (!el) {
    el = doc.createElement("div");
    el.id = "founding-seat-notice";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", NOTICE_TITLE);
    doc.body.appendChild(el);
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const bullets = (copy.howTo || []).map((b) => `<li>${esc(b)}</li>`).join("");
  el.innerHTML = `<div class="fsn-card">
    <button type="button" class="fsn-x" aria-label="Dismiss">×</button>
    <div class="fsn-badge">Founding Five Thousand</div>
    <h2>${esc(copy.title)}</h2>
    <p class="fsn-lead"><b>${esc(copy.lead)}</b> ${esc(copy.detail)} Seats filled: ${esc(copy.filled)} / ${esc(copy.total)}.</p>
    <p class="fsn-h">How to get a seat</p>
    <ul>${bullets}</ul>
    <p class="fsn-disc">${esc(copy.disclaimer)}</p>
    <div class="fsn-row">
      <button type="button" class="fsn-btn" data-act="tracker">Seat tracker</button>
      <button type="button" class="fsn-btn alt" data-act="rules">Full rules</button>
      <button type="button" class="fsn-btn ghost" data-act="ok">Got it</button>
    </div>
  </div>`;
  el.className = "show";
  const dismiss = () => { el.className = ""; onDismiss(); };
  el.querySelector(".fsn-x").onclick = dismiss;
  el.querySelector('[data-act="ok"]').onclick = dismiss;
  el.querySelector('[data-act="tracker"]').onclick = () => { openUrl(copy.trackerUrl); };
  el.querySelector('[data-act="rules"]').onclick = () => { openUrl(copy.rulesUrl); };
  return el;
}

export function ensureStyles(doc = globalThis.document) {
  if (!doc || doc.getElementById("founding-seat-style")) return;
  const s = doc.createElement("style");
  s.id = "founding-seat-style";
  s.textContent = `
#founding-seat-notice{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:rgba(8,12,28,.55);padding:16px}
#founding-seat-notice.show{display:flex}
#founding-seat-notice .fsn-card{position:relative;max-width:520px;width:100%;background:#1a2440;color:#fff6e0;border:3px solid #f2cc68;box-shadow:0 0 0 3px #0b1020;padding:16px 18px 14px;font:14px/1.45 Silkscreen,system-ui,sans-serif}
#founding-seat-notice .fsn-x{position:absolute;top:6px;right:8px;background:transparent;border:0;color:#f2cc68;font-size:22px;cursor:pointer;line-height:1}
#founding-seat-notice .fsn-badge{display:inline-block;background:#f2cc68;color:#1a2440;font-size:11px;padding:2px 8px;margin-bottom:6px;text-transform:uppercase}
#founding-seat-notice h2{margin:0 0 8px;font-size:22px;color:#f2cc68}
#founding-seat-notice .fsn-lead{margin:0 0 10px}
#founding-seat-notice .fsn-h{margin:8px 0 4px;font-size:12px;text-transform:uppercase;color:#f2cc68}
#founding-seat-notice ul{margin:0 0 10px;padding-left:1.2em}
#founding-seat-notice li{margin:3px 0}
#founding-seat-notice .fsn-disc{font-size:12px;color:#cfd3dc;margin:0 0 12px}
#founding-seat-notice .fsn-row{display:flex;flex-wrap:wrap;gap:8px}
#founding-seat-notice .fsn-btn{font:inherit;font-size:12px;padding:6px 12px;border:2px solid #f2cc68;background:#f2cc68;color:#1a2440;cursor:pointer}
#founding-seat-notice .fsn-btn.alt{background:transparent;color:#f2cc68}
#founding-seat-notice .fsn-btn.ghost{background:transparent;border-color:#6a7390;color:#cfd3dc}
`;
  doc.head.appendChild(s);
}

/**
 * Start polling. Shows the in-game notice when a seat is open (once per open event).
 * ?seatopen=1 forces a preview notice (dev).
 */
export function startFoundingNotice({
  apiBase = API,
  f = globalThis.fetch,
  doc = globalThis.document,
  store = globalThis.localStorage,
  search = (typeof location !== "undefined" ? location.search : ""),
  interval = POLL_MS,
  toast = () => {},
  onShow = () => {},
  setT = globalThis.setTimeout?.bind(globalThis),
  clearT = globalThis.clearTimeout?.bind(globalThis),
} = {}) {
  ensureStyles(doc);
  const forced = (() => { try { return new URLSearchParams(search).get("seatopen") === "1"; } catch { return false; } })();
  const S = { current: null, stopped: false, shownKey: null };
  let timer = null;

  function present(fnd) {
    if (!shouldShowNotice(fnd, { dismissedAt: readDismissed(store) }) && !forced) return;
    const key = noticeKey(fnd);
    if (!forced && S.shownKey === key) return;
    S.shownKey = key;
    const copy = buildNoticeCopy(fnd || {
      openSeats: 1, filledSeats: 0, seatsTotal: 10, status: "live",
      howToQualify: { bullets: HOW_TO_BRIEF },
    });
    showNotice(copy, {
      doc,
      onDismiss: () => {
        writeDismissed(store, fnd?.recentOpen?.at || Date.now());
      },
    });
    try { toast(NOTICE_TITLE + " " + copy.detail, "good"); } catch {}
    try { onShow(copy, fnd); } catch {}
  }

  async function tick() {
    timer = null;
    if (S.stopped) return;
    if (doc?.hidden) { schedule(); return; }
    if (forced && !S.current) {
      S.current = { status: "live", openSeats: 1, filledSeats: 0, seatsTotal: 10, howToQualify: { bullets: HOW_TO_BRIEF } };
      present(S.current);
      schedule();
      return;
    }
    const fnd = await fetchFounding({ apiBase, f });
    S.current = fnd;
    if (fnd) present(fnd);
    schedule();
  }
  function schedule() { if (!S.stopped && !timer && setT) timer = setT(tick, interval); }
  const onVis = () => {
    if (S.stopped) return;
    if (doc?.hidden) { if (timer) { clearT?.(timer); timer = null; } }
    else if (!timer) tick();
  };
  try { doc?.addEventListener?.("visibilitychange", onVis); } catch {}
  S.stop = () => { S.stopped = true; if (timer) clearT?.(timer); timer = null; try { doc?.removeEventListener?.("visibilitychange", onVis); } catch {} };
  S.refresh = () => { if (timer) { clearT?.(timer); timer = null; } return tick(); };
  tick();
  return S;
}
