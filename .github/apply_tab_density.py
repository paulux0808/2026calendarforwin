from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
original = text

if 'TAB_UI_COMFORT_V1' not in text:
    raise SystemExit('Expected TAB_UI_COMFORT_V1 marker is missing')
if 'TAB_UI_DENSITY_V1' in text:
    raise SystemExit('TAB UI density patch is already present')

css = r'''

/* TAB_UI_DENSITY_V1: remove redundant boxes and vertical whitespace */
.container{padding:8px 0}
.header-wrapper{padding:6px 16px}
.header{gap:5px}
.header-top-row{gap:8px}
#topControls{gap:4px;padding:3px}
#topControls .btn{min-height:40px;padding:6px 8px}
.search-input{padding-top:7px;padding-bottom:7px}
.tab-page{padding-bottom:2px}
.tab-toolbar{gap:10px;margin-bottom:6px;padding:5px 0 7px;background:transparent;border:0;border-bottom:2px solid var(--border-heavy);border-radius:0}
.tab-heading{gap:8px}
.tab-heading-icon{width:38px;height:38px;flex-basis:38px;border-radius:8px;font-size:20px}
.tab-heading h2{font-size:18px;margin-bottom:1px}
.tab-heading p{font-size:12px;line-height:1.3}
.tab-toolbar-actions{min-height:0}
.tab-month-nav{gap:4px}
.tab-month-nav .btn{min-height:36px;padding:6px 10px}
.tab-month-title{font-size:17px}
.tab-options{gap:8px;margin-bottom:7px;padding:3px 0 6px;background:transparent;border:0;border-bottom:1px solid var(--border-heavy);border-radius:0}
.option-section{gap:7px}
.option-section+.option-section{padding-left:10px}
.option-group{gap:5px}
.option-toggle{min-height:34px;padding:5px 9px;font-size:12.5px;border-radius:7px}
.option-toggle input{width:16px;height:16px}
.dept-picker{gap:5px;margin-bottom:8px}
.dept-pick{min-height:36px;padding:6px 9px;border-radius:7px}
.dept-month-title{font-size:17px;margin:10px 0 6px;padding-bottom:3px;border-bottom-width:3px}
.dept-card{padding:10px;margin-bottom:0;border-radius:9px}
.dept-card-action{margin-top:7px;padding-top:6px}
.m-plan-card{padding:9px 10px;margin-bottom:6px}
.m-plan-date{margin-bottom:6px;padding-bottom:4px}
.m-plan-meta{padding:6px 8px}
.nuga-filter-grid{gap:6px;margin-bottom:8px}
.nuga-filter-card{min-height:50px;padding:7px 10px;border-radius:8px}
.nuga-filter-card strong{font-size:18px}
.tab-empty{min-height:120px;margin-top:6px;padding:18px}
.tab-empty-icon{font-size:27px}
.tab-request .request-form{padding:16px 18px;margin:0 auto}
.request-grid{gap:10px}
.form-group{margin-bottom:12px}
.request-content-group{margin-bottom:12px}
.form-label{margin-bottom:5px}
.form-help{margin-top:4px}
.request-actions .submit-btn{min-height:44px;padding:10px 20px}
.table-container{border-radius:6px}
@media(min-width:851px) and (max-width:1199px){#topControls .btn{min-height:42px}}
@media(max-width:850px){
  .container{padding:6px 0}
  .header-wrapper{padding-bottom:5px}
  .header{gap:5px;padding-top:1px;padding-bottom:1px}
  .header-top-row{gap:6px}
  .tab-toolbar{gap:7px;margin-bottom:5px;padding:2px 0 6px}
  .tab-heading p{display:none}
  .tab-heading-icon{width:36px;height:36px;flex-basis:36px;font-size:19px}
  .tab-heading h2{font-size:17px}
  .tab-month-nav .btn{min-height:44px;padding:7px 8px}
  .tab-options{margin-bottom:6px;padding:2px 0 6px}
  .option-toggle{min-height:44px;padding:7px 9px}
  .option-section+.option-section{padding-top:7px}
  .m-plan-card{padding:8px 9px;margin-bottom:5px}
  .nuga-filter-card{min-height:54px}
  .tab-request .request-form{padding:12px 10px}
  .request-grid{gap:0}
  .form-group{margin-bottom:11px}
  .tab-empty{min-height:105px;padding:15px}
}
'''

style_end = text.rfind('</style>')
if style_end < 0:
    raise SystemExit('Final style closing tag not found')
text = text[:style_end] + css + text[style_end:]

if text == original:
    raise SystemExit('No changes applied')
if text.count('TAB_UI_DENSITY_V1') != 1:
    raise SystemExit('Density marker count is invalid')
required = ['.tab-toolbar{', 'background:transparent;border:0;border-bottom:2px solid var(--border-heavy)', '.tab-options{', '.option-toggle{min-height:34px', '.option-toggle{min-height:44px']
for marker in required:
    if marker not in text:
        raise SystemExit(f'Missing density rule: {marker}')

path.write_text(text, encoding='utf-8')
print('Applied compact spacing and reduced box treatment across tabs')
