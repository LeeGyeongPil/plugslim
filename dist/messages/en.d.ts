export declare const en: {
    readonly 'help.text': `plugslim - keep only the skills you use from a Claude Code plugin

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
Token numbers are estimates (about 4 characters per token).`;
    readonly 'version.text': 'plugslim {version}';
    readonly 'err.argParse': 'Invalid arguments: {detail}. Run "plugslim --help".';
    readonly 'err.unknownCommand': 'Unknown command "{name}". Run "plugslim --help" for the list.';
    readonly 'err.badLang': 'Unsupported --lang value "{value}". Use "en" or "ko".';
    readonly 'err.badNumber': 'Option --{option} needs a positive number, got "{value}".';
    readonly 'err.settingsInvalid': 'Cannot parse {file} as JSON ({detail}). Fix or remove the file, then run again. Nothing was written.';
    readonly 'err.fileUnreadable': 'Cannot read {file} ({detail}). Check that it is a file you can read, or pass --config-dir. Nothing was written.';
    readonly 'err.settingsShape': '{file}: "{key}" must be a JSON object. Fix the file, then run again. Nothing was written.';
    readonly 'err.installedFormat': 'Unsupported installed_plugins.json format in {file}. Expected {"plugins": {...}} or an array of records with "installPath".';
    readonly 'err.stateInvalid': 'Cannot read plugslim state file {file} ({detail}). Move it away to start over.';
    readonly 'err.unknownPlugin': 'Plugin "{id}" is not installed. Installed: {available}.';
    readonly 'err.ambiguousPlugin': 'Name "{id}" matches several plugins: {available}. Use the full id.';
    readonly 'err.pickNeedsId': 'pick needs a plugin id. Installed: {available}.';
    readonly 'err.pickNeedsSelection': 'pick needs --keep a,b or --drop c.';
    readonly 'err.pickBothSelections': 'Use either --keep or --drop, not both.';
    readonly 'err.pickEmpty': 'Nothing would be kept. To remove every skill, disable the plugin instead.';
    readonly 'err.unknownItems': 'Unknown skill/command name(s): {names}. Available: {available}.';
    readonly 'err.sourceMissing': 'Install path of {id} is missing: {path}. Reinstall the plugin, then run again.';
    readonly 'err.reservedMarketplace': 'Marketplace name "{name}" is reserved. Choose another with --marketplace-name.';
    readonly 'err.marketplaceLocked': 'The overlay marketplace is already "{name}". Restore existing overlays before using another name.';
    readonly 'err.alreadyOverlay': '{id} is an overlay made by plugslim. Pick again with the original id: {origin}.';
    readonly 'err.entryConflict': 'The overlay name "{name}" is already used for {origin}. Restore that overlay first.';
    readonly 'err.selfCheck': 'Self-check failed for the overlay of {id}: {problems}. Nothing was switched.';
    readonly 'err.restoreNeedsId': 'restore needs a plugin id or --all. Overlays: {available}.';
    readonly 'err.pathNotPlugin': '{path} is not a plugin folder (no skills/, commands/ or .claude-plugin/plugin.json).';
    readonly 'err.internal': 'Unexpected error: {detail}';
    readonly 'ls.estimateNote': 'Estimated tokens (about 4 chars per token). Budget = {fraction}% x {window} = {budget} tokens; per-entry cap {cap} chars.';
    readonly 'ls.col.plugin': 'PLUGIN';
    readonly 'ls.col.items': 'ITEMS';
    readonly 'ls.col.tokens': 'TOKENS';
    readonly 'ls.col.budget': 'BUDGET';
    readonly 'ls.col.status': 'STATUS';
    readonly 'ls.col.kind': 'KIND';
    readonly 'ls.col.name': 'NAME';
    readonly 'ls.col.chars': 'CHARS';
    readonly 'ls.status.enabled': 'enabled';
    readonly 'ls.status.disabled': 'disabled';
    readonly 'ls.status.overlay': 'overlay';
    readonly 'ls.status.path': 'path';
    readonly 'ls.kind.skill': 'skill';
    readonly 'ls.kind.command': 'command';
    readonly 'ls.noListing': 'not listed (disable-model-invocation)';
    readonly 'ls.total': 'Total (enabled): {tokens} tok of {budget} budget ({percent}%)';
    readonly 'ls.totalPath': 'Total: {tokens} tok of {budget} budget ({percent}%)';
    readonly 'ls.noPlugins': 'No installed plugins found in {dir}.';
    readonly 'ls.overCap': 'Always-on listing cost {tokens} tok exceeds --max-tokens {max}.';
    readonly 'ls.warn.sourceMissing': 'install path missing: {path}';
    readonly 'ls.warn.settingsIgnored': 'Note: could not use {file} ({detail}); counting with the default listing settings.';
    readonly 'ls.warn.manifestInvalid': '{file}: cannot read it as a JSON object ({detail}); scanned as if there were no manifest';
    readonly 'ls.warn.unsafePath': 'skipped manifest "{field}" path that leaves the plugin folder: {path}';
    readonly 'ls.warn.frontmatter': '{file}: frontmatter is not valid YAML ({detail}); counted without description';
    readonly 'pick.header': '{id}: {before} -> {after} estimated tokens ({count} of {total} items kept)';
    readonly 'pick.kept': 'keep: {names}';
    readonly 'pick.dropped': 'drop: {names}';
    readonly 'pick.filesHeader': 'Overlay will be written to {path}';
    readonly 'pick.settingsHeader': 'Settings change in {file}:';
    readonly 'pick.noSettingsChange': 'Settings already point to the overlay; no change.';
    readonly 'pick.wasDisabled': '{id} was not enabled; the slim copy will be enabled.';
    readonly 'pick.dryRunDone': 'Dry run: nothing was written.';
    readonly 'pick.done': 'Done. {id} is replaced by {overlayId} ({before} -> {after} estimated tokens).';
    readonly 'pick.backup': 'Settings backup: {path}';
    readonly 'pick.reload': 'Start a new session or run /reload-plugins to load the slim copy. Undo with: plugslim restore {id}';
    readonly 'pick.warnManifest': 'Removed manifest entries that no longer point to anything: {paths}';
    readonly 'sync.none': 'No overlays to sync. Create one with: plugslim pick <plugin-id> --keep a,b';
    readonly 'sync.upToDate': '{id}: up to date';
    readonly 'sync.needsRebuild': '{id}: original changed ({from} -> {to}); rebuild needed';
    readonly 'sync.rebuilt': '{id}: rebuilt from {to} ({before} -> {after} estimated tokens)';
    readonly 'sync.newItems': 'new: {names} (excluded; add with --include-new or plugslim pick {id} --keep ...)';
    readonly 'sync.newIncluded': 'new: {names} (included)';
    readonly 'sync.removedItems': 'removed upstream: {names}';
    readonly 'sync.sourceMissing': '{id}: SOURCE_MISSING - original is not installed ({path}); keeping the existing overlay';
    readonly 'sync.dryRun': 'Dry run: nothing was written.';
    readonly 'restore.nothing': 'Nothing to restore.';
    readonly 'restore.nothingFor': 'Nothing to restore for {id}.';
    readonly 'restore.done': 'Restored {id} (overlay {overlayId} removed).';
    readonly 'restore.reload': 'Start a new session or run /reload-plugins.';
    readonly 'doctor.ok': 'No problems found.';
    readonly 'doctor.noOverlays': 'No overlays registered; nothing to check.';
    readonly 'doctor.error': 'ERROR';
    readonly 'doctor.warn': 'WARN';
    readonly 'doctor.summary': '{errors} error(s), {warnings} warning(s).';
    readonly 'doctor.PROJECT_OVERRIDE': '{file} re-enables {id}. Set it to false there (for example in .claude/settings.local.json).';
    readonly 'doctor.LOCAL_OVERRIDE': '{file} re-enables {id}. Set it to false there.';
    readonly 'doctor.DUPLICATE_NAME': 'Both {id} and {overlayId} are enabled; they share the plugin name and only one loads fully. Set {id} to false.';
    readonly 'doctor.BROKEN_PATH': 'Overlay {overlayId}: manifest path {path} does not exist. Run plugslim sync {id} or plugslim restore {id}.';
    readonly 'doctor.BAD_PATH': 'Overlay {overlayId}: manifest path {path} is not a relative path inside the plugin.';
    readonly 'doctor.OVERLAY_MISSING': 'Overlay folder {path} is missing. Run plugslim sync {id} or plugslim restore {id}.';
    readonly 'doctor.SOURCE_MISSING': '{id} is no longer installed ({path}); the overlay keeps working but cannot be synced.';
    readonly 'doctor.STALE_OVERLAY': '{id} changed since the overlay was built ({from} -> {to}). Run plugslim sync {id}.';
    readonly 'demo.header': 'practice fixture, not your real Claude Code config (temp copy: {dir})';
    readonly 'demo.summary': '--- summary ---';
    readonly 'demo.before': 'before:   {tokens} tok (estimated)';
    readonly 'demo.after': 'after:    {tokens} tok (estimated)';
    readonly 'demo.restored': 'restored: {answer} ({tokens} tok, settings and overlay back to the original)';
    readonly 'demo.yes': 'yes';
    readonly 'demo.no': 'NO';
};
export type MessageKey = keyof typeof en;
