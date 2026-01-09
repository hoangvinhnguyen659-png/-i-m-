import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB7eohUunH5fip0MXPDKVuPl9ZUx7dVGJc",
  authDomain: "diem-6f691.firebaseapp.com",
  databaseURL: "https://diem-6f691-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "diem-6f691",
  storageBucket: "diem-6f691.firebasestorage.app",
  messagingSenderId: "474870778720",
  appId: "1:474870778720:web:be653045215280cfab2c05"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- CẤU HÌNH TÀI KHOẢN ---
const ACCOUNTS = {
    'admin': '1528',
    'to1': '5828',
    'to2': '2028',
    'to3': '9028',
    'to4': '1928'
};

const ACCOUNT_NAMES = {
    'admin': 'Quản trị viên',
    'to1': 'Tổ 1',
    'to2': 'Tổ 2',
    'to3': 'Tổ 3',
    'to4': 'Tổ 4'
};

// --- DỮ LIỆU APP ---
const TOTAL_STUDENTS = 42;
const SUBJECTS = [
    { id: 'Toán', name: 'Toán Học', icon: '📐' },
    { id: 'Lí', name: 'Vật Lí', icon: '⚡' },
    { id: 'Hóa', name: 'Hóa Học', icon: '🧪' },
    { id: 'Sinh', name: 'Sinh Học', icon: '🧬' },
    { id: 'Tin', name: 'Tin Học', icon: '💻' },
    { id: 'Văn', name: 'Ngữ Văn', icon: '📚' },
    { id: 'Sử', name: 'Lịch Sử', icon: '🏰' },
    { id: 'Anh', name: 'Tiếng Anh', icon: '🌏' },
    { id: 'GDQP', name: 'GDQP', icon: '🛡️' },
    { id: 'Khác', name: 'Hoạt động khác', icon: '⭐', adminOnly: true } // Đánh dấu chỉ Admin
];

let currentUser = null; // Lưu user id ('admin', 'to1',...) hoặc null
let classData = {}; 
let currentStudentId = "";
let currentScoreType = "plus"; 
let currentSubject = null; 

document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    
    // Tải dữ liệu Firebase
    const dataRef = ref(db, 'students');
    onValue(dataRef, (snapshot) => {
        classData = snapshot.val() || {};
        if (currentSubject) {
            renderStudentList(currentSubject);
        }
    });
});

// --- HELPER: TOAST NOTIFICATION (Thay thế Alert) ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = type === 'success' ? '✅' : (type === 'error' ? '🚫' : 'ℹ️');
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Tự biến mất sau 3 giây
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- LOGIC AUTH ---
window.handleAuthAction = function() {
    if (currentUser) {
        // Đang đăng nhập -> Xử lý đăng xuất
        if(confirm("Bạn muốn đăng xuất?")) {
            currentUser = null;
            updateAuthButton();
            showToast("Đã đăng xuất thành công");
            showDashboard(); // Quay về trang chủ
        }
    } else {
        // Chưa đăng nhập -> Mở modal
        document.getElementById('password-input').value = "";
        document.getElementById('login-error').style.display = 'none'; // Ẩn lỗi cũ
        document.getElementById('modal-login').style.display = 'block';
    }
}

window.performLogin = function() {
    const user = document.getElementById('login-user-select').value;
    const pass = document.getElementById('password-input').value;

    if (ACCOUNTS[user] === pass) {
        currentUser = user;
        closeModal('modal-login');
        updateAuthButton();
        showToast(`Xin chào ${ACCOUNT_NAMES[user]}!`, 'success');
    } else {
        document.getElementById('login-error').style.display = 'block';
        // Hiệu ứng rung nhẹ input để báo sai
        const input = document.getElementById('password-input');
        input.style.borderColor = 'var(--danger)';
        setTimeout(() => input.style.borderColor = 'var(--border)', 500);
    }
}

function updateAuthButton() {
    const btn = document.getElementById('auth-btn');
    if (currentUser) {
        btn.innerHTML = `<span class="icon">🚪</span> Đăng xuất (${ACCOUNT_NAMES[currentUser]})`;
        btn.classList.add('logout-mode');
    } else {
        btn.innerHTML = `<span class="icon">🔒</span> Đăng nhập`;
        btn.classList.remove('logout-mode');
    }
}

// --- NAVIGATION ---
window.renderDashboard = function() {
    const grid = document.getElementById('subject-grid');
    grid.innerHTML = "";
    
    SUBJECTS.forEach(sub => {
        const card = document.createElement('div');
        // Thêm class locked nếu là Admin only
        card.className = `subject-card ${sub.adminOnly ? 'locked' : ''}`;
        card.onclick = () => openSubject(sub);
        
        let iconHtml = `<span class="sbj-icon">${sub.icon}</span>`;
        if (sub.adminOnly) iconHtml = `<span class="sbj-icon">🔐</span>`; // Icon khóa cho Admin

        card.innerHTML = `
            ${iconHtml}
            <span class="sbj-name">${sub.name}</span>
        `;
        grid.appendChild(card);
    });
}

window.openSubject = function(subjectObj) {
    // KIỂM TRA QUYỀN
    if (!currentUser) {
        showToast("Vui lòng đăng nhập để xem danh sách!", "error");
        handleAuthAction();
        return;
    }

    // Logic chặn user thường vào mục Admin
    if (subjectObj.adminOnly && currentUser !== 'admin') {
        showToast("Chỉ tài khoản ADMIN mới được truy cập mục này!", "error");
        return;
    }

    currentSubject = subjectObj;
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    
    document.getElementById('current-subject-badge').innerText = subjectObj.name;
    renderStudentList(subjectObj);
}

window.showDashboard = function() {
    currentSubject = null;
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
}

function renderStudentList(subjectObj) {
    const listContainer = document.getElementById('student-list');
    listContainer.innerHTML = ""; 
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= TOTAL_STUDENTS; i++) {
        const studentId = `student_${i}`;
        const name = `Học sinh ${i}`;
        const total = calculateTotal(studentId, subjectObj.id);
        
        const row = document.createElement('div');
        row.className = 'student-row';
        row.onclick = () => openOptionModal(studentId, name);

        let scoreClass = 'neu';
        if (total > 0) scoreClass = 'pos';
        if (total < 0) scoreClass = 'neg';

        const displayScore = (total > 0 ? '+' : '') + total;

        row.innerHTML = `
            <span class="s-name">${name}</span>
            <span class="s-score ${scoreClass}">${displayScore}</span>
        `;
        fragment.appendChild(row);
    }
    listContainer.appendChild(fragment);
}

function calculateTotal(studentId, subjectId) {
    if (!classData[studentId]) return 0;
    const records = Object.values(classData[studentId]);
    const filtered = records.filter(item => (item.subject || 'Khác') === subjectId);
    const total = filtered.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total * 100) / 100;
}

// --- MODAL & ACTIONS ---
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.openOptionModal = function(id, name) {
    currentStudentId = id;
    document.getElementById('opt-student-name').innerText = name;
    document.getElementById('opt-subject-name').innerText = currentSubject.name;
    document.getElementById('modal-options').style.display = 'block';
}

window.checkPermissionAndShowAdd = function() {
    closeModal('modal-options');
    // Ở đây không cần check quyền lại vì nếu đã vào được list thì đã có quyền rồi
    // Tuy nhiên nếu cần bảo mật kỹ hơn thì check currentUser ở đây
    
    document.getElementById('modal-add').style.display = 'block';
    document.getElementById('add-student-name').innerText = document.getElementById('opt-student-name').innerText;
    document.getElementById('add-subject-tag').innerText = currentSubject.name;
    
    document.getElementById('score-input').value = "";
    document.getElementById('reason-input').value = "";
    document.getElementById('score-input').focus(); // Tự động focus nhập điểm
    setScoreType('plus');
}

window.setScoreType = function(type) {
    currentScoreType = type;
    document.getElementById('btn-plus').className = type === 'plus' ? 'type-btn active' : 'type-btn';
    document.getElementById('btn-minus').className = type === 'minus' ? 'type-btn active' : 'type-btn';
}

window.saveScore = function() {
    const val = document.getElementById('score-input').value;
    const reason = document.getElementById('reason-input').value;

    if (!val) {
        showToast("Vui lòng nhập số điểm!", "error");
        return;
    }
    
    let score = Math.abs(parseFloat(val));
    if (currentScoreType === 'minus') score = -score;

    push(ref(db, `students/${currentStudentId}`), {
        score: score,
        subject: currentSubject.id, 
        reason: reason || "",
        date: new Date().toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', hour:'2-digit', minute:'2-digit'}),
        user: currentUser // Lưu lại ai là người nhập điểm
    }).then(() => {
        closeModal('modal-add');
        showToast("Đã lưu điểm thành công", "success");
    });
}

window.viewHistory = function() {
    closeModal('modal-options');
    document.getElementById('modal-history').style.display = 'block';
    document.getElementById('hist-student-name').innerText = document.getElementById('opt-student-name').innerText;
    document.getElementById('hist-subject-name').innerText = currentSubject.name;

    const tbody = document.getElementById('history-body');
    tbody.innerHTML = "";
    
    if (!classData[currentStudentId]) {
        tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Trống</td></tr>";
        return;
    }

    const records = Object.entries(classData[currentStudentId]).reverse();
    const filteredRecords = records.filter(([key, item]) => (item.subject || 'Khác') === currentSubject.id);

    if (filteredRecords.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Chưa có lịch sử</td></tr>";
        return;
    }

    filteredRecords.forEach(([key, item]) => {
        const color = item.score >= 0 ? 'var(--success)' : 'var(--danger)';
        // Cho phép xóa nếu là Admin HOẶC chính người nhập xóa điểm của mình (tuỳ chọn)
        // Ở đây tôi cho phép tất cả user đã đăng nhập xóa để dễ quản lý, hoặc bạn có thể siết chặt hơn
        const delBtn = `<button class="btn-del" onclick="deleteScore('${key}')">Xóa</button>`;
        
        tbody.innerHTML += `<tr>
            <td><small style="color:#888">${item.date}</small></td>
            <td>${item.reason}</td>
            <td class="text-right" style="color:${color}; font-weight:bold">${item.score}</td>
            <td class="text-center">${delBtn}</td>
        </tr>`;
    });
}

window.deleteScore = function(key) {
    if (confirm("Bạn có chắc muốn xóa điểm này?")) {
        remove(ref(db, `students/${currentStudentId}/${key}`)).then(() => {
            viewHistory(); // Refresh bảng
            showToast("Đã xóa dữ liệu", "success");
        });
    }
}

window.onclick = (e) => { if (e.target.classList.contains('modal')) closeModal(e.target.id); }
