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

[span_0](start_span)// Danh sách 42 học sinh chính xác từ file của bạn[span_0](end_span)
const STUDENT_NAMES = [
    "Nguyễn Ngọc Quỳnh An", "Trần Bình An", "Nguyễn Ngọc Nguyên Anh", "Trần Hoàng Anh",
    "Nguyễn Châu Thái Bảo", "Phan Trung Can", "Nguyễn Minh Đạt", "Lê Nguyễn Hồng Đăng",
    "Mai Hoàng Gia", "Phan Nguyễn Ngọc Hân", "Lương Minh Hiếu", "Hồ Hoàng Huy",
    "Nguyễn Bùi Minh Huy", "Võ Thanh Huy", "Trần Như Huỳnh", "Nguyễn Duy Khang",
    "Phan Duy Khang", "Võ Anh Khoa", "Nguyễn Hoài Linh", "Bùi Văn Lộc",
    "Nguyễn Ngọc Minh", "Thái Nguyễn Bình Minh", "Lê Kim Ngân", "Nguyễn Thị Kim Ngân",
    "Phạm Thị Mỹ Ngân", "Triệu Thu Ngân", "Nguyễn Minh Nghĩa", "Phạm Trần Thảo Nguyên",
    "Nguyễn Thị Ánh Nguyệt", "Lê Lâm Nhật", "Nguyễn Tiết Nhi", "Trần Thị Thảo Như",
    "Trương Gia Phú", "Nguyễn Phú Sang", "Nguyễn Huy Thế", "Lê Hoàng Thông",
    "Nguyễn Ngọc Bảo Thy", "Trần Hoàng Tiến", "Bùi Kiều Trang", "Lê Thị Bảo Trân",
    "Nguyễn Thị Ngọc Tuyền", "Nguyễn Thị Khánh Vân"
];

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
    // SỬA LỖI TRẮNG TRANG: Luôn render giao diện trước khi tải dữ liệu Firebase
    renderDashboard();
    
    const dataRef = ref(db, 'students');
    onValue(dataRef, (snapshot) => {
        classData = snapshot.val() || {};
        if (currentSubject && document.getElementById('detail-view').style.display !== 'none') {
            renderStudentList(currentSubject);
            filterStudents(); // Đảm bảo danh sách vẫn lọc đúng khi dữ liệu cập nhật
        }
        if(document.getElementById('modal-history').style.display.includes('block') || document.getElementById('modal-history').style.display.includes('flex')) {
            viewHistory();
        }
    });

    const loginInputs = [document.getElementById('login-username'), document.getElementById('password-input')];
    loginInputs.forEach(input => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') performLogin();
        });
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

// TÌM KIẾM
window.filterStudents = function() {
    const searchTerm = document.getElementById('search-student')?.value.toLowerCase().trim() || "";
    const rows = document.querySelectorAll('.student-row');
    rows.forEach(row => {
        const name = row.querySelector('.s-name').innerText.toLowerCase();
        row.style.display = name.includes(searchTerm) ? 'flex' : 'none';
    });
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
        document.getElementById('login-error').innerText = "Thông tin không chính xác";
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
    if (document.getElementById('search-student')) document.getElementById('search-student').value = "";
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
}

window.renderStudentList = function(subjectObj) {
    const listContainer = document.getElementById('student-list');
    listContainer.innerHTML = ""; 
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= TOTAL_STUDENTS; i++) {
        const studentId = `student_${i}`;
        const name = STUDENT_NAMES[i - 1] || `Học sinh ${i}`;
        const total = calculateTotal(studentId, subjectObj.id);
        
        const row = document.createElement('div');
        row.className = 'student-row';
        row.onclick = () => openOptionModal(studentId, name);

        let scoreClass = 'neu';
        if (total > 0) scoreClass = 'pos';
        if (total < 0) scoreClass = 'neg';

        row.innerHTML = `
            <span class="s-name">${name}</span>
            <span class="s-score ${scoreClass}">${(total > 0 ? '+' : '') + total}</span>
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

// MODALS
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.openOptionModal = function(id, name) {
    currentStudentId = id;
    document.getElementById('opt-student-name').innerText = name;
    document.getElementById('opt-subject-name').innerText = currentSubject.name;
    
    const btnAdd = document.getElementById('btn-action-add');
    btnAdd.style.display = currentUser ? 'flex' : 'none';
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
    setScoreType('plus');
    
    setTimeout(() => document.getElementById('score-input').focus(), 150);
}

window.setScoreType = function(type) {
    currentScoreType = type;
    const segControl = document.querySelector('.segmented-control');
    const heroContainer = document.getElementById('hero-container');
    const segPlus = document.getElementById('seg-plus');
    const segMinus = document.getElementById('seg-minus');
    const btnSave = document.querySelector('.large-save');

    if (type === 'plus') {
        segControl.classList.replace('is-minus', 'is-plus');
        segPlus.classList.add('active'); segMinus.classList.remove('active');
        heroContainer.classList.remove('minus-mode');
        btnSave.style.background = 'var(--success)';
    } else {
        segControl.classList.replace('is-plus', 'is-minus');
        segMinus.classList.add('active'); segPlus.classList.remove('active');
        heroContainer.classList.add('minus-mode');
        btnSave.style.background = 'var(--danger)';
    }
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
        const accName = ACCOUNTS[item.user]?.name || 'Ẩn danh';
        
        const tr = document.createElement('tr');
        tr.className = isDeleted ? 'row-deleted' : '';
        tr.innerHTML = `
            <td>
                <span class="date-tag">${item.date}</span>
                <span class="user-tag">Bởi: ${accName}</span>
            </td>
            <td>
                ${item.reason}
                ${(currentUser && !isDeleted) ? `<button class="btn-del-text" onclick="requestDelete('${key}')">Xóa</button>` : ''}
                ${isDeleted ? `<span class="deleted-info">Đã xóa bởi ${ACCOUNTS[item.deletedBy]?.name || 'Ẩn danh'}: ${item.deleteReason}</span>` : ''}
            </td>
            <td class="text-right s-score-cell" style="${isDeleted ? '' : `color:${color}; font-weight:bold`}">
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
        showToast("Vui lòng nhập lý do xóa!");
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

window.onclick = (e) => { if (e.target.classList.contains('modal')) closeModal(e.target.id); }
