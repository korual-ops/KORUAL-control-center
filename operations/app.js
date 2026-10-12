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
async function requests(){
  const target=$('#requestList');target.replaceChildren();
  try{
    const data=await api('/api/operations/requests');
    if(!data.requests?.length){target.append(pair('배정 대기','현재 열린 고객 요청이 없습니다.'));return;}
    for(const req of data.requests){
      const line=document.createElement('div');line.className='row';
      const left=document.createElement('span');left.textContent=(req.services||[]).join(' · ')+' · '+req.region+' · '+(req.request_code||'요청');
      const button=document.createElement('button');button.className='btn';button.type='button';button.textContent='업체 배정';
      button.addEventListener('click',async()=>{
        if(!confirm('검증된 실제 사업자에게 해당 요청을 배정하시겠습니까?'))return;
        button.disabled=true;
        try{
          const result=await api('/api/operations/assign',{method:'POST',headers:{'content-type':'application/json','x-korual-app':'operations'},body:JSON.stringify({request_id:req.id})});
          msg('배정 완료: '+result.assigned+'개 검증 사업자 대상으로 수주 기회가 생성됐습니다.');await refresh();
        }catch(e){
          const explanation=e.message==='NO_VERIFIED_SUPPLY'?'실제 검증 사업자가 등록되지 않았습니다. 데모 업체는 배정하지 않습니다.':e.message==='NO_ELIGIBLE_PARTNERS'?'이 요청 조건에 맞는 승인된 사업자 담당자가 없습니다.':e.message;
          msg('배정 보류: '+explanation,true);
        }finally{button.disabled=false;}
      });
      line.append(left,button);target.append(line);
    }
  }catch(e){target.append(pair('확인 불가',e.message));}
}
async function applications(){
 const target=$('#applicationList');
 if(!target)return;
 target.replaceChildren();
 const statuses={received:'접수',reviewing:'검토 중',needs_documents:'서류 추가 확인',rejected:'심사 종료'};
 try{
  const data=await api('/api/operations/applications');
  if(!data.applications?.length){
    target.append(pair('현재 접수','신규 입점 신청이 없습니다.'));
    return;
  }
  const options={received:[['검토 시작','reviewing']],reviewing:[['추가 서류 필요','needs_documents'],['심사 종료','rejected']],needs_documents:[['검토 재개','reviewing'],['심사 종료','rejected']]};
  for(const application of data.applications){
    const card=document.createElement('div');card.className='row';
    const details=document.createElement('div');
    const title=document.createElement('strong');title.textContent=application.company_name;
    const metadata=document.createElement('p');metadata.className='sub';metadata.style.fontSize='12px';
    metadata.textContent=[application.service_category,application.region,application.contact_email,statuses[application.status]||application.status].join(' · ');
    details.append(title,metadata);card.append(details);
    const buttons=document.createElement('div');buttons.className='actions';
    for(const [label,status] of options[application.status]||[]){
      const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=label;
      button.addEventListener('click',async()=>{
        if(!confirm('신청 상태를 "'+label+'"로 변경하시겠습니까? 업체 등록이나 인증은 별도로 진행해야 합니다.'))return;
        button.disabled=true;
        try{
          await api('/api/operations/applications/'+encodeURIComponent(application.id)+'/review',{
            method:'POST',headers:{'content-type':'application/json','x-korual-app':'operations'},
            body:JSON.stringify({status})
          });
          msg('신청 상태가 변경됐습니다. 외부 알림이나 자동 업체 승인은 발생하지 않습니다.');
          await applications();
        }catch(error){msg('신청 심사 업데이트 실패: '+error.message,true);}
        finally{button.disabled=false;}
      });
      buttons.append(button);
    }
    card.append(buttons);target.append(card);
  }
 }catch(e){target.append(pair('심사 데이터 오류',e.message));}
}
async function refresh(){
 msg('');
 try{
  const result=await api('/api/operations/overview');
  Object.entries(result.counts||{}).forEach(([k,v])=>{const el=document.querySelector('[data-count="'+k+'"]');if(el)el.textContent=v==null?'미설정':Number(v).toLocaleString('ko-KR');});
  $('#fetchedAt').textContent='갱신 '+new Date(result.at).toLocaleString('ko-KR');
  insights(result.counts||{});
  await Promise.all([requests(), applications()]);
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