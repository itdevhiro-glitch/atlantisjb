
// dashboard.js (updated to read finance node and transactions)
var Dashboard = (function(){
  const rupiah = n => 'Rp ' + (Number(n||0)).toLocaleString('id-ID');

  async function loadDashboard(){
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth()+1, 1).getTime();
    // Income & profit from finance node
    const finSnap = await db.ref('finance').orderByChild('createdAt').startAt(start).endBefore(end).once('value');
    const fin = finSnap.val() || {}; let totalIncome=0, totalProfit=0;
    for(const k in fin){ totalIncome += Number(fin[k].total||fin[k].price||0); totalProfit += Number(fin[k].profit||0); }
    document.getElementById('dashboard-income').textContent = rupiah(totalIncome);
    document.getElementById('dashboard-profit').textContent = rupiah(totalProfit);
    // Stock
    const invSnap = await db.ref('inventory').once('value'); const inv = invSnap.val() || {}; let totalStock=0; for(const k in inv) totalStock += inv[k].stock||0; document.getElementById('dashboard-stock').textContent = totalStock + ' unit';
    // Load latest transactions summary
    await loadLatestTransactions();
    // Build chart using finance aggregated by day
    await buildChart();
    // Preview split based on finance totals this month
    await previewSplit();
    // Finance details
    await updateFinanceOverview();
  }

  async function loadLatestTransactions(){
    const list = document.getElementById('latestTx');
    const snap = await db.ref('transactions').orderByChild('createdAt').limitToLast(10).once('value');
    const data = snap.val() || {}; const arr = Object.keys(data).map(k=>({ id:k, ...data[k] })); arr.sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
    list.innerHTML = '';
    arr.forEach(d => {
      let summary = '';
      if(Array.isArray(d.items)) summary = d.items.map(i=>`${i.name} x${i.qty}`).join(', ');
      else summary = d.name || '-';
      const dt = d.createdAt ? new Date(d.createdAt).toLocaleString() : '-';
      const pay = d.payment || (d.payment===undefined? (d.payment || '-') : d.payment);
      list.innerHTML += `<div class="border-b p-2"><div class="font-medium">${summary}</div><div class="text-xs text-gray-500">${dt} • ${pay}</div><div class="text-sm text-gray-700">Total: ${rupiah(d.totalPrice||d.total||0)}</div></div>`;
    });
  }

  async function buildChart(){
    // build daily income for last 7 days from finance node 'total' field
    const daySums = {};
    const now = new Date();
    for(let i=6;i>=0;i--){ const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-i); daySums[d.toISOString().slice(0,10)] = 0; }
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()-6).getTime();
    const snap = await db.ref('finance').orderByChild('createdAt').startAt(start).once('value');
    const data = snap.val() || {};
    for(const k in data){
      const key = data[k].createdAt ? new Date(data[k].createdAt).toISOString().slice(0,10) : null;
      if(key && key in daySums) daySums[key] += Number(data[k].total||data[k].price||0);
    }
    const labels = Object.keys(daySums);
    const vals = Object.values(daySums);
    const ctx = document.getElementById('chartSales').getContext('2d');
    if(window._salesChart) window._salesChart.destroy();
    window._salesChart = new Chart(ctx, { type:'line', data:{ labels, datasets:[{ label:'Pendapatan per hari', data: vals, tension:0.3, fill:true }] }, options:{ responsive:true, plugins:{ legend:{ display:false } } } });
  }

  async function previewSplit(){
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth()+1, 1).getTime();
    // Sum profit for month from finance nodes
    const snap = await db.ref('finance').orderByChild('createdAt').startAt(start).endBefore(end).once('value');
    const data = snap.val() || {}; let totalProfit=0;
    for(const k in data) totalProfit += Number(data[k].profit||0);
    const usersSnap = await db.ref('users').once('value'); const usersObj = usersSnap.val() || {}; const users = Object.keys(usersObj).map(k=>({ id:k, ...usersObj[k] }));
    const dist = users.map(u=> ({ name:u.name||u.email, percent:u.percent||0, amount: Math.round(totalProfit * ((u.percent||0)/100)) }));
    const container = document.getElementById('previewSplit');
    container.innerHTML = dist.map(d=>`<li class="py-1 flex justify-between"><span>${d.name} (${d.percent}%)</span><span>${rupiah(d.amount)}</span></li>`).join('');
    const remainder = totalProfit - dist.reduce((s,x)=>s+x.amount,0);
    container.innerHTML += `<li class="py-1 font-semibold flex justify-between"><span>Sisa (modal lanjut)</span><span>${rupiah(remainder)}</span></li>`;
  }

  async function updateFinanceOverview(){
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth()+1, 1).getTime();
    const finSnap = await db.ref('finance').orderByChild('createdAt').startAt(start).endBefore(end).once('value');
    const fin = finSnap.val() || {}; let income=0, expenses=0, profit=0;
    for(const k in fin) income += Number(fin[k].total||fin[k].price||0), profit += Number(fin[k].profit||0);
    const expSnap = await db.ref('expenses').orderByChild('createdAt').startAt(start).endBefore(end).once('value');
    const exp = expSnap.val() || {}; for(const k in exp) expenses += Number(exp[k].amount||0);
    document.getElementById('finance-income').textContent = rupiah(income);
    document.getElementById('finance-expenses').textContent = rupiah(expenses);
    document.getElementById('finance-net').textContent = rupiah(income - expenses);
    document.getElementById('financeDetails').innerHTML = `<p>Total Income: <b>${rupiah(income)}</b></p><p>Total Expenses: <b>${rupiah(expenses)}</b></p><p>Net Profit: <b>${rupiah(income - expenses)}</b></p>`;
  }

  return { loadDashboard, buildChart, previewSplit, updateFinanceOverview };
})(); 
