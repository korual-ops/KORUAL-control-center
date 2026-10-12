/**
 * Deliberately conservative initial provider assignment.
 * This is an operator-triggered pilot router, not a production geocoding engine.
 * Never rank demo/disabled/unverified providers or providers with no staff.
 */
function clean(s) { return String(s||'').trim().replace(/\s+/g,' '); }
export function eligiblePartners({request,providers,memberProviderIds,max=3}) {
  const services=Array.isArray(request?.services)?request.services.map(clean).filter(Boolean):[];
  const region=clean(request?.region);
  if(!region||!services.length)return [];
  return (Array.isArray(providers)?providers:[])
    .filter(p=>p && p.active === true && p.verified === true && p.is_demo !== true)
    .filter(p=>memberProviderIds instanceof Set && memberProviderIds.has(p.id))
    .map(p=>{
      const cats=Array.isArray(p.service_categories)?p.service_categories.map(clean):[];
      const regions=Array.isArray(p.regions)?p.regions.map(clean):[];
      const categoryMatch=services.some(service=>cats.includes(service));
      const regionMatch=regions.some(r=>r==='전국' || region===r || region.startsWith(r+' ') || region.startsWith(r+'시') || region.startsWith(r+'광역시'));
      if(!categoryMatch||!regionMatch)return null;
      const quality=Math.max(0,Math.min(100,Number(p.korual_score)||0));
      return {provider_id:p.id, match_score:Math.round(60+quality*0.4)};
    }).filter(Boolean)
    .sort((a,b)=>b.match_score-a.match_score || a.provider_id.localeCompare(b.provider_id))
    .slice(0,Math.max(0,Math.min(3,Number(max)||3)));
}
