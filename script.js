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

const ADMIN_PASS = "1234"; 
const TOTAL_STUDENTS = 42;

let isAdmin = false;
let currentStudentId = "";
let currentScoreType = "plus"; 
let classData = {}; 
let currentFilterSubject = "all"; // Mặc định hiển thị tất cả

document.addEventListener('DOMContentLoaded', () => {
    const dataRef = ref(db, 'students');
    onValue(dataRef, (snapshot) => {
        classData = snapshot.val() || {};
        renderList();
    });
});

// Hàm thay đổi bộ lọc ở màn hình chính
window.changeSubjectFilter = function() {
    currentFilterSubject = document.getElementById('main-subject-filter').value;
    renderList();
}

function renderList() {
    const listContainer = document.getElementById('student-list');
    listContainer.innerHTML = ""; 

    for (let i = 1; i <= TOTAL_STUDENTS; i++) {
        const studentId = `student_${i}`;
        const name = `Học sinh ${i}`;
        const total = calculateTotal(studentId); // Tính toán dựa trên bộ lọc hiện tại
        
        const row = document.createElement('div');
        row.className = 'student-row';
        row.onclick = () => openOptionModal(studentId, name);

        let scoreClass = 'score-neu';
        if (total > 0) scoreClass = 'score-pos';
        if (total < 0) scoreClass = 'score-neg';

        // Chỉ hiện số điểm khác 0 cho gọn, hoặc luôn hiện nếu muốn
        const displayScore = (total > 0 ? '+' : '') + total;

        row.innerHTML = `
            <span class="s-name">${name}</span>
            <span class="s-score ${scoreClass}">${displayScore}</span>
        `;
        listContainer.appendChild(row);
    }
}

function calculateTotal(studentId) {
    if (!classData[studentId]) return 0;
    const records = Object.values(classData[studentId]);
    
    // Lọc theo môn học nếu không chọn 'all'
    const filteredRecords = records.filter(item => {
        if (currentFilterSubject === 'all') return true;
        // Tương thích ngược: Nếu dữ liệu cũ không có subject, coi như là 'Khác' hoặc bỏ qua tuỳ logic
        const itemSubject = item.subject || 'Khác';
        return itemSubject === currentFilterSubject;
    });

    const total = filteredRecords.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total * 100) / 100;
}

window.handleAuthAction = function() {
    if (isAdmin) {
        if(confirm("Đăng xuất tài khoản quản trị?")) {
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

window.openOptionModal = function(id, name) {
    currentStudentId = id;
    document.getElementById('opt-student-name').innerText = name;
    document.getElementById('modal-options').style.display = 'block';
}

window.checkPermissionAndShowAdd = function() {
    closeModal('modal-options');
    if (isAdmin) {
        document.getElementById('modal-add').style.display = 'block';
        document.getElementById('add-student-name').innerText = document.getElementById('opt-student-name').innerText;
        
        // Reset form
        document.getElementById('score-input').value = "";
        document.getElementById('reason-input').value = "";
        document.getElementById('input-subject').value = "Toán"; // Reset về môn mặc định
        setScoreType('plus');
    } else {
        alert("Bạn cần đăng nhập Admin để thực hiện chức năng này.");
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
    const subject = document.getElementById('input-subject').value;
    const reason = document.getElementById('reason-input').value;

    if (!val) return alert("Vui lòng nhập số điểm!");
    
    let score = Math.abs(parseFloat(val));
    if (currentScoreType === 'minus') score = -score;

    push(ref(db, `students/${currentStudentId}`), {
        score: score,
        subject: subject, // Lưu thêm trường môn học
        reason: reason || "Không có ghi chú",
        date: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) // Format ngắn gọn
    }).then(() => closeModal('modal-add'));
}

window.viewHistory = function() {
    closeModal('modal-options');
    document.getElementById('modal-history').style.display = 'block';
    document.getElementById('hist-student-name').innerText = document.getElementById('opt-student-name').innerText;
    
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = "";
    const studentData = classData[currentStudentId];
    
    if (!studentData) {
        tbody.innerHTML = "<tr><td colspan='5' class='text-center' style='padding: 20px; color: #999'>Chưa có dữ liệu điểm</td></tr>";
        return;
    }

    // Hiển thị lịch sử (đảo ngược để thấy mới nhất trước)
    Object.entries(studentData).reverse().forEach(([key, item]) => {
        // Nếu là admin thì hiện nút Xóa (chữ), không thì để trống
        const delBtn = isAdmin ? `<button class="btn-del-text" onclick="deleteScore('${key}')">Xóa</button>` : '';
        
        const scoreColor = item.score >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        const scoreSign = item.score > 0 ? '+' : '';
        const subjectName = item.subject || '---'; // Xử lý dữ liệu cũ không có môn

        tbody.innerHTML += `<tr>
            <td style="color: var(--text-sub); font-size: 0.85rem">${item.date}</td>
            <td><b>${subjectName}</b></td>
            <td>${item.reason}</td>
            <td class="text-right" style="color:${scoreColor}; font-weight: 600;">${scoreSign}${item.score}</td>
            <td class="text-center">${delBtn}</td>
        </tr>`;
    });
}

window.deleteScore = function(key) {
    if (confirm("Bạn có chắc chắn muốn xóa điểm này không?")) {
        remove(ref(db, `students/${currentStudentId}/${key}`)).then(() => viewHistory());
    }
}

window.onclick = (e) => { if (e.target.classList.contains('modal')) closeModal(e.target.id); }
