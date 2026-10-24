# rpkclust/catalog.py — Dataset Catalog

## Docstring
Datasets and Sources catalog for RPKClust.

## Content
- `import os` only (no internal imports).
- `SOURCES` static data structure: dict keyed by `id` (`"netplier"`, `"icsreal"`).
  - Each source has: `id`, `name`, `repo_url`, `citation`, `datasets` list.
  - Each dataset entry: `id`, `name`, `protocol`, `file`, true keyword offset/length/region/name, `category`, `n_packets`.
  - Protocols: modbus, dnp3, dhcp, tftp, ntp, smb, smb2 (7 each).
  - True keyword offsets per protocol (e.g., modbus offset 7 1B Function Code; dhcp 242 1B Option 53; tftp 0 2B Opcode; ntp 0 bits 5-7; smb 8 1B; smb2 16 2B).
  - `exists` flag computed at import (`os.path.exists`), file size derived later.

## Functions

### get_catalog()
- Returns a **copy** of `SOURCES` with `exists` (bool) and `file_size_kb` (float) added per dataset.

### resolve_dataset(source_id, dataset_id)
- Searches `SOURCES` by source_id + dataset_id.
- Falls back to global search over all datasets by `id` or `protocol` name.
- Returns dataset dict or None.

## Notes
Static catalog — not generated from paper. Dataset ground-truth offsets mirror NetPlier/RPCC reference offsets. Added tooling for UI dataset selection.
