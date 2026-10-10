/* ============================================================
   chat.js — Module tư vấn trực tuyến (Khách hàng ↔ Dược sĩ)
   Demo dùng localStorage. Khi có backend, thay các hàm
   chatGetConvs / chatSaveConvs / chatGetMsgs / chatSaveMsgs / chatSend
   bằng apiGet/apiPost tương ứng:
     GET  /api/consultations
     POST /api/consultations/{id}/messages
     POST /api/consultations/mark-read
   ============================================================ */

const CHAT_CONV_KEY = "medcare_chat_convs";
const CHAT_MSG_KEY  = "medcare_chat_msgs";
const CHAT_POLL_MS  = 2000;

/* ---------- Storage helpers ---------- */
function chatGetConvs()      { return LS.get(CHAT_CONV_KEY, []); }
function chatSaveConvs(l)    { LS.set(CHAT_CONV_KEY, l); }
function chatGetMsgs()       { return LS.get(CHAT_MSG_KEY, []); }
function chatSaveMsgs(l)     { LS.set(CHAT_MSG_KEY, l); }

function chatUid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------- Tạo / lấy hội thoại của khách ---------- */
function chatEnsureCustomerConv(user) {
    const convs = chatGetConvs();
    let conv = convs.find(c => c.customerEmail === user.email);
    if (!conv) {
        conv = {
            id: chatUid("C"),
            customerEmail: user.email,
            customerName:  user.name || user.email,
            createdAt:    new Date().toISOString(),
            lastUpdate:   new Date().toISOString(),
            lastMessage:  "",
            unreadPharmacist: 0,
            unreadCustomer:   0
        };
        convs.push(conv);
        chatSaveConvs(convs);
    }
    return conv;
}

/* ---------- Gửi tin nhắn ---------- */
function chatSend(convId, senderRole, senderName, text) {
    if (!text || !text.trim()) return null;
    const msgs = chatGetMsgs();
    const msg = {
        id: chatUid("M"),
        convId,
        sender: senderRole,          // "customer" | "pharmacist"
        senderName,
        text: text.trim(),
        at: new Date().toISOString()
    };
    msgs.push(msg);
    chatSaveMsgs(msgs);

    const convs = chatGetConvs();
    const conv = convs.find(c => c.id === convId);
    if (conv) {
        conv.lastUpdate  = msg.at;
        conv.lastMessage = msg.text;
        if (senderRole === "customer")   conv.unreadPharmacist = (conv.unreadPharmacist || 0) + 1;
        if (senderRole === "pharmacist") conv.unreadCustomer   = (conv.unreadCustomer   || 0) + 1;
        chatSaveConvs(convs);
    }
    return msg;
}

function chatGetMessages(convId) {
    return chatGetMsgs().filter(m => m.convId === convId);
}
function chatMarkRead(convId, side) {
    const convs = chatGetConvs();
    const conv = convs.find(c => c.id === convId);
    if (!conv) return;
    if (side === "pharmacist") conv.unreadPharmacist = 0;
    if (side === "customer")   conv.unreadCustomer   = 0;
    chatSaveConvs(convs);
}
function chatTotalUnreadPharmacist() {
    return chatGetConvs().reduce((s, c) => s + (c.unreadPharmacist || 0), 0);
}

/* ---------- Render 1 bong bóng tin nhắn ---------- */
function renderChatBubble(m, isMine) {
    const time = new Date(m.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    return `
        <div class="chat-msg ${isMine ? "mine" : "theirs"}">
            <div class="chat-bubble">
                <div class="chat-text">${escapeHtml(m.text)}</div>
                <div class="chat-meta">${escapeHtml(m.senderName)} · ${time}</div>
            </div>
        </div>
    `;
}

/* ============================================================
   TRANG KHÁCH HÀNG — customer/consultation.html
   ============================================================ */
function initCustomerChat() {
    const root = document.getElementById("chatRoot");
    if (!root) return;

    const user = getCurrentUser();
    if (!user) {
        root.innerHTML = `
            <div class="empty">
                Vui lòng
                <a href="login.html?next=/customer/consultation.html">đăng nhập</a>
                để sử dụng tư vấn trực tuyến.
            </div>`;
        return;
    }

    const conv = chatEnsureCustomerConv(user);

    const wrap  = document.getElementById("chatMessages");
    const input = document.getElementById("chatInput");
    const btn   = document.getElementById("chatSend");

    function render() {
        const msgs = chatGetMessages(conv.id);
        wrap.innerHTML = msgs.length
            ? msgs.map(m => renderChatBubble(m, m.sender === "customer")).join("")
            : `<div class="empty">Bắt đầu cuộc trò chuyện với dược sĩ 💬</div>`;
        wrap.scrollTop = wrap.scrollHeight;
    }

    function send() {
        const t = input.value;
        if (!t.trim()) return;
        chatSend(conv.id, "customer", user.name || user.email, t);
        input.value = "";
        chatMarkRead(conv.id, "customer");
        render();
    }

    btn.addEventListener("click", send);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });

    render();
    chatMarkRead(conv.id, "customer");

    setInterval(() => {
        render();
        chatMarkRead(conv.id, "customer");
    }, CHAT_POLL_MS);

    window.addEventListener("storage", e => {
        if (e.key === CHAT_MSG_KEY || e.key === CHAT_CONV_KEY) render();
    });
}

/* ============================================================
   TRANG DƯỢC SĨ — pharmacist/consultation.html
   ============================================================ */
function initPharmacistChat() {
    const root = document.getElementById("chatRoot");
    if (!root) return;

    const user = getCurrentUser();
    if (!user || (user.role !== "pharmacist" && user.role !== "admin")) {
        root.innerHTML = `<div class="empty">Bạn không có quyền truy cập tư vấn trực tuyến.</div>`;
        return;
    }

    let activeConvId = null;

    const listEl   = document.getElementById("chatConvList");
    const msgEl    = document.getElementById("chatMessages");
    const input    = document.getElementById("chatInput");
    const btn      = document.getElementById("chatSend");
    const headerEl = document.getElementById("chatHeader");

    function renderList() {
        const convs = chatGetConvs()
            .sort((a, b) => (b.lastUpdate || "").localeCompare(a.lastUpdate || ""));

        if (!convs.length) {
            listEl.innerHTML = `<div class="empty" style="padding:20px 10px">Chưa có cuộc trò chuyện nào.</div>`;
            return;
        }
        listEl.innerHTML = convs.map(c => `
            <div class="conv-item ${c.id === activeConvId ? "active" : ""}"
                 onclick="chatSelectConv('${c.id}')">
                <div class="conv-avatar">👤</div>
                <div class="conv-body">
                    <div class="conv-name">${escapeHtml(c.customerName)}</div>
                    <div class="conv-last">${escapeHtml(c.lastMessage || "—")}</div>
                </div>
                ${c.unreadPharmacist
                    ? `<span class="conv-badge">${c.unreadPharmacist}</span>`
                    : ""}
            </div>
        `).join("");
    }

    function renderMessages() {
        if (!activeConvId) {
            headerEl.textContent = "Chọn một cuộc trò chuyện";
            msgEl.innerHTML = `<div class="empty">Chọn cuộc trò chuyện bên trái để xem tin nhắn.</div>`;
            return;
        }
        const conv = chatGetConvs().find(c => c.id === activeConvId);
        if (!conv) { activeConvId = null; return renderMessages(); }

        headerEl.textContent = conv.customerName + " · " + conv.customerEmail;
        const msgs = chatGetMessages(activeConvId);
        msgEl.innerHTML = msgs.length
            ? msgs.map(m => renderChatBubble(m, m.sender === "pharmacist")).join("")
            : `<div class="empty">Chưa có tin nhắn.</div>`;
        msgEl.scrollTop = msgEl.scrollHeight;
    }

    window.chatSelectConv = (id) => {
        activeConvId = id;
        chatMarkRead(id, "pharmacist");
        renderList();
        renderMessages();
    };

    function send() {
        if (!activeConvId) { showToast("Chọn cuộc trò chuyện trước", "warn"); return; }
        const t = input.value;
        if (!t.trim()) return;
        chatSend(activeConvId, "pharmacist", user.name || "Dược sĩ", t);
        input.value = "";
        renderList();
        renderMessages();
    }

    btn.addEventListener("click", send);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });

    function tick() { renderList(); renderMessages(); }
    tick();
    setInterval(tick, CHAT_POLL_MS);
    window.addEventListener("storage", e => {
        if (e.key === CHAT_MSG_KEY || e.key === CHAT_CONV_KEY) tick();
    });
}

/* ---------- Bootstrap: tự phát hiện trang ---------- */
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("chatRoot") &&
        document.getElementById("chatConvList")) {
        initPharmacistChat();
    } else if (document.getElementById("chatRoot")) {
        initCustomerChat();
    }
});