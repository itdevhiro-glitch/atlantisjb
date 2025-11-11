
// reports.js (uses transactions node to compute per-payment-method totals and overall summary)
var Reports = (function(){
  const rupiah = n => 'Rp ' + (Number(n||0)).toLocaleString('id-ID');
  async function generateReport(){
    const el = document.getElementById('reportMonth').value; if (!el) return alert('Pilih bulan');
    const [year, month] = el.split('-').map(Number);
    const start = new Date(year, month-1, 1).getTime();
    const end = new Date(year, month, 1).getTime() - 1;
    // read transactions in period (use createdAt)
    const txSnap = await db.ref('transactions').orderByChild('createdAt').startAt(start).endAt(end).once('value');
    const txsObj = txSnap.val() || {};
    const methods = {}; // payment -> {count, totalPrice, totalCost, totalProfit}
    let totalRevenue = 0, totalCost = 0, totalProfit = 0, txCount = 0;
    for(const k in txsObj){
      const t = txsObj[k];
      const payment = t.payment || 'Unknown';
      const price = Number(t.totalPrice || t.total || 0);
      const cost = Number(t.totalCost || 0);
      const profit = Number(t.profit || (price - cost) || 0);
      if(!methods[payment]) methods[payment] = { count:0, totalPrice:0, totalCost:0, totalProfit:0 };
      methods[payment].count += 1;
      methods[payment].totalPrice += price;
      methods[payment].totalCost += cost;
      methods[payment].totalProfit += profit;
      totalRevenue += price;
      totalCost += cost;
      totalProfit += profit;
      txCount += 1;
    }

    // expenses in period
    const expSnap = await db.ref('expenses').orderByChild('createdAt').startAt(start).endAt(end).once('value');
    const expObj = expSnap.val() || {};
    let totalExpenses = 0;
    for(const k in expObj){ totalExpenses += Number(expObj[k].amount || 0); }

    // build HTML result
    let html = `<h3 class="text-lg font-semibold">Rekap ${el}</h3>`;
    html += `<p>Transaksi: ${txCount} | Pendapatan: ${rupiah(totalRevenue)} | Biaya: ${rupiah(totalCost)} | Laba Kotor: ${rupiah(totalProfit)} | Pengeluaran: ${rupiah(totalExpenses)} | Laba Bersih: ${rupiah(totalProfit - totalExpenses)}</p>`;
    html += '<h4 class="mt-3 font-medium">Rincian per metode pembayaran</h4>';
    html += '<table class="w-full text-sm"><thead><tr><th>Metode</th><th>Count</th><th>Penjualan</th><th>Cost</th><th>Profit</th></tr></thead><tbody>';
    for(const m in methods){
      html += `<tr><td>${m}</td><td>${methods[m].count}</td><td>${rupiah(methods[m].totalPrice)}</td><td>${rupiah(methods[m].totalCost)}</td><td>${rupiah(methods[m].totalProfit)}</td></tr>`;
    }
    html += `</tbody></table>`;
    html += `<div class="mt-3"><button id="btnSaveSplit" class="px-3 py-1 bg-blue-600 text-white rounded">Simpan Rekap</button></div>`;
    document.getElementById('reportResult').innerHTML = html;

    document.getElementById('btnSaveSplit').addEventListener('click', function(){
      const period = el;
      const netProfit = totalProfit - totalExpenses;
      const distribution = methods; // keep it simple: store the methods breakdown
      Reports.saveMonthlySplit(period, netProfit, distribution, 0);
    });
  }

  async function saveMonthlySplit(period, profit, distribution, remainder){
    await db.ref('reports/' + period).set({ period, profit, distribution, remainder, createdAt: Date.now() });
    alert('Rekap tersimpan di reports node.');
  }

  function exportReportPDF(){
    // minimal PDF export using window.print fallback or jsPDF if available.
    const content = document.getElementById('reportResult').innerText || document.getElementById('reportResult').innerHTML;
    const w = window.open('', '_blank');
    w.document.write('<pre>' + content + '</pre>');
    w.document.close();
    w.print();
  }

  document.getElementById('btnGenerateReport').addEventListener('click', generateReport);
  document.getElementById('btnExportReport').addEventListener('click', exportReportPDF);

  return { generateReport, saveMonthlySplit, exportReportPDF };
})();