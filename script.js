import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Cấu hình Firebase của bạn
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

document.addEventListener('DOMContentLoaded', () => {
    const dataRef = ref(db, 'students');
    onValue(dataRef, (snapshot) => {
        classData = snapshot.val() || {};
        renderList();
    });
});

function renderList() {
    const listContainer = document.getElementById('student-list');
    listContainer.innerHTML = ""; 

    for (let i = 1; i <= TOTAL_STUDENTS; i++) {
        const studentId = `student_${i}`;
        const name = `Học sinh ${i}`;
        const total = calculateTotal(studentId);
        const row = document.createElement('div');
        row.className = 'student-row';
        row.onclick = () => openOptionModal(studentId, name);

        let scoreClass = (total > 0) ? 'score-pos' : (total < 0 ? 'score-neg' : '');

        row.innerHTML = `
            <span class="s-name">${name}</span>
            <span class="s-score ${scoreClass}">${total}</span>
        `;
        listContainer.appendChild(row);
    }
}

function calculateTotal(studentId) {
    if (!classData[studentId]) return 0;
    const records = Object.values(classData[studentId]);
    const total = records.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total * 100) / 100;
}

window.handleAuthAction = function() {
    if (isAdmin) {
        if(confirm("Xác nhận đăng xuất?")) {
            isAdmin = false;
            document.getElementById('auth-btn').textContent = "Đăng nhập";
        }
    } else {
        document.getElementById('modal-login').style.display = 'block';
    }
}

window.performLogin = function() {
    if (document.getElementById('password-input').value === ADMIN_PASS) {
        isAdmin = true;
        closeModal('modal-login');
        document.getElementById('auth-btn').textContent = "Đăng xuất (Admin)";
        document.getElementById('password-input').value = "";
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
        setScoreType('plus');
    } else {
        alert("Vui lòng đăng nhập Admin để nhập điểm!");
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
    if (!val) return;
    let score = Math.abs(parseFloat(val));
    if (currentScoreType === 'minus') score = -score;

    push(ref(db, `students/${currentStudentId}`), {
        score: score,
        reason: document.getElementById('reason-input').value || "Không lý do",
        date: new Date().toLocaleString('vi-VN')
    }).then(() => closeModal('modal-add'));
}

window.viewHistory = function() {
    closeModal('modal-options');
    document.getElementById('modal-history').style.display = 'block';
    document.getElementById('hist-student-name').innerText = document.getElementById('opt-student-name').innerText;
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = "";
    const studentData = classData[currentStudentId];
    if (!studentData) return tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Trống</td></tr>";

    Object.entries(studentData).reverse().forEach(([key, item]) => {
        const delBtn = isAdmin ? `<button class="btn-del" onclick="deleteScore('${key}')">🗑️</button>` : '';
        tbody.innerHTML += `<tr>
            <td><small>${item.date}</small></td>
            <td>${item.reason}</td>
            <td class="text-right" style="color:${item.score>=0?'green':'red'}"><b>${item.score>0?'+':''}${item.score}</b></td>
            <td class="text-center">${delBtn}</td>
        </tr>`;
    });
}

window.deleteScore = function(key) {
    if (confirm("Xác nhận xóa điểm này?")) {
        remove(ref(db, `students/${currentStudentId}/${key}`)).then(() => viewHistory());
    }
}

window.onclick = (e) => { if (e.target.classList.contains('modal')) closeModal(e.target.id); }
