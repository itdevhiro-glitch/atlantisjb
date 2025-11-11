// users.js
var Users = (function(){
  const DEFAULT_TEAM = [
    { name: "Bima Adhitya", email: "bimaadhitya@atlantis.net", percent: 50, role: "admin" },
    { name: "Rahmat Hidayat", email: "rahmathidayat@atlantis.net", percent: 20, role: "staff" },
    { name: "Faisal Ramadhan", email: "faisalramadhan@atlantis.net", percent: 10, role: "staff" },
  ];
  async function seedTeam(){
    if(!confirm('Seed team?')) return;
    const usersRef = db.ref('users');
    const snap = await usersRef.once('value');
    const existing = snap.val() || {};
    for (const t of DEFAULT_TEAM){
      let found = null;
      for (const k in existing) if (existing[k].email === t.email) { found = k; break; }
      if (!found) await usersRef.push({ name:t.name, email:t.email, role:t.role, percent:t.percent, createdAt: Date.now() });
      else await usersRef.child(found).update({ name:t.name, role:t.role, percent:t.percent });
    }
    alert('Team seeded.');
  }

  async function addUserDoc(){
    const name = document.getElementById('uName').value.trim();
    const email = document.getElementById('uEmail').value.trim();
    const role = document.getElementById('uRole').value;
    const percent = Number(document.getElementById('uPercent').value) || 0;
    if (!email) return alert('Email wajib');
    const ref = db.ref('users');
    const existing = await ref.orderByChild('email').equalTo(email).once('value');
    const val = existing.val();
    if (!val) await ref.push({ name, email, role, percent, createdAt: Date.now() }); else { const k = Object.keys(val)[0]; await ref.child(k).update({ name, role, percent, updatedAt: Date.now() }); }
    alert('User saved');
  }

  function loadUsers(){
    const div = document.getElementById('tblUsers');
    const ref = db.ref('users');
    ref.off('value');
    ref.orderByChild('createdAt').on('value', snap => {
      const data = snap.val() || {}; const arr = Object.keys(data).map(k=>({ id:k, ...data[k] })); arr.sort((a,b)=> (b.createdAt||0)-(a.createdAt||0)); div.innerHTML = ''; arr.forEach(d => { div.innerHTML += `<div class="border-b p-2 flex justify-between items-center"><div><div class="font-medium">${d.name || d.email}</div><div class="text-xs text-gray-500">${d.email} • ${d.role} • ${d.percent}%</div></div><div><button onclick="Users.editUser('${d.id}')" class="px-2 py-1 bg-yellow-100 rounded mr-1">Edit</button><button onclick="Users.deleteUser('${d.id}')" class="px-2 py-1 bg-red-100 rounded">Hapus</button></div></div>`; });
    });
  }

  async function editUser(id){ const snap = await db.ref('users/' + id).once('value'); if(!snap.exists()) return; const d = snap.val(); document.getElementById('uName').value = d.name || ''; document.getElementById('uEmail').value = d.email || ''; document.getElementById('uRole').value = d.role || 'viewer'; document.getElementById('uPercent').value = d.percent || 0; }
  async function deleteUser(id){ if(!confirm('Hapus user?')) return; await db.ref('users/' + id).remove(); }

  return { seedTeam, addUserDoc, loadUsers, editUser, deleteUser };
})();