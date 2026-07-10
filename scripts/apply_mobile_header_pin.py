from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

css_marker = '/* MOBILE_HEADER_PIN_V2: keep the application shell inside the visual viewport */'
js_marker = 'function syncAppViewportHeight()'

css = r'''
/* MOBILE_HEADER_PIN_V2: keep the application shell inside the visual viewport */
html{height:100%;overflow:hidden;overscroll-behavior:none}
body{height:100vh;height:100svh;height:var(--app-viewport-height,100dvh);min-height:0;overflow:hidden;overscroll-behavior:none;position:relative}
.header-wrapper{position:-webkit-sticky;position:sticky;top:0;left:0;right:0;width:100%;flex:0 0 auto;isolation:isolate}
.container{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;scroll-behavior:auto}
@media(max-width:850px){.header-wrapper{padding-top:max(7px,env(safe-area-inset-top));padding-left:max(10px,env(safe-area-inset-left));padding-right:max(10px,env(safe-area-inset-right))}}
@media print{html,body{height:auto!important;overflow:visible!important;position:static!important}.header-wrapper{position:static!important}}
'''

js = r'''
function syncAppViewportHeight(){
    const height=Math.max(320,Math.round(window.visualViewport?.height||window.innerHeight||document.documentElement.clientHeight));
    document.documentElement.style.setProperty('--app-viewport-height',height+'px');
}
function resetOuterDocumentScroll(force=false){
    const tag=document.activeElement?.tagName;
    if(!force&&['INPUT','TEXTAREA','SELECT'].includes(tag))return;
    const root=document.scrollingElement||document.documentElement;
    if(root&&root.scrollTop!==0)root.scrollTop=0;
    if(document.body.scrollTop!==0)document.body.scrollTop=0;
    if(window.pageYOffset!==0)window.scrollTo(0,0);
}
scrollTodayIntoViewIfVisible=function(){
    const target=document.querySelector('.cal-cell.today, tr.today-row, .m-plan-card.today-card');
    const scroller=document.getElementById('mainContainer');
    if(!target||!scroller)return;
    const targetRect=target.getBoundingClientRect();
    const scrollerRect=scroller.getBoundingClientRect();
    const centeredOffset=(targetRect.top-scrollerRect.top)-Math.max(0,(scroller.clientHeight-targetRect.height)/2);
    scroller.scrollTop=Math.max(0,scroller.scrollTop+centeredOffset);
    resetOuterDocumentScroll(true);
};
function stabiliseApplicationViewport(force=false){
    syncAppViewportHeight();
    resetOuterDocumentScroll(force);
}
window.addEventListener('pageshow',()=>{
    stabiliseApplicationViewport(true);
    requestAnimationFrame(()=>stabiliseApplicationViewport(true));
    setTimeout(()=>stabiliseApplicationViewport(true),180);
});
window.addEventListener('load',()=>stabiliseApplicationViewport(true),{once:true});
window.addEventListener('orientationchange',()=>setTimeout(()=>stabiliseApplicationViewport(true),160));
window.addEventListener('scroll',()=>resetOuterDocumentScroll(false),{passive:true});
if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>stabiliseApplicationViewport(false),{passive:true});
}
syncAppViewportHeight();
'''

if css_marker not in text:
    css_anchor = '@media print{.super-detail,.super-status,.super-search-meta,.super-inline{display:none!important}}\n</style>'
    if css_anchor not in text:
        raise SystemExit('CSS insertion anchor not found')
    text = text.replace(
        css_anchor,
        '@media print{.super-detail,.super-status,.super-search-meta,.super-inline{display:none!important}}\n' + css + '</style>',
        1,
    )

if js_marker not in text:
    js_anchor = 'restore();header();createPanel();applyScale();enhance();'
    if js_anchor not in text:
        raise SystemExit('JavaScript insertion anchor not found')
    text = text.replace(js_anchor, js + '\n' + js_anchor, 1)

path.write_text(text, encoding='utf-8')
