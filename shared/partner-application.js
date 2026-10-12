/**
 * Initial Partner acquisition form contract.
 * No registration number, identity scan or customer PII is accepted here.
 * Manual KORUAL KYB approval is separate from this application.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIES = new Set([
  '입주청소','이사','에어컨 청소','인터넷/TV','정수기 렌탈',
  '인테리어','수리·시공','여행 서비스','웰니스','기타'
]);
const clean = (v,max) => typeof v==='string'?v.trim().replace(/\s+/g,' ').slice(0,max+1):'';
export function validatePartnerApplication(input){
  if(!input || typeof input!=='object' || Array.isArray(input))return {error:'INVALID_APPLICATION'};
  const company=clean(input.company_name,80);
  const email=clean(input.contact_email,180).toLowerCase();
  const region=clean(input.region,80);
  const service=clean(input.service_category,40);
  const website=clean(input.website,200);
  if(website) return {error:'APPLICATION_REJECTED'};
  if(company.length<2||company.length>80)return {error:'COMPANY_REQUIRED'};
  if(email.length>180||!EMAIL.test(email))return {error:'EMAIL_INVALID'};
  if(region.length<2||region.length>80)return {error:'REGION_REQUIRED'};
  if(!CATEGORIES.has(service))return {error:'CATEGORY_INVALID'};
  if(input.privacy_consent!==true)return {error:'CONSENT_REQUIRED'};
  if(input.terms_acknowledged!==true)return {error:'TERMS_ACKNOWLEDGMENT_REQUIRED'};
  return {value:{company_name:company,contact_email:email,region,service_category:service,
     privacy_consent_at:new Date().toISOString(), consent_version:'partner-beta-2026-10'}};
}

export function isReviewTransitionAllowed(current,next){
 const transitions={received:['reviewing','rejected'],reviewing:['needs_documents','rejected'],needs_documents:['reviewing','rejected']};
 return (transitions[current]||[]).includes(next);
}
