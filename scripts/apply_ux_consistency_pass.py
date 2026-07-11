from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

replacements = [
(
"""        #btn_request { color: #c92a2a; }
        body.dark-mode #btn_request { color: #ff8787; }
        #btn_request:hover { background: #ffc9c9; color: #c92a2a; }
        body.dark-mode #btn_request:hover { background: #c92a2a44; color: #ff8787; }
        #btn_request.active { background: #c92a2a; color: #fff; }
        body.dark-mode #btn_request.active { background: #fa5252; color: #fff; }""",
"""        #btn_request, #m_btn_request { color: #c92a2a; }
        body.dark-mode #btn_request, body.dark-mode #m_btn_request { color: #ff8787; }
        #btn_request:hover, #m_btn_request:hover { background: #ffc9c9; color: #c92a2a; }
        body.dark-mode #btn_request:hover, body.dark-mode #m_btn_request:hover { background: #c92a2a44; color: #ff8787; }
        #btn_request.active, #m_btn_request.active { background: #c92a2a; color: #fff; }
        body.dark-mode #btn_request.active, body.dark-mode #m_btn_request.active { background: #fa5252; color: #fff; }"""
),
(
"""<div class="mobile-nav-container no-print" id="mobileNav">
    <div class="controls" style="background:transparent; border:none;">
        <button class="btn active" id="m_btn_calendar" onclick="switchTab('calendar')">🗓️ 달력</button>
        <button class="btn" id="m_btn_plan" onclick="switchTab('plan')">📋 계획표</button>
        <button class="btn" id="m_btn_student" onclick="switchTab('student')">🎒 학생</button>
        <button class="btn" id="m_btn_dept" onclick="switchTab('dept')">🏢 부서별</button>
        <button class="btn" id="m_btn_nuga" onclick="switchTab('nuga')">📝&nbsp;누가기록</button>
        <button class="btn" id="m_btn_request" onclick="switchTab('request')">✍️ 요청</button>
    </div>
</div>""",
"""<div class="mobile-nav-container no-print" id="mobileNav">
    <div class="controls" style="background:transparent; border:none;">
        <button class="btn active" id="m_btn_calendar" onclick="switchTab('calendar')"><span class="mobile-nav-icon" aria-hidden="true">🗓️</span><span class="mobile-nav-label">달력</span></button>
        <button class="btn" id="m_btn_plan" onclick="switchTab('plan')"><span class="mobile-nav-icon" aria-hidden="true">📋</span><span class="mobile-nav-label">계획</span></button>
        <button class="btn" id="m_btn_student" onclick="switchTab('student')"><span class="mobile-nav-icon" aria-hidden="true">🎒</span><span class="mobile-nav-label">학생</span></button>
        <button class="btn" id="m_btn_dept" onclick="switchTab('dept')"><span class="mobile-nav-icon" aria-hidden="true">🏢</span><span class="mobile-nav-label">부서</span></button>
        <button class="btn" id="m_btn_nuga" onclick="switchTab('nuga')"><span class="mobile-nav-icon" aria-hidden="true">📝</span><span class="mobile-nav-label">누가</span></button>
        <button class="btn" id="m_btn_request" onclick="switchTab('request')"><span class="mobile-nav-icon" aria-hidden="true">✍️</span><span class="mobile-nav-label">요청</span></button>
    </div>
</div>"""
),
(
"""  body.mobile-mode-active .mobile-nav-container{left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));transform:none;width:auto;max-width:none;padding:4px 10px;overflow-x:auto;overflow-y:hidden;scroll-padding-inline:10px;scroll-snap-type:x proximity;scrollbar-width:none}
  body.mobile-mode-active .mobile-nav-container::-webkit-scrollbar{display:none}
  body.mobile-mode-active .mobile-nav-container .controls{width:max-content;min-width:max-content;flex-wrap:nowrap}
  body.mobile-mode-active .mobile-nav-container .btn{min-height:44px;padding:8px 12px;scroll-snap-align:center}
  body.mobile-mode-active .container{padding-bottom:var(--mobile-nav-clearance,96px)!important;scroll-padding-bottom:var(--mobile-nav-clearance,96px)}""",
"""  body.mobile-mode-active .mobile-nav-container{display:block;left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));transform:none;width:auto;max-width:none;padding:4px;overflow:hidden;border-radius:18px}
  body.mobile-mode-active .mobile-nav-container .controls{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:2px;width:100%;min-width:0;padding:0;overflow:visible}
  body.mobile-mode-active .mobile-nav-container .btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:100%;min-width:0;min-height:52px;padding:5px 1px;border-radius:10px;font-size:10.5px;line-height:1.05;overflow:hidden}
  body.mobile-mode-active .mobile-nav-container .mobile-nav-icon{display:block;font-size:18px;line-height:1}
  body.mobile-mode-active .mobile-nav-container .mobile-nav-label{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  body.mobile-mode-active .container{padding-bottom:var(--mobile-nav-clearance,96px)!important;scroll-padding-bottom:var(--mobile-nav-clearance,96px)}"""
),
(
"function scaleLabel(){const x=q('#superScaleLabel'),b=q('#superFitBtn');if(x)x.textContent=`${scaleMode==='auto'?'맞춤':'수동'} ${scaleLevel>=0?'+':''}${scaleLevel}`;if(b)b.classList.toggle('super-fit-active',scaleMode==='auto')}",
"function scaleLabel(){const x=q('#superScaleLabel'),b=q('#superFitBtn'),names={[-2]:'작게',[-1]:'조금 작게',[0]:'보통',[1]:'조금 크게',[2]:'크게'};if(x)x.textContent=scaleMode==='auto'?`자동 · ${names[scaleLevel]||'보통'}`:`수동 · ${14+scaleLevel}px`;if(b)b.classList.toggle('super-fit-active',scaleMode==='auto')}"
),
(
".super-scale-label{min-width:48px;text-align:center}",
".super-scale-label{min-width:76px;text-align:center}"
),
(
"let scaleMode='auto',mobileLocked=false,searchTimer=null,resizeTimer=null,panelDate='',panelEvent=null,panelStudent=null,lastRefresh=0,restoredView=null,firstDataAlignment=true,loadGeneration=0,activeDynamicScripts=[];",
"let scaleMode='auto',mobileLocked=false,searchTimer=null,resizeTimer=null,panelDate='',panelEvent=null,panelStudent=null,lastRefresh=0,restoredView=null,firstDataAlignment=true,loadGeneration=0,activeDynamicScripts=[],autoTodayScrollPending=true;"
),
(
"const oldDark=toggleDarkMode;toggleDarkMode=function(){oldDark();save()};const oldMobile=toggleMobileMode;toggleMobileMode=function(){mobileLocked=true;oldMobile();closePanel();save()};const oldSwitch=switchTab;switchTab=function(id){closePanel();oldSwitch(id);save()};const oldMonth=window.changeMonth;window.changeMonth=function(v){closePanel();oldMonth(v);save()};const oldToday=goToday;goToday=function(){oldToday();save()};const oldRender=render;render=function(){oldRender();enhance();save()};",
"const oldDark=toggleDarkMode;toggleDarkMode=function(){oldDark();save()};const oldMobile=toggleMobileMode;toggleMobileMode=function(){mobileLocked=true;oldMobile();closePanel();save()};const oldSwitch=switchTab;switchTab=function(id){closePanel();oldSwitch(id);save()};const oldMonth=window.changeMonth;window.changeMonth=function(v){closePanel();oldMonth(v);save()};const oldToday=goToday;goToday=function(){autoTodayScrollPending=true;oldToday();save()};const oldRender=render;render=function(){oldRender();enhance();save()};"
),
(
"""scrollTodayIntoViewIfVisible=function(){
    const target=document.querySelector('.cal-cell.today, tr.today-row, .m-plan-card.today-card');
    const scroller=document.getElementById('mainContainer');
    if(!target||!scroller)return;
    const targetRect=target.getBoundingClientRect();
    const scrollerRect=scroller.getBoundingClientRect();
    const centeredOffset=(targetRect.top-scrollerRect.top)-Math.max(0,(scroller.clientHeight-targetRect.height)/2);
    scroller.scrollTop=Math.max(0,scroller.scrollTop+centeredOffset);
    resetOuterDocumentScroll(true);
};""",
"""scrollTodayIntoViewIfVisible=function(){
    if(!autoTodayScrollPending)return;
    autoTodayScrollPending=false;
    const target=document.querySelector('.cal-cell.today, tr.today-row, .m-plan-card.today-card');
    const scroller=document.getElementById('mainContainer');
    if(!target||!scroller)return;
    const targetRect=target.getBoundingClientRect();
    const scrollerRect=scroller.getBoundingClientRect();
    const centeredOffset=(targetRect.top-scrollerRect.top)-Math.max(0,(scroller.clientHeight-targetRect.height)/2);
    scroller.scrollTop=Math.max(0,scroller.scrollTop+centeredOffset);
    resetOuterDocumentScroll(true);
};"""
),
(
"""function syncMobileNavLayout(smooth=false){
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
}""",
"""function syncMobileNavLayout(){
    const nav=q('#mobileNav');
    if(!nav)return;
    if(!document.body.classList.contains('mobile-mode-active')){
        document.documentElement.style.removeProperty('--mobile-nav-clearance');
        return;
    }
    nav.scrollLeft=0;
    const rect=nav.getBoundingClientRect();
    const style=getComputedStyle(nav);
    const bottom=parseFloat(style.bottom)||0;
    document.documentElement.style.setProperty('--mobile-nav-clearance',Math.ceil(rect.height+bottom+18)+'px');
}"""
),
(
"requestAnimationFrame(()=>syncMobileNavLayout(true));",
"requestAnimationFrame(()=>syncMobileNavLayout());"
),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Patch anchor not found: {old[:90]!r}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
