import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CẤU HÌNH FIREBASE ---
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

// --- CẤU HÌNH APP ---
const ADMIN_PASS = "1234"; 
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
    { id: 'Khác', name: 'Hoạt động khác', icon: '⭐' }
];

let isAdmin = false;
let classData = {}; 
let currentStudentId = "";
let currentScoreType = "plus"; 
let currentSubject = null; // Môn đang chọn

// --- KHỞI TẠO ---
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard(); // Vẽ dashboard ngay
    
    // Lắng nghe dữ liệu (Realtime)
    const dataRef = ref(db, 'students');
    onValue(dataRef, (snapshot) => {
        classData = snapshot.val() || {};
        // Nếu đang xem môn nào thì render lại list môn đó để cập nhật điểm mới
        if (currentSubject) {
            renderStudentList(currentSubject);
        }
    });
});

// --- NAVIGATION FUNCTIONS ---

// 1. Hiển thị Dashboard (Lưới môn học)
window.renderDashboard = function() {
    const grid = document.getElementById('subject-grid');
    grid.innerHTML = "";
    
    SUBJECTS.forEach(sub => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.onclick = () => openSubject(sub);
        card.innerHTML = `
            <span class="sbj-icon">${sub.icon}</span>
            <span class="sbj-name">${sub.name}</span>
        `;
        grid.appendChild(card);
    });
}

// 2. Chuyển từ Dashboard -> Chi tiết môn
window.openSubject = function(subjectObj) {
    currentSubject = subjectObj;
    
    // UI Transition
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    
    // Update Header
    document.getElementById('current-subject-title').innerText = subjectObj.name;
    document.getElementById('app-title').style.display = 'none'; // Ẩn tiêu đề app cho gọn

    renderStudentList(subjectObj);
}

// 3. Quay lại Dashboard
window.showDashboard = function() {
    currentSubject = null;
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    document.getElementById('app-title').style.display = 'block';
}

// --- LOGIC HIỂN THỊ LIST ---
function renderStudentList(subjectObj) {
    const listContainer = document.getElementById('student-list');
    listContainer.innerHTML = ""; 

    // Fragment giúp render nhanh hơn, tránh lag
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= TOTAL_STUDENTS; i++) {
        const studentId = `student_${i}`;
        const name = `Học sinh ${i}`;
        
        // Tính tổng điểm CHỈ CHO MÔN HIỆN TẠI
        const total = calculateTotal(studentId, subjectObj.id);
        
        const row = document.createElement('div');
        row.className = 'student-row';
        row.onclick = () => openOptionModal(studentId, name);

        let scoreClass = 'score-zero';
        if (total > 0) scoreClass = 'score-pos';
        if (total < 0) scoreClass = 'score-neg';

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
    
    // Lọc đúng môn học hiện tại
    const filtered = records.filter(item => {
        const itemSub = item.subject || 'Khác';
        return itemSub === subjectId;
    });

    const total = filtered.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total * 100) / 100;
}

// --- LOGIC AUTH & MODAL ---

window.handleAuthAction = function() {
    if (isAdmin) {
        if(confirm("Đăng xuất Admin?")) {
            isAdmin = false;
            document.getElementById('auth-btn').textContent = "Đăng nhập";
            document.getElementById('auth-btn').style.color = "var(--primary-color)";
        }
    } else {
        document.getElementById('modal-login').style.display = 'block';
    }
}

window.performLogin = function() {
    const inputPass = document.getElementById('password-input').value;
    if (inputPass === ADMIN_PASS) {
        isAdmin = true;
        closeModal('modal-login');
        document.getElementById('auth-btn').textContent = "Đăng xuất";
        document.getElementById('auth-btn').style.color = "var(--danger-color)";
        document.getElementById('password-input').value = "";
        document.getElementById('login-error').style.display = 'none';
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

window.closeModal = (id) => document.getElementById(id).style.display = 'none';

// Mở modal tùy chọn (Nhập điểm hoặc Xem lịch sử)
window.openOptionModal = function(id, name) {
    currentStudentId = id;
    document.getElementById('opt-student-name').innerText = name;
    document.getElementById('opt-subject-name').innerText = currentSubject.name; // Hiển thị tên môn
    document.getElementById('modal-options').style.display = 'block';
}

window.checkPermissionAndShowAdd = function() {
    closeModal('modal-options');
    if (isAdmin) {
        document.getElementById('modal-add').style.display = 'block';
        document.getElementById('add-student-name').innerText = document.getElementById('opt-student-name').innerText;
        document.getElementById('add-subject-tag').innerText = currentSubject.name; // Tag môn học
        
        // Reset form
        document.getElementById('score-input').value = "";
        document.getElementById('reason-input').value = "";
        setScoreType('plus');
    } else {
        alert("Cần quyền Admin!");
        handleAuthAction();
    }
}

window.setScoreType = function(type) {
    currentScoreType = type;
    document.getElementById('btn-plus').className = type === 'plus' ? 'type-btn active' : 'type-btn';
    document.getElementById('btn-minus').className = type === 'minus' ? 'type-btn active' : 'type-btn';
}

window.saveScore = function() {
    const val = document.getElementById('score-input').value;
    const reason = document.getElementById('reason-input').value;

    if (!val) return alert("Chưa nhập điểm!");
    
    let score = Math.abs(parseFloat(val));
    if (currentScoreType === 'minus') score = -score;

    // Lưu điểm với Subject ID hiện tại (Không cần chọn lại)
    push(ref(db, `students/${currentStudentId}`), {
        score: score,
        subject: currentSubject.id, 
        reason: reason || "Không có lý do",
        date: new Date().toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', hour:'2-digit', minute:'2-digit'})
    }).then(() => closeModal('modal-add'));
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
    // Lọc lịch sử theo môn hiện tại
    const filteredRecords = records.filter(([key, item]) => {
        const itemSub = item.subject || 'Khác';
        return itemSub === currentSubject.id;
    });

    if (filteredRecords.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Chưa có lịch sử môn này</td></tr>";
        return;
    }

    filteredRecords.forEach(([key, item]) => {
        const delBtn = isAdmin ? `<button class="btn-del-txt" onclick="deleteScore('${key}')">Xóa</button>` : '';
        const color = item.score >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        
        tbody.innerHTML += `<tr>
            <td><small style="color:#888">${item.date}</small></td>
            <td>${item.reason}</td>
            <td class="text-right" style="color:${color}; font-weight:bold">${item.score}</td>
            <td class="text-center">${delBtn}</td>
        </tr>`;
    });
}

window.deleteScore = function(key) {
    if (confirm("Xóa dòng này?")) {
        remove(ref(db, `students/${currentStudentId}/${key}`)).then(() => viewHistory());
    }
}

window.onclick = (e) => { if (e.target.classList.contains('modal')) closeModal(e.target.id); }
