// Room registry + background ticker. In production the Map becomes Redis and
// the ticker becomes a per-room deadline scheduled via Redis keyspace events.

import { Room, makeRoomCode } from "./room.js";
import { Dictionary, type RemoteValidator } from "../validation/validator.js";
import { SEED } from "../data/dictionaries.js";
import type { GameSettings } from "@wordsprint/shared";
import { levenshtein } from "@wordsprint/shared";

export class RoomStore {
  private rooms = new Map<string, Room>();
  // Remote fallback: use a public search source (DuckDuckGo Instant Answer)
  // with a Wikipedia search fallback. This is a best-effort, no-key approach
  // that aims to emulate a 'Google-like' lookup without requiring an API key.
  private remoteValidator: RemoteValidator = async (_category, raw) => {
    const q = raw.trim();
    if (!q) return { matched: false, canonical: null, distance: Infinity };
    try {
      // 1) DuckDuckGo Instant Answer API (no key)
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl);
      if (ddgRes.ok) {
        const ddj = await ddgRes.json();
        // AbstractText or RelatedTopics indicate known concept
        if (ddj && ((ddj.AbstractText && ddj.AbstractText.length > 0) || (Array.isArray(ddj.RelatedTopics) && ddj.RelatedTopics.length > 0))) {
          const canonical = ddj.Heading || q;
          const a = q.toLowerCase().replace(/[^a-z]/g, "");
          const b = (canonical + "").toLowerCase().replace(/[^a-z]/g, "");
          const d = levenshtein(a, b, 10);
          return { matched: true, canonical, distance: d };
        }
      }

      // 2) Wikipedia search fallback
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&utf8=1`;
      const wikiRes = await fetch(wikiUrl, { headers: { Accept: "application/json" } });
      if (wikiRes.ok) {
        const wj = await wikiRes.json();
        if (wj && wj.query && Array.isArray(wj.query.search) && wj.query.search.length > 0) {
          const title = wj.query.search[0].title;
          const canonical = title || q;
          const a = q.toLowerCase().replace(/[^a-z]/g, "");
          const b = canonical.toLowerCase().replace(/[^a-z]/g, "");
          const d = levenshtein(a, b, 10);
          return { matched: true, canonical, distance: d };
        }
      }

      return { matched: false, canonical: null, distance: Infinity };
    } catch (e) {
      return { matched: false, canonical: null, distance: Infinity };
    }
  };

  readonly dict = new Dictionary(SEED, this.remoteValidator);

  create(settings?: Partial<GameSettings>): Room {
    let code = makeRoomCode();
    while (this.rooms.has(code)) code = makeRoomCode();
    const merged = { rounds: 5, roundSeconds: 60, categories: ["name","place","animal","thing"] as any, ...settings };
    const room = new Room(code, merged, this.dict);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  remove(code: string) {
    this.rooms.delete(code.toUpperCase());
  }

  all(): Room[] {
    return [...this.rooms.values()];
  }
}
