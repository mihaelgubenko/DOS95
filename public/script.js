// DOS95 - Client Side Script
let allowInternalNavigation = false;

class DOSTerminal {
    constructor() {
        this.output = document.getElementById('output');
        this.input = document.getElementById('command-input');
        this.prompt = document.getElementById('prompt');
        this.terminal = document.getElementById('terminal');
        this.statusMode = document.getElementById('status-mode');
        this.statusTime = document.getElementById('status-time');
        
        // Проверить, что все элементы найдены (для совместимости с Win95)
        if (!this.output || !this.input) {
            console.log('DOS Terminal elements not found, skipping initialization');
            return;
        }
        
        this.currentDir = 'C:\\';
        this.sessionId = this.generateSessionId();
        this.commandHistory = [];
        this.historyIndex = -1;
        this.doctorMode = false;

        this.init();
    }

    init() {
        // Обработчик ввода команд
        this.input.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Фокус на input при клике на терминал
        this.output.addEventListener('click', () => this.input.focus());
        
        // Обновление времени
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);

        // Автофокус
        this.input.focus();
    }

    generateSessionId() {
        const id = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2, 11);
        return 'session_' + id;
    }

    updateTime() {
        if (!this.statusTime) return; // Защита от null
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ru-RU');
        const dateStr = now.toLocaleDateString('ru-RU');
        this.statusTime.textContent = `${dateStr} ${timeStr}`;
    }

    async handleKeyPress(e) {
        // Enter - выполнить команду
        if (e.key === 'Enter') {
            e.preventDefault();
            const command = this.input.value.trim();
            
            if (command) {
                this.commandHistory.push(command);
                this.historyIndex = this.commandHistory.length;
                await this.executeCommand(command);
            } else {
                this.appendToOutput(`${this.currentDir}> \n`);
            }
            
            this.input.value = '';
        }
        
        // Стрелка вверх - предыдущая команда
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.commandHistory[this.historyIndex];
            }
        }
        
        // Стрелка вниз - следующая команда
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.input.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.input.value = '';
            }
        }

        // Tab - автодополнение (пока просто игнорируем)
        else if (e.key === 'Tab') {
            e.preventDefault();
        }
    }

    async executeCommand(command) {
        // Показать команду в выводе
        this.appendToOutput(`${this.currentDir}> ${command}\n`, 'command-line');

        // Специальная обработка CLS
        if (command.toUpperCase() === 'CLS' || command.toUpperCase() === 'CLEAR') {
            this.clearScreen();
            return;
        }

        let response;
        try {
            response = await window.dos95Api.fetch('/api/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: command,
                    sessionId: this.sessionId
                })
            });
        } catch (error) {
            this.appendToOutput(`Ошибка связи с сервером: ${error.message}\n`, 'error-output');
            this.scrollToBottom();
            return;
        }

        let result;
        try {
            result = await response.json();
        } catch {
            this.appendToOutput(`Сервер вернул некорректный ответ (HTTP ${response.status}).\n`, 'error-output');
            this.scrollToBottom();
            return;
        }

        if (!response.ok || !result.success) {
            this.appendToOutput(
                result.output || result.message || `Ошибка сервера (HTTP ${response.status}).\n`,
                'error-output'
            );
            this.scrollToBottom();
            return;
        }

        try {
            if (result.output) this.appendToOutput(result.output, 'command-output');

            if (result.currentDir) {
                this.currentDir = result.currentDir;
                this.updatePrompt();
            }

            if (result.doctorMode !== undefined) this.setDoctorMode(result.doctorMode);
            if (result.openWindow) {
                allowInternalNavigation = true;
                window.location.assign(result.openWindow);
            }
        } catch (error) {
            console.error('Terminal rendering error:', error);
            this.appendToOutput('Ошибка интерфейса терминала. Обновите страницу.\n', 'error-output');
        }

        // Прокрутить вниз
        this.scrollToBottom();
    }

    appendToOutput(text, className = '') {
        const div = document.createElement('div');
        div.className = className;
        div.textContent = text;
        this.output.appendChild(div);
    }

    clearScreen() {
        this.output.innerHTML = '';
    }

    updatePrompt() {
        if (this.prompt) this.prompt.textContent = `${this.currentDir}>`;
    }

    setDoctorMode(enabled) {
        this.doctorMode = enabled;
        if (this.terminal) this.terminal.classList.toggle('doctor-mode', enabled);
        if (this.statusMode) this.statusMode.textContent = enabled ? 'Mode: DOCTOR' : 'Mode: NORMAL';

        if (enabled) {
            if (this.prompt) this.prompt.textContent = 'YOU>';
        } else {
            this.updatePrompt();
        }
    }

    scrollToBottom() {
        this.output.scrollTop = this.output.scrollHeight;
    }
}

// Инициализация терминала при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const terminal = new DOSTerminal();
    
    // Глобальный доступ для отладки
    window.dosTerminal = terminal;
});

// Предотвратить случайное закрытие страницы
window.addEventListener('beforeunload', (e) => {
    if (allowInternalNavigation) return;
    e.preventDefault();
    e.returnValue = '';
});

