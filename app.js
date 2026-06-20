const stateKey = "hesaot-state-v3";

const defaultState = {
  rides: [
    {
      id: "ride-main",
      driverName: "יוסי כהן",
      origin: "רמות",
      seats: 5,
      destination: "בית הפעולה",
      createdAt: Date.now() - 120000
    }
  ],
  passengers: [
    {
      id: "passenger-dana",
      rideId: "ride-main",
      name: "דנה לוי",
      address: "רחוב התאנה 12",
      status: "approved",
      readyTime: "16:00",
      createdAt: Date.now() - 90000
    },
    {
      id: "passenger-noam",
      rideId: "ride-main",
      name: "נועם פרץ",
      address: "רחוב השקד 8",
      status: "pending",
      readyTime: "",
      createdAt: Date.now() - 40000
    }
  ]
};

let state = loadState();
let preselectedRideId = "";
let installPrompt = null;

const carsList = document.querySelector("#carsList");
const requestsList = document.querySelector("#requestsList");
const rideDialog = document.querySelector("#rideDialog");
const passengerDialog = document.querySelector("#passengerDialog");
const driverForm = document.querySelector("#driverForm");
const passengerForm = document.querySelector("#passengerForm");
const rideSelect = document.querySelector("#rideSelect");
const openRideForm = document.querySelector("#openRideForm");
const openPassengerForm = document.querySelector("#openPassengerForm");
const installButton = document.querySelector("#installButton");
const carsCount = document.querySelector("#carsCount");
const pendingCount = document.querySelector("#pendingCount");
const approvedCount = document.querySelector("#approvedCount");
const openSeatsCount = document.querySelector("#openSeatsCount");

function loadState() {
  const saved = localStorage.getItem(stateKey);
  if (!saved) {
    localStorage.setItem(stateKey, JSON.stringify(defaultState));
    return structuredClone(defaultState);
  }

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.setItem(stateKey, JSON.stringify(defaultState));
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function ridePassengers(rideId, status) {
  return state.passengers.filter((passenger) => {
    return passenger.rideId === rideId && (!status || passenger.status === status);
  });
}

function openSeats(ride) {
  return Math.max(ride.seats - ridePassengers(ride.id, "approved").length, 0);
}

function statusText(status) {
  if (status === "approved") return "מאושר";
  if (status === "rejected") return "נדחה";
  return "ממתין";
}

function showDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function openPassengerDialog(rideId = "") {
  preselectedRideId = rideId;
  renderRideSelect();
  showDialog(passengerDialog);
}

function renderRideSelect() {
  rideSelect.innerHTML = "";

  state.rides.forEach((ride) => {
    const option = document.createElement("option");
    option.value = ride.id;
    option.textContent = `${ride.driverName} - ${ride.origin} אל ${ride.destination} (${openSeats(ride)} פנויים)`;
    option.disabled = openSeats(ride) === 0;
    option.selected = preselectedRideId === ride.id;
    rideSelect.append(option);
  });

  if (!rideSelect.children.length) {
    const option = document.createElement("option");
    option.textContent = "אין רכבים, צריך להוסיף רכב קודם";
    option.disabled = true;
    option.selected = true;
    rideSelect.append(option);
  }
}

function renderCars() {
  carsList.innerHTML = "";

  if (!state.rides.length) {
    const empty = document.createElement("article");
    empty.className = "empty-card";
    empty.innerHTML = `
      <div class="empty-car-icon">🚗</div>
      <h3>אין רכבים עדיין</h3>
      <p>לחץ על הפלוס כדי להוסיף רכב ראשון.</p>
    `;
    carsList.append(empty);
    return;
  }

  state.rides
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((ride) => {
      const approved = ridePassengers(ride.id, "approved");
      const pending = ridePassengers(ride.id, "pending");
      const card = document.createElement("article");
      card.className = "car-card";

      const seatsMarkup = Array.from({ length: ride.seats }, (_, index) => {
        const passenger = approved[index];
        if (passenger) {
          return `
            <div class="seat occupied">
              <strong>${passenger.name}</strong>
              <small>${passenger.address}</small>
              <em>מוכן ב-${passenger.readyTime}</em>
            </div>
          `;
        }

        return `
          <button class="seat empty" type="button" data-add-passenger="${ride.id}">
            <span>+</span>
            מקום פנוי
          </button>
        `;
      }).join("");

      card.innerHTML = `
        <div class="car-header">
          <div>
            <p class="eyebrow">רכב</p>
            <h3>${ride.driverName}</h3>
          </div>
          <button class="small-action" type="button" data-add-passenger="${ride.id}">הוסף נוסע</button>
        </div>

        <div class="ride-meta">
          <span>יוצא מ: ${ride.origin}</span>
          <span>יעד: ${ride.destination}</span>
          <span>${openSeats(ride)}/${ride.seats} פנויים</span>
        </div>

        <div class="car-map" aria-label="מבט על של רכב">
          <div class="driver-seat">
            <strong>X</strong>
            <small>נהג</small>
          </div>
          ${seatsMarkup}
        </div>

        ${pending.length ? `<p class="pending-note">יש ${pending.length} בקשות שמחכות לאישור הנהג.</p>` : ""}
      `;

      carsList.append(card);
    });
}

function renderRequests() {
  requestsList.innerHTML = "";
  const requests = state.passengers
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  if (!requests.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "אין בקשות נוסעים עדיין.";
    requestsList.append(empty);
    return;
  }

  requests.forEach((passenger) => {
    const ride = state.rides.find((item) => item.id === passenger.rideId);
    const card = document.createElement("article");
    card.className = `request-card ${passenger.status}`;

    const canApprove = ride && passenger.status !== "approved" && openSeats(ride) > 0;
    const approvedMessage = passenger.status === "approved"
      ? `<div class="ready-message">הודעה לנוסע: תהיה מוכן ב-${passenger.readyTime}</div>`
      : "";

    card.innerHTML = `
      <div class="request-top">
        <div>
          <p class="eyebrow">הודעה מהאפליקציה לנהג</p>
          <h3>${ride ? ride.driverName : "נהג לא נמצא"}</h3>
        </div>
        <span class="status-badge">${statusText(passenger.status)}</span>
      </div>
      <p><strong>צריך לאשר את הילד:</strong> ${passenger.name}</p>
      <p><strong>כתובת נוסע:</strong> ${passenger.address}</p>
      <p><strong>הסעה:</strong> ${ride ? `${ride.origin} אל ${ride.destination}` : "ההסעה נמחקה"}</p>
      ${approvedMessage}
      ${passenger.status === "pending" ? `
        <label class="time-row">
          שעת מוכנות ליציאה
          <input type="time" value="16:00" data-ready-time="${passenger.id}" />
        </label>
        <div class="request-actions">
          <button class="approve" type="button" data-approve="${passenger.id}" ${canApprove ? "" : "disabled"}>אשר ילד</button>
          <button class="reject" type="button" data-reject="${passenger.id}">דחה</button>
        </div>
      ` : ""}
    `;

    requestsList.append(card);
  });
}

function renderStats() {
  carsCount.textContent = state.rides.length;
  pendingCount.textContent = state.passengers.filter((passenger) => passenger.status === "pending").length;
  approvedCount.textContent = state.passengers.filter((passenger) => passenger.status === "approved").length;
  openSeatsCount.textContent = state.rides.reduce((sum, ride) => sum + openSeats(ride), 0);
}

function render() {
  renderCars();
  renderRequests();
  renderRideSelect();
  renderStats();
}

function approvePassenger(passengerId) {
  const passenger = state.passengers.find((item) => item.id === passengerId);
  if (!passenger) return;

  const ride = state.rides.find((item) => item.id === passenger.rideId);
  if (!ride || openSeats(ride) === 0) {
    alert("אין מקום פנוי ברכב הזה.");
    return;
  }

  const timeInput = document.querySelector(`[data-ready-time="${passengerId}"]`);
  passenger.status = "approved";
  passenger.readyTime = timeInput?.value || "16:00";
  saveState();
  render();
}

function rejectPassenger(passengerId) {
  const passenger = state.passengers.find((item) => item.id === passengerId);
  if (!passenger) return;
  passenger.status = "rejected";
  passenger.readyTime = "";
  saveState();
  render();
}

openRideForm.addEventListener("click", () => showDialog(rideDialog));
openPassengerForm.addEventListener("click", () => openPassengerDialog());

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(`#${button.dataset.close}`).close();
  });
});

carsList.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-passenger]");
  if (!addButton) return;
  openPassengerDialog(addButton.dataset.addPassenger);
});

requestsList.addEventListener("click", (event) => {
  const approveButton = event.target.closest("[data-approve]");
  const rejectButton = event.target.closest("[data-reject]");

  if (approveButton) approvePassenger(approveButton.dataset.approve);
  if (rejectButton) rejectPassenger(rejectButton.dataset.reject);
});

driverForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(driverForm);

  state.rides.unshift({
    id: crypto.randomUUID(),
    driverName: form.get("driverName").trim(),
    origin: form.get("origin").trim(),
    seats: Number(form.get("seats")),
    destination: form.get("destination").trim(),
    createdAt: Date.now()
  });

  saveState();
  driverForm.reset();
  driverForm.querySelector('[name="seats"]').value = 4;
  rideDialog.close();
  render();
});

passengerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(passengerForm);
  const rideId = form.get("rideId");
  const ride = state.rides.find((item) => item.id === rideId);

  if (!ride || openSeats(ride) === 0) {
    alert("צריך לבחור רכב עם מקום פנוי.");
    return;
  }

  state.passengers.unshift({
    id: crypto.randomUUID(),
    rideId,
    name: form.get("passengerName").trim(),
    address: form.get("passengerAddress").trim(),
    status: "pending",
    readyTime: "",
    createdAt: Date.now()
  });

  saveState();
  passengerForm.reset();
  passengerDialog.close();
  preselectedRideId = "";
  render();
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
