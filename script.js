'use strict';

// ============================================================
// Supabase Setup
// ============================================================
const supabaseUrl = 'https://ofmoucnzuwawtophtpto.supabase.co';
const supabaseKey = 'sb_publishable_N4PEkpaKh8PA8Yz3BDN4qQ_k_1dQuxa';

let supabaseClient = null;
try {
  if (window.supabase) supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} catch (err) { console.error("Supabase Error:", err); }

// ============================================================
// Storage Manager
// ============================================================
const StorageManager = {
  async initSync() {
    if (!supabaseClient) return false;
    try {
      const { data, error } = await supabaseClient.from('app_data').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        data.forEach(row => localStorage.setItem(row.id, JSON.stringify(row.data)));
        if (UIManager.currentPage === 'inventory-input') InventoryManager.renderTable();
        if (UIManager.currentPage === 'products') ProductManager.renderTable();
        if (UIManager.currentPage === 'final-report') ReportManager.render();
        if (UIManager.currentPage === 'history') HistoryManager.render();
        UIManager.updateSidebarStats();
      }
      supabaseClient.channel('public:app_data')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data' }, payload => {
          if (payload.new && payload.new.id) localStorage.setItem(payload.new.id, JSON.stringify(payload.new.data));
          else if (payload.eventType === 'DELETE') localStorage.removeItem(payload.old.id);
          
          if (UIManager.currentPage === 'inventory-input') InventoryManager.renderTable();
          if (UIManager.currentPage === 'products') ProductManager.renderTable();
          if (UIManager.currentPage === 'final-report') ReportManager.render();
          if (UIManager.currentPage === 'history') HistoryManager.render();
          UIManager.updateSidebarStats();
        }).subscribe();
      return true;
    } catch (e) { return false; }
  },

  get(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (supabaseClient) supabaseClient.from('app_data').upsert({ id: key, data: value }).then();
    } catch (e) {}
  },
  remove(key) { localStorage.removeItem(key); if (supabaseClient) supabaseClient.from('app_data').delete().eq('id', key).then(); },

  getProducts()  { return this.get('wms_products')  || []; },
  saveProducts(p){ this.set('wms_products', p); },
  getInventory()  { return this.get('wms_inventory')  || {}; },
  saveInventory(i){ this.set('wms_inventory', i); },
  getEquations()  { return this.get('wms_equations')  || {}; },
  saveEquations(e){ this.set('wms_equations', e); },
  getApproved()  { return this.get('wms_approved')  || {}; },
  saveApproved(a){ this.set('wms_approved', a); },
  getHistory()   { return this.get('wms_history')   || []; },
  saveHistory(h) { this.set('wms_history', h); },
};

// ============================================================
// Auth & Toast & UI Managers
// ============================================================
const AuthManager = {
  init() {
    const isAuth = sessionStorage.getItem('wms_auth');
    const loginModal = document.getElementById('loginModal');
    if (isAuth !== 'true' && loginModal) { loginModal.style.display = 'flex'; loginModal.classList.add('open'); }
    document.getElementById('loginPassword')?.addEventListener('keypress', e => { if (e.key === 'Enter') this.login(); });
  },
  login() {
    const passInput = document.getElementById('loginPassword');
    if (passInput.value === '123456') {
      sessionStorage.setItem('wms_auth', 'true');
      document.getElementById('loginModal').style.display = 'none';
      ToastManager.success('تم تسجيل الدخول', 'أهلاً بك في النظام');
    } else {
      ToastManager.error('خطأ', 'الرقم السري غير صحيح'); passInput.value = ''; passInput.focus();
    }
  }
};

const ToastManager = {
  show(title, message = '', type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if(!container) return;
    const toast = document.createElement('div'); toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-content"><div class="toast-title">${title}</div>${message ? `<div class="toast-msg">${message}</div>` : ''}</div>`;
    container.appendChild(toast);
    toast._timer = setTimeout(() => { toast.classList.add('removing'); setTimeout(()=>toast.remove(), 260); }, duration);
  },
  success(t, m) { this.show(t, m, 'success'); }, error(t, m) { this.show(t, m, 'error'); }, warning(t, m) { this.show(t, m, 'warning'); }, info(t, m) { this.show(t, m, 'info'); }
};

const UIManager = {
  currentPage: 'inventory-input',
  pageTitles: { 'inventory-input': 'إدخال الجرد', 'final-report': 'التقرير النهائي', 'history': 'سجل الجرد', 'products': 'إدارة المنتجات' },
  init() { this.updateDate(); setInterval(() => this.updateDate(), 60000); this.updateSidebarStats(); },
  navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`); if (pageEl) pageEl.classList.add('active');
    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`); if (navEl) navEl.classList.add('active');
    document.getElementById('topbarTitle').textContent = this.pageTitles[page] || '';
    this.currentPage = page;
    if (page === 'inventory-input') InventoryManager.renderTable();
    if (page === 'final-report') ReportManager.render();
    if (page === 'history') HistoryManager.render();
    if (page === 'products') ProductManager.renderTable();
    this.closeSidebar();
  },
  toggleSidebar() { 
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const mainContent = document.getElementById('mainContent');
    if (window.innerWidth >= 769) {
      sidebar.classList.toggle('closed');
      mainContent.classList.toggle('expanded');
    } else {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    }
  },
  closeSidebar() { 
    if(window.innerWidth < 769) {
      document.getElementById('sidebar').classList.remove('open'); 
      document.getElementById('sidebarOverlay').classList.remove('open'); 
    }
  },
  updateDate() { document.getElementById('currentDate').textContent = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); },
  updateSidebarStats() { document.getElementById('sidebarProductCount').textContent = StorageManager.getProducts().length; document.getElementById('sidebarHistoryCount').textContent = StorageManager.getHistory().length; },
  closeHistoryModal() { document.getElementById('historyModal').classList.remove('open'); },
  showConfirm(title, message, onConfirm) {
    const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML = `<div class="confirm-modal"><div class="confirm-title">${title}</div><div class="confirm-message">${message}</div><div class="confirm-actions"><button class="btn btn-ghost" id="confirmCancel">إلغاء</button><button class="btn btn-danger" id="confirmOk">تأكيد</button></div></div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#confirmCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#confirmOk').onclick = () => { backdrop.remove(); onConfirm(); };
  }
};

const NumpadManager = {
  currentProductId: null, equationString: '',
  open(productId) {
    this.currentProductId = productId;
    const eq = StorageManager.getEquations()[productId] || (StorageManager.getInventory()[productId] > 0 ? String(StorageManager.getInventory()[productId]) : '');
    this.equationString = eq; this.updateDisplay(); document.getElementById('numpadModal').classList.add('open');
  },
  close() { document.getElementById('numpadModal').classList.remove('open'); },
  append(char) {
    const isOp = c => ['+', '-', '*', '/'].includes(c);
    if (isOp(char) && (this.equationString === '' || isOp(this.equationString.slice(-1)))) {
        if(this.equationString !== '') this.equationString = this.equationString.slice(0, -1) + char;
    } else this.equationString += char;
    this.updateDisplay();
  },
  backspace() { this.equationString = this.equationString.slice(0, -1); this.updateDisplay(); },
  clear() { this.equationString = ''; this.updateDisplay(); },
  evaluate() {
    try {
      const cleanStr = this.equationString.replace(/[^0-9+\-*/.]/g, '').replace(/[+\-*/]+$/, ''); 
      if (!cleanStr) return 0;
      return Math.max(0, parseFloat(new Function('return ' + cleanStr)().toFixed(2)) || 0);
    } catch { return 0; }
  },
  save() {
    const finalQty = this.evaluate(); const eqs = StorageManager.getEquations();
    if (this.equationString.trim() !== '') eqs[this.currentProductId] = this.equationString; else delete eqs[this.currentProductId];
    StorageManager.saveEquations(eqs); InventoryManager.setQty(this.currentProductId, finalQty);
    InventoryManager.renderTable(); this.close();
  },
  updateDisplay() {
    document.getElementById('numpadDisplayEq').textContent = this.equationString.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/\+/g, ' + ').replace(/\-/g, ' - ') || '0';
    document.getElementById('numpadDisplayTotal').textContent = '= ' + this.evaluate();
  }
};

// ============================================================
// Inventory Manager
// ============================================================
const InventoryManager = {
  sortCol: '', sortAsc: true,
  toggleSort(col) {
    if (this.sortCol === col) this.sortAsc = !this.sortAsc; else { this.sortCol = col; this.sortAsc = true; }
    this.renderTable();
  },
  renderTable() {
    let products = StorageManager.getProducts();
    const inventory = StorageManager.getInventory();
    const tbody = document.getElementById('inventoryTableBody');
    const empty = document.getElementById('inventoryEmpty');
    const searchTerm = (document.getElementById('inventorySearch')?.value || '').toLowerCase();

    if (searchTerm) products = products.filter(p => p.name.toLowerCase().includes(searchTerm) || p.code.toLowerCase().includes(searchTerm));

    if (this.sortCol) {
      products.sort((a, b) => {
        let valA, valB;
        if (this.sortCol === 'code') { valA = a.code.toLowerCase(); valB = b.code.toLowerCase(); }
        else if (this.sortCol === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
        else if (this.sortCol === 'qty') { valA = inventory[a.id] || 0; valB = inventory[b.id] || 0; }
        if (valA < valB) return this.sortAsc ? -1 : 1;
        if (valA > valB) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }

    ['code', 'name', 'qty'].forEach(col => {
      const icon = document.getElementById(`invSort_${col}`);
      if (icon) icon.textContent = this.sortCol === col ? (this.sortAsc ? '🔼' : '🔽') : '';
    });

    tbody.innerHTML = '';
    if (!products.length) { if (empty) empty.style.display = 'flex'; return; }
    if (empty) empty.style.display = 'none';

    products.forEach(p => {
      const qty = inventory[p.id] || 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="code-cell">${p.code}</span></td>
        <td><strong>${p.name}</strong></td>
        <td><span class="badge ${p.type === 'composite' ? 'badge-composite' : 'badge-simple'}">${p.type === 'composite' ? 'مركب' : 'مفرد'}</span></td>
        <td>
          <div class="qty-control">
            <button class="qty-btn minus" onclick="InventoryManager.changeQty('${p.id}', -1)">−</button>
            <input type="text" readonly class="qty-input" id="qty_${p.id}" value="${qty}" style="cursor:pointer" onclick="NumpadManager.open('${p.id}')" />
            <button class="qty-btn plus" onclick="InventoryManager.changeQty('${p.id}', 1)">+</button>
          </div>
        </td>
        <td></td>`;
      tbody.appendChild(tr);
    });
  },
  changeQty(productId, delta) {
    const inv = StorageManager.getInventory(), eqs = StorageManager.getEquations();
    const current = inv[productId] || 0; const newVal = Math.max(0, current + delta);
    let eq = eqs[productId] || (current > 0 ? String(current) : '');
    if (delta > 0) eq = eq ? eq + '+' + delta : String(delta);
    else if (delta < 0) { if (!eq) eq = String(current); eq += '-' + Math.abs(delta); }
    eqs[productId] = eq; inv[productId] = newVal;
    StorageManager.saveEquations(eqs); StorageManager.saveInventory(inv);
    const input = document.getElementById(`qty_${productId}`); if (input) input.value = newVal;
  },
  setQty(productId, value) {
    const inv = StorageManager.getInventory(); inv[productId] = Math.max(0, parseInt(value) || 0); StorageManager.saveInventory(inv);
  },
  syncProducts() { if (UIManager.currentPage === 'inventory-input') this.renderTable(); },
  resetDraft() {
    UIManager.showConfirm('تصفير الجرد', 'هل أنت متأكد من تصفير جميع كميات الجرد الحالية في الشاشة؟', () => {
      StorageManager.saveInventory({}); StorageManager.saveEquations({});
      this.renderTable(); ToastManager.success('تم التصفير', 'تم تصفير مسودة الجرد بنجاح');
    });
  },
  approveInventory() {
    const products = StorageManager.getProducts();
    if (!products.length) return ToastManager.warning('تنبيه', 'يرجى إضافة منتجات أولاً');
    document.getElementById('approveName').value = `جرد يوم ${new Date().toLocaleDateString('ar-SA')}`;
    document.getElementById('approveNotes').value = ''; document.getElementById('approveModal').classList.add('open');
  },
  confirmApprove() {
    const products = StorageManager.getProducts(), inventory = StorageManager.getInventory(), name = document.getElementById('approveName').value.trim() || 'جرد بدون اسم', snapshot = { items: {} };
    products.forEach(p => { snapshot.items[p.id] = inventory[p.id] || 0; });
    StorageManager.saveApproved(snapshot.items);

    const history = StorageManager.getHistory();
    history.unshift({
      id: 'inv_' + Date.now(), name: name, notes: document.getElementById('approveNotes').value.trim(),
      date: new Date().toISOString(), productCount: products.length, items: { ...snapshot.items },
      products: products.map(p => ({ id: p.id, code: p.code, name: p.name, type: p.type, components: p.components || [] }))
    });
    StorageManager.saveHistory(history);
    document.getElementById('approveModal').classList.remove('open'); UIManager.updateSidebarStats(); ToastManager.success('تم الاعتماد', `تم اعتماد "${name}" بنجاح.`);
  }
};

// ============================================================
// Report Manager
// ============================================================
const ReportManager = {
  sortCol: '', sortAsc: true,
  toggleSort(col) {
    if (this.sortCol === col) this.sortAsc = !this.sortAsc; else { this.sortCol = col; this.sortAsc = true; }
    this.render();
  },
  getReportData() {
    const approved = StorageManager.getApproved(), products = StorageManager.getProducts(), insidePackages = {};
    products.forEach(p => {
      if (p.type === 'composite' && p.components) {
        p.components.forEach(c => { insidePackages[c.productId] = (insidePackages[c.productId] || 0) + (c.qty * (approved[p.id] || 0)); });
      }
    });
    return products.filter(p => p.type === 'simple').map(p => ({
      code: p.code, name: p.name, type: 'مفرد', direct: approved[p.id] || 0, inPkg: insidePackages[p.id] || 0, total: (approved[p.id] || 0) + (insidePackages[p.id] || 0)
    }));
  },
  render() {
    let reportData = this.getReportData();
    const tbody = document.getElementById('reportTableBody'), empty = document.getElementById('reportEmpty'), statsRow = document.getElementById('reportStats');
    tbody.innerHTML = ''; statsRow.innerHTML = '';
    if (!reportData.length) { if (empty) empty.style.display = 'flex'; return; }
    if (empty) empty.style.display = 'none';

    if (this.sortCol) {
      reportData.sort((a, b) => {
        let valA = a[this.sortCol], valB = b[this.sortCol];
        if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
        if (valA < valB) return this.sortAsc ? -1 : 1;
        if (valA > valB) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }

    ['code', 'name', 'direct', 'inPkg', 'total'].forEach(col => {
      const icon = document.getElementById(`repSort_${col}`);
      if (icon) icon.textContent = this.sortCol === col ? (this.sortAsc ? '🔼' : '🔽') : '';
    });

    let totalItems = 0, totalQty = 0;
    reportData.forEach(d => {
      totalItems++; totalQty += d.total;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="code-cell">${d.code}</span></td><td><strong>${d.name}</strong></td><td>${d.direct}</td><td class="in-packages">${d.inPkg > 0 ? d.inPkg : '—'}</td><td><span class="total-highlight">${d.total}</span></td>`;
      tbody.appendChild(tr);
    });

    statsRow.innerHTML = `
      <div class="stat-card"><div class="stat-card-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
      <div class="stat-card-info"><div class="stat-card-value">${totalItems}</div><div class="stat-card-label">إجمالي المنتجات</div></div></div>
      <div class="stat-card"><div class="stat-card-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div>
      <div class="stat-card-info"><div class="stat-card-value">${totalQty}</div><div class="stat-card-label">إجمالي الكميات (القطع)</div></div></div>
    `;
  }
};

// ============================================================
// History & Product Managers
// ============================================================
const HistoryManager = {
  render() {
    const history = StorageManager.getHistory(), grid = document.getElementById('historyGrid'), empty = document.getElementById('historyEmpty');
    grid.innerHTML = '';
    if (!history.length) { if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';

    history.forEach(entry => {
      const d = new Date(entry.date), totalQty = Object.values(entry.items || {}).reduce((a, b) => a + b, 0);
      const card = document.createElement('div'); card.className = 'history-card';
      card.innerHTML = `
        <div class="history-card-header"><div><div class="history-card-date">${entry.name || 'جرد معتمد'}</div><div class="history-card-time">${d.toLocaleDateString('ar-SA')} - ${d.toLocaleTimeString('ar-SA', {hour:'2-digit',minute:'2-digit'})}</div></div><span class="badge badge-success">مكتمل</span></div>
        <div class="history-card-body"><div class="history-stat"><div class="history-stat-value">${entry.productCount || 0}</div><div class="history-stat-label">منتج</div></div><div class="history-stat"><div class="history-stat-value">${totalQty}</div><div class="history-stat-label">إجمالي المدخلات</div></div></div>
        <div class="history-card-actions"><button class="btn btn-outline btn-sm" onclick="HistoryManager.viewEntry('${entry.id}')">عرض</button><button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger-bg)" onclick="HistoryManager.deleteEntry('${entry.id}')">حذف</button></div>`;
      grid.appendChild(card);
    });
  },
  viewEntry(id) {
    const history = StorageManager.getHistory(), entry = history.find(h => h.id === id); if (!entry) return;
    const insidePackages = {};
    (entry.products || []).forEach(p => {
      if (p.type === 'composite' && p.components) {
        const packageQty = entry.items[p.id] || 0;
        p.components.forEach(c => { insidePackages[c.productId] = (insidePackages[c.productId] || 0) + (c.qty * packageQty); });
      }
    });
    const rows = (entry.products || []).filter(p => p.type === 'simple').map(p => {
      const direct = entry.items[p.id] || 0, inPkg = insidePackages[p.id] || 0;
      return `<tr><td><span class="code-cell">${p.code}</span></td><td>${p.name}</td><td>${direct}</td><td class="in-packages">${inPkg > 0 ? inPkg : '—'}</td><td><span class="total-highlight">${direct + inPkg}</span></td></tr>`;
    }).join('');

    document.getElementById('historyModalTitle').textContent = entry.name || 'تفاصيل الجرد';
    document.getElementById('historyModalBody').innerHTML = `
      ${entry.notes ? `<div style="background: var(--surface-alt); padding: 15px; border-radius: var(--radius-sm); margin-bottom: 20px; font-size: 0.9rem; color: var(--text-secondary); border-right: 3px solid var(--primary);"><strong>الملاحظات:</strong><br>${entry.notes.replace(/\n/g, '<br>')}</div>` : ''}
      <div class="table-wrapper"><table class="data-table"><thead><tr><th>الكود</th><th>الاسم</th><th>المباشر</th><th>بالبكجات</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    document.getElementById('historyModal').classList.add('open');
  },
  deleteEntry(id) { UIManager.showConfirm('حذف السجل', 'هل تريد حذف هذا السجل؟', () => { StorageManager.saveHistory(StorageManager.getHistory().filter(h => h.id !== id)); this.render(); UIManager.updateSidebarStats(); }); }
};

const ProductManager = {
  editingId: null, componentCount: 0,
  renderTable() {
    const products = StorageManager.getProducts(), tbody = document.getElementById('productsTableBody'), empty = document.getElementById('productsEmpty');
    tbody.innerHTML = '';
    if (!products.length) { if(empty) empty.style.display = 'flex'; return; }
    if(empty) empty.style.display = 'none';
    products.forEach(p => {
      let componentsHTML = '—';
      if (p.type === 'composite' && p.components) componentsHTML = p.components.map(c => `<span class="badge badge-muted" style="margin:1px">${products.find(x => x.id === c.productId)?.name || c.productId} × ${c.qty}</span>`).join('');
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="code-cell">${p.code}</span></td><td><strong>${p.name}</strong></td><td><span class="badge ${p.type === 'composite' ? 'badge-composite' : 'badge-simple'}">${p.type === 'composite' ? 'مركب' : 'مفرد'}</span></td><td style="max-width:220px;white-space:normal">${componentsHTML}</td><td><div class="action-btns"><button class="btn btn-outline btn-sm btn-icon" onclick="ProductManager.openModal('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn btn-outline btn-sm btn-icon" style="color:var(--danger);border-color:var(--danger-bg)" onclick="ProductManager.deleteProduct('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button></div></td>`;
      tbody.appendChild(tr);
    });
    UIManager.updateSidebarStats();
  },
  openModal(id) {
    this.editingId = id || null; this.componentCount = 0;
    document.getElementById('productCode').value = ''; document.getElementById('productName').value = ''; document.getElementById('editProductId').value = ''; document.getElementById('componentsList').innerHTML = ''; document.querySelectorAll('input[name="productType"]').forEach(r => r.checked = r.value === 'simple'); document.getElementById('componentsSection').style.display = 'none';
    if (id) {
      const p = StorageManager.getProducts().find(x => x.id === id);
      if (p) {
        document.getElementById('productCode').value = p.code; document.getElementById('productName').value = p.name; document.getElementById('editProductId').value = p.id; document.querySelectorAll('input[name="productType"]').forEach(r => r.checked = r.value === p.type);
        if (p.type === 'composite') { document.getElementById('componentsSection').style.display = ''; (p.components || []).forEach(c => this.addComponent(c.productId, c.qty, id)); }
      }
    }
    document.getElementById('productModal').classList.add('open');
  },
  closeModal() { document.getElementById('productModal').classList.remove('open'); },
  onTypeChange() { document.getElementById('componentsSection').style.display = document.querySelector('input[name="productType"]:checked').value === 'composite' ? '' : 'none'; },
  addComponent(selectedProductId = '', qty = 1, excludeId = null) {
    const products = StorageManager.getProducts().filter(p => p.type === 'simple' && p.id !== excludeId), row = document.createElement('div'); row.className = 'component-row';
    const options = products.map(p => `<option value="${p.id}" ${p.id === selectedProductId ? 'selected' : ''}>${p.name} (${p.code})</option>`).join('');
    row.innerHTML = `<select class="form-select" data-role="comp-product"><option value="">-- اختر منتجاً --</option>${options}</select><input type="number" class="component-qty" data-role="comp-qty" min="1" value="${qty}" /><button class="remove-component" onclick="this.closest('.component-row').remove()" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
    document.getElementById('componentsList').appendChild(row);
  },
  saveProduct() {
    const code = document.getElementById('productCode').value.trim(), name = document.getElementById('productName').value.trim(), type = document.querySelector('input[name="productType"]:checked').value, editId = document.getElementById('editProductId').value;
    if (!code || !name) return ToastManager.error('بيانات ناقصة', 'يرجى ملء جميع الحقول المطلوبة');
    const products = StorageManager.getProducts();
    if (products.find(p => p.code === code && p.id !== editId)) return ToastManager.error('كود مكرر', 'كود المنتج موجود مسبقاً');
    let components = [];
    if (type === 'composite') {
      const rows = document.querySelectorAll('#componentsList .component-row');
      for (const row of rows) {
        const productId = row.querySelector('[data-role="comp-product"]').value, qty = parseInt(row.querySelector('[data-role="comp-qty"]').value) || 0;
        if (!productId || qty < 1) return ToastManager.warning('خطأ بالمكونات', 'يرجى التأكد من اختيار المكون والكمية');
        components.push({ productId, qty });
      }
      if (!components.length) return ToastManager.warning('منتج مركب', 'يجب إضافة مكون واحد على الأقل');
    }
    if (editId) { const idx = products.findIndex(p => p.id === editId); if (idx !== -1) products[idx] = { ...products[idx], code, name, type, components }; } 
    else products.push({ id: 'p_' + Date.now(), code, name, type, components, createdAt: new Date().toISOString() });
    StorageManager.saveProducts(products); this.closeModal(); this.renderTable(); InventoryManager.syncProducts(); UIManager.updateSidebarStats(); ToastManager.success('تم الحفظ', `تم حفظ المنتج "${name}"`);
  },
  deleteProduct(id) {
    UIManager.showConfirm('حذف المنتج', `هل أنت متأكد من الحذف؟`, () => {
      StorageManager.saveProducts(StorageManager.getProducts().filter(x => x.id !== id));
      const inv = StorageManager.getInventory(), eqs = StorageManager.getEquations();
      delete inv[id]; delete eqs[id];
      StorageManager.saveInventory(inv); StorageManager.saveEquations(eqs);
      this.renderTable(); InventoryManager.renderTable(); UIManager.updateSidebarStats();
    });
  }
};

const CSVManager = {
  buildCSV(rows) { return rows.map(row => row.map(cell => { const s = String(cell == null ? '' : cell); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\r\n'); },
  download(rows, filename) { const BOM = '\uFEFF'; const blob = new Blob([BOM + this.buildCSV(rows)], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); },
  parseCSV(text) { if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); const rows = []; const lines = text.split(/\r?\n/); for (const line of lines) { if (!line.trim()) continue; const cols = []; let inQuote = false, cell = ''; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (inQuote && line[i + 1] === '"') { cell += '"'; i++; } else inQuote = !inQuote; } else if (ch === ',' && !inQuote) { cols.push(cell.trim()); cell = ''; } else cell += ch; } cols.push(cell.trim()); rows.push(cols); } return rows; },
  exportProducts() {
    const products = StorageManager.getProducts(); if (!products.length) return ToastManager.warning('تنبيه', 'لا يوجد شيء للتصدير');
    const rows = [['كود المنتج', 'اسم المنتج', 'نوع المنتج', 'مكونات', 'عدد المكونات']];
    products.forEach(p => {
      if (p.type === 'simple') rows.push([p.code, p.name, 'مفرد', '', '']);
      else {
        if (p.components && p.components.length > 0) {
          p.components.forEach((c, index) => { const compCode = products.find(x => x.id === c.productId)?.code || c.productId; rows.push(index === 0 ? [p.code, p.name, 'مركب', compCode, c.qty] : ['', '', '', compCode, c.qty]); });
        } else rows.push([p.code, p.name, 'مركب', '', '']);
      }
    });
    this.download(rows, 'المنتجات.csv');
  },
  importProducts() { document.getElementById('csvProductImportInput').click(); },
  handleProductImport(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = this.parseCSV(e.target.result); if (rows.length < 2) return ToastManager.error('خطأ', 'الملف فارغ');
        let products = StorageManager.getProducts(), currentComposite = null, addedCount = 0;
        rows.slice(1).forEach(row => {
          const code = row[0]?.trim(), name = row[1]?.trim(), typeStr = row[2]?.trim(), compCode = row[3]?.trim(), compQty = parseInt(row[4]) || 1;
          if (code) {
            if (products.find(p => p.code === code)) { currentComposite = null; return; }
            const isComposite = typeStr === 'مركب', newP = { id: 'p_' + Date.now() + Math.random().toString(36).slice(2, 6), code, name, type: isComposite ? 'composite' : 'simple', components: [], createdAt: new Date().toISOString() };
            if (isComposite && compCode) newP.components.push({ tempCode: compCode, qty: compQty });
            products.push(newP); addedCount++; currentComposite = isComposite ? newP : null;
          } else if (compCode && currentComposite) currentComposite.components.push({ tempCode: compCode, qty: compQty });
        });
        products.forEach(p => { if (p.type === 'composite' && p.components) { p.components = p.components.map(c => c.tempCode ? { productId: products.find(x => x.code === c.tempCode)?.id, qty: c.qty } : c).filter(c => c.productId); } });
        StorageManager.saveProducts(products); ProductManager.renderTable(); UIManager.updateSidebarStats(); ToastManager.success('اكتمل', `تم استيراد ${addedCount} منتج`);
      } catch { ToastManager.error('خطأ', 'فشل قراءة الملف'); }
    }; reader.readAsText(file, 'UTF-8'); event.target.value = '';
  },
  exportInventory() {
    const products = StorageManager.getProducts(), inventory = StorageManager.getInventory(); if (!products.length) return ToastManager.warning('فارغ', 'لا يوجد جرد');
    const rows = [['كود المنتج', 'اسم المنتج', 'النوع', 'الكمية']]; products.forEach(p => rows.push([p.code, p.name, p.type === 'composite' ? 'مركب' : 'مفرد', inventory[p.id] || 0])); this.download(rows, 'مسودة_الجرد.csv');
  },
  importInventory() { document.getElementById('csvImportInput').click(); },
  handleImport(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = this.parseCSV(e.target.result), products = StorageManager.getProducts(), inventory = StorageManager.getInventory(); let updated = 0;
        rows.slice(1).forEach(row => { if (row.length < 4) return; const p = products.find(x => x.code === row[0].trim()); if (p) { inventory[p.id] = Math.max(0, parseInt(row[3]) || 0); updated++; } });
        StorageManager.saveInventory(inventory); StorageManager.saveEquations({}); InventoryManager.renderTable(); ToastManager.success('اكتمل', `تم تحديث ${updated} منتج`);
      } catch { ToastManager.error('خطأ', 'فشل قراءة الملف'); }
    }; reader.readAsText(file, 'UTF-8'); event.target.value = '';
  },
  exportReport() {
    const data = ReportManager.getReportData(); if (!data.length) return ToastManager.warning('فارغ', 'لا يوجد بيانات');
    const rows = [['الكود', 'اسم المنتج', 'الجرد المباشر', 'داخل البكجات', 'الإجمالي الفعلي']];
    data.forEach(d => rows.push([d.code, d.name, d.direct, d.inPkg, d.total])); this.download(rows, 'التقرير_النهائي.csv');
  }
};

// ============================================================
// App Init
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  AuthManager.init(); 
  UIManager.init(); 
  UIManager.navigate('inventory-input');
  document.getElementById('sidebarOverlay').addEventListener('click', () => UIManager.closeSidebar());

  if (supabaseClient) {
    ToastManager.info('مزامنة', 'جاري المزامنة مع السحابة...', 2500);
    await StorageManager.initSync(); 
  }
});