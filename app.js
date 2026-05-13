// â”€â”€ CONFIG SUPABASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SUPABASE_URL = 'https://lzhkrpkncvgwzndlnace.supabase.co';
const SUPABASE_KEY = 'sb_publishable_V4OXaYjJ2xdn6G-CrkNcQQ_sTz28PXH';

async function db(table) {
  return `${SUPABASE_URL}/rest/v1/${table}`;
}

async function sbGet(table, params = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }
  });
  return r.json();
}

async function sbPost(table, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function sbPatch(table, params, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function sbDelete(table, params) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
}

// â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentRole = 'investor';
let currentUser = null;
let STATE = { cars: [], months: [], maintenances: [], users: [] };

// â”€â”€ LOAD ALL DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadAll() {
  const [cars, months, maintenances, users] = await Promise.all([
    sbGet('cars', 'order=name'),
    sbGet('months', 'order=month'),
    sbGet('maintenances', 'order=month'),
    sbGet('users', 'order=name'),
  ]);
  STATE = { cars, months, maintenances, users };
}

// â”€â”€ REALTIME SYNC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function startRealtimeSync() {
  // Poll every 5 seconds and refresh current view
  setInterval(async () => {
    await loadAll();
    refreshCurrentView();
  }, 5000);
}

function refreshCurrentView() {
  if (!currentUser) return;
  const user = STATE.users.find(u => u.username === currentUser);
  if (!user) return;
  if (user.role === 'investor') {
    renderInvestorStats(user);
    document.getElementById('inv-cars').innerHTML = user.cars.map(buildCarCard).join('');
  } else if (user.role === 'admin') {
    renderAdminStats();
    renderAdminCars();
  }
}

// â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MN = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function mlabel(ym) { const [y,m] = ym.split('-'); return MN[parseInt(m)-1]+'/'+y; }
function fmt(v) { return '$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtPct(v) { return (v*100).toFixed(1)+'%'; }

function getMonthLiq(carName, month) {
  const mo = STATE.months.find(m => m.car_name === carName && m.month === month);
  if (!mo) return 0;
  const manuts = STATE.maintenances.filter(m => m.car_name === carName && m.month === month);
  const totalManut = manuts.reduce((s,x) => s+x.value, 0);
  return mo.bruto - (mo.bruto * 0.25) - 52 - 7.75 - totalManut;
}

function calcCar(carName) {
  const car = STATE.cars.find(c => c.name === carName);
  if (!car) return null;
  const carMonths = STATE.months.filter(m => m.car_name === carName);
  const n = carMonths.length;
  const totalBruto = carMonths.reduce((s,m) => s+m.bruto, 0);
  const carManuts = STATE.maintenances.filter(m => m.car_name === carName);
  const totalManut = carManuts.reduce((s,m) => s+m.value, 0);
  const adm = totalBruto * 0.25;
  const seg = n * 52;
  const rast = n * 7.75;
  const liquida = totalBruto - adm - seg - rast - totalManut;
  const roi = car.invested > 0 ? liquida / car.invested : null;
  return { invested: car.invested, totalBruto, adm, seg, rast, totalManut, liquida, roi, n, carMonths, carManuts };
}

// â”€â”€ BUILD CAR CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildCarCard(carName) {
  const c = calcCar(carName);
  if (!c) return '';
  const pct = c.invested > 0 ? Math.min(Math.max(c.liquida / c.invested * 100, 0), 100) : 0;

  const monthRows = c.carMonths.map(mo => {
    const manuts = STATE.maintenances.filter(m => m.car_name === carName && m.month === mo.month);
    const totalManut = manuts.reduce((s,x) => s+x.value, 0);
    const liq = mo.bruto - (mo.bruto*0.25) - 52 - 7.75 - totalManut;
    const adm_m = mo.bruto * 0.25;
    const manutHtml = manuts.length > 0 ? `
      <div class="manut-block">
        ${manuts.map(x => `
          <div class="manut-item">
            <span class="mi-left"><i class="ti ti-tool"></i> ${x.description}</span>
            <span class="mi-val">-${fmt(x.value)}</span>
          </div>`).join('')}
      </div>` : '';
    return `
      <div class="month-entry">
        <div class="month-top">
          <span class="month-label-text">${mlabel(mo.month)}</span>
          <span class="month-liq" style="color:${liq>=0?'#15803d':'#dc2626'}">${liq>=0?'':'-'}${fmt(liq)} lÃ­q.</span>
        </div>
        <div class="mline"><span class="ml">Receita bruta</span><span class="mv">${fmt(mo.bruto)}</span></div>
        <div class="mline"><span class="ml">(-) GestÃ£o 25%</span><span class="mv neg">-${fmt(adm_m)}</span></div>
        <div class="mline"><span class="ml">(-) Seguro</span><span class="mv neg">-$52.00</span></div>
        <div class="mline"><span class="ml">(-) Rastreador</span><span class="mv neg">-$7.75</span></div>
        ${manutHtml}
      </div>`;
  }).join('');

  return `
    <div class="car-card">
      <div class="car-header" onclick="toggleCar(this)">
        <div>
          <div class="car-name">${carName}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:2px">${c.n === 1 ? '1 mÃªs com receita' : c.n + ' meses com receita'}</div>
          <div class="progress-bar-wrap"><div class="progress-bar" style="width:${Math.max(pct,2)}%"></div></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:500;color:${c.roi>=0?'#15803d':'#dc2626'};font-family:'DM Mono',monospace">${c.roi!==null?fmtPct(c.roi):'N/A'}</div>
          <div style="font-size:11px;color:#9ca3af">ROI</div>
          <i class="ti ti-chevron-down" style="font-size:16px;color:#9ca3af;margin-top:4px"></i>
        </div>
      </div>
      <div class="car-body">
        <div class="detail-section">
          <div class="detail-section-title">Resumo acumulado</div>
          <div class="drow"><span class="dlabel">Valor investido</span><span class="dval blue">${fmt(c.invested)}</span></div>
          <div class="drow"><span class="dlabel">Receita bruta total</span><span class="dval">${fmt(c.totalBruto)}</span></div>
          <div class="drow"><span class="dlabel">(-) GestÃ£o de frota 25%</span><span class="dval neg">-${fmt(c.adm)}</span></div>
          <div class="drow"><span class="dlabel">(-) Seguro (${c.n} Ã— $52.00)</span><span class="dval neg">-${fmt(c.seg)}</span></div>
          <div class="drow"><span class="dlabel">(-) Rastreador (${c.n} Ã— $7.75)</span><span class="dval neg">-${fmt(c.rast)}</span></div>
          ${c.totalManut>0?`<div class="drow"><span class="dlabel">(-) ManutenÃ§Ãµes</span><span class="dval neg">-${fmt(c.totalManut)}</span></div>`:''}
          <div class="drow total-row"><span class="dlabel">Retorno lÃ­quido total</span><span class="dval ${c.liquida>=0?'pos':'neg'}">${c.liquida>=0?'':'-'}${fmt(c.liquida)}</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">HistÃ³rico mensal</div>
          ${monthRows || '<div class="empty-msg">Nenhuma receita lanÃ§ada ainda.</div>'}
        </div>
      </div>
    </div>`;
}

// â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setRole(r) {
  currentRole = r;
  document.getElementById('tab-investor').className = 'role-tab' + (r==='investor' ? ' active' : '');
  document.getElementById('tab-admin').className = 'role-tab' + (r==='admin' ? ' active' : '');
}

async function doLogin() {
  const u = document.getElementById('login-user').value.trim().toLowerCase();
  const p = document.getElementById('login-pass').value;
  const err = document.getElementById('login-err');
  showLoading(true);
  await loadAll();
  showLoading(false);
  const user = STATE.users.find(x => x.username === u && x.password === p && x.role === currentRole);
  if (!user) { err.style.display = 'block'; return; }
  err.style.display = 'none';
  currentUser = u;
  user.role === 'admin' ? showAdmin() : showInvestor(user);
  startRealtimeSync();
}

function logout() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  currentUser = null;
}

function showLoading(show) {
  document.getElementById('login-btn').textContent = show ? 'Entrando...' : 'Entrar';
  document.getElementById('login-btn').disabled = show;
}

// â”€â”€ INVESTOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showInvestor(user) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-investor').classList.add('active');
  document.getElementById('inv-topname').textContent = user.name;
  document.getElementById('inv-topsub').textContent = user.cars.length + ' veÃ­culo(s)';
  renderInvestorStats(user);
  document.getElementById('inv-cars').innerHTML = user.cars.map(buildCarCard).join('');
}

function renderInvestorStats(user) {
  let ti = 0, tl = 0;
  user.cars.forEach(cn => { const c = calcCar(cn); if (c) { ti += c.invested; tl += c.liquida; } });
  const roi = ti > 0 ? tl / ti : 0;
  document.getElementById('inv-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total investido</div><div class="stat-val blue">${fmt(ti)}</div></div>
    <div class="stat-card"><div class="stat-label">Retorno lÃ­quido</div><div class="stat-val ${tl>=0?'green':'red'}">${fmt(tl)}</div></div>
    <div class="stat-card"><div class="stat-label">ROI acumulado</div><div class="stat-val ${roi>=0?'green':'red'}">${fmtPct(roi)}</div></div>`;
}

// â”€â”€ ADMIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showAdmin() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-admin').classList.add('active');
  renderAdminStats(); renderAdminCars(); renderUserList(); renderInvList();
  populateSelects(); updatePreview(); updateManutPreview();
}

function renderAdminStats() {
  let ti=0, tl=0, tb=0;
  STATE.cars.forEach(car => { const c=calcCar(car.name); if(c){ti+=c.invested;tl+=c.liquida;tb+=c.totalBruto;} });
  document.getElementById('admin-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total investido</div><div class="stat-val blue">${fmt(ti)}</div></div>
    <div class="stat-card"><div class="stat-label">Receita bruta</div><div class="stat-val">${fmt(tb)}</div></div>
    <div class="stat-card"><div class="stat-label">Retorno lÃ­quido</div><div class="stat-val green">${fmt(tl)}</div></div>
    <div class="stat-card"><div class="stat-label">ROI mÃ©dio</div><div class="stat-val green">${ti>0?fmtPct(tl/ti):'N/A'}</div></div>`;
}

function renderAdminCars() {
  document.getElementById('admin-cars').innerHTML = STATE.cars.map(c => buildCarCard(c.name)).join('');
}

// â”€â”€ LANÃ‡AR RECEITA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updatePreview() {
  const cn = document.getElementById('f-car').value;
  const bruto = parseFloat(document.getElementById('f-bruto').value) || 0;
  const month = document.getElementById('f-month').value;
  const el = document.getElementById('preview-content');
  if (!cn || bruto === 0) { el.className='preview-empty'; el.textContent='Preencha o veÃ­culo e a receita bruta para ver a prÃ©via.'; return; }
  el.className = '';
  const adm = bruto*0.25, liq = bruto-adm-52-7.75;
  const c = calcCar(cn), newLiq = (c?c.liquida:0)+liq, newRoi = c&&c.invested>0?newLiq/c.invested:null;
  el.innerHTML = `
    <div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-bottom:10px">${cn} â€” ${month?mlabel(month):'â€”'}</div>
    <div class="prow"><span>Receita bruta</span><span>${fmt(bruto)}</span></div>
    <div class="prow"><span>(-) GestÃ£o 25%</span><span style="color:#dc2626">-${fmt(adm)}</span></div>
    <div class="prow"><span>(-) Seguro</span><span style="color:#dc2626">-$52.00</span></div>
    <div class="prow"><span>(-) Rastreador</span><span style="color:#dc2626">-$7.75</span></div>
    <div class="ptotal"><span>LÃ­quido deste mÃªs</span><span style="color:${liq>=0?'#15803d':'#dc2626'}">${liq>=0?'':'-'}${fmt(liq)}</span></div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #eef0f5">
      <div class="prow"><span>Acumulado atual</span><span>${c?fmt(c.liquida):'$0.00'}</span></div>
      <div class="prow"><span>Acumulado apÃ³s lanÃ§amento</span><span style="color:${newLiq>=0?'#15803d':'#dc2626'};font-weight:500">${newLiq>=0?'':'-'}${fmt(newLiq)}</span></div>
      <div class="prow" style="border:none"><span>Novo ROI</span><span style="color:${newRoi>=0?'#15803d':'#dc2626'};font-weight:500">${newRoi!==null?fmtPct(newRoi):'N/A'}</span></div>
    </div>`;
}

async function lancarReceita() {
  const cn = document.getElementById('f-car').value;
  const month = document.getElementById('f-month').value;
  const bruto = parseFloat(document.getElementById('f-bruto').value) || 0;
  if (!month || bruto === 0) return;
  const existing = STATE.months.find(m => m.car_name === cn && m.month === month);
  if (existing) {
    await sbPatch('months', `car_name=eq.${encodeURIComponent(cn)}&month=eq.${month}`, { bruto });
  } else {
    await sbPost('months', { car_name: cn, month, bruto });
  }
  document.getElementById('f-bruto').value = '';
  await loadAll();
  const ok = document.getElementById('save-ok-r'); ok.style.display='block'; setTimeout(()=>ok.style.display='none',2500);
  updatePreview(); renderAdminStats(); renderAdminCars(); refreshCurrentView();
}

// â”€â”€ MANUTENÃ‡ÃƒO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateManutPreview() {
  const cn = document.getElementById('m-car').value;
  const ym = document.getElementById('m-month').value;
  const valor = parseFloat(document.getElementById('m-valor').value) || 0;
  const desc = document.getElementById('m-desc') ? document.getElementById('m-desc').value.trim() : '';
  const el = document.getElementById('manut-preview');
  if (!cn || !ym || valor === 0) { el.className='preview-empty'; el.textContent='Preencha todos os campos para ver a prÃ©via.'; return; }
  el.className = '';
  const c = calcCar(cn);
  const mo = STATE.months.find(m => m.car_name === cn && m.month === ym);
  const manuts = STATE.maintenances.filter(m => m.car_name === cn && m.month === ym);
  const totalManut = manuts.reduce((s,x)=>s+x.value,0);
  const liqAtual = mo ? mo.bruto-(mo.bruto*0.25)-52-7.75-totalManut : null;
  const liqApos = liqAtual !== null ? liqAtual - valor : null;
  const newTotalLiq = (c?c.liquida:0) - valor;
  const newRoi = c&&c.invested>0 ? newTotalLiq/c.invested : null;
  const warnDesc = !desc ? `<div style="color:#92400e;font-size:12px;margin-top:8px"><i class="ti ti-alert-triangle"></i> Digite o tipo de serviÃ§o para salvar.</div>` : '';
  el.innerHTML = `
    <div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-bottom:10px">${cn} â€” ${mlabel(ym)}</div>
    <div class="prow"><span>ServiÃ§o</span><span>${desc||'â€”'}</span></div>
    <div class="prow"><span>Valor</span><span style="color:#dc2626">-${fmt(valor)}</span></div>
    ${liqAtual!==null?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid #eef0f5">
      <div class="prow"><span>LÃ­quido ${mlabel(ym)} atual</span><span style="color:${liqAtual>=0?'#15803d':'#dc2626'}">${liqAtual>=0?'':'-'}${fmt(liqAtual)}</span></div>
      <div class="prow"><span>LÃ­quido ${mlabel(ym)} apÃ³s</span><span style="color:${liqApos>=0?'#15803d':'#dc2626'};font-weight:500">${liqApos>=0?'':'-'}${fmt(liqApos)}</span></div>
    </div>`:`<div style="color:#92400e;font-size:12px;margin-top:8px"><i class="ti ti-info-circle"></i> MÃªs sem receita lanÃ§ada ainda.</div>`}
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #eef0f5">
      <div class="prow"><span>Retorno lÃ­quido total apÃ³s</span><span style="color:${newTotalLiq>=0?'#15803d':'#dc2626'};font-weight:500">${newTotalLiq>=0?'':'-'}${fmt(newTotalLiq)}</span></div>
      <div class="prow" style="border:none"><span>Novo ROI</span><span style="color:${newRoi>=0?'#15803d':'#dc2626'};font-weight:500">${newRoi!==null?fmtPct(newRoi):'N/A'}</span></div>
    </div>${warnDesc}`;
}

async function lancarManut() {
  const cn = document.getElementById('m-car').value;
  const ym = document.getElementById('m-month').value;
  const valor = parseFloat(document.getElementById('m-valor').value) || 0;
  const desc = document.getElementById('m-desc').value.trim();
  const errEl = document.getElementById('save-err-m');
  if (!desc) { errEl.style.display='block'; setTimeout(()=>errEl.style.display='none',3000); return; }
  if (!ym || valor === 0) return;
  await sbPost('maintenances', { car_name: cn, month: ym, description: desc, value: valor });
  document.getElementById('m-valor').value = '';
  document.getElementById('m-desc').value = '';
  await loadAll();
  const ok = document.getElementById('save-ok-m'); ok.style.display='block'; setTimeout(()=>ok.style.display='none',2500);
  renderManutList(); updateManutPreview(); renderAdminStats(); renderAdminCars(); refreshCurrentView();
}

async function renderManutList() {
  const cn = document.getElementById('m-car').value;
  const el = document.getElementById('manut-saved-list');
  const all = STATE.maintenances.filter(m => m.car_name === cn);
  if (all.length === 0) { el.innerHTML='<div class="empty-msg">Nenhuma manutenÃ§Ã£o lanÃ§ada para este veÃ­culo.</div>'; return; }
  el.innerHTML = '<div class="manut-saved-list">' + all.map((item, i) => `
    <div class="manut-saved-item" id="msi-${i}">
      <div class="manut-saved-top">
        <div class="manut-saved-info">
          <div class="manut-saved-name"><i class="ti ti-tool"></i> ${item.description}</div>
          <div class="manut-saved-sub">${mlabel(item.month)}</div>
        </div>
        <span class="manut-saved-val">-${fmt(item.value)}</span>
      </div>
      <div class="manut-saved-actions">
        <button class="btn-edit" onclick="toggleEditManut(${i})"><i class="ti ti-edit"></i> Editar</button>
        <button class="btn-del" onclick="deleteManut('${item.id}')"><i class="ti ti-trash"></i> Apagar</button>
      </div>
      <div class="edit-inline" id="edit-${i}">
        <input type="text" id="edit-desc-${i}" value="${item.description}" placeholder="Tipo de serviÃ§o"/>
        <div class="edit-row">
          <input type="number" id="edit-val-${i}" value="${item.value}" step="0.01" min="0"/>
          <button class="btn-save-edit" onclick="saveEditManut('${item.id}',${i})"><i class="ti ti-check"></i> Salvar</button>
          <button class="btn-cancel-edit" onclick="toggleEditManut(${i})">Cancelar</button>
        </div>
      </div>
    </div>`).join('') + '</div>';
}

function toggleEditManut(i) { document.getElementById('edit-'+i).classList.toggle('open'); }

async function saveEditManut(id, i) {
  const newDesc = document.getElementById('edit-desc-'+i).value.trim();
  const newVal = parseFloat(document.getElementById('edit-val-'+i).value) || 0;
  if (!newDesc || newVal === 0) return;
  await sbPatch('maintenances', `id=eq.${id}`, { description: newDesc, value: newVal });
  await loadAll();
  renderManutList(); renderAdminStats(); renderAdminCars(); updateManutPreview(); refreshCurrentView();
}

async function deleteManut(id) {
  if (!confirm('Apagar esta manutenÃ§Ã£o?')) return;
  await sbDelete('maintenances', `id=eq.${id}`);
  await loadAll();
  renderManutList(); renderAdminStats(); renderAdminCars(); updateManutPreview(); refreshCurrentView();
}

// â”€â”€ USUÃRIOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderUserList() {
  document.getElementById('user-list').innerHTML = STATE.users.map((data, i) => `
    <div class="user-card">
      <div class="user-card-top">
        <div>
          <div class="user-name">${data.name} ${data.role==='admin'?'<span class="badge">Admin</span>':''}</div>
          <div class="user-login">UsuÃ¡rio: <strong>${data.username}</strong></div>
        </div>
        <button class="btn-change-pass" onclick="togglePass(${i})"><i class="ti ti-key"></i> Alterar senha</button>
      </div>
      <div class="pass-inline" id="pass-${i}">
        <div class="pass-row">
          <input type="password" id="new-pass-${i}" placeholder="Nova senha (mÃ­n. 6 caracteres)"/>
          <button class="btn-save-edit" onclick="savePass('${data.id}',${i})"><i class="ti ti-check"></i> Salvar</button>
          <button class="btn-cancel-edit" onclick="togglePass(${i})">Cancelar</button>
        </div>
        <div class="pass-ok" id="pass-ok-${i}"><i class="ti ti-circle-check"></i> Senha alterada!</div>
      </div>
    </div>`).join('');
}

function togglePass(i) { document.getElementById('pass-'+i).classList.toggle('open'); }

async function savePass(id, i) {
  const newPass = document.getElementById('new-pass-'+i).value.trim();
  if (!newPass || newPass.length < 6) { alert('A senha deve ter pelo menos 6 caracteres.'); return; }
  await sbPatch('users', `id=eq.${id}`, { password: newPass });
  await loadAll();
  document.getElementById('new-pass-'+i).value = '';
  const ok = document.getElementById('pass-ok-'+i);
  ok.style.display = 'block';
  setTimeout(() => { ok.style.display='none'; togglePass(i); }, 2000);
}

function renderInvList() {
  document.getElementById('inv-list').innerHTML = STATE.users
    .filter(d => d.role==='investor')
    .map(d => `<tr><td>${d.name}</td><td style="color:#9ca3af">${d.username}</td><td>${(d.cars||[]).join(', ')}</td></tr>`)
    .join('');
}

// â”€â”€ SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function populateSelects() {
  const opts = STATE.cars.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  document.getElementById('f-car').innerHTML = opts;
  document.getElementById('m-car').innerHTML = opts;
  const now = new Date();
  const ym = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  document.getElementById('f-month').value = ym;
  document.getElementById('m-month').value = ym;
  renderManutList();
}

function toggleCar(header) { header.nextElementSibling.classList.toggle('open'); }

function showAdminTab(tab) {
  const ids = ['visao','lancar','usuarios'];
  document.querySelectorAll('.atab').forEach((t,i) => { t.className = 'atab'+(ids[i]===tab?' active':''); });
  ids.forEach(id => { document.getElementById('atab-'+id).className = 'atab-content'+(id===tab?' active':''); });
}

function showSubTab(tab) {
  ['receita','manut'].forEach(id => { document.getElementById('sub-'+id).className = 'sub-content'+(id===tab?' active':''); });
  document.querySelectorAll('.stab').forEach((t,i) => { t.className = 'stab'+(['receita','manut'][i]===tab?' active':''); });
  if (tab === 'manut') renderManutList();
}
