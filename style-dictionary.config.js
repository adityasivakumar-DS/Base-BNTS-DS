import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary({
  log: {
    verbosity: 'verbose',
    warnings: 'warn',
  },
  source: [
    'tokens/core/**/*.json',
    'tokens/semantic/**/*.json',
    'tokens/base/**/*.json',
  ],

  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'ds',
      buildPath: 'build/css/',
      files: [
        {
          destination: 'core.css',
          format: 'css/variables',
          filter: (token) => token.filePath.startsWith('tokens/core/'),
          options: {
            selector: ':root',
            outputReferences: false,
          },
        },
        {
          destination: 'semantic.css',
          format: 'css/variables',
          filter: (token) => token.filePath.startsWith('tokens/semantic/'),
          options: {
            selector: ':root',
            outputReferences: true,
          },
        },
        {
          destination: 'base.css',
          format: 'css/variables',
          filter: (token) => token.filePath.startsWith('tokens/base/'),
          options: {
            selector: ':root',
            outputReferences: true,
          },
        },
      ],
    },

    json: {
      transformGroup: 'js',
      buildPath: 'build/json/',
      files: [
        {
          destination: 'tokens.json',
          format: 'json/nested',
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();
