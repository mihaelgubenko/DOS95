// Enhanced File Explorer для Windows 95
// Полный функционал: создание, удаление, редактирование, копирование, переименование

class EnhancedFileExplorer {
    constructor(windowId) {
        this.windowId = windowId;
        this.currentPath = 'C:\\';
        this.sessionId = 'explorer_' + Date.now();
        this.selectedItem = null;
        this.clipboard = null;
        
        // Уникальные ID для элементов этого окна
        this.uniqueId = 'exp_' + Date.now();
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
                <div class="explorer-toolbar" style="padding: 4px; border-bottom: 1px solid var(--win95-dark-gray); display: flex; gap: 4px; flex-wrap: wrap;">
                    <button class="win95-button" id="explorer-back-${this.uniqueId}" title="Назад" style="padding: 2px 8px; min-width: auto;">◄</button>
                    <button class="win95-button" id="explorer-up-${this.uniqueId}" title="Вверх" style="padding: 2px 8px; min-width: auto;">▲</button>
                    <div class="win95-inset-panel" style="flex: 1; padding: 2px 4px; display: flex; align-items: center; min-width: 100px;">
                        <span>📂</span>
                        <span id="explorer-path-${this.uniqueId}" style="margin-left: 4px; color: #000000; font-weight: bold;">C:\\</span>
                    </div>
                    <button class="win95-button" id="explorer-refresh-${this.uniqueId}" title="Обновить" style="padding: 2px 8px; min-width: auto;">🔄</button>
                </div>
                
                <!-- Action Buttons -->
                <div class="explorer-actions" style="padding: 4px; border-bottom: 1px solid var(--win95-dark-gray); display: flex; gap: 4px; flex-wrap: wrap; background: var(--win95-gray);">
                    <button class="win95-button" id="explorer-new-file-${this.uniqueId}" title="Создать файл" style="padding: 4px 8px;">📄 Создать файл</button>
                    <button class="win95-button" id="explorer-new-folder-${this.uniqueId}" title="Создать папку" style="padding: 4px 8px;">📁 Создать папку</button>
                    <div style="width: 1px; height: 20px; background: var(--win95-dark-gray); margin: 0 4px;"></div>
                    <button class="win95-button" id="explorer-open-${this.uniqueId}" title="Открыть" style="padding: 4px 8px;" disabled>📖 Открыть</button>
                    <button class="win95-button" id="explorer-edit-${this.uniqueId}" title="Редактировать" style="padding: 4px 8px;" disabled>✏️ Редактировать</button>
                    <div style="width: 1px; height: 20px; background: var(--win95-dark-gray); margin: 0 4px;"></div>
                    <button class="win95-button" id="explorer-rename-${this.uniqueId}" title="Переименовать" style="padding: 4px 8px;" disabled>🔤 Переименовать</button>
                    <button class="win95-button" id="explorer-copy-${this.uniqueId}" title="Копировать" style="padding: 4px 8px;" disabled>📋 Копировать</button>
                    <button class="win95-button" id="explorer-paste-${this.uniqueId}" title="Вставить" style="padding: 4px 8px;" disabled>📌 Вставить</button>
                    <button class="win95-button" id="explorer-delete-${this.uniqueId}" title="Удалить" style="padding: 4px 8px; color: red;" disabled>🗑️ Удалить</button>
                </div>

                <!-- File List -->
                <div class="explorer-content" style="flex: 1; padding: 4px; overflow: auto;">
                    <div class="win95-inset-panel" id="explorer-files-container-${this.uniqueId}" style="height: 100%; background: white; padding: 8px; position: relative;">
                        <table id="explorer-table-${this.uniqueId}" style="width: 100%; border-collapse: collapse; font-size: 11px; color: #000000 !important;">
                            <thead style="color: #000000 !important;">
                                <tr style="background: var(--win95-gray); border-bottom: 1px solid var(--win95-dark-gray); color: #000000 !important;">
                                    <th style="text-align: left; padding: 4px; color: #000000 !important;">Имя</th>
                                    <th style="text-align: left; padding: 4px; color: #000000 !important;">Размер</th>
                                    <th style="text-align: left; padding: 4px; color: #000000 !important;">Тип</th>
                                </tr>
                            </thead>
                            <tbody id="explorer-files-${this.uniqueId}" style="color: #000000 !important;">
                                <tr><td colspan="3" style="text-align: center; padding: 20px; color: #000000 !important;">Загрузка...</td></tr>
                            </tbody>
                        </table>
                        
                        <!-- Context Menu -->
                        <div id="explorer-context-menu" style="display: none; position: absolute; background: var(--win95-gray); border: 2px outset; box-shadow: 2px 2px 4px rgba(0,0,0,0.3); z-index: 1000; min-width: 150px;">
                            <div class="context-menu-item" data-action="open" style="padding: 4px 20px; cursor: pointer;">Открыть</div>
                            <div class="context-menu-item" data-action="edit" style="padding: 4px 20px; cursor: pointer;">Редактировать</div>
                            <hr style="margin: 2px 0; border: none; border-top: 1px solid #808080;">
                            <div class="context-menu-item" data-action="rename" style="padding: 4px 20px; cursor: pointer;">Переименовать</div>
                            <div class="context-menu-item" data-action="copy" style="padding: 4px 20px; cursor: pointer;">Копировать</div>
                            <div class="context-menu-item" data-action="paste" style="padding: 4px 20px; cursor: pointer;">Вставить</div>
                            <hr style="margin: 2px 0; border: none; border-top: 1px solid #808080;">
                            <div class="context-menu-item" data-action="delete" style="padding: 4px 20px; cursor: pointer; color: red;">Удалить</div>
                        </div>
                    </div>
                </div>

                <!-- Status Bar -->
                <div class="explorer-statusbar" style="padding: 4px 8px; border-top: 2px solid white; background: var(--win95-gray); font-size: 11px; color: #000000 !important;">
                    <span id="explorer-status-${this.uniqueId}" style="color: #000000 !important;">Готово</span>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Кнопки навигации - используем uniqueId
        document.getElementById(`explorer-back-${this.uniqueId}`)?.addEventListener('click', () => this.goUp());
        document.getElementById(`explorer-up-${this.uniqueId}`)?.addEventListener('click', () => this.goUp());
        document.getElementById(`explorer-refresh-${this.uniqueId}`)?.addEventListener('click', () => this.loadDirectory());
        
        // Кнопки создания
        document.getElementById(`explorer-new-file-${this.uniqueId}`)?.addEventListener('click', () => this.createNewFile());
        document.getElementById(`explorer-new-folder-${this.uniqueId}`)?.addEventListener('click', () => this.createNewFolder());
        
        // Кнопки просмотра/редактирования
        document.getElementById(`explorer-open-${this.uniqueId}`)?.addEventListener('click', () => {
            if (this.selectedItemData) {
                if (this.selectedItemData.isDir) {
                    this.openDirectory(this.selectedItemData.name);
                } else {
                    this.openFile(this.selectedItemData.name);
                }
            }
        });
        document.getElementById(`explorer-edit-${this.uniqueId}`)?.addEventListener('click', () => {
            if (this.selectedItemData && !this.selectedItemData.isDir) {
                this.editFile(this.selectedItemData.name);
            }
        });
        
        // Кнопки операций
        document.getElementById(`explorer-rename-${this.uniqueId}`)?.addEventListener('click', () => {
            if (this.selectedItemData) this.renameItem(this.selectedItemData.name);
        });
        document.getElementById(`explorer-copy-${this.uniqueId}`)?.addEventListener('click', () => {
            if (this.selectedItemData) this.copyItem(this.selectedItemData.name);
        });
        document.getElementById(`explorer-paste-${this.uniqueId}`)?.addEventListener('click', () => this.pasteItem());
        document.getElementById(`explorer-delete-${this.uniqueId}`)?.addEventListener('click', () => {
            if (this.selectedItemData) this.deleteItem(this.selectedItemData.name, this.selectedItemData.isDir);
        });
        
        // Контекстное меню
        document.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                const action = item.dataset.action;
                this.hideContextMenu();
                await this.handleContextAction(action);
            });
            
            item.addEventListener('mouseenter', (e) => {
                e.target.style.background = 'var(--win95-blue)';
                e.target.style.color = 'white';
            });
            
            item.addEventListener('mouseleave', (e) => {
                e.target.style.background = '';
                e.target.style.color = '';
            });
        });
        
        // Закрытие контекстного меню при клике вне его
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#explorer-context-menu')) {
                this.hideContextMenu();
            }
        });
    }

    async loadDirectory() {
        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        const tbody = document.getElementById(`explorer-files-${this.uniqueId}`);
        if (!tbody) return;

        tbody.innerHTML = '';
        const lines = dirOutput.split('\n');
        const items = [];

        for (const line of lines) {
            const match = line.match(/^\s*\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+(?:<DIR>|(\d+))\s+(.+)$/);
            if (match) {
                const size = match[1] || '<DIR>';
                const name = match[2]?.trim();
                if (name) {
                    items.push({ name, size, isDir: size === '<DIR>' });
                }
            }
        }

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #000000 !important;">Папка пуста</td></tr>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.dataset.itemName = item.name;
            row.dataset.itemIsDir = item.isDir;

            // Hover effect
            row.addEventListener('mouseenter', () => {
                if (row !== this.selectedItem) {
                    row.style.background = '#e0e0e0';
                }
            });
            row.addEventListener('mouseleave', () => {
                if (row !== this.selectedItem) {
                    row.style.background = '';
                }
            });

            // Single click - select
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectItem(row, item);
            });

            // Double click - open
            row.addEventListener('dblclick', () => {
                if (item.isDir) {
                    this.openDirectory(item.name);
                } else {
                    this.openFile(item.name);
                }
            });

            // Right click - context menu
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.selectItem(row, item);
                this.showContextMenu(e.pageX, e.pageY);
            });

            const icon = item.isDir ? '📁' : '📄';
            const type = item.isDir ? 'Папка' : 'Файл';

            row.innerHTML = `
                <td style="padding: 4px; color: #000000 !important;">${icon} ${item.name}</td>
                <td style="padding: 4px; color: #000000 !important;">${item.isDir ? '' : item.size + ' б'}</td>
                <td style="padding: 4px; color: #000000 !important;">${type}</td>
            `;
            
            // Принудительно установить черный цвет
            row.style.color = '#000000';

            tbody.appendChild(row);
        });

        this.showStatus(`Объектов: ${items.length}`);
    }

    selectItem(row, item) {
        // Снять выделение с предыдущего
        if (this.selectedItem) {
            this.selectedItem.style.background = '';
            this.selectedItem.style.color = '';
        }
        
        // Выделить новый
        this.selectedItem = row;
        this.selectedItem.style.background = 'var(--win95-blue)';
        this.selectedItem.style.color = 'white';
        this.selectedItemData = item;
        
        // Обновить кнопки
        this.updateActionButtons();
    }
    
    updateActionButtons() {
        const hasSelection = !!this.selectedItemData;
        const hasClipboard = !!this.clipboard;
        const isFile = hasSelection && !this.selectedItemData.isDir;
        
        // Обновить состояние кнопок с уникальными ID
        const openBtn = document.getElementById(`explorer-open-${this.uniqueId}`);
        const editBtn = document.getElementById(`explorer-edit-${this.uniqueId}`);
        const renameBtn = document.getElementById(`explorer-rename-${this.uniqueId}`);
        const copyBtn = document.getElementById(`explorer-copy-${this.uniqueId}`);
        const pasteBtn = document.getElementById(`explorer-paste-${this.uniqueId}`);
        const deleteBtn = document.getElementById(`explorer-delete-${this.uniqueId}`);
        
        // Открыть - доступно для файлов и папок
        if (openBtn) openBtn.disabled = !hasSelection;
        
        // Редактировать - только для файлов
        if (editBtn) editBtn.disabled = !isFile;
        
        // Остальные кнопки
        if (renameBtn) renameBtn.disabled = !hasSelection;
        if (copyBtn) copyBtn.disabled = !hasSelection;
        if (pasteBtn) pasteBtn.disabled = !hasClipboard;
        if (deleteBtn) deleteBtn.disabled = !hasSelection;
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('explorer-context-menu');
        if (!menu) return;
        
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        // Обновить доступность пунктов
        const pasteItem = menu.querySelector('[data-action="paste"]');
        if (pasteItem) {
            pasteItem.style.color = this.clipboard ? '' : '#808080';
            pasteItem.style.pointerEvents = this.clipboard ? 'auto' : 'none';
        }
        
        const editItem = menu.querySelector('[data-action="edit"]');
        if (editItem && this.selectedItemData) {
            editItem.style.display = this.selectedItemData.isDir ? 'none' : 'block';
        }
    }

    hideContextMenu() {
        const menu = document.getElementById('explorer-context-menu');
        if (menu) {
            menu.style.display = 'none';
        }
    }

    async handleContextAction(action) {
        if (!this.selectedItemData && action !== 'paste') return;
        
        switch(action) {
            case 'open':
                if (this.selectedItemData.isDir) {
                    await this.openDirectory(this.selectedItemData.name);
                } else {
                    await this.openFile(this.selectedItemData.name);
                }
                break;
            case 'edit':
                await this.editFile(this.selectedItemData.name);
                break;
            case 'rename':
                await this.renameItem(this.selectedItemData.name);
                break;
            case 'copy':
                this.copyItem(this.selectedItemData.name);
                break;
            case 'paste':
                await this.pasteItem();
                break;
            case 'delete':
                await this.deleteItem(this.selectedItemData.name, this.selectedItemData.isDir);
                break;
        }
    }

    async createNewFile() {
        const fileName = prompt('Введите имя файла:', 'newfile.txt');
        if (!fileName) return;
        
        try {
            const response = await fetch('/api/file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    path: fileName,
                    content: '',
                    sessionId: this.sessionId
                })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showStatus(`Файл ${fileName} создан`);
                await this.loadDirectory();
            } else {
                alert('Ошибка создания файла: ' + result.message);
            }
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    }

    async createNewFolder() {
        const folderName = prompt('Введите имя папки:', 'NewFolder');
        if (!folderName) return;
        
        try {
            const response = await fetch('/api/file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mkdir',
                    path: folderName,
                    sessionId: this.sessionId
                })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showStatus(`Папка ${folderName} создана`);
                await this.loadDirectory();
            } else {
                alert('Ошибка создания папки: ' + result.message);
            }
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    }

    async renameItem(oldName) {
        const newName = prompt(`Переименовать "${oldName}" в:`, oldName);
        if (!newName || newName === oldName) return;
        
        try {
            const response = await fetch('/api/file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'rename',
                    path: oldName,
                    newPath: newName,
                    sessionId: this.sessionId
                })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showStatus(`Переименовано: ${oldName} → ${newName}`);
                await this.loadDirectory();
            } else {
                alert('Ошибка переименования: ' + result.message);
            }
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    }

    copyItem(name) {
        // Сохранить полный путь к файлу
        const fullPath = this.currentPath.endsWith('\\') ? 
            this.currentPath + name : 
            this.currentPath + '\\' + name;
            
        this.clipboard = {
            name: name,
            path: this.currentPath,
            fullPath: fullPath,
            isDir: this.selectedItemData.isDir
        };
        console.log('Copied to clipboard:', this.clipboard);
        console.log('Full source path:', fullPath);
        this.showStatus(`Скопировано в буфер: ${name}`);
        this.updateActionButtons();
    }

    async pasteItem() {
        if (!this.clipboard) {
            alert('Буфер обмена пуст');
            return;
        }
        
        console.log('Starting paste from clipboard:', this.clipboard);
        
        let newName = prompt(`Вставить "${this.clipboard.name}" как:`, this.clipboard.name);
        if (!newName) {
            console.log('Paste cancelled by user');
            return;
        }
        
        // Если имя не изменилось, добавить "Копия_"
        if (newName === this.clipboard.name) {
            newName = `Копия_${newName}`;
            console.log('Same name, adding prefix:', newName);
        }
        
        try {
            // Использовать полный путь источника из буфера
            const sourcePath = this.clipboard.fullPath || (this.clipboard.path + this.clipboard.name);
            
            // Экранировать пути, если содержат пробелы
            const sourcePathQuoted = sourcePath.includes(' ') ? `"${sourcePath}"` : sourcePath;
            const destName = newName.includes(' ') ? `"${newName}"` : newName;
            
            const command = `COPY ${sourcePathQuoted} ${destName}`;
            console.log('Source full path:', sourcePath);
            console.log('Destination name:', newName);
            console.log('Executing command:', command);
            console.log('Current directory:', this.currentPath);
            console.log('Session ID:', this.sessionId);
            
            // Использовать команду COPY для копирования
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: command,
                    sessionId: this.sessionId
                })
            });
            
            const result = await response.json();
            
            console.log('Server response:', result);
            console.log('Response success:', result.success);
            console.log('Response output:', result.output);
            console.log('Response currentDir:', result.currentDir);
            
            // ВАЖНО: Проверяем output на наличие ошибок, а не только success!
            const hasError = result.output && (
                result.output.includes('не найден') ||
                result.output.includes('Ошибка') ||
                result.output.includes('ERROR')
            );
            
            if (result.success && !hasError && result.output && result.output.includes('Скопировано')) {
                console.log('✅ Paste successful!');
                this.showStatus(`Вставлено: ${newName}`);
                this.clipboard = null; // Очистить буфер после вставки
                this.updateActionButtons();
                await this.loadDirectory();
            } else {
                const errorMsg = result.output || result.error || 'Неизвестная ошибка';
                console.error('❌ Paste failed:', errorMsg);
                alert('Ошибка вставки:\n' + errorMsg);
            }
        } catch (error) {
            console.error('❌ Paste exception:', error);
            alert('Ошибка сети: ' + error.message);
        }
    }

    async deleteItem(name, isDir) {
        if (!confirm(`Удалить "${name}"?`)) return;
        
        try {
            // Использовать правильные DOS команды
            const command = isDir ? `RMDIR /S ${name}` : `DEL ${name}`;
            
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: command,
                    sessionId: this.sessionId
                })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showStatus(`Удалено: ${name}`);
                this.selectedItem = null;
                this.selectedItemData = null;
                this.updateActionButtons();
                await this.loadDirectory();
            } else {
                alert('Ошибка удаления: ' + (result.output || result.error || 'Неизвестная ошибка'));
            }
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    }

    async openDirectory(dirName) {
        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: `TYPE ${fileName}`,
                    sessionId: this.sessionId
                })
            });

            const result = await response.json();
            if (result.success && result.output) {
                this.showFileContent(fileName, result.output, false);
            }
        } catch (error) {
            this.showStatus('Ошибка открытия файла');
        }
    }

    async editFile(fileName) {
        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: `TYPE ${fileName}`,
                    sessionId: this.sessionId
                })
            });

            const result = await response.json();
            if (result.success && result.output) {
                this.showFileContent(fileName, result.output, true);
            }
        } catch (error) {
            this.showStatus('Ошибка открытия файла');
        }
    }

    showFileContent(fileName, content, editable) {
        const windowId = 'file-' + Date.now();
        const editorId = 'editor-' + Date.now(); // Уникальный ID для каждого редактора
        
        const win = win95Manager.createWindow(
            windowId,
            (editable ? 'Редактирование: ' : '') + fileName,
            '📄',
            600,
            450
        );

        // Экранировать HTML в содержимом
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        const textarea = editable ? 
            `<textarea id="${editorId}" style="width: 100%; height: 100%; border: none; font-family: 'Courier New', monospace; font-size: 11px; resize: none; padding: 8px; color: #000000; background: white;">${escapeHtml(content)}</textarea>` :
            `<pre style="margin: 8px; font-family: 'Courier New', monospace; font-size: 11px; white-space: pre-wrap; color: #000000;">${escapeHtml(content)}</pre>`;

        win.querySelector('.win95-window-content').innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column;">
                <div class="win95-inset-panel" style="flex: 1; overflow: auto; margin: 4px; background: white;">
                    ${textarea}
                </div>
                <div style="padding: 4px; text-align: center; display: flex; gap: 4px; justify-content: center;">
                    ${editable ? `<button class="win95-button" onclick="window.saveFileContent('${fileName}', '${editorId}', '${windowId}', '${this.sessionId}')">Сохранить</button>` : ''}
                    <button class="win95-button" onclick="win95Manager.handleWindowAction('${windowId}', 'close')">Закрыть</button>
                </div>
            </div>
        `;
    }

    async goUp() {
        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        const pathElement = document.getElementById(`explorer-path-${this.uniqueId}`);
        if (pathElement) {
            pathElement.textContent = this.currentPath;
        }

        const windowElement = document.getElementById(this.windowId);
        if (windowElement) {
            const titleText = windowElement.querySelector('.win95-title-bar-text');
            if (titleText) {
                titleText.textContent = `Проводник - ${this.currentPath}`;
            }
        }
    }

    showStatus(message) {
        const statusElement = document.getElementById(`explorer-status-${this.uniqueId}`);
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
}

// Global function to save file content
window.saveFileContent = async function(fileName, editorId, windowId, explorerSessionId) {
    const editor = document.getElementById(editorId);
    if (!editor) {
        alert('Редактор не найден: ' + editorId);
        return;
    }
    
    const content = editor.value;
    
    console.log('Saving file:', fileName);
    console.log('Using editor ID:', editorId);
    console.log('Window ID:', windowId);
    console.log('Content length:', content.length);
    
    try {
        // Использовать команду ECHO для сохранения
        const response = await fetch('/api/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: `ECHO . > ${fileName}`,
                sessionId: explorerSessionId || 'file_save_' + Date.now()
            })
        });
        
        // Затем записать реальное содержимое
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: i === 0 ? `ECHO ${lines[i]} > ${fileName}` : `ECHO ${lines[i]} >> ${fileName}`,
                    sessionId: explorerSessionId || 'file_save_' + Date.now()
                })
            });
        }
        
        alert('Файл сохранён!');
        win95Manager.handleWindowAction(windowId, 'close');
        
        // Обновить проводник
        if (window.currentExplorer) {
            await window.currentExplorer.loadDirectory();
        }
    } catch (error) {
        alert('Ошибка сохранения: ' + error.message);
    }
};

// Global Map to store multiple explorer instances
if (!window.explorerInstances) {
    window.explorerInstances = new Map();
}

// Global function to create and open explorer
window.openEnhancedFileExplorer = function() {
    const windowId = 'explorer-window-' + Date.now();
    const win = win95Manager.createWindow(
        windowId,
        'Проводник - C:\\',
        '📂',
        700,
        500
    );

    const explorer = new EnhancedFileExplorer(windowId);
    explorer.init();
    
    // Сохранить экземпляр в Map
    window.explorerInstances.set(windowId, explorer);
    
    // Для обратной совместимости
    window.currentExplorer = explorer;
};

