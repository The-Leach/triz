#!/usr/bin/env python3
"""Produce dist/artifact.html from index.html.

The published-artifact format supplies its own <!doctype>/<html>/<head>/<body>
skeleton, so this strips those wrappers and keeps everything between them --
the <title>, the font <link>, the <style> and the page content. index.html
remains the single source of truth; this file is derived, never edited.
"""
import re, pathlib

root = pathlib.Path(__file__).parent
src = (root / 'index.html').read_text(encoding='utf-8')

head = src[src.index('<title>'):src.index('</head>')].strip()
body = src[src.index('<body>') + len('<body>'):src.rindex('</body>')].strip()

out = head + '\n\n' + body + '\n'

# Check the document structure only: script and style bodies are text, and a
# code comment mentioning <body> is not a skeleton tag.
markup = re.sub(r'<(script|style)\b.*?</\1>', '', out, flags=re.I | re.S)
for banned in ('!doctype', 'html', 'head', 'body'):
    # match real tag boundaries only, so <header> is not mistaken for <head>
    assert not re.search(r'<' + banned + r'(?=[\s>/])', markup, re.I), \
        'skeleton tag leaked into artifact: <' + banned
assert '<title>' in out and '<style>' in out and '<script>' in out

dest = root / 'dist' / 'artifact.html'
dest.parent.mkdir(exist_ok=True)
dest.write_text(out, encoding='utf-8')
print('wrote %s (%d KB)' % (dest, len(out) // 1024))
