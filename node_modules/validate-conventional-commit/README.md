# validate-conventional-commit

Smallest simplest conventional commit validator to use with eg [`husky`](https://github.com/typicode/husky)

[![npm version](https://img.shields.io/npm/v/validate-conventional-commit.svg?style=flat)](https://www.npmjs.com/package/validate-conventional-commit)
[![npm downloads](https://img.shields.io/npm/dm/validate-conventional-commit.svg?style=flat)](https://www.npmjs.com/package/validate-conventional-commit)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-7fffff?style=flat&labelColor=ff80ff)](https://github.com/neostandard/neostandard)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)
[![Follow @voxpelli@mastodon.social](https://img.shields.io/mastodon/follow/109247025527949675?domain=https%3A%2F%2Fmastodon.social&style=social)](https://mastodon.social/@voxpelli)

## Usage

```bash
npx --no validate-conventional-commit < .git/COMMIT_EDITMSG
```

(Or simply just copy and paste the [`cli.js`](cli.js) file into your project if you want to avoid a dependency)

## Related modules

* [`@commitlint/cli`](https://www.npmjs.com/package/@commitlint/cli) – a much more comprehensive and much more heavy alternative
* [`husky`](https://github.com/typicode/husky) – my preferred git hook manager
* [`mtfoley/pr-compliance-action`](https://github.com/mtfoley/pr-compliance-action) – an action that helps validating conventional commit style in PR:s, something this module is not really geared towards
