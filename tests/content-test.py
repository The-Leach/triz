#!/usr/bin/env python3
"""Prove the content validator in build.py actually rejects bad content.

A validator that has never been seen to fail is not known to work. This copies
the project to a temporary directory, injects one fault at a time, and checks
that `build.py --check` refuses it and says why.

    python3 tests/content-test.py
"""
import json, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
passed = failed = 0

def run_check(work):
    r = subprocess.run([sys.executable, str(work / 'build.py'), '--check'],
                       capture_output=True, text=True, cwd=work)
    return r.returncode, r.stdout + r.stderr

def case(label, mutate, expect):
    """mutate(content_dir) breaks one thing; the build must refuse and explain."""
    global passed, failed
    with tempfile.TemporaryDirectory() as tmp:
        work = pathlib.Path(tmp) / 'triz'
        shutil.copytree(ROOT, work, ignore=shutil.ignore_patterns(
            '.git', 'node_modules', 'dist', '__pycache__'))
        mutate(work / 'content')
        code, out = run_check(work)
        ok = code != 0 and expect.lower() in out.lower()
        passed, failed = (passed + 1, failed) if ok else (passed, failed + 1)
        print(('PASS  ' if ok else 'FAIL  ') + label)
        if not ok:
            print('        exit=%d expected %r in output, got:\n        %s'
                  % (code, expect, out.strip().replace('\n', '\n        ')))

def edit(name, fn):
    def go(cdir):
        path = cdir / name
        data = json.loads(path.read_text(encoding='utf-8'))
        fn(data)
        path.write_text(json.dumps(data), encoding='utf-8')
    return go

# the clean tree must build, or every case below is meaningless
with tempfile.TemporaryDirectory() as tmp:
    work = pathlib.Path(tmp) / 'triz'
    shutil.copytree(ROOT, work, ignore=shutil.ignore_patterns('.git', 'node_modules', 'dist', '__pycache__'))
    code, out = run_check(work)
    print(('PASS  ' if code == 0 else 'FAIL  ') + 'the shipped content passes validation')
    if code == 0: passed += 1
    else:
        failed += 1
        print('        ' + out.strip())

def drop_service_example(d):
    d[0]['svc'] = d[0]['svc'][:1]
def duplicate_example(d):
    d[1]['svc'][0] = d[0]['svc'][0]
def break_polarity(d):
    d[24]['dir'] = 'downwards'
def blank_polarity_note(d):
    d[24]['pol'] = 'It goes down.'
def empty_factor_field(d):
    d[5]['svc'] = ''
def lose_a_principle(d):
    d.pop()
def duplicate_in_cell(d):
    d[0][2] = [15, 8, 8, 34]
def out_of_range(d):
    d[0][2] = [15, 8, 41, 34]
def break_landmark(d):
    d[0][2] = [15, 8, 29, 33]
def fill_diagonal(d):
    d[5][5] = [1, 2]
def preset_dead_end(d):
    d[0]['imp'], d[0]['wor'] = 29, 35
def separation_dupe(d):
    d[0]['ps'] = d[0]['ps'] + [d[0]['ps'][0]]
def example_bad_factor(d):
    d[0]['session']['framings'][0]['imp'] = 44
def example_empty_shortlist(d):
    d[0]['session']['framings'][0]['stars'] = [7]

case('a principle with only one service example is rejected',
     edit('principles.json', drop_service_example), 'at least 2 service examples')
case('the same example reused on two principles is rejected',
     edit('principles.json', duplicate_example), 'repeats an example')
case('a principle removed from the set is rejected',
     edit('principles.json', lose_a_principle), 'expected 40 principles')
case('an unknown polarity direction is rejected',
     edit('factors.json', break_polarity), 'unknown polarity direction')
case('a polarity note not saying what improving means is rejected',
     edit('factors.json', blank_polarity_note), 'polarity note')
case('a factor missing its service reading is rejected',
     edit('factors.json', empty_factor_field), 'has no svc')
case('a cell recommending the same principle twice is rejected',
     edit('matrix.json', duplicate_in_cell), 'same principle twice')
case('a cell referencing a principle above 40 is rejected',
     edit('matrix.json', out_of_range), 'outside 1-40')
case('a changed landmark cell is rejected',
     edit('matrix.json', break_landmark), 'landmark cell')
case('content on the matrix diagonal is rejected',
     edit('matrix.json', fill_diagonal), 'diagonal')
case('a quick-start preset that would dead-end is rejected',
     edit('presets.json', preset_dead_end), 'empty matrix cell')
case('a separation strategy listing a principle twice is rejected',
     edit('separations.json', separation_dupe), 'same principle twice')
case('a worked example using a factor outside 1-39 is rejected',
     edit('examples.json', example_bad_factor), 'outside 1-39')
case('a worked example shortlisting a principle it says nothing about is rejected',
     edit('examples.json', example_empty_shortlist), 'records nothing for it')

print('\n%d passed, %d failed' % (passed, failed))
sys.exit(1 if failed else 0)
