from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
original = text

replacements = [
    (
        '<button class="tiny-btn" onclick="toggleDarkMode()" title="다크모드">🌙</button>',
        '<button class="tiny-btn" id="darkModeBtn" onclick="toggleDarkMode()" title="다크모드로 전환" aria-pressed="false">🌙</button>',
        1,
    ),
    (
        '<button class="tiny-btn" onclick="toggleMobileMode()" title="모바일모드">📱</button>',
        '<button class="tiny-btn" id="viewModeBtn" onclick="toggleMobileMode()" title="모바일 화면으로 전환" aria-pressed="false">📱</button>',
        1,
    ),
    (
        '<button class="btn active" onclick="window.print()" style="margin-left:20px;">🖨️ 인쇄</button>',
        '<button class="btn active print-action" onclick="window.print()" style="margin-left:20px;">🖨️ 인쇄</button>',
        2,
    ),
]

for old, new, expected in replacements:
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'Unexpected replacement count for {old[:45]!r}: {count}, expected {expected}')
    text = text.replace(old, new)

css_old = '''  .submit-btn{min-height:48px;padding:12px;border-radius:8px;font-size:16px}
}

</style>'''
css_new = '''  .submit-btn{min-height:48px;padding:12px;border-radius:8px;font-size:16px}
  .print-action{display:none!important}
}
.tiny-btn.mode-active{background:var(--accent);border-color:var(--accent);color:#fff}

</style>'''
if text.count(css_old) != 1:
    raise SystemExit('CSS insertion marker not found exactly once')
text = text.replace(css_old, css_new, 1)

js_old = '''/* REQUEST_NOTE_REMOVAL_V1 */
requestNote=function(){
    q('.super-request-note')?.remove();
};

restore();header();createPanel();applyScale();enhance();'''
js_new = '''/* REQUEST_NOTE_REMOVAL_V1 */
requestNote=function(){
    q('.super-request-note')?.remove();
};

/* VIEW_MODE_CONTROL_V2: explicit, persistent desktop/mobile and light/dark switching */
function updateModeControls(){
    const dark=q('#darkModeBtn'),view=q('#viewModeBtn');
    const darkOn=document.body.classList.contains('dark-mode');
    if(dark){
        dark.textContent=darkOn?'☀️':'🌙';
        dark.title=darkOn?'라이트모드로 전환':'다크모드로 전환';
        dark.setAttribute('aria-label',dark.title);
        dark.setAttribute('aria-pressed',darkOn?'true':'false');
        dark.classList.toggle('mode-active',darkOn);
    }
    if(view){
        view.textContent=isMobileMode?'🖥️':'📱';
        view.title=isMobileMode?'PC 화면으로 전환':'모바일 화면으로 전환';
        view.setAttribute('aria-label',view.title);
        view.setAttribute('aria-pressed',isMobileMode?'true':'false');
        view.classList.toggle('mode-active',isMobileMode);
    }
}
toggleDarkMode=function(){
    document.body.classList.toggle('dark-mode');
    updateModeControls();
    save();
};
toggleMobileMode=function(){
    mobileLocked=true;
    isMobileMode=!isMobileMode;
    document.body.classList.toggle('mobile-mode-active',isMobileMode);
    document.body.dataset.viewMode=isMobileMode?'mobile':'desktop';
    closePanel();
    render();
    updateModeControls();
    syncMobileNavLayout();
    save();
};

restore();header();createPanel();applyScale();updateModeControls();enhance();'''
if text.count(js_old) != 1:
    raise SystemExit('JavaScript insertion marker not found exactly once')
text = text.replace(js_old, js_new, 1)

if text == original:
    raise SystemExit('No changes applied')
if text.count('class="btn active print-action"') != 2:
    raise SystemExit('Expected exactly two print action buttons')
if text.count('id="darkModeBtn"') != 1 or text.count('id="viewModeBtn"') != 1:
    raise SystemExit('Mode button IDs were not applied exactly once')

path.write_text(text, encoding='utf-8')
print('Applied mobile print visibility and explicit mode switching fix')
