"""Builds src/i18n/no.json and en.json from the string tables (single source keeps both languages in sync)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from strings_c import S

def nest(lang):
    root = {}
    for key, (no, en) in sorted(S.items()):
        node = root
        parts = key.split('.')
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node[parts[-1]] = no if lang == 0 else en
    return root

out = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'i18n')
for i, name in enumerate(['no', 'en']):
    with open(os.path.join(out, f'{name}.json'), 'w', encoding='utf-8') as f:
        json.dump(nest(i), f, ensure_ascii=False, indent=2)
        f.write('\n')
print(f'{len(S)} keys written')
