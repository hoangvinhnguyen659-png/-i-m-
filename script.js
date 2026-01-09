import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ĐÃ DÁN MÃ FIREBASE CỦA BẠN VÀO ĐÂY
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

let studentList = [];
for (let i = 1; i <= TOTAL_STUDENTS; i++) {
    studentList.push(`Học sinh ${i}`);
}

document.addEventListener('DOMContentLoaded', () => {
    const dataRef = ref(db, 'students');
    onValue(dataRef, (snapshot) => {
        classData = snapshot.val() || {};
        renderList();
    });
    setScoreType('plus');
});

function renderList() {
    const listContainer = document.getElementById('student-list');
    listContainer.innerHTML = ""; 

    studentList.forEach((name, index) => {
        const studentId = `student_${index + 1}`;
        const total = calculateTotal(studentId);
        const row = document.createElement('div');
        row.className = 'student-row';
        row.onclick = () => openOptionModal(studentId, name);

        let scoreClass = 'score-zero';
        if (total > 0) scoreClass = 'score-pos';
        if (total < 0) scoreClass = 'score-neg';

        row.innerHTML = `
            <span class="s-name">${name}</span>
            <span class="s-score ${scoreClass}">${total}</span>
        `;
        listContainer.appendChild(row);
    });
}

function calculateTotal(studentId) {
    if (!classData[studentId]) return 0;
    const records = Object.values(classData[studentId]);
    let total = records.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total * 100) / 100;
}

window.handleAuthAction = function() {
    if (isAdmin) {
        if(confirm("Xác nhận đăng xuất?")) {
            isAdmin = false;
            updateAuthUI();
        }
    } else {
        document.getElementById('modal-login').style.display = 'block';
        document.getElementById('password-input').focus();
    }
}

window.performLogin = function() {
    const input = document.getElementById('password-input').value;
    if (input === ADMIN_PASS) {
        isAdmin = true;
        closeModal('modal-login');
        updateAuthUI();
        document.getElementById('password-input').value = "";
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function updateAuthUI() {
    const btn = document.getElementById('auth-btn');
    btn.textContent = isAdmin ? "Đăng xuất" : "Đăng nhập";
    btn.className = isAdmin ? "btn-outline btn-admin-active" : "btn-outline";
}

window.closeModal = function(id) {
    document.getElementById(id).style.display = 'none';
}

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
        document.getElementById('score-input').value = "";
        document.getElementById('reason-input').value = "";
        setScoreType('plus');
    } else {
        handleAuthAction();
    }
}

window.setScoreType = function(type) {
    currentScoreType = type;
    document.getElementById('btn-plus').className = type === 'plus' ? 'type-btn active' : 'type-btn';
    document.getElementById('btn-minus').className = type === 'minus' ? 'type-btn active' : 'type-btn';
}

window.saveScore = function() {
    let scoreInput = document.getElementById('score-input').value;
    if (!scoreInput) return alert("Vui lòng nhập số điểm!");
    
    let score = Math.abs(parseFloat(scoreInput));
    if (currentScoreType === 'minus') score = -score;

    const studentRef = ref(db, `students/${currentStudentId}`);
    push(studentRef, {
        score: score,
        reason: document.getElementById('reason-input').value || "Không có lý do",
        date: new Date().toLocaleString('vi-VN')
    }).then(() => closeModal('modal-add'));
}

window.viewHistory = function() {
    closeModal('modal-options');
    document.getElementById('modal-history').style.display = 'block';
    document.getElementById('hist-student-name').innerText = document.getElementById('opt-student-name').innerText;
    
    const tbody = document.getElementById('history-body');
    const studentData = classData[currentStudentId];
    
    tbody.innerHTML = "";
    if (!studentData) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'>Chưa có dữ liệu</td></tr>";
        return;
    }

    Object.entries(studentData).reverse().forEach(([key, item]) => {
        const color = item.score >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        const deleteBtn = isAdmin ? `<button class="btn-del" onclick="deleteScore('${key}')">🗑️</button>` : '';
        tbody.innerHTML += `
            <tr>
                <td><small>${item.date}</small></td>
                <td>${item.reason}</td>
                <td style="color:${color}; font-weight:bold; text-align:right">${item.score > 0 ? '+' : ''}${item.score}</td>
                <td style="text-align:center">${deleteBtn}</td>
            </tr>`;
    });
}

window.deleteScore = function(recordId) {
    if(confirm("Xác nhận xóa điểm này?")) {
        remove(ref(db, `students/${currentStudentId}/${recordId}`)).then(() => viewHistory());
    }
}

window.onclick = (e) => { if (e.target.classList.contains('modal')) closeModal(e.target.id); }
