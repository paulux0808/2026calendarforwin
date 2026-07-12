from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

if 'UI_STABILITY_V1' not in text:
    raise SystemExit('UI_STABILITY_V1 marker missing')
if 'UI_DENSITY_V2' in text:
    raise SystemExit('UI_DENSITY_V2 already applied')

css = r'''

/* UI_DENSITY_V2: remove remaining non-functional whitespace without shrinking touch targets */
.container{padding:0!important}
.limit-wrapper{width:calc(100% - 4px)}
.header-wrapper{padding:4px 10px 0}
.header{gap:3px}
.header-top-row{gap:5px}
#topControls{gap:3px;padding:2px}
.tab-page{padding:0}
.tab-calendar .tab-toolbar,.tab-plan .tab-toolbar,.tab-student .tab-toolbar{margin-bottom:1px;padding:1px 0 2px}
.tab-dept .tab-toolbar,.tab-nuga .tab-toolbar,.tab-request .tab-toolbar{margin-bottom:1px;padding:2px 0 3px}
.tab-options{margin-bottom:3px;padding:1px 0 3px}
.tab-settings{margin-bottom:1px}
.tab-settings>summary{padding-top:1px;padding-bottom:1px}
.tab-settings .tab-options{padding-bottom:2px}
.super-inline{margin-bottom:1px}
.calendar-grid-wrapper{margin:0;padding:0}
.dept-picker,.nuga-filter-grid{margin-bottom:3px}
.dept-month-title{margin:6px 0 3px;padding-bottom:2px}
.dept-card{padding:8px}
.dept-card-action{margin-top:5px;padding-top:4px}
.m-plan-card{margin-bottom:2px}
.m-plan-date{margin-bottom:4px;padding-bottom:3px}
.m-plan-meta{padding:4px 7px}
.tab-empty{margin-top:3px;padding:12px;min-height:86px}
.tab-request .request-form{padding:6px 10px}
.request-grid{gap:8px}
.form-group,.request-content-group{margin-bottom:8px}
.form-label{margin-bottom:3px}
.form-help{margin-top:3px}
.request-actions .submit-btn{padding-top:8px;padding-bottom:8px}
@media(max-width:850px){
  .limit-wrapper{width:calc(100% - 2px)}
  .header-wrapper{padding-left:max(6px,env(safe-area-inset-left));padding-right:max(6px,env(safe-area-inset-right));padding-bottom:0}
  .header{gap:3px}
  .header-top-row{gap:4px}
  .tab-calendar .tab-toolbar,.tab-plan .tab-toolbar,.tab-student .tab-toolbar{margin-bottom:0;padding:1px 0}
  .tab-dept .tab-toolbar,.tab-nuga .tab-toolbar,.tab-request .tab-toolbar{margin-bottom:0;padding:1px 0 2px}
  .tab-options{margin-bottom:2px;padding:0 0 2px}
  .tab-settings{margin-bottom:0}
  .tab-settings .tab-options{padding-bottom:2px}
  .option-section+.option-section{padding-top:3px}
  .super-inline{margin-bottom:0}
  .dept-picker,.nuga-filter-grid{margin-bottom:2px}
  .dept-month-title{margin:4px 0 2px}
  .m-plan-card{margin-bottom:2px;padding-top:7px;padding-bottom:7px}
  .tab-request .request-form{padding:5px 6px}
  .form-group,.request-content-group{margin-bottom:7px}
  .tab-empty{margin-top:2px;min-height:78px;padding:10px}
}
'''

idx = text.rfind('</style>')
if idx < 0:
    raise SystemExit('closing style tag missing')
text = text[:idx] + css + text[idx:]

required = [
    'UI_DENSITY_V2',
    '.container{padding:0!important}',
    '.limit-wrapper{width:calc(100% - 4px)}',
    '.tab-settings{margin-bottom:1px}',
    '.m-plan-card{margin-bottom:2px}',
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'missing marker: {marker}')

path.write_text(text, encoding='utf-8')
print('Applied UI_DENSITY_V2')
