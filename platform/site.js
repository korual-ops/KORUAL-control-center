(()=>{
  const root=document.documentElement;
  const themeBtn=document.getElementById('themeToggle');
  const menuBtn=document.getElementById('menuToggle');
  const menuClose=document.getElementById('menuClose');
  const backdrop=document.getElementById('mobileMenuBackdrop');
  const form=document.getElementById('quickMatchForm');
  const input=document.getElementById('matchInput');
  const resultContent=document.getElementById('resultContent');
  const resultStatus=document.getElementById('resultStatus');
  const toast=document.getElementById('toast');
  const navLinks=[...document.querySelectorAll('[data-nav]')];
  const services=[...document.querySelectorAll('[data-service]')];

  const storedTheme=localStorage.getItem('korual-theme');
  if(storedTheme==='dark') root.dataset.theme='dark';

  function syncTheme(){
    const dark=root.dataset.theme==='dark';
    localStorage.setItem('korual-theme',dark?'dark':'light');
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content',dark?'#080d16':'#f5f7fb');
    if(themeBtn) themeBtn.setAttribute('aria-pressed',String(dark));
  }
  syncTheme();

  themeBtn?.addEventListener('click',()=>{
    root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';
    syncTheme();
  });

  function openMenu(){
    if(!backdrop||!menuBtn)return;
    backdrop.hidden=false;
    menuBtn.textContent='×';
    menuBtn.setAttribute('aria-expanded','true');
    document.body.style.overflow='hidden';
  }
  function closeMenu(){
    if(!backdrop||!menuBtn)return;
    backdrop.hidden=true;
    menuBtn.textContent='☰';
    menuBtn.setAttribute('aria-expanded','false');
    document.body.style.overflow='';
  }
  menuBtn?.addEventListener('click',()=>backdrop.hidden?openMenu():closeMenu());
  menuClose?.addEventListener('click',closeMenu);
  backdrop?.addEventListener('click',e=>{if(e.target===backdrop)closeMenu()});
  backdrop?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});

  let toastTimer;
  function showToast(message){
    if(!toast)return;
    clearTimeout(toastTimer);
    toast.textContent=message;
    toast.hidden=false;
    toastTimer=setTimeout(()=>toast.hidden=true,2600);
  }

  function renderMatch(service){
    const clean=(service||'').trim();
    if(!clean){showToast('필요한 서비스를 입력해주세요.');input?.focus();return}
    services.forEach(btn=>btn.classList.toggle('selected',btn.dataset.service===clean));
    if(resultStatus) resultStatus.textContent='MATCHED';
    if(resultContent) resultContent.innerHTML=
      '<p class="result-kicker">KORUAL AI · '+escapeHtml(clean)+'</p>'+
      '<h3>'+escapeHtml(clean)+' 조건을 정리하고<br>비교 후보를 준비합니다.</h3>'+
      '<p>현재 베타 UI에서는 매칭 흐름을 미리 보여줍니다. 다음 단계에서 실제 업체 데이터·가격·예약 API를 연결할 수 있습니다.</p>';
    document.getElementById('match')?.scrollIntoView({behavior:'smooth',block:'start'});
    showToast(clean+' 매칭 흐름을 준비했습니다.');
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  form?.addEventListener('submit',e=>{e.preventDefault();renderMatch(input?.value)});
  services.forEach(btn=>btn.addEventListener('click',()=>{
    const service=btn.dataset.service;
    if(input&&service&&!['생활 서비스','AI 추천'].includes(service)) input.value=service;
    renderMatch(service);
  }));

  document.querySelectorAll('[data-scroll]').forEach(btn=>btn.addEventListener('click',()=>{
    document.getElementById(btn.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'});
  }));

  const sections=navLinks.map(a=>document.getElementById(a.dataset.nav)).filter(Boolean);
  if('IntersectionObserver'in window){
    const io=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      navLinks.forEach(a=>a.classList.toggle('active',a.dataset.nav===visible.target.id));
    },{rootMargin:'-20% 0px -62% 0px',threshold:[0,.15,.35,.6]});
    sections.forEach(section=>io.observe(section));
  }
})();