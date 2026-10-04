const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskCategory = document.getElementById("taskCategory");
const taskPriority = document.getElementById("taskPriority");
const taskDueDate = document.getElementById("taskDueDate");

const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const submitBtn = document.getElementById("submitBtn");
const cancelEdit = document.getElementById("cancelEdit");
const formTitle = document.getElementById("formTitle");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const categoryFilter = document.getElementById("categoryFilter");
const priorityFilter = document.getElementById("priorityFilter");
const themeToggle = document.getElementById("themeToggle");

let tasks = [];
let editingId = null;

// Load saved tasks safely.
try {
  const savedTasks = JSON.parse(localStorage.getItem("taskflow_tasks") || "[]");

  if (Array.isArray(savedTasks)) {
    tasks = savedTasks.filter(
      (task) =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.completed === "boolean",
    );
  }
} catch (error) {
  console.error("Could not load saved tasks:", error);
}

// Save tasks to Local Storage.
function saveTasks() {
  try {
    localStorage.setItem("taskflow_tasks", JSON.stringify(tasks));
    return true;
  } catch (error) {
    alert("Unable to save tasks. Browser storage may be full or disabled.");
    console.error("Could not save tasks:", error);
    return false;
  }
}

// Format a date without timezone conversion.
function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Compare date strings using local calendar dates.
function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayString = `${year}-${month}-${day}`;

  return task.dueDate < todayString;
}

// Update dashboard summary cards.
function updateStats() {
  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;

  document.getElementById("totalCount").textContent = tasks.length;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("pendingCount").textContent = pending;
}

// Create task elements safely without inserting user text as HTML.
function createElement(tag, className, text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  element.textContent = text;
  return element;
}

// Build the task card.
function createTaskCard(task) {
  const card = createElement(
    "article",
    `task-card${task.completed ? " completed" : ""}`,
  );

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute(
    "aria-label",
    `Mark ${task.title} as ${task.completed ? "pending" : "completed"}`,
  );

  checkbox.addEventListener("change", () => {
    toggleTask(task.id);
  });

  const content = createElement("div", "task-content");

  const title = createElement("h3", "task-title", task.title);
  content.appendChild(title);

  if (task.description) {
    content.appendChild(
      createElement("p", "task-description", task.description),
    );
  }

  const meta = createElement("div", "task-meta");

  meta.appendChild(createElement("span", "tag", task.category));

  const priorityClass = {
    High: "priority-high",
    Medium: "priority-medium",
    Low: "priority-low",
  };

  meta.appendChild(
    createElement(
      "span",
      `tag ${priorityClass[task.priority] || "priority-medium"}`,
      `${task.priority || "Medium"} Priority`,
    ),
  );

  meta.appendChild(
    createElement("span", "tag", task.completed ? "Completed" : "Pending"),
  );

  if (task.dueDate) {
    const dueDateTag = createElement(
      "span",
      `tag due-date${isOverdue(task) ? " overdue" : ""}`,
      `${isOverdue(task) ? "Overdue: " : "Due: "}${formatDate(task.dueDate)}`,
    );

    meta.appendChild(dueDateTag);
  }

  content.appendChild(meta);

  const actions = createElement("div", "task-actions");
  const editButton = createElement("button", "action-btn");
  editButton.type = "button";
  editButton.innerHTML = '<i class="bi bi-pencil"></i> Edit';
  editButton.type = "button";
  editButton.setAttribute("aria-label", `Edit ${task.title}`);
  editButton.addEventListener("click", () => editTask(task.id));

  const deleteButton = createElement("button", "action-btn delete-btn");
  deleteButton.type = "button";
  deleteButton.innerHTML = '<i class="bi bi-trash3"></i> Delete';

  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  actions.append(editButton, deleteButton);
  card.append(checkbox, content, actions);

  return card;
}

// Display tasks using search and filters.
function renderTasks() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  const selectedCategory = categoryFilter.value;
  const selectedPriority = priorityFilter.value;

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm) ||
      (task.description || "").toLowerCase().includes(searchTerm);

    const matchesStatus =
      selectedStatus === "All" ||
      (selectedStatus === "Completed" && task.completed) ||
      (selectedStatus === "Pending" && !task.completed);

    const matchesCategory =
      selectedCategory === "All" || task.category === selectedCategory;

    const matchesPriority =
      selectedPriority === "All" || task.priority === selectedPriority;

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  taskList.replaceChildren();

  // Show newest tasks first.
  filteredTasks.reverse().forEach((task) => {
    taskList.appendChild(createTaskCard(task));
  });

  emptyState.style.display = filteredTasks.length === 0 ? "block" : "none";

  document.getElementById("resultCount").textContent =
    `${filteredTasks.length} ${filteredTasks.length === 1 ? "task" : "tasks"}`;

  updateStats();
}

// Validate form fields.
function validateTask() {
  const title = taskTitle.value.trim();

  if (!title) {
    alert("Please enter a task title.");
    taskTitle.focus();
    return false;
  }

  if (title.length > 100) {
    alert("Task title cannot exceed 100 characters.");
    return false;
  }

  if (taskDescription.value.trim().length > 500) {
    alert("Description cannot exceed 500 characters.");
    return false;
  }

  if (taskDueDate.value) {
    const [year, month, day] = taskDueDate.value.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);

    if (
      selectedDate.getFullYear() !== year ||
      selectedDate.getMonth() !== month - 1 ||
      selectedDate.getDate() !== day
    ) {
      alert("Please select a valid due date.");
      return false;
    }
  }

  return true;
}

// Add a new task or update an existing task.
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateTask()) return;

  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();

  if (editingId) {
    const index = tasks.findIndex((task) => task.id === editingId);

    if (index === -1) {
      alert("Task not found. Please try again.");
      resetForm();
      return;
    }

    const updatedTask = {
      ...tasks[index],
      title,
      description,
      category: taskCategory.value,
      priority: taskPriority.value,
      dueDate: taskDueDate.value,
    };

    const previousTask = tasks[index];
    tasks[index] = updatedTask;

    if (!saveTasks()) {
      tasks[index] = previousTask;
      return;
    }
  } else {
    const newTask = {
      id: crypto.randomUUID(),
      title,
      description,
      category: taskCategory.value,
      priority: taskPriority.value,
      dueDate: taskDueDate.value,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);

    if (!saveTasks()) {
      tasks.pop();
      return;
    }
  }

  resetForm();
  renderTasks();
});

// Load a task into the form for editing.
function editTask(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  editingId = id;
  taskTitle.value = task.title;
  taskDescription.value = task.description || "";
  taskCategory.value = task.category || "Personal";
  taskPriority.value = task.priority || "Medium";
  taskDueDate.value = task.dueDate || "";

  formTitle.textContent = "Edit Task";
  submitBtn.textContent = "Save Changes";
  cancelEdit.classList.remove("hidden");

  document.querySelector(".task-form-section").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  taskTitle.focus();
}

// Reset the form after adding or cancelling an edit.
function resetForm() {
  taskForm.reset();
  editingId = null;

  formTitle.textContent = "Add a New Task";
  submitBtn.textContent = "+ Add Task";
  cancelEdit.classList.add("hidden");

  taskPriority.value = "Medium";
  taskCategory.value = "Personal";
}

// Cancel editing.
cancelEdit.addEventListener("click", resetForm);

// Delete a task.
function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  if (!confirm(`Are you sure you want to delete "${task.title}"?`)) {
    return;
  }

  const previousTasks = [...tasks];
  tasks = tasks.filter((item) => item.id !== id);

  if (!saveTasks()) {
    tasks = previousTasks;
    return;
  }

  if (editingId === id) {
    resetForm();
  }

  renderTasks();
}

// Toggle completed and pending status.
function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  task.completed = !task.completed;

  if (!saveTasks()) {
    task.completed = !task.completed;
    renderTasks();
    return;
  }

  renderTasks();
}

// Search and filtering events.
searchInput.addEventListener("input", renderTasks);
statusFilter.addEventListener("change", renderTasks);
categoryFilter.addEventListener("change", renderTasks);
priorityFilter.addEventListener("change", renderTasks);

// Dark mode.
function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);

  themeToggle.innerHTML = isDark
    ? '<i class="bi bi-sun-fill"></i>'
    : '<i class="bi bi-moon-fill"></i>';
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode",
  );
}

let isDarkMode = false;

try {
  isDarkMode = localStorage.getItem("taskflow_theme") === "dark";
} catch (error) {
  console.warn("Theme preference could not be loaded.");
}

applyTheme(isDarkMode);

themeToggle.addEventListener("click", () => {
  isDarkMode = !isDarkMode;
  applyTheme(isDarkMode);

  try {
    localStorage.setItem("taskflow_theme", isDarkMode ? "dark" : "light");
  } catch (error) {
    console.warn("Theme preference could not be saved.");
  }
});

renderTasks();
