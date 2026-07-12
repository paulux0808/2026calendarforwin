from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')
original = text

if 'UI_STABILITY_V1' in text:
    raise SystemExit('already applied')
if 'MOBILE_HEADER_COLLAPSE_V1' not in text or 'MOBILE_FLOATING_MENU_V1' not in text:
    raise SystemExit('expected current mobile shell markers missing')

old_footer = '''    <button type="button" class="mobile-menu-close" onclick="closeMobileMenu()">닫기</button>\n</div>'''
new_footer = '''    <div class="mobile-menu-footer">\n        <button type="button" class="mobile-menu-mode" onclick="toggleMobileMode()">🖥️ PC 화면</button>\n        <button type="button" class="mobile-menu-close" onclick="closeMobileMenu()">닫기</button>\n    </div>\n</div>'''
if text.count(old_footer) != 1:
    raise SystemExit(f'mobile footer marker mismatch: {text.count(old_footer)}')
text = text.replace(old_footer, new_footer, 1)

css_start = text.index('/* MOBILE_FLOATING_MENU_V1 */')
css_match = re.search(r'/\* MOBILE_FLOATING_MENU_V1 \*/.*?@media print\{\.mobile-menu-fab,\.mobile-menu-backdrop,\.mobile-header-toggle\{display:none!important\}\}\n', text[css_start:], re.S)
if not css_match:
    raise SystemExit('mobile floating CSS block not found')
css_end = css_start + css_match.end()
new_css = r'''/* MOBILE_FLOATING_MENU_V2: viewport-independent mobile shell */
.mobile-menu-fab,.mobile-menu-backdrop,.mobile-header-toggle{display:none}
body.mobile-mode-active .mobile-menu-fab{position:fixed;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));width:66px;height:66px;border:3px solid var(--border-heavy);border-radius:50%;background:var(--accent);color:#fff;font:inherit;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 7px 22px rgba(0,0,0,.28);z-index:2060;touch-action:manipulation}
body.mobile-mode-active .mobile-menu-fab-icon{font-size:22px;line-height:1}
body.mobile-mode-active .mobile-menu-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.34);z-index:2020}
body.mobile-mode-active.mobile-menu-open .mobile-menu-backdrop{display:block}
body.mobile-mode-active .mobile-nav-container{display:none;position:fixed;left:auto;right:max(10px,env(safe-area-inset-right));bottom:calc(max(10px,env(safe-area-inset-bottom)) + 74px);width:min(356px,calc(100vw - 20px));max-width:calc(100vw - 20px);padding:9px;border:2px solid var(--border-heavy);border-radius:14px;background:var(--surface);box-shadow:0 12px 32px rgba(0,0,0,.32);overflow:visible;transform:none;z-index:2050}
body.mobile-mode-active.mobile-menu-open .mobile-nav-container{display:block}
body.mobile-mode-active .mobile-nav-container .controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;width:100%;padding:0;overflow:visible}
body.mobile-mode-active .mobile-nav-container .btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:100%;min-width:0;min-height:60px;padding:7px 5px;border:2px solid transparent;border-radius:9px;font-size:13px;line-height:1.15;overflow:visible;background:var(--bg)}
body.mobile-mode-active .mobile-nav-container .btn.active{border-color:var(--border-heavy);background:var(--border-heavy);color:#fff}
body.mobile-mode-active .mobile-nav-container .mobile-nav-icon{font-size:21px}
body.mobile-mode-active .mobile-nav-container .mobile-nav-label{white-space:normal;text-align:center;font-weight:900}
body.mobile-mode-active .mobile-menu-heading{display:flex;align-items:center;justify-content:space-between;min-height:36px;padding:0 1px 6px;font-size:16px}
body.mobile-mode-active .mobile-menu-x{display:grid;place-items:center;width:38px;height:38px;border:2px solid var(--border-heavy);border-radius:50%;background:var(--surface);color:var(--text-main);font-size:25px;line-height:1;cursor:pointer}
body.mobile-mode-active .mobile-menu-footer{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}
body.mobile-mode-active .mobile-menu-close,body.mobile-mode-active .mobile-menu-mode{width:100%;min-height:46px;border:2px solid var(--border-heavy);border-radius:8px;background:var(--surface);color:var(--text-main);font:inherit;font-weight:900;cursor:pointer}
body.mobile-mode-active .mobile-menu-mode{background:var(--bg)}
body.mobile-mode-active .container{padding-bottom:var(--mobile-nav-clearance,86px)!important;scroll-padding-bottom:var(--mobile-nav-clearance,86px)}
body.mobile-mode-active .header-wrapper{padding-bottom:0}
body.mobile-mode-active .mobile-header-toggle{display:flex;align-items:center;justify-content:center;gap:4px;width:100%;min-height:27px;margin-top:2px;border:0;border-top:1px solid var(--border-heavy);background:var(--surface);color:var(--text-muted);font:inherit;font-size:11px;font-weight:900;cursor:pointer;touch-action:manipulation}
body.mobile-mode-active .mobile-header-toggle-arrow{font-size:16px;line-height:1}
body.mobile-mode-active.mobile-header-collapsed .header-wrapper{padding-top:max(2px,env(safe-area-inset-top));padding-left:0;padding-right:0}
body.mobile-mode-active.mobile-header-collapsed .header-wrapper .header{display:none!important}
body.mobile-mode-active.mobile-header-collapsed .mobile-header-toggle{margin-top:0;min-height:30px;border-top:0;border-bottom:2px solid var(--border-heavy)}

/* UI_STABILITY_V1: sticky month controls, collapsible details, lower whitespace */
.container{padding:2px 0 4px}
.limit-wrapper{max-width:none;width:calc(100% - 10px)}
.tab-page{padding-bottom:0}
.tab-calendar .tab-toolbar,.tab-plan .tab-toolbar,.tab-student .tab-toolbar{position:sticky;top:0;z-index:55;display:block;margin:0 0 3px;padding:3px 0 4px;background:var(--bg);border:0;border-bottom:2px solid var(--border-heavy)}
.tab-calendar .tab-heading,.tab-plan .tab-heading,.tab-student .tab-heading{display:none}
.tab-calendar .tab-toolbar-actions,.tab-plan .tab-toolbar-actions,.tab-student .tab-toolbar-actions{display:block;width:100%}
.tab-month-nav{width:100%;gap:3px}
.tab-calendar .tab-month-nav{grid-template-columns:auto auto minmax(105px,1fr) auto}
.tab-plan .tab-month-nav,.tab-student .tab-month-nav{grid-template-columns:auto auto minmax(105px,1fr) auto auto}
.tab-month-nav .btn{min-height:36px;padding:5px 9px}
.tab-month-title{min-width:0;padding:0 4px;font-size:16px}
.tab-dept .tab-toolbar,.tab-nuga .tab-toolbar,.tab-request .tab-toolbar{margin-bottom:3px}
.tab-heading p{display:none}
.tab-heading-icon{width:34px;height:34px;flex-basis:34px;font-size:18px}
.tab-heading h2{font-size:17px;margin:0}
.tab-settings{margin:0 0 3px;border:0;border-bottom:1px solid var(--border-heavy);background:transparent}
.tab-settings>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:34px;padding:3px 2px;list-style:none;cursor:pointer;font-size:12.5px;font-weight:900;color:var(--text-main)}
.tab-settings>summary::-webkit-details-marker{display:none}
.tab-settings>summary::after{content:'펼치기 ▾';color:var(--text-muted);font-size:11px}
.tab-settings[open]>summary::after{content:'접기 ▴'}
.tab-settings-meta{margin-left:auto;color:var(--text-muted);font-size:11px;font-weight:800}
.tab-settings .tab-options{margin:0;padding:2px 0 5px;border:0;background:transparent}
.super-inline{margin:0 0 3px}
.calendar-grid-wrapper{padding-bottom:0}
.dept-picker{margin-bottom:5px}
.nuga-filter-grid{margin-bottom:5px}
.tab-request .request-form{padding-top:10px;padding-bottom:10px}

@media(max-width:850px){
  .container{padding:1px 0 3px}
  .limit-wrapper{width:calc(100% - 6px)}
  .tab-calendar .tab-toolbar,.tab-plan .tab-toolbar,.tab-student .tab-toolbar{padding:2px 0 3px;margin-bottom:2px}
  .tab-month-nav,.tab-calendar .tab-month-nav,.tab-plan .tab-month-nav,.tab-student .tab-month-nav{grid-template-columns:auto auto minmax(86px,1fr) auto}
  .tab-month-nav .tab-print-btn{display:none!important}
  .tab-month-title,.tab-nav-btn,.tab-today-btn{grid-column:auto!important;grid-row:auto!important}
  .tab-month-nav .btn{min-height:44px;padding:6px 7px;font-size:12.5px}
  .tab-month-title{font-size:15px;padding:0 2px}
  .tab-settings>summary{min-height:44px;padding:5px 3px}
  .tab-settings .tab-options{padding-bottom:4px}
  .option-section+.option-section{padding-top:5px}
  .m-plan-card{margin-bottom:4px}
  .super-inline{margin-bottom:2px}
}
@media print{.mobile-menu-fab,.mobile-menu-backdrop,.mobile-header-toggle,.tab-settings{display:none!important}}
'''
text = text[:css_start] + new_css + text[css_end:]

js_start = text.index('/* MOBILE_HEADER_COLLAPSE_V1 */')
js_end = text.index('\n\n})();', js_start)
new_js = r'''/* MOBILE_SHELL_STABILITY_V2 */
const MHKEY='academic-calendar-mobile-header-collapsed-v1';
const TAB_SETTINGS_KEY='academic-calendar-tab-settings-v1';
let mobileMenuReturnFocus=null,shellResizeTimer=null;
function mobileShell(){return !!isMobileMode&&document.body.classList.contains('mobile-mode-active')}
function readHeaderCollapsed(){try{return localStorage.getItem(MHKEY)==='1'}catch{return false}}
function readTabSettings(){try{return JSON.parse(localStorage.getItem(TAB_SETTINGS_KEY)||'{}')}catch{return{}}}
function writeTabSetting(tab,open){try{const state=readTabSettings();state[tab]=!!open;localStorage.setItem(TAB_SETTINGS_KEY,JSON.stringify(state))}catch{}}
function syncMobileNavLayout(){
    if(mobileShell())document.documentElement.style.setProperty('--mobile-nav-clearance','86px');
    else document.documentElement.style.removeProperty('--mobile-nav-clearance');
}
function setMobileMenu(open,restoreFocus=false){
    const on=!!open&&mobileShell(),nav=q('#mobileNav'),fab=q('#mobileMenuFab'),back=q('#mobileMenuBackdrop');
    if(on)mobileMenuReturnFocus=document.activeElement;
    document.body.classList.toggle('mobile-menu-open',on);
    if(nav){nav.setAttribute('aria-hidden',on?'false':'true');nav.inert=!on}
    if(fab)fab.setAttribute('aria-expanded',on?'true':'false');
    if(back)back.setAttribute('aria-hidden',on?'false':'true');
    syncMobileNavLayout();
    if(on)requestAnimationFrame(()=>{(q('#mobileNav .btn.active')||q('#mobileNav .btn'))?.focus({preventScroll:true})});
    else if(restoreFocus&&mobileMenuReturnFocus?.focus)mobileMenuReturnFocus.focus({preventScroll:true});
}
function toggleMobileMenu(){setMobileMenu(!document.body.classList.contains('mobile-menu-open'),true)}
function closeMobileMenu(){setMobileMenu(false,true)}
function setMobileHeaderCollapsed(value,persist=true){
    const on=mobileShell()&&!!value,b=q('#mobileHeaderToggle');
    document.body.classList.toggle('mobile-header-collapsed',on);
    if(b){
        b.setAttribute('aria-expanded',on?'false':'true');
        b.title=on?'헤더 펼치기':'헤더 접기';
        q('.mobile-header-toggle-arrow',b).textContent=on?'⌄':'⌃';
        q('.mobile-header-toggle-text',b).textContent=on?'헤더 펼치기':'헤더 접기';
    }
    if(persist)try{localStorage.setItem(MHKEY,on?'1':'0')}catch{}
    requestAnimationFrame(()=>{syncAppViewportHeight();resetOuterDocumentScroll(true)});
}
function toggleMobileHeader(){setMobileHeaderCollapsed(!document.body.classList.contains('mobile-header-collapsed'))}
function applyMobileShellState(restoreHeader=true){
    document.body.classList.toggle('mobile-mode-active',!!isMobileMode);
    document.body.dataset.viewMode=isMobileMode?'mobile':'desktop';
    if(isMobileMode){
        if(restoreHeader)setMobileHeaderCollapsed(readHeaderCollapsed(),false);
    }else{
        setMobileMenu(false,false);
        document.body.classList.remove('mobile-header-collapsed');
    }
    updateModeControls();
    syncMobileNavLayout();
    requestAnimationFrame(()=>{syncAppViewportHeight();resetOuterDocumentScroll(true)});
}
function decorateTabSettings(){
    [['plan','.tab-plan'],['student','.tab-student']].forEach(([tab,selector])=>{
        const root=q(selector),options=root?.querySelector(':scope > .tab-options');
        if(!root||!options||options.closest('.tab-settings'))return;
        const details=document.createElement('details');
        details.className='tab-settings no-print';
        details.open=readTabSettings()[tab]===true;
        const checked=options.querySelectorAll('input[type="checkbox"]:checked').length;
        const summary=document.createElement('summary');
        summary.innerHTML=`<span>세부 설정</span><span class="tab-settings-meta">${checked}개 사용 중</span>`;
        details.addEventListener('toggle',()=>writeTabSetting(tab,details.open));
        options.before(details);details.append(summary,options);
    });
}
window.toggleMobileMenu=toggleMobileMenu;
window.closeMobileMenu=closeMobileMenu;
window.toggleMobileHeader=toggleMobileHeader;
const shellBaseSwitch=switchTab;
switchTab=function(id){setMobileMenu(false,false);shellBaseSwitch(id)};
window.switchTab=switchTab;
const shellBaseToggle=toggleMobileMode;
toggleMobileMode=function(){
    setMobileMenu(false,false);
    shellBaseToggle();
    applyMobileShellState(true);
};
window.toggleMobileMode=toggleMobileMode;
const shellBaseEnhance=enhance;
enhance=function(){
    shellBaseEnhance();
    requestAnimationFrame(()=>{decorateTabSettings();syncMobileNavLayout();updateModeControls()});
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('mobile-menu-open'))closeMobileMenu()});
window.addEventListener('resize',()=>{
    clearTimeout(shellResizeTimer);
    shellResizeTimer=setTimeout(()=>applyMobileShellState(true),210);
},{passive:true});
setMobileMenu(false,false);
applyMobileShellState(true);
decorateTabSettings();
'''
text = text[:js_start] + new_js + text[js_end:]

required = [
    'MOBILE_FLOATING_MENU_V2', 'UI_STABILITY_V1', 'MOBILE_SHELL_STABILITY_V2',
    'class="mobile-menu-mode"', 'function decorateTabSettings()',
    "function mobileShell(){return !!isMobileMode", 'position:sticky;top:0'
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'missing marker: {marker}')
if 'MOBILE_HEADER_COLLAPSE_V1' in text:
    raise SystemExit('old mobile shell JS marker remains')
if text.count('UI_STABILITY_V1') != 1:
    raise SystemExit('density marker count invalid')
if text == original:
    raise SystemExit('no changes')
path.write_text(text, encoding='utf-8')
print('patched', len(original), '->', len(text))
