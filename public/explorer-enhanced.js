'use strict';

class EnhancedFileExplorer {
    constructor(windowId) {
        const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this.windowId = windowId;
        this.currentPath = 'C:\\';
        this.sessionId = `explorer_${unique}`;
        this.uniqueId = `exp_${unique}`;
        this.selectedRow = null;
        this.selectedItem = null;
        this.clipboard = null;
    }

    async init() {
        const windowElement = document.getElementById(this.windowId);
        if (!windowElement) return;
        const content = windowElement.querySelector('.win95-window-content');
        content.innerHTML = `
            <div style="display:flex;flex-direction:column;height:100%;background:var(--win95-gray)">
                <div style="padding:4px;border-bottom:1px solid var(--win95-dark-gray);display:flex;gap:4px">
                    <button class="win95-button" data-role="up" title="Вверх">▲</button>
                    <div class="win95-inset-panel" style="flex:1;padding:4px;color:#000">
                        📂 <span data-role="path">C:\\</span>
                    </div>
                    <button class="win95-button" data-role="refresh" title="Обновить">🔄</button>
                </div>
                <div style="padding:4px;border-bottom:1px solid var(--win95-dark-gray);display:flex;gap:4px;flex-wrap:wrap">
                    <button class="win95-button" data-role="new-file">📄 Создать файл</button>
                    <button class="win95-button" data-role="new-folder">📁 Создать папку</button>
                    <button class="win95-button" data-role="open" disabled>📖 Открыть</button>
                    <button class="win95-button" data-role="edit" disabled>✏️ Редактировать</button>
                    <button class="win95-button" data-role="rename" disabled>🔤 Переименовать</button>
                    <button class="win95-button" data-role="copy" disabled>📋 Копировать</button>
                    <button class="win95-button" data-role="paste" disabled>📌 Вставить</button>
                    <button class="win95-button" data-role="delete" disabled style="color:#a00">🗑️ Удалить</button>
                </div>
                <div style="flex:1;padding:4px;overflow:auto">
                    <div class="win95-inset-panel" style="height:100%;background:#fff;padding:8px;box-sizing:border-box">
                        <table style="width:100%;border-collapse:collapse;font-size:11px;color:#000">
                            <thead><tr style="background:var(--win95-gray)"><th align="left">Имя</th><th align="left">Размер</th><th align="left">Тип</th></tr></thead>
                            <tbody data-role="files"><tr><td colspan="3" style="padding:20px;text-align:center">Загрузка...</td></tr></tbody>
                        </table>
                    </div>
                </div>
                <div style="padding:4px 8px;border-top:2px solid white;color:#000" data-role="status">Готово</div>
            </div>`;
        this.root = content;
        this.attachEvents();
        await this.loadDirectory();
    }

    element(role) {
        return this.root.querySelector(`[data-role="${role}"]`);
    }

    attachEvents() {
        this.element('up').addEventListener('click', () => this.goUp());
        this.element('refresh').addEventListener('click', () => this.loadDirectory());
        this.element('new-file').addEventListener('click', () => this.createNewFile());
        this.element('new-folder').addEventListener('click', () => this.createNewFolder());
        this.element('open').addEventListener('click', () => this.openSelected());
        this.element('edit').addEventListener('click', () => this.selectedItem && this.editFile(this.selectedItem.name));
        this.element('rename').addEventListener('click', () => this.selectedItem && this.renameItem(this.selectedItem.name));
        this.element('copy').addEventListener('click', () => this.copyItem());
        this.element('paste').addEventListener('click', () => this.pasteItem());
        this.element('delete').addEventListener('click', () => this.deleteItem());
    }

    async requestFile(action, data = {}) {
        const response = await window.dos95Api.fetch('/api/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, path: data.path ?? '.', sessionId: this.sessionId, ...data })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Файловая операция не выполнена');
        return result;
    }

    async requestCommand(command) {
        const response = await window.dos95Api.fetch('/api/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command, sessionId: this.sessionId })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.output || 'Команда не выполнена');
        return result;
    }

    async loadDirectory() {
        try {
            const result = await this.requestFile('list');
            this.currentPath = result.path;
            this.element('path').textContent = this.currentPath;
            const title = document.getElementById(this.windowId)?.querySelector('.win95-title-bar-text');
            if (title) title.textContent = `Проводник - ${this.currentPath}`;
            this.renderItems(result.items);
        } catch (error) {
            this.showStatus(error.message);
        }
    }

    renderItems(items) {
        const body = this.element('files');
        body.replaceChildren();
        this.selectedItem = null;
        this.selectedRow = null;
        this.updateButtons();
        if (!items.length) {
            const row = body.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 3;
            cell.textContent = 'Папка пуста';
            cell.style.cssText = 'padding:20px;text-align:center';
            this.showStatus('Объектов: 0');
            return;
        }

        for (const item of items) {
            const row = body.insertRow();
            row.style.cursor = 'pointer';
            const nameCell = row.insertCell();
            const sizeCell = row.insertCell();
            const typeCell = row.insertCell();
            nameCell.textContent = `${item.type === 'dir' ? '📁' : '📄'} ${item.name}`;
            sizeCell.textContent = item.type === 'file' ? `${item.size} б` : '';
            typeCell.textContent = item.type === 'dir' ? 'Папка' : 'Файл';
            for (const cell of [nameCell, sizeCell, typeCell]) cell.style.padding = '4px';
            row.addEventListener('click', () => this.select(row, item));
            row.addEventListener('dblclick', () => item.type === 'dir' ? this.openDirectory(item.name) : this.openFile(item.name));
        }
        this.showStatus(`Объектов: ${items.length}`);
    }

    select(row, item) {
        if (this.selectedRow) {
            this.selectedRow.style.background = '';
            this.selectedRow.style.color = '';
        }
        this.selectedRow = row;
        this.selectedItem = item;
        row.style.background = 'var(--win95-blue)';
        row.style.color = '#fff';
        this.updateButtons();
        this.showStatus(`${item.name}${item.readonly ? ' [только чтение]' : ''}`);
    }

    updateButtons() {
        const selected = Boolean(this.selectedItem);
        this.element('open').disabled = !selected;
        this.element('edit').disabled = !selected || this.selectedItem.type === 'dir' || this.selectedItem.readonly;
        this.element('rename').disabled = !selected || this.selectedItem.readonly;
        this.element('copy').disabled = !selected;
        this.element('delete').disabled = !selected || this.selectedItem.readonly;
        this.element('paste').disabled = !this.clipboard;
    }

    quote(value) {
        return `"${String(value).replace(/"/g, '')}"`;
    }

    async openDirectory(name) {
        try {
            await this.requestCommand(`CD ${this.quote(name)}`);
            await this.loadDirectory();
        } catch (error) {
            this.showStatus(error.message);
        }
    }

    async goUp() {
        try {
            await this.requestCommand('CD ..');
            await this.loadDirectory();
        } catch (error) {
            this.showStatus(error.message);
        }
    }

    async createNewFile() {
        const name = prompt('Введите имя файла:', 'newfile.txt');
        if (!name) return;
        try {
            await this.requestFile('create', { path: name, content: '' });
            await this.loadDirectory();
            this.showStatus(`Файл ${name} создан`);
        } catch (error) {
            alert(`Ошибка создания файла: ${error.message}`);
        }
    }

    async createNewFolder() {
        const name = prompt('Введите имя папки:', 'NewFolder');
        if (!name) return;
        try {
            await this.requestFile('mkdir', { path: name });
            await this.loadDirectory();
            this.showStatus(`Папка ${name} создана`);
        } catch (error) {
            alert(`Ошибка создания папки: ${error.message}`);
        }
    }

    async renameItem(oldName) {
        const newName = prompt(`Переименовать "${oldName}" в:`, oldName);
        if (!newName || newName === oldName) return;
        try {
            await this.requestFile('rename', { path: oldName, newPath: newName });
            await this.loadDirectory();
        } catch (error) {
            alert(`Ошибка переименования: ${error.message}`);
        }
    }

    copyItem() {
        if (!this.selectedItem) return;
        const separator = this.currentPath.endsWith('\\') ? '' : '\\';
        this.clipboard = { ...this.selectedItem, fullPath: `${this.currentPath}${separator}${this.selectedItem.name}` };
        this.updateButtons();
        this.showStatus(`Скопировано в буфер: ${this.selectedItem.name}`);
    }

    async pasteItem() {
        if (!this.clipboard) return;
        let newName = prompt(`Вставить "${this.clipboard.name}" как:`, this.clipboard.name);
        if (!newName) return;
        if (newName === this.clipboard.name) newName = `КОПИЯ_${newName}`;
        try {
            await this.requestFile('copy', { path: this.clipboard.fullPath, newPath: newName });
            this.clipboard = null;
            await this.loadDirectory();
        } catch (error) {
            alert(`Ошибка вставки: ${error.message}`);
        }
    }

    async deleteItem() {
        if (!this.selectedItem || !confirm(`Удалить "${this.selectedItem.name}"?`)) return;
        try {
            const action = this.selectedItem.type === 'dir' ? 'rmdir' : 'delete';
            await this.requestFile(action, { path: this.selectedItem.name, recursive: true });
            await this.loadDirectory();
        } catch (error) {
            alert(`Ошибка удаления: ${error.message}`);
        }
    }

    openSelected() {
        if (!this.selectedItem) return;
        return this.selectedItem.type === 'dir'
            ? this.openDirectory(this.selectedItem.name)
            : this.openFile(this.selectedItem.name);
    }

    async openFile(fileName) {
        try {
            const result = await this.requestFile('read', { path: fileName });
            this.showFileContent(fileName, result.content, false);
        } catch (error) {
            this.showStatus(error.message);
        }
    }

    async editFile(fileName) {
        try {
            const result = await this.requestFile('read', { path: fileName });
            this.showFileContent(fileName, result.content, true);
        } catch (error) {
            this.showStatus(error.message);
        }
    }

    showFileContent(fileName, content, editable) {
        const id = `file-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
        const win = win95Manager.createWindow(id, `${editable ? 'Редактирование: ' : ''}${fileName}`, '📄', 600, 450);
        const container = document.createElement('div');
        container.style.cssText = 'height:100%;display:flex;flex-direction:column';
        const panel = document.createElement('div');
        panel.className = 'win95-inset-panel';
        panel.style.cssText = 'flex:1;overflow:auto;margin:4px;background:#fff';
        const viewer = document.createElement(editable ? 'textarea' : 'pre');
        viewer.style.cssText = 'box-sizing:border-box;width:100%;height:100%;margin:0;padding:8px;border:0;color:#000;background:#fff;font:11px "Courier New",monospace;white-space:pre-wrap';
        if (editable) viewer.value = content;
        else viewer.textContent = content;
        panel.appendChild(viewer);

        const actions = document.createElement('div');
        actions.style.cssText = 'padding:4px;text-align:center;display:flex;gap:4px;justify-content:center';
        if (editable) {
            const saveButton = document.createElement('button');
            saveButton.className = 'win95-button';
            saveButton.textContent = 'Сохранить';
            saveButton.addEventListener('click', async () => {
                try {
                    await this.requestFile('write', { path: fileName, content: viewer.value });
                    win95Manager.handleWindowAction(id, 'close');
                    await this.loadDirectory();
                } catch (error) {
                    alert(`Ошибка сохранения: ${error.message}`);
                }
            });
            actions.appendChild(saveButton);
        }
        const closeButton = document.createElement('button');
        closeButton.className = 'win95-button';
        closeButton.textContent = 'Закрыть';
        closeButton.addEventListener('click', () => win95Manager.handleWindowAction(id, 'close'));
        actions.appendChild(closeButton);
        container.append(panel, actions);
        win.querySelector('.win95-window-content').replaceChildren(container);
    }

    showStatus(message) {
        const status = this.element('status');
        if (status) status.textContent = message;
    }
}

window.explorerInstances = window.explorerInstances || new Map();
window.openEnhancedFileExplorer = function openEnhancedFileExplorer() {
    const unique = globalThis.crypto?.randomUUID?.() || Date.now();
    const windowId = `explorer-window-${unique}`;
    win95Manager.createWindow(windowId, 'Проводник - C:\\', '📂', 700, 500);
    const explorer = new EnhancedFileExplorer(windowId);
    window.explorerInstances.set(windowId, explorer);
    window.currentExplorer = explorer;
    explorer.init();
};
