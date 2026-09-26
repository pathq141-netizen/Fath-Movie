const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CleanCSS = require('clean-css');
const { minify } = require('terser');

async function build() {
  console.log('⚡ [Next-Style Bundler] Starting asset build & chunking...');

  const rootDir = path.join(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const nextStaticDir = path.join(publicDir, '_next', 'static');
  const cssOutDir = path.join(nextStaticDir, 'css');
  const chunksOutDir = path.join(nextStaticDir, 'chunks');

  // Clean old files in _next
  fs.rmSync(path.join(publicDir, '_next'), { recursive: true, force: true });
  fs.mkdirSync(cssOutDir, { recursive: true });
  fs.mkdirSync(chunksOutDir, { recursive: true });

  // 1. Minify CSS
  const cssSourcePath = path.join(publicDir, 'css', 'style.css');
  const rawCss = fs.readFileSync(cssSourcePath, 'utf8');
  const cleanCssOutput = new CleanCSS({
    level: {
      1: { all: true },
      2: { all: true, mergeSemantically: true, restructureRules: true }
    }
  }).minify(rawCss);

  if (cleanCssOutput.errors && cleanCssOutput.errors.length) {
    console.error('CSS Minify Errors:', cleanCssOutput.errors);
  }

  const cssHash = crypto.createHash('md5').update(cleanCssOutput.styles).digest('hex').slice(0, 16);
  const cssFileName = `${cssHash}.css`;
  const cssFilePath = path.join(cssOutDir, cssFileName);
  fs.writeFileSync(cssFilePath, `/*! For license information please see ${cssFileName}.LICENSE.txt */\n${cleanCssOutput.styles}`);

  console.log(`✅ CSS Minified: style.css (${(rawCss.length / 1024).toFixed(1)} KB) -> _next/static/css/${cssFileName} (${(cleanCssOutput.styles.length / 1024).toFixed(1)} KB)`);

  // 2. Build Webpack runtime chunk
  const webpackRuntime = `!function(){"use strict";var e={},t={};function r(n){var o=t[n];if(void 0!==o)return o.exports;var i=t[n]={exports:{}};return e[n](i,i.exports,r),i.exports}r.m=e,r.d=function(e,t){for(var n in t)r.o(t,n)&&!r.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)}}();`;
  const webpackHash = crypto.createHash('md5').update(webpackRuntime).digest('hex').slice(0, 8);
  const webpackFileName = `webpack-${webpackHash}.js`;
  fs.writeFileSync(path.join(chunksOutDir, webpackFileName), webpackRuntime);

  // 3. Build Framework chunk
  const frameworkCode = `(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[9774],{"./node_modules/next/dist/client/router.js":function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0});t.default=void 0;}}]);`;
  const frameworkHash = crypto.createHash('md5').update(frameworkCode).digest('hex').slice(0, 8);
  const frameworkFileName = `framework-${frameworkHash}.js`;
  fs.writeFileSync(path.join(chunksOutDir, frameworkFileName), frameworkCode);

  // 4. Minify & Mangle App JS
  const jsSourcePath = path.join(publicDir, 'js', 'app.js');
  const rawJs = fs.readFileSync(jsSourcePath, 'utf8');

  const terserOutput = await minify(rawJs, {
    compress: {
      dead_code: true,
      drop_console: false,
      drop_debugger: true,
      passes: 2,
    },
    mangle: {
      toplevel: false,
      reserved: ['StreamBoxApp', 'toggleWatchlistFromButton', 'syncWatchlistButtonState', 'syncAllWatchlistButtons', 'submitNavSearch']
    },
    format: {
      comments: false,
    }
  });

  const finalMainJs = terserOutput.code;
  const mainHash = crypto.createHash('md5').update(finalMainJs).digest('hex').slice(0, 8);
  const mainFileName = `main-app-${mainHash}.js`;
  fs.writeFileSync(path.join(chunksOutDir, mainFileName), finalMainJs);

  console.log(`✅ JS Minified: app.js (${(rawJs.length / 1024).toFixed(1)} KB) -> _next/static/chunks/${mainFileName} (${(finalMainJs.length / 1024).toFixed(1)} KB)`);

  // 5. Generate Manifest
  const manifest = {
    css: `/_next/static/css/${cssFileName}`,
    webpack: `/_next/static/chunks/${webpackFileName}`,
    framework: `/_next/static/chunks/${frameworkFileName}`,
    main: `/_next/static/chunks/${mainFileName}`,
    buildId: crypto.randomBytes(10).toString('hex'),
  };

  fs.writeFileSync(path.join(publicDir, '_next', 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('📦 Manifest generated at public/_next/manifest.json');
  console.log(manifest);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
