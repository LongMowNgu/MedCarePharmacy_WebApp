/* ============================================================
   main.js — Tiện ích dùng chung toàn hệ thống
   Bao gồm: format, toast, escape HTML, query params, storage.
   ============================================================ */

/* --------- Format --------- */
function formatPrice(v) {
    return Number(v || 0).toLocaleString("vi-VN") + "đ";
}
function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("vi-VN");
}
function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString("vi-VN");
}

/* --------- Escape HTML (chống XSS khi render từ dữ liệu) --------- */
function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/* --------- Toast --------- */
function ensureToastEl() {
    let el = document.getElementById("toast");
    if (!el) {
        el = document.createElement("div");
        el.id = "toast";
        el.className = "toast";
        document.body.appendChild(el);
    }
    return el;
}
function showToast(message, type = "info") {
    const el = ensureToastEl();
    el.textContent = message;
    el.style.background =
        type === "error" ? "#b91c1c" :
        type === "warn"  ? "#b45309" :
        "#16352d";
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2400);
}

/* --------- Query string --------- */
function getQuery(name) {
    return new URLSearchParams(location.search).get(name) || "";
}

/* --------- localStorage helpers --------- */
const LS = {
    get(key, fallback = null) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
        catch { return fallback; }
    },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
    remove(key) { localStorage.removeItem(key); }
};

/* --------- Danh mục dùng chung --------- */
const CATEGORIES = [
    { id: "Thuốc",              icon: "💊" },
    { id: "Vitamin",            icon: "🍊" },
    { id: "Dược mỹ phẩm",       icon: "🧴" },
    { id: "Thiết bị y tế",      icon: "🩺" },
    { id: "Chăm sóc cá nhân",   icon: "🧼" },
    { id: "Mẹ & Bé",            icon: "👶" }
];

/* --------- Sản phẩm demo (giữ để tương thích chỗ khác nếu còn dùng) --------- */
const DEMO_PRODUCTS = [ /* giữ nguyên mảng cũ nếu cart.js còn tham chiếu */ ];

/* --------- Sản phẩm nổi bật trang chủ – lấy từ API --------- */
async function renderHomeProducts() {
    const listEl = document.getElementById("productList");
    if (!listEl) return;

    listEl.innerHTML = `<p class="empty">Đang tải sản phẩm...</p>`;

    try {
        const sortEl = document.getElementById("sortSelect");
        let endpoint = (typeof API !== "undefined" && API.PRODUCTS) ? API.PRODUCTS : "/api/products";
        endpoint += "?";
        if (sortEl && sortEl.value === "low") endpoint += "sort=low&";
        if (sortEl && sortEl.value === "high") endpoint += "sort=high&";

        const products = await apiGet(endpoint);
        if (!products || !products.length) {
            listEl.innerHTML = `<p class="empty">Chưa có sản phẩm nào.</p>`;
            return;
        }

        let data = products.slice(0, 8);

        listEl.innerHTML = data.map(p => {
            const cat = (p.category && p.category.name) ? p.category.name : (p.category || "—");
            const img = p.imageUrl && p.imageUrl.trim()
                ? (p.imageUrl.startsWith("http") || p.imageUrl.startsWith("/") ? p.imageUrl : "/" + p.imageUrl)
                : null;
            const imgHtml = img
                ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" style="max-width:100%;max-height:120px;object-fit:contain" onerror="this.parentElement.innerHTML='💊'">`
                : "💊";
            return `
                <article class="product">
                    <div class="product-image">${imgHtml}</div>
                    <div class="product-body">
                        <span class="product-category">${escapeHtml(cat)}</span>
                        <h3><a href="/Customer/ProductDetail?id=${p.id}">${escapeHtml(p.name)}</a></h3>
                        <div class="price">${formatPrice(p.price)}</div>
                        <button class="add-cart" onclick="addToCartFromApi(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}', ${p.price}, '${escapeHtml(p.unit || "Hộp")}', '${img || "💊"}', ${p.stockQuantity ?? 0})">Thêm vào giỏ</button>
                    </div>
                </article>
            `;
        }).join("");
    } catch (err) {
        listEl.innerHTML = `<p class="empty">Không tải được sản phẩm. Vui lòng thử lại.</p>`;
        console.warn(err);
    }
}

/* ---------- Modal dùng chung ---------- */
function openModal(html, actions = []) {
    let bd = document.getElementById("globalModal");
    if (!bd) {
        bd = document.createElement("div");
        bd.id = "globalModal";
        bd.className = "modal-backdrop";
        bd.innerHTML = `<div class="modal" id="globalModalBody"></div>`;
        bd.addEventListener("click", e => { if (e.target === bd) closeModal(); });
        document.body.appendChild(bd);
    }
    const body = document.getElementById("globalModalBody");
    body.innerHTML = html + `
        <div class="modal-actions">
            ${actions.map(a => `<button class="btn ${a.cls || ''}" onclick="${a.onclick || ''}">${a.label}</button>`).join("")}
            <button class="btn muted" onclick="closeModal()">Đóng</button>
        </div>
    `;
    bd.classList.add("show");
}
function closeModal() {
    const bd = document.getElementById("globalModal");
    if (bd) bd.classList.remove("show");
}