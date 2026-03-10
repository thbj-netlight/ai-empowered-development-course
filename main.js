import { VibeKanbanWebCompanion } from 'vibe-kanban-web-companion';
import { format, parse, isToday, isTomorrow, isPast, compareAsc } from 'date-fns';

// Todos array (Feature 1)
let todos = [];
let nextId = 1;
let sortByDueDate = false;

const STORAGE_KEY = 'todos';

function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ todos, nextId }));
}

function loadTodos() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        todos = parsed.todos;
        nextId = parsed.nextId;
    }
}

// Current filter (Feature 2)
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    init();
    initVibeKanban();
});

function init() {
    // Wire up add button
    const addBtn = document.getElementById('addBtn');
    const todoInput = document.getElementById('todoInput');

    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    // Wire up filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    // Wire up sort by due date button
    document.getElementById('sortDueDateBtn').addEventListener('click', toggleSortByDueDate);

    loadTodos();
    renderTodos();
}

function initVibeKanban() {
    const companion = new VibeKanbanWebCompanion();
    companion.render(document.body);
}

// Feature 1: Add, toggle, delete todos
function addTodo() {
    const input = document.getElementById('todoInput');
    const dueDateInput = document.getElementById('dueDateInput');
    const text = input.value.trim();

    if (text === '') return;

    // parse "yyyy-MM-dd" as local time to avoid UTC midnight timezone shift
    const dueDateStr = dueDateInput.value;
    const dueDate = dueDateStr
        ? parse(dueDateStr, 'yyyy-MM-dd', new Date()).toISOString()
        : null;

    todos.push({
        id: nextId++,
        text: text,
        completed: false,
        dueDate: dueDate
    });

    input.value = '';
    dueDateInput.value = '';
    saveTodos();
    renderTodos();
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
}

// Feature 1: Render todos
function renderTodos() {
    const todoList = document.getElementById('todoList');
    const filteredTodos = getFilteredTodos();

    todoList.innerHTML = '';

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        if (todo.completed) li.classList.add('completed');

        const dueDateHtml = todo.dueDate ? buildDueDateHtml(todo.dueDate) : '';

        li.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            ${dueDateHtml}
            <button class="todo-delete">Delete</button>
        `;

        li.querySelector('.todo-checkbox').addEventListener('change', () => toggleTodo(todo.id));
        li.querySelector('.todo-delete').addEventListener('click', () => deleteTodo(todo.id));

        todoList.appendChild(li);
    });
}

function buildDueDateHtml(dueDateIso) {
    const date = new Date(dueDateIso);
    let label;
    let cssClass = 'due-date';

    if (isToday(date)) {
        label = 'Due today';
        cssClass += ' due-today';
    } else if (isTomorrow(date)) {
        label = 'Due tomorrow';
        cssClass += ' due-soon';
    } else if (isPast(date)) {
        label = `Overdue \u00b7 ${format(date, 'MMM d, yyyy')}`;
        cssClass += ' due-overdue';
    } else {
        label = `Due ${format(date, 'MMM d, yyyy')}`;
    }

    return `<span class="${cssClass}">${label}</span>`;
}

// Feature 2: Filter todos based on current filter
function getFilteredTodos() {
    let result;
    if (currentFilter === 'active') {
        result = todos.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        result = todos.filter(t => t.completed);
    } else {
        result = [...todos];
    }

    if (sortByDueDate) {
        result.sort((a, b) => {
            // Todos without a due date go to the end
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return compareAsc(new Date(a.dueDate), new Date(b.dueDate));
        });
    }

    return result;
}

function toggleSortByDueDate() {
    sortByDueDate = !sortByDueDate;
    const btn = document.getElementById('sortDueDateBtn');
    btn.classList.toggle('active', sortByDueDate);
    renderTodos();
}

// Feature 2: Set filter and update UI
function setFilter(filter) {
    currentFilter = filter;

    // Update button styling
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    renderTodos();
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
