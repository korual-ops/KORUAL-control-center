/**
 * KORUAL BFF APIs for independently installed Partner and Admin apps.
 * Identity is ALWAYS derived from the verified httpOnly login cookie;
 * provider ID in the request is never treated as proof of ownership.
 */
import express from 'express';
import { authorizePartner } from './partner-access.js';
import { eligiblePartners } from './lead-routing.js';
import { validatePartnerApplication, isReviewTransitionAllowed } from './partner-application.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPEN_REQUESTS = ['NEW', 'MATCHING', 'QUOTED'];

export function validateQuoteInput(value) {
  if (!UUID.test(String(value?.provider_id || '')) || !UUID.test(String(value?.request_id || ''))) {
    return { error: 'INVALID_ID' };
  }
  const amount = Number(value?.amount);
  if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 100000000) {
    return { error: 'INVALID_AMOUNT' };
  }
  const duration = value?.estimated_duration_minutes == null || value.estimated_duration_minutes === ''
    ? null : Number(value.estimated_duration_minutes);
  const warranty = value?.warranty_days == null || value.warranty_days === ''
    ? null : Number(value.warranty_days);
  if (duration != null && (!Number.isSafeInteger(duration) || duration < 1 || duration > 10080)) {
    return { error: 'INVALID_DURATION' };
  }
  if (warranty != null && (!Number.isSafeInteger(warranty) || warranty < 0 || warranty > 3650)) {
    return { error: 'INVALID_WARRANTY' };
  }
  if (typeof value?.message !== 'string' || value.message.length > 600) return { error: 'INVALID_MESSAGE' };
  if (!String(value.message || '').trim()) return { error: 'MESSAGE_REQUIRED' };
  return { value: {
    provider_id: value.provider_id, request_id: value.request_id, amount,
    estimated_duration_minutes: duration, warranty_days: warranty,
    message: value.message.trim()
  }};
}

export function sameQuote(existing,input) {
  return Boolean(existing && input
    && existing.status === 'submitted'
    && Number(existing.amount) === input.amount
    && (existing.message||'') === input.message
    && (existing.estimated_duration_minutes??null) === input.estimated_duration_minutes
    && (existing.warranty_days??null) === input.warranty_days);
}

function handleError(res, error, label) {
  console.error('KORUAL_PORTAL', label, error?.message || 'unknown');
  if (error?.code === '42P01') return res.status(503).json({ ok: false, error: 'PARTNER_SETUP_REQUIRED' });
  return res.status(500).json({ ok: false, error: 'PORTAL_UNAVAILABLE' });
}

function safeOriginAndJson(req, res, next) {
  if (req.get('x-korual-app') !== 'partner') return res.status(403).json({ok:false,error:'APP_HEADER_REQUIRED'});
  if (!req.is('application/json')) return res.status(415).json({ok:false,error:'JSON_REQUIRED'});
  const origin = req.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host') || !['http:', 'https:'].includes(new URL(origin).protocol)) {
        return res.status(403).json({ok:false,error:'ORIGIN_MISMATCH'});
      }
    } catch { return res.status(403).json({ok:false,error:'ORIGIN_MISMATCH'}); }
  }
  return next();
}

export function registerAppApis(app, { db, requireAuth, requireAdmin, requireRuntimeConfig }) {
  const partner = express.Router();
  // Public application does NOT create verified companies or grant provider access.
  // Pilot-only per-process throttling: replace with shared persistent rate limiting
  // and bot protection before public launch.
  const intakeRate = new Map();
  partner.post('/applications', requireRuntimeConfig, async(req,res)=>{
    if(!req.is('application/json') || req.get('x-korual-app')!=='partner'){
      return res.status(415).json({ok:false,error:'JSON_APPLICATION_REQUIRED'});
    }
    const origin=req.get('origin');
    if(!origin)return res.status(403).json({ok:false,error:'ORIGIN_REQUIRED'});
    try {
      const url=new URL(origin);
      if(url.host!==req.get('host') || !['http:','https:'].includes(url.protocol)){
        return res.status(403).json({ok:false,error:'ORIGIN_MISMATCH'});
      }
    }catch{return res.status(403).json({ok:false,error:'ORIGIN_MISMATCH'});}
    const ip=req.ip||req.socket.remoteAddress||'unknown';
    const now=Date.now();
    if(intakeRate.size>10000){
      for(const [k,v] of intakeRate){if(now-v.windowStart>3600000)intakeRate.delete(k);}
    }
    const rate=intakeRate.get(ip);
    if(rate&&now-rate.windowStart<3600000&&rate.count>=3){
      return res.status(429).json({ok:false,error:'APPLICATION_RATE_LIMITED'});
    }
    intakeRate.set(ip,rate&&now-rate.windowStart<3600000
      ?{count:rate.count+1,windowStart:rate.windowStart}
      :{count:1,windowStart:now});
    const parsed=validatePartnerApplication(req.body);
    if(parsed.error)return res.status(400).json({ok:false,error:parsed.error});
    try{
      const {error}=await db.from('partner_applications').insert(parsed.value);
      if(error)return handleError(res,error,'partner_apply');
      res.set('Cache-Control','no-store');
      return res.status(202).json({ok:true,status:'received'});
    }catch(error){return handleError(res,error,'partner_apply');}
  });

  // Recheck the account status on every request so deactivation is immediate
  // even when an otherwise valid short-lived JWT is still cached.
  partner.use(requireRuntimeConfig, requireAuth, async (req,res,next)=>{
    try{
      const {data,error}=await db.from('profiles')
        .select('id,active').eq('id',req.user.sub).maybeSingle();
      if(error)return handleError(res,error,'active_profile');
      if(!data?.active)return res.status(403).json({ok:false,error:'ACCOUNT_DISABLED'});
      return next();
    }catch(error){return handleError(res,error,'active_profile');}
  });

  async function membership(req, res, action) {
    const providerId = req.method === 'POST' ? req.body?.provider_id : req.query?.provider_id;
    if (!UUID.test(String(providerId || ''))) {
      res.status(400).json({ok:false,error:'INVALID_PROVIDER'});
      return null;
    }
    const {data, error} = await db.from('partner_memberships')
      .select('provider_id,user_id,role,active')
      .eq('provider_id', providerId).eq('user_id', req.user.sub)
      .eq('active', true).maybeSingle();
    if (error) {
      handleError(res,error,'membership');
      return null;
    }
    const principal = {authenticated:true,id:req.user.sub,memberships:data ? [
      {providerId:data.provider_id,userId:data.user_id,role:data.role,active:data.active}
    ] : []};
    if (!authorizePartner({principal,providerId,action})) {
      res.status(403).json({ok:false,error:'PARTNER_ACCESS_DENIED'});
      return null;
    }
    const {data: provider,error: providerError} = await db.from('providers')
      .select('id,name,active,verified,is_demo').eq('id',providerId).maybeSingle();
    if (providerError) {handleError(res,providerError,'provider');return null;}
    if (!provider?.active || !provider?.verified || provider?.is_demo) {
      res.status(403).json({ok:false,error:'PROVIDER_NOT_VERIFIED'});
      return null;
    }
    return {provider, membership:data};
  }

  partner.get('/me', async (req,res) => {
    try {
      const {data: memberships,error} = await db.from('partner_memberships')
        .select('provider_id,role,active').eq('user_id', req.user.sub).eq('active', true).limit(40);
      if (error) return handleError(res,error,'memberships');
      const results = await Promise.all((memberships || []).map(async m => {
        const {data, error: e} = await db.from('providers')
          .select('id,name,active,verified,is_demo').eq('id',m.provider_id).maybeSingle();
        if (e) throw e;
        if (!data?.active || !data.verified || data.is_demo) return null;
        return {id:data.id,name:data.name,role:m.role,verified:true};
      }));
      res.set('Cache-Control','no-store');
      return res.json({ok:true,providers:results.filter(Boolean),user_id:req.user.sub});
    } catch(error) {return handleError(res,error,'me');}
  });

  partner.get('/leads', async(req,res)=>{
    try {
      const scoped=await membership(req,res,'lead.read');if(!scoped)return;
      const {data,error}=await db.from('service_request_matches')
        .select('id,request_id,provider_id,match_score,status,created_at,service_requests(id,request_code,services,region,desired_date,status,created_at)')
        .eq('provider_id',scoped.provider.id)
        .order('created_at',{ascending:false}).limit(50);
      if(error)throw error;
      // Only non-sensitive request fields above. Never return customer name/phone.
      return res.json({ok:true,leads:data||[]});
    }catch(error){return handleError(res,error,'leads');}
  });

  partner.get('/quotes', async(req,res)=>{
    try {
      const scoped=await membership(req,res,'quote.read');if(!scoped)return;
      const {data,error}=await db.from('provider_quotes')
        .select('id,request_id,provider_id,amount,estimated_duration_minutes,warranty_days,message,status,quote_expires_at,created_at')
        .eq('provider_id',scoped.provider.id)
        .order('created_at',{ascending:false}).limit(50);
      if(error)throw error;
      return res.json({ok:true,quotes:data||[]});
    }catch(error){return handleError(res,error,'quotes');}
  });

  partner.get('/bookings', async(req,res)=>{
    try {
      const scoped=await membership(req,res,'booking.read');if(!scoped)return;
      const {data,error}=await db.from('bookings')
        .select('id,request_id,status,scheduled_at,confirmation_status,confirmation_deadline,recovery_status,created_at')
        .eq('provider_id',scoped.provider.id)
        .order('created_at',{ascending:false}).limit(50);
      if(error)throw error;
      return res.json({ok:true,bookings:data||[]});
    }catch(error){return handleError(res,error,'bookings');}
  });

  partner.post('/quotes',safeOriginAndJson,async(req,res)=>{
    const valid=validateQuoteInput(req.body);
    if(valid.error)return res.status(400).json({ok:false,error:valid.error});
    try {
      const input=valid.value;
      const scoped=await membership(req,res,'quote.create');if(!scoped)return;
      const {data:match,error:matchError}=await db.from('service_request_matches')
        .select('id,status').eq('provider_id',scoped.provider.id)
        .eq('request_id',input.request_id).maybeSingle();
      if(matchError)throw matchError;
      if(!match || !['pending','contacted','quoted'].includes(match.status)) {
        return res.status(403).json({ok:false,error:'LEAD_NOT_ASSIGNED'});
      }
      const {data:request,error:requestError}=await db.from('service_requests')
        .select('id,status').eq('id',input.request_id).maybeSingle();
      if(requestError)throw requestError;
      if(!request || !OPEN_REQUESTS.includes(request.status)) {
        return res.status(409).json({ok:false,error:'REQUEST_CLOSED'});
      }
      const existingQuery=()=>db.from('provider_quotes').select('id,amount,status,message,estimated_duration_minutes,warranty_days')
        .eq('provider_id',scoped.provider.id).eq('request_id',input.request_id).maybeSingle();
      const existing=await existingQuery();
      if(existing.error)throw existing.error;
      if(existing.data) {
        const unchanged=sameQuote(existing.data,input);
        return res.status(unchanged?200:409).json({
          ok:unchanged,idempotent:unchanged,error:unchanged?undefined:'QUOTE_ALREADY_EXISTS',
          quote:unchanged?existing.data:undefined
        });
      }
      const {data:quote,error:insertError}=await db.from('provider_quotes').insert({
        provider_id:scoped.provider.id, request_id:input.request_id,
        amount:input.amount,estimated_duration_minutes:input.estimated_duration_minutes,
        warranty_days:input.warranty_days,message:input.message,status:'submitted',
        quote_snapshot:{source:'korual_partner_portal',version:'1.0'}
      }).select('id,request_id,amount,status,created_at').single();
      if(insertError) {
        // Race between repeated requests: unique(provider_id,request_id) is the arbiter.
        if(insertError.code==='23505'){
          const check=await existingQuery();
          if(check.error)throw check.error;
          if(sameQuote(check.data,input)){
            return res.json({ok:true,idempotent:true,quote:check.data});
          }
          return res.status(409).json({ok:false,error:'QUOTE_ALREADY_EXISTS'});
        }
        throw insertError;
      }
      const updated=await db.from('service_request_matches').update({
        status:'quoted',responded_at:new Date().toISOString()
      }).eq('id',match.id).eq('provider_id',scoped.provider.id);
      if(updated.error)console.error('KORUAL_PORTAL match_update_failed',updated.error.message);
      return res.status(201).json({ok:true,idempotent:false,quote});
    }catch(error){return handleError(res,error,'create_quote');}
  });

  app.use('/api/partner',partner);

  const operations=express.Router();
  operations.use(requireRuntimeConfig,requireAuth,requireAdmin);
  operations.get('/overview',async(_req,res)=>{
    const definitions=[
      ['service_requests','requests'],
      ['service_request_matches','assigned_leads'],
      ['provider_quotes','quotes'],
      ['bookings','bookings'],
      ['providers','providers'],
      ['recommendation_runs','recommendation_runs']
    ];
    try {
      const result=await Promise.all(definitions.map(async([table,key])=>{
        const {count,error}=await db.from(table).select('id',{count:'exact',head:true});
        if(error)throw error;
        return [key,count??0];
      }));
      const counts=Object.fromEntries(result);
      const [verifiedReal,pendingIntake]=await Promise.all([
        db.from('providers').select('id',{count:'exact',head:true})
          .eq('active',true).eq('verified',true).eq('is_demo',false),
        db.from('partner_applications').select('id',{count:'exact',head:true})
          .in('status',['received','reviewing','needs_documents'])
      ]);
      // A missing intake migration must not break existing read-only KPIs.
      counts.verified_real_providers=verifiedReal.error?null:verifiedReal.count??0;
      counts.pending_applications=pendingIntake.error?null:pendingIntake.count??0;
      res.set('Cache-Control','no-store');
      return res.json({ok:true,counts,at:new Date().toISOString()});
    }catch(error){return handleError(res,error,'operations');}
  });

  operations.get('/applications', async(_req,res)=>{
    try{
      const {data,error}=await db.from('partner_applications')
        .select('id,company_name,contact_email,region,service_category,status,created_at,purge_after')
        .order('created_at',{ascending:false}).limit(50);
      if(error)return handleError(res,error,'admin_intake_list');
      res.set('Cache-Control','no-store');
      return res.json({ok:true,applications:data||[]});
    }catch(error){return handleError(res,error,'admin_intake_list');}
  });

  operations.post('/applications/:id/review', async(req,res)=>{
    const id=String(req.params.id||'');
    if(!UUID.test(id))return res.status(400).json({ok:false,error:'INVALID_ID'});
    if(req.get('x-korual-app')!=='operations'||!req.is('application/json')){
      return res.status(403).json({ok:false,error:'OPERATOR_ACTION_REQUIRED'});
    }
    const origin=req.get('origin');
    if(!origin)return res.status(403).json({ok:false,error:'ORIGIN_REQUIRED'});
    try{if(new URL(origin).host!==req.get('host'))return res.status(403).json({ok:false,error:'ORIGIN_MISMATCH'});}
    catch{return res.status(403).json({ok:false,error:'ORIGIN_MISMATCH'});}
    const next=String(req.body?.status||'');
    try{
      const {data:current,error:readError}=await db.from('partner_applications')
        .select('id,status').eq('id',id).maybeSingle();
      if(readError)throw readError;
      if(!current)return res.status(404).json({ok:false,error:'NOT_FOUND'});
      if(!isReviewTransitionAllowed(current.status,next)){
        return res.status(409).json({ok:false,error:'INVALID_REVIEW_TRANSITION'});
      }
      // Optimistic transition guard. A concurrent reviewer cannot silently
      // override the status set by a previous reviewer.
      const {data:updated,error:updateError}=await db.from('partner_applications')
        .update({status:next,reviewer_id:req.user.sub,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()})
        .eq('id',id).eq('status',current.status).select('id,status').maybeSingle();
      if(updateError)throw updateError;
      if(!updated)return res.status(409).json({ok:false,error:'REVIEW_CONFLICT'});
      const {error:auditError}=await db.from('admin_actions').insert({
        actor_user_id:req.user.sub,action:'REVIEW_PARTNER_APPLICATION',
        meta:{application_id:id,from:current.status,to:next}
      });
      if(auditError)console.error('KORUAL_PORTAL application_audit_failed',auditError.message);
      return res.json({ok:true,application:updated,verification_granted:false});
    }catch(error){return handleError(res,error,'admin_intake_review');}
  });

  operations.get('/requests',async(_req,res)=>{
    try {
      const {data,error}=await db.from('service_requests')
        .select('id,request_code,services,region,desired_date,status,created_at')
        .in('status',OPEN_REQUESTS)
        .order('created_at',{ascending:false}).limit(30);
      if(error)throw error;
      res.set('Cache-Control','no-store');
      return res.json({ok:true,requests:data||[]});
    }catch(error){return handleError(res,error,'admin_requests');}
  });

  operations.post('/assign',async(req,res)=>{
    // This is an explicit, authenticated operator action. No money movement.
    if(req.get('x-korual-app')!=='operations'||!req.is('application/json')){
      return res.status(403).json({ok:false,error:'OPERATOR_ACTION_HEADER_REQUIRED'});
    }
    const origin=req.get('origin');
    if(origin){
      try{if(new URL(origin).host!==req.get('host'))return res.status(403).json({ok:false,error:'ORIGIN_MISMATCH'});}
      catch{return res.status(403).json({ok:false,error:'ORIGIN_MISMATCH'});}
    }
    const requestId=String(req.body?.request_id||'');
    if(!UUID.test(requestId))return res.status(400).json({ok:false,error:'INVALID_ID'});
    try {
      const {data:request,error:requestError}=await db.from('service_requests')
        .select('id,services,region,status').eq('id',requestId).maybeSingle();
      if(requestError)throw requestError;
      if(!request||!OPEN_REQUESTS.includes(request.status))return res.status(409).json({ok:false,error:'REQUEST_CLOSED'});
      const {data:providers,error:providerError}=await db.from('providers')
        .select('id,active,verified,is_demo,service_categories,regions,korual_score')
        .eq('active',true).eq('verified',true).eq('is_demo',false).limit(150);
      if(providerError)throw providerError;
      if(!providers?.length)return res.status(409).json({ok:false,error:'NO_VERIFIED_SUPPLY'});
      const {data:memberships,error:membershipError}=await db.from('partner_memberships')
        .select('provider_id').eq('active',true)
        .in('role',['OWNER','OPERATOR'])
        .in('provider_id',providers.map(p=>p.id)).limit(500);
      if(membershipError)return handleError(res,membershipError,'assign_memberships');
      const selected=eligiblePartners({request,providers,memberProviderIds:new Set((memberships||[]).map(m=>m.provider_id))});
      if(!selected.length)return res.status(409).json({ok:false,error:'NO_ELIGIBLE_PARTNERS'});
      const rows=selected.map(p=>({request_id:requestId,provider_id:p.provider_id,match_score:p.match_score,status:'pending'}));
      const {error:insertError}=await db.from('service_request_matches')
        .upsert(rows,{onConflict:'request_id,provider_id',ignoreDuplicates:true});
      if(insertError)throw insertError;
      const {error:auditError}=await db.from('admin_actions').insert({
        actor_user_id:req.user.sub,action:'ASSIGN_SERVICE_LEADS',
        meta:{request_id:requestId,provider_ids:selected.map(p=>p.provider_id),source:'korual_operations'}
      });
      if(auditError)console.error('KORUAL_PORTAL assignment_audit_failed',auditError.message);
      return res.json({ok:true,assigned:selected.length,provider_ids:selected.map(p=>p.provider_id)});
    }catch(error){return handleError(res,error,'assign_lead');}
  });

  app.use('/api/operations',operations);
}
