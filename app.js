const SUPABASE_URL = 'https://lzhkrpkncvgwzndlnace.supabase.co';
const SUPABASE_KEY = 'sb_publishable_V4OXaYjJ2xdn6G-CrkNcQQ_sTz28PXH';

async function sbGet(table, params) {
  params = params || '';
  var r = await fetch(SUPABASE_URL+'/rest/v1/'+table+'?'+params, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer '+SUPABASE_KEY }
  });
  return r.json();
}
async function sbPost(table, body) {
  var r = await fetch(SUPABASE_URL+'/rest/v1/'+table, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer '+SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  return r.json();
}
async function sbPatch(table, params, body) {
  var r = await fetch(SUPABASE_URL+'/rest/v1/'+table+'?'+params, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer '+SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  return r.json();
}
async function sbDelete(table, params) {
  await fetch(SUPABASE_URL+'/rest/v1/'+table+'?'+params, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer '+SUPABASE_KEY }
  });
}

var currentRole = 'investor';
var currentUser = null;
var openCarNames = {};
var STATE = { cars: [], months: [], maintenances: [], users: [] };

async function loadAll() {
  var results = await Promise.all([
    sbGet('cars', 'order=name'),
    sbGet('months', 'order=month'),
    sbGet('maintenances', 'order=month'),
    sbGet('users', 'order=name')
  ]);
  STATE.cars = results[0];
  STATE.months = results[1];
  STATE.maintenances = results[2];
  STATE.users = results[3];
}

function startRealtimeSync() {
  setInterval(async function() {
    await loadAll();
    refreshCurrentView();
  }, 30000);
}

function refreshCurrentView() {
  if (!currentUser) return;
  var user = null;
  for (var i = 0; i < STATE.users.length; i++) {
    if (STATE.users[i].username === currentUser) { user = STATE.users[i]; break; }
  }
  if (!user) return;
  if (user.role === 'investor') {
    renderInvestorStats(user);
    document.getElementById('inv-cars').innerHTML = user.cars.map(buildCarCard).join('');
    restoreOpenCards('inv-cars');
  } else if (user.role === 'admin') {
    renderAdminStats();
    renderAdminCars();
    restoreOpenCards('admin-cars');
  }
}

function restoreOpenCards(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var cards = container.querySelectorAll('.car-card');
  for (var i = 0; i < cards.length; i++) {
    var nameEl = cards[i].querySelector('.car-name');
    if (nameEl && openCarNames[nameEl.textContent]) {
      cards[i].querySelector('.car-body').classList.add('open');
    }
  }
}

var MN = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function mlabel(ym) { var p = ym.split('-'); return MN[parseInt(p[1])-1]+'/'+p[0]; }
function fmt(v) { return '$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtPct(v) { return (v*100).toFixed(1)+'%'; }

function calcCar(carName) {
  var car = null;
  for (var i = 0; i < STATE.cars.length; i++) { if (STATE.cars[i].name === carName) { car = STATE.cars[i]; break; } }
  if (!car) return null;
  var carMonths = STATE.months.filter(function(m){ return m.car_name === carName; });
  var n = carMonths.length;
  var totalBruto = 0;
  for (var i = 0; i < carMonths.length; i++) totalBruto += carMonths[i].bruto;
  var carManuts = STATE.maintenances.filter(function(m){ return m.car_name === carName; });
  var totalManut = 0;
  for (var i = 0; i < carManuts.length; i++) totalManut += carManuts[i].value;
  var adm = totalBruto * 0.25;
  var seg = n * 52;
  var rast = n * 7.75;
  var liquida = totalBruto - adm - seg - rast - totalManut;
  var roi = car.invested > 0 ? liquida / car.invested : null;
  return { invested: car.invested, totalBruto: totalBruto, adm: adm, seg: seg, rast: rast, totalManut: totalManut, liquida: liquida, roi: roi, n: n, carMonths: carMonths, carManuts: carManuts };
}

function buildCarCard(carName) {
  var c = calcCar(carName);
  if (!c) return '';
  var pct = c.invested > 0 ? Math.min(Math.max(c.liquida/c.invested*100, 0), 100) : 0;
  var monthRows = '';
  for (var i = 0; i < c.carMonths.length; i++) {
    var mo = c.carMonths[i];
    var manuts = STATE.maintenances.filter(function(m){ return m.car_name === carName && m.month === mo.month; });
    var totalManut = 0;
    for (var j = 0; j < manuts.length; j++) totalManut += manuts[j].value;
    var liq = mo.bruto - (mo.bruto*0.25) - 52 - 7.75 - totalManut;
    var adm_m = mo.bruto * 0.25;
    var manutHtml = '';
    if (manuts.length > 0) {
      manutHtml = '<div class="manut-block">';
      for (var j = 0; j < manuts.length; j++) {
        manutHtml += '<div class="manut-item"><span class="mi-left"><i class="ti ti-tool"></i> '+manuts[j].description+'</span><span class="mi-val">-'+fmt(manuts[j].value)+'</span></div>';
      }
      manutHtml += '</div>';
    }
    monthRows += '<div class="month-entry">'
      +'<div class="month-top"><span class="month-label-text">'+mlabel(mo.month)+'</span><span class="month-liq" style="color:'+(liq>=0?'#15803d':'#dc2626')+'">'+(liq>=0?'':'-')+fmt(liq)+' líq.</span></div>'
      +'<div class="mline"><span class="ml">Receita bruta</span><span class="mv">'+fmt(mo.bruto)+'</span></div>'
      +'<div class="mline"><span class="ml">(-) Gestão 25%</span><span class="mv neg">-'+fmt(adm_m)+'</span></div>'
      +'<div class="mline"><span class="ml">(-) Seguro</span><span class="mv neg">-$52.00</span></div>'
      +'<div class="mline"><span class="ml">(-) Rastreador</span><span class="mv neg">-$7.75</span></div>'
      +manutHtml+'</div>';
  }
  var totalManutHtml = c.totalManut > 0 ? '<div class="drow"><span class="dlabel">(-) Manutenções</span><span class="dval neg">-'+fmt(c.totalManut)+'</span></div>' : '';
  return '<div class="car-card">'
    +'<div class="car-header" onclick="toggleCar(this)">'
    +'<div><div class="car-name">'+carName+'</div>'
    +'<div style="font-size:12px;color:#9ca3af;margin-top:2px">'+(c.n===1?'1 mês com receita':c.n+' meses com receita')+'</div>'
    +'<div class="progress-bar-wrap"><div class="progress-bar" style="width:'+Math.max(pct,2)+'%"></div></div></div>'
    +'<div style="text-align:right">'
    +'<div style="font-size:20px;font-weight:500;color:'+(c.roi>=0?'#15803d':'#dc2626')+';font-family:\'DM Mono\',monospace">'+(c.roi!==null?fmtPct(c.roi):'N/A')+'</div>'
    +'<div style="font-size:11px;color:#9ca3af">ROI</div>'
    +'<i class="ti ti-chevron-down" style="font-size:16px;color:#9ca3af;margin-top:4px"></i></div></div>'
    +'<div class="car-body">'
    +'<div class="detail-section"><div class="detail-section-title">Resumo acumulado</div>'
    +'<div class="drow"><span class="dlabel">Valor investido</span><span class="dval blue">'+fmt(c.invested)+'</span></div>'
    +'<div class="drow"><span class="dlabel">Receita bruta total</span><span class="dval">'+fmt(c.totalBruto)+'</span></div>'
    +'<div class="drow"><span class="dlabel">(-) Gestão de frota 25%</span><span class="dval neg">-'+fmt(c.adm)+'</span></div>'
    +'<div class="drow"><span class="dlabel">(-) Seguro ('+c.n+' × $52.00)</span><span class="dval neg">-'+fmt(c.seg)+'</span></div>'
    +'<div class="drow"><span class="dlabel">(-) Rastreador ('+c.n+' × $7.75)</span><span class="dval neg">-'+fmt(c.rast)+'</span></div>'
    +totalManutHtml
    +'<div class="drow total-row"><span class="dlabel">Retorno líquido total</span><span class="dval '+(c.liquida>=0?'pos':'neg')+'">'+(c.liquida>=0?'':'-')+fmt(c.liquida)+'</span></div></div>'
    +'<div class="detail-section"><div class="detail-section-title">Histórico mensal</div>'+(monthRows||'<div class="empty-msg">Nenhuma receita lançada ainda.</div>')+'</div>'
    +'</div></div>';
}

function setRole(r) {
  currentRole = r;
  document.getElementById('tab-investor').className = 'role-tab'+(r==='investor'?' active':'');
  document.getElementById('tab-admin').className = 'role-tab'+(r==='admin'?' active':'');
}

async function doLogin() {
  var u = document.getElementById('login-user').value.trim().toLowerCase();
  var p = document.getElementById('login-pass').value;
  var err = document.getElementById('login-err');
  var btn = document.getElementById('login-btn');
  btn.textContent = 'Entrando...'; btn.disabled = true;
  await loadAll();
  btn.textContent = 'Entrar'; btn.disabled = false;
  var user = null;
  for (var i = 0; i < STATE.users.length; i++) {
    if (STATE.users[i].username===u && STATE.users[i].password===p && STATE.users[i].role===currentRole) {
      user = STATE.users[i]; break;
    }
  }
  if (!user) { err.style.display='block'; return; }
  err.style.display = 'none';
  currentUser = u;
  if (user.role==='admin') showAdmin(); else showInvestor(user);
  startRealtimeSync();
}

function logout() {
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
  currentUser = null;
  openCarNames = {};
}

function showInvestor(user) {
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById('screen-investor').classList.add('active');
  document.getElementById('inv-topname').textContent = user.name;
  document.getElementById('inv-topsub').textContent = user.cars.length+' veículo(s)';
  renderInvestorStats(user);
  document.getElementById('inv-cars').innerHTML = user.cars.map(buildCarCard).join('');
}

function renderInvestorStats(user) {
  var ti=0, tl=0;
  for (var i=0; i<user.cars.length; i++) { var c=calcCar(user.cars[i]); if(c){ti+=c.invested;tl+=c.liquida;} }
  var roi = ti>0?tl/ti:0;
  document.getElementById('inv-stats').innerHTML =
    '<div class="stat-card"><div class="stat-label">Total investido</div><div class="stat-val blue">'+fmt(ti)+'</div></div>'
    +'<div class="stat-card"><div class="stat-label">Retorno líquido</div><div class="stat-val '+(tl>=0?'green':'red')+'">'+fmt(tl)+'</div></div>'
    +'<div class="stat-card"><div class="stat-label">ROI acumulado</div><div class="stat-val '+(roi>=0?'green':'red')+'">'+fmtPct(roi)+'</div></div>';
}

function showAdmin() {
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById('screen-admin').classList.add('active');
  renderAdminStats(); renderAdminCars(); renderUserList(); renderInvList(); populateSelects();
}

function renderAdminStats() {
  var ti=0,tl=0,tb=0;
  for (var i=0; i<STATE.cars.length; i++) { var c=calcCar(STATE.cars[i].name); if(c){ti+=c.invested;tl+=c.liquida;tb+=c.totalBruto;} }
  document.getElementById('admin-stats').innerHTML =
    '<div class="stat-card"><div class="stat-label">Total investido</div><div class="stat-val blue">'+fmt(ti)+'</div></div>'
    +'<div class="stat-card"><div class="stat-label">Receita bruta</div><div class="stat-val">'+fmt(tb)+'</div></div>'
    +'<div class="stat-card"><div class="stat-label">Retorno líquido</div><div class="stat-val green">'+fmt(tl)+'</div></div>'
    +'<div class="stat-card"><div class="stat-label">ROI médio</div><div class="stat-val green">'+(ti>0?fmtPct(tl/ti):'N/A')+'</div></div>';
}

function renderAdminCars() {
  document.getElementById('admin-cars').innerHTML = STATE.cars.map(function(c){ return buildCarCard(c.name); }).join('');
}

function updatePreview() {
  var cn = document.getElementById('f-car').value;
  var bruto = parseFloat(document.getElementById('f-bruto').value)||0;
  var month = document.getElementById('f-month').value;
  var el = document.getElementById('preview-content');
  if (!cn||bruto===0){el.className='preview-empty';el.textContent='Preencha o veículo e a receita bruta para ver a prévia.';return;}
  el.className='';
  var adm=bruto*0.25, liq=bruto-adm-52-7.75;
  var c=calcCar(cn), newLiq=(c?c.liquida:0)+liq, newRoi=c&&c.invested>0?newLiq/c.invested:null;
  el.innerHTML='<div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-bottom:10px">'+cn+' — '+(month?mlabel(month):'—')+'</div>'
    +'<div class="prow"><span>Receita bruta</span><span>'+fmt(bruto)+'</span></div>'
    +'<div class="prow"><span>(-) Gestão 25%</span><span style="color:#dc2626">-'+fmt(adm)+'</span></div>'
    +'<div class="prow"><span>(-) Seguro</span><span style="color:#dc2626">-$52.00</span></div>'
    +'<div class="prow"><span>(-) Rastreador</span><span style="color:#dc2626">-$7.75</span></div>'
    +'<div class="ptotal"><span>Líquido deste mês</span><span style="color:'+(liq>=0?'#15803d':'#dc2626')+'">'+(liq>=0?'':'-')+fmt(liq)+'</span></div>'
    +'<div style="margin-top:10px;padding-top:10px;border-top:1px solid #eef0f5">'
    +'<div class="prow"><span>Acumulado atual</span><span>'+(c?fmt(c.liquida):'$0.00')+'</span></div>'
    +'<div class="prow"><span>Acumulado após lançamento</span><span style="color:'+(newLiq>=0?'#15803d':'#dc2626')+';font-weight:500">'+(newLiq>=0?'':'-')+fmt(newLiq)+'</span></div>'
    +'<div class="prow" style="border:none"><span>Novo ROI</span><span style="color:'+(newRoi>=0?'#15803d':'#dc2626')+';font-weight:500">'+(newRoi!==null?fmtPct(newRoi):'N/A')+'</span></div></div>';
}

async function lancarReceita() {
  var cn=document.getElementById('f-car').value;
  var month=document.getElementById('f-month').value;
  var bruto=parseFloat(document.getElementById('f-bruto').value)||0;
  if(!month||bruto===0)return;
  var existing=null;
  for(var i=0;i<STATE.months.length;i++){if(STATE.months[i].car_name===cn&&STATE.months[i].month===month){existing=STATE.months[i];break;}}
  if(existing){await sbPatch('months','id=eq.'+existing.id,{bruto:bruto});}
  else{await sbPost('months',{car_name:cn,month:month,bruto:bruto});}
  document.getElementById('f-bruto').value='';
  await loadAll();
  var ok=document.getElementById('save-ok-r');ok.style.display='block';setTimeout(function(){ok.style.display='none';},2500);
  updatePreview(); renderReceitaList(); renderAdminStats(); renderAdminCars(); refreshCurrentView();
}

function renderReceitaList() {
  var el=document.getElementById('receita-saved-list');
  if(!el)return;
  var cn=document.getElementById('f-car').value;
  var all=STATE.months.filter(function(m){return m.car_name===cn;}).sort(function(a,b){return a.month.localeCompare(b.month);});
  if(all.length===0){el.innerHTML='<div class="empty-msg">Nenhuma receita lançada para este veículo.</div>';return;}
  var html='';
  for(var i=0;i<all.length;i++){
    var item=all[i];
    html+='<div class="manut-saved-item" style="background:#f0f9ff;border-color:#bae6fd;margin-bottom:8px">'
      +'<div class="manut-saved-top">'
      +'<div class="manut-saved-info"><div class="manut-saved-name" style="color:#0369a1"><i class="ti ti-calendar"></i> '+mlabel(item.month)+'</div>'
      +'<div class="manut-saved-sub">Receita bruta registrada</div></div>'
      +'<span class="manut-saved-val" style="color:#0369a1">'+fmt(item.bruto)+'</span></div>'
      +'<div class="manut-saved-actions"><button class="btn-edit" onclick="toggleEditReceita('+i+')"><i class="ti ti-edit"></i> Editar valor</button></div>'
      +'<div class="edit-inline" id="redit-'+i+'">'
      +'<div class="edit-row">'
      +'<input type="number" id="redit-val-'+i+'" value="'+item.bruto+'" step="0.01" min="0" placeholder="Novo valor ($)"/>'
      +'<button class="btn-save-edit" onclick="saveEditReceita(\''+item.id+'\','+i+')"><i class="ti ti-check"></i> Salvar</button>'
      +'<button class="btn-cancel-edit" onclick="toggleEditReceita('+i+')">Cancelar</button>'
      +'</div></div></div>';
  }
  el.innerHTML=html;
}

function toggleEditReceita(i){document.getElementById('redit-'+i).classList.toggle('open');}

async function saveEditReceita(id,i){
  var newVal=parseFloat(document.getElementById('redit-val-'+i).value)||0;
  if(newVal===0)return;
  await sbPatch('months','id=eq.'+id,{bruto:newVal});
  await loadAll();
  renderReceitaList();updatePreview();renderAdminStats();renderAdminCars();refreshCurrentView();
}

function updateManutPreview(){
  var cn=document.getElementById('m-car').value;
  var ym=document.getElementById('m-month').value;
  var valor=parseFloat(document.getElementById('m-valor').value)||0;
  var desc=document.getElementById('m-desc')?document.getElementById('m-desc').value.trim():'';
  var el=document.getElementById('manut-preview');
  if(!cn||!ym||valor===0){el.className='preview-empty';el.textContent='Preencha todos os campos para ver a prévia.';return;}
  el.className='';
  var c=calcCar(cn);
  var mo=null;
  for(var i=0;i<STATE.months.length;i++){if(STATE.months[i].car_name===cn&&STATE.months[i].month===ym){mo=STATE.months[i];break;}}
  var manuts=STATE.maintenances.filter(function(m){return m.car_name===cn&&m.month===ym;});
  var totalManut=0; for(var i=0;i<manuts.length;i++)totalManut+=manuts[i].value;
  var liqAtual=mo?mo.bruto-(mo.bruto*0.25)-52-7.75-totalManut:null;
  var liqApos=liqAtual!==null?liqAtual-valor:null;
  var newTotalLiq=(c?c.liquida:0)-valor;
  var newRoi=c&&c.invested>0?newTotalLiq/c.invested:null;
  var warnDesc=!desc?'<div style="color:#92400e;font-size:12px;margin-top:8px"><i class="ti ti-alert-triangle"></i> Digite o tipo de serviço para salvar.</div>':'';
  el.innerHTML='<div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-bottom:10px">'+cn+' — '+mlabel(ym)+'</div>'
    +'<div class="prow"><span>Serviço</span><span>'+(desc||'—')+'</span></div>'
    +'<div class="prow"><span>Valor</span><span style="color:#dc2626">-'+fmt(valor)+'</span></div>'
    +(liqAtual!==null?'<div style="margin-top:10px;padding-top:10px;border-top:1px solid #eef0f5">'
      +'<div class="prow"><span>Líquido '+mlabel(ym)+' atual</span><span style="color:'+(liqAtual>=0?'#15803d':'#dc2626')+'">'+(liqAtual>=0?'':'-')+fmt(liqAtual)+'</span></div>'
      +'<div class="prow"><span>Líquido '+mlabel(ym)+' após</span><span style="color:'+(liqApos>=0?'#15803d':'#dc2626')+';font-weight:500">'+(liqApos>=0?'':'-')+fmt(liqApos)+'</span></div></div>'
      :'<div style="color:#92400e;font-size:12px;margin-top:8px"><i class="ti ti-info-circle"></i> Mês sem receita lançada ainda.</div>')
    +'<div style="margin-top:10px;padding-top:10px;border-top:1px solid #eef0f5">'
    +'<div class="prow"><span>Retorno líquido total após</span><span style="color:'+(newTotalLiq>=0?'#15803d':'#dc2626')+';font-weight:500">'+(newTotalLiq>=0?'':'-')+fmt(newTotalLiq)+'</span></div>'
    +'<div class="prow" style="border:none"><span>Novo ROI</span><span style="color:'+(newRoi>=0?'#15803d':'#dc2626')+';font-weight:500">'+(newRoi!==null?fmtPct(newRoi):'N/A')+'</span></div></div>'+warnDesc;
}

async function lancarManut(){
  var cn=document.getElementById('m-car').value;
  var ym=document.getElementById('m-month').value;
  var valor=parseFloat(document.getElementById('m-valor').value)||0;
  var desc=document.getElementById('m-desc').value.trim();
  var errEl=document.getElementById('save-err-m');
  if(!desc){errEl.style.display='block';setTimeout(function(){errEl.style.display='none';},3000);return;}
  if(!ym||valor===0)return;
  await sbPost('maintenances',{car_name:cn,month:ym,description:desc,value:valor});
  document.getElementById('m-valor').value='';
  document.getElementById('m-desc').value='';
  await loadAll();
  var ok=document.getElementById('save-ok-m');ok.style.display='block';setTimeout(function(){ok.style.display='none';},2500);
  renderManutList();updateManutPreview();renderAdminStats();renderAdminCars();refreshCurrentView();
}

function renderManutList(){
  var cn=document.getElementById('m-car').value;
  var el=document.getElementById('manut-saved-list');
  var all=STATE.maintenances.filter(function(m){return m.car_name===cn;});
  if(all.length===0){el.innerHTML='<div class="empty-msg">Nenhuma manutenção lançada para este veículo.</div>';return;}
  var html='';
  for(var i=0;i<all.length;i++){
    var item=all[i];
    html+='<div class="manut-saved-item" id="msi-'+i+'">'
      +'<div class="manut-saved-top"><div class="manut-saved-info">'
      +'<div class="manut-saved-name"><i class="ti ti-tool"></i> '+item.description+'</div>'
      +'<div class="manut-saved-sub">'+mlabel(item.month)+'</div></div>'
      +'<span class="manut-saved-val">-'+fmt(item.value)+'</span></div>'
      +'<div class="manut-saved-actions">'
      +'<button class="btn-edit" onclick="toggleEditManut('+i+')"><i class="ti ti-edit"></i> Editar</button>'
      +'<button class="btn-del" onclick="deleteManut(\''+item.id+'\')"><i class="ti ti-trash"></i> Apagar</button></div>'
      +'<div class="edit-inline" id="edit-'+i+'">'
      +'<input type="text" id="edit-desc-'+i+'" value="'+item.description+'" placeholder="Tipo de serviço"/>'
      +'<div class="edit-row">'
      +'<input type="number" id="edit-val-'+i+'" value="'+item.value+'" step="0.01" min="0"/>'
      +'<button class="btn-save-edit" onclick="saveEditManut(\''+item.id+'\','+i+')"><i class="ti ti-check"></i> Salvar</button>'
      +'<button class="btn-cancel-edit" onclick="toggleEditManut('+i+')">Cancelar</button>'
      +'</div></div></div>';
  }
  el.innerHTML=html;
}

function toggleEditManut(i){document.getElementById('edit-'+i).classList.toggle('open');}

async function saveEditManut(id,i){
  var newDesc=document.getElementById('edit-desc-'+i).value.trim();
  var newVal=parseFloat(document.getElementById('edit-val-'+i).value)||0;
  if(!newDesc||newVal===0)return;
  await sbPatch('maintenances','id=eq.'+id,{description:newDesc,value:newVal});
  await loadAll();
  renderManutList();renderAdminStats();renderAdminCars();updateManutPreview();refreshCurrentView();
}

async function deleteManut(id){
  if(!confirm('Apagar esta manutenção?'))return;
  await sbDelete('maintenances','id=eq.'+id);
  await loadAll();
  renderManutList();renderAdminStats();renderAdminCars();updateManutPreview();refreshCurrentView();
}

function renderUserList(){
  document.getElementById('user-list').innerHTML=STATE.users.map(function(data,i){
    return '<div class="user-card">'
      +'<div class="user-card-top"><div>'
      +'<div class="user-name">'+data.name+(data.role==='admin'?' <span class="badge">Admin</span>':'')+'</div>'
      +'<div class="user-login">Usuário: <strong>'+data.username+'</strong></div></div>'
      +'<button class="btn-change-pass" onclick="togglePass('+i+')"><i class="ti ti-key"></i> Alterar senha</button></div>'
      +'<div class="pass-inline" id="pass-'+i+'">'
      +'<div class="pass-row">'
      +'<input type="password" id="new-pass-'+i+'" placeholder="Nova senha (mín. 6 caracteres)"/>'
      +'<button class="btn-save-edit" onclick="savePass(\''+data.id+'\','+i+')"><i class="ti ti-check"></i> Salvar</button>'
      +'<button class="btn-cancel-edit" onclick="togglePass('+i+')">Cancelar</button></div>'
      +'<div class="pass-ok" id="pass-ok-'+i+'"><i class="ti ti-circle-check"></i> Senha alterada!</div>'
      +'</div></div>';
  }).join('');
}

function togglePass(i){document.getElementById('pass-'+i).classList.toggle('open');}

async function savePass(id,i){
  var newPass=document.getElementById('new-pass-'+i).value.trim();
  if(!newPass||newPass.length<6){alert('A senha deve ter pelo menos 6 caracteres.');return;}
  await sbPatch('users','id=eq.'+id,{password:newPass});
  await loadAll();
  document.getElementById('new-pass-'+i).value='';
  var ok=document.getElementById('pass-ok-'+i);ok.style.display='block';
  setTimeout(function(){ok.style.display='none';togglePass(i);},2000);
}

function renderInvList(){
  document.getElementById('inv-list').innerHTML=STATE.users.filter(function(d){return d.role==='investor';})
    .map(function(d){return '<tr><td>'+d.name+'</td><td style="color:#9ca3af">'+d.username+'</td><td>'+(d.cars||[]).join(', ')+'</td></tr>';}).join('');
}

function populateSelects(){
  var opts=STATE.cars.map(function(c){return '<option value="'+c.name+'">'+c.name+'</option>';}).join('');
  document.getElementById('f-car').innerHTML=opts;
  document.getElementById('m-car').innerHTML=opts;
  var now=new Date();
  var ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  document.getElementById('f-month').value=ym;
  document.getElementById('m-month').value=ym;
  renderManutList();
  renderReceitaList();
  updatePreview();
  updateManutPreview();
}

function toggleCar(header){
  var body=header.nextElementSibling;
  body.classList.toggle('open');
  var nameEl=header.querySelector('.car-name');
  if(nameEl){
    if(body.classList.contains('open'))openCarNames[nameEl.textContent]=true;
    else delete openCarNames[nameEl.textContent];
  }
}

function showAdminTab(tab){
  var ids=['visao','lancar','usuarios'];
  document.querySelectorAll('.atab').forEach(function(t,i){t.className='atab'+(ids[i]===tab?' active':'');});
  ids.forEach(function(id){document.getElementById('atab-'+id).className='atab-content'+(id===tab?' active':'');});
}

function showSubTab(tab){
  ['receita','manut'].forEach(function(id){document.getElementById('sub-'+id).className='sub-content'+(id===tab?' active':'');});
  document.querySelectorAll('.stab').forEach(function(t,i){t.className='stab'+(['receita','manut'][i]===tab?' active':'');});
  if(tab==='manut')renderManutList();
  if(tab==='receita')renderReceitaList();
}
