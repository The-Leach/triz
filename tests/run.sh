#!/usr/bin/env bash
# Run every check. Needs Playwright for the browser suites:
#   npm install playwright
# Set CHROME to use an existing browser instead of Playwright's download.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
run() { printf '\n\033[1m%s\033[0m\n' "$1"; shift; "$@" || fail=1; }

run "Content validation"        python3 build.py --check
run "End-to-end"                node tests/ui-test.js
run "Published-page saving"     node tests/hosted-test.js
run "Sandboxed frame"           node tests/sandbox-test.js
run "Content validator itself"  python3 tests/content-test.py

if [ "$fail" -eq 0 ]; then printf '\n\033[32mAll suites passed.\033[0m\n'; else printf '\n\033[31mSome suites failed.\033[0m\n'; fi
exit $fail
