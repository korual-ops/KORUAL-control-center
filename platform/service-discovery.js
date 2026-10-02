(function(root){
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
 const matches=(text,query)=>normalize(query).split(' ').filter(Boolean).every(term=>normalize(text).includes(term));
 const api={normalize,matches};root.KorualDiscovery=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
