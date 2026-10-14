import os

# Unit tests must never reach the shared Redis; tests that need a cache install a fake client.
os.environ["CACHE_ENABLED"] = "false"
