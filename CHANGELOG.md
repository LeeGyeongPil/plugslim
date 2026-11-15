# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-15

### Added

- `plugslim ls`: estimated always-on skill-listing token cost per plugin (table, `--json` with warnings as `{code, file?, path?, field?, detail?, message}` objects, `--path`, `--context-window`, `--max-tokens` with exit code 1 for CI).
- `plugslim pick`: build a copy of a plugin with only the chosen skills and commands (`--keep` / `--drop`, `--dry-run`) and switch to it through a local-directory marketplace and `enabledPlugins`.
- `plugslim sync`: re-apply the same pick after the original plugin changed (version and content hash), with `--include-new`, `--dry-run` and `--check`.
- `plugslim restore`: put the settings keys back and delete the overlay; safe to run twice.
- `plugslim doctor`: `PROJECT_OVERRIDE`, `LOCAL_OVERRIDE`, `DUPLICATE_NAME`, `BROKEN_PATH`, `BAD_PATH`, `OVERLAY_MISSING`, `SOURCE_MISSING`, `STALE_OVERLAY`.
- English and Korean output (`--lang en|ko`, `PLUGSLIM_LANG`, `LC_ALL` / `LC_MESSAGES` / `LANG`).
- Practice fixture `examples/sample-home/.claude` and `npm run demo`.
