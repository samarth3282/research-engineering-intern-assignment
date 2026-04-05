from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock
from time import monotonic


class RateLimiter:
    def __init__(self):
        self._windows: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, bucket: str, client_id: str, limit: int, window_seconds: int) -> bool:
        key = (bucket, client_id)
        now = monotonic()
        floor = now - window_seconds

        with self._lock:
            window = self._windows[key]
            while window and window[0] < floor:
                window.popleft()

            if len(window) >= limit:
                return False

            window.append(now)
            return True


rate_limiter = RateLimiter()
