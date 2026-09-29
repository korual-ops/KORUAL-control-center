(()=>{
  const ready=(fn)=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const quoteList=document.querySelector('#quoteList');
    const bookSelected=document.querySelector('#bookSelected');
    const cockpit=document.querySelector('.uxv3-quote-cockpit');
    const trustSheet=document.querySelector('#trustSheet');
    if(!quoteList)return;

    const money=(n)=>'₩'+Number(n||0).toLocaleString('ko-KR');
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
    const median=(arr)=>{
      if(!arr.length)return 0;
      const a=[...arr].sort((x,y)=>x-y),m=Math.floor(a.length/2);
      return a.length%2?a[m]:Math.round((a[m-1]+a[m])/2);
    };
    const visibleCards=()=>[...quoteList.querySelectorAll('[data-quote-card]')].filter(c=>!c.hidden);
    const allCards=()=>[...quoteList.querySelectorAll('[data-quote-card]')];

    function quoteData(card){
      const provider=card.querySelector('.provider-row strong')?.textContent?.trim()||'Partner';
      const meta=card.querySelector('.provider-row small')?.textContent?.trim()||'';
      const rating=card.querySelector('.fact-grid span:nth-child(1) b')?.textContent?.trim()||'—';
      const response=card.querySelector('.fact-grid span:nth-child(2) b')?.textContent?.trim()||'—';
      const badge=card.querySelector('.verified')?.textContent?.trim()||'';
      return {
        id:card.dataset.quoteCard||'',
        provider,
        price:Number(card.dataset.price)||0,
        trust:Number(card.dataset.trust)||0,
        rating,
        response,
        meta,
        badge,
        sample:/예시|sample/i.test(meta+' '+badge),
        selected:card.matches('.selected,[data-selected="true"]')
      };
    }

    function dataset(){
      return visibleCards().map(quoteData).filter(q=>Number.isFinite(q.price)&&q.price>=0);
    }

    function ensureMarket(){
      const quotes=document.querySelector('.screen[data-screen="quotes"]');
      if(!quotes)return null;
      let market=quotes.querySelector('.uxv4-market');
      if(market)return market;
      market=document.createElement('section');
      market.className='uxv4-market';
      market.setAttribute('aria-label','현재 견적 가격 포지션');
      market.innerHTML=`
        <div class="uxv4-market-head">
          <div><small>PRICE INTELLIGENCE</small><strong>현재 표시 견적의 가격 포지션</strong></div>
          <p>현재 화면에 표시된 견적만 비교합니다. 시장 전체 시세나 확정 가격을 의미하지 않습니다.</p>
        </div>
        <div class="uxv4-market-stats">
          <div><small>LOW</small><strong data-v4-low>—</strong></div>
          <div><small>MEDIAN</small><strong data-v4-median>—</strong></div>
          <div><small>HIGH</small><strong data-v4-high>—</strong></div>
        </div>
        <div class="uxv4-market-range"><i data-kind="median"></i></div>
        <div class="uxv4-market-labels"><span>낮은 표시가</span><span>높은 표시가</span></div>`;
      const anchor=document.querySelector('.uxv3-quote-cockpit')||quotes.querySelector('.filter-strip');
      anchor?.insertAdjacentElement('afterend',market);
      return market;
    }

    function updateMarket(){
      const qs=dataset();
      const market=ensureMarket();
      if(!market)return;
      if(!qs.length){market.hidden=true;return}
      market.hidden=false;
      const prices=qs.map(q=>q.price);
      const low=Math.min(...prices),high=Math.max(...prices),mid=median(prices);
      market.querySelector('[data-v4-low]').textContent=money(low);
      market.querySelector('[data-v4-median]').textContent=money(mid);
      market.querySelector('[data-v4-high]').textContent=money(high);
      const pct=high===low?50:clamp((mid-low)/(high-low)*100,4,96);
      market.querySelector('[data-kind="median"]').style.left=pct+'%';

      allCards().forEach(card=>{
        const q=quoteData(card);
        let pos=card.querySelector('.uxv4-position');
        if(!pos){
          pos=document.createElement('div');
          pos.className='uxv4-position';
          const reasons=card.querySelector('.uxv3-reasons');
          if(reasons)reasons.insertAdjacentElement('afterend',pos);
          else card.querySelector('.select-quote')?.insertAdjacentElement('beforebegin',pos);
        }
        if(!pos)return;
        const range=Math.max(1,high-low);
        const rel=high===low?50:clamp((q.price-low)/range*100,4,100);
        const diff=q.price-mid;
        let label='중앙값 부근';
        if(diff<0)label='중앙값보다 '+money(Math.abs(diff))+' 낮음';
        if(diff>0)label='중앙값보다 '+money(diff)+' 높음';
        pos.innerHTML=`
          <div class="uxv4-position-head"><small>표시 견적 내 가격 위치</small><strong>${label}</strong></div>
          <div class="uxv4-position-track"><i style="width:${rel}%"></i></div>
          <span class="uxv4-position-note">${q.sample?'예시 카드 기준 · 실제 시세 아님':'현재 서버 베타 견적 기준 · 최종 금액/추가비용 별도 확인'}</span>`;
      });
      updateSelectionSummary();
    }

    function ensureCompareButton(){
      if(!cockpit||cockpit.querySelector('.uxv4-compare-button'))return;
      const btn=document.createElement('button');
      btn.type='button';btn.className='uxv4-compare-button';btn.textContent='전체 비교표';
      cockpit.appendChild(btn);
      btn.addEventListener('click',openCompare);
    }

    function openSheet(inner,label){
      const backdrop=document.createElement('div');
      backdrop.className='uxv4-backdrop';
      backdrop.setAttribute('role','presentation');
      backdrop.innerHTML='<section class="uxv4-sheet" role="dialog" aria-modal="true" aria-label="'+label+'"><div class="uxv4-handle"></div>'+inner+'</section>';
      document.body.appendChild(backdrop);
      document.body.style.overflow='hidden';
      const close=()=>{
        backdrop.remove();
        document.body.style.overflow='';
      };
      backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});
      backdrop.querySelectorAll('[data-v4-close]').forEach(b=>b.addEventListener('click',close));
      const esc=e=>{if(e.key==='Escape'){document.removeEventListener('keydown',esc);close()}};
      document.addEventListener('keydown',esc);
      return {backdrop,close};
    }

    function openCompare(){
      const qs=dataset();
      if(!qs.length)return;
      const prices=qs.map(q=>q.price),low=Math.min(...prices);
      const trusts=qs.map(q=>q.trust),highTrust=Math.max(...trusts);
      const rows=qs.map(q=>`
        <tr class="${q.selected?'is-selected':''}">
          <td><strong>${escapeHtml(q.provider)}</strong><br><small>${escapeHtml(q.sample?'예시 · 예약 불가':'서버 베타 견적')}</small></td>
          <td class="${q.price===low?'is-best':''}">${money(q.price)}</td>
          <td class="${q.trust===highTrust?'is-best':''}">${Math.round(q.trust)}</td>
          <td>${escapeHtml(q.rating)}</td>
          <td>${escapeHtml(q.response)}</td>
          <td>${q.sample?'예시':'조건 확인 후 가능'}</td>
        </tr>`).join('');
      openSheet(`
        <div class="uxv4-sheet-head"><div><small>COMPARE ALL</small><strong>견적 전체 비교표</strong></div><button class="uxv4-close" data-v4-close type="button" aria-label="닫기">×</button></div>
        <div class="uxv4-table-wrap"><table class="uxv4-table">
          <thead><tr><th>파트너</th><th>표시 가격</th><th>Trust</th><th>평점</th><th>응답</th><th>예약</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <p class="uxv4-table-note">강조값은 현재 표시된 후보끼리만 비교한 상대값입니다. 가격이 가장 낮거나 Trust가 가장 높다고 해서 특정 업체를 자동 선택하지 않습니다. 서비스 범위·추가 비용·취소/보증 조건을 함께 확인하세요.</p>
      `,'견적 전체 비교표');
    }

    function ensureSelectionSummary(){
      const sticky=document.querySelector('#quoteSticky');
      if(!sticky)return null;
      let box=sticky.parentElement?.querySelector('.uxv4-selection-summary');
      if(box)return box;
      box=document.createElement('div');box.className='uxv4-selection-summary';
      sticky.insertAdjacentElement('beforebegin',box);
      return box;
    }

    function updateSelectionSummary(){
      const box=ensureSelectionSummary();
      if(!box)return;
      const selected=allCards().find(c=>c.matches('.selected,[data-selected="true"]'));
      if(!selected){box.classList.remove('is-visible');box.innerHTML='';return}
      const q=quoteData(selected);
      const qs=dataset();
      const prices=qs.map(x=>x.price);
      const mid=median(prices);
      const diff=q.price-mid;
      const priceText=diff===0?'표시 가격 중앙값 수준':diff<0?'표시 중앙값보다 '+money(Math.abs(diff))+' 낮음':'표시 중앙값보다 '+money(diff)+' 높음';
      const trustText=q.trust>=94?'높은 Trust 구간':q.trust>=90?'양호한 Trust 구간':'Trust 추가 확인 권장';
      box.classList.add('is-visible');
      box.innerHTML='<small>SELECTED DECISION</small><strong>'+escapeHtml(q.provider)+' · '+money(q.price)+'</strong><span>'+priceText+' · '+trustText+' · 예약 전 서비스 범위와 추가 비용을 다시 확인하세요.</span>';
    }

    function enrichTrust(){
      if(!trustSheet)return;
      const hero=trustSheet.querySelector('.trust-score-hero');
      if(!hero||trustSheet.querySelector('.uxv4-trust-lens'))return;
      const lens=document.createElement('div');lens.className='uxv4-trust-lens';
      lens.innerHTML=`
        <div><small>PRICE VIEW</small><strong data-v4-trust-price>현재 견적과 비교</strong></div>
        <div><small>TRUST VIEW</small><strong data-v4-trust-grade>신뢰 데이터 확인</strong></div>
        <div><small>DECISION</small><strong>최종 선택은 직접</strong></div>
        <p>Trust Score와 가격 포지션은 의사결정 보조 정보입니다. 서비스 범위·추가 비용·취소·보증 조건을 대체하지 않습니다.</p>`;
      hero.insertAdjacentElement('afterend',lens);
    }

    function syncTrustLens(){
      if(!trustSheet||trustSheet.hidden)return;
      enrichTrust();
      const title=trustSheet.querySelector('#trustTitle')?.textContent?.trim();
      const q=dataset().find(x=>x.provider===title);
      const prices=dataset().map(x=>x.price);
      if(!q||!prices.length)return;
      const mid=median(prices);
      const priceView=q.price<mid?'표시 중앙값보다 낮음':q.price>mid?'표시 중앙값보다 높음':'표시 중앙값 수준';
      const trustGrade=q.trust>=94?'높은 Trust 구간':q.trust>=90?'양호한 Trust 구간':'추가 확인 구간';
      trustSheet.querySelector('[data-v4-trust-price]').textContent=priceView;
      trustSheet.querySelector('[data-v4-trust-grade]').textContent=trustGrade;
    }

    let bypassBooking=false;
    function reviewBeforeBooking(){
      const selected=allCards().find(c=>c.matches('.selected,[data-selected="true"]'));
      if(!selected)return;
      const q=quoteData(selected);
      const state=readState();
      const service=state?.currentRequest?.service||'서비스';
      const bundle=Array.isArray(state?.currentRequest?.bundle)?state.currentRequest.bundle.join(' · '):'조건 확인';
      const qs=dataset(),mid=median(qs.map(x=>x.price));
      const diff=q.price-mid;
      const pos=diff===0?'표시 중앙값 수준':diff<0?'중앙값보다 '+money(Math.abs(diff))+' 낮음':'중앙값보다 '+money(diff)+' 높음';
      const {backdrop,close}=openSheet(`
        <div class="uxv4-sheet-head"><div><small>FINAL REVIEW</small><strong>예약 요청 전 마지막 확인</strong></div><button class="uxv4-close" data-v4-close type="button" aria-label="닫기">×</button></div>
        <div class="uxv4-review-hero"><small>${escapeHtml(service)}</small><strong>${escapeHtml(q.provider)}</strong><span>${money(q.price)} · Trust ${Math.round(q.trust)}</span></div>
        <div class="uxv4-review-grid">
          <div><small>가격 위치</small><strong>${escapeHtml(pos)}</strong></div>
          <div><small>응답</small><strong>${escapeHtml(q.response)}</strong></div>
          <div><small>요청 묶음</small><strong>${escapeHtml(bundle)}</strong></div>
        </div>
        <div class="uxv4-checks"><strong>예약 전 확인할 항목</strong><p><span>01</span> 표시 가격에 포함된 서비스 범위 · <span>02</span> 현장 추가비용 가능성 · <span>03</span> 취소/변경 조건 · <span>04</span> 보증 또는 A/S 조건</p></div>
        <div class="uxv4-review-actions"><button type="button" data-v4-close>다시 비교</button><button type="button" data-v4-confirm>예약 정보 입력 <span>→</span></button></div>
      `,'예약 요청 전 마지막 확인');
      backdrop.querySelector('[data-v4-confirm]').addEventListener('click',()=>{
        close();
        bypassBooking=true;
        bookSelected?.click();
      });
    }

    function readState(){
      try{return JSON.parse(localStorage.getItem('korual-mobile-state-v3')||'{}')}catch(_){return {}}
    }

    function escapeHtml(value){
      return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    }

    ensureCompareButton();
    ensureMarket();
    enrichTrust();
    updateMarket();

    if(bookSelected){
      document.addEventListener('click',(e)=>{
        const target=e.target.closest?.('#bookSelected');
        if(!target||target.disabled)return;
        if(bypassBooking){bypassBooking=false;return}
        e.preventDefault();
        e.stopImmediatePropagation();
        reviewBeforeBooking();
      },true);
    }

    document.addEventListener('click',(e)=>{
      if(e.target.closest?.('[data-quote]'))setTimeout(()=>{updateMarket();updateSelectionSummary()},0);
      if(e.target.closest?.('[data-trust]'))setTimeout(syncTrustLens,0);
      if(e.target.closest?.('[data-sort], [data-priority], #verifiedOnly, #clearQuoteFilters'))setTimeout(updateMarket,0);
    });

    const budget=document.querySelector('#budgetCap');
    budget?.addEventListener('input',()=>setTimeout(updateMarket,0));

    if('MutationObserver' in window){
      new MutationObserver(()=>updateMarket()).observe(quoteList,{
        subtree:true,attributes:true,
        attributeFilter:['data-price','data-trust','hidden']
      });
      if(trustSheet)new MutationObserver(syncTrustLens).observe(trustSheet,{attributes:true,attributeFilter:['hidden']});
    }
  });
})();