class TodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('todoTasks')) || [];
        this.initializeApp();
    }

    initializeApp() {
        this.cacheDOM();
        this.bindEvents();
        this.renderTasks();
        this.setupTheme();
        this.updateStats();
        this.initPomodoroTimer();
    }

    cacheDOM() {
        // Task Form Elements
        this.taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
        this.taskForm = document.getElementById('task-form');
        this.taskIdInput = document.getElementById('task-id');
        this.taskTitleInput = document.getElementById('task-title');
        this.taskDescInput = document.getElementById('task-description');
        this.taskDueDateInput = document.getElementById('task-due-date');
        this.taskPriorityInput = document.getElementById('task-priority');
        this.taskCategoryInput = document.getElementById('task-category');

        // Container and Buttons
        this.tasksContainer = document.getElementById('tasks-container');
        this.addTaskBtn = document.getElementById('add-task-btn');
        this.saveTaskBtn = document.getElementById('save-task-btn');
        this.searchInput = document.getElementById('search-tasks');
        this.priorityFilter = document.getElementById('filter-priority');
        this.themeToggleBtn = document.getElementById('theme-toggle');

        // Sidebar Filters
        this.filterButtons = {
            all: document.getElementById('btn-all-tasks'),
            active: document.getElementById('btn-active-tasks'),
            completed: document.getElementById('btn-completed-tasks'),
            overdue: document.getElementById('btn-overdue-tasks')
        };

        // Stats Elements
        this.statsElements = {
            total: document.getElementById('total-tasks'),
            completed: document.getElementById('completed-tasks'),
            overdue: document.getElementById('overdue-tasks')
        };
    }

    bindEvents() {
        // Task Management Events
        this.addTaskBtn.addEventListener('click', () => this.openTaskModal());
        this.saveTaskBtn.addEventListener('click', () => this.saveTask());
        this.tasksContainer.addEventListener('click', this.handleTaskActions.bind(this));

        // Filtering and Searching
        this.searchInput.addEventListener('input', () => this.renderTasks());
        this.priorityFilter.addEventListener('change', () => this.renderTasks());

        // Sidebar Filters
        Object.entries(this.filterButtons).forEach(([filter, button]) => {
            button.addEventListener('click', () => this.renderTasks(filter));
        });

        // Theme Toggle
        this.themeToggleBtn.addEventListener('click', this.toggleTheme.bind(this));

        // Export/Import Setup
        this.setupExportImport();
    }

    openTaskModal(task = null) {
        // Reset form
        this.taskIdInput.value = '';
        this.taskTitleInput.value = '';
        this.taskDescInput.value = '';
        this.taskDueDateInput.value = '';
        this.taskPriorityInput.value = 'low';
        this.taskCategoryInput.value = '';

        // If editing an existing task
        if (task) {
            this.taskIdInput.value = task.id;
            this.taskTitleInput.value = task.title;
            this.taskDescInput.value = task.description || '';
            this.taskDueDateInput.value = task.dueDate || '';
            this.taskPriorityInput.value = task.priority || 'low';
            this.taskCategoryInput.value = task.category || '';
        }

        this.taskModal.show();
    }

    saveTask() {
        const task = {
            id: this.taskIdInput.value || Date.now().toString(),
            title: this.taskTitleInput.value,
            description: this.taskDescInput.value,
            dueDate: this.taskDueDateInput.value,
            priority: this.taskPriorityInput.value,
            category: this.taskCategoryInput.value,
            completed: false,
            createdAt: new Date().toISOString()
        };

        const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
            this.tasks[index] = task;
        } else {
            this.tasks.push(task);
        }

        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.taskModal.hide();
    }

    handleTaskActions(event) {
        const editBtn = event.target.closest('.edit-task');
        const completeBtn = event.target.closest('.toggle-complete');
        const deleteBtn = event.target.closest('.delete-task');

        if (editBtn) {
            const taskId = editBtn.dataset.id;
            const task = this.tasks.find(t => t.id === taskId);
            this.openTaskModal(task);
        }

        if (completeBtn) {
            const taskId = completeBtn.dataset.id;
            this.toggleTaskCompletion(taskId);
        }

        if (deleteBtn) {
            const taskId = deleteBtn.dataset.id;
            this.deleteTask(taskId);
        }
    }

    renderTasks(filter = 'all') {
        this.tasksContainer.innerHTML = '';

        const searchTerm = this.searchInput.value.toLowerCase();
        const priorityFilter = this.priorityFilter.value;

        const filteredTasks = this.tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm) || 
                                  (task.description || '').toLowerCase().includes(searchTerm);
            const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;
            
            let matchesFilter = true;
            switch(filter) {
                case 'active':
                    matchesFilter = !task.completed;
                    break;
                case 'completed':
                    matchesFilter = task.completed;
                    break;
                case 'overdue':
                    matchesFilter = this.isTaskOverdue(task) && !task.completed;
                    break;
            }

            return matchesSearch && matchesPriority && matchesFilter;
        }).sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));

        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            this.tasksContainer.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const card = document.createElement('div');
        card.className = `col-md-4 task-card ${this.getTaskClasses(task)}`;
        card.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${task.title}</h5>
                    <p class="card-text">${task.description || 'No description'}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </small>
                        <span class="badge bg-${this.getPriorityBadge(task.priority)}">${task.priority} Priority</span>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-sm btn-outline-primary edit-task" data-id="${task.id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success toggle-complete" data-id="${task.id}">
                            ${task.completed ? 'Undo' : 'Complete'}
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-task" data-id="${task.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    toggleTaskCompletion(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.playCompletionSound();
        }
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }

    saveTasks() {
        localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
    }

    updateStats() {
        this.statsElements.total.textContent = this.tasks.length;
        this.statsElements.completed.textContent = this.tasks.filter(t => t.completed).length;
        this.statsElements.overdue.textContent = this.tasks.filter(t => this.isTaskOverdue(t) && !t.completed).length;
    }

    isTaskOverdue(task) {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        return dueDate < today && !task.completed;
    }

    getTaskClasses(task) {
        let classes = [];
        if (this.isTaskOverdue(task) && !task.completed) {
            classes.push('task-overdue');
        }
        classes.push(`task-priority-${task.priority}`);
        if (task.completed) {
            classes.push('task-completed');
        }
        return classes.join(' ');
    }

    getPriorityBadge(priority) {
        switch(priority) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'secondary';
        }
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('appTheme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.themeToggleBtn.innerHTML = '<i class="bi bi-sun"></i> Light Mode';
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('appTheme', 'dark');
            this.themeToggleBtn.innerHTML = '<i class="bi bi-sun"></i> Light Mode';
        } else {
            localStorage.setItem('appTheme', 'light');
            this.themeToggleBtn.innerHTML = '<i class="bi bi-moon"></i> Dark Mode';
        }
    }

    playCompletionSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('Could not play completion sound:', error);
        }
    }

    initPomodoroTimer() {
        const pomodoroModal = `
            <div class="modal fade" id="pomodoroModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Pomodoro Timer</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <h2 id="timer-display">25:00</h2>
                            <div class="btn-group">
                                <button id="start-timer" class="btn btn-success">Start</button>
                                <button id="pause-timer" class="btn btn-warning">Pause</button>
                                <button id="reset-timer" class="btn btn-danger">Reset</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        document.body.insertAdjacentHTML('beforeend', pomodoroModal);

        const timerDisplay = document.getElementById('timer-display');
        const startBtn = document.getElementById('start-timer');
        const pauseBtn = document.getElementById('pause-timer');
        const resetBtn = document.getElementById('reset-timer');

        let timer;
        let timeLeft = 25 * 60;
        let isRunning = false;

        function updateDisplay() {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        startBtn.addEventListener('click', () => {
            if (!isRunning) {
                isRunning = true;
                timer = setInterval(() => {
                    timeLeft--;
                    updateDisplay();

                    if (timeLeft <= 0) {
                        clearInterval(timer);
                        isRunning = false;
                        alert('Pomodoro session completed!');
                    }
                }, 1000);
            }
        });

        pauseBtn.addEventListener('click', () => {
            if (isRunning) {
                clearInterval(timer);
                isRunning = false;
            }
        });

        resetBtn.addEventListener('click', () => {
            clearInterval(timer);
            isRunning = false;
            timeLeft = 25 * 60;
            updateDisplay();
        });
    }

    setupExportImport() {
        // Export functionality
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-outline-secondary me-2';
        exportBtn.innerHTML = '<i class="bi bi-download"></i> Export Tasks';
        exportBtn.addEventListener('click', () => this.exportTasks());

        // Import input
        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.json';
        importInput.style.display = 'none';
        importInput.addEventListener('change', (e) => this.importTasks(e));

        // Import button
        const importBtn = document.createElement('button');
        importBtn.className = 'btn btn-outline-secondary';
        importBtn.innerHTML = '<i class="bi bi-upload"></i> Import Tasks';
        importBtn.addEventListener('click', () => importInput.click());

        // Add to toolbar
        const toolbar = document.querySelector('.btn-toolbar');
        toolbar.appendChild(exportBtn);
        toolbar.appendChild(importBtn);
        toolbar.appendChild(importInput);
    }

    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileName = `todo-export-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
    }

    importTasks(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTasks = JSON.parse(e.target.result);
                
                if (Array.isArray(importedTasks)) {
                    // Merge imported tasks, avoiding duplicates
                    const mergedTasks = [...this.tasks];
                    
                    importedTasks.forEach(importedTask => {
                        const existingTaskIndex = mergedTasks.findIndex(t => t.id === importedTask.id);
                        if (existingTaskIndex === -1) {
                            mergedTasks.push(importedTask);
                        }
                    });

                    this.tasks = mergedTasks;
                    this.saveTasks();
                    this.renderTasks();
                    this.updateStats();
                    
                    alert('Tasks imported successfully!');
                } else {
                    throw new Error('Invalid task format');
                }
            } catch (error) {
                console.error('Error importing tasks:', error);
                alert('Failed to import tasks. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }
}

// Application Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Prevent form submission
    const form = document.getElementById('task-form');
    form.addEventListener('submit', (e) => e.preventDefault());

    // Initialize the Todo App
    const todoApp = new TodoApp();

    // Pomodoro Timer Modal Trigger
    const pomodoroModalTrigger = document.createElement('button');
    pomodoroModalTrigger.className = 'btn btn-outline-secondary ms-2';
    pomodoroModalTrigger.innerHTML = '<i class="bi bi-clock"></i> Pomodoro Timer';
    pomodoroModalTrigger.setAttribute('data-bs-toggle', 'modal');
    pomodoroModalTrigger.setAttribute('data-bs-target', '#pomodoroModal');

    // Add Pomodoro Timer button to toolbar
    const toolbar = document.querySelector('.btn-toolbar');
    toolbar.appendChild(pomodoroModalTrigger);
});