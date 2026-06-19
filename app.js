const STORAGE_KEY = "kids-approval-requests-v1";

const initialRequests = [
  {
    id: crypto.randomUUID(),
    name: "נועם כהן",
    age: 12,
    parentEmail: "parent@example.com",
    note: "מבקש אישור להצטרף לשרת משחקים אחרי בית הספר.",
    status: "pending",
    createdAt: Date.now() - 1000 * 60 * 60 * 2
  },
  {
    id: crypto.randomUUID(),
    name: "מאיה לוי",
    age: 10,
    parentEmail: "maya.parent@example.com",
    note: "צריכה אישור לפתיחת חשבון משתמש באפליקציה.",
    status: "approved",
    createdAt: Date.now() - 1000 * 60 * 60 * 6
  },
  {
    id: crypto.randomUUID(),
    name: "איתי רוזן",
    age: 9,
    parentEmail: "itai.parent@example.com",
    note: "בקשה חסרה פרטים, ממתינה לבדיקה חוזרת.",
    status: "rejected",
    createdAt: Date.now() - 1000 * 60 * 60 * 9
  }
];

const state = {
  filter: "all",
  requests: loadRequests()
};

const form = document.querySelector("#requestForm");
const list = document.querySelector("#requestsList");
const template = document.querySelector("#requestTemplate");
const filters = document.querySelectorAll(".filter");
const pendingCount = document.querySelector("#pendingCount");
const approvedCount = document.querySelector("#approvedCount");
const rejectedCount = document.querySelector("#rejectedCount");
const installButton = document.querySelector("#installButton");

let installPrompt = null;

function loadRequests() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialRequests;

  try {
    return JSON.parse(saved);
  } catch {
    return initialRequests;
  }
}

function saveRequests() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.requests));
}

function statusLabel(status) {
  if (status === "approved") return "מאושר";
  if (status === "rejected") return "נדחה";
  return "ממתין";
}

function renderStats() {
  pendingCount.textContent = state.requests.filter(request => request.status === "pending").length;
  approvedCount.textContent = state.requests.filter(request => request.status === "approved").length;
  rejectedCount.textContent = state.requests.filter(request => request.status === "rejected").length;
}

function renderRequests() {
  renderStats();
  const visible = state.requests
    .filter(request => state.filter === "all" || request.status === state.filter)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (!visible.length) {
    list.innerHTML = `<div class="empty">אין בקשות להצגה בסינון הזה.</div>`;
    return;
  }

  list.innerHTML = "";
  for (const request of visible) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.add(request.status);
    node.dataset.id = request.id;
    node.querySelector("h3").textContent = request.name;
    node.querySelector(".meta").textContent = `גיל ${request.age} · ${request.parentEmail} · ${statusLabel(request.status)}`;
    node.querySelector(".note").textContent = request.note || "אין הערה.";
    node.querySelector(".approve").disabled = request.status === "approved";
    node.querySelector(".reject").disabled = request.status === "rejected";
    list.appendChild(node);
  }
}

function updateRequest(id, status) {
  state.requests = state.requests.map(request => request.id === id ? { ...request, status } : request);
  saveRequests();
  renderRequests();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const request = {
    id: crypto.randomUUID(),
    name: document.querySelector("#childName").value.trim(),
    age: Number(document.querySelector("#childAge").value),
    parentEmail: document.querySelector("#parentEmail").value.trim(),
    note: document.querySelector("#requestNote").value.trim(),
    status: "pending",
    createdAt: Date.now()
  };

  state.requests.unshift(request);
  saveRequests();
  form.reset();
  state.filter = "pending";
  filters.forEach(button => button.classList.toggle("active", button.dataset.filter === "pending"));
  renderRequests();
});

list.addEventListener("click", event => {
  const card = event.target.closest(".request-card");
  if (!card) return;

  if (event.target.classList.contains("approve")) {
    updateRequest(card.dataset.id, "approved");
  }

  if (event.target.classList.contains("reject")) {
    updateRequest(card.dataset.id, "rejected");
  }
});

filters.forEach(button => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    filters.forEach(item => item.classList.toggle("active", item === button));
    renderRequests();
  });
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

renderRequests();
