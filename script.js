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
    { id: 'Toán', name: 'Toán Học', icon: '' },
    { id: 'Lí', name: 'Vật Lí', icon: '' },
    { id: 'Hóa', name: 'Hóa Học', icon: '' },
    { id: 'Sinh', name: 'Sinh Học', icon: '' },
    { id: 'Tin', name: 'Tin Học', icon: '' },
    { id: 'Văn', name: 'Ngữ Văn', icon: '' },
    { id: 'Sử', name: 'Lịch Sử', icon: '' },
    { id: 'Anh', name: 'Tiếng Anh', icon: '' },
    { id: 'GDQP', name: 'GDQP', icon: '' },
    { id: 'Khác', name: 'Hoạt động khác', icon: '', adminOnly: true } 
];

let currentUser = null; 
let classData = {}; 
let currentStudentId = "";
let currentScoreType = "plus"; 
let currentSubject = null; 

document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    
    const dataRef = ref(db, 'students');
    onValue(dataRef, (snapshot) => {
        classData = snapshot.val() || {};
        if (currentSubject) {
            renderStudentList(currentSubject);
        }
    });
});

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? '✅' : (type === 'error' ? '🚫' : 'ℹ️');
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- LOGIC AUTH ---
window.handleAuthAction = function() {
    if (currentUser) {
        if(confirm("Bạn muốn đăng xuất?")) {
            currentUser = null;
            updateAuthButton();
            showToast("Đã đăng xuất thành công");
            showDashboard();
        }
    } else {
        document.getElementById('password-input').value = "";
        document.getElementById('login-error').style.display = 'none';
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
        const input = document.getElementById('password-input');
        input.style.borderColor = 'var(--danger)';
        setTimeout(() => input.style.borderColor = 'var(--border)', 500);
    }
}

function updateAuthButton() {
    const btn = document.getElementById('auth-btn');
    if (currentUser) {
        // Chỉ hiện chữ Đăng xuất, bỏ phần ngoặc tên tài khoản
        btn.innerText = `Đăng xuất`;
        btn.classList.add('logout-mode');
    } else {
        btn.innerText = `Đăng nhập`;
        btn.classList.remove('logout-mode');
    }
}

// --- NAVIGATION ---
window.renderDashboard = function() {
    const grid = document.getElementById('subject-grid');
    grid.innerHTML = "";
    
    SUBJECTS.forEach(sub => {
        // Ẩn icon khóa, chỉ xử lý logic
        const card = document.createElement('div');
        card.className = `subject-card ${sub.adminOnly ? 'locked' : ''}`;
        card.onclick = () => openSubject(sub);
        
        // Không hiện icon nữa, chỉ hiện tên môn
        card.innerHTML = `<span class="sbj-name">${sub.name}</span>`;
        grid.appendChild(card);
    });
}

window.openSubject = function(subjectObj) {
    // CHO PHÉP XEM KHI CHƯA ĐĂNG NHẬP
    // Chỉ chặn nếu là môn Admin Only mà không phải Admin
    if (subjectObj.adminOnly && currentUser !== 'admin') {
        showToast("Mục này chỉ dành cho Admin!", "error");
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
    
    // KIỂM TRA QUYỀN ĐỂ ẨN/HIỆN NÚT NHẬP ĐIỂM
    const btnAdd = document.getElementById('btn-action-add');
    if (currentUser) {
        btnAdd.style.display = 'block'; // Đã đăng nhập -> Hiện nút nhập
    } else {
        btnAdd.style.display = 'none';  // Chưa đăng nhập -> Ẩn nút nhập
    }

    document.getElementById('modal-options').style.display = 'block';
}

window.checkPermissionAndShowAdd = function() {
    closeModal('modal-options');
    // Check lại lần nữa cho chắc chắn
    if (!currentUser) {
        showToast("Vui lòng đăng nhập để nhập điểm!", "error");
        return;
    }
    
    document.getElementById('modal-add').style.display = 'block';
    document.getElementById('add-student-name').innerText = document.getElementById('opt-student-name').innerText;
    document.getElementById('add-subject-tag').innerText = currentSubject.name;
    
    document.getElementById('score-input').value = "";
    document.getElementById('reason-input').value = "";
    document.getElementById('score-input').focus(); 
    setScoreType('plus');
}

window.setScoreType = function(type) {
    currentScoreType = type;
    document.getElementById('btn-plus').className = type === 'plus' ? 'type-btn active' : 'type-btn';
    document.getElementById('btn-minus').className = type === 'minus' ? 'type-btn active' : 'type-btn';
}

window.saveScore = function() {
    if (!currentUser) return; // Bảo vệ

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
        user: currentUser 
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

    // Xử lý cột xóa trong header bảng
    const colActionHeader = document.getElementById('col-action-header');
    if (currentUser) {
        colActionHeader.style.display = 'table-cell';
    } else {
        colActionHeader.style.display = 'none';
    }

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
        
        let delBtn = '';
        // Chỉ hiện nút xóa nếu ĐÃ ĐĂNG NHẬP
        if (currentUser) {
            delBtn = `<td class="text-center"><button class="btn-del" onclick="deleteScore('${key}')">Xóa</button></td>`;
        } else {
            // Nếu chưa đăng nhập thì không render cột này (để trống hoặc ẩn đi, ở đây ta ẩn header rồi nên khỏi render td cũng được, hoặc render td trống)
             // Tuy nhiên để table đều nhau, ta nên ẩn cột header, và ở đây cũng KHÔNG render td
             // Logic ở trên ta đã ẩn header, ở dưới này ta check logic để render
        }

        let rowHtml = `
            <td><small style="color:#888">${item.date}</small></td>
            <td>${item.reason}</td>
            <td class="text-right" style="color:${color}; font-weight:bold">${item.score}</td>
        `;

        if (currentUser) {
            rowHtml += `<td class="text-center"><button class="btn-del" onclick="deleteScore('${key}')">Xóa</button></td>`;
        } else {
             // Không thêm cột xóa
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });
}

window.deleteScore = function(key) {
    if (!currentUser) return; // Bảo vệ
    if (confirm("Bạn có chắc muốn xóa điểm này?")) {
        remove(ref(db, `students/${currentStudentId}/${key}`)).then(() => {
            viewHistory(); 
            showToast("Đã xóa dữ liệu", "success");
        });
    }
}

window.onclick = (e) => { if (e.target.classList.contains('modal')) closeModal(e.target.id); }
