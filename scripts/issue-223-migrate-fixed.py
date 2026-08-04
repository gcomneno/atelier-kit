#!/usr/bin/env python3
import base64
from pathlib import Path
import re
import zlib

wrapper = Path(__file__).with_name('issue-223-migrate.py').read_text(encoding='utf-8')
payload = re.search(r'PAYLOAD = "([^"]+)"', wrapper).group(1)
source = zlib.decompress(base64.b64decode(payload)).decode('utf-8')
source = source.replace(
    "if 'studio-panel' in source:\n        raise RuntimeError('obsolete studio-panel remains in layout')",
    "if re.search(r'(?<!atelier-)studio-panel', source):\n        raise RuntimeError('obsolete studio-panel remains in layout')",
)
source = source.replace(
    "if re.search(r'class=\"[^\"]*\\bstudio-panel\\b', text):\n            structural.append(str(path.relative_to(ROOT)))",
    "if any(\n            token == 'studio-panel'\n            for match in re.finditer(r'class=\"([^\"]*)\"', text)\n            for token in match.group(1).split()\n        ):\n            structural.append(str(path.relative_to(ROOT)))",
)
exec(compile(source, __file__, 'exec'))

for path in Path.cwd().joinpath('src').rglob('*.svelte'):
    text = path.read_text(encoding='utf-8')
    cleaned = re.sub(r'[ \t]+(?=\r?$)', '', text, flags=re.MULTILINE)
    if cleaned != text:
        path.write_text(cleaned, encoding='utf-8')
