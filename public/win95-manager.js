// Windows 95 Window Manager
// Управление окнами, меню Пуск, панелью задач

class Win95Manager {
    constructor() {
        this.windows = new Map();
        this.activeWindow = null;
        this.zIndexCounter = 1000;
        this.startMenuOpen = false;
        
        this.init();
    }

    init() {
        // Initialize clock
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);

        // Start button
        const startButton = document.getElementById('start-button');
        const startMenu = document.getElementById('start-menu');
        
        startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleStartMenu();
        });

        // Close start menu on click outside
        document.addEventListener('click', (e) => {
            if (this.startMenuOpen && !startMenu.contains(e.target)) {
                this.closeStartMenu();
            }
        });

        // Start menu items
        document.querySelectorAll('.win95-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleMenuAction(action);
            });
        });

        // Desktop icons
        document.querySelectorAll('.win95-desktop-icon').forEach(icon => {
            icon.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const action = icon.dataset.action;
                if (action) {
                    this.handleMenuAction(action);
                }
            });
            
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectIcon(icon);
            });
        });

        // Deselect icons on desktop click
        document.getElementById('desktop').addEventListener('click', () => {
            this.deselectAllIcons();
        });

        // Initialize existing windows
        document.querySelectorAll('.win95-window').forEach(win => {
            this.initWindow(win);
        });
    }

    // ===== START MENU =====
    toggleStartMenu() {
        const startMenu = document.getElementById('start-menu');
        const startButton = document.getElementById('start-button');
        
        if (this.startMenuOpen) {
            this.closeStartMenu();
        } else {
            startMenu.classList.add('show');
            startButton.classList.add('active');
            this.startMenuOpen = true;
        }
    }

    closeStartMenu() {
        const startMenu = document.getElementById('start-menu');
        const startButton = document.getElementById('start-button');
        
        startMenu.classList.remove('show');
        startButton.classList.remove('active');
        this.startMenuOpen = false;
    }

    handleMenuAction(action) {
        this.closeStartMenu();
        
        switch(action) {
            case 'my-computer':
                this.createMyComputerWindow();
                break;
            case 'open-terminal':
                this.openWindow('terminal-window');
                break;
            case 'open-explorer':
                this.createExplorerWindow();
                break;
            case 'open-doctor':
                this.createDoctorWindow();
                break;
            case 'open-about':
                this.createAboutWindow();
                break;
            case 'shutdown':
                this.shutdown();
                break;
        }
    }

    // ===== WINDOW MANAGEMENT =====
    initWindow(windowElement, { dynamic = false } = {}) {
        const windowId = windowElement.id;
        
        const windowData = {
            element: windowElement,
            dynamic,
            minimized: false,
            maximized: false,
            originalPosition: {
                top: windowElement.style.top,
                left: windowElement.style.left,
                width: windowElement.style.width,
                height: windowElement.style.height
            }
        };
        
        this.windows.set(windowId, windowData);

        if (windowElement.classList.contains('active')) {
            windowElement.style.zIndex = ++this.zIndexCounter;
            this.activeWindow = windowId;
        }
        
        // Title bar buttons
        const buttons = windowElement.querySelectorAll('.win95-title-bar-button');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleWindowAction(windowId, action);
            });
        });
        
        // Make window draggable
        const titleBar = windowElement.querySelector('.win95-title-bar');
        this.makeDraggable(windowElement, titleBar);
        
        // Make window resizable
        const resizeHandle = windowElement.querySelector('.win95-resize-handle');
        if (resizeHandle) {
            this.makeResizable(windowElement, resizeHandle);
        }
        
        // Window click to focus
        windowElement.addEventListener('mousedown', () => {
            this.focusWindow(windowId);
        });
        
        // Update taskbar
        this.updateTaskbar();
    }

    openWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        const win = windowData.element;
        
        if (windowData.minimized) {
            win.classList.remove('minimized');
            windowData.minimized = false;
        }
        if (win.style.display === 'none') win.style.removeProperty('display');
        
        this.focusWindow(windowId);
        this.updateTaskbar();
    }

    focusWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData || windowData.minimized || windowData.element.style.display === 'none') return;

        // Remove active class from all windows while preserving their stacking order.
        document.querySelectorAll('.win95-window').forEach(w => w.classList.remove('active'));
        
        // Set as active
        windowData.element.classList.add('active');
        windowData.element.style.zIndex = ++this.zIndexCounter;
        this.activeWindow = windowId;
        
        // Update taskbar
        this.updateTaskbar();
    }

    focusTopVisibleWindow(excludedWindowId = null) {
        let nextWindowId = null;
        let highestZIndex = -Infinity;

        this.windows.forEach((data, windowId) => {
            if (windowId === excludedWindowId || data.minimized || data.element.style.display === 'none' || !data.element.isConnected) return;
            const zIndex = Number.parseInt(data.element.style.zIndex, 10) || 1000;
            if (zIndex > highestZIndex) {
                highestZIndex = zIndex;
                nextWindowId = windowId;
            }
        });

        if (nextWindowId) {
            this.focusWindow(nextWindowId);
        } else {
            this.activeWindow = null;
            this.updateTaskbar();
        }
    }

    handleWindowAction(windowId, action) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;
        
        const win = windowData.element;
        
        switch(action) {
            case 'minimize':
                win.classList.add('minimized');
                windowData.minimized = true;
                win.classList.remove('active');
                if (this.activeWindow === windowId) {
                    this.activeWindow = null;
                    this.focusTopVisibleWindow(windowId);
                } else {
                    this.updateTaskbar();
                }
                break;
                
            case 'maximize':
                if (windowData.maximized) {
                    // Restore
                    win.classList.remove('maximized');
                    win.style.top = windowData.originalPosition.top;
                    win.style.left = windowData.originalPosition.left;
                    win.style.width = windowData.originalPosition.width;
                    win.style.height = windowData.originalPosition.height;
                    windowData.maximized = false;
                } else {
                    // Maximize
                    windowData.originalPosition = {
                        top: win.style.top,
                        left: win.style.left,
                        width: win.style.width,
                        height: win.style.height
                    };
                    win.classList.add('maximized');
                    windowData.maximized = true;
                }
                break;
                
            case 'close':
                win.classList.remove('active');
                if (windowData.dynamic) {
                    win.remove();
                    this.windows.delete(windowId);
                } else {
                    win.style.display = 'none';
                }
                if (this.activeWindow === windowId) {
                    this.activeWindow = null;
                    this.focusTopVisibleWindow(windowId);
                } else {
                    this.updateTaskbar();
                }
                break;
        }
    }

    // ===== DRAGGING =====
    makeDraggable(windowElement, handle) {
        let isDragging = false;
        let offsetX, offsetY;

        handle.addEventListener('mousedown', (e) => {
            const windowData = this.windows.get(windowElement.id);
            if (windowData && windowData.maximized) return;
            
            if (e.target === handle || handle.contains(e.target)) {
                isDragging = true;
                
                // Получаем текущую позицию окна
                const rect = windowElement.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            
            // Ограничения: не выходить за пределы экрана
            const maxX = window.innerWidth - windowElement.offsetWidth;
            const maxY = window.innerHeight - 28 - windowElement.offsetHeight; // 28px для панели задач
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            windowElement.style.left = newX + 'px';
            windowElement.style.top = newY + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // ===== RESIZING =====
    makeResizable(windowElement, handle) {
        let isResizing = false;
        let startWidth, startHeight;
        let startX, startY;

        handle.addEventListener('mousedown', (e) => {
            const windowData = this.windows.get(windowElement.id);
            if (windowData && windowData.maximized) return;
            
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(getComputedStyle(windowElement).width, 10);
            startHeight = parseInt(getComputedStyle(windowElement).height, 10);
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            e.preventDefault();
            
            const newWidth = startWidth + (e.clientX - startX);
            const newHeight = startHeight + (e.clientY - startY);
            
            // Минимальные размеры
            if (newWidth >= 200) {
                windowElement.style.width = newWidth + 'px';
            }
            if (newHeight >= 150) {
                windowElement.style.height = newHeight + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
            }
        });
    }

    // ===== TASKBAR =====
    updateTaskbar() {
        const taskbarItems = document.getElementById('taskbar-items');
        taskbarItems.innerHTML = '';
        
        this.windows.forEach((data, windowId) => {
            const win = data.element;
            if (win.style.display === 'none') return;
            
            const titleText = win.querySelector('.win95-title-bar-text').textContent;
            const icon = win.querySelector('.win95-title-bar-icon').textContent;
            
            const taskbarItem = document.createElement('div');
            taskbarItem.className = 'win95-taskbar-item';
            if (!data.minimized && windowId === this.activeWindow) {
                taskbarItem.classList.add('active');
            }
            taskbarItem.dataset.window = windowId;
            
            const iconElement = document.createElement('span');
            iconElement.className = 'win95-taskbar-item-icon';
            iconElement.textContent = icon;
            taskbarItem.append(iconElement, document.createTextNode(titleText));
            
            taskbarItem.addEventListener('click', () => {
                if (data.minimized) {
                    this.openWindow(windowId);
                } else if (windowId === this.activeWindow) {
                    this.handleWindowAction(windowId, 'minimize');
                } else {
                    this.focusWindow(windowId);
                }
            });
            
            taskbarItems.appendChild(taskbarItem);
        });
    }

    // ===== DESKTOP ICONS =====
    selectIcon(icon) {
        this.deselectAllIcons();
        icon.classList.add('selected');
    }

    deselectAllIcons() {
        document.querySelectorAll('.win95-desktop-icon').forEach(icon => {
            icon.classList.remove('selected');
        });
    }

    // ===== CLOCK =====
    updateClock() {
        const clock = document.getElementById('clock');
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clock.textContent = `${hours}:${minutes}`;
    }

    // ===== CREATE WINDOWS =====
    createMyComputerWindow() {
        const win = this.createWindow('my-computer-window', 'Мой компьютер', '💻', 600, 450);
        
        win.querySelector('.win95-window-content').innerHTML = `
            <div style="height: 100%; background: white; padding: 16px; overflow: auto;">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, 100px); gap: 20px; justify-content: start;">
                    
                    <!-- Диск C:\ -->
                    <div class="my-computer-item" data-path="C:\\" style="text-align: center; cursor: pointer; padding: 10px; border-radius: 4px;">
                        <div style="font-size: 48px; margin-bottom: 8px;">💾</div>
                        <div style="font-size: 11px; font-family: 'MS Sans Serif', sans-serif; color: #000;">Диск C:</div>
                    </div>
                    
                    <!-- Системная папка -->
                    <div class="my-computer-item" data-path="C:\\WINDOWS" style="text-align: center; cursor: pointer; padding: 10px; border-radius: 4px;">
                        <div style="font-size: 48px; margin-bottom: 8px;">📁</div>
                        <div style="font-size: 11px; font-family: 'MS Sans Serif', sans-serif; color: #000;">Windows</div>
                    </div>
                    
                    <!-- Временные файлы -->
                    <div class="my-computer-item" data-path="C:\\TEMP" style="text-align: center; cursor: pointer; padding: 10px; border-radius: 4px;">
                        <div style="font-size: 48px; margin-bottom: 8px;">📂</div>
                        <div style="font-size: 11px; font-family: 'MS Sans Serif', sans-serif; color: #000;">Temp</div>
                    </div>
                    
                    <!-- Панель управления -->
                    <div class="my-computer-item" data-action="control-panel" style="text-align: center; cursor: pointer; padding: 10px; border-radius: 4px;">
                        <div style="font-size: 48px; margin-bottom: 8px;">⚙️</div>
                        <div style="font-size: 11px; font-family: 'MS Sans Serif', sans-serif; color: #000;">Панель<br>управления</div>
                    </div>
                    
                </div>
            </div>
        `;
        
        // Добавить обработчики кликов для иконок
        win.querySelectorAll('.my-computer-item[data-path]').forEach(item => {
            // Hover effect
            item.addEventListener('mouseenter', () => {
                item.style.background = '#c0c0c0';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = '';
            });
            
            // Double click to open
            item.addEventListener('dblclick', () => {
                const path = item.dataset.path;
                if (path) {
                    this.openFolderInExplorer(path);
                }
            });
        });
    }
    
    async openFolderInExplorer(path) {
        // Открыть проводник и перейти в указанную папку
        if (typeof window.openEnhancedFileExplorer === 'function') {
            window.openEnhancedFileExplorer();
            
            // Подождать и попытаться сменить директорию
            setTimeout(async () => {
                if (window.currentExplorer) {
                    try {
                        const response = await window.dos95Api.fetch('/api/command', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                command: `CD ${path}`,
                                sessionId: window.currentExplorer.sessionId
                            })
                        });
                        
                        const result = await response.json();
                        if (result.success) {
                            await window.currentExplorer.loadDirectory();
                        }
                    } catch (error) {
                        console.error('Error opening folder:', error);
                    }
                }
            }, 100);
        }
    }
    
    createExplorerWindow() {
        if (typeof window.openEnhancedFileExplorer === 'function') {
            window.openEnhancedFileExplorer();
        } else {
            const win = this.createWindow('explorer-window', 'Проводник - C:\\', '📂', 600, 450);
            win.querySelector('.win95-window-content').innerHTML = `
                <div style="padding: 10px;">
                    <h3>Файловый Проводник</h3>
                    <p>Виртуальная файловая система DOS95</p>
                    <p>Загрузка...</p>
                </div>
            `;
        }
    }

    createDoctorWindow() {
        const existingWindow = this.windows.get('doctor-window');
        if (existingWindow) {
            this.openWindow('doctor-window');
            existingWindow.element.querySelector('[data-role="doctor-input"]')?.focus();
            return;
        }

        const win = this.createWindow('doctor-window', 'ELIZA — собеседник', '🧠', 500, 450);
        
        // Создать уникальный sessionId для этого окна ELIZA
        const uniqueSessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const doctorSessionId = `doctor-session-${uniqueSessionId}`;
        win.dataset.doctorSessionId = doctorSessionId;
        
        win.querySelector('.win95-window-content').innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%; background: var(--win95-gray);">
                <!-- Chat messages -->
                <div class="win95-inset-panel" data-role="doctor-chat" style="flex: 1; overflow-y: auto; margin: 4px; background: white; padding: 8px; font-family: 'MS Sans Serif', sans-serif; font-size: 11px; color: #000000;">
                    <div style="margin-bottom: 10px; padding: 8px; background: #ffffcc; border: 1px solid #ccc; color: #000000;">
                        <strong style="color: #000000;">ELIZA:</strong> Инициализация...
                    </div>
                </div>
                
                <!-- Input area -->
                <div style="padding: 4px; display: flex; gap: 4px;">
                    <input type="text" data-role="doctor-input" placeholder="Введите сообщение..."
                           style="flex: 1; padding: 4px; font-family: 'MS Sans Serif', sans-serif; font-size: 11px; color: #000000;" 
                           class="win95-inset-panel">
                    <button class="win95-button" data-role="doctor-send">Отправить</button>
                </div>
                
                <div style="padding: 4px; font-size: 10px; color: #000000;">
                    Нажмите Enter для отправки
                </div>
            </div>
        `;
        
        const input = win.querySelector('[data-role="doctor-input"]');
        win.querySelector('[data-role="doctor-send"]').addEventListener('click', () => this.sendDoctorMessage(win));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendDoctorMessage(win);
        });
        input.focus();

        // Инициализировать DOCTOR сеанс
        this.initDoctorSession(win, doctorSessionId);
    }
    
    isCurrentDoctorWindow(win, sessionId) {
        return win.isConnected
            && win.dataset.doctorSessionId === sessionId
            && this.windows.get('doctor-window')?.element === win;
    }

    async initDoctorSession(win, sessionId) {
        try {
            // Запустить DOCTOR сеанс
            const response = await window.dos95Api.fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: 'DOCTOR',
                    sessionId: sessionId
                })
            });
            
            const result = await response.json();

            if (!this.isCurrentDoctorWindow(win, sessionId)) return;
            
            // Показать приветствие
            const chat = win.querySelector('[data-role="doctor-chat"]');
            if (chat) {
                let greeting = result.output || 'Здравствуйте. Я виртуальный поддерживающий собеседник.';
                
                // Очистить от служебных элементов
                greeting = greeting.replace(/╔[═]+╗/g, '');
                greeting = greeting.replace(/║[^║]*║/g, '');
                greeting = greeting.replace(/╚[═]+╝/g, '');
                greeting = greeting.replace(/\(Введите QUIT для выхода\)/g, '');
                greeting = greeting.replace(/DOCTOR>/g, '');
                greeting = greeting.trim();
                
                chat.replaceChildren(this.createDoctorMessage('ELIZA:', greeting, false));
            }
        } catch (error) {
            console.error('Error initializing DOCTOR:', error);
        }
    }
    
    async sendDoctorMessage(win) {
        const input = win?.querySelector('[data-role="doctor-input"]');
        const chat = win?.querySelector('[data-role="doctor-chat"]');
        
        if (!input || !chat) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        const sessionId = win.dataset.doctorSessionId;
        if (!this.isCurrentDoctorWindow(win, sessionId)) return;
        
        // Добавить сообщение пользователя
        chat.appendChild(this.createDoctorMessage('ВЫ:', message, true));
        
        input.value = '';
        input.disabled = true;
        
        // Скролл вниз
        chat.scrollTop = chat.scrollHeight;
        
        try {
            // Отправить сообщение через уже запущенный сеанс DOCTOR
            const response = await window.dos95Api.fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: message,
                    sessionId: sessionId
                })
            });
            
            const result = await response.json();

            if (!this.isCurrentDoctorWindow(win, sessionId)) return;
            
            // Добавить ответ ELIZA
            let aiText = result.output || 'Ошибка получения ответа';
            
            // Убрать все служебные элементы
            // Убрать заголовки с рамками
            aiText = aiText.replace(/╔[═]+╗/g, '');
            aiText = aiText.replace(/║[^║]*║/g, '');
            aiText = aiText.replace(/╚[═]+╝/g, '');
            
            // Убрать префиксы DOCTOR>
            aiText = aiText.replace(/^[\s\n]*DOCTOR>\s*/g, '');
            aiText = aiText.replace(/\nDOCTOR>\s*/g, '\n');
            
            // Убрать технические сообщения
            aiText = aiText.replace(/\(Введите QUIT для выхода\)/g, '');
            aiText = aiText.replace(/Классическая версия.*OpenAI.*недоступен.*/g, '');
            
            // Очистить от лишних пробелов и переносов
            aiText = aiText.replace(/\n{3,}/g, '\n\n');
            aiText = aiText.trim();
            
            // Если пустой ответ
            if (!aiText || aiText.length < 3) {
                aiText = 'Расскажите мне больше об этом.';
            }
            
            chat.appendChild(this.createDoctorMessage('ELIZA:', aiText, false));
            
            // Скролл вниз
            chat.scrollTop = chat.scrollHeight;
            
        } catch (error) {
            if (!this.isCurrentDoctorWindow(win, sessionId)) return;
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'margin-bottom: 10px; color: red;';
            errorMsg.textContent = 'Ошибка связи с сервером: ' + error.message;
            chat.appendChild(errorMsg);
        }
        
        if (this.isCurrentDoctorWindow(win, sessionId)) {
            input.disabled = false;
            input.focus();
        }
    }
    
    createDoctorMessage(label, text, fromUser) {
        const row = document.createElement('div');
        row.style.cssText = `margin-bottom: 10px;${fromUser ? ' text-align: right;' : ''}`;

        const bubble = document.createElement('div');
        bubble.style.cssText = `display: inline-block; padding: 8px; background: ${fromUser ? '#e0e0ff' : '#ffffcc'}; border: 1px solid ${fromUser ? '#999' : '#ccc'}; border-radius: 4px; max-width: 80%; word-wrap: break-word; white-space: pre-wrap; color: #000000;`;

        const author = document.createElement('strong');
        author.style.color = '#000000';
        author.textContent = label;
        bubble.append(author, document.createTextNode(` ${text}`));
        row.appendChild(bubble);
        return row;
    }

    createAboutWindow() {
        const win = this.createWindow('about-window', 'О системе', 'ℹ️', 400, 300);
        win.querySelector('.win95-window-content').innerHTML = `
            <div style="padding: 20px; text-align: center; color: #000000;">
                <h2 style="color: #000000;">DOS95</h2>
                <p style="color: #000000;"><strong>Windows 95 Edition</strong></p>
                <p style="color: #000000;">Version 1.1.0</p>
                <hr style="margin: 20px 0; border-color: #808080;">
                <p style="color: #000000;">Виртуальная DOS среда с интерфейсом Windows 95</p>
                <p style="color: #000000;">AI интеграция: защищённая GPT-5.6</p>
                <p style="margin-top: 20px; color: #000000;">© 2025 DOS95 Team</p>
                <button class="win95-button" data-role="about-close" style="margin-top: 20px;">OK</button>
            </div>
        `;
        win.querySelector('[data-role="about-close"]').addEventListener('click', () => {
            this.handleWindowAction('about-window', 'close');
        });
    }

    createWindow(id, title, icon, width, height) {
        const existingWindow = this.windows.get(id);
        if (existingWindow) {
            this.openWindow(id);
            return existingWindow.element;
        }

        const win = document.createElement('div');
        win.className = 'win95-window active';
        win.id = id;
        win.style.width = width + 'px';
        win.style.height = height + 'px';
        win.style.top = (50 + this.windows.size * 30) + 'px';
        win.style.left = (150 + this.windows.size * 30) + 'px';
        
        win.innerHTML = `
            <div class="win95-title-bar">
                <div class="win95-title-bar-icon"></div>
                <div class="win95-title-bar-text"></div>
                <div class="win95-title-bar-buttons">
                    <button class="win95-title-bar-button" data-action="minimize">_</button>
                    <button class="win95-title-bar-button" data-action="maximize">□</button>
                    <button class="win95-title-bar-button" data-action="close">×</button>
                </div>
            </div>
            <div class="win95-window-content"></div>
            <div class="win95-resize-handle"></div>
        `;
        win.querySelector('.win95-title-bar-icon').textContent = icon;
        win.querySelector('.win95-title-bar-text').textContent = title;
        
        // Windows must share the same top-level stacking context as the initial
        // terminal; the desktop itself is a fixed-position stacking context.
        document.body.appendChild(win);
        this.initWindow(win, { dynamic: true });
        this.focusWindow(id);
        
        return win;
    }

    // ===== SHUTDOWN =====
    async shutdown() {
        if (confirm('Завершить работу Windows 95?')) {
            try {
                const runtime = await window.dos95Api.fetch('/api/runtime').then(response => response.json());
                if (runtime.shutdownEnabled) {
                    await window.dos95Api.fetch('/api/shutdown', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: '{}'
                    });
                }
            } catch (error) {
                console.error('Shutdown error:', error);
            }
            document.body.innerHTML = `
                <div style="background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'MS Sans Serif'; flex-direction: column;">
                    <h1 style="font-size: 48px; margin-bottom: 20px;">Windows 95</h1>
                    <p style="font-size: 24px;">Теперь компьютер можно выключить</p>
                    <p style="margin-top: 40px; font-size: 18px; color: #888;">
                        Сервер DOS95 остановлен. Закройте это окно.
                    </p>
                </div>
            `;
        }
    }
}

// Initialize Window Manager
window.win95Manager = new Win95Manager();

