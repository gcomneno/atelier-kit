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
exec(compile(source, __file__, 'exec'))
