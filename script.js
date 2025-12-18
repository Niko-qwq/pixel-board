class Pixel留言板 {
    constructor() {
        this.gridContainer = document.getElementById('grid-container');
        this.selectionPopup = document.getElementById('selection-popup');
        this.messageTooltip = document.getElementById('message-tooltip');
        this.messageInput = document.getElementById('message-input');
        this.saveBtn = document.getElementById('save-btn');
        this.cancelBtn = document.getElementById('cancel-btn');
        this.formatBtns = document.querySelectorAll('.format-btn');
        
        this.cellSize = 20;
        this.rows = 0;
        this.cols = 0;
        this.calculateGridDimensions();
        this.isDragging = false;
        this.startCell = null;
        this.selectedCells = new Set();
        this.messageData = new Map();
        this.currentFormat = {
            bold: false,
            italic: false,
            underline: false
        };
        
        this.init();
    }
    
    calculateGridDimensions() {
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        this.cols = Math.floor(containerWidth / this.cellSize);
        this.rows = Math.floor(containerHeight / this.cellSize);
    }
    
    init() {
        this.generateGrid();
        this.loadData();
        this.bindEvents();
        this.setupFormattingTools();
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    generateGrid() {
        this.gridContainer.style.gridTemplateColumns = `repeat(${this.cols}, ${this.cellSize}px)`;
        this.gridContainer.style.gridTemplateRows = `repeat(${this.rows}, ${this.cellSize}px)`;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.createCell(row, col);
                this.gridContainer.appendChild(cell);
            }
        }
    }
    
    createCell(row, col) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.dataset.id = `${row}-${col}`;
        
        cell.addEventListener('mousedown', (e) => this.handleMouseDown(e, cell));
        cell.addEventListener('mouseenter', (e) => this.handleMouseEnter(e, cell));
        cell.addEventListener('mouseover', (e) => this.handleMouseOver(e, cell));
        cell.addEventListener('mouseout', () => this.hideTooltip());
        
        return cell;
    }
    
    bindEvents() {
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        
        this.saveBtn.addEventListener('click', () => this.saveMessage());
        this.cancelBtn.addEventListener('click', () => this.closePopup());
    }
    
    setupFormattingTools() {
        this.formatBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.dataset.format;
                this.toggleFormat(format);
            });
        });
    }
    
    toggleFormat(format) {
        this.currentFormat[format] = !this.currentFormat[format];
        const btn = document.querySelector(`[data-format="${format}"]`);
        btn.classList.toggle('active', this.currentFormat[format]);
    }
    
    handleMouseDown(e, cell) {
        if (e.button !== 0) return;
        
        this.isDragging = true;
        this.startCell = cell;
        this.selectedCells.clear();
        this.clearSelection();
        
        this.selectCell(cell);
    }
    
    handleMouseEnter(e, cell) {
        if (this.isDragging) {
            this.selectCellsBetween(this.startCell, cell);
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        const cell = document.elementFromPoint(e.clientX, e.clientY);
        if (cell && cell.classList.contains('grid-cell')) {
            this.selectCellsBetween(this.startCell, cell);
        }
    }
    
    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            if (this.selectedCells.size > 0) {
                this.showPopup();
            }
        }
    }
    
    selectCellsBetween(cell1, cell2) {
        const row1 = parseInt(cell1.dataset.row);
        const col1 = parseInt(cell1.dataset.col);
        const row2 = parseInt(cell2.dataset.row);
        const col2 = parseInt(cell2.dataset.col);
        
        const minRow = Math.min(row1, row2);
        const maxRow = Math.max(row1, row2);
        const minCol = Math.min(col1, col2);
        const maxCol = Math.max(col1, col2);
        
        this.clearSelection();
        this.selectedCells.clear();
        
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const cell = document.querySelector(`[data-id="${row}-${col}"]`);
                if (cell) {
                    this.selectCell(cell);
                }
            }
        }
    }
    
    selectCell(cell) {
        cell.classList.add('selected');
        this.selectedCells.add(cell.dataset.id);
    }
    
    clearSelection() {
        document.querySelectorAll('.grid-cell.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
        this.selectedCells.clear();
    }
    
    showPopup() {
        this.selectionPopup.classList.remove('hidden');
        this.messageInput.focus();
    }
    
    closePopup() {
        this.selectionPopup.classList.add('hidden');
        this.messageInput.value = '';
        this.clearSelection();
        this.resetFormatting();
    }
    
    resetFormatting() {
        this.currentFormat = {
            bold: false,
            italic: false,
            underline: false
        };
        this.formatBtns.forEach(btn => btn.classList.remove('active'));
    }
    
    generateHarmoniousColor() {
        const colorSchemes = [
            ['#FF6B6B', '#4ECDC4', '#45B7D1'],
            ['#FFA07A', '#98D8C8', '#F7DC6F'],
            ['#BB8FCE', '#85C1E2', '#F8C471'],
            ['#85C1E2', '#F9E79F', '#82E0AA'],
            ['#F8B195', '#C06C84', '#6C5B7B'],
            ['#FFD93D', '#6BCF7F', '#4D96FF'],
            ['#FF8C42', '#42B883', '#64C4ED'],
            ['#FF6B9D', '#C44569', '#6C5B7B']
        ];
        
        const scheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
        return scheme[Math.floor(Math.random() * scheme.length)];
    }
    
    saveMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.selectedCells.size === 0) {
            this.closePopup();
            return;
        }
        
        const selectedIds = Array.from(this.selectedCells);
        const messageId = `message-${Date.now()}`;
        const color = this.generateHarmoniousColor();
        
        const messageObj = {
            id: messageId,
            cells: selectedIds,
            content: message,
            format: {...this.currentFormat},
            timestamp: Date.now(),
            color: color
        };
        
        this.messageData.set(messageId, messageObj);
        this.applyMessageToCells(messageObj);
        this.saveData();
        this.closePopup();
    }
    
    applyMessageToCells(messageObj) {
        messageObj.cells.forEach(cellId => {
            const cell = document.querySelector(`[data-id="${cellId}"]`);
            if (cell) {
                cell.classList.add('has-message');
                cell.dataset.messageId = messageObj.id;
                cell.style.setProperty('--message-color', messageObj.color);
                cell.style.background = `linear-gradient(135deg, ${messageObj.color}, ${this.lightenColor(messageObj.color, 20)})`;
            }
        });
    }
    
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    handleMouseOver(e, cell) {
        if (cell.dataset.messageId) {
            const messageId = cell.dataset.messageId;
            const messageObj = this.messageData.get(messageId);
            if (messageObj) {
                this.showTooltip(e, messageObj);
            }
        }
    }
    
    showTooltip(e, messageObj) {
        const tooltip = this.messageTooltip;
        let formattedContent = messageObj.content;
        
        if (messageObj.format.bold) {
            formattedContent = `<strong>${formattedContent}</strong>`;
        }
        if (messageObj.format.italic) {
            formattedContent = `<em>${formattedContent}</em>`;
        }
        if (messageObj.format.underline) {
            formattedContent = `<u>${formattedContent}</u>`;
        }
        
        tooltip.innerHTML = formattedContent;
        tooltip.style.left = `${e.clientX}px`;
        tooltip.style.top = `${e.clientY + 20}px`;
        tooltip.classList.remove('hidden');
    }
    
    hideTooltip() {
        this.messageTooltip.classList.add('hidden');
    }
    
    handleResize() {
        this.gridContainer.innerHTML = '';
        this.calculateGridDimensions();
        this.generateGrid();
        this.messageData.forEach(message => {
            this.applyMessageToCells(message);
        });
    }
    
    saveData() {
        const data = {
            messages: Array.from(this.messageData.values())
        };
        localStorage.setItem('pixelMessageBoard', JSON.stringify(data));
    }
    
    loadData() {
        const data = localStorage.getItem('pixelMessageBoard');
        if (data) {
            const parsedData = JSON.parse(data);
            parsedData.messages.forEach(message => {
                this.messageData.set(message.id, message);
                this.applyMessageToCells(message);
            });
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Pixel留言板();
});