/* ============================================================
   chat.js — Tư vấn trực tuyến (API ChatController)
   ============================================================ */

const CHAT_POLL_MS = 4000;

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("medcare_user") || "null");
    } catch {
        return null;
    }
}

function renderChatBubble(m, isMine) {
    const time = new Date(m.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    return `
        <div class="chat-msg ${isMine ? "mine" : "theirs"}">
            <div class="chat-bubble">
                <div class="chat-text">${escapeHtml(m.text || "")}</div>
                <div class="chat-meta">${escapeHtml(m.senderName || "")} · ${time}</div>
            </div>
        </div>
    `;
}

/* ---------- Số tin chưa đọc (dùng trên Dashboard) ---------- */
async function chatTotalUnreadPharmacistAsync() {
    try {
        const data = await apiGet(API.CHAT_UNREAD);
        return data && data.count != null ? data.count : 0;
    } catch {
        return 0;
    }
}

// Giữ tên cũ (sync) — trả 0; Dashboard dùng API riêng
function chatTotalUnreadPharmacist() {
    return 0;
}

/* ============================================================
   TRANG KHÁCH HÀNG
   ============================================================ */
function initCustomerChat() {
    const root = document.getElementById("chatRoot");
    if (!root) return;

    const user = getCurrentUser();
    if (!user) {
        root.innerHTML = `
            <div class="empty">
                Vui lòng <a href="/Auth/Login">đăng nhập</a> để sử dụng tư vấn trực tuyến.
            </div>`;
        return;
    }

    let peerId = null;
    const wrap = document.getElementById("chatMessages");
    const input = document.getElementById("chatInput");
    const btn = document.getElementById("chatSend");

    async function ensurePharmacist() {
        try {
            const convs = await apiGet(API.CHAT_CONVERSATIONS);
            if (Array.isArray(convs) && convs.length) {
                peerId = convs[0].peerId;
                return;
            }
            const list = await apiGet("/chat/pharmacists");
            if (Array.isArray(list) && list.length) {
                peerId = list[0].id;
            }
        } catch (err) {
            showToast(err.message || "Không tìm được dược sĩ", "error");
        }
    }

    async function render() {
        if (!peerId || !wrap) return;
        try {
            const msgs = await apiGet(`${API.CHAT_MESSAGES}?peerId=${peerId}`);
            const list = Array.isArray(msgs) ? msgs : [];
            wrap.innerHTML = list.length
                ? list.map(m => renderChatBubble(m, !!m.isMine)).join("")
                : `<div class="empty">Bắt đầu cuộc trò chuyện với dược sĩ 💬</div>`;
            wrap.scrollTop = wrap.scrollHeight;
            await apiPut(`${API.CHAT_MESSAGES}/read?peerId=${peerId}`, {});
        } catch (err) {
            console.warn(err);
        }
    }

    async function send() {
        const t = (input.value || "").trim();
        if (!t || !peerId) return;
        try {
            await apiPost(API.CHAT_MESSAGES, { receiverId: peerId, content: t });
            input.value = "";
            await render();
        } catch (err) {
            showToast(err.message || "Gửi tin thất bại", "error");
        }
    }

    (async () => {
        await ensurePharmacist();
        if (!peerId) {
            if (wrap) wrap.innerHTML = `<div class="empty">Hiện chưa có dược sĩ trực tuyến.</div>`;
            return;
        }
        if (btn) btn.addEventListener("click", send);
        if (input) input.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
        });
        await render();
        setInterval(render, CHAT_POLL_MS);
    })();
}

/* ============================================================
   TRANG DƯỢC SĨ
   ============================================================ */
function initPharmacistChat() {
    const root = document.getElementById("chatRoot");
    if (!root) return;

    const user = getCurrentUser();
    if (!user || (user.role !== "pharmacist" && user.role !== "admin")) {
        root.innerHTML = `<div class="empty">Bạn không có quyền truy cập tư vấn trực tuyến.</div>`;
        return;
    }

    let activePeerId = null;
    let convsCache = [];

    const listEl = document.getElementById("chatConvList");
    const msgEl = document.getElementById("chatMessages");
    const input = document.getElementById("chatInput");
    const btn = document.getElementById("chatSend");
    const headerEl = document.getElementById("chatHeader");

    async function loadConvs() {
        try {
            const convs = await apiGet(API.CHAT_CONVERSATIONS);
            convsCache = Array.isArray(convs) ? convs : [];
            renderList();
        } catch (err) {
            if (listEl) listEl.innerHTML = `<div class="empty" style="padding:20px 10px">${escapeHtml(err.message || "Lỗi tải hội thoại")}</div>`;
        }
    }

    function renderList() {
        if (!listEl) return;
        if (!convsCache.length) {
            listEl.innerHTML = `<div class="empty" style="padding:20px 10px">Chưa có cuộc trò chuyện nào.</div>`;
            return;
        }
        listEl.innerHTML = convsCache.map(c => `
            <div class="conv-item ${c.peerId === activePeerId ? "active" : ""}"
                 onclick="chatSelectConv(${c.peerId})">
                <div class="conv-avatar">👤</div>
                <div class="conv-body">
                    <div class="conv-name">${escapeHtml(c.peerName || "")}</div>
                    <div class="conv-last">${escapeHtml(c.lastMessage || "—")}</div>
                </div>
                ${c.unread ? `<span class="conv-badge">${c.unread}</span>` : ""}
            </div>
        `).join("");
    }

    async function renderMessages() {
        if (!activePeerId) {
            if (headerEl) headerEl.textContent = "Chọn một cuộc trò chuyện";
            if (msgEl) msgEl.innerHTML = `<div class="empty">Chọn cuộc trò chuyện bên trái để xem tin nhắn.</div>`;
            return;
        }
        const conv = convsCache.find(c => c.peerId === activePeerId);
        if (headerEl) {
            headerEl.textContent = conv
                ? `${conv.peerName} · ${conv.peerEmail || ""}`
                : ("User #" + activePeerId);
        }
        try {
            const msgs = await apiGet(`${API.CHAT_MESSAGES}?peerId=${activePeerId}`);
            const list = Array.isArray(msgs) ? msgs : [];
            if (msgEl) {
                msgEl.innerHTML = list.length
                    ? list.map(m => renderChatBubble(m, !!m.isMine)).join("")
                    : `<div class="empty">Chưa có tin nhắn.</div>`;
                msgEl.scrollTop = msgEl.scrollHeight;
            }
            await apiPut(`${API.CHAT_MESSAGES}/read?peerId=${activePeerId}`, {});
            // Cập nhật badge unread local
            if (conv) conv.unread = 0;
            renderList();
        } catch (err) {
            if (msgEl) msgEl.innerHTML = `<div class="empty">${escapeHtml(err.message || "Lỗi")}</div>`;
        }
    }

    window.chatSelectConv = (peerId) => {
        activePeerId = peerId;
        renderList();
        renderMessages();
    };

    async function send() {
        const t = (input.value || "").trim();
        if (!t || !activePeerId) return;
        try {
            await apiPost(API.CHAT_MESSAGES, { receiverId: activePeerId, content: t });
            input.value = "";
            await loadConvs();
            await renderMessages();
        } catch (err) {
            showToast(err.message || "Gửi tin thất bại", "error");
        }
    }

    if (btn) btn.addEventListener("click", send);
    if (input) input.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });

    loadConvs();
    setInterval(async () => {
        await loadConvs();
        if (activePeerId) await renderMessages();
    }, CHAT_POLL_MS);
}