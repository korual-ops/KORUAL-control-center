(()=>{
  const ready=(fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const header=document.querySelector('.app-header');
    const headerRight=document.querySelector('.header-right');
    const hero=document.querySelector('.new-home-hero');
    const heroCopy=document.querySelector('.new-hero-copy');
    if(!header||!hero) return;

    // Desktop navigation mirrors the app's core journeys.
    if(!document.querySelector('.korual-desktop-nav')){
      const nav=document.createElement('nav');
      nav.className='korual-desktop-nav';
      nav.setAttribute('aria-label','KORUAL 데스크톱 탐색');
      nav.innerHTML=`
        <button type="button" data-ui-screen="home">홈</button>
        <button type="button" data-ui-screen="match">AI 매칭</button>
        <button type="button" data-ui-screen="services">서비스</button>
        <button type="button" data-ui-screen="quotes">견적</button>
        <button type="button" data-ui-screen="bookings">예약</button>`;
      header.insertBefore(nav,headerRight);
      nav.addEventListener('click',(e)=>{
        const btn=e.target.closest('[data-ui-screen]');
        if(!btn)return;
        const name=btn.dataset.uiScreen;
        const tab=document.querySelector('.tab[data-tab="'+name+'"]');
        const opener=document.querySelector('[data-open-screen="'+name+'"]');
        if(tab) tab.click();
        else if(opener) opener.click();
        else location.hash='#'+name;
      });
    }

    // One-tap intent starters under the hero.
    if(heroCopy&&!heroCopy.querySelector('.hero-quick')){
      const quick=document.createElement('div');
      quick.className='hero-quick';
      quick.setAttribute('aria-label','빠른 요청');
      quick.innerHTML=`
        <button type="button" data-quick-prompt="다음 달 이사와 입주청소, 인터넷 설치를 함께 비교해줘">이사 한 번에</button>
        <button type="button" data-quick-prompt="에어컨 설치와 세척 가격을 비교해줘">에어컨</button>
        <button type="button" data-quick-prompt="3박 4일 여행 항공과 숙박, 공항 이동을 비교해줘">여행 계획</button>
        <button type="button" data-quick-prompt="우리 집에 필요한 생활 서비스를 예산 중심으로 추천해줘">생활 추천</button>`;
      const foot=heroCopy.querySelector('.new-hero-foot');
      if(foot) heroCopy.insertBefore(quick,foot);
      else heroCopy.appendChild(quick);

      quick.addEventListener('click',(e)=>{
        const btn=e.target.closest('[data-quick-prompt]');
        if(!btn)return;
        const prompt=btn.dataset.quickPrompt;
        const open=document.querySelector('[data-open-screen="match"]');
        if(open) open.click(); else location.hash='#match';
        requestAnimationFrame(()=>{
          const input=document.querySelector('#matchInput');
          if(input){input.value=prompt;input.focus();input.dispatchEvent(new Event('input',{bubbles:true}))}
        });
      });
    }

    // Decorative 3D brand object. CSS only; hidden from assistive tech.
    if(!hero.querySelector('.korual-hero-visual')){
      const visual=document.createElement('div');
      visual.className='korual-hero-visual';
      visual.setAttribute('aria-hidden','true');
      visual.innerHTML=`
        <div class="korual-orbit"></div>
        <div class="korual-core"></div>
        <div class="korual-float-card one"><small>AI MATCH</small><strong>조건 구조화</strong></div>
        <div class="korual-float-card two"><small>KORUAL TRUST</small><strong>가격 + 신뢰</strong></div>
        <div class="korual-float-card three"><small>ONE FLOW</small><strong>예약 → 재구매</strong></div>`;
      hero.appendChild(visual);
    }

    // Header compact state.
    const syncHeader=()=>header.classList.toggle('is-scrolled',window.scrollY>24);
    syncHeader();
    window.addEventListener('scroll',syncHeader,{passive:true});

    // Gentle desktop parallax.
    const canHover=matchMedia('(hover:hover) and (pointer:fine)').matches;
    if(canHover){
      hero.addEventListener('pointermove',(e)=>{
        const r=hero.getBoundingClientRect();
        const x=((e.clientX-r.left)/r.width-.5)*14;
        const y=((e.clientY-r.top)/r.height-.5)*10;
        hero.style.setProperty('--mx',x+'px');
        hero.style.setProperty('--my',y+'px');
      });
      hero.addEventListener('pointerleave',()=>{
        hero.style.setProperty('--mx','0px');hero.style.setProperty('--my','0px');
      });
    }

    // Scroll reveal keeps information density calm.
    const revealTargets=[...document.querySelectorAll('.new-discover,.korual-loop,.new-feature,.korual-proof,.new-recommendation')];
    if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion:reduce)').matches){
      revealTargets.forEach(el=>el.classList.add('korual-reveal'));
      const io=new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target)}
        });
      },{threshold:.12,rootMargin:'0px 0px -6% 0px'});
      revealTargets.forEach(el=>io.observe(el));
    }

    // Keep desktop nav in sync with the visible screen/hash.
    const syncNav=()=>{
      const current=(location.hash||'#home').slice(1);
      document.querySelectorAll('.korual-desktop-nav button').forEach(b=>{
        const active=b.dataset.uiScreen===current;
        b.classList.toggle('is-active',active);
        if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
      });
    };
    syncNav();
    window.addEventListener('hashchange',syncNav);
    window.addEventListener('korual:screen-changed',syncNav);
    window.addEventListener('popstate',syncNav);

    // Quote selection state is owned by site.js to avoid duplicate click state.
  });
})();