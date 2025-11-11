// reminders.js
var Reminders = (function(){
  async function loadReminders(){
    const div = document.getElementById('listReminders');
    const ref = db.ref('reminders');
    ref.off('value');
    ref.orderByChild('createdAt').limitToLast(50).on('value', snap => {
      const data = snap.val() || {}; const arr = Object.keys(data).map(k=>({ id:k, ...data[k] })); arr.sort((a,b)=> (b.createdAt||0)-(a.createdAt||0)); div.innerHTML = ''; arr.forEach(d => { const dt = d.createdAt ? new Date(d.createdAt).toLocaleString() : '-'; div.innerHTML += `<div class="border-b p-2"><div class="font-medium">${d.title||'Reminder'}</div><div class="text-xs text-gray-500">${dt}</div><div class="text-sm mt-1">${d.message||''}</div></div>`; });
    });
  }

  async function autoMonthlySplitCheck(){
    const now = new Date(); const last = new Date(now.getFullYear(), now.getMonth()-1, 1); const period = `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}`;
    const repSnap = await db.ref('reports/' + period).once('value'); if (repSnap.exists()) return;
    await db.ref('reminders').push({ title: `Pembagian hasil untuk ${period}`, message: `Belum ada rekap pembagian hasil untuk periode ${period}.`, period, createdAt: Date.now(), processed:false });
  }

  function manualSplitNow(){ if(!confirm('Proses pembagian hasil untuk bulan lalu sekarang?')) return; const now = new Date(); const last = new Date(now.getFullYear(), now.getMonth()-1, 1); const period = `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}`; document.getElementById('reportMonth').value = period; Reports.generateReport(); }

  return { loadReminders, autoMonthlySplitCheck, manualSplitNow };
})();