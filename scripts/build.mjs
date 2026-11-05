import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');
const lucideCjsPath = resolve(
  rootDir,
  'node_modules/lucide-react/dist/cjs/lucide-react.js'
);

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = resolve(src, entry.name);
    const destPath = resolve(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function createZipFromDir(sourceDir, zipFilePath) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  function addFolderToZip(dir, zipFolder) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = zipFolder.folder(entry.name);
        addFolderToZip(fullPath, sub);
      } else {
        const data = fs.readFileSync(fullPath);
        zipFolder.file(entry.name, data);
      }
    }
  }

  addFolderToZip(sourceDir, zip);
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  fs.writeFileSync(zipFilePath, content);
}

async function buildExtension() {
  const args = process.argv.slice(2);
  const targetArg = args.find((a) => a.startsWith('--target='));
  const target = targetArg ? targetArg.split('=')[1] : 'all'; // 'chrome', 'firefox', or 'all'

  console.log(`\n========================================`);
  console.log(`Building Planalto Plus (Target: ${target.toUpperCase()})`);
  console.log(`========================================\n`);

  console.log('1/4 Building content script (self-contained IIFE for Shadow DOM)...');
  await build({
    root: rootDir,
    configFile: false,
    plugins: [react()],
    resolve: {
      alias: {
        'lucide-react': lucideCjsPath,
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/content/index.tsx'),
        name: 'PlanaltoModernoContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        maxParallelFileOps: 20,
        output: {
          extend: true,
        },
      },
    },
  });

  console.log('2/4 Building background service worker / background script...');
  await build({
    root: rootDir,
    configFile: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/background/index.ts'),
        name: 'PlanaltoModernoBackground',
        formats: ['iife'],
        fileName: () => 'background.js',
      },
    },
  });

  console.log('3/4 Building popup & demo pages...');
  await build({
    root: rootDir,
    configFile: resolve(rootDir, 'vite.config.ts'),
  });

  // Copy sql-wasm.wasm for Anki .apkg generator
  const wasmSrc = resolve(rootDir, 'node_modules/sql.js/dist/sql-wasm.wasm');
  if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, resolve(distDir, 'sql-wasm.wasm'));
    fs.copyFileSync(wasmSrc, resolve(rootDir, 'public/sql-wasm.wasm'));
    console.log('✓ Copied sql-wasm.wasm to dist/ and public/ for .apkg export.');
  }

  console.log('4/4 Assembling browser distributions...');

  const sharedFiles = [
    'content.js',
    'background.js',
    'popup.html',
    'index.html',
    'sql-wasm.wasm',
  ];

  const buildChrome = target === 'chrome' || target === 'all';
  const buildFirefox = target === 'firefox' || target === 'all';

  // Assembly helper
  const assembleTarget = async (browserName, manifestSrc, outSubDir) => {
    const targetDir = resolve(distDir, outSubDir);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    // Copy shared single files
    for (const file of sharedFiles) {
      const srcFile = resolve(distDir, file);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, resolve(targetDir, file));
      }
    }

    // Copy assets folder
    const assetsSrc = resolve(distDir, 'assets');
    if (fs.existsSync(assetsSrc)) {
      copyDirSync(assetsSrc, resolve(targetDir, 'assets'));
    }

    // Copy icons folder
    const iconsSrc = resolve(distDir, 'icons');
    if (fs.existsSync(iconsSrc)) {
      copyDirSync(iconsSrc, resolve(targetDir, 'icons'));
    }

    // Copy specific manifest as manifest.json
    fs.copyFileSync(manifestSrc, resolve(targetDir, 'manifest.json'));

    // Create zip & xpi package
    const zipName = `planalto-moderno-${browserName}.zip`;
    const zipPath = resolve(distDir, zipName);
    await createZipFromDir(targetDir, zipPath);
    console.log(`✓ ${browserName.toUpperCase()} package generated: dist/${outSubDir}/ & dist/${zipName}`);

    if (browserName === 'firefox') {
      const xpiPath = resolve(distDir, 'planalto-moderno-firefox.xpi');
      fs.copyFileSync(zipPath, xpiPath);
      console.log(`✓ FIREFOX XPI package generated: dist/planalto-moderno-firefox.xpi`);

      // Package clean source code ZIP for Firefox AMO review submission
      const JSZip = (await import('jszip')).default;
      const sourceZip = new JSZip();
      const includeDirs = ['src', 'public', 'scripts', 'docs'];
      const includeFiles = [
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'vite.config.ts',
        'tailwind.config.js',
        'postcss.config.js',
        'popup.html',
        'index.html',
        'README.md',
        'CHROMEWEBSTORE.md',
        'PRIVACY.md',
      ];

      function addTree(dirPath, zipFolder) {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const item of items) {
          const full = resolve(dirPath, item.name);
          if (item.isDirectory()) {
            addTree(full, zipFolder.folder(item.name));
          } else {
            zipFolder.file(item.name, fs.readFileSync(full));
          }
        }
      }

      for (const d of includeDirs) {
        const fullD = resolve(rootDir, d);
        if (fs.existsSync(fullD)) {
          addTree(fullD, sourceZip.folder(d));
        }
      }
      for (const f of includeFiles) {
        const fullF = resolve(rootDir, f);
        if (fs.existsSync(fullF)) {
          sourceZip.file(f, fs.readFileSync(fullF));
        }
      }

      const srcContent = await sourceZip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });
      const srcZipPath = resolve(distDir, 'planalto-moderno-source.zip');
      fs.writeFileSync(srcZipPath, srcContent);
      console.log(`✓ FIREFOX Reviewer Source ZIP generated: dist/planalto-moderno-source.zip`);
    }
  };

  if (buildChrome) {
    const chromeManifest = resolve(rootDir, 'public/manifest.json');
    await assembleTarget('chrome', chromeManifest, 'chrome');
  }

  if (buildFirefox) {
    const firefoxManifest = resolve(rootDir, 'public/manifest.firefox.json');
    await assembleTarget('firefox', firefoxManifest, 'firefox');
  }

  // Ensure root dist/manifest.json is Chrome's for backward compatibility
  const chromeManifestSrc = resolve(rootDir, 'public/manifest.json');
  fs.copyFileSync(chromeManifestSrc, resolve(distDir, 'manifest.json'));

  // Clean extraneous manifest.firefox.json from root dist
  const strayFirefoxManifest = resolve(distDir, 'manifest.firefox.json');
  if (fs.existsSync(strayFirefoxManifest)) {
    fs.unlinkSync(strayFirefoxManifest);
  }

  console.log('\n========================================');
  console.log('Build completed successfully!');
  console.log('Distributions:');
  if (buildChrome) {
    console.log('  • Chrome (Unpacked): dist/chrome/ (or dist/)');
    console.log('  • Chrome (Zip):      dist/planalto-moderno-chrome.zip');
  }
  if (buildFirefox) {
    console.log('  • Firefox (Add-on):  dist/firefox/');
    console.log('  • Firefox (Zip):     dist/planalto-moderno-firefox.zip');
    console.log('  • Firefox (XPI):     dist/planalto-moderno-firefox.xpi');
    console.log('  • Firefox (Source):  dist/planalto-moderno-source.zip (for AMO review)');
  }
  console.log('========================================\n');
}

buildExtension().catch((err) => {
  console.error(err);
  process.exit(1);
});
