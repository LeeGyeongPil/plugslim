export const ko = {
    // --- 도움말 ---
    'help.text': `plugslim - Claude Code 플러그인에서 쓰는 스킬만 남깁니다

사용법:
  plugslim ls [plugin-id] [--path <dir>] [--json] [--context-window N] [--max-tokens N]
  plugslim pick <plugin-id> (--keep a,b | --drop c) [--dry-run] [--yes]
  plugslim sync [plugin-id] [--include-new] [--dry-run] [--check] [--quiet]
  plugslim restore [plugin-id | --all]
  plugslim doctor [--project-dir <dir>]

명령:
  ls       플러그인별로 매 턴 실리는 스킬 목록의 추정 토큰 비용을 보여 줍니다
  pick     고른 스킬만 든 플러그인 복사본을 만들어 바꿔 켭니다
  sync     원본 플러그인이 업데이트되면 같은 선택을 다시 적용합니다
  restore  원본 플러그인으로 되돌리고 복사본을 지웁니다
  doctor   선택을 되돌리거나 깨뜨리는 설정이 있는지 점검합니다

옵션:
  --config-dir <dir>   Claude Code 설정 폴더 (기본: $CLAUDE_CONFIG_DIR 또는 ~/.claude)
  --store-dir <dir>    plugslim 저장 폴더 (기본: $PLUGSLIM_HOME 또는 ~/.plugslim)
  --lang en|ko         출력 언어 (기본: $PLUGSLIM_LANG, 그다음 LC_ALL/LC_MESSAGES/LANG)
  --marketplace-name   복사본 마켓플레이스 이름 (기본: plugslim)
  -h, --help           이 도움말
  -v, --version        버전

종료 코드: 0 정상, 1 점검 결과 있음(doctor 오류, --max-tokens 초과, sync --check 에서 다시 만들어야 함), 2 사용법·입력 오류.
토큰 수치는 추정값입니다(4글자당 약 1토큰).`,
    'version.text': 'plugslim {version}',
    // --- 오류 (종료 코드 2) ---
    'err.argParse': '인자가 올바르지 않습니다: {detail}. "plugslim --help" 를 실행해 보세요.',
    'err.unknownCommand': '"{name}" 은(는) 모르는 명령입니다. 목록은 "plugslim --help" 로 확인하세요.',
    'err.badLang': '--lang 값 "{value}" 을(를) 지원하지 않습니다. "en" 또는 "ko" 를 쓰세요.',
    'err.badNumber': '--{option} 옵션에는 양수가 필요합니다. 받은 값: "{value}".',
    'err.settingsInvalid': '{file} 을(를) JSON 으로 읽을 수 없습니다({detail}). 파일을 고치거나 지운 뒤 다시 실행하세요. 아무것도 쓰지 않았습니다.',
    'err.fileUnreadable': '{file} 을(를) 열 수 없습니다({detail}). 읽을 수 있는 파일인지 확인하거나 --config-dir 을 지정하세요. 아무것도 쓰지 않았습니다.',
    'err.settingsShape': '{file}: "{key}" 는 JSON 객체여야 합니다. 파일을 고친 뒤 다시 실행하세요. 아무것도 쓰지 않았습니다.',
    'err.installedFormat': '{file} 의 installed_plugins.json 형식을 지원하지 않습니다. {"plugins": {...}} 또는 "installPath" 가 있는 레코드 배열이어야 합니다.',
    'err.stateInvalid': 'plugslim 상태 파일 {file} 을(를) 읽을 수 없습니다({detail}). 파일을 옮기고 처음부터 다시 시작하세요.',
    'err.unknownPlugin': '플러그인 "{id}" 이(가) 설치되어 있지 않습니다. 설치된 목록: {available}.',
    'err.ambiguousPlugin': '이름 "{id}" 에 해당하는 플러그인이 여러 개입니다: {available}. 전체 id 를 쓰세요.',
    'err.pickNeedsId': 'pick 에는 플러그인 id 가 필요합니다. 설치된 목록: {available}.',
    'err.pickNeedsSelection': 'pick 에는 --keep a,b 또는 --drop c 가 필요합니다.',
    'err.pickBothSelections': '--keep 과 --drop 은 함께 쓸 수 없습니다.',
    'err.pickEmpty': '남는 항목이 없습니다. 스킬을 모두 없애려면 플러그인을 끄세요.',
    'err.unknownItems': '모르는 스킬/명령 이름: {names}. 사용 가능: {available}.',
    'err.sourceMissing': '{id} 의 설치 경로가 없습니다: {path}. 플러그인을 다시 설치한 뒤 실행하세요.',
    'err.reservedMarketplace': '마켓플레이스 이름 "{name}" 은(는) 예약되어 있습니다. --marketplace-name 으로 다른 이름을 고르세요.',
    'err.marketplaceLocked': '복사본 마켓플레이스는 이미 "{name}" 입니다. 다른 이름을 쓰려면 기존 복사본을 먼저 restore 하세요.',
    'err.alreadyOverlay': '{id} 은(는) plugslim 이 만든 복사본입니다. 원본 id 로 다시 pick 하세요: {origin}.',
    'err.entryConflict': '복사본 이름 "{name}" 은(는) 이미 {origin} 에 쓰이고 있습니다. 그 복사본을 먼저 restore 하세요.',
    'err.selfCheck': '{id} 복사본의 자체 검사에 실패했습니다: {problems}. 아무것도 바꾸지 않았습니다.',
    'err.restoreNeedsId': 'restore 에는 플러그인 id 또는 --all 이 필요합니다. 복사본 목록: {available}.',
    'err.pathNotPlugin': '{path} 은(는) 플러그인 폴더가 아닙니다(skills/, commands/, .claude-plugin/plugin.json 이 없음).',
    'err.internal': '예기치 않은 오류: {detail}',
    // --- ls ---
    'ls.estimateNote': '추정 토큰(4글자당 약 1토큰). 예산 = {fraction}% x {window} = {budget} 토큰, 항목당 상한 {cap}자.',
    'ls.col.plugin': '플러그인',
    'ls.col.items': '항목',
    'ls.col.tokens': '토큰',
    'ls.col.budget': '예산',
    'ls.col.status': '상태',
    'ls.col.kind': '종류',
    'ls.col.name': '이름',
    'ls.col.chars': '글자',
    'ls.status.enabled': '켜짐',
    'ls.status.disabled': '꺼짐',
    'ls.status.overlay': '복사본',
    'ls.status.path': '경로',
    'ls.kind.skill': '스킬',
    'ls.kind.command': '명령',
    'ls.noListing': '목록에 안 실림 (disable-model-invocation)',
    'ls.total': '합계(켜진 것): {tokens} tok / 예산 {budget} ({percent}%)',
    'ls.totalPath': '합계: {tokens} tok / 예산 {budget} ({percent}%)',
    'ls.noPlugins': '{dir} 에서 설치된 플러그인을 찾지 못했습니다.',
    'ls.overCap': '상시 목록 비용 {tokens} tok 이(가) --max-tokens {max} 를 넘었습니다.',
    'ls.warn.sourceMissing': '설치 경로 없음: {path}',
    'ls.warn.settingsIgnored': '참고: {file} 을(를) 쓸 수 없어({detail}) 기본 목록 설정으로 계산합니다.',
    'ls.warn.manifestInvalid': '{file}: JSON 객체로 읽을 수 없습니다({detail}). 매니페스트가 없는 것으로 보고 검사했습니다.',
    'ls.warn.unsafePath': '플러그인 폴더 밖을 가리키는 매니페스트 "{field}" 경로를 건너뛰었습니다: {path}',
    'ls.warn.frontmatter': '{file}: frontmatter 가 올바른 YAML 이 아닙니다({detail}). 설명 없이 계산했습니다.',
    // --- pick ---
    'pick.header': '{id}: 추정 토큰 {before} -> {after} (전체 {total}개 중 {count}개 유지)',
    'pick.kept': '유지: {names}',
    'pick.dropped': '제외: {names}',
    'pick.filesHeader': '복사본을 쓸 위치: {path}',
    'pick.settingsHeader': '{file} 설정 변경:',
    'pick.noSettingsChange': '설정이 이미 복사본을 가리키고 있어 바뀌는 것이 없습니다.',
    'pick.wasDisabled': '{id} 은(는) 꺼져 있었습니다. 가벼운 복사본은 켜진 상태로 만듭니다.',
    'pick.dryRunDone': '미리보기입니다. 아무것도 쓰지 않았습니다.',
    'pick.done': '완료. {id} 을(를) {overlayId} 로 바꿨습니다(추정 토큰 {before} -> {after}).',
    'pick.backup': '설정 백업: {path}',
    'pick.reload': '새 세션을 시작하거나 /reload-plugins 를 실행하면 가벼워진 복사본이 로드됩니다. 되돌리기: plugslim restore {id}',
    'pick.warnManifest': '더 이상 가리키는 것이 없는 매니페스트 항목을 뺐습니다: {paths}',
    // --- sync ---
    'sync.none': '동기화할 복사본이 없습니다. 먼저 만드세요: plugslim pick <plugin-id> --keep a,b',
    'sync.upToDate': '{id}: 최신 상태',
    'sync.needsRebuild': '{id}: 원본이 바뀌었습니다({from} -> {to}). 다시 만들어야 합니다',
    'sync.rebuilt': '{id}: {to} 기준으로 다시 만들었습니다(추정 토큰 {before} -> {after})',
    'sync.newItems': '새로 생김: {names} (제외됨. --include-new 또는 plugslim pick {id} --keep ... 로 추가)',
    'sync.newIncluded': '새로 생김: {names} (포함됨)',
    'sync.removedItems': '원본에서 사라짐: {names}',
    'sync.sourceMissing': '{id}: SOURCE_MISSING - 원본이 설치되어 있지 않습니다({path}). 기존 복사본을 유지합니다',
    'sync.dryRun': '미리보기입니다. 아무것도 쓰지 않았습니다.',
    // --- restore ---
    'restore.nothing': '되돌릴 것이 없습니다.',
    'restore.nothingFor': '{id} 은(는) 되돌릴 것이 없습니다.',
    'restore.done': '{id} 을(를) 되돌렸습니다(복사본 {overlayId} 삭제).',
    'restore.reload': '새 세션을 시작하거나 /reload-plugins 를 실행하세요.',
    // --- doctor ---
    'doctor.ok': '문제가 없습니다.',
    'doctor.noOverlays': '등록된 복사본이 없어 점검할 것이 없습니다.',
    'doctor.error': '오류',
    'doctor.warn': '경고',
    'doctor.summary': '오류 {errors}건, 경고 {warnings}건.',
    'doctor.PROJECT_OVERRIDE': '{file} 이(가) {id} 을(를) 다시 켭니다. 그 파일에서 false 로 두세요(예: .claude/settings.local.json).',
    'doctor.LOCAL_OVERRIDE': '{file} 이(가) {id} 을(를) 다시 켭니다. 그 파일에서 false 로 두세요.',
    'doctor.DUPLICATE_NAME': '{id} 와 {overlayId} 가 모두 켜져 있습니다. 플러그인 이름이 같아 한쪽만 온전히 로드됩니다. {id} 을(를) false 로 두세요.',
    'doctor.BROKEN_PATH': '복사본 {overlayId}: 매니페스트 경로 {path} 이(가) 없습니다. plugslim sync {id} 또는 plugslim restore {id} 를 실행하세요.',
    'doctor.BAD_PATH': '복사본 {overlayId}: 매니페스트 경로 {path} 이(가) 플러그인 안의 상대 경로가 아닙니다.',
    'doctor.OVERLAY_MISSING': '복사본 폴더 {path} 이(가) 없습니다. plugslim sync {id} 또는 plugslim restore {id} 를 실행하세요.',
    'doctor.SOURCE_MISSING': '{id} 이(가) 더 이상 설치되어 있지 않습니다({path}). 복사본은 계속 동작하지만 sync 할 수 없습니다.',
    'doctor.STALE_OVERLAY': '복사본을 만든 뒤 {id} 이(가) 바뀌었습니다({from} -> {to}). plugslim sync {id} 를 실행하세요.',
    // --- 데모 (scripts/demo.mjs) ---
    'demo.header': '연습용 샘플입니다. 실제 Claude Code 설정이 아닙니다(임시 복사본: {dir})',
    'demo.summary': '--- 요약 ---',
    'demo.before': '이전:   {tokens} tok (추정)',
    'demo.after': '이후:   {tokens} tok (추정)',
    'demo.restored': '복원:   {answer} ({tokens} tok, 설정과 복사본이 원래대로 돌아왔습니다)',
    'demo.yes': '예',
    'demo.no': '아니오',
};
