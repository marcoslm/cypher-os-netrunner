'use strict';
// Herramienta de desarrollo: no se carga en el navegador.
var fs = require('node:fs');
var path = require('node:path');
var cp = require('node:child_process');
var os = require('node:os');
var root = path.resolve(__dirname, '..');
function git(args) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cypher-version-'));
  var output = path.join(dir, 'stdout');
  var fd = fs.openSync(output, 'w');
  try {
    var result = cp.spawnSync('git', args, {cwd: root, stdio: ['ignore', fd, 'inherit']});
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('Git falló: ' + args.join(' '));
    return fs.readFileSync(output, 'utf8').trim();
  } finally {
    fs.closeSync(fd); fs.rmSync(dir, {recursive: true});
  }
}
function update(count) {
  if (!/^[1-9]\d*$/.test(String(count))) throw new Error('Build inválida');
  var file = path.join(root, 'cypher_os_data.js');
  var text = fs.readFileSync(file, 'utf8');
  var pattern = /\["FIRMWARE v1\.0 · BUILD \d+", "dim"\]/g;
  if ((text.match(pattern) || []).length !== 1) throw new Error('Línea de firmware ausente o duplicada');
  var next = text.replace(pattern, '["FIRMWARE v1.0 · BUILD ' + count + '", "dim"]');
  if (next !== text) fs.writeFileSync(file, next);
}
if (require.main === module) {
  try {
    var hook = process.argv[2] === '--commit';
    if (hook && git(['diff', '--name-only', '--', 'cypher_os_data.js'])) {
      throw new Error('Hay cambios sin preparar en cypher_os_data.js; añádelos o guárdalos antes del commit.');
    }
    var refs = ['HEAD'];
    if (fs.existsSync(path.join(root, git(['rev-parse', '--git-path', 'MERGE_HEAD'])))) refs.push('MERGE_HEAD');
    var count = Number(git(['rev-list', '--count'].concat(refs)));
    // prepare-commit-msg: --amend indica source=commit sin una referencia de reutilización.
    var amend = hook && process.argv[3] === 'commit' && !process.argv[4];
    update(count + (hook && !amend ? 1 : 0));
    if (hook) git(['add', '--', 'cypher_os_data.js']);
    console.log('Firmware v1.0 · build ' + (count + (hook && !amend ? 1 : 0)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {update: update};
