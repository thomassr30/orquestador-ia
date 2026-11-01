'use strict';
// Fuente ÚNICA de las reglas de comandos. La usan el harness (policy.js) y el instalador
// (permisos de Claude Code y OpenCode), así ambos aplican exactamente lo mismo.

// Git: lectura libre.
const GIT_READ = ['status', 'diff', 'log', 'show', 'blame', 'ls-files', 'ls-tree', 'grep', 'rev-parse', 'describe', 'shortlog',
  'cat-file', 'merge-base', 'for-each-ref', 'name-rev', 'remote -v', 'remote show', 'branch --list', 'branch -a', 'branch -r',
  'branch -v', 'branch -vv', 'branch --show-current', 'stash list', 'stash show', 'worktree list', 'config --get', 'config --list', 'reflog show'];

// Git: escritura bloqueada siempre (ni aunque el usuario lo pida).
const GIT_WRITE = ['commit', 'push', 'pull', 'merge', 'rebase', 'reset', 'checkout', 'switch', 'restore', 'add', 'rm', 'mv',
  'cherry-pick', 'revert', 'clean', 'am', 'apply', 'commit-tree', 'update-ref', 'update-index', 'filter-branch', 'filter-repo',
  'gc', 'prune', 'init', 'submodule add', 'submodule update', 'submodule deinit', 'worktree add', 'worktree remove', 'worktree prune',
  'remote add', 'remote remove', 'remote rm', 'remote rename', 'remote set-url', 'remote prune', 'notes add', 'notes remove', 'replace',
  'reflog expire', 'reflog delete', 'stash push', 'stash pop', 'stash apply', 'stash drop', 'stash clear', 'stash save', 'stash create', 'stash store',
  'tag -a', 'tag -s', 'tag -d', 'tag -f', 'tag --delete', 'tag --force', 'branch -d', 'branch -D', 'branch -m', 'branch -M', 'branch -c', 'branch -C',
  'branch --delete', 'branch --move', 'branch --copy', 'branch -f', 'branch --force', 'branch -u', 'branch --set-upstream-to', 'branch --unset-upstream'];

// GitHub / GitLab CLI.
const FORGE_READ = ['gh pr view', 'gh pr list', 'gh pr diff', 'gh pr checks', 'gh pr status', 'gh issue view', 'gh issue list', 'gh issue status',
  'gh repo view', 'gh run list', 'gh run view', 'gh release list', 'gh release view', 'gh search', 'glab mr view', 'glab mr list', 'glab mr diff',
  'glab issue view', 'glab issue list', 'glab repo view', 'glab ci list', 'glab ci view'];
const FORGE_WRITE = ['gh pr create', 'gh pr merge', 'gh pr close', 'gh pr reopen', 'gh pr edit', 'gh pr comment', 'gh pr review', 'gh pr checkout', 'gh pr ready',
  'gh issue create', 'gh issue close', 'gh issue reopen', 'gh issue edit', 'gh issue comment', 'gh issue delete', 'gh issue transfer', 'gh issue lock',
  'gh release create', 'gh release delete', 'gh release edit', 'gh release upload', 'gh repo create', 'gh repo delete', 'gh repo fork', 'gh repo edit',
  'gh repo rename', 'gh repo archive', 'gh workflow run', 'gh run rerun', 'gh run cancel', 'gh secret set', 'gh variable set',
  'glab mr create', 'glab mr merge', 'glab mr close', 'glab mr approve', 'glab mr note', 'glab mr update', 'glab issue create', 'glab issue close',
  'glab issue note', 'glab issue update', 'glab release create', 'glab ci run'];

// Infraestructura, bases de datos y entornos reales: siempre con aprobación (decisión crítica).
const INFRA_ASK = ['kubectl', 'oc', 'helm', 'terraform', 'tofu', 'docker push', 'docker login', 'consul', 'vault', 'az', 'aws', 'gcloud', 'psql', 'sqlcmd', 'mysql', 'mongosh', 'redis-cli'];

// Borrar archivos o datos: decisión crítica.
const DELETE_ASK = ['rm', 'rmdir', 'del', 'erase', 'rd', 'unlink', 'shred', 'remove-item', 'ri'];

// Instalar/agregar dependencias: decisión crítica.
const DEPS_ASK = ['npm install', 'npm i', 'npm add', 'npm uninstall', 'pnpm add', 'pnpm install', 'pnpm remove', 'yarn add', 'yarn remove',
  'go get', 'go install', 'pip install', 'composer require', 'dotnet add', 'npx expo install', 'pod install', 'pod update'];

// Sensores y lectura: permitidos sin preguntar (tests, lint, build, inspección).
const SAFE_COMMANDS = [
  // Node / JS / TS
  'npm test', 'npm run test', 'npm run lint', 'npm run build', 'npm run typecheck', 'npm run type-check', 'npm audit', 'npm ls', 'npm outdated', 'npm view',
  'pnpm test', 'pnpm run test', 'pnpm run lint', 'pnpm run build', 'pnpm lint', 'pnpm exec vitest', 'pnpm exec jest', 'pnpm exec playwright test', 'pnpm exec tsc --noemit', 'pnpm exec eslint',
  'yarn test', 'yarn lint', 'yarn build', 'yarn vitest', 'yarn jest', 'yarn tsc --noemit', 'yarn eslint',
  'bun test', 'bun run test', 'bun run lint', 'bun run build',
  'npx vitest', 'npx jest', 'npx playwright test', 'npx tsc --noEmit', 'npx eslint', 'npx stylelint', 'npx prettier --check', 'node --test',
  'ng test', 'ng lint', 'ng build', 'ng version', 'npx ng test', 'npx ng lint', 'npx ng build', 'npx ng version', 'node ace test',
  // Go
  'go test', 'go vet', 'go build', 'go list', 'go version', 'go env', 'golangci-lint run', 'govulncheck', 'gosec',
  // Android / iOS
  'gradlew test', './gradlew test', 'gradlew.bat test', 'gradlew lint', './gradlew lint', 'gradlew.bat lint', './gradlew assembledebug', 'gradlew assembledebug', 'gradlew.bat assembledebug',
  'xcodebuild -list', 'xcodebuild test', 'swift test', 'swift build',
  // Seguridad, contenedores e inspección
  'semgrep scan', 'docker ps', 'docker images', 'node --version', 'npm --version', 'node -v', 'npm -v', 'git --version', 'git version',
  // Lectura y navegación (sed y find se evalúan aparte: solo sus formas de lectura)
  'cd', 'pushd', 'popd', 'set-location', 'ls', 'dir', 'pwd', 'cat', 'type', 'head', 'tail', 'wc', 'echo', 'rg', 'grep', 'findstr', 'tree', 'which', 'where', 'uname',
  'nl', 'cut', 'sort', 'uniq', 'diff', 'stat', 'file', 'du', 'get-childitem', 'get-content', 'select-string', 'get-location',
];

// Patrones destructivos que se bloquean siempre.
const DANGEROUS = [
  /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)[a-z]*\s+(\/|~|\$home|\*)(\s|$)/i,
  /\bremove-item\b.*-recurse.*\s([a-z]:\\?|\\)(\s|$)/i,
  /\bformat\s+[a-z]:/i, /\bmkfs(\.\w+)?\b/i, /\bdd\s+if=/i, /\b(shutdown|reboot|halt|poweroff)\b/i,
  /:\(\)\s*\{\s*:\|:&\s*\};:/, /\bchmod\s+-r\s+777\s+\//i,
  /\b(curl|wget|iwr|invoke-webrequest)\b[^|]*\|\s*(sh|bash|zsh|pwsh|powershell|iex|invoke-expression)\b/i,
  />\s*\/dev\/sd[a-z]/i,
];

// Archivos con secretos: no se leen ni se escriben (salvo configuración explícita).
const SECRET_FILES = [/(^|[\\/])\.env(\.[^\\/]*)?$/i, /\.pem$/i, /\.key$/i, /\.pfx$/i, /\.p12$/i, /(^|[\\/])id_(rsa|ed25519|ecdsa)(\.pub)?$/i, /(^|[\\/])\.npmrc$/i, /[\\/]credentials$/i, /(^|[\\/])credentials\.json$/i];
// Permitidos aunque parezcan secretos: plantillas sin valores.
const SECRET_EXCEPTIONS = [/\.env\.(example|sample|template)$/i];

module.exports = { GIT_READ, GIT_WRITE, FORGE_READ, FORGE_WRITE, INFRA_ASK, DELETE_ASK, DEPS_ASK, SAFE_COMMANDS, DANGEROUS, SECRET_FILES, SECRET_EXCEPTIONS };
