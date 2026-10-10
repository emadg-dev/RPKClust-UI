"""
Session tracking, direction assignment, and request-response message pairing.
"""

from typing import List, Dict, Tuple
from rpkclust.model import Message, Pair
from rpkclust.config import Config

def assign_sessions_and_directions(messages: List[Message], config: Config) -> List[Message]:
    """Assign session ID and direction ('c2s' vs 's2c') to each message."""
    if not messages:
        return []

    # Sort messages chronologically
    sorted_msgs = sorted(messages, key=lambda m: (m.ts, m.id))

    if config.direction_mode == "none":
        # Assume alternating directions
        result = []
        for i, m in enumerate(sorted_msgs):
            direction = "c2s" if (i % 2 == 0) else "s2c"
            result.append(Message(
                id=m.id,
                data=m.data,
                ts=m.ts,
                src=m.src,
                dst=m.dst,
                sport=m.sport,
                dport=m.dport,
                direction=direction,
                session_id=0,
                label=m.label
            ))
        return sorted(result, key=lambda m: m.id)

    # Group by 4-tuple (src/dst ip and port pairs)
    flow_map: Dict[Tuple, List[Message]] = {}
    for m in sorted_msgs:
        ip_pair = tuple(sorted([m.src, m.dst]))
        port_pair = tuple(sorted([m.sport, m.dport]))
        key = (ip_pair, port_pair)
        flow_map.setdefault(key, []).append(m)

    result_msgs: List[Message] = []
    session_counter = 0

    for flow_key, flow_msgs in flow_map.items():
        # Split by idle time gap
        sessions: List[List[Message]] = []
        curr_session: List[Message] = []
        last_ts = None

        for m in flow_msgs:
            if last_ts is not None and (m.ts - last_ts > config.session_gap_s):
                if curr_session:
                    sessions.append(curr_session)
                curr_session = []
            curr_session.append(m)
            last_ts = m.ts

        if curr_session:
            sessions.append(curr_session)

        for sess_msgs in sessions:
            sess_id = session_counter
            session_counter += 1

            first_msg = sess_msgs[0]
            # Determine client endpoint
            if config.direction_mode == "port":
                # Lower port is typically well-known server port
                if first_msg.sport != first_msg.dport:
                    server_port = min(first_msg.sport, first_msg.dport)
                else:
                    server_port = None
            else:
                server_port = None

            for m in sess_msgs:
                if server_port is not None:
                    # If sending from server_port -> s2c (response); else c2s (request)
                    dir_str = "s2c" if (m.sport == server_port) else "c2s"
                else:
                    # Sender of first packet is client
                    dir_str = "c2s" if (m.src == first_msg.src and m.sport == first_msg.sport) else "s2c"

                result_msgs.append(Message(
                    id=m.id,
                    data=m.data,
                    ts=m.ts,
                    src=m.src,
                    dst=m.dst,
                    sport=m.sport,
                    dport=m.dport,
                    direction=dir_str,
                    session_id=sess_id,
                    label=m.label
                ))

    return sorted(result_msgs, key=lambda m: m.id)


def pair_messages(messages: List[Message]) -> List[Pair]:
    """
    Pair request (c2s) and response (s2c) messages within each session.
    A request is paired with the immediately following response before the next request.
    """
    if not messages:
        return []

    # Group by session
    session_map: Dict[int, List[Message]] = {}
    for m in sorted(messages, key=lambda x: (x.ts, x.id)):
        session_map.setdefault(m.session_id, []).append(m)

    pairs: List[Pair] = []

    for sess_id, msgs in session_map.items():
        pending_req: Message | None = None
        for m in msgs:
            if m.direction == "c2s":
                pending_req = m
            elif m.direction == "s2c":
                if pending_req is not None:
                    pairs.append(Pair(req_id=pending_req.id, resp_id=m.id, session_id=sess_id, dt=m.ts - pending_req.ts))
                    pending_req = None

    return pairs
