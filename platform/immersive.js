(()=>{
  const home=document.querySelector('.screen-home');
  if(!home||document.getElementById('korualWorld'))return;

  const html=`
    <section class="cinematic-scroll" id="korualWorld" aria-label="KORUAL immersive service universe">
      <div class="cinematic-sticky" id="korualWorldStage" data-phase="0">
        <div class="world-space" aria-hidden="true">
          <span class="starfield stars-a"></span><span class="starfield stars-b"></span><span class="world-glow"></span>
          <span class="portal-frame portal-frame-a"></span><span class="portal-frame portal-frame-b"></span>
          <span class="world-earth"><i class="earth-atmosphere"></i><i class="earth-grid"></i></span>
          <span class="orbit orbit-a"></span><span class="orbit orbit-b"></span><span class="orbit orbit-c"></span>
        </div>
        <div class="world-nav"><span class="world-brand">KORUAL</span><span class="world-mode"><i></i> IMMERSIVE MODE</span></div>
        <div class="world-copy">
          <span class="world-kicker">IN THAT MOMENT</span>
          <h2>KORUAL</h2>
          <p class="world-tagline">WELLNESS · LIFESTYLE · TRAVEL</p>
          <p class="world-description">AI가 여행과 생활서비스를 하나의 흐름으로 연결합니다.</p>
          <button class="world-ai-cta" type="button"><span>✦</span><strong>Ask KORUAL AI</strong><em>→</em></button>
        </div>
        <div class="world-service-layer" aria-label="서비스 바로가기">
          <button class="world-service service-travel" type="button" data-world-service="여행"><span>TRAVEL</span><strong>여행</strong><small>항공 · 숙박 · 이동</small></button>
          <button class="world-service service-wellness" type="button" data-world-service="웰니스"><span>WELLNESS</span><strong>웰니스</strong><small>휴식 · 건강 · 케어</small></button>
          <button class="world-service service-home" type="button" data-world-service="생활 서비스"><span>LIFESTYLE</span><strong>생활</strong><small>청소 · 이사 · 설치</small></button>
          <button class="world-service service-interior" type="button" data-world-service="인테리어"><span>INTERIOR</span><strong>인테리어</strong><small>공간 · 가구 · 시공</small></button>
        </div>
        <div class="world-story" aria-live="polite">
          <div class="story-copy story-0"><small>01 · ARRIVE</small><strong>당신의 필요에서 시작합니다.</strong><span>자연어로 말하면 AI가 목적과 조건을 이해합니다.</span></div>
          <div class="story-copy story-1"><small>02 · EXPLORE</small><strong>서비스가 입체적으로 연결됩니다.</strong><span>여행·생활·웰니스 영역을 한 화면에서 탐색합니다.</span></div>
          <div class="story-copy story-2"><small>03 · COMPARE</small><strong>가격만이 아니라 신뢰까지 비교합니다.</strong><span>조건·검증·응답성 데이터를 함께 보여줍니다.</span></div>
          <div class="story-copy story-3"><small>04 · ACT</small><strong>한 번의 결정으로 예약까지.</strong><span>비교에서 예약·재구매까지 하나의 흐름으로 이어집니다.</span></div>
        </div>
        <div class="world-progress" aria-hidden="true"><span class="progress-line"><i></i></span><b>01</b><b>02</b><b>03</b><b>04</b></div>
        <div class="world-scroll-hint" aria-hidden="true"><span class="mouse-cue"><i></i></span><small>SCROLL TO EXPLORE</small></div>
      </div>
    </section>`;
  home.insertAdjacentHTML('afterbegin',html);

  const section=document.getElementById('korualWorld');
  const stage=document.getElementById('korualWorldStage');
  const ai=stage.querySelector('.world-ai-cta');
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const coarse=window.matchMedia?.('(pointer:coarse)')?.matches;
  const lowPower=(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory&&navigator.deviceMemory<=4);
  if(reduce||lowPower)stage.classList.add('world-lite');

  function openMatch(value){
    document.querySelector('[data-tab="match"]')?.click();
    if(value){
      const input=document.getElementById('matchInput');
      if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}
    }
  }
  ai?.addEventListener('click',()=>openMatch(''));
  stage.querySelectorAll('[data-world-service]').forEach(btn=>btn.addEventListener('click',()=>{
    const value=btn.getAttribute('data-world-service')||'';
    openMatch(value);
    setTimeout(()=>document.getElementById('matchInput')?.focus(),120);
  }));

  let raf=0,lastPhase=-1;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function render(){
    raf=0;
    const rect=section.getBoundingClientRect();
    const viewport=Math.max(1,window.innerHeight-66);
    const travel=Math.max(1,rect.height-viewport);
    const progress=clamp(-rect.top/travel,0,1);
    const eased=progress<.5?2*progress*progress:1-Math.pow(-2*progress+2,2)/2;
    const phase=Math.min(3,Math.floor(progress*4));
    stage.style.setProperty('--phase',eased.toFixed(4));
    stage.style.setProperty('--cam-scale',(1+eased*1.18).toFixed(4));
    stage.style.setProperty('--earth-scale',(.78+eased*1.28).toFixed(4));
    stage.style.setProperty('--earth-y',(12-eased*20).toFixed(2)+'vh');
    stage.style.setProperty('--earth-x',((eased-.5)*-2.5).toFixed(2)+'vw');
    stage.style.setProperty('--ring-rot',(eased*48).toFixed(2)+'deg');
    if(phase!==lastPhase){stage.dataset.phase=String(phase);lastPhase=phase;}
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(render);}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  schedule();

  if(!reduce&&!coarse&&!lowPower){
    stage.addEventListener('pointermove',event=>{
      const rect=stage.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width-.5;
      const y=(event.clientY-rect.top)/rect.height-.5;
      stage.style.setProperty('--tilt-y',(x*3.5).toFixed(2)+'deg');
      stage.style.setProperty('--tilt-x',(-y*2.6).toFixed(2)+'deg');
    });
    stage.addEventListener('pointerleave',()=>{
      stage.style.setProperty('--tilt-y','0deg');
      stage.style.setProperty('--tilt-x','0deg');
    });
  }
})();