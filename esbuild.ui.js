const esbuild = require('esbuild');
const sveltePlugin = require('esbuild-svelte');
const sveltePreprocess = require('svelte-preprocess');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

// Plugin to inline JS and CSS into HTML
const inlineHtmlPlugin = {
  name: 'inline-html',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;

      try {
        // Read the built files
        const jsContent = fs.readFileSync(path.join(__dirname, 'dist/ui.js'), 'utf8');
        const cssContent = fs.readFileSync(path.join(__dirname, 'dist/ui.css'), 'utf8');

        // Create inline HTML
        const inlineHtml =
                  `<!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <title>Basquiat</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
                    <style>
                  ${cssContent}
                    </style>
                  </head>
                  <body>
                    <script>
                  ${jsContent}
                    </script>
                  </body>
                  </html>`;

        // Write to index.html
        fs.writeFileSync(path.join(__dirname, 'index.html'), inlineHtml, 'utf8');
        console.log('Inlined HTML created successfully!');
      } catch (error) {
        console.error('Failed to inline HTML:', error);
      }
    });
  },
};

const buildOptions = {
  entryPoints: ['src/ui/ui.ts'],
  bundle: true,
  outfile: 'dist/ui.js',
  // conditions: ['browser', 'svelte'], 
  // mainFields: ['svelte', 'browser', 'module', 'main'],
  plugins: [
    sveltePlugin({
      preprocess: sveltePreprocess(),
    }),
    inlineHtmlPlugin,
  ],
  loader: {
    '.css': 'css',
  },
  logLevel: 'info',
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('Build complete!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
