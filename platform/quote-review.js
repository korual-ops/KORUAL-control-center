import { normalizeReview, summarizeQuote } from './quote-review-model.js';
const KEY = 'korual-quote-review-v1';
const root = document.querySelector('#quoteReview');
const money = value => value.toLocaleString('ko-KR') + '원';
let state = normalizeReview(null);
let initialMessage = '같은 서비스·지역·일정의 견적을 입력하세요. 입력 내용은 업체로 전송되지 않습니다.';
try {
  const saved = sessionStorage.getItem(KEY);
  if (saved) { state = normalizeReview(JSON.parse(saved)); initialMessage = '이 탭에 저장한 검토표를 복원했습니다. 새 요청이면 비우고 다시 입력하세요.'; }
} catch { initialMessage = '저장된 검토표를 읽지 못했습니다. 다시 입력하고 저장 상태를 확인하세요.'; }
root.innerHTML = `<div class="review-heading"><div><span class="eyebrow">QUOTE CHECK</span><h2>추가비용까지, 한눈에.</h2></div><span class="review-label">직접 입력 검토표</span></div>
<p>업체가 안내한 금액을 같은 기준으로 비교하세요. 빈칸은 미확인입니다. 포함되거나 발생하지 않는 비용만 0원을 입력하세요.</p>
<label class="review-budget">총 예산 (원)<input id="reviewBudget" type="number" min="0" max="100000000" step="1" inputmode="numeric" placeholder="미지정"></label>
<div class="review-grid">${state.rows.map(row => `<fieldset data-review-row="${row.id}"><legend>견적 ${row.id}</legend>
${[['base','기본요금'],['extras','추가비용 합계'],['tax','별도 세금·수수료']].map(([key,label])=>`<label>${label} (원)<input data-cost="${key}" type="number" min="0" max="100000000" step="1" inputmode="numeric" placeholder="미확인" aria-label="견적 ${row.id} ${label}"></label>`).join('')}
<label class="review-check"><input type="checkbox" data-check="scope">동일 작업 범위 확인</label>
<label class="review-check"><input type="checkbox" data-check="cancellation">취소·환불 조건 확인</label>
<div class="review-result" aria-live="polite"></div><button type="button" data-clear="${row.id}">견적 ${row.id} 비우기</button></fieldset>`).join('')}</div>
<p class="review-disclosure">직접 입력한 검토 금액이며 확정 견적·예약 금액이 아닙니다. 업체명·연락처는 저장하지 않습니다. 저장 범위는 현재 탭이며, 탭을 닫으면 사라질 수 있습니다.</p>
<div class="review-actions"><button type="button" id="saveReview">검토표 저장</button><button type="button" id="clearReview">전체 삭제</button></div>
<p id="reviewStatus" role="status" aria-live="polite"></p>`;
const status = root.querySelector('#reviewStatus');
const budget = root.querySelector('#reviewBudget');
function fill() {
  budget.value = state.budget;
  state.rows.forEach(row => {
    const card = root.querySelector(`[data-review-row="${row.id}"]`);
    card.querySelectorAll('[data-cost]').forEach(input => { input.value = row[input.dataset.cost]; });
    card.querySelectorAll('[data-check]').forEach(input => { input.checked = row[input.dataset.check]; });
  });
  render();
}
function render() {
  state.rows.forEach(row => {
    const summary = summarizeQuote(row, state.budget);
    const result = root.querySelector(`[data-review-row="${row.id}"] .review-result`);
    const label = summary.unknown ? `입력 금액 합계 · ${summary.unknown}개 비용 미확인` : '입력 기준 총비용';
    const budgetText = {unset:'예산 미지정',over:`예산 ${money(Math.abs(summary.gap))} 초과`,unknown:'미확인 비용이 있어 예산 충족 판단 보류',within:`예산 내 · ${money(summary.gap ?? 0)} 여유`}[summary.budgetState];
    result.replaceChildren();
    for (const [tag,text] of [['small',label],['strong',money(summary.known)],['span',budgetText],['small',summary.comparable?'금액·작업 범위·취소 조건 확인 완료':'작업 범위·취소 조건도 확인하세요']]) {
      const node = document.createElement(tag); node.textContent = text; result.append(node);
    }
    result.dataset.state = summary.budgetState;
  });
}
root.addEventListener('input', event => {
  const input = event.target;
  const card = input.closest('[data-review-row]');
  if (input === budget) state.budget = input.value;
  else if (card) {
    const row = state.rows.find(row => row.id === card.dataset.reviewRow);
    if (input.dataset.cost) row[input.dataset.cost] = input.value;
    if (input.dataset.check) row[input.dataset.check] = input.checked;
  } else return;
  status.textContent = '수정 중 · 변경 내용을 저장해주세요.'; render();
});
function save(message) {
  const invalid = [...root.querySelectorAll('input[type="number"]')].find(input => !input.validity.valid);
  if (invalid) { invalid.reportValidity(); status.textContent = '금액은 0원부터 1억원까지 정수로 입력하세요.'; return false; }
  const clean = normalizeReview(state);
  try { sessionStorage.setItem(KEY, JSON.stringify(clean)); state = clean; status.textContent = message; return true; }
  catch { status.textContent = '저장하지 못했습니다. 현재 화면의 내용만 유지됩니다.'; return false; }
}
root.querySelector('#saveReview').addEventListener('click', () => save('현재 탭에 검토표를 저장했습니다. 새로고침 후에도 복원됩니다.'));
root.addEventListener('click', event => {
  const id = event.target.closest('[data-clear]')?.dataset.clear;
  if (!id || !confirm(`견적 ${id}의 입력·저장 내용을 비울까요?`)) return;
  const index = state.rows.findIndex(row => row.id === id);
  state.rows[index] = normalizeReview(null).rows[index]; fill();
  save(`견적 ${id}를 비우고 저장했습니다.`);
});
root.querySelector('#clearReview').addEventListener('click', () => {
  if (!confirm('검토표의 모든 입력·저장 내용을 삭제할까요? 실제 예약에는 영향을 주지 않습니다.')) return;
  try { sessionStorage.removeItem(KEY); state = normalizeReview(null); fill(); status.textContent = '검토표를 삭제했습니다.'; }
  catch { status.textContent = '저장된 검토표를 삭제하지 못했습니다. 다시 시도해주세요.'; }
});
fill(); status.textContent = initialMessage;

// Preserve the application's screen hash when jumping within the quote screen.
document.querySelector('a[href="#quoteReview"]')?.addEventListener('click', event => {
  event.preventDefault();
  root.scrollIntoView({behavior:'smooth', block:'start'});
  budget.focus({preventScroll:true});
});
