const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function createTsLoader() {
  const cache = new Map();
  function load(filename) {
    const file = path.resolve(filename);
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const module = { exports: {} };
    cache.set(file, module);
    const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    });
    const localRequire = name => {
      if (!name.startsWith('.')) throw new Error(`Unexpected dependency in pure rules: ${name}`);
      const target = path.resolve(path.dirname(file), name);
      return load(path.extname(target) ? target : `${target}.ts`);
    };
    const execute = vm.runInThisContext(`(function(require, module, exports) { ${result.outputText}\n})`, { filename: file });
    execute(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}

module.exports = { createTsLoader };
