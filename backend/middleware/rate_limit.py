# backend/middleware/rate_limit.py
"""
Simple in-memory rate limiter using sliding window algorithm.
For production, use Redis-backed rate limiting.
"""
import time
from collections import defaultdict, deque
import threading


class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.rpm = requests_per_minute
        self.window = 60  # seconds
        self.requests: dict = defaultdict(deque)
        self.lock = threading.Lock()

    def is_allowed(self, identifier: str) -> bool:
        """Check if a request from identifier is within rate limit."""
        now = time.time()
        with self.lock:
            window_start = now - self.window
            q = self.requests[identifier]

            # Remove old entries
            while q and q[0] < window_start:
                q.popleft()

            if len(q) >= self.rpm:
                return False

            q.append(now)
            return True

    def get_remaining(self, identifier: str) -> int:
        """Get remaining requests in current window."""
        now = time.time()
        with self.lock:
            window_start = now - self.window
            q = self.requests[identifier]
            while q and q[0] < window_start:
                q.popleft()
            return max(0, self.rpm - len(q))
