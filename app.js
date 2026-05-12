// ── DATA ─────────────────────────────────────────────────────────────────────

let USERS = {
  admin:   { pass: 'Dimdan@2024', role: 'admin',    name: 'Admin' },
  romulo:  { pass: 'Dimdan@123',  role: 'investor', name: 'Rômulo',  cars: ['2017 KIA OPTIMA'] },
  jakline: { pass: 'Dimdan@123',  role: 'investor', name: 'Jakline', cars: ['2017 KIA OPTIMA'] },
  pedro:   { pass: 'Dimdan@123',  role: 'investor', name: 'Pedro',   cars: ['2016 NISSAN VERSA GRAY', '2013 NISSAN SENTRA'] },
  sandra:  { pass: 'Dimdan@123',  role: 'investor', name: 'Sandra',  cars: ['2019 NISSAN VERSA'] },
};

let CAR_DATA = {
  '2017 KIA OPTIMA': {
    invested: 7916.64,
    months: [
      { month: '2026-04', bruto: 655, manuts: [] },
    ]
  },
  '2016 NISSAN VERSA GRAY': {
    invested: 4669.63,
    months: [
      { month: '2026-04', bruto: 706, manuts: [] },
    ]
  },
  '2019 NISSAN VERSA': {
    invested: 6532.70,
    months: [
      { month: '2026-04', bruto: 745, manuts: [] },
    ]
  },
  '2013 NISSAN SENTRA': {
    invested: 6254.04,
    months: [
      { month: '2026-04', bruto: 746, manuts: [] },
    ]
  },
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

const MN = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function mlabel(ym) { const [y,m] = ym.split('-'); return MN[parseInt(m)-1]+'/'+y; }
function fmt(v) { return '$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtPct(v) { return (v*100).toFixed(1)+'%'; }

function monthLiq(mo) {
  const tm = mo.manuts.reduce((s,x) => s+x.valor, 0);
  return mo.bruto - (mo.bruto * 0.25) - 52 - 7.75 - tm;
}

function calcCar(cn) {
  const data = CAR_DATA[cn]; if (!data) return null;
  const n = data.months.length;
  let totalBruto = 0, totalManut = 0;
  data.months.forEach(mo => {
    totalBruto += mo.bruto;
    totalManut += mo.manuts.reduce((s,x) => s+x.valor, 0);
  });
  const adm = totalBruto * 0.25;
  const seg = n * 52;
  const rast = n * 7.75;
  const liquida = totalBruto - adm - seg - rast - totalManut;
  const roi = data.invested > 0 ? liquida / data.invested : null;
  return { invested: data.invested, totalBruto, adm, seg, rast, totalManut, liquida, roi, months: data.months, n };
}

// ── BUILD CAR CARD ────────────────────────────────────────────────────────────

function buildCarCard(cn) {
  const c = calcCar(cn);
  const pct = c.invested > 0 ? Math.min(Math.max(c.liquida / c.invested * 100, 0), 100) : 0;

  const monthRows = c.months.map(mo => {
    const liq = monthLiq(mo);
    const adm_m = mo.bruto * 0.25;
    const manutHtml = mo.manuts.length > 0 ? `
      <div class="manut-block">
        ${mo.manuts.map(x => `
          <div class="manut-item">
            <span class="mi-left"><i class="ti ti-tool"></i> ${x.desc}</span>
            <span class="mi-val">-${fmt(x.valor)}</span>
          </div>`).join('')}
      </div>` : '';
    return `
      <div class="month-entry">
        <div class="month-top">
          <span class="month-label-text">${mlabel(mo.month)}</span>
          <span class="month-liq" style="color:${liq>=0?'#15803d':'#dc2626'}">${liq>=0?'':'-'}${fmt(liq)} líq.</span>
        </div>
        <div class="mline"><span class="ml">Receita bruta</span><span class="mv">${fmt(mo.bruto)}</span></div>
        <div class="mline"><span class="ml">(-) Gestão 25%</span><span class="mv neg">-${fmt(adm_m)}</span></div>
        <div class="mline"><span class="ml">(-) Seguro</span><span class="mv neg">-$52.00</span></div>
        <div class="mline"><span class="ml">(-) Rastreador</span><span class="mv neg">-$7.75</span></div>
        ${manutHtml}
      </div>`;
  }).join('');

  return `
    <div class="car-card">
      <div class="car-header" onclick="toggleCar(this)">
        <div>
          <div class="car-name">${cn}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:2px">${c.n} mes(es) com receita</div>
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
          <div class="drow"><span class="dlabel">(-) Gestão de frota 25%</span><span class="dval neg">-${fmt(c.adm)}</span></div>
          <div class="drow"><span class="dlabel">(-) Seguro (${c.n} × $52.00)</span><span class="dval neg">-${fmt(c.seg)}</span></div>
          <div class="drow"><span class="dlabel">(-) Rastreador (${c.n} × $7.75)</span><span class="dval neg">-${fmt(c.rast)}</span></div>
          ${c.totalManut>0?`<div class="drow"><span class="dlabel">(-) Manutenções</span><span class="dval neg">-${fmt(c.totalManut)}</span></div>`:''}
          <div class="drow total-row"><span class="dlabel">Retorno líquido total</span><span class="dval ${c.liquida>=0?'pos':'neg'}">${c.liquida>=0?'':'-'}${fmt(c.liquida)}</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Histórico mensal</div>
          ${monthRows}
        </div>
      </div>
    </div>`;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

let currentRole = 'investor';
let currentUser = null;

function setRole(r) {
  currentRole = r;
  document.getElementById('tab-investor').className = 'role-tab' + (r==='investor' ? ' active' : '');
  document.getElementById('tab-admin').className = 'role-tab' + (r==='admin' ? ' active' : '');
}

function doLogin() {
  const u = document.getElementById('login-user').value.trim().toLowerCase();
  const p = document.getElementById('login-pass').value;
  const err = document.getElementById('login-err');
  const user = USERS[u];
  if (!user || user.pass !== p || user.role !== currentRole) { err.style.display = 'block'; return; }
  err.style.display = 'none';
  currentUser = u;
  user.role === 'admin' ? showAdmin() : showInvestor(u, user);
}

function logout() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  currentUser = null;
}

// ── INVESTOR SCREEN ───────────────────────────────────────────────────────────

function showInvestor(uname, user) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-investor').classList.add('active');
  document.getElementById('inv-topname').textContent = user.name;
  document.getElementById('inv-topsub').textContent = user.cars.length + ' veículo(s)';
  let ti = 0, tl = 0;
  user.cars.forEach(cn => { const c = calcCar(cn); if (c) { ti += c.invested; tl += c.liquida; } });
  const roi = ti > 0 ? tl / ti : 0;
  document.getElementById('inv-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total investido</div><div class="stat-val blue">${fmt(ti)}</div></div>
    <div class="stat-card"><div class="stat-label">Retorno líquido</div><div class="stat-val ${tl>=0?'green':'red'}">${fmt(tl)}</div></div>
    <div class="stat-card"><div class="stat-label">ROI acumulado</div><div class="stat-val ${roi>=0?'green':'red'}">${fmtPct(roi)}</div></div>`;
  document.getElementById('inv-cars').innerHTML = user.cars.map(buildCarCard).join('');
}

// ── ADMIN SCREEN ──────────────────────────────────────────────────────────────

function showAdmin() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-admin').classList.add('active');
  renderAdminStats(); renderAdminCars(); renderUserList(); renderInvList();
  populateSelects(); updatePreview(); updateManutPreview();
}

function renderAdminStats() {
  let ti=0, tl=0, tb=0;
  Object.keys(CAR_DATA).forEach(cn => { const c=calcCar(cn); ti+=c.invested; tl+=c.liquida; tb+=c.totalBruto; });
  document.getElementById('admin-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total investido</div><div class="stat-val blue">${fmt(ti)}</div></div>
    <div class="stat-card"><div class="stat-label">Receita bruta</div><div class="stat-val">${fmt(tb)}</div></div>
    <div class="stat-card"><div class="stat-label">Retorno líquido</div><div class="stat-val green">${fmt(tl)}</div></div>
    <div class="stat-card"><div class="stat-label">ROI médio</div><div class="stat-val green">${fmtPct(tl/ti)}</div></div>`;
}

function renderAdminCars() {
  document.getElementById('admin-cars').innerHTML = Object.keys(CAR_DATA).map(buildCarCard).join('');
}

// ── LANÇAMENTOS ───────────────────────────────────────────────────────────────

function updatePreview() {
  const cn = document.getElementById('f-car').value;
  const bruto = parseFloat(document.getElementById('f-bruto').value) || 0;
  const month = document.getElementById('f-month').value;
  const el = document.getElementById('preview-content');
  if (!cn || bruto === 0) { el.className='preview-empty'; el.textContent='Preencha o veículo e a receita bruta para ver a prévia.'; return; }
  el.className = '';
  const label = month ? mlabel(month) : '—';
  const adm = bruto * 0.25, liq = bruto - adm - 52 - 7.75;
  const c = calcCar(cn), newLiq = c.liquida + liq, newRoi = c.invested>0 ? newLiq/c.invested : null;
  el.innerHTML = `
    <div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-bottom:10px">${cn} — ${label}</div>
    <div class="prow"><span>Receita bruta</span><span>${fmt(bruto)}</span></div>
    <div class="prow"><span>(-) Gestão 25%</span><span style="color:#dc2626">-${fmt(adm)}</span></div>
    <div class="prow"><span>(-) Seguro</span><span style="color:#dc2626">-$52.00</span></div>
    <div class="prow"><span>(-) Rastreador</span><span style="color:#dc2626">-$7.75</span></div>
    <div class="ptotal"><span>Líquido deste mês</span><span style="color:${liq>=0?'#15803d':'#dc2626'}">${liq>=0?'':'-'}${fmt(liq)}</span></div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #eef0f5">
      <div class="prow"><span>Acumulado atual</span><span>${fmt(c.liquida)}</span></div>
      <div class="prow"><span>Acumulado após lançamento</span><span style="color:${newLiq>=0?'#15803d':'#dc2626'};font-weight:500">${newLiq>=0?'':'-'}${fmt(newLiq)}</span></div>
      <div class="prow" style="border:none"><span>Novo ROI</span><span style="color:${newRoi>=0?'#15803d':'#dc2626'};font-weight:500">${newRoi!==null?fmtPct(newRoi):'N/A'}</span></div>
    </div>`;
}

function updateManutPreview() {
  const cn = document.getElementById('m-car').value;
  const ym = document.getElementById('m-month').value;
  const valor = parseFloat(document.getElementById('m-valor').value) || 0;
  const desc = document.getElementById('m-desc') ? document.getElementById('m-desc').value.trim() : '';
  const el = document.getElementById('manut-preview');
  if (!cn || !ym || valor === 0) { el.className='preview-empty'; el.textContent='Preencha todos os campos para ver a prévia.'; return; }
  el.className = '';
  const c = calcCar(cn);
  const mo = c.months.find(m => m.month === ym);
  const liqAtual = mo ? monthLiq(mo) : null;
  const liqApos = liqAtual !== null ? liqAtual - valor : null;
  const newTotalLiq = c.liquida - valor;
  const newRoi = c.invested > 0 ? newTotalLiq / c.invested : null;
  const warnDesc = !desc ? `<div style="color:#92400e;font-size:12px;margin-top:8px"><i class="ti ti-alert-triangle"></i> Digite o tipo de serviço para salvar.</div>` : '';
  el.innerHTML = `
    <div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-bottom:10px">${cn} — ${mlabel(ym)}</div>
    <div class="prow"><span>Serviço</span><span>${desc||'—'}</span></div>
    <div class="prow"><span>Valor</span><span style="color:#dc2626">-${fmt(valor)}</span></div>
    ${liqAtual!==null?`
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid #eef0f5">
        <div class="prow"><span>Líquido ${mlabel(ym)} atual</span><span style="color:${liqAtual>=0?'#15803d':'#dc2626'}">${liqAtual>=0?'':'-'}${fmt(liqAtual)}</span></div>
        <div class="prow"><span>Líquido ${mlabel(ym)} após</span><span style="color:${liqApos>=0?'#15803d':'#dc2626'};font-weight:500">${liqApos>=0?'':'-'}${fmt(liqApos)}</span></div>
      </div>` : `<div style="color:#92400e;font-size:12px;margin-top:8px"><i class="ti ti-info-circle"></i> Mês sem receita lançada ainda.</div>`}
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #eef0f5">
      <div class="prow"><span>Retorno líquido total após</span><span style="color:${newTotalLiq>=0?'#15803d':'#dc2626'};font-weight:500">${newTotalLiq>=0?'':'-'}${fmt(newTotalLiq)}</span></div>
      <div class="prow" style="border:none"><span>Novo ROI</span><span style="color:${newRoi>=0?'#15803d':'#dc2626'};font-weight:500">${newRoi!==null?fmtPct(newRoi):'N/A'}</span></div>
    </div>${warnDesc}`;
}

function lancarReceita() {
  const cn = document.getElementById('f-car').value;
  const month = document.getElementById('f-month').value;
  const bruto = parseFloat(document.getElementById('f-bruto').value) || 0;
  if (!month || bruto === 0) return;
  const ex = CAR_DATA[cn].months.find(m => m.month === month);
  if (ex) { ex.bruto = bruto; } else { CAR_DATA[cn].months.push({month, bruto, manuts:[]}); CAR_DATA[cn].months.sort((a,b) => a.month.localeCompare(b.month)); }
  document.getElementById('f-bruto').value = '';
  const ok = document.getElementById('save-ok-r'); ok.style.display='block'; setTimeout(()=>ok.style.display='none', 2500);
  updatePreview(); renderAdminStats(); renderAdminCars();
}

function lancarManut() {
  const cn = document.getElementById('m-car').value;
  const ym = document.getElementById('m-month').value;
  const valor = parseFloat(document.getElementById('m-valor').value) || 0;
  const desc = document.getElementById('m-desc').value.trim();
  const errEl = document.getElementById('save-err-m');
  if (!desc) { errEl.style.display='block'; setTimeout(()=>errEl.style.display='none', 3000); return; }
  if (!ym || valor === 0) return;
  let mo = CAR_DATA[cn].months.find(m => m.month === ym);
  if (!mo) { mo = {month:ym, bruto:0, manuts:[]}; CAR_DATA[cn].months.push(mo); CAR_DATA[cn].months.sort((a,b)=>a.month.localeCompare(b.month)); }
  mo.manuts.push({desc, valor});
  document.getElementById('m-valor').value = '';
  document.getElementById('m-desc').value = '';
  const ok = document.getElementById('save-ok-m'); ok.style.display='block'; setTimeout(()=>ok.style.display='none', 2500);
  renderManutList(); updateManutPreview(); renderAdminStats(); renderAdminCars();
}

// ── MANUT LIST ────────────────────────────────────────────────────────────────

function renderManutList() {
  const cn = document.getElementById('m-car').value;
  const el = document.getElementById('manut-saved-list');
  const all = [];
  CAR_DATA[cn].months.forEach(mo => { mo.manuts.forEach((x, idx) => all.push({ym:mo.month, idx, desc:x.desc, valor:x.valor})); });
  if (all.length === 0) { el.innerHTML='<div class="empty-msg">Nenhuma manutenção lançada para este veículo.</div>'; return; }
  el.innerHTML = '<div class="manut-saved-list">' + all.map((item, i) => `
    <div class="manut-saved-item" id="msi-${i}">
      <div class="manut-saved-top">
        <div class="manut-saved-info">
          <div class="manut-saved-name"><i class="ti ti-tool"></i> ${item.desc}</div>
          <div class="manut-saved-sub">${mlabel(item.ym)}</div>
        </div>
        <span class="manut-saved-val">-${fmt(item.valor)}</span>
      </div>
      <div class="manut-saved-actions">
        <button class="btn-edit" onclick="toggleEditManut(${i})"><i class="ti ti-edit"></i> Editar</button>
        <button class="btn-del" onclick="deleteManut('${cn}','${item.ym}',${item.idx})"><i class="ti ti-trash"></i> Apagar</button>
      </div>
      <div class="edit-inline" id="edit-${i}">
        <input type="text" id="edit-desc-${i}" value="${item.desc}" placeholder="Tipo de serviço"/>
        <div class="edit-row">
          <input type="number" id="edit-val-${i}" value="${item.valor}" step="0.01" min="0" placeholder="Valor ($)"/>
          <button class="btn-save-edit" onclick="saveEditManut('${cn}','${item.ym}',${item.idx},${i})"><i class="ti ti-check"></i> Salvar</button>
          <button class="btn-cancel-edit" onclick="toggleEditManut(${i})">Cancelar</button>
        </div>
      </div>
    </div>`).join('') + '</div>';
}

function toggleEditManut(i) { document.getElementById('edit-'+i).classList.toggle('open'); }

function saveEditManut(cn, ym, idx, i) {
  const newDesc = document.getElementById('edit-desc-'+i).value.trim();
  const newVal = parseFloat(document.getElementById('edit-val-'+i).value) || 0;
  if (!newDesc || newVal === 0) return;
  CAR_DATA[cn].months.find(m=>m.month===ym).manuts[idx] = {desc:newDesc, valor:newVal};
  renderManutList(); renderAdminStats(); renderAdminCars(); updateManutPreview();
}

function deleteManut(cn, ym, idx) {
  if (!confirm('Apagar esta manutenção?')) return;
  CAR_DATA[cn].months.find(m=>m.month===ym).manuts.splice(idx, 1);
  renderManutList(); renderAdminStats(); renderAdminCars(); updateManutPreview();
}

// ── USER MANAGEMENT ───────────────────────────────────────────────────────────

function renderUserList() {
  const el = document.getElementById('user-list');
  const allUsers = Object.entries(USERS);
  el.innerHTML = allUsers.map(([uname, data], i) => `
    <div class="user-card">
      <div class="user-card-top">
        <div>
          <div class="user-name">${data.name} ${data.role === 'admin' ? '<span class="badge">Admin</span>' : ''}</div>
          <div class="user-login">Usuário: <strong>${uname}</strong></div>
        </div>
        <button class="btn-change-pass" onclick="togglePass(${i})"><i class="ti ti-key"></i> Alterar senha</button>
      </div>
      <div class="pass-inline" id="pass-${i}">
        <div class="pass-row">
          <input type="password" id="new-pass-${i}" placeholder="Nova senha"/>
          <button class="btn-save-edit" onclick="savePass('${uname}',${i})"><i class="ti ti-check"></i> Salvar</button>
          <button class="btn-cancel-edit" onclick="togglePass(${i})">Cancelar</button>
        </div>
        <div class="pass-ok" id="pass-ok-${i}"><i class="ti ti-circle-check"></i> Senha alterada!</div>
      </div>
    </div>`).join('');
}

function togglePass(i) { document.getElementById('pass-'+i).classList.toggle('open'); }

function savePass(uname, i) {
  const newPass = document.getElementById('new-pass-'+i).value.trim();
  if (!newPass || newPass.length < 6) { alert('A senha deve ter pelo menos 6 caracteres.'); return; }
  USERS[uname].pass = newPass;
  document.getElementById('new-pass-'+i).value = '';
  const ok = document.getElementById('pass-ok-'+i); ok.style.display='block'; setTimeout(()=>{ ok.style.display='none'; togglePass(i); }, 2000);
}

function renderInvList() {
  document.getElementById('inv-list').innerHTML = Object.entries(USERS)
    .filter(([,d]) => d.role === 'investor')
    .map(([u,d]) => `<tr><td>${d.name}</td><td style="color:#9ca3af">${u}</td><td>${d.cars.join(', ')}</td></tr>`)
    .join('');
}

// ── SETUP ─────────────────────────────────────────────────────────────────────

function populateSelects() {
  const opts = Object.keys(CAR_DATA).map(cn => `<option value="${cn}">${cn}</option>`).join('');
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
