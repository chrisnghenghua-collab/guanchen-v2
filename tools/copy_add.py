# Adds NEW rows to engine/interpretation/copy/zh-CN.csv without touching existing rows (the CSV is the copy authority).
# Usage: python tools/copy_add.py rows.tsv   (tab-separated: key<TAB>文本<TAB>说明). Fails if any key already exists.
import csv, sys, os
CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine', 'interpretation', 'copy', 'zh-CN.csv')
with open(CSV, encoding='utf-8-sig', newline='') as fh: rows = list(csv.reader(fh))
existing = {r[0] for r in rows[1:] if r}
new = []
with open(sys.argv[1], encoding='utf-8') as fh:
    for line in fh:
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#'): continue
        parts = line.split('\t'); parts += [''] * (3 - len(parts))
        if parts[0] in existing: sys.exit('KEY_EXISTS ' + parts[0])
        new.append(parts[:3]); existing.add(parts[0])
with open(CSV, 'a', encoding='utf-8', newline='') as fh: csv.writer(fh).writerows(new)
print('added', len(new), 'rows; total', len(rows) - 1 + len(new))
