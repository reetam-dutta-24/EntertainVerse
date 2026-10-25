# Recommender evaluation

Generated 2026-10-24 by `npm run eval:recommender` (leave-one-out).

**Method.** For every user with at least 3 favorites, each favorite is hidden in turn — removed
from favorites, watch history and watchlist — and every variant ranks the whole catalog (minus
what the user already knows). HitRate@K is the share of hidden favorites found in the top K;
MRR@20 is the mean reciprocal rank (0 outside the top 20). Collaborative signals always exclude
the user being evaluated.

**Catalog:** 101 titles, 80 tracks. **Caveat:** the dataset is small
(seeded demo users), so treat differences of a few points as noise.

## Titles (27 hidden favorites across 3 users)

| Variant | HitRate@10 | HitRate@20 | MRR@20 |
| --- | ---: | ---: | ---: |
| Popularity (rating) baseline | 59.3% | 66.7% | 0.203 |
| Taste engine only (genres, types, languages) | 44.4% | 51.9% | 0.189 |
| + Semantic embeddings (gemini-embedding-001) | 55.6% | 74.1% | 0.285 |
| Full hybrid (+ collaborative filtering) | 66.7% | 70.4% | 0.350 |

## Music (13 hidden favorites across 2 users)

| Variant | HitRate@10 | HitRate@20 | MRR@20 |
| --- | ---: | ---: | ---: |
| Popularity (rating) baseline | 0.0% | 15.4% | 0.012 |
| Taste engine only (genres, types, languages) | 46.2% | 69.2% | 0.191 |
| + Semantic embeddings (gemini-embedding-001) | 61.5% | 69.2% | 0.134 |
| Full hybrid (+ collaborative filtering) | 46.2% | 69.2% | 0.281 |
