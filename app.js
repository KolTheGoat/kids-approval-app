const rideStorageKey = "transport-rides-v1";
const requestStorageKey = "transport-requests-v1";

const seedRides = [
  {
    id: "ride-ramot",
    driverName: "דני כהן",
    origin: "רמות",
    seats: 4,
    destination: "בית הפעולה - המרכז",
    createdAt: Date.now() - 300000
  },
  {
    id: "ride-givat-shaul",
    driverName: "נועה לוי",
    origin: "גבעת שאול",
    seats: 3,
    destination: "בית הפעולה - המרכז",
    createdAt: Date.now() - 200000
  }
];

const seedRequests = [
  {
    id: "request-ori",
    passengerName: "אורי מזרחי",
    passengerAddress: "רחוב התאנה 12",
    rideId: "ride-ramot",
    status: "pending",
    createdAt: Date.now() - 120000
  },
  {
    id: "request-michal",
    passengerName: "מיכל פרץ",
    passengerAddress: "רחוב השקד 8",
    rideId: "ride-givat-shaul",
    status: "approved",
    createdAt: Date.now() - 90000
  }
];

let rides = loadCollection(rideStorageKey, seedRides);
let requests = loadCollection(requestStorageKey, seedRequests);
let activeFilter = "all";
let installPrompt = null;

const driverForm = document.querySelector("#driverForm");
const passengerForm = document.querySelector("#passengerForm");
const rideSelect = document.querySelector("#rideSelect");
const ridesList = document.querySelector("#ridesList");
const requestsList = document.querySelector("#requestsList");
const rideTemplate = document.querySelector("#rideTemplate");
const requestTemplate = document.querySelector("#requestTemplate");
const pendingCount = document.querySelector("#pendingCount");
const approvedCount = document.querySelector("#approvedCount");
const openSeatsCount = document.querySelector("#openSeatsCount");
const installButton = document.querySelector("#installButton");

function loadCollection(key, fallback) {
  const saved = localStorage.getItem(key);
  if (!saved) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return [...fallback];
  }

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback));
    return [...fallback];
  }
}

function saveState() {
  localStorage.setItem(rideStorageKey, JSON.stringify(rides));
  localStorage.setItem(requestStorageKey, JSON.stringify(requests));
}

function approvedSeatsForRide(rideId) {
  return requests.filter((request) => request.rideId === rideId && request.status === "approved").length;
}

function openSeatsForRide(ride) {
  return Math.max(ride.seats - approvedSeatsForRide(ride.id), 0);
}

function getRide(rideId) {
  return rides.find((ride) => ride.id === rideId);
}

function statusText(status) {
  if (status === "approved") return "מאושר";
  if (status === "rejected") return "נדחה";
  return "ממתין";
}

function renderRideSelect() {
  rideSelect.innerHTML = "";

  if (rides.length === 0) {
    const option = document.createElement("option");
    option.textContent = "אין עדיין הסעות";
    option.disabled = true;
    option.selected = true;
    rideSelect.append(option);
    return;
  }

  rides.forEach((ride) => {
    const option = document.createElement("option");
    const freeSeats = openSeatsForRide(ride);
    option.value = ride.id;
    option.textContent = `${ride.driverName} - ${ride.origin} אל ${ride.destination} (${freeSeats} פנויים)`;
    option.disabled = freeSeats === 0;
    rideSelect.append(option);
  });
}

function renderRides() {
  ridesList.innerHTML = "";

  rides
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((ride) => {
      const card = rideTemplate.content.firstElementChild.cloneNode(true);
      const freeSeats = openSeatsForRide(ride);
      card.querySelector("h4").textContent = ride.driverName;
      card.querySelector("[data-origin]").textContent = ride.origin;
      card.querySelector("[data-destination]").textContent = ride.destination;
      card.querySelector(".seat-badge").textContent = `${freeSeats}/${ride.seats} פנויים`;
      card.classList.toggle("full", freeSeats === 0);
      ridesList.append(card);
    });
}

function renderRequests() {
  requestsList.innerHTML = "";

  const visibleRequests = requests
    .filter((request) => activeFilter === "all" || request.status === activeFilter)
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  if (visibleRequests.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "אין בקשות שמתאימות לסינון הזה.";
    requestsList.append(empty);
    return;
  }

  visibleRequests.forEach((request) => {
    const ride = getRide(request.rideId);
    const card = requestTemplate.content.firstElementChild.cloneNode(true);
    const approveButton = card.querySelector(".approve");
    const rejectButton = card.querySelector(".reject");

    card.dataset.status = request.status;
    card.querySelector("h4").textContent = request.passengerName;
    card.querySelector(".status-badge").textContent = statusText(request.status);
    card.querySelector(".route-line").textContent = `כתובת נוסע: ${request.passengerAddress}`;
    card.querySelector(".driver-line").textContent = ride
      ? `הסעה: ${ride.driverName}, מ-${ride.origin} אל ${ride.destination}`
      : "ההסעה המקורית לא נמצאה";

    approveButton.disabled = request.status === "approved" || !ride || openSeatsForRide(ride) === 0;
    rejectButton.disabled = request.status === "rejected";
    approveButton.addEventListener("click", () => updateRequestStatus(request.id, "approved"));
    rejectButton.addEventListener("click", () => updateRequestStatus(request.id, "rejected"));

    card.classList.add(request.status);
    requestsList.append(card);
  });
}

function renderStats() {
  const pending = requests.filter((request) => request.status === "pending").length;
  const approved = requests.filter((request) => request.status === "approved").length;
  const openSeats = rides.reduce((total, ride) => total + openSeatsForRide(ride), 0);

  pendingCount.textContent = pending;
  approvedCount.textContent = approved;
  openSeatsCount.textContent = openSeats;
}

function render() {
  renderRideSelect();
  renderRides();
  renderRequests();
  renderStats();
}

function updateRequestStatus(requestId, status) {
  const request = requests.find((item) => item.id === requestId);
  const ride = request ? getRide(request.rideId) : null;

  if (!request || !ride) return;
  if (status === "approved" && request.status !== "approved" && openSeatsForRide(ride) === 0) {
    alert("אין מקום פנוי בהסעה הזו.");
    return;
  }

  request.status = status;
  saveState();
  render();
}

driverForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(driverForm);
  const seats = Number(form.get("driverSeats"));

  rides.unshift({
    id: crypto.randomUUID(),
    driverName: form.get("driverName").trim(),
    origin: form.get("driverOrigin").trim(),
    seats,
    destination: form.get("driverDestination").trim(),
    createdAt: Date.now()
  });

  saveState();
  driverForm.reset();
  document.querySelector("#driverSeats").value = 4;
  render();
});

passengerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(passengerForm);
  const rideId = form.get("rideSelect");
  const ride = getRide(rideId);

  if (!ride || openSeatsForRide(ride) === 0) {
    alert("צריך לבחור הסעה עם מקום פנוי.");
    return;
  }

  requests.unshift({
    id: crypto.randomUUID(),
    passengerName: form.get("passengerName").trim(),
    passengerAddress: form.get("passengerAddress").trim(),
    rideId,
    status: "pending",
    createdAt: Date.now()
  });

  saveState();
  passengerForm.reset();
  render();
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter.active").classList.remove("active");
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderRequests();
  });
});

window.addEventListener("beforeinstallprompt", (event) => {
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
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

render();
