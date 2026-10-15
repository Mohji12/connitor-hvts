"""URL-safe names for public hospital links, e.g. /attendant-pass/ovum-kalyan-nagar."""

from __future__ import annotations

import re
import unicodedata

SLUG_MAX_LENGTH = 60
# Path segments already used by real pages under /attendant-pass/.
RESERVED_BRANCH_SLUGS = frozenset({"apply", "index", "new", "admin", "api"})
# Generic words that make links longer without telling branches apart.
_FILLER_WORDS = frozenset({"hospital", "hospitals", "the", "and", "pvt", "ltd", "limited"})


def slugify(value: str) -> str:
    """Lowercase words joined by hyphens, ASCII only."""
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    text = re.sub(r"-{2,}", "-", text)
    return text[:SLUG_MAX_LENGTH].strip("-")


def branch_slug_base(branch_name: str, chain_name: str | None = None) -> str:
    """'Ovum Hospital — Kalyan Nagar' -> 'ovum-kalyan-nagar'.

    Filler words and repeats are dropped; the chain's first word leads when the branch name lacks it.
    """
    words: list[str] = []
    for word in slugify(branch_name).split("-"):
        if word and word not in _FILLER_WORDS and word not in words:
            words.append(word)
    chain_words = [w for w in slugify(chain_name or "").split("-") if w and w not in _FILLER_WORDS]
    if chain_words and chain_words[0] not in words:
        words.insert(0, chain_words[0])
    slug = "-".join(words)[:SLUG_MAX_LENGTH].strip("-")
    return slug or "hospital"


def normalize_branch_slug(value: str) -> str:
    """Clean an admin-entered link name; raises ValueError when nothing usable is left."""
    slug = slugify(value)
    if len(slug) < 3:
        raise ValueError("Link name must have at least 3 letters or numbers")
    if slug in RESERVED_BRANCH_SLUGS:
        raise ValueError(f'"{slug}" is reserved. Choose another link name.')
    return slug
