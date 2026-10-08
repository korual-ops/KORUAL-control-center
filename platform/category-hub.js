import {roots,allServices,searchServices,findService,labelFor,validateTaxonomy} from './category-catalog.js';

const translations={
 ko:{eyebrow:'KORUAL SERVICE DIRECTORY',title:'원하는 서비스를 한눈에',desc:'목적별로 찾고, 준비 상태를 확인한 뒤 조건을 입력하세요.',search:'서비스명·목적 검색 (예: 청소, 전세기, 카페)',all:'전체',beta:'조건 입력 베타',planned:'준비 중',reset:'전체 카테고리',showAll:'전체 서비스 보기',count:'서비스',group:'분야',start:'조건 입력',coming:'준비 중',betaNote:'베타는 조건 입력 및 비교 실험 기능입니다. 실제 업체 예약·결제 가능 여부를 뜻하지 않습니다.',plannedNote:'준비 중 서비스는 예약·결제가 불가능합니다. 실시간 정보는 연동 후 데이터 출처·갱신 시각을 표시합니다.',focus:'요청 내용을 확인하고 지역·날짜를 입력하세요.',empty:'조건에 맞는 서비스가 없습니다.',next:'선택한 분야 살펴보기',examples:'베타로 조건 입력 가능한 서비스'},
 en:{eyebrow:'KORUAL SERVICE DIRECTORY',title:'Explore all services',desc:'Browse by goal and check availability before submitting your needs.',search:'Search services (e.g. cleaning, charter, cafe)',all:'All',beta:'Request preview',planned:'Coming soon',reset:'All categories',showAll:'Browse all services',count:'services',group:'groups',start:'Describe request',coming:'Coming soon',betaNote:'Beta means request input and comparison preview only — not confirmed booking or payment.',plannedNote:'Planned services do not accept bookings or payments. Live data will require a source and update time.',focus:'Review the request and add a region and preferred date.',empty:'No matching services.',next:'Explore this category',examples:'Services with beta request input'},
 ja:{eyebrow:'KORUAL SERVICE DIRECTORY',title:'サービスを探す',desc:'目的別に探し、提供状況を確認してください。',search:'サービスを検索',all:'すべて',beta:'条件入力ベータ',planned:'準備中',reset:'全カテゴリー',showAll:'全サービス',count:'サービス',group:'分野',start:'条件を入力',coming:'準備中',betaNote:'ベータは条件入力・比較テストです。予約や決済は確約されません。',plannedNote:'準備中のサービスは予約・決済ができません。',focus:'地域や希望日を入力してください。',empty:'該当するサービスがありません。',next:'カテゴリーを見る',examples:'ベータ対象サービス'},
 zh:{eyebrow:'KORUAL SERVICE DIRECTORY',title:'浏览全部服务',desc:'按需求查找服务并确认开放状态。',search:'搜索服务',all:'全部',beta:'需求填写测试版',planned:'筹备中',reset:'全部分类',showAll:'查看全部服务',count:'项服务',group:'个类别',start:'填写需求',coming:'筹备中',betaNote:'测试版仅供填写需求与比较，不代表已开放预订或支付。',plannedNote:'筹备中的服务暂不支持预订或支付。',focus:'请确认需求并输入地区与日期。',empty:'没有匹配的服务。',next:'查看分类',examples:'可填写需求的测试服务'},
 vi:{eyebrow:'KORUAL SERVICE DIRECTORY',title:'Khám phá dịch vụ',desc:'Tìm theo nhu cầu và kiểm tra trạng thái trước khi gửi yêu cầu.',search:'Tìm dịch vụ',all:'Tất cả',beta:'Nhập yêu cầu Beta',planned:'Sắp ra mắt',reset:'Tất cả danh mục',showAll:'Xem toàn bộ dịch vụ',count:'dịch vụ',group:'nhóm',start:'Nhập yêu cầu',coming:'Sắp ra mắt',betaNote:'Beta chỉ để nhập yêu cầu và xem thử so sánh, chưa xác nhận đặt chỗ hay thanh toán.',plannedNote:'Dịch vụ đang phát triển chưa thể đặt hay thanh toán.',focus:'Kiểm tra yêu cầu và nhập khu vực, ngày mong muốn.',empty:'Không có kết quả phù hợp.',next:'Khám phá danh mục',examples:'Dịch vụ nhập yêu cầu Beta'}
};
const mounts=[...document.querySelectorAll('[data-korual-category-hub]')];
const state={rootId:'all',phase:'all',query:''};
function language(){const l=window.KORUAL_I18N?.getLanguage?.()||document.documentElement.lang.slice(0,2)||'ko';return translations[l]?l:'ko';}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function tr(){return translations[language()];}
function getResults(){return searchServices(state.query,state.rootId).filter(s=>state.phase==='all'||s.status===state.phase);}
function rootHtml(root,t,lang){
 const count=root.groups.reduce((n,g)=>n+g.services.filter(s=>state.phase==='all'||s.status===state.phase).length,0);
 return '<button type="button" class="kh-root'+(state.rootId===root.id?' is-active':'')+'" data-kh-root="'+esc(root.id)+'" aria-pressed="'+(state.rootId===root.id)+'"><span class="kh-root-icon" aria-hidden="true">'+root.icon+'</span><span class="kh-root-main"><strong>'+esc(labelFor(root,lang))+'</strong><small>'+count+' '+esc(t.count)+'</small></span><span class="kh-arrow" aria-hidden="true">↗</span></button>';
}
function serviceHtml(service,t,lang){
 const planned=service.status==='planned';
 return '<div class="kh-service'+(planned?' kh-service-planned':'')+'"><span class="kh-service-name">'+esc(labelFor(service,lang))+'</span><span class="kh-status'+(planned?' kh-muted':'')+'">'+esc(planned?t.coming:t.beta)+'</span>'+(planned?'':'<button type="button" class="kh-start" data-kh-start="'+esc(service.id)+'">'+esc(t.start)+' <span aria-hidden="true">→</span></button>')+'</div>';
}
function content(t,lang){
 const matching=getResults();let main='';
 if(!state.query&&state.rootId==='all'){
  main='<div class="kh-roots">'+roots.map(r=>rootHtml(r,t,lang)).join('')+'</div>';
  const featured=matching.filter(x=>x.status==='beta').slice(0,7);
  if(featured.length)main+='<div class="kh-featured"><h3>'+esc(t.examples)+'</h3><div class="kh-services">'+featured.map(s=>serviceHtml(s,t,lang)).join('')+'</div></div>';
 }else if(state.query){
  main='<div class="kh-results">'+(matching.length?matching.map(s=>serviceHtml(s,t,lang)).join(''):'<p class="kh-empty">'+esc(t.empty)+'</p>')+'</div>';
 }else{
  const root=roots.find(r=>r.id===state.rootId);
  main='<button type="button" class="kh-back" data-kh-clear="1">← '+esc(t.reset)+'</button><div class="kh-selected"><span>'+root.icon+'</span><h3>'+esc(labelFor(root,lang))+'</h3></div>';
  main+=root.groups.map(g=>{
   const services=g.services.filter(s=>state.phase==='all'||s.status===state.phase);
   if(!services.length)return '';
   return '<section class="kh-group"><h4>'+esc(labelFor(g,lang))+'</h4><div class="kh-services">'+services.map(s=>serviceHtml(s,t,lang)).join('')+'</div></section>';
  }).join('');
  if(!matching.length)main+='<p class="kh-empty">'+esc(t.empty)+'</p>';
 }
 return {matching,main};
}
function render(){
 const lang=language(),t=tr();
 for(const mount of mounts){
  const {matching,main}=content(t,lang);
  mount.innerHTML='<section class="kh" aria-label="'+esc(t.title)+'"><div class="kh-header"><div><small>'+esc(t.eyebrow)+'</small><h2>'+esc(t.title)+'</h2><p>'+esc(t.desc)+'</p></div><div class="kh-count">'+roots.length+' / '+allServices.length+'</div></div>'+
   '<label class="kh-search"><span class="kh-search-glyph" aria-hidden="true">⌕</span><span class="kh-visually-hidden">'+esc(t.search)+'</span><input type="search" data-kh-query value="'+esc(state.query)+'" placeholder="'+esc(t.search)+'" autocomplete="off" /></label>'+
   '<div class="kh-tabs" role="group" aria-label="Status filters">'+[['all',t.all],['beta',t.beta],['planned',t.planned]].map(([k,l])=>'<button type="button" data-kh-phase="'+k+'" aria-pressed="'+(state.phase===k)+'" class="'+(state.phase===k?'is-active':'')+'">'+esc(l)+'</button>').join('')+'</div>'+
   '<div class="kh-result-count" role="status" aria-live="polite">'+matching.length+' '+esc(t.count)+'</div>'+main+
   '<p class="kh-caveat">'+esc(t.betaNote)+'</p><p class="kh-caveat">'+esc(t.plannedNote)+'</p></section>';
 }
 document.documentElement.classList.add('kh-ready');
}
function start(id){
 const service=findService(id);
 if(!service||service.status!=='beta')return;
 const request=document.getElementById('homeRequestInput');
 const home=document.querySelector('[data-open-screen="home"]');
 if(!request||!home)return;
 home.click();
 request.value=service.label.ko+' 관련 서비스 조건(지역·일정·예산·작업 범위)을 비교해줘';
 request.dispatchEvent(new Event('input',{bubbles:true}));
 request.focus({preventScroll:false});
}
for(const mount of mounts){
 mount.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button||!mount.contains(button))return;
  if(button.hasAttribute('data-kh-root')){state.rootId=button.dataset.khRoot;state.query='';render();}
  else if(button.hasAttribute('data-kh-phase')){state.phase=button.dataset.khPhase;render();}
  else if(button.hasAttribute('data-kh-clear')){state.rootId='all';state.query='';render();}
  else if(button.hasAttribute('data-kh-start'))start(button.dataset.khStart);
 });
 mount.addEventListener('input',event=>{
  if(!event.target.matches('[data-kh-query]'))return;
  const input=event.target;
  const selection=typeof input.selectionStart==='number'?input.selectionStart:null;
  state.query=input.value;render();
  const replacement=mount.querySelector('[data-kh-query]');
  replacement?.focus({preventScroll:true});
  if(selection!==null)try{replacement?.setSelectionRange(selection,selection)}catch{}
 });
}
const report=validateTaxonomy();
if(!report.ok)console.error('KORUAL category taxonomy invalid',report.errors);
else if(mounts.length)render();
window.addEventListener('korual:language-changed',render);
