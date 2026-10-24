# rpkclust/candidates/__init__.py

Exports `generate_candidates` from `for_region` and `nfor_tlv`. Merges and deduplicates lists from both regions; sorts by (offset, length); caps at `config.max_candidates` (default 64);
