// File Explorer для Windows 95
// Графический интерфейс для виртуальной файловой системы

class FileExplorer {
    constructor(windowId) {
        this.windowId = windowId;
        this.currentPath = 'C:\\';
        this.sessionId = window.dosTerminal ? window.dosTerminal.sessionId : 'explorer_' + Date.now();
    }

    async init() {
        const windowElement = document.getElementById(this.windowId);
        if (!windowElement) return;

        const content = windowElement.querySelector('.win95-window-content');
        content.innerHTML = this.getExplorerHTML();
        
        this.attachEventListeners();
        await this.loadDirectory();
    }

    getExplorerHTML() {
        return `
            <div class="explorer-container" style="display: flex; flex-direction: column; height: 100%; background: var(--win95-gray);">
                <!-- Toolbar -->
                <div class="explorer-toolbar" style="padding: 4px; border-bottom: 1px solid var(--win95-dark-gray); display: flex; gap: 4px;">
                    <button class="win95-button" id="explorer-back" style="padding: 2px 8px; min-width: auto;">◄</button>
                    <button class="win95-button" id="explorer-up" style="padding: 2px 8px; min-width: auto;">▲</button>
                    <div class="win95-inset-panel" style="flex: 1; padding: 2px 4px; display: flex; align-items: center;">
                        <span>📂</span>
                        <span id="explorer-path" style="margin-left: 4px;">C:\\</span>
                    </div>
                    <button class="win95-button" id="explorer-refresh" style="padding: 2px 8px; min-width: auto;">🔄</button>
                    <button class="win95-button" id="explorer-new-file" style="padding: 2px 8px; min-width: auto;">📄 Файл</button>
                    <button class="win95-button" id="explorer-new-folder" style="padding: 2px 8px; min-width: auto;">📁 Папка</button>
                </div>

                <!-- File List -->
                <div class="explorer-content" style="flex: 1; padding: 4px; overflow: auto;">
                    <div class="win95-inset-panel" style="height: 100%; background: white; padding: 8px;">
                        <table id="explorer-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead>
                                <tr style="background: var(--win95-gray); border-bottom: 1px solid var(--win95-dark-gray);">
                                    <th style="text-align: left; padding: 4px;">Имя</th>
                                    <th style="text-align: left; padding: 4px;">Размер</th>
                                    <th style="text-align: left; padding: 4px;">Тип</th>
                                </tr>
                            </thead>
                            <tbody id="explorer-files">
                                <tr><td colspan="3" style="text-align: center; padding: 20px;">Загрузка...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Status Bar -->
                <div class="explorer-statusbar" style="padding: 4px 8px; border-top: 2px solid white; background: var(--win95-gray); font-size: 11px;">
                    <span id="explorer-status">Готово</span>
                </div>
                
                <!-- Context Menu -->
                <div id="explorer-context-menu" style="display: none; position: fixed; background: var(--win95-gray); border: 2px outset var(--win95-gray); box-shadow: 2px 2px 4px rgba(0,0,0,0.3); z-index: 10000;">
                    <div class="context-menu-item" data-action="open" style="padding: 4px 20px; cursor: pointer;">Открыть</div>
                    <div class="context-menu-item" data-action="rename" style="padding: 4px 20px; cursor: pointer;">Переименовать</div>
                    <div class="context-menu-item" data-action="copy" style="padding: 4px 20px; cursor: pointer;">Копировать</div>
                    <div class="context-menu-item" data-action="delete" style="padding: 4px 20px; cursor: pointer;">Удалить</div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Back button
        document.getElementById('explorer-back')?.addEventListener('click', () => {
            this.goUp();
        });

        // Up button
        document.getElementById('explorer-up')?.addEventListener('click', () => {
            this.goUp();
        });

        // Refresh button
        document.getElementById('explorer-refresh')?.addEventListener('click', () => {
            this.loadDirectory();
        });
    }

    async loadDirectory() {
        try {
            // Используем команду DIR для получения списка файлов
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: 'DIR',
                    sessionId: this.sessionId
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentPath = result.currentDir;
                this.updatePathDisplay();
                this.parseAndDisplayFiles(result.output);
            }
        } catch (error) {
            this.showStatus('Ошибка загрузки файлов');
        }
    }

    parseAndDisplayFiles(dirOutput) {
        const tbody = document.getElementById('explorer-files');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Парсим вывод команды DIR
        const lines = dirOutput.split('\n');
        const items = [];

        for (const line of lines) {
            // Формат: дата время <DIR>/размер имя
            const match = line.match(/^\s*\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+(?:<DIR>|(\d+))\s+(.+)$/);
            if (match) {
                const size = match[1] || '<DIR>';
                const name = match[2]?.trim();
                if (name) {
                    items.push({ name, size, isDir: size === '<DIR>' });
                }
            }
        }

        // Отображаем файлы
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">Папка пуста</td></tr>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.className = 'explorer-row';

            // Hover effect
            row.addEventListener('mouseenter', () => {
                row.style.background = 'var(--win95-highlight)';
                row.style.color = 'var(--win95-highlight-text)';
            });
            row.addEventListener('mouseleave', () => {
                row.style.background = '';
                row.style.color = '';
            });

            // Double click to open
            row.addEventListener('dblclick', () => {
                if (item.isDir) {
                    this.openDirectory(item.name);
                } else {
                    this.openFile(item.name);
                }
            });

            const icon = item.isDir ? '📁' : '📄';
            const type = item.isDir ? 'Папка' : 'Файл';

            row.innerHTML = `
                <td style="padding: 4px;">${icon} ${item.name}</td>
                <td style="padding: 4px;">${item.isDir ? '' : item.size + ' б'}</td>
                <td style="padding: 4px;">${type}</td>
            `;

            tbody.appendChild(row);
        });

        this.showStatus(`Объектов: ${items.length}`);
    }

    async openDirectory(dirName) {
        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: `CD ${dirName}`,
                    sessionId: this.sessionId
                })
            });

            const result = await response.json();
            if (result.success) {
                await this.loadDirectory();
            }
        } catch (error) {
            this.showStatus('Ошибка открытия папки');
        }
    }

    async openFile(fileName) {
        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: `TYPE ${fileName}`,
                    sessionId: this.sessionId
                })
            });

            const result = await response.json();
            if (result.success && result.output) {
                this.showFileContent(fileName, result.output);
            }
        } catch (error) {
            this.showStatus('Ошибка открытия файла');
        }
    }

    showFileContent(fileName, content) {
        // Создаём окно с содержимым файла
        const win = win95Manager.createWindow(
            'file-' + Date.now(),
            fileName,
            '📄',
            500,
            400
        );

        win.querySelector('.win95-window-content').innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column;">
                <div class="win95-inset-panel" style="flex: 1; overflow: auto; margin: 4px; background: white;">
                    <pre style="margin: 8px; font-family: 'Courier New', monospace; font-size: 11px; white-space: pre-wrap;">${content}</pre>
                </div>
                <div style="padding: 4px; text-align: center;">
                    <button class="win95-button" onclick="win95Manager.handleWindowAction('${win.id}', 'close')">Закрыть</button>
                </div>
            </div>
        `;
    }

    async goUp() {
        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: 'CD ..',
                    sessionId: this.sessionId
                })
            });

            const result = await response.json();
            if (result.success) {
                await this.loadDirectory();
            }
        } catch (error) {
            this.showStatus('Ошибка навигации');
        }
    }

    updatePathDisplay() {
        const pathElement = document.getElementById('explorer-path');
        if (pathElement) {
            pathElement.textContent = this.currentPath;
        }

        // Обновляем заголовок окна
        const windowElement = document.getElementById(this.windowId);
        if (windowElement) {
            const titleText = windowElement.querySelector('.win95-title-bar-text');
            if (titleText) {
                titleText.textContent = `Проводник - ${this.currentPath}`;
            }
        }
    }

    showStatus(message) {
        const statusElement = document.getElementById('explorer-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
}

// Global function to create and open explorer
window.openFileExplorer = function() {
    const windowId = 'explorer-window-' + Date.now();
    const win = win95Manager.createWindow(
        windowId,
        'Проводник - C:\\',
        '📂',
        600,
        450
    );

    const explorer = new FileExplorer(windowId);
    explorer.init();
};

