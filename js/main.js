// main.js - routing & init
(function(){
  // simple show page
  function show(page){
    document.querySelectorAll('.page').forEach(s=>s.classList.add('hidden'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.remove('hidden');
    // load page specific data
    if (page==='inventory') Inventory.loadInventory();
    if (page==='transactions') Transactions.loadTxList(); // load tx list
    if (page==='reports') Reports.generateReport; // no auto
    if (page==='reminders') Reminders.loadReminders();
    if (page==='users') Users.loadUsers();
    if (page==='dashboard') Dashboard.loadDashboard();
  }
  document.querySelectorAll('.navBtn').forEach(b=>b.addEventListener('click', ()=>show(b.getAttribute('data-page'))));

  // wire user add
  document.getElementById('btnAddUser').addEventListener('click', Users.addUserDoc);

  // initial values
  function initReportMonth(){ const now = new Date(); document.getElementById('reportMonth').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`; }

  // initial load
  show('dashboard');
  initReportMonth();
  Users.loadUsers();
  Inventory.loadInventory();
  Transactions.loadTxList(); // load tx list
  Reminders.loadReminders();
  Expenses.loadExpenses();
  Dashboard.loadDashboard();

  // expose for console
  window.show = show;
})();
