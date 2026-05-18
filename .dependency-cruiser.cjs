/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-app',
      comment:
        'Apps must not import from sibling apps. Move shared code to packages/* or call across HTTP.',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/([^/]+)/', pathNot: '^apps/$1/' },
    },
    {
      name: 'no-app-from-package',
      comment: 'Shared packages must not depend on app code.',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'not-to-test',
      comment: 'Production code must not import test files.',
      severity: 'error',
      from: { pathNot: '\\.(test|spec)\\.[tj]sx?$' },
      to: { path: '\\.(test|spec)\\.[tj]sx?$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: [
        'node_modules',
        '\\.turbo',
        'dist',
        'build',
        'coverage',
        '\\.astro',
        'apps/web/\\.astro',
      ],
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
