const esbuild = require('esbuild');
const sveltePlugin = require('esbuild-svelte');
const sveltePreprocess = require('svelte-preprocess');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/ui/ui.ts'],
  bundle: true,
  outfile: 'dist/ui.js',
  plugins: [
    sveltePlugin({
      preprocess: sveltePreprocess(),
    }),
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
