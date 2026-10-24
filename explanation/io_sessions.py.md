# rpkclust/io/sessions.py — Session & Pair Assignment

## assign_sessions_and_directions (lines 9-100)
Input: messages, Config.
- Sort by `(ts, id)`.
- If `config.direction_mode == "none"`: alternating directions (`c2s` if even index else `s2c`), session_id=0.
- Otherwise group by `(sorted(src,dst), sorted(sport,dport))` 4-tuple into flows.
- Split each flow by idle gap (`m.ts - last_ts > config.session_gap_s` default 300s) into sessions.
- Per session: if `direction_mode == "port"`, server_port = min(sport, dport) of first message; direction assignment per message: if `m.sport == server_port` → `s2c`, else `c2s`. If not port-based: first packet endpoint = client; same endpoint = `c2s`, opposite = `s2c`.
- Creates new `Message` instances (preserving data/ts/etc.) with updated `direction` and `session_id`.
- Sorts result by original `id`.
- Returns updated `List[Message]`.

## pair_messages (lines 103-127)
- Groups messages by `session_id`.
- For each session chronologically: on `c2s` message, set `pending_req = m`; on next `s2c` message, create `Pair(req_id=pending_req.id, resp_id=m.id, session_id=sess_id, dt=m.ts - pending_req.ts)`; reset pending_req. Strict 1:1 pairing.
- Returns `List[Pair]`.

## Notes
- Session gap splitting ensures session boundaries when idle time exceeds 300s.
- Pair pairing assumes request followed by response in chronological order per session.
