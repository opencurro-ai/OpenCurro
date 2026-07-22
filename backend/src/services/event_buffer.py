from __future__ import annotations

import asyncio
from typing import Any, AsyncGenerator


class SessionEventBuffer:
    def __init__(self) -> None:
        self._events: list[dict[str, Any]] = []
        self._event = asyncio.Event()
        self._lock = asyncio.Lock()
        self._done = False

    async def append(self, event: str, data: dict[str, Any]) -> int:
        async with self._lock:
            event_id = len(self._events)
            data_with_id = {"_event_id": event_id, **data}
            self._events.append({"id": event_id, "event": event, "data": data_with_id})
        self._event.set()
        return event_id

    def set_done(self) -> None:
        self._done = True
        self._event.set()

    @property
    def is_done(self) -> bool:
        return self._done

    async def subscribe(self, since_id: int = -1) -> AsyncGenerator[dict[str, Any], None]:
        while not self._done:
            while True:
                async with self._lock:
                    if since_id + 1 < len(self._events):
                        event_id = since_id + 1
                        event_data = self._events[event_id]
                    else:
                        break
                yield event_data
                since_id = event_data["id"]

            if self._done:
                break

            self._event.clear()
            try:
                await asyncio.wait_for(self._event.wait(), timeout=15.0)
            except asyncio.TimeoutError:
                continue

        async with self._lock:
            remaining = self._events[since_id + 1:]
        for event_data in remaining:
            yield event_data

    @property
    def last_event_id(self) -> int:
        return len(self._events) - 1 if self._events else -1
