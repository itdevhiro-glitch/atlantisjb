// auth.js
var Auth = (function(){
  const btnAuth = document.getElementById('btnAuth');
  const btnLogout = document.getElementById('btnLogout');
  function openAuth(){ document.getElementById('authModal').classList.remove('hidden'); }
  function closeAuth(){ document.getElementById('authModal').classList.add('hidden'); document.getElementById('authMsg').textContent=''; }
  async function login(){ try{ await auth.signInWithEmailAndPassword(document.getElementById('authEmail').value.trim(), document.getElementById('authPass').value); closeAuth(); }catch(e){ document.getElementById('authMsg').textContent = e.message } }
  async function register(){ try{ const u = await auth.createUserWithEmailAndPassword(document.getElementById('authEmail').value.trim(), document.getElementById('authPass').value); await db.ref('users/' + u.user.uid).set({ name: u.user.email.split('@')[0], email: u.user.email, role:'viewer', percent:0, createdAt: Date.now() }); closeAuth(); alert('Akun terdaftar. Minta admin atur role.'); }catch(e){ document.getElementById('authMsg').textContent = e.message } }
  function logout(){ auth.signOut(); }
  auth.onAuthStateChanged(async user => {
    window.currentUser = user;
    if (user){
      btnLogout.classList.remove('hidden');
      btnAuth.classList.add('hidden');
      const email = user.email;
      let role = 'viewer', percent = 0, name = email.split('@')[0];
      if (email === 'bimaadhitya@atlantis.net') { role = 'admin'; percent = 25; name = 'Bima Adhitya'; }
      else if (email === 'rahmathidayat@atlantis.net') { role = 'staff'; percent = 20; name = 'Rahmat Hidayat'; }
      else if (email === 'faisalramadhan@atlantis.net') { role = 'staff'; percent = 10; name = 'Faisal Ramadhan'; }
      const usersRef = db.ref('users');
      const snap = await usersRef.orderByChild('email').equalTo(email).once('value');
      if (!snap.exists()) {
        await usersRef.push({ name, email, role, percent, createdAt: Date.now() });
      } else {
        const key = Object.keys(snap.val())[0];
        await usersRef.child(key).update({ name, role, percent });
      }
      document.getElementById('userInfo').innerHTML =
        `<div class="font-semibold">${name}</div>
         <div class="text-xs text-gray-500">${email}</div>
         <div class="text-xs text-indigo-600">Role: ${role} • Share: ${percent}%</div>`;
      Dashboard.loadDashboard();
      Reminders.autoMonthlySplitCheck();
    } else {
      btnLogout.classList.add('hidden');
      btnAuth.classList.remove('hidden');
      document.getElementById('userInfo').textContent = 'Belum login';
    }
  });
  // wire modal buttons
  document.getElementById('btnLogin').addEventListener('click', login);
  document.getElementById('btnRegister').addEventListener('click', register);
  return { openAuth, closeAuth, logout };
})();
