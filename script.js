// --- Navigation ---
function goToLogin() {
    window.location.href = "login.html";
}

function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (email && password) {
        alert("Login Successful!");
        window.location.href = "dashboard.html";
    } else {
        alert("Please enter email and password");
    }
}

function register() {
    const name = document.getElementById("name").value;
    if (name) {
        localStorage.setItem("username", name);
        alert("Registration Successful!");
        window.location.href = "dashboard.html";
    } else {
        alert("Please fill in Name");
    }
}

function logout() {
    confirm("Logout?") ? window.location.href = "login.html" : null;
}

// --- Reminders & Notifications ---

let audioLoop = null; // Global audio object

// Request Permission on load & Inject Modal & Start Timer
document.addEventListener("DOMContentLoaded", () => {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    injectAlarmModal();

    // Check for "Show Add Form" button (Medicine Page)
    if (document.getElementById("medicine-list")) {
        loadMedicines();
    }

    // Load Timeline (Dashboard)
    if (window.location.pathname.includes("dashboard.html")) {
        loadDashboardTimeline();
    }

    // GLOBAL TIMER: Check every 10 seconds on ALL pages
    setInterval(checkReminders, 10000);
});

function injectAlarmModal() {
    const modalHTML = `
    <div id="alarm-modal">
        <div class="alarm-content">
            <i class="fas fa-bell fa-3x" style="color: #ff4d4d; margin-bottom: 15px;"></i>
            <h2 id="alarm-title">Medicine Time!</h2>
            <p id="alarm-med-name" style="font-size: 1.2rem; font-weight: bold; margin: 10px 0;">MED NAME</p>
            <p id="alarm-dosage" style="color: #666; margin-bottom: 20px;">Dosage</p>
            
            <button class="alarm-btn btn-take" onclick="handleAlarmAction('take')">✅ Take Medicine</button>
            <button class="alarm-btn btn-skip" onclick="handleAlarmAction('skip')">❌ Skip</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function toggleAddForm() {
    const form = document.getElementById("add-med-form");
    const btn = document.getElementById("show-add-btn");
    form.style.display = (form.style.display === "none") ? "block" : "none";
    btn.style.display = (form.style.display === "none") ? "block" : "none";
}

function saveMedicine() {
    const name = document.getElementById("med-name").value;
    const dosage = document.getElementById("med-dosage").value;
    const time = document.getElementById("med-time").value;
    const startDate = document.getElementById("med-start-date").value;
    const endDate = document.getElementById("med-end-date").value;

    if (name && time && startDate && endDate) {
        const meds = JSON.parse(localStorage.getItem("medicines") || "[]");
        meds.push({ name, dosage, time, startDate, endDate, id: Date.now() });
        localStorage.setItem("medicines", JSON.stringify(meds));

        alert("Medicine Saved!");
        toggleAddForm();
        loadMedicines();
    } else {
        alert("Please enter Name, Time, and Dates");
    }
}

function loadMedicines() {
    const list = document.getElementById("medicine-list");
    if (!list) return;

    const meds = JSON.parse(localStorage.getItem("medicines") || "[]");
    list.innerHTML = meds.map(med => `
        <div class="timeline-card" style="margin-bottom: 10px; border-left-color: #4facfe;">
            <h4>${med.name}</h4>
            <p>${med.dosage || ''}</p>
            <p>Time: <strong>${med.time}</strong></p>
            <p style="font-size:0.8rem; color:#666;">${med.startDate || '--'} to ${med.endDate || '--'}</p>
            <button onclick="deleteMedicine(${med.id})" style="float:right; color:red; border:none; background:none;">🗑️</button>
            <div style="clear:both;"></div>
        </div>
    `).join("");
}

function deleteMedicine(id) {
    let meds = JSON.parse(localStorage.getItem("medicines") || "[]");
    meds = meds.filter(m => m.id !== id);
    localStorage.setItem("medicines", JSON.stringify(meds));
    loadMedicines();
}

function loadDashboardTimeline() {
    const container = document.getElementById("medicine-timeline");
    if (!container) return;

    const meds = JSON.parse(localStorage.getItem("medicines") || "[]");
    // Sort by time
    meds.sort((a, b) => a.time.localeCompare(b.time));

    if (meds.length === 0) {
        container.innerHTML = "<p>No medicines scheduled today.</p>";
        return;
    }

    container.innerHTML = meds.map(med => `
        <div class="timeline-item">
            <div class="timeline-time">${formatTime(med.time)}</div>
            <div class="timeline-card">
                <h4>${med.name}</h4>
                <p>Dosage: ${med.dosage}</p>
            </div>
        </div>
    `).join("");
}

function checkReminders() {
    const meds = JSON.parse(localStorage.getItem("medicines") || "[]");
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMinutes}`;
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    meds.forEach(med => {
        if (med.time === currentTime) {
            // Check Date Range
            if (med.startDate && med.endDate) {
                if (today < med.startDate || today > med.endDate) return;
            }

            // Check if already notified this minute
            const lastNotified = sessionStorage.getItem("last_notified_" + med.id);
            if (lastNotified !== currentTime) {
                triggerAlarm(med);
                sessionStorage.setItem("last_notified_" + med.id, currentTime);
            }
        }
    });
}

function triggerAlarm(med) {
    // 1. Browser Notification (Background check)
    if (Notification.permission === "granted") {
        new Notification("Medicine Reminder!", {
            body: `Time to take ${med.name}`,
            icon: "https://cdn-icons-png.flaticon.com/512/883/883407.png"
        });
    }

    // 2. Setup Audio Loop
    if (!audioLoop) {
        const audioUrl = "https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg";
        audioLoop = new Audio(audioUrl);
        audioLoop.loop = true; // Loop until action taken
    }

    const soundEnabled = localStorage.getItem("soundEnabled") !== "false";
    if (soundEnabled) {
        audioLoop.play().catch(e => console.log("User interaction needed for audio"));
    }

    // 3. Show Modal
    const modal = document.getElementById("alarm-modal");
    document.getElementById("alarm-med-name").innerText = med.name;
    document.getElementById("alarm-dosage").innerText = `Dosage: ${med.dosage}`;
    modal.style.display = "flex";
}

function handleAlarmAction(action) {
    const modal = document.getElementById("alarm-modal");
    modal.style.display = "none";

    // Update Log (Mock)
    if (action === 'take') {
        alert("Medicine Marked as Taken! ✅");
        // Logic to update history would go here
    } else {
        alert("Medicine Skipped ❌");
    }

    // Stop Sound
    if (audioLoop) {
        audioLoop.pause();
        audioLoop.currentTime = 0;
    }
}

function testAlarm() {
    triggerAlarm({ name: "Test Medicine", dosage: "500mg (Test)" });
}

function formatTime(timeStr) {
    const [hour, min] = timeStr.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${min} ${ampm}`;
}
