// English messages. Every user-visible string lives in this table (and its Korean twin).
// Placeholders look like {name}; both tables must use the same placeholders.
export const en = {
    // --- help ---
    'help.text': `plugslim - keep only the skills you use from a Claude Code plugin

Usage:
  plugslim ls [plugin-id] [--path <dir>] [--json] [--context-window N] [--max-tokens N]
  plugslim pick <plugin-id> (--keep a,b | --drop c) [--dry-run] [--yes]
  plugslim sync [plugin-id] [--include-new] [--dry-run] [--check] [--quiet]
  plugslim restore [plugin-id | --all]
  plugslim doctor [--project-dir <dir>]

Commands:
  ls       show the estimated always-on skill-listing token cost per plugin
  pick     build a copy of a plugin with only the chosen skills and switch to it
  sync     re-apply the same pick after the original plugin was updated
  restore  switch back to the original plugin and remove the copy
  doctor   check for settings that undo or break a pick

Options:
  --config-dir <dir>   Claude Code config dir (default: $CLAUDE_CONFIG_DIR or ~/.claude)
  --store-dir <dir>    plugslim store dir (default: $PLUGSLIM_HOME or ~/.plugslim)
  --lang en|ko         output language (default: $PLUGSLIM_LANG, then LC_ALL/LC_MESSAGES/LANG)
  --marketplace-name   name of the overlay marketplace (default: plugslim)
  -h, --help           show this help
  -v, --version        show the version

Exit codes: 0 ok, 1 findings (doctor error, --max-tokens exceeded, sync --check needs a rebuild), 2 usage or input error.
Token numbers are estimates (about 4 characters per token).`,
    'version.text': 'plugslim {version}',
    // --- errors (exit 2) ---
    'err.argParse': 'Invalid arguments: {detail}. Run "plugslim --help".',
    'err.unknownCommand': 'Unknown command "{name}". Run "plugslim --help" for the list.',
    'err.badLang': 'Unsupported --lang value "{value}". Use "en" or "ko".',
    'err.badNumber': 'Option --{option} needs a positive number, got "{value}".',
    'err.settingsInvalid': 'Cannot parse {file} as JSON ({detail}). Fix or remove the file, then run again. Nothing was written.',
    'err.fileUnreadable': 'Cannot read {file} ({detail}). Check that it is a file you can read, or pass --config-dir. Nothing was written.',
    'err.settingsShape': '{file}: "{key}" must be a JSON object. Fix the file, then run again. Nothing was written.',
    'err.installedFormat': 'Unsupported installed_plugins.json format in {file}. Expected {"plugins": {...}} or an array of records with "installPath".',
    'err.stateInvalid': 'Cannot read plugslim state file {file} ({detail}). Move it away to start over.',
    'err.unknownPlugin': 'Plugin "{id}" is not installed. Installed: {available}.',
    'err.ambiguousPlugin': 'Name "{id}" matches several plugins: {available}. Use the full id.',
    'err.pickNeedsId': 'pick needs a plugin id. Installed: {available}.',
    'err.pickNeedsSelection': 'pick needs --keep a,b or --drop c.',
    'err.pickBothSelections': 'Use either --keep or --drop, not both.',
    'err.pickEmpty': 'Nothing would be kept. To remove every skill, disable the plugin instead.',
    'err.unknownItems': 'Unknown skill/command name(s): {names}. Available: {available}.',
    'err.sourceMissing': 'Install path of {id} is missing: {path}. Reinstall the plugin, then run again.',
    'err.reservedMarketplace': 'Marketplace name "{name}" is reserved. Choose another with --marketplace-name.',
    'err.marketplaceLocked': 'The overlay marketplace is already "{name}". Restore existing overlays before using another name.',
    'err.alreadyOverlay': '{id} is an overlay made by plugslim. Pick again with the original id: {origin}.',
    'err.entryConflict': 'The overlay name "{name}" is already used for {origin}. Restore that overlay first.',
    'err.selfCheck': 'Self-check failed for the overlay of {id}: {problems}. Nothing was switched.',
    'err.restoreNeedsId': 'restore needs a plugin id or --all. Overlays: {available}.',
    'err.pathNotPlugin': '{path} is not a plugin folder (no skills/, commands/ or .claude-plugin/plugin.json).',
    'err.internal': 'Unexpected error: {detail}',
    // --- ls ---
    'ls.estimateNote': 'Estimated tokens (about 4 chars per token). Budget = {fraction}% x {window} = {budget} tokens; per-entry cap {cap} chars.',
    'ls.col.plugin': 'PLUGIN',
    'ls.col.items': 'ITEMS',
    'ls.col.tokens': 'TOKENS',
    'ls.col.budget': 'BUDGET',
    'ls.col.status': 'STATUS',
    'ls.col.kind': 'KIND',
    'ls.col.name': 'NAME',
    'ls.col.chars': 'CHARS',
    'ls.status.enabled': 'enabled',
    'ls.status.disabled': 'disabled',
    'ls.status.overlay': 'overlay',
    'ls.status.path': 'path',
    'ls.kind.skill': 'skill',
    'ls.kind.command': 'command',
    'ls.noListing': 'not listed (disable-model-invocation)',
    'ls.total': 'Total (enabled): {tokens} tok of {budget} budget ({percent}%)',
    'ls.totalPath': 'Total: {tokens} tok of {budget} budget ({percent}%)',
    'ls.noPlugins': 'No installed plugins found in {dir}.',
    'ls.overCap': 'Always-on listing cost {tokens} tok exceeds --max-tokens {max}.',
    'ls.warn.sourceMissing': 'install path missing: {path}',
    'ls.warn.settingsIgnored': 'Note: could not use {file} ({detail}); counting with the default listing settings.',
    'ls.warn.manifestInvalid': '{file}: cannot read it as a JSON object ({detail}); scanned as if there were no manifest',
    'ls.warn.unsafePath': 'skipped manifest "{field}" path that leaves the plugin folder: {path}',
    'ls.warn.frontmatter': '{file}: frontmatter is not valid YAML ({detail}); counted without description',
    // --- pick ---
    'pick.header': '{id}: {before} -> {after} estimated tokens ({count} of {total} items kept)',
    'pick.kept': 'keep: {names}',
    'pick.dropped': 'drop: {names}',
    'pick.filesHeader': 'Overlay will be written to {path}',
    'pick.settingsHeader': 'Settings change in {file}:',
    'pick.noSettingsChange': 'Settings already point to the overlay; no change.',
    'pick.wasDisabled': '{id} was not enabled; the slim copy will be enabled.',
    'pick.dryRunDone': 'Dry run: nothing was written.',
    'pick.done': 'Done. {id} is replaced by {overlayId} ({before} -> {after} estimated tokens).',
    'pick.backup': 'Settings backup: {path}',
    'pick.reload': 'Start a new session or run /reload-plugins to load the slim copy. Undo with: plugslim restore {id}',
    'pick.warnManifest': 'Removed manifest entries that no longer point to anything: {paths}',
    // --- sync ---
    'sync.none': 'No overlays to sync. Create one with: plugslim pick <plugin-id> --keep a,b',
    'sync.upToDate': '{id}: up to date',
    'sync.needsRebuild': '{id}: original changed ({from} -> {to}); rebuild needed',
    'sync.rebuilt': '{id}: rebuilt from {to} ({before} -> {after} estimated tokens)',
    'sync.newItems': 'new: {names} (excluded; add with --include-new or plugslim pick {id} --keep ...)',
    'sync.newIncluded': 'new: {names} (included)',
    'sync.removedItems': 'removed upstream: {names}',
    'sync.sourceMissing': '{id}: SOURCE_MISSING - original is not installed ({path}); keeping the existing overlay',
    'sync.dryRun': 'Dry run: nothing was written.',
    // --- restore ---
    'restore.nothing': 'Nothing to restore.',
    'restore.nothingFor': 'Nothing to restore for {id}.',
    'restore.done': 'Restored {id} (overlay {overlayId} removed).',
    'restore.reload': 'Start a new session or run /reload-plugins.',
    // --- doctor ---
    'doctor.ok': 'No problems found.',
    'doctor.noOverlays': 'No overlays registered; nothing to check.',
    'doctor.error': 'ERROR',
    'doctor.warn': 'WARN',
    'doctor.summary': '{errors} error(s), {warnings} warning(s).',
    'doctor.PROJECT_OVERRIDE': '{file} re-enables {id}. Set it to false there (for example in .claude/settings.local.json).',
    'doctor.LOCAL_OVERRIDE': '{file} re-enables {id}. Set it to false there.',
    'doctor.DUPLICATE_NAME': 'Both {id} and {overlayId} are enabled; they share the plugin name and only one loads fully. Set {id} to false.',
    'doctor.BROKEN_PATH': 'Overlay {overlayId}: manifest path {path} does not exist. Run plugslim sync {id} or plugslim restore {id}.',
    'doctor.BAD_PATH': 'Overlay {overlayId}: manifest path {path} is not a relative path inside the plugin.',
    'doctor.OVERLAY_MISSING': 'Overlay folder {path} is missing. Run plugslim sync {id} or plugslim restore {id}.',
    'doctor.SOURCE_MISSING': '{id} is no longer installed ({path}); the overlay keeps working but cannot be synced.',
    'doctor.STALE_OVERLAY': '{id} changed since the overlay was built ({from} -> {to}). Run plugslim sync {id}.',
    // --- demo (scripts/demo.mjs) ---
    'demo.header': 'practice fixture, not your real Claude Code config (temp copy: {dir})',
    'demo.summary': '--- summary ---',
    'demo.before': 'before:   {tokens} tok (estimated)',
    'demo.after': 'after:    {tokens} tok (estimated)',
    'demo.restored': 'restored: {answer} ({tokens} tok, settings and overlay back to the original)',
    'demo.yes': 'yes',
    'demo.no': 'NO',
};
