// Compile every inline <script> in the built pages (docs/*.html) so a broken bundle fails the build.
// A duplicated file in a game's JS list inlines the same top-level `const`s twice: a SyntaxError that
// the unit tests (which import the source files) and the build's string checks cannot see.
//   node tools/check-built-pages.mjs [docs-folder]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dir = process.argv[2] || 'docs';
let failed = 0, scripts = 0;
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
  const html = fs.readFileSync(path.join(dir, file), 'utf8');
  const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, n = 0;
  while ((m = re.exec(html))) {
    if (/type\s*=\s*["']?(application\/(ld\+)?json|importmap|module)/i.test(m[1])) continue;
    if (!m[2].trim()) continue;
    n++; scripts++;
    try { new vm.Script(m[2], { filename: file + '#script' + n }); }
    catch (e) { failed++; console.error('  [FAIL] ' + file + ' inline script ' + n + ': ' + e.message); }
  }
}
if (failed) { console.error('Error: ' + failed + ' built script(s) do not compile.'); process.exit(1); }
console.log('  [ok] ' + scripts + ' inline scripts compile');
