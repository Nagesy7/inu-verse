// Light burn-to-vote notice for the Daily Bone / plaza (hub owns casting).
// Data: GET https://kibble-pay.vercel.app/api/vote — player-burn weight only; never autoburn.
export const API = 'https://kibble-pay.vercel.app';
export const HUB = 'https://kibble-pay.vercel.app/inu/tech#vote-sec';
export const DISCLAIMER = 'Promo / Academy theme votes only. Never redirects auto-burn. Not financial advice.';

export async function fetchVoteNotice({ apiBase = API, fetch: f = globalThis.fetch } = {}) {
  try {
    const r = await f(apiBase + '/api/vote', { cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d?.enabled || !d.polls?.length) return null;
    const p = d.polls[0];
    const top = p.tally?.options?.[0];
    return {
      title: p.title || 'Community vote',
      leading: top?.label || null,
      sharePct: top?.sharePct ?? null,
      softCapUi: d.softCapUi,
      maxVotes: d.maxVotesPerWallet,
      hub: HUB,
      disclaimer: d.disclaimer || DISCLAIMER,
    };
  } catch { return null; }
}

export function voteNoticeHtml(n) {
  if (!n) return '';
  const lead = n.leading ? ` Leading: <b>${esc(n.leading)}</b>${n.sharePct != null ? ` (${esc(n.sharePct)}%)` : ''}.` : '';
  return `<div class="card" style="text-align:left;margin-top:10px;border-color:#d4a640">
    <div class="small">EXTRA · burn-to-vote</div>
    <h3 style="margin:4px 0">${esc(n.title)}</h3>
    <p class="small">Weight = player-burn $KIBBLE (max ${esc(n.maxVotes)} / wallet · soft cap ${esc(n.softCapUi)}).${lead}</p>
    <p class="small"><a class="btn tiny green" href="${esc(n.hub)}" target="_blank" rel="noopener">Vote on the Inu hub ↗</a></p>
    <p class="small nfa">${esc(n.disclaimer)}</p>
  </div>`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
