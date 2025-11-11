// expenses.js
var Expenses = (function(){
  const rupiah = n => 'Rp ' + (Number(n||0)).toLocaleString('id-ID');
  document.getElementById('formAddExpense').addEventListener('submit', async function(e){
    e.preventDefault();
    const type = document.getElementById('expType').value.trim();
    const amount = Number(document.getElementById('expAmount').value) || 0;
    const category = document.getElementById('expCategory').value;
    const note = document.getElementById('expNote').value.trim();
    if (!type || amount <= 0) return alert('Isi jenis dan jumlah pengeluaran dengan benar.');
    await db.ref('expenses').push({
      type, amount, category, note, createdAt: Date.now()
    });
    alert('Pengeluaran tersimpan.');
    clearExpenseForm();
  });

  function clearExpenseForm(){
    document.getElementById('expType').value='';
    document.getElementById('expAmount').value='';
    document.getElementById('expCategory').value='Modal';
    document.getElementById('expNote').value='';
  }

  function loadExpenses(){
    const div = document.getElementById('listExpenses');
    const ref = db.ref('expenses');
    ref.off('value');
    ref.orderByChild('createdAt').limitToLast(100).on('value', snap => {
      const data = snap.val() || {}; const arr = Object.keys(data).map(k=>({ id:k, ...data[k] }));
      arr.sort((a,b)=> (b.createdAt||0)-(a.createdAt||0)); div.innerHTML = '';
      arr.forEach(d=>{
        const dt = d.createdAt ? new Date(d.createdAt).toLocaleString() : '-';
        div.innerHTML += `<div class="border-b p-2"><div class="flex justify-between"><div><div class="font-medium">${d.type} <span class="text-xs text-gray-500">(${d.category})</span></div><div class="text-xs text-gray-500">${d.note}</div></div><div class="text-right">${rupiah(d.amount)}<div class="text-xs text-gray-400">${dt}</div></div></div></div>`;
      });
    });
  }

  return { clearExpenseForm, loadExpenses };
})();