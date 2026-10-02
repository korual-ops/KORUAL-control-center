(()=>{
  'use strict';
  // Request fields are not contact fields. Reject common identifiers before transmission.
  function containsPrivateData(value){
    const text=String(value||'');
    return /(?:\+82[\s.-]?)?0?1[016789][\s.-]?\d{3,4}[\s.-]?\d{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{6}[\s-]?[1-8]\d{6}\b|(?:비밀번호|공동현관|도어락|계좌번호|카드번호|주민번호|전화번호|연락처)\s*[:：=]?\s*\S+|\d+\s*동\s*\d+\s*호|(?:로|길)\s*\d+(?:[-\s]\d+)?/i.test(text);
  }
  function safeRequest(request){
    if(!request)return null;
    const service=containsPrivateData(request.service)?'일반 서비스':String(request.service||'').slice(0,100);
    return {
      service,raw:service,
      bundle:Array.isArray(request.bundle)?request.bundle.filter(x=>!containsPrivateData(x)).slice(0,6):[],
      region:containsPrivateData(request.region)?'':String(request.region||'').slice(0,80),
      desiredDate:request.desiredDate||null,
      priority:request.priority,priorityMode:request.priorityMode,
      budgetCap:request.budgetCap||null
    };
  }
  function sanitizeState(state){
    function strip(value){
      if(Array.isArray(value))return value.map(strip);
      if(value&&typeof value==='object'){
        const clean={};
        for(const [key,item] of Object.entries(value)){
          if(['customer','customer_name','phone','email','address','session_id','raw','history','region'].includes(key))continue;
          clean[key]=strip(item);
        }
        return clean;
      }
      return value;
    }
    const out={...strip(state),history:[],currentRequest:safeRequest(state.currentRequest)};
    for(const key of ['booking','bundleBooking']){
      if(!out[key])continue;
      out[key]={...out[key]};
      for(const field of ['customer','customer_name','name','phone','email','address','region','session_id'])delete out[key][field];
    }
    return out;
  }
  globalThis.KorualPrivacy=Object.freeze({containsPrivateData,sanitizeState});
})();
