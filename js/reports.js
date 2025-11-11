
// reports.js (updated to use finance node for accurate monthly rekap)
var Reports = (function(){
  const rupiah = n => 'Rp ' + (Number(n||0)).toLocaleString('id-ID');
  async function generateReport(){
    const el = document.getElementById('reportMonth').value; if (!el) return alert('Pilih bulan');
    const [year, month] = el.split('-').map(Number);
    const start = new Date(year, month-1, 1).getTime();
    const end = new Date(year, month, 1).getTime();
    // read finance totals in period
    const finSnap = await db.ref('finance').orderByChild('createdAt').startAt(start).endBefore(end).once('value');
    const fin = finSnap.val() || {}; let totalRevenue=0, totalCost=0, totalProfit=0; const txs = [];
    for(const k in fin){ totalRevenue += Number(fin[k].total||0); totalCost += Number(fin[k].cost||0); totalProfit += Number(fin[k].profit||0); txs.push(fin[k]); }
    // expenses
    const expensesSnap = await db.ref('expenses').orderByChild('createdAt').startAt(start).endBefore(end).once('value'); const expensesObj = expensesSnap.val() || {}; let totalExpenses=0; for(const k in expensesObj) totalExpenses += Number(expensesObj[k].amount||0);
    // users for distribution (on profit)
    const usersSnap = await db.ref('users').once('value'); const usersObj = usersSnap.val() || {}; const users = Object.keys(usersObj).map(k=>({ id:k, ...usersObj[k] }));
    const distribution = users.map(u => ({ name: u.name||u.email, email: u.email, percent: Number(u.percent||0), amount: Math.round(totalProfit * (Number(u.percent||0)/100)) }));
    const distributedSum = distribution.reduce((s,x)=>s+x.amount,0); const remainder = totalProfit - distributedSum; const netProfit = totalProfit - totalExpenses;
    document.getElementById('reportResult').innerHTML = `<p>Total Pendapatan: <b>${rupiah(totalRevenue)}</b></p><p>Total Modal: <b>${rupiah(totalCost)}</b></p><p>Total Pengeluaran: <b>${rupiah(totalExpenses)}</b></p><p>Profit Sebelum Pengeluaran: <b>${rupiah(totalProfit)}</b></p><p class='font-semibold'>Net Profit (setelah pengeluaran): <b>${rupiah(netProfit)}</b></p><h3 class="mt-3 font-semibold">Pembagian (dihitung dari profit sebelum pengeluaran):</h3><ul class="list-disc ml-6">${distribution.map(d=>`<li>${d.name} (${d.percent}%): <b>${rupiah(d.amount)}</b></li>`).join('')}<li>Remainder: <b>${rupiah(remainder)}</b></li></ul><div class="mt-3"><button class="bg-green-600 text-white px-3 py-2 rounded" onclick="Reports.saveMonthlySplit('${year}-${String(month).padStart(2,'0')}', ${totalProfit}, ${JSON.stringify(distribution)}, ${remainder})">Simpan Rekap</button></div>`;
  }

  async function saveMonthlySplit(period, profit, distribution, remainder){
    await db.ref('reports/' + period).set({ period, profit, distribution, remainder, createdAt: Date.now() });
    alert('Rekap tersimpan di reports node.');
  }

  function exportReportPDF(){ const el = document.getElementById('reportMonth').value; if (!el) return alert('Pilih bulan'); db.ref('reports/' + el).once('value').then(snap => { if (!snap.exists()) return alert('Belum ada rekap tersimpan.'); const d = snap.val(); const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFontSize(16); doc.text('Atlantis Corp - Rekap Bulanan',14,20); doc.setFontSize(12); doc.text(`Periode: ${d.period}`,14,30); doc.text(`Profit: ${rupiah(d.profit)}`,14,38); let y=48; d.distribution.forEach(item => { doc.text(`${item.name} (${item.percent}%): ${rupiah(item.amount)}`,14,y); y+=8 }); doc.text(`Remainder: ${rupiah(d.remainder)}`,14,y+6); doc.save(`rekap-${d.period}.pdf`); }); }

  document.getElementById('btnGenerateReport').addEventListener('click', generateReport);
  document.getElementById('btnExportReport').addEventListener('click', exportReportPDF);

  return { generateReport, saveMonthlySplit, exportReportPDF };
})();