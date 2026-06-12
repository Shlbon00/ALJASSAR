// ===== Storage Manager =====
const StorageManager = {
    KEYS: {
        PRODUCTS: 'inv_products',
        INVENTORY: 'inv_inventory',
        APPROVED: 'inv_approved',
        HISTORY: 'inv_history',
        JSONBIN_KEY: 'inv_jsonbin_key',
        JSONBIN_BIN_ID: 'inv_jsonbin_bin_id'
    },

    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    getProducts() { return this.get(this.KEYS.PRODUCTS) || []; },
    setProducts(products) { return this.set(this.KEYS.PRODUCTS, products); },
    getInventory() { return this.get(this.KEYS.INVENTORY) || {}; },
    setInventory(inventory) { return this.set(this.KEYS.INVENTORY, inventory); },
    getApproved() { return this.get(this.KEYS.APPROVED) || {}; },
    setApproved(approved) { return this.set(this.KEYS.APPROVED, approved); },
    getHistory() { return this.get(this.KEYS.HISTORY) || []; },
    setHistory(history) { return this.set(this.KEYS.HISTORY, history); },
    getJsonBinKey() { return localStorage.getItem(this.KEYS.JSONBIN_KEY) || ''; },
    setJsonBinKey(key) { localStorage.setItem(this.KEYS.JSONBIN_KEY, key); },
    getJsonBinId() { return localStorage.getItem(this.KEYS.JSONBIN_BIN_ID) || ''; },
    setJsonBinId(id) { localStorage.setItem(this.KEYS.JSONBIN_BIN_ID, id); }
};

// ===== Toast Manager =====
const ToastManager = {
    container: null,
    init() { this.container = document.getElementById('toast-container'); },

    show(message, type = 'success', title = '') {
        if (!this.container) this.init();
        const icons = {
            success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
            error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${title || (type === 'success' ? 'نجاح' : type === 'error' ? 'خطأ' : type === 'warning' ? 'تنبيه' : 'معلومة')}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;
        toast.querySelector('.toast-close').addEventListener('click', () => this.remove(toast));
        this.container.appendChild(toast);
        setTimeout(() => this.remove(toast), 4000);
    },

    remove(toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-30px)';
        setTimeout(() => toast.remove(), 300);
    }
};

// ===== Product Manager =====
const ProductManager = {
    products: [],

    init() {
        this.products = StorageManager.getProducts();
        this.setupEventListeners();
        this.render();
    },

    setupEventListeners() {
        document.getElementById('btn-add-product').addEventListener('click', () => this.openModal());
        document.getElementById('product-modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('product-modal-cancel').addEventListener('click', () => this.closeModal());
        document.getElementById('product-modal-save').addEventListener('click', () => this.save());
        document.getElementById('product-type').addEventListener('change', (e) => this.toggleComponents(e.target.value));
        document.getElementById('btn-add-component').addEventListener('click', () => this.addComponentRow());
        document.getElementById('products-search').addEventListener('input', (e) => this.render(e.target.value));
        document.getElementById('btn-export-products').addEventListener('click', () => CSVManager.exportProducts());
        document.getElementById('btn-import-products').addEventListener('click', () => {
            document.getElementById('import-type').value = 'products';
            ImportModal.open();
        });
    },

    getAll() { return this.products; },
    getById(id) { return this.products.find(p => p.id === id); },
    getByCode(code) { return this.products.find(p => p.code === code); },

    add(product) {
        product.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        this.products.push(product);
        StorageManager.setProducts(this.products);
        this.render();
        return product;
    },

    update(id, data) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...data };
            StorageManager.setProducts(this.products);
            this.render();
            return true;
        }
        return false;
    },

    delete(id) {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return false;
        this.products = this.products.filter(p => p.id !== id);
        StorageManager.setProducts(this.products);
        this.render();
        ToastManager.show('تم حذف المنتج بنجاح', 'success');
        return true;
    },

    openModal(product = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');

        form.reset();
        document.getElementById('components-list').innerHTML = '';
        document.getElementById('components-section').style.display = 'none';

        if (product) {
            title.textContent = 'تعديل منتج';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-code').value = product.code;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-type').value = product.type;

            if (product.type === 'composite' && product.components) {
                document.getElementById('components-section').style.display = 'block';
                product.components.forEach(comp => this.addComponentRow(comp.productId, comp.quantity));
            }
        } else {
            title.textContent = 'إضافة منتج جديد';
            document.getElementById('product-id').value = '';
        }

        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('product-modal').classList.remove('active');
    },

    toggleComponents(type) {
        const section = document.getElementById('components-section');
        if (type === 'composite') {
            section.style.display = 'block';
            if (document.getElementById('components-list').children.length === 0) {
                this.addComponentRow();
            }
        } else {
            section.style.display = 'none';
        }
    },

    addComponentRow(productId = '', quantity = 1) {
        const container = document.getElementById('components-list');
        const row = document.createElement('div');
        row.className = 'component-row';

        const singleProducts = this.products.filter(p => p.type === 'single');
        const options = singleProducts.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.code} - ${p.name}</option>`).join('');

        row.innerHTML = `
            <select class="component-product" required>
                <option value="">اختر منتج</option>
                ${options}
            </select>
            <input type="number" class="component-quantity" value="${quantity}" min="1" required placeholder="الكمية">
            <button type="button" class="btn-remove-component" title="حذف">&times;</button>
        `;

        row.querySelector('.btn-remove-component').addEventListener('click', () => row.remove());
        container.appendChild(row);
    },

    save() {
        const id = document.getElementById('product-id').value;
        const code = document.getElementById('product-code').value.trim();
        const name = document.getElementById('product-name').value.trim();
        const type = document.getElementById('product-type').value;

        if (!code || !name) {
            ToastManager.show('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        const existing = this.getByCode(code);
        if (existing && existing.id !== id) {
            ToastManager.show('كود المنتج مستخدم مسبقاً', 'error');
            return;
        }

        let components = [];
        if (type === 'composite') {
            const rows = document.querySelectorAll('.component-row');
            rows.forEach(row => {
                const productId = row.querySelector('.component-product').value;
                const quantity = parseInt(row.querySelector('.component-quantity').value) || 1;
                if (productId) {
                    components.push({ productId, quantity });
                }
            });

            if (components.length === 0) {
                ToastManager.show('يجب إضافة مكون واحد على الأقل للمنتج المركب', 'error');
                return;
            }
        }

        const productData = { code, name, type, components };

        if (id) {
            this.update(id, productData);
            ToastManager.show('تم تحديث المنتج بنجاح', 'success');
        } else {
            this.add(productData);
            ToastManager.show('تم إضافة المنتج بنجاح', 'success');
        }

        this.closeModal();
        InventoryManager.render();
        ReportManager.render();
    },

    render(searchTerm = '') {
        const tbody = document.getElementById('products-tbody');
        let products = this.products;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            products = products.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term)
            );
        }

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="5">
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        <h4>لا توجد منتجات</h4>
                        <p>اضغط على "إضافة منتج جديد" لبدء الإضافة</p>
                    </div>
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = products.map(product => {
            const typeLabel = product.type === 'single' ? 'منتج مفرد' : 'منتج مركب';
            const typeClass = product.type === 'single' ? 'badge-single' : 'badge-composite';

            let componentsText = '-';
            if (product.type === 'composite' && product.components) {
                componentsText = product.components.map(c => {
                    const comp = this.getById(c.productId);
                    return comp ? `${comp.name} × ${c.quantity}` : '';
                }).filter(Boolean).join(', ');
            }

            return `
                <tr>
                    <td><strong>${product.code}</strong></td>
                    <td>${product.name}</td>
                    <td><span class="badge ${typeClass}">${typeLabel}</span></td>
                    <td>${componentsText}</td>
                    <td class="actions">
                        <button class="btn-icon btn-edit" onclick="ProductManager.openModal(ProductManager.getById('${product.id}'))" title="تعديل">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon btn-delete" onclick="ProductManager.delete('${product.id}')" title="حذف">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

// ===== Approve Modal Manager =====
const ApproveModal = {
    init() {
        document.getElementById('approve-modal-close').addEventListener('click', () => this.close());
        document.getElementById('approve-modal-cancel').addEventListener('click', () => this.close());
        document.getElementById('approve-modal-confirm').addEventListener('click', () => this.confirm());
    },

    open() {
        const products = ProductManager.getAll();
        const inventory = StorageManager.getInventory();

        if (products.length === 0) {
            ToastManager.show('لا توجد منتجات للاعتماد', 'warning');
            return;
        }

        const hasData = Object.values(inventory).some(q => q > 0);
        if (!hasData) {
            ToastManager.show('لا توجد بيانات جرد للاعتماد', 'warning');
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const count = Object.values(inventory).filter(q => q > 0).length;

        document.getElementById('approve-name').value = '';
        document.getElementById('approve-date').textContent = dateStr;
        document.getElementById('approve-time').textContent = timeStr;
        document.getElementById('approve-count').textContent = count + ' منتج';

        document.getElementById('approve-modal').classList.add('active');
        document.getElementById('approve-name').focus();
    },

    close() {
        document.getElementById('approve-modal').classList.remove('active');
    },

    confirm() {
        const name = document.getElementById('approve-name').value.trim();
        if (!name) {
            ToastManager.show('يرجى إدخال اسم الجرد', 'error');
            return;
        }

        const now = new Date();
        const products = ProductManager.getAll();
        const inventory = StorageManager.getInventory();

        // Save to approved
        const approved = {};
        products.forEach(p => {
            if (inventory[p.id] > 0) {
                approved[p.id] = inventory[p.id];
            }
        });

        StorageManager.setApproved(approved);

        // Calculate FINAL REPORT data for history (not raw inventory)
        const reportData = ReportManager.calculateReportFromApproved(approved);

        // Save to history with FINAL REPORT data
        const history = StorageManager.getHistory();
        const historyEntry = {
            id: Date.now().toString(),
            name: name,
            date: now.toISOString(),
            dateFormatted: now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
            timeFormatted: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            products: reportData.length,
            reportData: reportData  // Save the FINAL REPORT, not raw inventory
        };
        history.unshift(historyEntry);
        StorageManager.setHistory(history);

        // Reset inventory
        StorageManager.setInventory({});
        InventoryManager.inventory = {};

        // Update UI
        InventoryManager.render();
        ReportManager.render();
        HistoryManager.render();

        this.close();
        ToastManager.show(`تم اعتماد الجرد "${name}" وحفظ التقرير النهائي في السجل`, 'success', 'تم الاعتماد');
    }
};

// ===== Inventory Manager =====
const InventoryManager = {
    inventory: {},

    init() {
        this.inventory = StorageManager.getInventory();
        this.setupEventListeners();
        this.render();
    },

    setupEventListeners() {
        document.getElementById('btn-approve').addEventListener('click', () => ApproveModal.open());
        document.getElementById('btn-reset').addEventListener('click', () => this.reset());
        document.getElementById('btn-export').addEventListener('click', () => CSVManager.exportInventory());
        document.getElementById('btn-import').addEventListener('click', () => {
            document.getElementById('import-type').value = 'inventory';
            ImportModal.open();
        });
        document.getElementById('inventory-search').addEventListener('input', (e) => this.render(e.target.value));
    },

    getQuantity(productId) { return this.inventory[productId] || 0; },

    setQuantity(productId, quantity) {
        this.inventory[productId] = Math.max(0, quantity);
        StorageManager.setInventory(this.inventory);
    },

    increment(productId) {
        this.setQuantity(productId, this.getQuantity(productId) + 1);
        this.render(document.getElementById('inventory-search').value);
    },

    decrement(productId) {
        const current = this.getQuantity(productId);
        if (current > 0) {
            this.setQuantity(productId, current - 1);
            this.render(document.getElementById('inventory-search').value);
        }
    },

    setDirect(productId, value) {
        const quantity = parseInt(value) || 0;
        this.setQuantity(productId, quantity);
    },

    reset() {
        if (!confirm('هل أنت متأكد من تصفير الجرد؟ سيتم فقدان جميع البيانات غير المعتمدة.')) return;
        this.inventory = {};
        StorageManager.setInventory({});
        this.render();
        ToastManager.show('تم تصفير الجرد بنجاح', 'success');
    },

    importData(data) {
        const products = ProductManager.getAll();
        data.forEach(row => {
            const product = products.find(p => p.code === row.code || p.name === row.name);
            if (product) {
                const qty = parseInt(row.quantity) || 0;
                if (qty > 0) {
                    this.inventory[product.id] = qty;
                }
            }
        });
        StorageManager.setInventory(this.inventory);
        this.render();
        ToastManager.show('تم استيراد بيانات الجرد بنجاح', 'success');
    },

    render(searchTerm = '') {
        const tbody = document.getElementById('inventory-tbody');
        const products = ProductManager.getAll();

        let filtered = products;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = products.filter(p =>
                p.code.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term)
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="5">
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                        <h4>لا توجد منتجات</h4>
                        <p>أضف منتجات من صفحة إدارة المنتجات أولاً</p>
                    </div>
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(product => {
            const qty = this.getQuantity(product.id);
            const typeLabel = product.type === 'single' ? 'مفرد' : 'مركب';
            const typeClass = product.type === 'single' ? 'badge-single' : 'badge-composite';

            return `
                <tr>
                    <td><strong>${product.code}</strong></td>
                    <td>${product.name}</td>
                    <td><span class="badge ${typeClass}">${typeLabel}</span></td>
                    <td>
                        <div class="quantity-control">
                            <button onclick="InventoryManager.decrement('${product.id}')">−</button>
                            <input type="number" value="${qty}" min="0"
                                onchange="InventoryManager.setDirect('${product.id}', this.value)"
                                oninput="InventoryManager.setDirect('${product.id}', this.value)">
                            <button onclick="InventoryManager.increment('${product.id}')">+</button>
                        </div>
                    </td>
                    <td class="actions">
                        <button class="btn-icon btn-delete" onclick="InventoryManager.setQuantity('${product.id}', 0); InventoryManager.render(document.getElementById('inventory-search').value);" title="تصفير">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

// ===== Report Manager =====
const ReportManager = {
    init() {
        this.render();
    },

    // Calculate report from approved data (used by history)
    calculateReportFromApproved(approved) {
        const products = ProductManager.getAll();
        const report = [];

        products.filter(p => p.type === 'single').forEach(product => {
            const directQty = approved[product.id] || 0;
            let inPackages = 0;

            products.forEach(p => {
                if (p.type === 'composite' && p.components) {
                    const component = p.components.find(c => c.productId === product.id);
                    if (component) {
                        const packageQty = approved[p.id] || 0;
                        inPackages += packageQty * component.quantity;
                    }
                }
            });

            report.push({
                id: product.id,
                code: product.code,
                name: product.name,
                directQty,
                inPackages,
                total: directQty + inPackages
            });
        });

        return report;
    },

    // Calculate report from current approved storage
    calculateReport() {
        const approved = StorageManager.getApproved();
        return this.calculateReportFromApproved(approved);
    },

    render() {
        const tbody = document.getElementById('report-tbody');
        const report = this.calculateReport();

        if (report.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="5">
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        <h4>لا توجد بيانات تقرير</h4>
                        <p>قم بإدخال واعتماد الجرد لعرض التقرير</p>
                    </div>
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = report.map(item => {
            return `
                <tr>
                    <td><strong>${item.code}</strong></td>
                    <td>${item.name}</td>
                    <td>${item.directQty}</td>
                    <td>${item.inPackages}</td>
                    <td><strong style="color: var(--primary);">${item.total}</strong></td>
                </tr>
            `;
        }).join('');
    }
};

// ===== History Manager =====
const HistoryManager = {
    init() {
        this.setupEventListeners();
        this.render();
    },

    setupEventListeners() {
        document.getElementById('history-modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('history-modal-close-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('history-modal-export').addEventListener('click', () => this.exportCurrent());
    },

    delete(id) {
        if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
        const history = StorageManager.getHistory().filter(h => h.id !== id);
        StorageManager.setHistory(history);
        this.render();
        ToastManager.show('تم حذف السجل بنجاح', 'success');
    },

    view(id) {
        const history = StorageManager.getHistory();
        const entry = history.find(h => h.id === id);
        if (!entry) return;

        document.getElementById('history-name').textContent = entry.name || 'بدون اسم';
        document.getElementById('history-date').textContent = entry.dateFormatted || '-';
        document.getElementById('history-time').textContent = entry.timeFormatted || '-';
        document.getElementById('history-count').textContent = (entry.products || 0) + ' منتج';

        const tbody = document.getElementById('history-detail-tbody');

        // Use reportData if available (new format), otherwise fall back to data (old format)
        const reportData = entry.reportData || [];

        if (reportData.length === 0) {
            // Fallback for old entries that only have raw data
            const products = ProductManager.getAll();
            const approved = entry.data || {};
            const fallbackReport = ReportManager.calculateReportFromApproved(approved);

            tbody.innerHTML = fallbackReport.map(item => `
                <tr>
                    <td>${item.code}</td>
                    <td>${item.name}</td>
                    <td>${item.directQty}</td>
                    <td>${item.inPackages}</td>
                    <td><strong>${item.total}</strong></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = reportData.map(item => `
                <tr>
                    <td>${item.code}</td>
                    <td>${item.name}</td>
                    <td>${item.directQty}</td>
                    <td>${item.inPackages}</td>
                    <td><strong>${item.total}</strong></td>
                </tr>
            `).join('');
        }

        this.currentHistoryId = id;
        document.getElementById('history-modal').classList.add('active');
    },

    closeModal() {
        document.getElementById('history-modal').classList.remove('active');
        this.currentHistoryId = null;
    },

    exportCurrent() {
        if (!this.currentHistoryId) return;
        const history = StorageManager.getHistory();
        const entry = history.find(h => h.id === this.currentHistoryId);
        if (!entry) return;

        const reportData = entry.reportData || [];
        let data = [];

        if (reportData.length > 0) {
            data = reportData.map(r => ({
                code: r.code,
                name: r.name,
                direct_quantity: r.directQty,
                in_packages: r.inPackages,
                total: r.total
            }));
        } else {
            // Fallback for old entries
            const products = ProductManager.getAll();
            const approved = entry.data || {};
            const fallbackReport = ReportManager.calculateReportFromApproved(approved);
            data = fallbackReport.map(r => ({
                code: r.code,
                name: r.name,
                direct_quantity: r.directQty,
                in_packages: r.inPackages,
                total: r.total
            }));
        }

        CSVManager.download(data, `تقرير_${entry.name || 'بدون_اسم'}_${new Date(entry.date).toISOString().split('T')[0]}.csv`);
        ToastManager.show('تم تصدير التقرير بنجاح', 'success');
    },

    render() {
        const tbody = document.getElementById('history-tbody');
        const history = StorageManager.getHistory();

        if (history.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="5">
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <h4>لا توجد سجلات</h4>
                        <p>سيتم عرض التقارير النهائية المعتمدة هنا</p>
                    </div>
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = history.map((entry, index) => {
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong style="color:var(--primary);">${entry.name || 'بدون اسم'}</strong></td>
                    <td>${entry.dateFormatted || '-'} <span style="color:var(--text-muted); font-size:0.8rem;">${entry.timeFormatted || ''}</span></td>
                    <td>${entry.products || 0} منتج</td>
                    <td class="actions">
                        <button class="btn-icon btn-edit" onclick="HistoryManager.view('${entry.id}')" title="عرض التقرير">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button class="btn-icon btn-delete" onclick="HistoryManager.delete('${entry.id}')" title="حذف">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

// ===== CSV Manager =====
const CSVManager = {
    encodeUTF8BOM(data) {
        const BOM = '\uFEFF';
        return BOM + data;
    },

    download(data, filename) {
        if (data.length === 0) {
            ToastManager.show('لا توجد بيانات للتصدير', 'warning');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => {
                const val = row[h] !== undefined ? String(row[h]) : '';
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    return '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            }).join(','))
        ].join('\n');

        const blob = new Blob([this.encodeUTF8BOM(csvContent)], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    },

    parse(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = this.parseLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseLine(lines[i]);
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
            });
            data.push(row);
        }

        return data;
    },

    parseLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    },

    // ===== EXPORT PRODUCTS - EXACTLY AS SHOWN IN IMAGE =====
    // Columns: code | name | type | composite_name | quantity
    // Single products: 1 row each (composite_name empty, quantity empty)
    // Composite products: EACH component in a SEPARATE row
    exportProducts() {
        const products = ProductManager.getAll();
        const data = [];

        products.forEach(p => {
            if (p.type === 'single') {
                // Single product: one row with empty composite_name and quantity
                data.push({
                    code: p.code,
                    name: p.name,
                    type: 'مفرد',
                    composite_name: '',
                    quantity: ''
                });
            } else {
                // Composite product: each component in a separate row
                if (p.components && p.components.length > 0) {
                    p.components.forEach(comp => {
                        const compProduct = ProductManager.getById(comp.productId);
                        data.push({
                            code: compProduct ? compProduct.code : '',
                            name: compProduct ? compProduct.name : '',
                            type: 'مركب',
                            composite_name: p.name,
                            quantity: comp.quantity
                        });
                    });
                }
            }
        });

        this.download(data, 'المنتجات.csv');
        ToastManager.show('تم تصدير المنتجات بنجاح', 'success');
    },

    exportInventory() {
        const products = ProductManager.getAll();
        const inventory = StorageManager.getInventory();
        const data = products.filter(p => inventory[p.id] > 0).map(p => ({
            code: p.code,
            name: p.name,
            quantity: inventory[p.id]
        }));
        this.download(data, 'الجرد.csv');
        ToastManager.show('تم تصدير الجرد بنجاح', 'success');
    },

    exportReport() {
        const report = ReportManager.calculateReport();
        const data = report.map(r => ({
            code: r.code,
            name: r.name,
            direct_quantity: r.directQty,
            in_packages: r.inPackages,
            total: r.total
        }));
        this.download(data, `التقرير_${new Date().toISOString().split('T')[0]}.csv`);
        ToastManager.show('تم تصدير التقرير بنجاح', 'success');
    }
};

// ===== Import Modal =====
const ImportModal = {
    currentFile: null,
    parsedData: [],

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('import-modal-close').addEventListener('click', () => this.close());
        document.getElementById('import-modal-cancel').addEventListener('click', () => this.close());
        document.getElementById('import-modal-confirm').addEventListener('click', () => this.confirm());
        document.getElementById('btn-choose-file').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        document.getElementById('import-file').addEventListener('change', (e) => this.handleFile(e));
    },

    open() {
        this.currentFile = null;
        this.parsedData = [];
        document.getElementById('import-file').value = '';
        document.getElementById('import-file-name').textContent = '';
        document.getElementById('import-preview').innerHTML = '';
        document.getElementById('import-modal').classList.add('active');
    },

    close() {
        document.getElementById('import-modal').classList.remove('active');
    },

    handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        this.currentFile = file;
        document.getElementById('import-file-name').textContent = file.name;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const cleanText = text.replace(/^\uFEFF/, '');
            this.parsedData = CSVManager.parse(cleanText);
            this.showPreview();
        };
        reader.readAsText(file, 'UTF-8');
    },

    showPreview() {
        const container = document.getElementById('import-preview');
        if (this.parsedData.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-muted);">لا توجد بيانات للمعاينة</p>';
            return;
        }

        const headers = Object.keys(this.parsedData[0]);
        const rows = this.parsedData.slice(0, 5);

        container.innerHTML = `
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
            ${this.parsedData.length > 5 ? `<p style="padding: 10px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">... و ${this.parsedData.length - 5} صفوف أخرى</p>` : ''}
        `;
    },

    confirm() {
        if (this.parsedData.length === 0) {
            ToastManager.show('يرجى اختيار ملف أولاً', 'warning');
            return;
        }

        const type = document.getElementById('import-type').value;

        if (type === 'products') {
            this.importProducts();
        } else {
            InventoryManager.importData(this.parsedData);
        }

        this.close();
    },

    // ===== IMPORT PRODUCTS - HANDLES NEW FORMAT =====
    // Format: code | name | type | composite_name | quantity
    // Groups rows by composite_name to build composite products
    importProducts() {
        let imported = 0;
        let skipped = 0;

        // First pass: identify all single products and composite groups
        const singleRows = [];
        const compositeGroups = {}; // key: composite_name, value: array of component rows

        this.parsedData.forEach(row => {
            const code = row.code || row['الكود'] || row['Code'] || '';
            const name = row.name || row['الاسم'] || row['Name'] || '';
            const typeStr = row.type || row['النوع'] || row['Type'] || '';
            const compositeName = row.composite_name || row['اسم المنتج المركب'] || row['Composite_Name'] || '';
            const qty = row.quantity || row['العدد'] || row['Quantity'] || '1';

            if (!code || !name) {
                skipped++;
                return;
            }

            const isComposite = typeStr === 'مركب' || typeStr === 'composite' || compositeName !== '';

            if (isComposite && compositeName) {
                // This is a component of a composite product
                if (!compositeGroups[compositeName]) {
                    compositeGroups[compositeName] = [];
                }
                compositeGroups[compositeName].push({
                    code: code.trim(),
                    name: name.trim(),
                    quantity: parseInt(qty) || 1
                });
            } else {
                singleRows.push({
                    code: code.trim(),
                    name: name.trim(),
                    type: (typeStr === 'مركب' || typeStr === 'composite') ? 'composite' : 'single'
                });
            }
        });

        // Import single products first
        singleRows.forEach(p => {
            const existing = ProductManager.getByCode(p.code);
            if (existing) {
                skipped++;
                return;
            }
            ProductManager.add({
                code: p.code,
                name: p.name,
                type: p.type,
                components: []
            });
            imported++;
        });

        // Import composite products
        Object.entries(compositeGroups).forEach(([compName, components]) => {
            // Check if composite already exists
            const existingComposite = ProductManager.getAll().find(p => p.name === compName && p.type === 'composite');
            if (existingComposite) {
                skipped++;
                return;
            }

            // Build components with resolved product IDs
            const builtComponents = [];
            components.forEach(comp => {
                const prod = ProductManager.getByCode(comp.code) || ProductManager.getAll().find(p => p.name === comp.name);
                if (prod) {
                    builtComponents.push({
                        productId: prod.id,
                        quantity: comp.quantity
                    });
                }
            });

            // Generate code for composite
            const compCode = 'COMP-' + Date.now().toString(36).substr(-4) + '-' + Math.random().toString(36).substr(2, 2);

            ProductManager.add({
                code: compCode,
                name: compName,
                type: 'composite',
                components: builtComponents
            });
            imported++;
        });

        ToastManager.show(`تم استيراد ${imported} منتج، تم تخطي ${skipped}`, imported > 0 ? 'success' : 'warning');
    }
};

// ===== Cloud Sync Manager (JSONBin.io) =====
const CloudSyncManager = {
    BASE_URL: 'https://api.jsonbin.io/v3/b',

    init() {
        // Load saved credentials
        document.getElementById('jsonbin-key').value = StorageManager.getJsonBinKey();
        document.getElementById('jsonbin-bin-id').value = StorageManager.getJsonBinId();

        this.setupEventListeners();
        this.updateStatus('offline', 'غير متصل');
    },

    setupEventListeners() {
        document.getElementById('btn-test-connection').addEventListener('click', () => this.testConnection());
        document.getElementById('btn-save-to-cloud').addEventListener('click', () => this.saveToCloud());
        document.getElementById('btn-load-from-cloud').addEventListener('click', () => this.loadFromCloud());

        document.getElementById('jsonbin-key').addEventListener('input', (e) => {
            StorageManager.setJsonBinKey(e.target.value);
        });
        document.getElementById('jsonbin-bin-id').addEventListener('input', (e) => {
            StorageManager.setJsonBinId(e.target.value);
        });
    },

    getHeaders() {
        const key = StorageManager.getJsonBinKey();
        return {
            'Content-Type': 'application/json',
            'X-Master-Key': key
        };
    },

    updateStatus(status, text, info = '') {
        const indicator = document.getElementById('sync-indicator');
        const infoEl = document.getElementById('sync-info');

        indicator.innerHTML = `
            <span class="status-dot ${status}"></span>
            <span class="status-text">${text}</span>
        `;
        infoEl.textContent = info;
    },

    async testConnection() {
        const key = StorageManager.getJsonBinKey();
        if (!key) {
            ToastManager.show('يرجى إدخال Master Key أولاً', 'warning');
            return;
        }

        this.updateStatus('offline', 'جاري الاختبار...');

        try {
            const response = await fetch(`${this.BASE_URL}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (response.ok) {
                this.updateStatus('online', 'متصل', 'تم الاتصال بـ JSONBin.io بنجاح');
                ToastManager.show('تم الاتصال بنجاح!', 'success');
            } else {
                const err = await response.json();
                this.updateStatus('error', 'خطأ في الاتصال', err.message || 'تحقق من المفتاح');
                ToastManager.show('فشل الاتصال: ' + (err.message || 'مفتاح غير صالح'), 'error');
            }
        } catch (e) {
            this.updateStatus('error', 'خطأ في الاتصال', 'تأكد من اتصال الإنترنت');
            ToastManager.show('فشل الاتصال بالسحابة', 'error');
        }
    },

    async saveToCloud() {
        const key = StorageManager.getJsonBinKey();
        if (!key) {
            ToastManager.show('يرجى إدخال Master Key أولاً', 'warning');
            return;
        }

        this.updateStatus('offline', 'جاري الحفظ...');

        const data = {
            products: StorageManager.getProducts(),
            inventory: StorageManager.getInventory(),
            approved: StorageManager.getApproved(),
            history: StorageManager.getHistory(),
            exportedAt: new Date().toISOString()
        };

        try {
            const binId = StorageManager.getJsonBinId();
            let response;

            if (binId) {
                // Update existing bin
                response = await fetch(`${this.BASE_URL}/${binId}`, {
                    method: 'PUT',
                    headers: this.getHeaders(),
                    body: JSON.stringify(data)
                });
            } else {
                // Create new bin
                response = await fetch(`${this.BASE_URL}`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                const result = await response.json();
                const newBinId = result.metadata?.id || binId;

                if (newBinId && !binId) {
                    StorageManager.setJsonBinId(newBinId);
                    document.getElementById('jsonbin-bin-id').value = newBinId;
                }

                this.updateStatus('online', 'تم الحفظ', `Bin ID: ${newBinId}`);
                ToastManager.show('تم حفظ البيانات في السحابة بنجاح!', 'success', 'تم الحفظ');
            } else {
                const err = await response.json();
                this.updateStatus('error', 'فشل الحفظ', err.message || 'خطأ غير معروف');
                ToastManager.show('فشل الحفظ: ' + (err.message || ''), 'error');
            }
        } catch (e) {
            this.updateStatus('error', 'فشل الحفظ', 'تأكد من اتصال الإنترنت');
            ToastManager.show('فشل الاتصال بالسحابة', 'error');
        }
    },

    async loadFromCloud() {
        const key = StorageManager.getJsonBinKey();
        const binId = StorageManager.getJsonBinId();

        if (!key) {
            ToastManager.show('يرجى إدخال Master Key أولاً', 'warning');
            return;
        }
        if (!binId) {
            ToastManager.show('يرجى إدخال معرّف Bin أو حفظ البيانات أولاً', 'warning');
            return;
        }

        if (!confirm('سيتم استبدال جميع البيانات المحلية بالبيانات من السحابة. هل أنت متأكد؟')) {
            return;
        }

        this.updateStatus('offline', 'جاري الاسترجاع...');

        try {
            const response = await fetch(`${this.BASE_URL}/${binId}/latest`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                const data = result.record;

                if (data) {
                    if (data.products) StorageManager.setProducts(data.products);
                    if (data.inventory) StorageManager.setInventory(data.inventory);
                    if (data.approved) StorageManager.setApproved(data.approved);
                    if (data.history) StorageManager.setHistory(data.history);

                    // Refresh all managers
                    ProductManager.products = StorageManager.getProducts();
                    InventoryManager.inventory = StorageManager.getInventory();

                    ProductManager.render();
                    InventoryManager.render();
                    ReportManager.render();
                    HistoryManager.render();

                    this.updateStatus('online', 'تم الاسترجاع', `آخر تحديث: ${data.exportedAt ? new Date(data.exportedAt).toLocaleString('ar-SA') : 'غير معروف'}`);
                    ToastManager.show('تم استرجاع البيانات من السحابة بنجاح!', 'success', 'تم الاسترجاع');
                }
            } else {
                const err = await response.json();
                this.updateStatus('error', 'فشل الاسترجاع', err.message || 'Bin غير موجود');
                ToastManager.show('فشل الاسترجاع: ' + (err.message || ''), 'error');
            }
        } catch (e) {
            this.updateStatus('error', 'فشل الاسترجاع', 'تأكد من اتصال الإنترنت');
            ToastManager.show('فشل الاتصال بالسحابة', 'error');
        }
    }
};

// ===== UI Manager =====
const UIManager = {
    init() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupExportReport();
    },

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pages = document.querySelectorAll('.page');
        const pageTitle = document.getElementById('page-title');

        const titles = {
            'inventory-input': 'إدخال الجرد',
            'final-report': 'التقرير النهائي',
            'history': 'سجل الجرد',
            'products': 'إدارة المنتجات',
            'cloud-sync': 'المزامنة السحابية'
        };

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = item.dataset.page;

                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                pages.forEach(p => p.classList.remove('active'));
                document.getElementById(`page-${pageId}`).classList.add('active');

                pageTitle.textContent = titles[pageId];

                document.getElementById('sidebar').classList.remove('open');

                if (pageId === 'final-report') ReportManager.render();
                if (pageId === 'history') HistoryManager.render();
                if (pageId === 'products') ProductManager.render();
                if (pageId === 'inventory-input') InventoryManager.render();
            });
        });
    },

    setupMobileMenu() {
        const toggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');

        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024 &&
                !sidebar.contains(e.target) &&
                !toggle.contains(e.target) &&
                sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    },

    setupExportReport() {
        document.getElementById('btn-export-report').addEventListener('click', () => {
            CSVManager.exportReport();
        });
    }
};

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    ToastManager.init();
    ProductManager.init();
    InventoryManager.init();
    ReportManager.init();
    HistoryManager.init();
    ImportModal.init();
    ApproveModal.init();
    CloudSyncManager.init();
    UIManager.init();
});