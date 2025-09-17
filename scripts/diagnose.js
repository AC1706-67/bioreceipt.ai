const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function run(cmd, opts = {}) {
  try {
    return cp.execSync(cmd, { encoding: 'utf8', stdio: ['ignore','pipe','pipe'], ...opts });
  } catch (e) {
    return (e.stdout?.toString() || '') + (e.stderr?.toString() || e.message);
  }
}

function read(p){ try{ return fs.readFileSync(p, 'utf8'); } catch { return null; } }
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }

const cwd = process.cwd();
const report = [];
report.push('# HealthyTipApp Diagnostics');
report.push(`Working directory: ${cwd}`);
report.push('');

function section(title, body){ report.push(`\n## ${title}\n\n${body}`); }

// 1) Basic env
const nodeV = run('node -v').trim();
const npmV  = run('npm -v').trim();
section('Node/NPM', `node: ${nodeV}\nnpm: ${npmV}`);

// 2) RN info/doctor (no changes, just info)
section('react-native info', run('npx react-native info'));
section('react-native doctor (summary)', run('npx react-native doctor --json'));

// 3) Android toolchain quick check (non-fatal)
section('Android: env + tools', [
  'ANDROID_HOME=' + (process.env.ANDROID_HOME || ''),
  'ANDROID_SDK_ROOT=' + (process.env.ANDROID_SDK_ROOT || ''),
  'JAVA_HOME=' + (process.env.JAVA_HOME || ''),
  '\n> java -version:\n' + run('java -version'),
  '\n> adb version:\n' + run('adb version'),
  exists(path.join(cwd,'android','gradlew')) ? '\n> gradle wrapper version:\n' + run('cd android && gradlew -v') : 'gradlew not found'
].join('\n'));

// 4) Package versions & peer conflicts
const pkg = JSON.parse(read('package.json') || '{}');
function safeGet(obj,k){ return (obj && obj[k]) || {}; }
const deps = { ...safeGet(pkg,'dependencies'), ...safeGet(pkg,'devDependencies') };
const rn = deps['react-native'] || 'N/A';
const react = deps['react'] || 'N/A';
const jestNative = deps['@testing-library/jest-native'] || 'N/A';
const tlrn = deps['@testing-library/react-native'] || 'N/A';
section('Package.json snapshot',
  'react-native: ' + rn +
  '\nreact: ' + react +
  '\n@testing-library/jest-native: ' + jestNative +
  '\n@testing-library/react-native: ' + tlrn
);

// peer tree for common conflicts
section('npm ls (react / RN / testing)',
  run('npm ls react react-native @testing-library/react-native @testing-library/jest-native --depth=1')
);

// 5) Metro/Jest config presence
const hasBabel = exists('babel.config.js');
const hasJestCfg = exists('jest.config.js');
const hasJestSetupJS = exists('jest-setup.js');
const hasJestSetupTS = exists('jest-setup.ts');
const hasMetro = exists('metro.config.js') || exists('metro.config.cjs') || exists('metro.config.ts');
section('Config files present',
  `babel.config.js: ${hasBabel}` +
  `\njest.config.js: ${hasJestCfg}` +
  `\njest-setup.js: ${hasJestSetupJS}` +
  `\njest-setup.ts: ${hasJestSetupTS}` +
  `\nmetro.config.(js/ts): ${hasMetro}`
);

// 6) Quick content checks (non-invasive)
function grep(file, pattern){
  const c = read(file);
  if(!c) return 'missing';
  return new RegExp(pattern,'m').test(c) ? 'yes' : 'no';
}
const tig = hasJestCfg ? grep('jest.config.js', 'transformIgnorePatterns') : 'missing';
const setupFE = hasJestCfg ? grep('jest.config.js', 'setupFilesAfterEnv') : 'missing';
section('Jest config checks', `transformIgnorePatterns set: ${tig}\nsetupFilesAfterEnv set: ${setupFE}`);

// 7) Common root mismatch (Metro)
const looksLikeRoot = /HealthyTipApp[\\/]?$/.test(cwd);
section('Project root check', `Inside HealthyTipApp/: ${looksLikeRoot}`);

// 8) Optional: light Jest discovery (no watch, no cache flags)
section('Jest discovery (no fail stop)', run('npx jest --listTests --maxWorkers=1 || true'));

// 9) Summarize obvious issues
const hints = [];
if (!looksLikeRoot) { hints.push('- Not in project root. Run commands inside HealthyTipApp/.'); }
if (typeof react === 'string' && react.startsWith('19')) {
  hints.push('- React 19 detected: some test libs still expect React <= 18. Use --legacy-peer-deps or pin testing libs that support React 19.');
}
if (!hasJestCfg) { hints.push('- jest.config.js missing. Add preset:\"react-native\", babel-jest transform, and whitelist RN/testing libs in transformIgnorePatterns.'); }
if (hasJestCfg && setupFE === 'no') { hints.push('- jest.config.js lacks setupFilesAfterEnv pointing to jest-setup.js.'); }
if (hasJestCfg && tig === 'no') { hints.push('- transformIgnorePatterns may not whitelist RN/testing libs; untranspiled Flow/modern syntax can break collection.'); }
if (!hasBabel) { hints.push('- babel.config.js missing. Add metro-react-native-babel-preset and @babel/preset-typescript.'); }
section('Findings & Next Steps', hints.length ? hints.join('\n') : 'No critical red flags detected in static checks. Review doctor/info sections above.');

fs.writeFileSync('DIAGNOSE_REPORT.md', report.join('\n'), 'utf8');
console.log('\n\n=== WROTE DIAGNOSE_REPORT.md ===');
