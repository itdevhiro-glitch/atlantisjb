
// transactions.js (updated to support cart, auto-cost from inventory, and improved invoice layout)
var Transactions = (function(){
  const rupiah = n => 'Rp ' + (Number(n||0)).toLocaleString('id-ID');
  let cart = []; // { itemId, name, qty, price, cost, type }

  function renderCart(){
    const el = document.getElementById('txCart');
    if(!el) return;
    if(cart.length===0) { el.innerHTML = '<li class="text-sm text-gray-500">Cart kosong</li>'; return; }
    el.innerHTML = cart.map((c,idx)=>`<li class="flex justify-between items-center"><div><div class="font-medium">${c.name} ${c.type==='JUAL'?'(Barang)':'(Service)'}</div><div class="text-xs text-gray-500">Qty: ${c.qty} • Unit: ${rupiah(c.price)} • Modal/unit: ${rupiah(c.cost)}</div></div><div><button class="px-2 py-1 bg-yellow-100 rounded mr-1" onclick="Transactions.editCart(${idx})">Edit</button><button class="px-2 py-1 bg-red-100 rounded" onclick="Transactions.removeFromCart(${idx})">Remove</button></div></li>`).join('');
  }

  async function addToCart(){
    const type = document.getElementById('txType').value;
    const itemId = document.getElementById('txItem').value || null;
    const qty = Math.max(1, Number(document.getElementById('txQty').value) || 1);
    const nameField = document.getElementById('txName').value.trim();
    if(type === 'JUAL'){
      if(!itemId) return alert('Pilih item dari inventory untuk tipe JUAL.');
      const snap = await db.ref('inventory/' + itemId).once('value');
      if(!snap.exists()) return alert('Item tidak ditemukan.');
      const d = snap.val();
      cart.push({ itemId, name: d.name, qty, price: Number(d.price)||0, cost: Number(d.cost)||0, type:'JUAL' });
    } else { // SERVICE
      if(!nameField) return alert('Isi deskripsi service di field Nama.');
      // For service, ask for unit price via prompt (quick UX) - default 0
      let price = prompt('Masukkan harga service (per unit) dalam angka (tanpa simbol):', '0');
      if(price===null) return; price = Number(price) || 0;
      cart.push({ itemId: null, name: nameField, qty, price, cost: 0, type:'SERVICE' });
    }
    renderCart();
  }

  function editCart(idx){
    const c = cart[idx];
    if(!c) return;
    const newQty = prompt('Ubah qty:', c.qty);
    if(newQty===null) return;
    cart[idx].qty = Math.max(1, Number(newQty) || 1);
    if(c.type==='SERVICE'){
      const newPrice = prompt('Ubah harga per unit:', c.price);
      if(newPrice!==null) cart[idx].price = Number(newPrice) || 0;
    }
    renderCart();
  }

  function removeFromCart(idx){
    cart.splice(idx,1);
    renderCart();
  }

  async function checkoutAndSave(e){
    e.preventDefault();
    if(cart.length===0) return alert('Cart kosong. Tambahkan item terlebih dahulu.');
    const customer = document.getElementById('txCustomer').value.trim() || '-';
    const payment = document.getElementById('txPayment') ? document.getElementById('txPayment').value : 'Cash';
    const createdAt = Date.now();
    // prepare transaction payload as single doc with items[]
    const items = cart.map(c=>({ itemId: c.itemId, name: c.name, qty: c.qty, price: c.price, cost: c.cost, type: c.type }));
    const totalPrice = items.reduce((s,i)=>s + (i.price * i.qty), 0);
    const totalCost = items.reduce((s,i)=>s + (i.cost * i.qty), 0);
    const profit = totalPrice - totalCost;
    const payload = { type: 'BUNDLE', items, customer, payment, totalPrice, totalCost, profit, createdAt };
    const txRef = await db.ref('transactions').push(payload);
    const txId = txRef.key;
    // decrement inventory for JUAL items
    for(const it of items){
      if(it.type==='JUAL' && it.itemId){
        for(let q=0;q<it.qty;q++){
          await db.ref('inventory/' + it.itemId).transaction(cur => {
            if (cur === null) return cur;
            cur.stock = Math.max(0, (cur.stock||0) - 1);
            return cur;
          });
        }
      }
    }
    // create invoice PDF and save finance metadata (totals)
    const invoiceId = await createInvoiceAndSaveMetadata({ id: txId, customer, items, totalPrice, totalCost, profit, createdAt });
    await db.ref('transactions/' + txId).update({ invoiceId });
    // save to finance node totals for accurate aggregation
    await db.ref('finance').push({ invoiceId, transactionId: txId, total: totalPrice, cost: totalCost, profit, payment, createdAt: Date.now() });
    alert('Transaksi tersimpan & invoice dibuat');
    clearTxForm();
    cart = [];
    renderCart();
  }

  function clearTxForm(){ ['txItem','txName','txCustomer','txQty'].forEach(id=>document.getElementById(id).value=''); cart=[]; renderCart(); }

  async function loadTxList(){
    const list = document.getElementById('listTx');
    const refTx = db.ref('transactions');
    refTx.off('value');
    refTx.orderByChild('createdAt').limitToLast(50).on('value', snap => {
      const data = snap.val() || {};
      const arr = Object.keys(data).map(k=>({ id:k, ...data[k] }));
      arr.sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
      list.innerHTML = '';
      arr.forEach(d => {
        const dt = d.createdAt ? new Date(d.createdAt).toLocaleString() : '-';
        // build items summary
        let summary = '';
        if(Array.isArray(d.items)){
          summary = d.items.map(i=>`${i.name} x${i.qty}`).join(', ');
        } else {
          summary = d.name || '-';
        }
        list.innerHTML += `<div class="border-b p-2 flex justify-between"><div><div class="font-medium">${summary}</div><div class="text-xs text-gray-500">${(d.type||'') } • ${d.customer||'-'} • ${dt}</div><div class="text-xs text-gray-500">Profit: ${rupiah(d.profit||d.profit)}</div></div><div class="text-right"><div class="font-semibold">${rupiah(d.totalPrice||d.price||0)}</div>${d.invoiceId?`<a href="#" onclick="Transactions.regenerateInvoiceForTransaction('${d.invoiceId}')" class="text-indigo-600 text-xs">Download</a>`:''}</div></div>`;
      });
    });
  }

  // Improved invoice layout: render multi-row table with page-break handling
  async function createInvoiceAndSaveMetadata(tx){
    const { jsPDF } = window.jspdf || {};
    const invoiceId = 'INV-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + (Math.floor(Math.random()*9000)+1000);
    try {
      if (jsPDF) {
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 40;
        const usableWidth = pageWidth - margin*2;
        const lineHeight = 14;
        const teal = '#19B4C4';
        const dark = '#0b3a46';
        // header
        doc.setFillColor(teal);
        doc.rect(0, 0, pageWidth, 64, 'F');
        doc.setFontSize(20);
        doc.setTextColor(255,255,255);
        doc.text('Aqua Tech', margin, 40);
        doc.setFontSize(9);
        doc.text('Jl. H. Daiman No. 45, Ciledug', margin, 56);
        doc.setTextColor(dark);
        doc.setFontSize(18);
        doc.text('INVOICE', pageWidth - margin - 80, 40);
        doc.setFontSize(10);
        doc.text(`Invoice #: ${invoiceId}`, pageWidth - margin - 180, 60);
        doc.text(`Tanggal: ${new Date(tx.createdAt || Date.now()).toLocaleDateString('id-ID')}`, pageWidth - margin - 180, 76);
        // bill to
        let y = 110;
        doc.setFontSize(10);
        doc.text('Bill to:', margin, y);
        doc.setFontSize(10);
        doc.text(tx.customer || '-', margin, y + lineHeight);
        // table header
        y += 36;
        doc.setFillColor(teal);
        doc.rect(margin, y - 12, usableWidth, 20, 'F');
        doc.setFontSize(10);
        doc.setTextColor(255,255,255);
        doc.text('Description', margin+6, y);
        doc.text('Unit', margin + usableWidth*0.6, y);
        doc.text('Qty', margin + usableWidth*0.75, y);
        doc.text('Amount', margin + usableWidth - 6, y, {align:'right'});
        doc.setTextColor(0,0,0);
        y += 12;
        const items = tx.items || (tx.items ? tx.items : []);
        // rows
        for(const it of items){
          y += lineHeight;
          // page break
          if(y > doc.internal.pageSize.getHeight() - 100){
            doc.addPage();
            y = 60;
          }
          // description wrap if long
          const desc = `${it.name}`;
          const maxWidthDesc = usableWidth*0.58;
          const splitted = doc.splitTextToSize(desc, maxWidthDesc);
          doc.text(splitted, margin+6, y);
          const linesUsed = splitted.length;
          // unit price
          doc.text(rupiah(it.price), margin + usableWidth*0.6, y);
          doc.text(String(it.qty), margin + usableWidth*0.75, y);
          doc.text(rupiah((it.price * it.qty)), margin + usableWidth - 6, y, {align:'right'});
          y += (lineHeight * (linesUsed-1));
        }
        // totals
        y += 20;
        doc.setFontSize(11);
        doc.text('Subtotal', margin + usableWidth*0.6, y);
        doc.text(rupiah(tx.totalPrice || 0), margin + usableWidth - 6, y, {align:'right'});
        y += 18;
        doc.setFontSize(13);
        doc.text('TOTAL', margin + usableWidth*0.6, y);
        doc.text(rupiah(tx.totalPrice || 0), margin + usableWidth - 6, y, {align:'right'});
        // footer
        y += 40;
        doc.setFontSize(9);
        const paymentFieldCandidates = ['payment','method','paymentMethod','payMethod','bank','payment_type'];
        let paymentLabel = 'Payment Method: -';
        for(const k of paymentFieldCandidates){ if(tx[k]){ paymentLabel = `Payment Method: ${tx[k]}`; break; } }
        doc.text(paymentLabel, margin, y);
        doc.text('Terima kasih atas kepercayaan Anda.', margin, y + 18);
        // save
        doc.save(`Invoice-AquaTech-${invoiceId}.pdf`);
      }
    } catch(err){
      console.error('Error generating invoice PDF', err);
    }

    // Save metadata and finance records
    try {
      const meta = {
        invoiceId,
        transactionId: tx.id,
        customer: tx.customer || '-',
        total: Number(tx.totalPrice || tx.price || 0),
        createdAt: Date.now()
      };
      await db.ref('invoices').push(meta);
      // finance node handled where checkout called; keep redundancy safe
      return invoiceId;
    } catch(e){
      console.error('Error saving invoice metadata/finance', e);
      return invoiceId;
    }
  }

  async function regenerateInvoiceForTransaction(invoiceIdOrTxId){
    try{
      let txId = null;
      const invSnap = await db.ref('invoices').orderByChild('invoiceId').equalTo(invoiceIdOrTxId).once('value');
      if (invSnap.exists()){
        const key = Object.keys(invSnap.val())[0];
        const meta = invSnap.val()[key];
        txId = meta.transactionId;
      } else {
        txId = invoiceIdOrTxId;
      }
      if (!txId) return alert('Transaksi tidak ditemukan untuk invoice ini.');
      const txSnap = await db.ref('transactions/' + txId).once('value');
      if (!txSnap.exists()) return alert('Transaksi tidak ditemukan.');
      const tx = txSnap.val();
      tx.id = txId;
      await createInvoiceAndSaveMetadata(tx);
    }catch(e){
      console.error('regenerateInvoiceForTransaction error', e);
      alert('Gagal generate invoice: ' + (e.message||e));
    }
  }

  // wire UI
  document.getElementById('btnAddToCart').addEventListener('click', addToCart);
  document.getElementById('formAddTx').addEventListener('submit', checkoutAndSave);

  return { createInvoiceAndSaveMetadata, clearTxForm, loadTxList, regenerateInvoiceForTransaction, editCart, removeFromCart };
})();
