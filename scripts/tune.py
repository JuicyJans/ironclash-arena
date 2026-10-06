"""Tiny helper to patch numbers in config files during balancing: tune.py <file> <anchor> <key> <value>."""
import re, sys
path, anchor, key, value = sys.argv[1:5]
s = open(path).read()
i = s.index(anchor)
m = re.compile(r'(\b' + re.escape(key) + r':\s*)(-?[\d.]+)').search(s, i)
if not m: raise SystemExit(f'{key} not found after {anchor}')
s = s[:m.start(2)] + value + s[m.end(2):]
open(path, 'w').write(s)
print(f'{anchor} {key} -> {value}')
