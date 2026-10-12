const $ = q => document.querySelector(q);
const state={providers:[],selected:null,leads:[],quotes:[],bookings:[],tab:'home',request:null};
const titles={home:['오늘의 수주 기회','배정된 요청을 빠르게 확인하고 견적을 전달하세요.'],leads:['수주함','내 업체에 배정된 고객 요청만 확인합니다.'],quotes:['내 견적','제출한 가격과 조건을 투명하게 관리합니다.'],bookings:['예약 현황','예약 상태와 예정 일정을 확인하세요.'],account:['사업장 정보','소속 업체와 접근 권한을 확인합니다.']};
const errors={
  PARTNER_SETUP_REQUIRED:'사업자 권한 DB 구성이 아직 완료되지 않았습니다. 관리자에게 문의하세요.',
  PARTNER_ACCESS_DENIED:'이 사업장에 접근할 권한이 없습니다.',
  PROVIDER_NOT_VERIFIED:'현재 사업장은 검증 대기 또는 운영 중지 상태입니다.',
  LEAD_NOT_ASSIGNED:'접근할 수 없는 견적 요청입니다.',
  QUOTE_ALREADY_EXISTS:'이 요청에는 이미 견적이 제출됐습니다.',
  INVALID_CREDENTIALS:'로그인 정보가 올바르지 않습니다.',
  REQUEST_CLOSED:'요청이 마감되어 견적을 제출할 수 없습니다.'
};
const won=v=>new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(v);
const fmt=d=>d?new Date(d).toLocaleString('ko-KR',{dateStyle:'medium',timeStyle:'short'}):'미정';
function node(tag,text,cls){const x=document.createElement(tag);if(text!=null)x.textContent=String(text);if(cls)x.className=cls;return x;}
function clear(el){el.replaceChildren();}
function feedback(message,bad=false){const host=$('#feedback');clear(host);if(message)host.append(node('p',message,'notice'+(bad?' danger':'')));}
async function api(path,options={}){const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});const data=await res.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));if(!res.ok||!data.ok){const err=new Error(errors[data.error]||data.error||'연결에 실패했습니다.');err.status=res.status;throw err;}return data;}
function switchView(showApp){$('#appView').hidden=!showApp;$('#loginView').hidden=showApp;$('#logout').hidden=!showApp;$('#status').textContent=showApp?'인증된 사업자':'로그인 필요';}
function tab(name){state.tab=name;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.id!==name);$('#pageTitle').textContent=titles[name][0];$('#pageIntro').textContent=titles[name][1];}
function empty(into,main,sub){clear(into);const x=node('div',null,'empty');x.append(node('b',main),node('span',sub));into.append(x);}
function render(){
  $('#leadCount').textContent=state.leads.length;$('#quoteCount').textContent=state.quotes.length;$('#bookingCount').textContent=state.bookings.length;
  const todo=$('#todo');clear(todo);
  const waiting=state.leads.filter(l=>l.status!=='quoted'&&l.status!=='declined'&&l.status!=='expired').length;
  todo.append(node('p',waiting?'견적 검토가 필요한 요청 '+waiting+'건이 있습니다.':'현재 미처리 견적 요청이 없습니다.','muted'));
  if(waiting){const b=node('button','수주함 열기 →','btn primary');b.onclick=()=>tab('leads');todo.append(b);}
  const ll=$('#leadList');clear(ll);
  if(!state.leads.length)empty(ll,'배정된 요청이 없습니다','조건에 맞는 신규 매칭이 생성되면 여기 표시됩니다.');
  for(const lead of state.leads){
    const r=lead.service_requests||{};const box=node('article',null,'item'),head=node('div',null,'item-head');
    head.append(node('strong',(r.services||[]).join(' · ')||'서비스 요청'),node('span',lead.status==='quoted'?'견적 제출':'검토 필요','state'));
    box.append(head,node('p','지역 '+(r.region||'—')+' · 희망일 '+(r.desired_date||'미정'),'small muted'),node('p','요청번호 '+(r.request_code||'—'),'small muted'));
    if(['pending','contacted'].includes(lead.status)&&['NEW','MATCHING','QUOTED'].includes(r.status)){
      const b=node('button','견적 작성 →','btn primary');b.type='button';b.onclick=()=>openQuote(lead);box.append(b);
    }
    ll.append(box);
  }
  const ql=$('#quoteList');clear(ql);
  if(!state.quotes.length)empty(ql,'제출 견적이 없습니다','수주함에서 견적을 작성하면 기록됩니다.');
  state.quotes.forEach(q=>{const x=node('article',null,'item');x.append(node('strong',won(q.amount)),node('p','상태 '+q.status+' · '+fmt(q.created_at),'small muted'),node('p',q.message||'설명 없음','small'));ql.append(x);});
  const bl=$('#bookingList');clear(bl);
  if(!state.bookings.length)empty(bl,'예약이 없습니다','실제 확정되는 예약만 조회됩니다.');
  state.bookings.forEach(b=>{const x=node('article',null,'item');x.append(node('strong','예약 '+b.id.slice(0,8)),node('p','예정 '+fmt(b.scheduled_at),'small muted'),node('p','상태 '+b.status+' · 확정 '+b.confirmation_status,'small muted'));bl.append(x);});
  const account=$('#businessDetails');clear(account);const p=state.providers.find(p=>p.id===state.selected);
  account.append(node('h2',p?.name||'사업장 선택 필요'),node('p','역할 '+(p?.role||'—')+' · 업체 검증 '+(p?.verified?'완료':'대기'),'small muted'));
}
async function selectProvider(){
 const id=$('#providerSelect').value;state.selected=id;feedback('');
 try{const suffix='?provider_id='+encodeURIComponent(id);
   const values=await Promise.all(['leads','quotes','bookings'].map(x=>api('/api/partner/'+x+suffix)));
   [state.leads,state.quotes,state.bookings]=values.map((x,i)=>x[['leads','quotes','bookings'][i]]);
   render();
 }catch(err){feedback(err.message,true);}
}
async function load(){
 try{const data=await api('/api/partner/me');state.providers=data.providers||[];
   if(!state.providers.length){state.leads=[];state.quotes=[];state.bookings=[];render();switchView(true);$('#providerSelect').replaceChildren();feedback('승인된 사업장 권한이 없습니다. 운영 담당자에게 소속 업체 등록을 요청하세요.',true);return;}
   switchView(true);const sel=$('#providerSelect');clear(sel);
   state.providers.forEach(p=>{const o=node('option',p.name+' · '+p.role);o.value=p.id;sel.append(o);});
   state.selected=state.providers[0].id;sel.value=state.selected;await selectProvider();
 }catch(err){if(err.status===401){switchView(false);return;}switchView(false);$('#loginError').textContent=err.message;}
}
function openQuote(lead){state.request=lead;const d=$('#quoteDialog');$('#quoteRequest').textContent='요청번호 '+(lead.service_requests?.request_code||'—');$('#quoteForm').reset();if(typeof d.showModal==='function')d.showModal();}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
$('#providerSelect').addEventListener('change',selectProvider);
$('#refresh').addEventListener('click',load);
$('#cancelQuote').addEventListener('click',()=>$('#quoteDialog').close());
$('#applyForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const form=e.currentTarget,button=form.querySelector('[type=submit]');
 const note=$('#applyFeedback');note.textContent='';
 if(!form.reportValidity())return;
 const fields=new FormData(form);
 const payload={
  company_name:String(fields.get('company_name')||''),
  contact_email:String(fields.get('contact_email')||''),
  region:String(fields.get('region')||''),
  service_category:String(fields.get('service_category')||''),
  website:String(fields.get('website')||''),
  privacy_consent:fields.get('privacy_consent')==='on',
  terms_acknowledged:fields.get('terms_acknowledged')==='on'
 };
 button.disabled=true;
 try{
  await api('/api/partner/applications',{method:'POST',headers:{'content-type':'application/json','x-korual-app':'partner'},body:JSON.stringify(payload)});
  note.textContent='신청 접수가 완료되었습니다. 운영팀 심사 후 별도로 연락드릴 수 있으며, 현재 사업자 권한은 부여되지 않았습니다.';
  form.reset();
 }catch(err){
  note.textContent=err.message==='PARTNER_SETUP_REQUIRED'
   ?'입점 신청 접수 기능을 준비 중입니다. 운영팀에 문의하세요.'
   :err.message==='APPLICATION_RATE_LIMITED'
   ?'신청 횟수가 제한됐습니다. 나중에 다시 시도해주세요.'
   :'접수되지 않았습니다: '+err.message;
 }finally{button.disabled=false;}
});
$('#loginForm').addEventListener('submit',async e=>{
 e.preventDefault();$('#loginError').textContent='';
 try{await api('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:$('#username').value,password:$('#password').value})});$('#password').value='';await load();}
 catch(err){$('#loginError').textContent=err.message;}
});
$('#logout').addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST'});}catch{}state.providers=[];state.selected=null;state.leads=[];state.quotes=[];state.bookings=[];state.request=null;render();switchView(false);});
$('#quoteForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!state.request||!state.selected)return;
 const f=new FormData(e.target);const submit=e.target.querySelector('[type=submit]');submit.disabled=true;
 try {
  const input={provider_id:state.selected,request_id:state.request.request_id,amount:Number(f.get('amount')),message:String(f.get('message')||''),estimated_duration_minutes:f.get('estimated_duration_minutes')||null,warranty_days:f.get('warranty_days')||null};
  const result=await api('/api/partner/quotes',{method:'POST',headers:{'content-type':'application/json','x-korual-app':'partner'},body:JSON.stringify(input)});
  $('#quoteDialog').close();await selectProvider();tab('quotes');feedback(result.idempotent?'이미 동일한 견적이 등록되어 있습니다.':'견적이 저장되었습니다.');
 }catch(err){alert(err.message);}finally{submit.disabled=false;}
});
tab('home');load();