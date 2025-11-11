// inventory.js
var Inventory = (function(){
  const rupiah = n => 'Rp ' + (Number(n||0)).toLocaleString('id-ID');
  function clearItemForm(){ ['itemId','itemName','itemCategory','itemStock','itemSerial','itemCost','itemPrice','itemDesc'].forEach(id=>document.getElementById(id).value=''); }
  async function loadInventory(){
    const tbody = document.getElementById('tblInventory');
    const sel = document.getElementById('txItem');
    const refInv = db.ref('inventory');
    refInv.off('value');
    refInv.orderByChild('createdAt').on('value', snap => {
      const data = snap.val() || {};
      tbody.innerHTML = '';
      sel.innerHTML = '<option value="">-- Pilih dari inventory --</option>';
      const arr = Object.keys(data).map(k => ({ id:k, ...data[k] }));
      arr.sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
      arr.forEach(d => {
        tbody.innerHTML += `<tr class="border-b"><td class="p-2">${d.name}</td><td class="p-2">${d.category}</td><td class="p-2 text-center">${d.stock}</td><td class="p-2 text-right">${rupiah(d.cost)}</td><td class="p-2 text-right">${rupiah(d.price)}</td><td class="p-2 text-sm"><button onclick="Inventory.previewProduct('${d.id}')" class="px-2 py-1 bg-blue-100 rounded mr-1">Preview</button><button onclick="Inventory.editItem('${d.id}')" class="px-2 py-1 bg-yellow-100 rounded mr-1">Edit</button><button onclick="Inventory.deleteItem('${d.id}')" class="px-2 py-1 bg-red-100 rounded">Hapus</button></td></tr>`;
        sel.innerHTML += `<option value="${d.id}" data-price="${d.price}" data-cost="${d.cost}">${d.name} (${d.stock})</option>`;
      });
    });
  }
  async function editItem(id){
    const snap = await db.ref('inventory/' + id).once('value');
    if (!snap.exists()) return alert('Tidak ditemukan');
    const d = snap.val();
    document.getElementById('itemId').value = id;
    document.getElementById('itemName').value = d.name;
    document.getElementById('itemCategory').value = d.category;
    document.getElementById('itemStock').value = d.stock;
    document.getElementById('itemSerial').value = d.serial;
    document.getElementById('itemCost').value = d.cost;
    document.getElementById('itemPrice').value = d.price;
    document.getElementById('itemDesc').value = d.desc;
    window.scrollTo({ top:0, behavior:'smooth' });
  }
  async function deleteItem(id){
    if (!confirm('Hapus item?')) return;
    await db.ref('inventory/' + id).remove();
  }
  async function previewProduct(id){
    const snap = await db.ref('inventory/' + id).once('value');
    if (!snap.exists()) return alert('Produk tidak ditemukan');
    const d = snap.val();
    const html = `
      <p><b>Nama:</b> ${d.name}</p>
      <p><b>Kategori:</b> ${d.category}</p>
      <p><b>Serial:</b> ${d.serial || '-'}</p>
      <p><b>Stok:</b> ${d.stock} unit</p>
      <p><b>Harga Jual:</b> ${rupiah(d.price)}</p>
      <p><b>Modal:</b> ${rupiah(d.cost)}</p>
      <p><b>Deskripsi:</b> ${d.desc || '-'}</p>
    `;
    document.getElementById('previewContent').innerHTML = html;
    const modal = document.getElementById('productPreviewModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  function closePreview(){
    const modal = document.getElementById('productPreviewModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  // form submit
  document.getElementById('formAddItem').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('itemId').value || null;
    const payload = {
      name: document.getElementById('itemName').value.trim(),
      category: document.getElementById('itemCategory').value.trim(),
      stock: Number(document.getElementById('itemStock').value) || 0,
      serial: document.getElementById('itemSerial').value.trim() || '',
      cost: Number(document.getElementById('itemCost').value) || 0,
      price: Number(document.getElementById('itemPrice').value) || 0,
      desc: document.getElementById('itemDesc').value.trim() || '',
      updatedAt: Date.now()
    };
    if (!payload.name) return alert('Isi nama');
    const invRef = db.ref('inventory');
    if (id) {
      await invRef.child(id).update(payload);
      alert('Item diupdate');
    } else {
      payload.createdAt = Date.now();
      await invRef.push(payload);
      alert('Item ditambahkan');
    }
    clearItemForm();
  });

  return { loadInventory, editItem, deleteItem, previewProduct, closePreview, clearItemForm };
})();