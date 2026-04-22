# Release Guide

This package follows the same release shape as the frontend packages in `xladmin`.

## Automated npm publish

The GitHub Actions workflow publishes the package when a tag matching `v*` is pushed.

Quality gates before publish:

- `npm ci`
- `npm run check`
- `npm test`
- `npm run build`
- `npm run pack:dry-run`

The publish job also checks that the git tag version matches `package.json`.

## Local release helper

Use the release helper from the repository root:

```bash
python scripts/release.py patch
python scripts/release.py minor
python scripts/release.py major
```

By default it:

- checks that the git worktree is clean;
- bumps `package.json`;
- runs `npm install --package-lock-only`;
- creates a release commit;
- creates a tag like `v0.1.1`.

It does not push automatically unless `--push` is passed:

```bash
python scripts/release.py patch --push
```

Manual push:

```bash
git push
git push origin v0.1.1
```

## Dry run

```bash
python scripts/release.py patch --dry-run
```

This prints the next version and tag without changing files.

## Manual npm publish

Manual publish is useful only if GitHub Actions is unavailable.

```bash
npm ci
npm run check
npm test
npm run build
npm run pack:dry-run
npm publish --access public
```

Before manual publish, make sure the version in `package.json` is already bumped and committed.
