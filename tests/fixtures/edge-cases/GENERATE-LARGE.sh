#!/bin/bash
# Generate large test files for boundary testing
set -e
cd "$(dirname "$0")"

echo "Generating 100MB random file..."
dd if=/dev/urandom of=large-100mb.bin bs=1048576 count=100 2>/dev/null
echo "OK: large-100mb.bin"

echo "Generating 1GB sparse file..."
dd if=/dev/zero of=large-1gb-sparse.bin bs=1 count=0 seek=1073741824 2>/dev/null
echo "OK: large-1gb-sparse.bin (sparse, actual disk usage ~0)"
