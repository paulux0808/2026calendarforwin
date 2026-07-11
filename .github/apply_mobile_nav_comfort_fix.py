from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
original = text

replacements = [
    (
        "body.mobile-mode-active .mobile-nav-container{display:block;left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));transform:none;width:auto;max-width:none;padding:4px;overflow:hidden;border-radius:18px}",
        "body.mobile-mode-active .mobile-nav-container{display:block;left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));transform:none;width:auto;max-width:none;padding:5px;overflow:hidden;border-radius:16px}",
        1,
    ),
    (
        "body.mobile-mode-active .mobile-nav-container .controls{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:2px;width:100%;min-width:0;padding:0;overflow:visible}",
        "body.mobile-mode-active .mobile-nav-container .controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;width:100%;min-width:0;padding:0;overflow:visible}",
        1,
    ),
    (
        "body.mobile-mode-active .mobile-nav-container .btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:100%;min-width:0;min-height:52px;padding:5px 1px;border-radius:10px;font-size:10.5px;line-height:1.05;overflow:hidden}",
        "body.mobile-mode-active .mobile-nav-container .btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:100%;min-width:0;min-height:58px;padding:7px 4px;border-radius:10px;font-size:12px;line-height:1.15;overflow:visible}",
        1,
    ),
    (
        "body.mobile-mode-active .mobile-nav-container .mobile-nav-icon{display:block;font-size:18px;line-height:1}",
        "body.mobile-mode-active .mobile-nav-container .mobile-nav-icon{display:block;font-size:20px;line-height:1}",
        1,
    ),
    (
        "body.mobile-mode-active .mobile-nav-container .mobile-nav-label{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
        "body.mobile-mode-active .mobile-nav-container .mobile-nav-label{display:block;max-width:100%;white-space:normal;text-align:center;font-weight:900;line-height:1.15}",
        1,
    ),
    ('<span class="mobile-nav-label">달력</span>', '<span class="mobile-nav-label">달력 일정</span>', 1),
    ('<span class="mobile-nav-label">계획</span>', '<span class="mobile-nav-label">월중 계획표</span>', 1),
    ('<span class="mobile-nav-label">학생</span>', '<span class="mobile-nav-label">학생 일정</span>', 1),
    ('<span class="mobile-nav-label">부서</span>', '<span class="mobile-nav-label">부서별 조회</span>', 1),
    ('<span class="mobile-nav-label">누가</span>', '<span class="mobile-nav-label">누가기록</span>', 1),
    ('<span class="mobile-nav-label">요청</span>', '<span class="mobile-nav-label">수정 요청</span>', 1),
]

for old, new, expected in replacements:
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'Unexpected replacement count for {old[:70]!r}: {count}, expected {expected}')
    text = text.replace(old, new)

if text == original:
    raise SystemExit('No changes applied')
if text.count('grid-template-columns:repeat(3,minmax(0,1fr))') != 1:
    raise SystemExit('Expected one 3-column mobile navigation grid')
for label in ['달력 일정', '월중 계획표', '학생 일정', '부서별 조회', '누가기록', '수정 요청']:
    if text.count(f'<span class="mobile-nav-label">{label}</span>') != 1:
        raise SystemExit(f'Mobile label missing or duplicated: {label}')

path.write_text(text, encoding='utf-8')
print('Applied two-row, full-label mobile navigation comfort fix')
