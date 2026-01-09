// --- CẤU HÌNH ---
const CONFIG = {
    password: "1234",  // Mật khẩu Admin
    totalStudents: 42  // Số lượng học sinh
};

// --- TRẠNG THÁI ỨNG DỤNG ---
let isAdmin = false; // Mặc định là khách (chưa đăng nhập)
let currentStudent = "";
let classData = JSON.parse(localStorage.getItem('classData')) || {};

// Tạo danh sách tên (Bạn có thể sửa trực tiếp tên ở đây sau này)
let studentList = [];
for (let i = 1; i <= CONFIG.totalStudents; i++) {
    studentList.push(`Học sinh ${i}`);
}

// --- KHỞI TẠO ỨNG DỤNG ---
document.addEventListener('DOMContentLoaded', () => {
    renderGrid();
    updateAuthUI();
});

// --- PHẦN 1: GIAO DIỆN CHÍNH ---

function renderGrid() {
    const grid = document.getElementById('grid-container');
    grid.innerHTML = ""; // Xóa cũ vẽ mới

    studentList.forEach(name => {
        const total = calculateTotal(name);
        const card = document.createElement('div');
        card.className = 'student-card';
        // Khi click vào thẻ tên, mở modal lựa chọn
        card.onclick = () => openOptionModal(name);

        const scoreClass = total >= 0 ? 'score-positive' : 'score-negative';
        
        card.innerHTML = `
            <span class="student-name">${name}</span>
            <span class="student-total">Tổng: <span class="${scoreClass}">${total}</span></span>
        `;
        grid.appendChild(card);
    });
}

function calculateTotal(name) {
    if (!classData[name]) return 0;
    // Tính tổng và làm tròn 2 chữ số thập phân
    let total = classData[name].reduce((sum, item) => sum + item.score, 0);
    return Math.round(total * 100) / 100;
}

// --- PHẦN 2: XỬ LÝ ĐĂNG NHẬP / ĐĂNG XUẤT ---

function toggleLoginState() {
    if (isAdmin) {
        // Nếu đang là Admin -> Đăng xuất
        isAdmin = false;
        alert("Đã đăng xuất chế độ Admin.");
        updateAuthUI();
    } else {
        // Nếu chưa đăng nhập -> Mở modal đăng nhập
        document.getElementById('modal-login').style.display = 'block';
        document.getElementById('password-input').value = '';
        document.getElementById('login-error').style.display = 'none';
        document.getElementById('password-input').focus();
    }
}

function performLogin() {
    const input = document.getElementById('password-input').value;
    if (input === CONFIG.password) {
        isAdmin = true;
        closeModal('modal-login');
        updateAuthUI();
        // Nếu người dùng đang cố nhập điểm mà bị chặn, giờ tự động mở lại modal nhập điểm?
        // Đơn giản là thông báo thành công.
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function updateAuthUI() {
    const btn = document.getElementById('auth-btn');
    if (isAdmin) {
        btn.textContent = "Đăng xuất (Admin)";
        btn.style.backgroundColor = "#e74c3c";
        btn.style.color = "white";
        btn.style.borderColor = "#e74c3c";
    } else {
        btn.textContent = "Đăng nhập Giáo Viên";
        btn.style.backgroundColor = "transparent";
        btn.style.color = "var(--primary-color)";
        btn.style.borderColor = "var(--primary-color)";
    }
}

// --- PHẦN 3: LOGIC CÁC MODAL ---

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openOptionModal(name) {
    currentStudent = name;
    document.getElementById('opt-student-name').innerText = name;
    document.getElementById('modal-options').style.display = 'block';
}

// Kiểm tra quyền: Nếu chưa đăng nhập thì bắt đăng nhập
function checkPermissionAndShowAdd() {
    closeModal('modal-options'); // Đóng menu chọn
    if (isAdmin) {
        showAddScoreModal();
    } else {
        // Mở modal đăng nhập
        toggleLoginState();
        // Gợi ý: Sau này có thể nâng cấp để tự động mở lại modal nhập điểm sau khi login
    }
}

function showAddScoreModal() {
    document.getElementById('modal-add').style.display = 'block';
    document.getElementById('add-student-name').innerText = currentStudent;
    document.getElementById('score-input').value = "";
    document.getElementById('reason-input').value = "";
    document.getElementById('score-input').focus();
}

function viewHistory() {
    closeModal('modal-options');
    document.getElementById('modal-history').style.display = 'block';
    document.getElementById('hist-student-name').innerText = currentStudent;
    
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = "";
    
    const history = classData[currentStudent] || [];
    
    if (history.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center'>Chưa có lịch sử</td></tr>";
    } else {
        // Đảo ngược để xem cái mới nhất trước
        [...history].reverse().forEach(item => {
            const color = item.score >= 0 ? 'green' : 'red';
            const sign = item.score > 0 ? '+' : '';
            const row = `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.reason}</td>
                    <td style="color:${color}; font-weight:bold; text-align:right">${sign}${item.score}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }
}

// --- PHẦN 4: LƯU DỮ LIỆU ---

function saveScore() {
    let scoreInput = document.getElementById('score-input').value;
    const reason = document.getElementById('reason-input').value || "Không có lý do";

    // Xử lý dấu phẩy và dấu chấm
    scoreInput = scoreInput.replace(',', '.');
    const score = parseFloat(scoreInput);

    if (isNaN(score)) {
        alert("Vui lòng nhập số hợp lệ!");
        return;
    }

    const newEntry = {
        score: score,
        reason: reason,
        date: new Date().toLocaleString('vi-VN')
    };

    if (!classData[currentStudent]) {
        classData[currentStudent] = [];
    }

    classData[currentStudent].push(newEntry);
    localStorage.setItem('classData', JSON.stringify(classData));

    closeModal('modal-add');
    renderGrid(); // Cập nhật lại giao diện
}

// Đóng modal khi click ra ngoài vùng trắng
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}
