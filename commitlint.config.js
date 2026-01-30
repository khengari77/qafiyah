/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'style',
        'refactor',
        'test',
        'perf',
        'build',
        'ci',
        'revert',
        'wip',
        'merge',
        'hotfix',
        'deps',
        'config',
        'lint',
        'types',
      ],
    ],
    'header-max-length': [2, 'always', 280],
  },
};
