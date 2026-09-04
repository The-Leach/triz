#!/usr/bin/env python3
"""Build TRIZ Navigator from its template and content.

    python3 build.py            validate content, write index.html and dist/artifact.html
    python3 build.py --check    validate content only, write nothing

Content lives in content/*.json and is the part worth editing: the service
readings of the 39 factors, the worked examples for the 40 principles, the
Nine Windows prompts, the search synonyms and the worked example sessions.
src/app.html is the template — markup, styles and logic — with a single
/*__CONTENT__*/ placeholder where the content is injected.

Nothing is written unless every check below passes, so a malformed edit to the
content cannot reach a published page.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
CONTENT = ROOT / 'content'
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

def load(name):
    try:
        return json.loads((CONTENT / name).read_text(encoding='utf-8'))
    except Exception as e:
        errors.append('%s could not be read: %s' % (name, e))
        return None

factors     = load('factors.json')
principles  = load('principles.json')
matrix      = load('matrix.json')
separations = load('separations.json')
presets     = load('presets.json')
synonyms    = load('synonyms.json')
windows     = load('nine-windows.json')
examples    = load('examples.json')
if errors:
    print('\n'.join('ERROR: ' + e for e in errors)); sys.exit(1)

# ---------------------------------------------------------------- factors
check(len(factors) == 39, 'expected 39 factors, found %d' % len(factors))
check([f['n'] for f in factors] == list(range(1, 40)), 'factors must be numbered 1-39 in order')
for f in factors:
    for key in ('name', 'eng', 'svc', 'kw', 'dir', 'pol'):
        check(bool(str(f.get(key, '')).strip()), 'factor %s has no %s' % (f['n'], key))
    check(f.get('dir') in ('less', 'more', 'either'),
          'factor %s has an unknown polarity direction %r' % (f['n'], f.get('dir')))
    check(str(f.get('pol', '')).startswith('Improving this means'),
          'factor %s: polarity note should start "Improving this means"' % f['n'])

# ------------------------------------------------------------- principles
check(len(principles) == 40, 'expected 40 principles, found %d' % len(principles))
check([p['n'] for p in principles] == list(range(1, 41)), 'principles must be numbered 1-40 in order')
seen_examples = {}
aliases = {}
for p in principles:
    check(bool(str(p.get('name', '')).strip()), 'principle %s has no name' % p['n'])
    check(bool(str(p.get('ess', '')).strip()), 'principle %s has no essence line' % p['n'])
    alias = str(p.get('alias', '')).strip()
    check(bool(alias), 'principle %s has no plain-language service name' % p['n'])
    check(alias.lower() != str(p.get('name', '')).strip().lower(),
          'principle %s: the service name just repeats the classical one' % p['n'])
    check(len(alias.split()) <= 6, 'principle %s: the service name should be a short handle, not a sentence' % p['n'])
    check(len(p.get('subs', [])) >= 1, 'principle %s has no classical sub-principles' % p['n'])
    # the service reading is the point of this tool, so hold it to a real minimum
    check(len(p.get('svc', [])) >= 2, 'principle %s needs at least 2 service examples' % p['n'])
    check(len(p.get('mfg', [])) >= 2, 'principle %s needs at least 2 manufacturing examples' % p['n'])
    check(len(p.get('ask', [])) >= 2, 'principle %s needs at least 2 prompt questions' % p['n'])
    key_alias = str(p.get('alias', '')).strip().lower()
    if key_alias in aliases:
        errors.append('principle %s reuses the service name of principle %s: %r'
                      % (p['n'], aliases[key_alias], p.get('alias')))
    aliases[key_alias] = p['n']
    for kind in ('svc', 'mfg'):
        for ex in p.get(kind, []):
            key = re.sub(r'[^a-z0-9 ]', '', ex.lower()).strip()
            check(len(ex.split()) >= 4, 'principle %s has a too-short %s example: %r' % (p['n'], kind, ex))
            if key in seen_examples:
                errors.append('principle %s repeats an example already used by principle %s: %r'
                              % (p['n'], seen_examples[key], ex))
            seen_examples[key] = p['n']

# ----------------------------------------------------------------- matrix
check(len(matrix) == 39 and all(len(r) == 39 for r in matrix), 'matrix must be 39 x 39')
populated = 0
for i, row in enumerate(matrix):
    for j, cellv in enumerate(row):
        if i == j:
            check(not cellv, 'matrix diagonal [%d,%d] should be empty' % (i + 1, j + 1))
            continue
        if cellv:
            populated += 1
        check(all(isinstance(n, int) and 1 <= n <= 40 for n in cellv),
              'matrix [%d,%d] references a principle outside 1-40: %r' % (i + 1, j + 1, cellv))
        check(len(set(cellv)) == len(cellv),
              'matrix [%d,%d] recommends the same principle twice: %r' % (i + 1, j + 1, cellv))
# landmark cells every published copy of the matrix agrees on
check(matrix[0][2] == [15, 8, 29, 34], 'landmark cell [1,3] has changed')
check(matrix[1][3] == [10, 1, 29, 35], 'landmark cell [2,4] has changed')
check(matrix[18][8] == [8, 15, 35], 'corrected cell [19,9] has changed — see data/matrix-crosscheck.md')

# ------------------------------------------------- separations and presets
for s in separations:
    check(all(1 <= n <= 40 for n in s['ps']), 'separation %s references a principle outside 1-40' % s['id'])
    check(len(set(s['ps'])) == len(s['ps']), 'separation %s lists the same principle twice' % s['id'])
for p in presets:
    check(1 <= p['imp'] <= 39 and 1 <= p['wor'] <= 39, 'preset %r uses a factor outside 1-39' % p['label'])
    check(p['imp'] != p['wor'], 'preset %r improves and worsens the same factor' % p['label'])
    check(bool(matrix[p['imp'] - 1][p['wor'] - 1]),
          'preset %r lands on an empty matrix cell, so it would dead-end' % p['label'])

# ----------------------------------------------------------- nine windows
check(len(windows['windows']) == 9, 'nine windows needs exactly 9 cells')
check({w['row'] for w in windows['windows']} == {r['id'] for r in windows['rows']}, 'window rows do not line up')
check({w['col'] for w in windows['windows']} == {c['id'] for c in windows['cols']}, 'window columns do not line up')

# -------------------------------------------------------- worked examples
check(len(examples) >= 1, 'at least one worked example is expected')
for ex in examples:
    where = 'example %r' % ex.get('id')
    for key in ('id', 'title', 'sector', 'blurb', 'session'):
        check(bool(ex.get(key)), '%s has no %s' % (where, key))
    sess = ex.get('session', {})
    check(bool(sess.get('problem', {}).get('title')), '%s has no problem statement' % where)
    check(len(sess.get('framings', [])) >= 1, '%s has no framings' % where)
    for f in sess.get('framings', []):
        if f.get('ctype') == 'technical':
            check(1 <= f.get('imp', 0) <= 39 and 1 <= f.get('wor', 0) <= 39,
                  '%s uses a factor outside 1-39' % where)
        if f.get('ctype') == 'physical':
            check(f.get('phys', {}).get('sep') in [s['id'] for s in separations],
                  '%s uses an unknown separation strategy' % where)
        for n in f.get('stars', []):
            check(1 <= n <= 40, '%s shortlists a principle outside 1-40' % where)
            check(str(n) in f.get('concepts', {}) or str(n) in f.get('ideas', {}),
                  '%s shortlists principle %s but records nothing for it' % (where, n))

if errors:
    print('Content validation failed:')
    print('\n'.join('  - ' + e for e in errors))
    sys.exit(1)

print('Content OK: %d factors, %d principles, %d populated matrix cells, %d worked examples.'
      % (len(factors), len(principles), populated, len(examples)))
if '--check' in sys.argv:
    sys.exit(0)

# ------------------------------------------------------------------ build
def js(name, value):
    return 'const %s = %s;' % (name, json.dumps(value, ensure_ascii=False, separators=(',', ':')))

blocks = [
    js('PARAMS', factors),
    js('PRINCIPLES', principles),
    js('MATRIX', matrix),
    js('SEPARATIONS', separations),
    js('PRESETS', presets),
    js('SYN', synonyms),
    js('WINDOWS', windows['windows']),
    js('WIN_ROWS', windows['rows']),
    js('WIN_COLS', windows['cols']),
    js('EXAMPLES', examples),
]
template = (ROOT / 'src' / 'app.html').read_text(encoding='utf-8')
assert '/*__CONTENT__*/' in template, 'template has lost its content placeholder'
page = template.replace('/*__CONTENT__*/', '\n'.join(blocks))

(ROOT / 'index.html').write_text(page, encoding='utf-8')

# the published-artifact format supplies its own skeleton, so strip ours
head = page[page.index('<title>'):page.index('</head>')].strip()
body = page[page.index('<body>') + len('<body>'):page.rindex('</body>')].strip()
artifact = head + '\n\n' + body + '\n'
markup = re.sub(r'<(script|style)\b.*?</\1>', '', artifact, flags=re.I | re.S)
for banned in ('!doctype', 'html', 'head', 'body'):
    assert not re.search(r'<' + banned + r'(?=[\s>/])', markup, re.I), \
        'skeleton tag leaked into the artifact: <' + banned
(ROOT / 'dist').mkdir(exist_ok=True)
(ROOT / 'dist' / 'artifact.html').write_text(artifact, encoding='utf-8')

print('Built index.html (%d KB) and dist/artifact.html (%d KB).'
      % (len(page) // 1024, len(artifact) // 1024))
