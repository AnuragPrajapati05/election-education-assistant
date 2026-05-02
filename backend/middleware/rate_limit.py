"""In-memory sliding-window rate limiter.

For production deployments with multiple replicas, replace this in-memory
implementation with a Redis-backed solution (e.g. using ``redis-py`` with
Lua scripting or ``limits`` library).
"""

import time
import threading
from collections import defaultdict, deque


class RateLimiter:
    """Thread-safe sliding-window rate limiter.

    Tracks request timestamps per identifier (e.g. IP address) within a
    rolling one-minute window and rejects requests that exceed *requests_per_minute*.

    Args:
        requests_per_minute: Maximum allowed requests per identifier per 60 s window.

    Example::

        limiter = RateLimiter(requests_per_minute=60)
        if not limiter.is_allowed(client_ip):
            return JSONResponse(status_code=429, ...)
    """

    def __init__(self, requests_per_minute: int = 60) -> None:
        self.rpm: int = requests_per_minute
        self.window: int = 60  # sliding window in seconds
        self.requests: dict[str, deque] = defaultdict(deque)
        self._lock: threading.Lock = threading.Lock()

    def is_allowed(self, identifier: str) -> bool:
        """Return ``True`` if the identifier is within its rate limit quota.

        Evicts expired timestamps (older than *window* seconds) before
        deciding, so the window truly slides rather than resets.

        Args:
            identifier: A unique client identifier such as an IP address or
                        user ID.

        Returns:
            ``True`` if the request is permitted; ``False`` if the quota has
            been exhausted for the current window.
        """
        now = time.time()
        with self._lock:
            window_start = now - self.window
            q = self.requests[identifier]

            # Evict timestamps that have fallen outside the sliding window
            while q and q[0] < window_start:
                q.popleft()

            if len(q) >= self.rpm:
                return False

            q.append(now)
            return True

    def get_remaining(self, identifier: str) -> int:
        """Return the number of requests still permitted in the current window.

        Args:
            identifier: A unique client identifier.

        Returns:
            Integer count of remaining allowed requests (minimum 0).
        """
        now = time.time()
        with self._lock:
            window_start = now - self.window
            q = self.requests[identifier]
            while q and q[0] < window_start:
                q.popleft()
            return max(0, self.rpm - len(q))
