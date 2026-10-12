const $=q=>document.querySelector(q);
const msg=(s,warn=false)=>{const x=$('#message');x.replaceChildren();if(!s)return;const p=document.createElement('p');p.className='message'+(warn?' warn':'');p.textContent=s;x.append(p);};
async function api(url,options={}){const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});const data=await response.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));if(!response.ok||!data.ok){const e=new Error(data.error||'API_ERROR');e.status=response.status;throw e;}return data;}
function visible(yes){$('#app').hidden=!yes;$('#loginWrap').hidden=yes;$('#logout').hidden=!yes;$('#whoami').textContent=yes?'관리자 인증됨':'로그인 필요';}
function pair(label,value){const r=document.createElement('div');r.className='row';const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=value;r.append(a,b);return r;}
function insights(c){
 const target=$('#insights');target.replaceChildren();
 if(!c.requests){target.append(pair('현재 병목','고객 요청 생성 0건'),pair('최우선 작업','추천 → 견적 요청 전환 측정'),pair('다음 개발','사업자 응답·예약 실측 연결'));return;}
 const leadCoverage=(c.assigned_leads/c.requests).toFixed(2);
 target.append(pair('요청당 배정','평균 '+leadCoverage+'건'),pair('접수된 요청',c.requests+'건'),pair('견적 제출',c.quotes+'건'),pair('확인할 지표','요청별 견적 응답률 / 완료율'));
}
async function refresh(){
 msg('');
 try{
  const result=await api('/api/operations/overview');
  Object.entries(result.counts||{}).forEach(([k,v])=>{const el=document.querySelector('[data-count="'+k+'"]');if(el)el.textContent=Number(v).toLocaleString('ko-KR');});
  $('#fetchedAt').textContent='갱신 '+new Date(result.at).toLocaleString('ko-KR');
  insights(result.counts||{});
  visible(true);
 }catch(e){if(e.status===401||e.status===403){visible(false);$('#loginError').textContent=e.status===403?'관리자 권한이 없습니다.':'로그인이 필요합니다.';}else msg('실제 운영 데이터를 불러오지 못했습니다: '+e.message,true);}
}
$('#reload').addEventListener('click',refresh);
$('#loginForm').addEventListener('submit',async e=>{
 e.preventDefault();$('#loginError').textContent='';
 try{await api('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:$('#username').value,password:$('#password').value})});$('#password').value='';await refresh();}
 catch(e){$('#loginError').textContent=e.message;}
});
$('#logout').addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST'});}catch{}visible(false);document.querySelectorAll('[data-count]').forEach(x=>x.textContent='—');});
refresh();