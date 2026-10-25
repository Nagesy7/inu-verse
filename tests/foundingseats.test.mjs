import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HOW_TO_BRIEF, shouldShowNotice, buildNoticeCopy, noticeKey, showNotice, ensureStyles,
} from "../src/foundingseats.js";

describe("Founding seat-open notice", () => {
  it("brief how-to covers rules and is title-only", () => {
    assert.ok(HOW_TO_BRIEF.length >= 5);
    const blob = HOW_TO_BRIEF.join(" ").toLowerCase();
    assert.match(blob, /10 seats/);
    assert.match(blob, /before fees/);
    assert.match(blob, /permanent/);
    assert.match(blob, /promises nothing/);
    assert.doesNotMatch(blob, /\bapy\b|\bdividend|\binvestment return/);
  });

  it("shows when a seat opened (recentOpen) and not yet dismissed for that event", () => {
    const f = { status: "live", openSeats: 2, recentOpen: { at: 1000, seat: 3 } };
    assert.equal(shouldShowNotice(f, { dismissedAt: null }), true);
    assert.equal(shouldShowNotice(f, { dismissedAt: 999 }), true);
    assert.equal(shouldShowNotice(f, { dismissedAt: 1000 }), false);
    assert.equal(shouldShowNotice({ status: "live", openSeats: 10 }, {}), false); // empty tracker, no sell yet
    assert.equal(shouldShowNotice({ status: "live", openSeats: 0, recentOpen: { at: 1 } }, {}), false);
    assert.equal(shouldShowNotice({ status: "not_released", openSeats: 5, recentOpen: { at: 1 } }, {}), false);
  });

  it("buildNoticeCopy includes how-to and seat counts", () => {
    const c = buildNoticeCopy({
      status: "live", openSeats: 1, filledSeats: 9, seatsTotal: 10,
      recentOpen: { seat: 4, at: 1 },
      howToQualify: { bullets: HOW_TO_BRIEF, disclaimer: "Title only." },
    });
    assert.equal(c.title, "Seat open!");
    assert.match(c.detail, /Seat #4/);
    assert.equal(c.howTo.length, HOW_TO_BRIEF.length);
    assert.match(c.disclaimer, /Title only/);
  });

  it("renders a dialog with how-to list", () => {
    // Minimal DOM stub
    const els = new Map();
    const doc = {
      getElementById: (id) => els.get(id) || null,
      createElement: (tag) => {
        const el = {
          tag, id: "", className: "", innerHTML: "", style: {},
          setAttribute() {}, querySelector(sel) {
            if (sel.includes("fsn-x") || sel.includes("ok") || sel.includes("tracker") || sel.includes("rules")) {
              return { onclick: null };
            }
            return null;
          },
          querySelectorAll: () => [],
        };
        return el;
      },
      body: { appendChild(el) { els.set(el.id, el); } },
      head: { appendChild(el) { els.set(el.id, el); } },
    };
    ensureStyles(doc);
    assert.ok(els.get("founding-seat-style"));
    const copy = buildNoticeCopy({ status: "live", openSeats: 1, filledSeats: 0, seatsTotal: 10 });
    const el = showNotice(copy, { doc, onDismiss() {}, openUrl() {} });
    assert.ok(el.innerHTML.includes("How to get a seat"));
    assert.ok(el.innerHTML.includes("Seat open!"));
    assert.equal(noticeKey({ recentOpen: { at: 42 } }), "42");
  });
});
