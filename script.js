(() => {
  "use strict";

  const STORAGE_KEY = "tableturn.v1";
  const TABLES = [
    { id: 1, seats: 2 }, { id: 2, seats: 2 }, { id: 3, seats: 4 }, { id: 4, seats: 4 },
    { id: 5, seats: 4 }, { id: 6, seats: 6 }, { id: 7, seats: 6 }, { id: 8, seats: 2 }
  ];
  const MENU = [
    { id: "butter-chicken", name: "Butter Chicken", category: "Mains", tags: ["Non-Veg"], price: 520, prep: 20, desc: "Creamy tomato gravy, a little smoke.", image: "photo-1603894584373-5ac82b2ae398" },
    { id: "paneer-tikka", name: "Paneer Tikka", category: "Starters", tags: ["Veg", "Spicy"], price: 340, prep: 15, desc: "Charred paneer, mint chutney.", image: "photo-1567188040759-fb8a883dc6d8" },
    { id: "chicken-biryani", name: "Chicken Biryani", category: "Mains", tags: ["Non-Veg", "Spicy"], price: 460, prep: 20, desc: "Dum-cooked basmati, fragrant spices.", image: "photo-1563379091339-03246963d51a" },
    { id: "dal-makhani", name: "Dal Makhani", category: "Mains", tags: ["Veg"], price: 320, prep: 18, desc: "Slow-simmered black lentils, cream.", image: "photo-1546833999-b9f581a1996d" },
    { id: "tandoori-chicken", name: "Tandoori Chicken", category: "Starters", tags: ["Non-Veg", "Spicy"], price: 410, prep: 18, desc: "Clay-oven roasted, punchy marinade.", image: "photo-1599487488170-d11ec9c172f0" },
    { id: "palak-paneer", name: "Palak Paneer", category: "Mains", tags: ["Veg"], price: 330, prep: 16, desc: "Fresh spinach, soft paneer cubes.", image: "photo-1631452180519-c014fe946bc7" },
    { id: "masala-dosa", name: "Masala Dosa", category: "Mains", tags: ["Veg"], price: 260, prep: 14, desc: "Crisp rice crepe, spiced potato.", image: "photo-1668236543090-82eba5ee5976" },
    { id: "fish-tikka", name: "Coastal Fish Tikka", category: "Starters", tags: ["Non-Veg", "Spicy"], price: 440, prep: 17, desc: "Fresh catch, coastal masala.", image: "photo-1559847844-5315695dadae" },
    { id: "garden-salad", name: "Garden & Feta Salad", category: "Small plates", tags: ["Veg"], price: 290, prep: 10, desc: "Seasonal greens, citrus dressing.", image: "photo-1512621776951-a57141f2eefd" },
    { id: "naan-basket", name: "Tandoor Naan Basket", category: "Sides", tags: ["Veg"], price: 180, prep: 10, desc: "Butter naan, garlic naan, laccha.", image: "photo-1601050690597-df0568f70950" },
    { id: "gulab-jamun", name: "Warm Gulab Jamun", category: "Desserts", tags: ["Veg"], price: 190, prep: 12, desc: "Rose syrup, cardamom, vanilla cream.", image: "photo-1606313564200-e75d5e30476c" },
    { id: "mango-kulfi", name: "Mango Kulfi", category: "Desserts", tags: ["Veg"], price: 170, prep: 10, desc: "Alphonso mango, pistachio crunch.", image: "photo-1488900128323-21503983a07e" }
  ];
  const SLOT_MINUTES = [17 * 60, 17 * 60 + 30, 18 * 60, 18 * 60 + 30, 19 * 60, 19 * 60 + 30, 20 * 60, 20 * 60 + 30, 21 * 60, 21 * 60 + 30];
  const state = {
    reservations: [],
    cart: {},
    selectedTable: null,
    category: "All",
    diet: "All",
    reservationFilter: "All"
  };
  let toastTimer;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const localDate = (date) => {
    const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return adjusted.toISOString().slice(0, 10);
  };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const formatTime = (minutes) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };
  const today = () => localDate(new Date());
  const getReservationDate = () => $("#booking-date").value;
  const isSameDay = (a, b) => a === b;
  const reservationTotal = (reservation) => reservation.order.reduce((sum, item) => {
    const dish = MENU.find((menuItem) => menuItem.id === item.id);
    return sum + (dish ? dish.price * item.quantity : 0);
  }, 0);
  const reservationDuration = (reservation) => Number(reservation.durationMinutes) || 90;

  function showToast(message, type = "success") {
    const region = $("#toast-region");
    const toast = document.createElement("div");
    toast.className = `toast${type === "error" ? " error" : ""}`;
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3500);
  }

  function seedReservations() {
    const now = new Date();
    const date = localDate(now);
    const firstFutureSlot = SLOT_MINUTES.find((slot) => {
      const slotDate = new Date(`${date}T00:00:00`);
      slotDate.setMinutes(slot);
      return slotDate.getTime() > now.getTime() + 10 * 60000;
    });
    const base = firstFutureSlot === undefined ? 17 * 60 : firstFutureSlot;
    const candidates = [base, base + 60, base + 120, base + 180].filter((slot) => slot <= 22 * 60);
    const sampleTimes = candidates.length >= 3 ? candidates : [18 * 60, 19 * 60, 20 * 60, 20 * 60 + 30];
    const samples = [
      { guest: "Maya Kapoor", party: 2, tableId: 1, status: "Upcoming", order: [{ id: "paneer-tikka", quantity: 1 }, { id: "butter-chicken", quantity: 1 }] },
      { guest: "Arjun Mehta", party: 4, tableId: 3, status: "Upcoming", order: [{ id: "chicken-biryani", quantity: 2 }] },
      { guest: "Nina & Sam", party: 2, tableId: 8, status: "Arrived", order: [{ id: "dal-makhani", quantity: 1 }, { id: "naan-basket", quantity: 2 }] },
      { guest: "Olivia Chen", party: 5, tableId: 6, status: "Upcoming", order: [{ id: "tandoori-chicken", quantity: 1 }, { id: "garden-salad", quantity: 2 }] }
    ];
    return samples.map((sample, index) => {
      const arrival = sampleTimes[index % sampleTimes.length];
      return {
        id: `TT-${String(2100 + index).padStart(4, "0")}`,
        guest: sample.guest,
        email: "",
        party: sample.party,
        tableId: sample.tableId,
        date,
        arrival,
        status: sample.status,
        order: sample.order,
        notes: "",
        orderStatus: sample.status === "Arrived" ? "Cooking" : "Pending",
        createdAt: Date.now() - (index + 1) * 60000,
        durationMinutes: sample.status === "Completed" ? 78 : null
      };
    });
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        state.reservations = seedReservations();
        persist();
        return;
      }
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.reservations)) throw new Error("Stored reservations are invalid.");
      state.reservations = parsed.reservations;
    } catch (error) {
      console.error("Could not load TableTurn data:", error);
      state.reservations = seedReservations();
      showToast("Saved data could not be loaded. A fresh demo has started.", "error");
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ reservations: state.reservations }));
    } catch (error) {
      console.error("Could not save TableTurn data:", error);
      showToast("Changes are visible now but could not be saved in this browser.", "error");
    }
  }

  function setDefaultDate() {
    const dateInput = $("#booking-date");
    dateInput.min = today();
    const now = new Date();
    const latestSlot = SLOT_MINUTES[SLOT_MINUTES.length - 1];
    const localMinutes = now.getHours() * 60 + now.getMinutes();
    const initialDate = localMinutes >= latestSlot ? new Date(now.getTime() + 86400000) : now;
    dateInput.value = localDate(initialDate);
  }

  function renderTimeOptions() {
    const date = getReservationDate();
    const now = new Date();
    const validSlots = SLOT_MINUTES.filter((slot) => {
      if (date !== today()) return true;
      const target = new Date(`${date}T00:00:00`);
      target.setMinutes(slot);
      return target.getTime() > now.getTime() + 15 * 60000;
    });
    $("#booking-time").innerHTML = validSlots.length
      ? validSlots.map((slot) => `<option value="${slot}">${formatTime(slot)} – ${formatTime(slot + 90)}</option>`).join("")
      : `<option value="">No more slots today</option>`;
    renderTableOptions();
  }

  function overlaps(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
  }

  function tableIsAvailable(table, arrival, date) {
    return !state.reservations.some((reservation) => {
      if (reservation.date !== date || reservation.tableId !== table.id || reservation.status === "Completed" || reservation.status === "Cancelled") return false;
      return overlaps(arrival, arrival + 90, Number(reservation.arrival), Number(reservation.arrival) + 90);
    });
  }

  function renderTableOptions() {
    const date = getReservationDate();
    const arrival = Number($("#booking-time").value);
    const party = Number($("#party-size").value);
    const list = $("#table-options");
    if (!date || !$("#booking-time").value || !Number.isFinite(arrival)) {
      list.innerHTML = `<span class="field-hint">Choose a date and time to see available tables.</span>`;
      $("#availability-count").textContent = "Choose a time";
      state.selectedTable = null;
      return;
    }
    const eligible = TABLES.filter((table) => table.seats >= party);
    const available = eligible.filter((table) => tableIsAvailable(table, arrival, date));
    if (!available.some((table) => table.id === state.selectedTable)) state.selectedTable = available[0]?.id ?? null;
    $("#availability-count").textContent = `${available.length} of ${eligible.length} available`;
    list.innerHTML = eligible.map((table) => {
      const isAvailable = available.some((item) => item.id === table.id);
      const selected = state.selectedTable === table.id && isAvailable;
      return `<button type="button" class="table-option${selected ? " selected" : ""}" data-table="${table.id}" ${isAvailable ? "" : "disabled"} aria-pressed="${selected}"><strong>Table ${table.id}</strong><small>${table.seats} seats${isAvailable ? "" : " · booked"}</small></button>`;
    }).join("") || `<span class="field-hint">No tables fit your party size.</span>`;
    $$(".table-option:not(:disabled)", list).forEach((button) => button.addEventListener("click", () => {
      state.selectedTable = Number(button.dataset.table);
      renderTableOptions();
    }));
  }

  function renderCategoryTabs() {
    const categories = ["All", ...new Set(MENU.map((item) => item.category))];
    $("#category-tabs").innerHTML = categories.map((category) =>
      `<button type="button" class="category-tab${state.category === category ? " active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
    ).join("");
    $$(".category-tab").forEach((button) => button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderCategoryTabs();
      renderMenu();
    }));
  }

  function renderMenu() {
    const search = $("#menu-search").value.trim().toLowerCase();
    const dishes = MENU.filter((dish) => {
      const matchesCategory = state.category === "All" || dish.category === state.category;
      const matchesDiet = state.diet === "All" || dish.tags.includes(state.diet);
      const matchesSearch = !search || `${dish.name} ${dish.desc} ${dish.category} ${dish.tags.join(" ")}`.toLowerCase().includes(search);
      return matchesCategory && matchesDiet && matchesSearch;
    });
    $("#menu-grid").innerHTML = dishes.length ? dishes.map((dish) => `
      <article class="menu-card">
        <img class="dish-image" src="https://images.unsplash.com/${dish.image}?auto=format&fit=crop&w=240&q=70" alt="${escapeHtml(dish.name)}" loading="lazy" onerror="this.style.visibility='hidden'">
        <div class="dish-info"><div class="dish-heading"><h3>${escapeHtml(dish.name)}</h3><span class="dish-price">${money(dish.price)}</span></div>
          <p>${escapeHtml(dish.desc)} · ${dish.prep} min</p><div class="dish-bottom"><span class="dish-tags">${dish.tags.map((tag) => `<span class="dish-tag${tag === "Non-Veg" ? " nonveg" : tag === "Spicy" ? " spicy" : ""}">${tag === "Veg" ? "♧ " : tag === "Spicy" ? "🌶 " : ""}${escapeHtml(tag)}</span>`).join("")}</span>
          <button type="button" class="add-dish" data-dish="${dish.id}" aria-label="Add ${escapeHtml(dish.name)} to your order">+</button></div></div>
      </article>`).join("") : `<div class="menu-empty">No dishes match those filters. Try another category or search.</div>`;
    $$(".add-dish").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.dish;
      state.cart[id] = (state.cart[id] || 0) + 1;
      renderCart();
      showToast(`${MENU.find((dish) => dish.id === id).name} added to your order.`);
    }));
  }

  function getBill() {
    const subtotal = Object.entries(state.cart).reduce((sum, [id, quantity]) => {
      const dish = MENU.find((item) => item.id === id);
      return sum + (dish ? dish.price * quantity : 0);
    }, 0);
    const gst = subtotal * 0.05;
    const serviceCharge = subtotal * 0.05;
    return { subtotal, gst, serviceCharge, total: subtotal + gst + serviceCharge };
  }

  function renderCart() {
    const items = Object.entries(state.cart).filter(([, quantity]) => quantity > 0);
    const count = items.reduce((sum, [, quantity]) => sum + quantity, 0);
    $("#cart-count").textContent = count;
    $("#cart-items").innerHTML = items.length ? items.map(([id, quantity]) => {
      const dish = MENU.find((item) => item.id === id);
      if (!dish) return "";
      return `<div class="cart-item"><div><div class="cart-item-name">${escapeHtml(dish.name)}</div><div class="cart-item-controls"><span>${money(dish.price)} each</span><button type="button" class="remove-item" data-remove="${id}">Remove</button></div></div>
        <div><div class="cart-item-price">${money(dish.price * quantity)}</div><div class="quantity-control"><button type="button" data-quantity="${id}" data-delta="-1" aria-label="Remove one ${escapeHtml(dish.name)}">−</button><span>${quantity}</span><button type="button" data-quantity="${id}" data-delta="1" aria-label="Add one ${escapeHtml(dish.name)}">+</button></div></div></div>`;
    }).join("") : `<div class="cart-empty"><span>✳</span><strong>A little something?</strong><p>Your selected dishes will appear here.</p></div>`;
    $$(".remove-item").forEach((button) => button.addEventListener("click", () => {
      delete state.cart[button.dataset.remove];
      renderCart();
    }));
    $$("[data-quantity]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.quantity;
      state.cart[id] = (state.cart[id] || 0) + Number(button.dataset.delta);
      if (state.cart[id] <= 0) delete state.cart[id];
      renderCart();
    }));
    const bill = getBill();
    $("#subtotal").textContent = money(bill.subtotal);
    $("#gst").textContent = money(bill.gst);
    $("#service-charge").textContent = money(bill.serviceCharge);
    $("#total").textContent = money(bill.total);
  }

  function currentStatus(reservation) {
    if (reservation.status === "Completed" || reservation.status === "Cancelled") return reservation.status;
    return reservation.status;
  }

  function renderOverview() {
    const todayReservations = state.reservations.filter((reservation) => reservation.date === today() && reservation.status !== "Cancelled");
    const active = todayReservations.filter((reservation) => reservation.status !== "Completed");
    const uniqueTables = new Set(active.map((reservation) => reservation.tableId));
    const covers = todayReservations.reduce((sum, reservation) => sum + reservation.party, 0);
    const preorderCovers = todayReservations.filter((reservation) => reservation.order.length).reduce((sum, reservation) => sum + reservation.party, 0);
    const durations = todayReservations.filter((reservation) => reservation.status === "Completed").map(reservationDuration);
    const avgTurn = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 72;
    $("#metric-covers").textContent = covers;
    $("#metric-tables").textContent = `${uniqueTables.size}`;
    $("#table-progress").style.width = `${Math.min(100, uniqueTables.size / TABLES.length * 100)}%`;
    $("#metric-turn").textContent = avgTurn;
    $("#metric-preorders").textContent = todayReservations.filter((reservation) => reservation.order.length).length;
    $("#reservation-count").textContent = `${todayReservations.length} booking${todayReservations.length === 1 ? "" : "s"}`;
    $("#occupancy-percent").textContent = `${Math.round(uniqueTables.size / TABLES.length * 100)}%`;
    const sorted = todayReservations.slice().sort((a, b) => a.arrival - b.arrival).slice(0, 4);
    $("#overview-timeline").innerHTML = sorted.length ? sorted.map((reservation) =>
      `<div class="timeline-item"><span class="timeline-time">${formatTime(reservation.arrival)}</span><i class="timeline-mark${reservation.status === "Arrived" ? " arrived" : ""}"></i><span class="timeline-guest">${escapeHtml(reservation.guest)}</span><span class="timeline-meta">T${reservation.tableId} · ${reservation.party} guests</span></div>`
    ).join("") : `<div class="timeline-empty">No reservations on the books yet. Be the first to add one.</div>`;
    $("#table-map").innerHTML = TABLES.map((table) => {
      const reserved = active.find((reservation) => reservation.tableId === table.id);
      const className = reserved?.status === "Arrived" ? "arriving" : reserved ? "occupied" : "";
      return `<div class="table-chip ${className}"><b>T${table.id}</b><span>${reserved ? `${reserved.party} guests` : `${table.seats} seats`}</span></div>`;
    }).join("");
    const upcoming = state.reservations.filter((reservation) => reservation.status !== "Completed" && reservation.status !== "Cancelled" && reservation.order.length)
      .sort((a, b) => getFireTime(a) - getFireTime(b)).slice(0, 3);
    $("#kitchen-preview").innerHTML = upcoming.length ? upcoming.map((reservation) => {
      const fireAt = getFireTime(reservation);
      const fireSoon = fireAt <= Date.now() + 20 * 60000;
      const firstDish = MENU.find((dish) => dish.id === reservation.order[0]?.id);
      return `<article class="preview-ticket"><span class="preview-time${fireSoon ? " fire" : ""}">${formatTime(reservation.arrival)}</span><span class="preview-copy"><strong>${escapeHtml(firstDish?.name || "Pre-order")} ${reservation.order.length > 1 ? `+${reservation.order.length - 1}` : ""}</strong><small>${escapeHtml(reservation.guest)} · Table ${reservation.tableId}</small></span><span class="preview-status">${fireSoon ? "Fire soon" : "Queued"}</span></article>`;
    }).join("") : `<div class="timeline-empty">Kitchen tickets appear here when guests pre-order.</div>`;
  }

  function renderReservations() {
    const query = $("#reservation-search").value.trim().toLowerCase();
    const reservations = state.reservations.filter((reservation) => {
      const matchesFilter = state.reservationFilter === "All" || reservation.status === state.reservationFilter;
      const matchesSearch = !query || `${reservation.guest} ${reservation.id} ${reservation.email}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    }).sort((a, b) => a.date.localeCompare(b.date) || a.arrival - b.arrival);
    const allCount = state.reservations.filter((reservation) => reservation.status !== "Cancelled").length;
    $("#filter-all-count").textContent = allCount;
    $("#reservation-rows").innerHTML = reservations.length ? reservations.map((reservation) => {
      const dishNames = reservation.order.map((item) => MENU.find((dish) => dish.id === item.id)?.name).filter(Boolean);
      const badgeClass = reservation.status.toLowerCase();
      const dateLabel = reservation.date === today() ? "Today" : new Date(`${reservation.date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const action = reservation.status === "Upcoming"
        ? `<button type="button" class="row-action" data-checkin="${reservation.id}">Check in</button>`
        : reservation.status === "Arrived"
          ? `<button type="button" class="row-action" data-complete="${reservation.id}">Complete</button>`
          : `<span class="timeline-meta">—</span>`;
      const kitchenStatus = reservation.order.length ? reservation.orderStatus : "No pre-order";
      const kitchenClass = reservation.orderStatus ? ` status-kitchen-${reservation.orderStatus.toLowerCase()}` : "";
      return `<tr><td><div class="guest-cell"><span class="guest-avatar">${escapeHtml(reservation.guest.charAt(0).toUpperCase())}</span><span><strong>${escapeHtml(reservation.guest)}</strong><small>${escapeHtml(reservation.id)}</small></span></div></td><td>${dateLabel}, ${formatTime(reservation.arrival)}</td><td>${reservation.party} guests</td><td>Table ${reservation.tableId}</td><td>${dishNames.length ? `${escapeHtml(dishNames[0])}${dishNames.length > 1 ? ` +${dishNames.length - 1}` : ""}` : "—"}</td><td>${reservation.order.length ? `<span class="status-badge${kitchenClass}">${escapeHtml(kitchenStatus)}</span>` : "—"}</td><td><span class="status-badge status-${badgeClass}">${escapeHtml(currentStatus(reservation))}</span></td><td>${action}</td></tr>`;
    }).join("") : `<tr><td colspan="8" class="reservation-empty">No reservations match your search.</td></tr>`;
    $$("[data-checkin]").forEach((button) => button.addEventListener("click", () => updateReservation(button.dataset.checkin, { status: "Arrived" })));
    $$("[data-complete]").forEach((button) => button.addEventListener("click", () => updateReservation(button.dataset.complete, { status: "Completed", durationMinutes: 78 })));
  }

  function getFireTime(reservation) {
    const longestPrep = Math.max(0, ...reservation.order.map((item) => MENU.find((dish) => dish.id === item.id)?.prep || 0));
    const arrival = new Date(`${reservation.date}T00:00:00`);
    arrival.setMinutes(Number(reservation.arrival));
    return arrival.getTime() - longestPrep * 60000;
  }

  function renderKitchen() {
    const active = state.reservations.filter((reservation) => reservation.order.length && reservation.status !== "Completed" && reservation.status !== "Cancelled");
    const pending = active.filter((reservation) => reservation.orderStatus === "Pending");
    const cooking = active.filter((reservation) => reservation.orderStatus === "Cooking");
    const ready = active.filter((reservation) => reservation.orderStatus === "Ready");
    const sorter = (a, b) => {
      if (a.status === "Arrived" && b.status !== "Arrived") return -1;
      if (b.status === "Arrived" && a.status !== "Arrived") return 1;
      return getFireTime(a) - getFireTime(b);
    };
    const sortedPending = pending.slice().sort(sorter);
    const fireNowCount = sortedPending.filter((reservation) => reservation.status === "Arrived" || getFireTime(reservation) <= Date.now()).length;
    $("#nav-ticket-count").textContent = active.length;
    $("#pending-count").textContent = pending.length;
    $("#cooking-count").textContent = cooking.length;
    $("#ready-count").textContent = ready.length;
    $("#kds-summary").innerHTML = [
      ["Tickets in queue", active.length, "Pre-ordered meals across all tables"],
      ["Fire now", fireNowCount, "Arrival time is here or within prep window"],
      ["Guests checked in", state.reservations.filter((reservation) => reservation.status === "Arrived").length, "Prioritized at the front of the queue"]
    ].map(([label, value, detail]) => `<article class="kds-summary-card"><span>${label}</span><strong>${value}</strong><span>${detail}</span></article>`).join("");
    $("#pending-tickets").innerHTML = renderTicketList(sortedPending, "Pending");
    $("#cooking-tickets").innerHTML = renderTicketList(cooking.slice().sort(sorter), "Cooking");
    $("#ready-tickets").innerHTML = renderTicketList(ready.slice().sort(sorter), "Ready");
    $$("[data-ticket-action]").forEach((button) => button.addEventListener("click", () => {
      const reservation = state.reservations.find((item) => item.id === button.dataset.ticketId);
      if (!reservation) return;
      if (button.dataset.ticketAction === "complete") {
        updateReservation(reservation.id, { status: "Completed", orderStatus: "Ready", durationMinutes: 78 });
      } else {
        updateReservation(reservation.id, { orderStatus: button.dataset.ticketAction });
      }
    }));
  }

  function renderTicketList(reservations, status) {
    if (!reservations.length) return `<div class="ticket-empty">Nothing ${status === "Pending" ? "in the queue" : status === "Cooking" ? "on the fire" : "ready"} right now.</div>`;
    return reservations.map((reservation) => {
      const fireTime = getFireTime(reservation);
      const minsUntilFire = Math.ceil((fireTime - Date.now()) / 60000);
      const arrived = reservation.status === "Arrived";
      const priority = arrived || minsUntilFire <= 0;
      const fireLabel = arrived ? "GUEST ARRIVED · FIRE THIS ORDER" : minsUntilFire <= 0 ? "FIRE DISH NOW · GUEST ARRIVES SOON" : `Fire in ${minsUntilFire} min · Guest at ${formatTime(reservation.arrival)}`;
      const dishes = reservation.order.map((item) => {
        const dish = MENU.find((menuItem) => menuItem.id === item.id);
        return dish ? `<div class="ticket-dish"><span>${item.quantity} × ${escapeHtml(dish.name)}</span><span>${dish.prep} min</span></div>` : "";
      }).join("");
      const action = status === "Pending"
        ? `<button class="ticket-action start" data-ticket-action="Cooking" data-ticket-id="${reservation.id}">▶ &nbsp;Start cooking</button>`
        : status === "Cooking"
          ? `<button class="ticket-action ready" data-ticket-action="Ready" data-ticket-id="${reservation.id}">✓ &nbsp;Mark ready</button>`
          : `<button class="ticket-action done" data-ticket-action="complete" data-ticket-id="${reservation.id}">✓ &nbsp;Complete service</button>`;
      return `<article class="ticket-card${priority ? " priority" : ""}"><div class="ticket-top"><span class="ticket-code">${escapeHtml(reservation.id)}</span><span class="ticket-arrival">${formatTime(reservation.arrival)}</span></div><div class="ticket-guest">${escapeHtml(reservation.guest)}</div><div class="ticket-table">Table ${reservation.tableId} · ${reservation.party} guests · ${reservation.date === today() ? "Today" : escapeHtml(reservation.date)}</div><div class="ticket-dishes">${dishes}</div>${priority ? `<div class="ticket-fire">${fireLabel}</div>` : `<div class="ticket-progress">⏱ ${fireLabel}</div>`}${reservation.notes ? `<div class="ticket-note">✳ ${escapeHtml(reservation.notes)}</div>` : ""}<div class="ticket-actions">${action}</div></article>`;
    }).join("");
  }

  function renderAnalytics() {
    const tonight = state.reservations.filter((reservation) => reservation.date === today() && reservation.status !== "Cancelled");
    const bookedTables = new Set(tonight.map((reservation) => reservation.tableId)).size;
    const occupancy = Math.round(bookedTables / TABLES.length * 100);
    const completed = tonight.filter((reservation) => reservation.status === "Completed");
    const avgDuration = completed.length
      ? Math.round(completed.reduce((sum, reservation) => sum + reservationDuration(reservation), 0) / completed.length)
      : 72;
    const preorderCovers = tonight.filter((reservation) => reservation.order.length).reduce((sum, reservation) => sum + reservation.party, 0);
    const hourly = Array.from({ length: 6 }, (_, index) => tonight.filter((reservation) => Math.floor(reservation.arrival / 60) === index + 17).length);
    const peak = Math.max(...hourly);
    const peakIndex = hourly.indexOf(peak);
    $("#analytics-occupancy").textContent = `${occupancy}%`;
    $("#analytics-duration").textContent = avgDuration;
    $("#duration-meter").style.width = `${Math.min(100, avgDuration / 90 * 100)}%`;
    $("#analytics-preorder").textContent = preorderCovers;
    $("#peak-window").textContent = peak > 0 ? `${peakIndex + 5}:00 PM` : "—";
    $("#occupancy-bars").innerHTML = hourly.map((count, index) => {
      const height = count ? Math.max(18, count / Math.max(1, peak) * 100) : 8;
      return `<i title="${index + 5}:00 PM · ${count} bookings" style="height:${height}%"></i>`;
    }).join("");
    $("#peak-dots").innerHTML = hourly.map((count, index) => `<i class="${count && count === peak ? "active" : ""}" title="${index + 5}:00 PM · ${count} bookings"></i>`).join("");
  }

  function renderAll() {
    renderTableOptions();
    renderCart();
    renderOverview();
    renderReservations();
    renderKitchen();
    renderAnalytics();
  }

  function updateReservation(id, changes) {
    const reservation = state.reservations.find((item) => item.id === id);
    if (!reservation) return;
    Object.assign(reservation, changes);
    persist();
    renderAll();
    if (changes.status === "Arrived") showToast(`${reservation.guest} checked in — their kitchen ticket is now a priority.`);
    else if (changes.status === "Completed") showToast(`${reservation.guest}'s table is marked complete.`);
    else showToast(`Kitchen ticket ${reservation.id} updated to ${changes.orderStatus.toLowerCase()}.`);
  }

  function makeCalendarLink(reservation) {
    const date = new Date(`${reservation.date}T00:00:00`);
    date.setMinutes(reservation.arrival);
    const end = new Date(date.getTime() + 90 * 60000);
    const stamp = (value) => value.toISOString().replace(/[-:]|\.\d{3}/g, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "Dinner at Spice & Sage",
      dates: `${stamp(date)}/${stamp(end)}`,
      details: `Table ${reservation.tableId} for ${reservation.party}. Booking ${reservation.id}.`,
      location: "Spice & Sage"
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  function createReservation() {
    const guest = $("#guest-name").value.trim();
    const email = $("#guest-email").value.trim();
    const date = getReservationDate();
    const arrival = Number($("#booking-time").value);
    const party = Number($("#party-size").value);
    const table = TABLES.find((item) => item.id === state.selectedTable);
    const items = Object.entries(state.cart).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ id, quantity }));
    if (!guest) return showToast("Please enter your name to reserve a table.", "error"), $("#guest-name").focus();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast("Please enter a valid email address.", "error"), $("#guest-email").focus();
    if (!date || !$("#booking-time").value || !Number.isFinite(arrival) || !table) return showToast("Choose an available table, date, and arrival time first.", "error");
    if (date < today()) return showToast("Please choose today or a future date.", "error");
    if (!tableIsAvailable(table, arrival, date)) {
      state.selectedTable = null;
      renderTableOptions();
      return showToast("That table was just booked. Please choose another.", "error");
    }
    if (!items.length) return showToast("Add at least one dish to your pre-order.", "error");
    const id = `TT-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-3)}`;
    const reservation = {
      id, guest, email, party, tableId: table.id, date, arrival, status: "Upcoming",
      order: items, notes: $("#booking-notes").value.trim(), orderStatus: "Pending", createdAt: Date.now(), durationMinutes: null
    };
    state.reservations.push(reservation);
    persist();
    state.cart = {};
    $("#guest-name").value = "";
    $("#guest-email").value = "";
    $("#booking-notes").value = "";
    renderAll();
    showConfirmation(reservation);
  }

  function showConfirmation(reservation) {
    const items = reservation.order.map((item) => {
      const dish = MENU.find((menuItem) => menuItem.id === item.id);
      return dish ? `${item.quantity} × ${dish.name}` : "";
    }).filter(Boolean).join(" · ");
    const bill = reservationTotal(reservation);
    const payload = encodeURIComponent(`${location.origin}${location.pathname}#reservation-${reservation.id}`);
    $("#confirmation-content").innerHTML = `<div class="confirm-icon">✓</div><p class="eyebrow">IT’S ALL TAKEN CARE OF</p><h2>You’re on the list, ${escapeHtml(reservation.guest.split(" ")[0])}.</h2><p>Your table is saved. We’ll have your order timed to your arrival.</p><div class="booking-code"><small>YOUR BOOKING CODE</small><strong>${escapeHtml(reservation.id)}</strong></div><div class="confirmation-details"><div><small>WHEN</small><strong>${new Date(`${reservation.date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${formatTime(reservation.arrival)}</strong></div><div><small>YOUR TABLE</small><strong>Table ${reservation.tableId} · ${reservation.party} guests</strong></div><div><small>PRE-ORDER</small><strong>${escapeHtml(items || "No dishes selected")}</strong></div><div><small>ESTIMATED TOTAL</small><strong>${money(bill * 1.1)}</strong></div><div><small>KITCHEN STATUS</small><strong>${escapeHtml(reservation.orderStatus)} · updates live</strong></div></div><img class="booking-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=112x112&margin=0&data=${payload}" alt="QR code for booking ${escapeHtml(reservation.id)}" width="112" height="112" loading="lazy" onerror="this.style.display='none'"><p class="confirmation-items">Show this pass when you arrive. Your kitchen ticket is already in the queue.</p><a class="calendar-link" target="_blank" rel="noopener noreferrer" href="${makeCalendarLink(reservation)}">＋ Add to Google Calendar</a><button type="button" class="button button-dark" id="confirmation-done">Lovely, thanks!</button>`;
    const dialog = $("#confirmation-dialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    $("#confirmation-done").addEventListener("click", () => dialog.close());
  }

  function updateClock() {
    $("#kds-time").textContent = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date());
    const date = new Date();
    $("#today-label").textContent = date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const footerYear = $("#footer-year");
    if (footerYear) footerYear.textContent = date.getFullYear();
    renderKitchen();
    renderOverview();
  }

  function setupNavigation() {
    const links = $$(".nav-link");
    links.forEach((link) => link.addEventListener("click", () => {
      links.forEach((item) => item.classList.toggle("active", item === link));
      $("#page-breadcrumb").textContent = link.textContent.trim().replace(/^\S+\s*/, "");
      $("#sidebar").classList.remove("open");
    }));
    $("#menu-toggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const link = links.find((item) => item.dataset.section === visible.target.id);
        if (link) {
          links.forEach((item) => item.classList.toggle("active", item === link));
          $("#page-breadcrumb").textContent = link.textContent.trim().replace(/^\S+\s*/, "");
        }
      }, { rootMargin: "-20% 0px -65% 0px", threshold: [0, .2, .5] });
      $$(".page-section").forEach((section) => observer.observe(section));
    }
  }

  function setupEvents() {
    $("#booking-date").addEventListener("change", () => { renderTimeOptions(); renderOverview(); });
    $("#booking-time").addEventListener("change", renderTableOptions);
    $("#party-size").addEventListener("change", renderTableOptions);
    $("#menu-search").addEventListener("input", renderMenu);
    $$(".diet-chip").forEach((button) => button.addEventListener("click", () => {
      state.diet = button.dataset.diet;
      $$(".diet-chip").forEach((chip) => chip.classList.toggle("active", chip === button));
      renderMenu();
    }));
    $("#reserve-button").addEventListener("click", createReservation);
    $("#reservation-search").addEventListener("input", renderReservations);
    $$(".filter-button").forEach((button) => button.addEventListener("click", () => {
      state.reservationFilter = button.dataset.filter;
      $$(".filter-button").forEach((filter) => filter.classList.toggle("active", filter === button));
      renderReservations();
    }));
    $("#dialog-close").addEventListener("click", () => $("#confirmation-dialog").close());
    $("#confirmation-dialog").addEventListener("click", (event) => {
      if (event.target === $("#confirmation-dialog")) $("#confirmation-dialog").close();
    });
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        if (!Array.isArray(parsed.reservations)) throw new Error("Updated reservation data is invalid.");
        state.reservations = parsed.reservations;
        renderAll();
      } catch (error) {
        console.error("Could not sync TableTurn data:", error);
        showToast("A booking update from another tab could not be read.", "error");
      }
    });
  }

  function init() {
    loadState();
    setDefaultDate();
    renderTimeOptions();
    renderCategoryTabs();
    renderMenu();
    setupEvents();
    setupNavigation();
    renderAll();
    updateClock();
    window.setInterval(updateClock, 30000);
  }

  init();
})();