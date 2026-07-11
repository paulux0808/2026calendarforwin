from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

css_marker = '/* REQUEST_FORM_CONSISTENCY_V1 */'
js_marker = '/* REQUEST_NOTE_REMOVAL_V1 */'

css = r'''
/* REQUEST_FORM_CONSISTENCY_V1 */
.super-request-note{display:none!important}
.request-form{box-shadow:none}
.form-input,.form-textarea{border-color:var(--border-heavy)}
@media(max-width:850px){
  .request-form{width:100%;max-width:none;margin:0 auto;padding:20px 16px;border-width:2px;border-radius:10px;box-shadow:none}
  .request-form h2{font-size:20px!important;margin-bottom:8px!important}
  .request-form p{margin-bottom:20px!important;font-size:13px!important;line-height:1.45!important}
  .form-group{margin-bottom:16px}
  .form-label{font-size:14px;margin-bottom:6px}
  .form-input,.form-textarea{padding:11px 12px;border-width:2px;border-radius:8px;font-size:14px;background:var(--surface)}
  .form-textarea{height:140px;min-height:120px;resize:vertical}
  .submit-btn{min-height:48px;padding:12px;border-radius:8px;font-size:16px}
}
'''

js = r'''
/* REQUEST_NOTE_REMOVAL_V1 */
requestNote=function(){
    q('.super-request-note')?.remove();
};
'''

if css_marker not in text:
    anchor = '</style>\n</head>'
    if anchor not in text:
        raise SystemExit('CSS anchor not found')
    text = text.replace(anchor, css + '\n</style>\n</head>', 1)

if js_marker not in text:
    anchor = 'restore();header();createPanel();applyScale();enhance();'
    if anchor not in text:
        raise SystemExit('JS anchor not found')
    text = text.replace(anchor, js + '\n' + anchor, 1)

path.write_text(text, encoding='utf-8')
