(()=>{
  'use strict';
  const form=document.getElementById('realQuoteRequestForm');
  const feedback=document.getElementById('realQuoteFeedback');
  const list=document.getElementById('realQuoteList');
  const refresh=document.getElementById('realQuoteRefresh');
  if(!form||!feedback||!list||!refresh)return;
  const API='https://dtmmjkikyfgkeimhevso.supabase.co/functions/v1/korual-public-api';
  const REQUEST_KEY='korual-real-quote-request-v1';
  const SESSION_KEY='korual-session-v1';
  const fmtPrice=v=>new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(Number(v)||0);
  const fmtTime=v=>v?new Date(v).toLocaleString('ko-KR',{dateStyle:'medium',timeStyle:'short'}):'확인 중';
  const errors={
    NO_VERIFIED_SUPPLY:'해당 조건에 맞는 인증된 실사업자가 아직 없어 요청을 접수하지 않았습니다. 개인정보도 새로 저장하지 않았습니다.',
    CONSENT_REQUIRED:'개인정보 수집 동의가 필요합니다.',
    RATE_LIMITED:'요청 제한에 도달했습니다. 나중에 다시 시도해주세요.',
    PRIVATE_DATA_IN_REQUEST:'서비스 설명에는 개인정보를 기입하지 마세요.',
    SERVICE_NOT_SUPPORTED:'선택한 서비스는 실제 견적 요청 대상이 아닙니다.',
    REQUEST_NOT_OWNED:'현재 이용 중인 브라우저 세션으로 조회할 수 없는 요청입니다.',
    SERVER_ERROR:'서버에서 요청을 처리하지 못했습니다.'
  };
  let pending=null;
  const show=(message,bad=false)=>{feedback.textContent=message;feedback.dataset.error=bad?'true':'false';};
  function element(tag,value,cls){
    const n=document.createElement(tag);if(value!=null)n.textContent=String(value);
    if(cls)n.className=cls;return n;
  }
  async function api(action,payload){
    const sessionId=sessionStorage.getItem(SESSION_KEY)||'';
    if(!/^[A-Za-z0-9_-]{32,80}$/.test(sessionId)){
      throw new Error('브라우저 세션을 확인할 수 없습니다. 화면을 새로고침해주세요.');
    }
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(API,{method:'POST',headers:{
        'content-type':'application/json','x-korual-session':sessionId
      },body:JSON.stringify({action,...payload}),signal:controller.signal});
      const data=await response.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));
      if(!response.ok||!data.ok)throw new Error(errors[data.error]||data.error||'요청 실패');
      return data;
    }finally{clearTimeout(timeout);}
  }
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const dateInput=form.querySelector('[name=desired_date]');
  dateInput.min=today;
  async function poll(){
    list.replaceChildren();
    const id=sessionStorage.getItem(REQUEST_KEY);
    if(!id){show('아직 실제 견적 요청 내역이 없습니다. AI 예상가는 실제 제출 견적이 아닙니다.');return;}
    refresh.disabled=true;
    try{
      const result=await api('real_quote_status',{request_id:id});
      show('요청번호 '+result.request.request_code+' · '+result.request.status+' · 실제 업체 견적 '+result.real_quotes.length+'건');
      if(!result.real_quotes.length){
        const box=element('p','검증된 사업자의 실제 견적 제출을 기다리는 중입니다. 업체 배정과 응답에 시간이 걸릴 수 있습니다.','real-quote-empty');
        list.append(box);
        return;
      }
      for(const quote of result.real_quotes){
        const box=element('article',null,'real-quote-result');
        box.append(
          element('strong',quote.provider_name),
          element('b',fmtPrice(quote.amount)),
          element('p',quote.message||'작업 범위 설명 없음'),
          element('small','실제 제출: '+fmtTime(quote.submitted_at)+(quote.quote_expires_at?' · 만료: '+fmtTime(quote.quote_expires_at):''))
        );
        list.append(box);
      }
      list.append(element('p','실제 견적 조회 기능입니다. 업체 선택·예약 확정과 결제는 아직 이 화면에서 제공하지 않습니다.','real-quote-disclaimer'));
    }catch(error){show(error.message,true);}
    finally{refresh.disabled=false;}
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    const b=form.querySelector('[type=submit]'),f=new FormData(form);
    const request={service:String(f.get('service')||''),region:String(f.get('region')||''),desired_date:String(f.get('desired_date')||'')};
    const customer={name:String(f.get('name')||''),phone:String(f.get('phone')||''),privacy_consent:f.get('privacy_consent')==='on'};
    b.disabled=true;show('실제 공급업체 가능 여부와 입력 조건을 확인 중입니다.');
    try{
      const key=pending?.key||crypto.randomUUID().replace(/-/g,'_');
      if(!pending)pending={key};
      const result=await api('submit_real_request',{request,customer,idempotency_key:key});
      sessionStorage.setItem(REQUEST_KEY,result.request.id);
      pending=null;
      form.reset();
      show('실제 견적 요청이 접수됐습니다. 아직 업체가 견적을 제출한 상태는 아닙니다.');
      await poll();
    }catch(error){show(error.message,true);}
    finally{b.disabled=false;}
  });
  // Do not persist name, phone, or consent field values in browser storage.
  form.addEventListener('input',()=>{pending=null;});
  refresh.addEventListener('click',poll);
  async function prepareRealMarketplace(){
    try{
      const data=await api('real_marketplace_readiness',{});
      if(!data.real_request_enabled){
        for(const control of form.querySelectorAll('input,select,button[type=submit]')){
          control.disabled=true;
        }
        show('현재 검증된 실제 제휴업체가 없어 신규 견적 요청을 받지 않습니다. AI 예상가격은 참고용입니다.');
      }
    }catch(error){
      for(const control of form.querySelectorAll('input,select,button[type=submit]')){
        control.disabled=true;
      }
      show('실제 제휴업체 확인이 불가능해 개인정보 입력을 제한했습니다. 나중에 다시 확인해주세요.',true);
    }
  }
  prepareRealMarketplace();
  if(sessionStorage.getItem(REQUEST_KEY))poll();
})();