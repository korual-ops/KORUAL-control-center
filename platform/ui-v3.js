(()=>{
  const ready=(fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();

  ready(()=>{
    const home=document.querySelector('.screen[data-screen="home"]');
    const hero=document.querySelector('.new-home-hero');
    if(!home||!hero)return;

    const openScreen=(name)=>{
      const tab=document.querySelector('.tab[data-tab="'+name+'"]');
      const opener=document.querySelector('[data-open-screen="'+name+'"]');
      if(tab){tab.click();return}
      if(opener){opener.click();return}
      location.hash='#'+name;
    };

    const runPrompt=(prompt,{autoSubmit=true}={})=>{
      const value=String(prompt||'').trim();
      if(!value)return;
      openScreen('match');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const input=document.querySelector('#matchInput');
        const form=document.querySelector('#matchForm');
        if(!input)return;
        input.value=value;
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.focus();
        if(autoSubmit&&form){
          if(typeof form.requestSubmit==='function')form.requestSubmit();
          else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
        }
      }));
    };

    // Trust copy inside the hero: useful reassurance instead of decorative badges.
    if(!hero.querySelector('.uxv3-hero-proof')){
      const proof=document.createElement('div');
      proof.className='uxv3-hero-proof';
      proof.innerHTML='<span><i></i>AI가 조건 정리</span><span><i></i>가격 + 신뢰 비교</span><span><i></i>최종 선택은 직접</span>';
      const copy=hero.querySelector('.new-hero-copy');
      if(copy)copy.appendChild(proof);
    }

    // Primary action is now a real input on the home screen.
    if(!document.querySelector('.uxv3-ai-dock')){
      const dock=document.createElement('section');
      dock.className='uxv3-ai-dock';
      dock.setAttribute('aria-label','KORUAL AI 빠른 요청');
      dock.innerHTML=`
        <div class="uxv3-dock-top">
          <div class="uxv3-dock-brand"><span class="uxv3-dock-orb">✦</span><span><small>KORUAL AI DOCK</small><strong>필요한 일을 한 문장으로 시작하세요.</strong></span></div>
          <span class="uxv3-dock-hint">Ctrl / ⌘ + K</span>
        </div>
        <form class="uxv3-dock-form">
          <textarea rows="1" maxlength="240" aria-label="서비스 요청" placeholder="예: 다음 달 영종도로 이사해. 입주청소와 인터넷까지 같이 비교해줘."></textarea>
          <button type="submit">AI로 비교 <span>→</span></button>
        </form>
        <div class="uxv3-prompt-row" aria-label="추천 요청">
          <button type="button" data-v3-prompt="다음 달 이사와 입주청소, 인터넷 설치를 예산과 일정에 맞춰 비교해줘">이사 올인원</button>
          <button type="button" data-v3-prompt="우리 집 에어컨 설치와 세척 비용을 신뢰도 높은 업체 중심으로 비교해줘">에어컨</button>
          <button type="button" data-v3-prompt="3박 4일 여행의 항공, 숙박, 공항 이동을 한 번에 정리해줘">여행</button>
          <button type="button" data-v3-prompt="집에서 이번 달에 점검할 생활 서비스를 예산 중심으로 추천해줘">집 관리</button>
        </div>`;
      hero.insertAdjacentElement('afterend',dock);

      const input=dock.querySelector('textarea');
      const resize=()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px'};
      input.addEventListener('input',resize);
      dock.querySelector('form').addEventListener('submit',(e)=>{e.preventDefault();runPrompt(input.value)});
      dock.addEventListener('click',(e)=>{
        const btn=e.target.closest('[data-v3-prompt]');
        if(btn)runPrompt(btn.dataset.v3Prompt);
      });

      try{
        const saved=JSON.parse(localStorage.getItem('korual-mobile-state-v3')||'{}');
        const current=saved?.currentRequest;
        if(current?.raw){
          const resume=document.createElement('div');
          resume.className='uxv3-resume';
          resume.innerHTML='<div><small>CONTINUE</small><strong>'+escapeText(current.raw).slice(0,86)+'</strong></div><button type="button">이어서 비교 →</button>';
          resume.querySelector('button').addEventListener('click',()=>runPrompt(current.raw,{autoSubmit:false}));
          dock.appendChild(resume);
        }
      }catch(_){}

      window.addEventListener('keydown',(e)=>{
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
          e.preventDefault();
          if(location.hash&&location.hash!=='#home')openScreen('home');
          requestAnimationFrame(()=>input.focus());
        }
      });
    }

    function escapeText(value){
      return String(value||'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    }

    // Task-based entry points outperform a catalogue-first mental model.
    if(!document.querySelector('.uxv3-moments')){
      const moments=document.createElement('section');
      moments.className='uxv3-moments';
      moments.setAttribute('aria-label','상황별 서비스 시작');
      moments.innerHTML=`
        <div class="uxv3-section-kicker"><div><small>START BY MOMENT</small><strong>서비스 말고, 상황으로 시작.</strong></div><span>필요한 서비스를 KORUAL이 묶어서 정리합니다.</span></div>
        <div class="uxv3-moment-grid">
          <button class="uxv3-moment" type="button" data-v3-prompt="다음 달 이사를 준비 중이야. 이사, 입주청소, 인터넷 설치를 일정과 예산 기준으로 한 번에 비교해줘"><b>01</b><small>MOVING</small><strong>이사 준비</strong><em>이사 · 청소 · 인터넷을 한 흐름으로</em></button>
          <button class="uxv3-moment" type="button" data-v3-prompt="집 관리에 필요한 청소, 에어컨, 수리 서비스를 우선순위와 예산에 맞춰 정리해줘"><b>02</b><small>HOME CARE</small><strong>집 관리</strong><em>청소 · 에어컨 · 수리·시공</em></button>
          <button class="uxv3-moment" type="button" data-v3-prompt="여행을 준비 중이야. 항공, 숙박, 공항 이동을 일정과 비용 기준으로 정리해줘"><b>03</b><small>TRAVEL</small><strong>여행 준비</strong><em>항공 · 숙박 · 공항 이동</em></button>
          <button class="uxv3-moment" type="button" data-v3-prompt="일상 회복을 위한 웰니스 서비스를 시간과 예산 기준으로 추천해줘"><b>04</b><small>WELLNESS</small><strong>일상 회복</strong><em>휴식 · 운동 · 생활 케어</em></button>
        </div>`;
      const command=document.querySelector('.korual-command');
      if(command)command.insertAdjacentElement('afterend',moments);
      else document.querySelector('.uxv3-ai-dock')?.insertAdjacentElement('afterend',moments);
      moments.addEventListener('click',(e)=>{
        const btn=e.target.closest('[data-v3-prompt]');
        if(btn)runPrompt(btn.dataset.v3Prompt);
      });
    }

    // Three-stage journey is repeated only on task screens.
    const screenMap={match:1,quotes:2,bookings:3};
    Object.entries(screenMap).forEach(([name,active])=>{
      const screen=document.querySelector('.screen[data-screen="'+name+'"]');
      const heading=screen?.querySelector('.screen-heading');
      if(!screen||!heading||screen.querySelector('.uxv3-journey'))return;
      const journey=document.createElement('div');
      journey.className='uxv3-journey';
      journey.innerHTML=[
        ['01','요청','조건 정리'],
        ['02','비교','가격 · 신뢰'],
        ['03','예약','최종 승인']
      ].map((x,i)=>'<div class="uxv3-step '+(i+1<active?'is-done ':i+1===active?'is-active ':'')+'"><i>'+x[0]+'</i><span><small>'+x[2]+'</small><strong>'+x[1]+'</strong></span></div>').join('');
      heading.insertAdjacentElement('afterend',journey);
    });

    const quotes=document.querySelector('.screen[data-screen="quotes"]');
    if(quotes&&!quotes.querySelector('.uxv3-quote-cockpit')){
      const strip=quotes.querySelector('.filter-strip');
      if(strip){
        const cockpit=document.createElement('div');
        cockpit.className='uxv3-quote-cockpit';
        cockpit.innerHTML='<div><i>◇</i><span><small>DECISION COCKPIT</small><strong>가격 하나가 아니라 조건 전체로 비교하세요.</strong></span></div><span>정렬 기준을 바꾸면 같은 후보도 다른 관점으로 볼 수 있습니다.</span>';
        strip.insertAdjacentElement('beforebegin',cockpit);
      }
    }

    const enhanceQuotes=()=>{
      const cards=[...document.querySelectorAll('.quote-card[data-price][data-trust]')];
      if(!cards.length)return;
      const prices=cards.map(c=>Number(c.dataset.price)).filter(Number.isFinite);
      const min=Math.min(...prices);
      cards.forEach(card=>{
        let reasons=card.querySelector('.uxv3-reasons');
        if(!reasons){
          reasons=document.createElement('div');
          reasons.className='uxv3-reasons';
          const select=card.querySelector('.select-quote');
          if(select)select.insertAdjacentElement('beforebegin',reasons);
          else card.appendChild(reasons);
        }
        const price=Number(card.dataset.price);
        const trust=Number(card.dataset.trust);
        const signature=String(price)+'::'+String(trust);
        if(card.dataset.v3EnhanceSignature===signature)return;
        card.dataset.v3EnhanceSignature=signature;
        const tags=[];
        if(Number.isFinite(price)&&price===min)tags.push(['가격 메리트',true]);
        if(Number.isFinite(trust)&&trust>=94)tags.push(['신뢰도 강점',true]);
        if(Number.isFinite(trust)&&trust>=90)tags.push(['검증 우선',false]);
        if(!tags.length)tags.push(['조건 균형형',false]);
        reasons.innerHTML=tags.slice(0,3).map(([label,key])=>'<span class="'+(key?'is-key':'')+'">'+label+'</span>').join('');
      });
    };
    enhanceQuotes();

    const quoteList=document.querySelector('#quoteList');
    if(quoteList&&'MutationObserver' in window){
      new MutationObserver(()=>enhanceQuotes()).observe(quoteList,{subtree:true,attributes:true,attributeFilter:['data-price','data-trust']});
    }

    // Keep the UI focused: no duplicate floating AI button once the Dock exists.
    const concierge=document.querySelector('#aiConcierge');
    if(concierge)concierge.setAttribute('aria-hidden','true');
  });
})();