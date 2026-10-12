import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePartnerApplication,isReviewTransitionAllowed} from '../shared/partner-application.js';
const valid={company_name:'영종 청소 연구소',contact_email:'  Business@Example.COM  ',region:'인천 영종도',service_category:'입주청소',privacy_consent:true,terms_acknowledged:true,website:''};
test('intake validation normalizes email and rejects missing consent',()=>{
 const good=validatePartnerApplication(valid);
 assert.equal(good.value?.contact_email,'business@example.com');
 assert.equal(validatePartnerApplication({...valid,privacy_consent:false}).error,'CONSENT_REQUIRED');
 assert.equal(validatePartnerApplication({...valid,terms_acknowledged:false}).error,'TERMS_ACKNOWLEDGMENT_REQUIRED');
 assert.equal(validatePartnerApplication({...valid,service_category:'unsupported'}).error,'CATEGORY_INVALID');
 assert.equal(validatePartnerApplication({...valid,website:'spam.test'}).error,'APPLICATION_REJECTED');
 assert.equal(validatePartnerApplication({...valid,contact_email:'wrong'}).error,'EMAIL_INVALID');
});
test('no auto verification or approval transitions in intake flow',()=>{
 assert.equal(isReviewTransitionAllowed('received','reviewing'),true);
 assert.equal(isReviewTransitionAllowed('received','verified'),false);
 assert.equal(isReviewTransitionAllowed('reviewing','approved'),false);
 assert.equal(isReviewTransitionAllowed('rejected','reviewing'),false);
 assert.equal(isReviewTransitionAllowed('needs_documents','reviewing'),true);
});
