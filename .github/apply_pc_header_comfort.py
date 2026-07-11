from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
original = text

if 'PC_HEADER_COMFORT_V1' in text:
    raise SystemExit('PC header comfort patch is already present')

old_header = '''<div class="header-wrapper no-print">
    <div class="header">
        <div class="header-left">
            <h1 onclick="location.reload()" style="font-size:18px; font-weight:900; cursor:pointer; white-space:nowrap;">학사관리 시스템</h1>
        </div>

        <div class="header-mid">
            <div class="search-box">
                <input type="text" id="searchInput" class="search-input" placeholder="행사 내용 또는 부서 검색 (공백=AND)..." oninput="handleSearch()">
            </div>
            <div class="controls" id="topControls">
                <button class="btn active" id="btn_calendar" onclick="switchTab('calendar')">🗓️&nbsp;달력&nbsp;일정</button>
                <button class="btn" id="btn_plan" onclick="switchTab('plan')">📋&nbsp;월중&nbsp;계획표</button>
                <button class="btn" id="btn_student" onclick="switchTab('student')">🎒&nbsp;학생일정</button>
                <button class="btn" id="btn_dept" onclick="switchTab('dept')">🏢&nbsp;부서별&nbsp;조회</button>
                <button class="btn" id="btn_nuga" onclick="switchTab('nuga')">📝&nbsp;누가기록</button>
                <button class="btn" id="btn_request" onclick="switchTab('request')">✍️&nbsp;수정/추가&nbsp;요청</button>
            </div>
        </div>

        <div class="header-right">
            <button class="tiny-btn" onclick="adjustScale(-1)" title="작게">A−</button>
            <button class="tiny-btn" onclick="adjustScale(1)" title="크게">A+</button>
            <button class="tiny-btn" id="darkModeBtn" onclick="toggleDarkMode()" title="다크모드로 전환" aria-pressed="false">🌙</button>
            <button class="tiny-btn" id="viewModeBtn" onclick="toggleMobileMode()" title="모바일 화면으로 전환" aria-pressed="false">📱</button>
        </div>
    </div>
</div>'''

new_header = '''<div class="header-wrapper no-print">
    <div class="header">
        <div class="header-top-row">
            <div class="header-left">
                <h1 onclick="location.reload()" style="font-size:18px; font-weight:900; cursor:pointer; white-space:nowrap;">학사관리 시스템</h1>
            </div>

            <div class="header-mid">
                <div class="search-box">
                    <input type="text" id="searchInput" class="search-input" placeholder="행사 내용 또는 부서 검색 (공백=AND)..." oninput="handleSearch()">
                </div>
            </div>

            <div class="header-right">
                <button class="tiny-btn" onclick="adjustScale(-1)" title="작게">A−</button>
                <button class="tiny-btn" onclick="adjustScale(1)" title="크게">A+</button>
                <button class="tiny-btn" id="darkModeBtn" onclick="toggleDarkMode()" title="다크모드로 전환" aria-pressed="false">🌙</button>
                <button class="tiny-btn" id="viewModeBtn" onclick="toggleMobileMode()" title="모바일 화면으로 전환" aria-pressed="false">📱</button>
            </div>
        </div>

        <div class="controls" id="topControls" aria-label="주요 업무 메뉴">
            <button class="btn active" id="btn_calendar" onclick="switchTab('calendar')">🗓️&nbsp;달력&nbsp;일정</button>
            <button class="btn" id="btn_plan" onclick="switchTab('plan')">📋&nbsp;월중&nbsp;계획표</button>
            <button class="btn" id="btn_student" onclick="switchTab('student')">🎒&nbsp;학생일정</button>
            <button class="btn" id="btn_dept" onclick="switchTab('dept')">🏢&nbsp;부서별&nbsp;조회</button>
            <button class="btn" id="btn_nuga" onclick="switchTab('nuga')">📝&nbsp;누가기록</button>
            <button class="btn" id="btn_request" onclick="switchTab('request')">✍️&nbsp;수정/추가&nbsp;요청</button>
        </div>
    </div>
</div>'''

if text.count(old_header) != 1:
    raise SystemExit(f'Unexpected header block count: {text.count(old_header)}')
text = text.replace(old_header, new_header, 1)

css = '''

/* PC_HEADER_COMFORT_V1: prioritize readable controls over single-line compression */
.header{max-width:none;width:100%;display:flex;flex-direction:column;align-items:stretch;gap:8px}
.header-top-row{display:grid;grid-template-columns:minmax(220px,auto) minmax(300px,1fr) auto;align-items:center;gap:12px;width:100%;min-width:0}
.header-left{min-width:220px}
.header-mid{display:flex;align-items:center;gap:8px;min-width:0}
.header-right{min-width:0;flex-wrap:nowrap}
.search-box{width:100%;max-width:none;flex:1 1 auto}
#topControls{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;width:100%;min-width:0;overflow:visible;padding:5px;border-radius:10px}
#topControls .btn{display:flex;align-items:center;justify-content:center;min-width:0;min-height:44px;padding:8px 10px;font-size:14px;line-height:1.2;white-space:normal;word-break:keep-all;text-align:center}
body.mobile-mode-active #topControls{display:none!important}
@media(min-width:851px) and (max-width:1199px){
  .header-top-row{grid-template-columns:minmax(220px,1fr) auto;grid-template-areas:"left right" "mid mid";gap:8px 12px}
  .header-left{grid-area:left}.header-mid{grid-area:mid}.header-right{grid-area:right}
  #topControls{grid-template-columns:repeat(3,minmax(0,1fr))}
  #topControls .btn{min-height:46px;font-size:14px}
}
@media(max-width:850px){
  .header{display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:4px 0}
  .header-top-row{display:flex;flex-direction:column;align-items:stretch;gap:8px;width:100%}
  .header-left,.header-mid,.header-right{width:100%;min-width:0;justify-content:center}
  .header-right{flex-wrap:wrap}
  #topControls{grid-template-columns:repeat(2,minmax(0,1fr))}
  #topControls .btn{min-height:46px;font-size:13px}
  body.mobile-mode-active #topControls{display:none!important}
}
'''

style_end = text.rfind('</style>')
if style_end < 0:
    raise SystemExit('Final style closing tag not found')
text = text[:style_end] + css + text[style_end:]

if text == original:
    raise SystemExit('No changes applied')
if text.count('class="header-top-row"') != 1:
    raise SystemExit('Header top row was not created exactly once')
if text.count('id="topControls"') != 1:
    raise SystemExit('Top controls ID count changed unexpectedly')
if text.count('PC_HEADER_COMFORT_V1') != 1:
    raise SystemExit('PC comfort CSS marker count is invalid')
if 'grid-template-columns:repeat(6,minmax(0,1fr))' not in text:
    raise SystemExit('Wide desktop six-column navigation rule missing')
if 'grid-template-columns:repeat(3,minmax(0,1fr))' not in text:
    raise SystemExit('Laptop three-column navigation rule missing')

path.write_text(text, encoding='utf-8')
print('Applied PC header comfort update')
