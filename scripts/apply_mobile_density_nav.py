from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

CSS_MARKER = '/* MOBILE_DENSITY_NAV_V1 */'
JS_MARKER = 'function compactMobileCalendar()'

css = r'''
/* MOBILE_DENSITY_NAV_V1 */
:root{--mobile-nav-clearance:96px}
@media(max-width:850px){
  body.mobile-mode-active .calendar-grid.mobile-grid-view{grid-auto-rows:auto!important;gap:7px}
  body.mobile-mode-active .calendar-grid.mobile-grid-view .cal-cell{height:auto;min-height:88px!important}
  body.mobile-mode-active .calendar-grid.mobile-grid-view .cal-cell.mobile-empty-day{min-height:64px!important;padding:8px 10px;justify-content:flex-start}
  body.mobile-mode-active .calendar-grid.mobile-grid-view .cal-cell.mobile-empty-day.mobile-empty-weekend{min-height:56px!important}
  body.mobile-mode-active .calendar-grid.mobile-grid-view .cal-cell.mobile-empty-day.other-month{min-height:50px!important}
  body.mobile-mode-active .calendar-grid.mobile-grid-view .cal-cell.mobile-empty-day.today{min-height:86px!important}
  body.mobile-mode-active .calendar-grid.mobile-grid-view .cal-cell.mobile-empty-day:not(.today) .cal-date{margin-bottom:0}
  body.mobile-mode-active .mobile-nav-container{left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));transform:none;width:auto;max-width:none;padding:4px 10px;overflow-x:auto;overflow-y:hidden;scroll-padding-inline:10px;scroll-snap-type:x proximity;scrollbar-width:none}
  body.mobile-mode-active .mobile-nav-container::-webkit-scrollbar{display:none}
  body.mobile-mode-active .mobile-nav-container .controls{width:max-content;min-width:max-content;flex-wrap:nowrap}
  body.mobile-mode-active .mobile-nav-container .btn{min-height:44px;padding:8px 12px;scroll-snap-align:center}
  body.mobile-mode-active .container{padding-bottom:var(--mobile-nav-clearance,96px)!important;scroll-padding-bottom:var(--mobile-nav-clearance,96px)}
}
'''

js = r'''
function compactMobileCalendar(){
    const mobile=isMobileMode||document.body.classList.contains('mobile-mode-active');
    qa('.cal-cell').forEach(cell=>{
        cell.classList.remove('mobile-empty-day','mobile-empty-weekend');
        if(!mobile||cell.querySelector('.cal-ev'))return;
        cell.classList.add('mobile-empty-day');
        const dateKey=cell.dataset.dateKey;
        if(dateKey){
            const d=new Date(dateKey+'T00:00:00');
            if(d.getDay()===0||d.getDay()===6)cell.classList.add('mobile-empty-weekend');
        }
    });
}
function syncMobileNavLayout(smooth=false){
    const nav=q('#mobileNav');
    if(!nav)return;
    if(!document.body.classList.contains('mobile-mode-active')){
        document.documentElement.style.removeProperty('--mobile-nav-clearance');
        return;
    }
    const rect=nav.getBoundingClientRect();
    const style=getComputedStyle(nav);
    const bottom=parseFloat(style.bottom)||0;
    document.documentElement.style.setProperty('--mobile-nav-clearance',Math.ceil(rect.height+bottom+18)+'px');
    const active=q('.btn.active',nav);
    if(!active)return;
    const ar=active.getBoundingClientRect(),nr=nav.getBoundingClientRect();
    const target=Math.max(0,nav.scrollLeft+(ar.left-nr.left)-(nav.clientWidth-ar.width)/2);
    if(typeof nav.scrollTo==='function')nav.scrollTo({left:target,behavior:smooth?'smooth':'auto'});
    else nav.scrollLeft=target;
}
const densityEnhance=enhance;
enhance=function(){
    densityEnhance();
    requestAnimationFrame(()=>{
        compactMobileCalendar();
        syncMobileNavLayout(false);
    });
};
const densitySwitchTab=switchTab;
switchTab=function(id){
    densitySwitchTab(id);
    requestAnimationFrame(()=>syncMobileNavLayout(true));
};
window.addEventListener('resize',()=>requestAnimationFrame(()=>syncMobileNavLayout(false)),{passive:true});
if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(()=>syncMobileNavLayout(false)),{passive:true});
}
'''

if CSS_MARKER not in text:
    css_anchor = text.rfind('</style>')
    if css_anchor < 0:
        raise SystemExit('style closing tag not found')
    text = text[:css_anchor] + css + text[css_anchor:]

if JS_MARKER not in text:
    js_anchor = 'restore();header();createPanel();applyScale();enhance();'
    if js_anchor not in text:
        raise SystemExit('super update startup anchor not found')
    text = text.replace(js_anchor, js + '\n' + js_anchor, 1)

required = [
    '10blDNZ4zjrFU5lwCvgtoD3npwIwcCMQTeqwPgpQ_Ffg',
    '1112677469', '1459415616', '1697887995', '1487091944', '2041576858',
    'AKfycbzk1DN0iDS7EdZvKq-iomzgxmiCzOwCUZwWZkN4fjvkzOZPdF1d3P9d1xt6Ii8VNnmmPQ',
    'MOBILE_HEADER_PIN_V2', CSS_MARKER, JS_MARKER,
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit('required markers/constants missing: ' + ', '.join(missing))
if text.count(CSS_MARKER) != 1 or text.count(JS_MARKER) != 1:
    raise SystemExit('duplicate mobile density patch detected')

path.write_text(text, encoding='utf-8')
print('mobile density/nav patch applied:', len(text), 'characters')
