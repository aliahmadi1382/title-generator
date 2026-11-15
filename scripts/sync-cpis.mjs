import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { sources } from './cpis-source-map.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'src/cpis/manifest.json');
const digest = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
const read = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const args = process.argv.slice(2);
if (args.includes('--verify')) {
  const manifest = JSON.parse(read(manifestPath));
  if (manifest.repository !== 'Pejmana1978/cpis' || manifest.files.length !== sources.length) throw new Error('Unexpected CPIS manifest');
  for (const spec of sources) {
    const record = manifest.files.find(file => file.target === spec.target && file.source === spec.source);
    if (!record || digest(read(path.join(root, spec.target))) !== record.generatedSha256) {
      throw new Error(`CPIS source was edited outside the synchronizer: ${spec.target}`);
    }
  }
  console.log(`Verified ${manifest.files.length} CPIS source files from ${manifest.commit.slice(0, 7)}`);
} else {
  const sourceIndex = args.indexOf('--source');
  if (sourceIndex < 0 || !args[sourceIndex + 1]) throw new Error('Pass --source <CPIS checkout> and optionally --ref <commit>; --check compares without writing');
  const sourceRoot = path.resolve(args[sourceIndex + 1]);
  const refIndex = args.indexOf('--ref');
  const ref = refIndex < 0 ? 'origin/main' : args[refIndex + 1];
  if (!ref || ref.startsWith('-')) throw new Error('Invalid CPIS ref');
  const git = (...command) => execFileSync('git', ['-C', sourceRoot, ...command], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
  const remote = git('remote', 'get-url', 'origin').trim();
  if (!/github\.com[:/]Pejmana1978\/cpis(?:\.git)?$/i.test(remote)) throw new Error('The source must be the original Pejmana1978/cpis repository');
  const commit = git('rev-parse', `${ref}^{commit}`).trim();
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Expected a full CPIS commit hash');
  const generated = sources.map(spec => {
    const original = git('show', `${commit}:${spec.source}`);
    let code = original;
    if (spec.declarations) {
      const source = ts.createSourceFile(spec.source, original, ts.ScriptTarget.Latest, true);
      const found = new Set();
      const pieces = source.statements.filter(statement => {
        if (ts.isImportDeclaration(statement)) return spec.imports.includes(statement.moduleSpecifier.text);
        const names = ts.isVariableStatement(statement)
          ? statement.declarationList.declarations.map(declaration => declaration.name.getText(source))
          : statement.name ? [statement.name.getText(source)] : [];
        if (!names.some(name => spec.declarations.includes(name))) return false;
        if (names.some(name => !spec.declarations.includes(name))) throw new Error(`Review the grouped declaration in ${spec.source}`);
        names.forEach(name => found.add(name));
        return true;
      }).map(statement => statement.getFullText(source).trim());
      for (const name of spec.declarations) if (!found.has(name)) throw new Error(`CPIS changed: missing ${name} in ${spec.source}`);
      code = (spec.prepend ?? '') + pieces.join('\n\n') + '\n';
    }
    if (spec.localFunction) {
      const source = ts.createSourceFile(spec.source, original, ts.ScriptTarget.Latest, true);
      const fn = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === spec.localFunction.source);
      if (!fn?.body) throw new Error(`Missing CPIS function ${spec.localFunction.source}`);
      const found = new Set();
      const statements = fn.body.statements.filter(statement => {
        if (!ts.isVariableStatement(statement)) return false;
        const names = statement.declarationList.declarations.map(declaration => declaration.name.getText(source));
        if (!names.some(name => spec.localFunction.declarations.includes(name))) return false;
        if (names.some(name => !spec.localFunction.declarations.includes(name))) throw new Error('Review CPIS grouped local declarations');
        names.forEach(name => found.add(name));
        return true;
      }).map(statement => statement.getText(source));
      for (const name of spec.localFunction.declarations) if (!found.has(name)) throw new Error(`Missing CPIS local declaration ${name}`);
      code += `${spec.append ?? ''}\n${spec.localFunction.signature} {\n${statements.map(text => `  ${text}`).join('\n')}\n  return ${spec.localFunction.result};\n}\n`;
    }
    for (const [before, after] of Object.entries(spec.replaceImports ?? {})) {
      if (!code.includes(`"${before}"`)) throw new Error(`CPIS changed the expected import ${before}`);
      code = code.replace(`"${before}"`, `"${after}"`);
    }
    const output = `// Generated from Pejmana1978/cpis @ ${commit}.\n// Source: ${spec.source}\n// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.\n\n${code}`;
    return { spec, output, record: { source: spec.source, target: spec.target, sourceSha256: digest(original), generatedSha256: digest(output), ...(spec.declarations ? { declarations: spec.declarations } : {}), ...(spec.localFunction ? { localDeclarations: spec.localFunction.declarations } : {}) } };
  });
  const manifest = JSON.stringify({ schemaVersion: 1, repository: 'Pejmana1978/cpis', commit,
    sourceCommittedAt: git('show', '-s', '--format=%cI', commit).trim(), files: generated.map(file => file.record) }, null, 2) + '\n';
  // Unrelated CPIS commits must not create a new desktop release. Compare both
  // the source hashes and extracted code, ignoring only its provenance header.
  if (args.includes('--if-changed') && existsSync(manifestPath)) {
    const previous = JSON.parse(read(manifestPath));
    const body = text => text.replace(/^\/\/ Generated from Pejmana1978\/cpis @ [a-f0-9]{40}\./, '// CPIS source');
    if (previous.files.length === generated.length && generated.every(({ spec, output, record }) =>
      previous.files.some(file => file.source === spec.source && file.target === spec.target && file.sourceSha256 === record.sourceSha256)
      && existsSync(path.join(root, spec.target)) && body(read(path.join(root, spec.target))) === body(output))) {
      console.log('CPIS title and SEO rules have not changed; no release needed.');
      process.exit(0);
    }
  }
  if (args.includes('--check')) {
    for (const { spec, output } of generated) if (read(path.join(root, spec.target)) !== output) throw new Error(`Out of sync: ${spec.target}`);
    if (read(manifestPath) !== manifest) throw new Error('The CPIS manifest is out of sync');
    console.log(`Matched all ${generated.length} files to CPIS ${commit}`);
  } else {
    // Resolve all source declarations before writing anything. No source repo changes.
    for (const { spec, output } of generated) {
      const target = path.join(root, spec.target);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, output);
    }
    writeFileSync(manifestPath, manifest);
    console.log(`Synchronized ${generated.length} pure rule files from CPIS ${commit}. Run lint, tests and build before publishing.`);
  }
}
