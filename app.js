// =========================
// CONFIGURAZIONE FIREBASE
// =========================
// 1. Crea un progetto su https://console.firebase.google.com
// 2. Abilita Firestore Database
// 3. Copia qui il tuo config (apiKey, authDomain, ecc.)
// 4. Usa autenticazione anonima o con email per i familiari

// ESEMPIO (SOSTITUISCI CON IL TUO):
/*
const firebaseConfig = {
  apiKey: "TUO_API_KEY",
  authDomain: "TUO_AUTH_DOMAIN",
  projectId: "TUO_PROJECT_ID",
  storageBucket: "TUO_BUCKET",
  messagingSenderId: "TUO_SENDER_ID",
  appId: "TUO_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
*/

// Per ora uso solo localStorage; quando sei pronto, sostituisci le funzioni
// loadDataFromBackend / saveDataToBackend con Firestore.

// =========================
// STATO IN MEMORIA
// =========================

let state = {
  lists: [],
  tasks: [],
  currentListId: null,
  filter: "all"
};

const STORAGE_KEY = "family-reminder-state-v1";

// =========================
// UTILITÀ
// =========================

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = { ...state, ...parsed };
  } catch (e) {
    console.error("Errore nel caricamento localStorage", e);
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lists: state.lists,
        tasks: state.tasks,
        currentListId: state.currentListId
      })
    );
  } catch (e) {
    console.error("Errore nel salvataggio localStorage", e);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function formatDateTime(dateStr, timeStr) {
  if (!dateStr && !timeStr) return "";
  if (dateStr && !timeStr) return `Scade il ${dateStr}`;
  if (!dateStr && timeStr) return `Alle ${timeStr}`;
  return `${dateStr} · ${timeStr}`;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function isOverdue(dateStr, timeStr) {
  if (!dateStr) return false;
  const now = new Date();
  const d = new Date(dateStr);
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  }
  return d < now;
}

// =========================
// RENDER LISTE
// =========================

const listsContainer = document.getElementById("listsContainer");
const currentListNameEl = document.getElementById("currentListName");
const currentListMetaEl = document.getElementById("currentListMeta");

function renderLists() {
  listsContainer.innerHTML = "";

  if (state.lists.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Nessuna lista. Crea la prima per la famiglia!";
    empty.style.color = "#9ca3af";
    empty.style.fontSize = "0.85rem";
    listsContainer.appendChild(empty);
    return;
  }

  state.lists.forEach((list) => {
    const li = document.createElement("li");
    li.className = "list-item" + (list.id === state.currentListId ? " active" : "");

    const main = document.createElement("div");
    main.className = "list-main";

    const icon = document.createElement("div");
    icon.className = "list-icon";
    icon.style.background = list.color || "#1f2937";
    icon.textContent = list.icon || "📋";

    const name = document.createElement("div");
    name.className = "list-name";
    name.textContent = list.name;

    const count = document.createElement("div");
    count.className = "list-count";
    const tasksInList = state.tasks.filter((t) => t.listId === list.id && !t.completed);
    count.textContent = tasksInList.length === 1
      ? "1 promemoria"
      : `${tasksInList.length} promemoria`;

    main.appendChild(icon);
    main.appendChild(name);

    const right = document.createElement("div");
    right.className = "list-count";
    right.textContent = count.textContent;

    li.appendChild(main);
    li.appendChild(right);

    li.addEventListener("click", () => {
      state.currentListId = list.id;
      saveToLocalStorage();
      renderLists();
      renderTasks();
    });

    listsContainer.appendChild(li);
  });

  const current = state.lists.find((l) => l.id === state.currentListId);
  if (current) {
    currentListNameEl.textContent = current.name;
    currentListMetaEl.textContent = "Lista condivisa di famiglia";
  } else {
    currentListNameEl.textContent = "Seleziona una lista";
    currentListMetaEl.textContent = "";
  }
}

// =========================
// RENDER TASKS
// =========================

const tasksContainer = document.getElementById("tasksContainer");

function renderTasks() {
  tasksContainer.innerHTML = "";

  if (!state.currentListId) {
    const msg = document.createElement("li");
    msg.textContent = "Seleziona una lista per vedere i promemoria.";
    msg.style.color = "#9ca3af";
    msg.style.fontSize = "0.85rem";
    tasksContainer.appendChild(msg);
    return;
  }

  let tasks = state.tasks.filter((t) => t.listId === state.currentListId);

  if (state.filter === "today") {
    tasks = tasks.filter((t) => isToday(t.date));
  } else if (state.filter === "upcoming") {
    tasks = tasks.filter((t) => !t.completed && !isOverdue(t.date, t.time));
  }

  if (tasks.length === 0) {
    const msg = document.createElement("li");
    msg.textContent = "Nessun promemoria in questa vista.";
    msg.style.color = "#9ca3af";
    msg.style.fontSize = "0.85rem";
    tasksContainer.appendChild(msg);
    return;
  }

  tasks.sort((a, b) => {
    // Ordina per data, poi priorità
    const pa = priorityWeight(a.priority);
    const pb = priorityWeight(b.priority);
    const da = a.date || "";
    const db = b.date || "";
    if (da === db) return pb - pa;
    return da.localeCompare(db);
  });

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";

    // LEFT
    const left = document.createElement("div");
    left.className = "task-left";

    const checkbox = document.createElement("div");
    checkbox.className = "task-checkbox" + (task.completed ? " completed" : "");
    checkbox.addEventListener("click", () => {
      task.completed = !task.completed;
      // Gestione ripetizione: se completato e ha repeat, crea nuova occorrenza
      if (task.completed && task.repeat && task.repeat !== "none" && task.date) {
        createNextRepeat(task);
      }
      saveToLocalStorage();
      renderTasks();
      renderLists();
    });

    const textBlock = document.createElement("div");

    const title = document.createElement("div");
    title.className = "task-title" + (task.completed ? " completed" : "");
    title.textContent = task.title;

    const notes = document.createElement("div");
    notes.className = "task-notes";
    notes.textContent = task.notes || "";

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const dt = formatDateTime(task.date, task.time);
    if (dt) {
      const badgeDate = document.createElement("span");
      badgeDate.className = "badge";
      badgeDate.textContent = dt;
      if (isOverdue(task.date, task.time) && !task.completed) {
        badgeDate.classList.add("badge-overdue");
      } else if (isToday(task.date)) {
        badgeDate.classList.add("badge-today");
      }
      meta.appendChild(badgeDate);
    }

    if (task.priority && task.priority !== "none") {
      const badgePrio = document.createElement("span");
      badgePrio.className = "badge";
      if (task.priority === "high") badgePrio.classList.add("badge-priority-high");
      if (task.priority === "medium") badgePrio.classList.add("badge-priority-medium");
      if (task.priority === "low") badgePrio.classList.add("badge-priority-low");
      badgePrio.textContent =
        task.priority === "high"
          ? "Priorità alta"
          : task.priority === "medium"
          ? "Priorità media"
          : "Priorità bassa";
      meta.appendChild(badgePrio);
    }

    if (task.tags && task.tags.length > 0) {
      task.tags.forEach((tag) => {
        const badgeTag = document.createElement("span");
        badgeTag.className = "badge";
        badgeTag.textContent = tag;
        meta.appendChild(badgeTag);
      });
    }

    if (task.repeat && task.repeat !== "none") {
      const badgeRep = document.createElement("span");
      badgeRep.className = "badge";
      badgeRep.textContent =
        task.repeat === "daily"
          ? "Ripete ogni giorno"
          : task.repeat === "weekly"
          ? "Ripete ogni settimana"
          : "Ripete ogni mese";
      meta.appendChild(badgeRep);
    }

    if (task.attachment) {
      const badgeAtt = document.createElement("a");
      badgeAtt.className = "badge";
      badgeAtt.href = task.attachment;
      badgeAtt.target = "_blank";
      badgeAtt.rel = "noopener noreferrer";
      badgeAtt.textContent = "Allegato";
      meta.appendChild(badgeAtt);
    }

    textBlock.appendChild(title);
    if (task.notes) textBlock.appendChild(notes);
    textBlock.appendChild(meta);

    // Subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      const st = document.createElement("div");
      st.className = "task-subtasks";
      st.textContent = "Sub-attività: " + task.subtasks.join(" · ");
      textBlock.appendChild(st);
    }

    left.appendChild(checkbox);
    left.appendChild(textBlock);

    // RIGHT
    const right = document.createElement("div");
    right.className = "task-right";

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Modifica";
    editBtn.addEventListener("click", () => openTaskModal(task));

    const delBtn = document.createElement("button");
    delBtn.textContent = "Elimina";
    delBtn.style.color = "#ef4444";
    delBtn.addEventListener("click", () => {
      if (confirm("Vuoi eliminare questo promemoria?")) {
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
        saveToLocalStorage();
        renderTasks();
        renderLists();
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    right.appendChild(actions);

    li.appendChild(left);
    li.appendChild(right);

    tasksContainer.appendChild(li);
  });
}

function priorityWeight(p) {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  if (p === "low") return 1;
  return 0;
}

function createNextRepeat(task) {
  if (!task.date) return;
  const d = new Date(task.date);
  if (task.repeat === "daily") {
    d.setDate(d.getDate() + 1);
  } else if (task.repeat === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (task.repeat === "monthly") {
    d.setMonth(d.getMonth() + 1);
  }
  const next = { ...task };
  next.id = generateId();
  next.completed = false;
  next.date = d.toISOString().slice(0, 10);
  state.tasks.push(next);
}

// =========================
// MODALI LISTA
// =========================

const listModal = document.getElementById("listModal");
const listNameInput = document.getElementById("listNameInput");
const listColorInput = document.getElementById("listColorInput");
const listIconInput = document.getElementById("listIconInput");
const listSaveBtn = document.getElementById("listSaveBtn");
const listCancelBtn = document.getElementById("listCancelBtn");
const newListBtn = document.getElementById("newListBtn");

function openListModal() {
  listNameInput.value = "";
  listColorInput.value = "#007aff";
  listIconInput.value = "📋";
  listModal.classList.add("show");
  listNameInput.focus();
}

function closeListModal() {
  listModal.classList.remove("show");
}

newListBtn.addEventListener("click", openListModal);
listCancelBtn.addEventListener("click", closeListModal);

listSaveBtn.addEventListener("click", () => {
  const name = listNameInput.value.trim();
  if (!name) {
    alert("Inserisci un nome per la lista.");
    return;
  }
  const list = {
    id: generateId(),
    name,
    color: listColorInput.value || "#007aff",
    icon: listIconInput.value || "📋"
  };
  state.lists.push(list);
  state.currentListId = list.id;
  saveToLocalStorage();
  closeListModal();
  renderLists();
  renderTasks();
});

// =========================
// MODALI TASK
// =========================

const taskModal = document.getElementById("taskModal");
const taskTitleInput = document.getElementById("taskTitleInput");
const taskNotesInput = document.getElementById("taskNotesInput");
const taskDateInput = document.getElementById("taskDateInput");
const taskTimeInput = document.getElementById("taskTimeInput");
const taskPriorityInput = document.getElementById("taskPriorityInput");
const taskTagsInput = document.getElementById("taskTagsInput");
const taskRepeatInput = document.getElementById("taskRepeatInput");
const taskSubtasksInput = document.getElementById("taskSubtasksInput");
const taskAttachmentInput = document.getElementById("taskAttachmentInput");
const taskSaveBtn = document.getElementById("taskSaveBtn");
const taskCancelBtn = document.getElementById("taskCancelBtn");
const newTaskBtn = document.getElementById("newTaskBtn");

let editingTaskId = null;

function openTaskModal(task = null) {
  if (!state.currentListId) {
    alert("Seleziona prima una lista.");
    return;
  }

  editingTaskId = task ? task.id : null;

  taskTitleInput.value = task ? task.title : "";
  taskNotesInput.value = task ? task.notes || "" : "";
  taskDateInput.value = task ? task.date || "" : "";
  taskTimeInput.value = task ? task.time || "" : "";
  taskPriorityInput.value = task ? task.priority || "none" : "none";
  taskTagsInput.value = task && task.tags ? task.tags.join(" ") : "";
  taskRepeatInput.value = task ? task.repeat || "none" : "none";
  taskSubtasksInput.value = task && task.subtasks ? task.subtasks.join("; ") : "";
  taskAttachmentInput.value = task ? task.attachment || "" : "";

  taskModal.classList.add("show");
  taskTitleInput.focus();
}

function closeTaskModal() {
  taskModal.classList.remove("show");
  editingTaskId = null;
}

newTaskBtn.addEventListener("click", () => openTaskModal());
taskCancelBtn.addEventListener("click", closeTaskModal);

taskSaveBtn.addEventListener("click", () => {
  const title = taskTitleInput.value.trim();
  if (!title) {
    alert("Inserisci un titolo per il promemoria.");
    return;
  }

  const tags =
    taskTagsInput.value
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length > 0) || [];

  const subtasks =
    taskSubtasksInput.value
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0) || [];

  const data = {
    title,
    notes: taskNotesInput.value.trim(),
    date: taskDateInput.value || null,
    time: taskTimeInput.value || null,
    priority: taskPriorityInput.value,
    tags,
    repeat: taskRepeatInput.value,
    subtasks,
    attachment: taskAttachmentInput.value.trim() || null
  };

  if (editingTaskId) {
    const t = state.tasks.find((x) => x.id === editingTaskId);
    if (t) {
      Object.assign(t, data);
    }
  } else {
    const newTask = {
      id: generateId(),
      listId: state.currentListId,
      completed: false,
      ...data
    };
    state.tasks.push(newTask);
  }

  saveToLocalStorage();
  closeTaskModal();
  renderTasks();
  renderLists();
});

// =========================
// FILTRI
// =========================

const filterButtons = document.querySelectorAll(".tasks-filters button");
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.filter = btn.dataset.filter;
    renderTasks();
  });
});

// =========================
// AVVIO
// =========================

loadFromLocalStorage();

// Se non ci sono liste, crea una lista di default "Famiglia"
if (state.lists.length === 0) {
  const defaultList = {
    id: generateId(),
    name: "Famiglia",
    color: "#3b82f6",
    icon: "👨‍👩‍👧‍👦"
  };
  state.lists.push(defaultList);
  state.currentListId = defaultList.id;
  saveToLocalStorage();
}

renderLists();
renderTasks();
