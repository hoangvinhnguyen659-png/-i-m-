import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const ACCOUNTS = {
    'admin': { pass: '1528', name: 'Quản trị viên' },
    'to1': { pass: '5828', name: 'Tổ 1' },
    'to2': { pass: '2028', name: 'Tổ 2' },
    'to3': { pass: '9028', name: 'Tổ 3' },
    'to4': { pass: '1928', name: 'Tổ 4' }
};

const SUBJECTS = [
    { id: 'Toán', name: 'Toán Học', icon: 'ri-function-line' },
    { id: 'Lí', name: 'Vật Lí', icon: 'ri-flashlight-line' },
    { id: 'Hóa', name: 'Hóa Học', icon: 'ri-test-tube-line' },
    { id: 'Sinh', name: 'Sinh Học', icon: 'ri-plant-line' },
    { id: 'Tin', name: 'Tin Học', icon: 'ri-computer-line' },
    { id: 'Văn', name: 'Ngữ Văn', icon: 'ri-book-open-line' },
    { id: 'Sử', name: 'Lịch Sử', icon: 'ri-ancient-gate-line' },
    { id: 'Anh', name: 'Tiếng Anh', icon: 'ri-global-line' },
    { id: 'GDQP', name: 'GDQP', icon: 'ri-shield-star-line' },
    { id: 'Khác', name: 'Hoạt động khác', icon: 'ri-star-smile-line', adminOnly: true }
];

const TOTAL_STUDENTS = 42;
let currentUser = null; 
let classData = {}; 
let currentStudentId = "";
let currentScoreType = "plus"; 
let currentSubject = null; 
let pendingDeleteKey = null;

document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    
    const dataRef = ref(db, 'students');
    onValue(dataRef, (snapshot) => {
        classData = snapshot.val() || {};
        if (currentSubject && document.getElementById('detail-view').style.display !== 'none') {
            renderStudentList(currentSubject);
        }
        if(document.getElementById('modal-history').style.display === 'block') {
            viewHistory();
        }
    });
});

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// AUTH
window.handleAuthAction = function() {
    if (currentUser) {
        document.getElementById('modal-logout-confirm').style.display = 'block';
    } else {
        document.getElementById('login-username').value = ""; 
        document.getElementById('password-input').value = "";
        document.getElementById('login-error').style.display = 'none';
        document.getElementById('modal-login').style.display = 'block';
        setTimeout(() => document.getElementById('login-username').focus(), 100);
    }
}

window.confirmLogout = function() {
    currentUser = null;
    closeModal('modal-logout-confirm');
    updateAuthButton();
    showToast("Đã đăng xuất");
    showDashboard();
}

window.performLogin = function() {
    const usernameInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passwordInput = document.getElementById('password-input').value;

    const account = ACCOUNTS[usernameInput];

    if (account && account.pass === passwordInput) {
        currentUser = usernameInput;
        closeModal('modal-login');
        updateAuthButton();
        showToast(`Xin chào ${account.name}`);
    } else {
        document.getElementById('login-error').style.display = 'block';
        document.getElementById('login-error').innerText = "Tên tài khoản hoặc mật khẩu sai";
    }
}

function updateAuthButton() {
    const btn = document.getElementById('auth-btn');
    if (currentUser) {
        btn.innerText = "Đăng xuất";
        btn.classList.add('logout-mode');
    } else {
        btn.innerText = "Đăng nhập";
        btn.classList.remove('logout-mode');
    }
}

// RENDER
window.renderDashboard = function() {
    const grid = document.getElementById('subject-grid');
    grid.innerHTML = "";
    SUBJECTS.forEach(sub => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.onclick = () => openSubject(sub);
        card.innerHTML = `
            <i class="subject-icon-box ${sub.icon}"></i>
            <span class="sbj-name">${sub.name}</span>
        `;
        grid.appendChild(card);
    });
}

window.openSubject = function(subjectObj) {
    if (subjectObj.adminOnly && currentUser !== 'admin') {
        showToast("Mục này chỉ dành cho ADMIN");
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

window.renderStudentList = function(subjectObj) {
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
    const filtered = records.filter(item => 
        (item.subject || 'Khác') === subjectId && !item.deleted
    );
    const total = filtered.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total * 10) / 10;
}

// MODAL HELPERS
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.openOptionModal = function(id, name) {
    currentStudentId = id;
    document.getElementById('opt-student-name').innerText = name;
    document.getElementById('opt-subject-name').innerText = currentSubject.name;
    
    const btnAdd = document.getElementById('btn-action-add');
    if (currentUser) {
        btnAdd.style.display = 'flex'; // Sửa display block thành flex cho sheet-btn
    } else {
        btnAdd.style.display = 'none';
    }
    document.getElementById('modal-options').style.display = 'block';
}

window.checkPermissionAndShowAdd = function() {
    closeModal('modal-options');
    if (!currentUser) return;
    
    document.getElementById('modal-add').style.display = 'block';
    document.getElementById('add-student-name').innerText = document.getElementById('opt-student-name').innerText;
    document.getElementById('add-subject-tag').innerText = currentSubject.name;
    
    document.getElementById('score-input').value = "";
    document.getElementById('reason-input').value = "";
    setTimeout(() => document.getElementById('score-input').focus(), 100);
    setScoreType('plus');
}

window.setScoreType = function(type) {
    currentScoreType = type;
    document.getElementById('btn-plus').className = type === 'plus' ? 'type-btn active' : 'type-btn';
    document.getElementById('btn-minus').className = type === 'minus' ? 'type-btn active' : 'type-btn';
}

window.saveScore = function() {
    if (!currentUser) return; 

    const val = document.getElementById('score-input').value;
    const reason = document.getElementById('reason-input').value;

    if (!val) {
        showToast("Vui lòng nhập số điểm!");
        return;
    }
    
    let score = Math.abs(parseFloat(val));
    if (currentScoreType === 'minus') score = -score;

    push(ref(db, `students/${currentStudentId}`), {
        score: score,
        subject: currentSubject.id, 
        reason: reason || "Không có lý do",
        date: new Date().toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'}),
        user: currentUser,
        deleted: false
    }).then(() => {
        closeModal('modal-add');
        showToast("Đã lưu điểm");
    });
}

// HISTORY & DELETE
window.viewHistory = function() {
    closeModal('modal-options');
    document.getElementById('modal-history').style.display = 'block';
    
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = "";
    
    if (!classData[currentStudentId]) {
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding: 20px;'>Chưa có dữ liệu</td></tr>";
        return;
    }

    const records = Object.entries(classData[currentStudentId]).reverse();
    const filteredRecords = records.filter(([key, item]) => (item.subject || 'Khác') === currentSubject.id);

    if (filteredRecords.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding: 20px;'>Chưa có lịch sử</td></tr>";
        return;
    }

    filteredRecords.forEach(([key, item]) => {
        const isDeleted = item.deleted === true;
        const color = item.score >= 0 ? 'var(--success)' : 'var(--danger)';
        const accName = ACCOUNTS[item.user] ? ACCOUNTS[item.user].name : 'Ẩn danh';
        
        let rowClass = isDeleted ? 'row-deleted' : '';
        let scoreStyle = isDeleted ? '' : `color:${color}; font-weight:bold`;

        let deleteBtn = '';
        if (currentUser && !isDeleted) {
            deleteBtn = ` <button class="btn-del-text" onclick="requestDelete('${key}')">Xóa</button>`;
        }

        let deletedInfo = '';
        if (isDeleted) {
            const delUser = ACCOUNTS[item.deletedBy] ? ACCOUNTS[item.deletedBy].name : 'Ẩn danh';
            deletedInfo = `<span class="deleted-info">Đã xóa bởi ${delUser}: ${item.deleteReason}</span>`;
        }
        
        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.innerHTML = `
            <td>
                <span class="date-tag">${item.date}</span>
                <span class="user-tag">Bởi: ${accName}</span>
            </td>
            <td>
                ${item.reason}
                ${deleteBtn}
                ${deletedInfo}
            </td>
            <td class="text-right s-score-cell" style="${scoreStyle}">
                ${item.score > 0 ? '+' : ''}${item.score}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.requestDelete = function(key) {
    if (!currentUser) return;
    pendingDeleteKey = key;
    document.getElementById('delete-reason-input').value = "";
    document.getElementById('modal-delete-confirm').style.display = 'block';
    setTimeout(() => document.getElementById('delete-reason-input').focus(), 100);
}

window.confirmDeleteAction = function() {
    if (!pendingDeleteKey || !currentUser) return;

    const reason = document.getElementById('delete-reason-input').value.trim();
    if (!reason) {
        alert("Vui lòng nhập lý do xóa (ví dụ: Nhập nhầm điểm)");
        return; 
    }

    update(ref(db, `students/${currentStudentId}/${pendingDeleteKey}`), {
        deleted: true,
        deletedBy: currentUser,
        deleteReason: reason,
        deletedAt: new Date().toISOString()
    }).then(() => {
        closeModal('modal-delete-confirm');
        pendingDeleteKey = null;
        showToast("Đã xóa điểm thành công");
    });
}

window.onclick = (e) => { 
    if (e.target.classList.contains('modal')) closeModal(e.target.id); 
}
