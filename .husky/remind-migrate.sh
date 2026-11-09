#!/usr/bin/env sh
# Reminds to migrate when the commits from $1 to $2 add a backend migration
# (docs/getting-started.md, mục 5). It only prints; it never touches the database.
from=$1
to=$2
case "$from" in "" | 0000000000000000000000000000000000000000) exit 0 ;; esac
git cat-file -e "$from^{commit}" 2>/dev/null || exit 0
new=$(git diff --name-only --diff-filter=A "$from" "$to" -- 'apps/backend/drizzle/*.sql')
[ -z "$new" ] && exit 0
echo ""
echo "!! Co migration moi cho backend:"
echo "$new" | sed 's/^/     /'
echo "   Chay truoc khi bat backend: cd apps/backend && pnpm build && pnpm db:migrate"
echo ""
