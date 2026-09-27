(()=>{
  const section=document.getElementById('korualWorld');
  const stage=document.getElementById('korualWorldStage');
  if(!section||!stage)return;

  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const coarse=window.matchMedia?.('(pointer:coarse)')?.matches;
  const lowPower=(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory&&navigator.deviceMemory<=4);
  if(reduce||lowPower)stage.classList.add('world-lite');

  let raf=0;
  let lastPhase=-1;
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

    if(phase!==lastPhase){
      stage.dataset.phase=String(phase);
      lastPhase=phase;
    }
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