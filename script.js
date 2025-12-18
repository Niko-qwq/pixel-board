class Pixel留言板 {
    constructor() {
        this.gridContainer = document.getElementById('grid-container');
        this.selectionPopup = document.getElementById('selection-popup');
        this.messageTooltip = document.getElementById('message-tooltip');
        this.messageInput = document.getElementById('message-input');
        this.saveBtn = document.getElementById('save-btn');
        this.cancelBtn = document.getElementById('cancel-btn');
        this.formatBtns = document.querySelectorAll('.format-btn');
        
        this.cellSize = this.calculateCellSize();
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
        
        // Firebase配置
        this.firebaseConfig = {
            apiKey: "AIzaSyCsn_Q5l00__wIRNFPqe2UrAjTC6tKwOw0",
            authDomain: "pixelboard-4edc0.firebaseapp.com",
            databaseURL: "https://pixelboard-4edc0-default-rtdb.firebaseio.com",
            projectId: "pixelboard-4edc0",
            storageBucket: "pixelboard-4edc0.firebasestorage.app",
            messagingSenderId: "310989164404",
            appId: "1:310989164404:web:357adecfda5e48ad2ba621",
            measurementId: "G-XQ7KQ368XM"
        };
        
        // 初始化Firebase
        this.firebaseApp = firebase.initializeApp(this.firebaseConfig);
        this.database = this.firebaseApp.database();
        this.analytics = firebase.analytics(this.firebaseApp);
        this.messagesRef = this.database.ref('messages');
        
        this.init();
    }
    
    // 根据屏幕大小和设备类型计算单元格大小
    calculateCellSize() {
        const isMobile = window.innerWidth < 768;
        const screenWidth = window.innerWidth;
        
        // 在手机端，根据屏幕宽度动态调整单元格大小
        if (isMobile) {
            // 确保在小屏幕上有合适的单元格大小和数量
            // 手机端单元格更大，便于触摸操作
            if (screenWidth < 360) {
                return 25; // 非常小的手机
            } else if (screenWidth < 480) {
                return 30; // 小屏手机
            } else {
                return 35; // 大屏手机
            }
        } else {
            // 桌面端保持原有大小
            return 20;
        }
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
        
        // 鼠标事件
        cell.addEventListener('mousedown', (e) => this.handleMouseDown(e, cell));
        cell.addEventListener('mouseenter', (e) => this.handleMouseEnter(e, cell));
        cell.addEventListener('mouseover', (e) => this.handleMouseOver(e, cell));
        cell.addEventListener('mouseout', () => this.hideTooltip());
        
        // 触摸事件
        cell.addEventListener('touchstart', (e) => this.handleTouchStart(e, cell));
        cell.addEventListener('touchmove', (e) => this.handleTouchMove(e, cell));
        
        return cell;
    }
    
    bindEvents() {
        // 鼠标事件
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        
        // 触摸事件
        document.addEventListener('touchmove', (e) => this.handleTouchMoveGlobal(e));
        document.addEventListener('touchend', () => this.handleTouchEnd());
        
        this.saveBtn.addEventListener('click', () => this.saveMessage());
        this.cancelBtn.addEventListener('click', () => this.closePopup());
    }
    
    // 触摸事件处理
    handleTouchStart(e, cell) {
        e.preventDefault();
        
        this.isDragging = true;
        this.startCell = cell;
        this.selectedCells.clear();
        this.clearSelection();
        
        this.selectCell(cell);
    }
    
    handleTouchMove(e, cell) {
        if (this.isDragging) {
            e.preventDefault();
            this.selectCellsBetween(this.startCell, cell);
        }
    }
    
    handleTouchMoveGlobal(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        const cell = document.elementFromPoint(touch.clientX, touch.clientY);
        if (cell && cell.classList.contains('grid-cell')) {
            this.selectCellsBetween(this.startCell, cell);
        }
    }
    
    handleTouchEnd() {
        if (this.isDragging) {
            this.isDragging = false;
            if (this.selectedCells.size > 0) {
                this.showPopup();
            }
        }
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
        
        // 添加新消息
        this.messageData.set(messageId, messageObj);
        this.applyMessageToCells(messageObj);
        
        // 检测并清理被完全覆盖的消息
        this.detectAndCleanOverriddenMessages();
        
        this.saveData();
        this.closePopup();
    }
    
    detectAndCleanOverriddenMessages() {
        // 创建一个单元格到消息ID的映射，记录每个单元格当前被哪个消息占用
        const cellToMessageMap = new Map();
        
        // 遍历所有消息，更新单元格映射（新消息会覆盖旧消息）
        this.messageData.forEach((message, id) => {
            message.cells.forEach(cellId => {
                cellToMessageMap.set(cellId, id);
            });
        });
        
        // 找出所有被完全覆盖的消息
        const messagesToRemove = [];
        
        this.messageData.forEach((message, id) => {
            // 检查消息的每个单元格是否都被其他消息占用
            const isCompletelyOverridden = message.cells.every(cellId => {
                const currentMessageId = cellToMessageMap.get(cellId);
                return currentMessageId !== undefined && currentMessageId !== id;
            });
            
            if (isCompletelyOverridden) {
                messagesToRemove.push(id);
            }
        });
        
        // 移除被完全覆盖的消息
        messagesToRemove.forEach(id => {
            this.messageData.delete(id);
        });
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
        
        // 计算tooltip的最佳位置，避免超出页面边缘
        tooltip.style.left = `${e.clientX}px`;
        tooltip.style.top = `${e.clientY + 20}px`;
        
        // 强制计算tooltip的尺寸
        tooltip.classList.remove('hidden');
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // 调整位置，确保tooltip完全显示在视口中
        let left = e.clientX;
        let top = e.clientY + 20;
        
        // 检查右侧边界
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        // 检查左侧边界
        if (left < 0) {
            left = 10;
        }
        
        // 检查底部边界
        if (top + tooltipRect.height > window.innerHeight) {
            top = e.clientY - tooltipRect.height - 10;
        }
        
        // 检查顶部边界
        if (top < 0) {
            top = 10;
        }
        
        // 设置最终位置
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }
    
    hideTooltip() {
        this.messageTooltip.classList.add('hidden');
    }
    
    handleResize() {
        this.gridContainer.innerHTML = '';
        this.cellSize = this.calculateCellSize(); // 重新计算单元格大小
        this.calculateGridDimensions();
        this.generateGrid();
        this.messageData.forEach(message => {
            this.applyMessageToCells(message);
        });
    }
    
    saveData() {
        // 将数据保存到Firebase
        const messagesObj = {};
        this.messageData.forEach((message, id) => {
            messagesObj[id] = message;
        });
        this.messagesRef.set(messagesObj);
    }
    
    loadData() {
        // 监听Firebase数据变化
        this.messagesRef.on('value', (snapshot) => {
            const data = snapshot.val();
            this.messageData.clear();
            
            // 清除所有已有消息的样式
            document.querySelectorAll('.grid-cell.has-message').forEach(cell => {
                cell.classList.remove('has-message');
                delete cell.dataset.messageId;
                cell.style.removeProperty('--message-color');
                cell.style.background = 'rgba(255, 255, 255, 0.05)';
            });
            
            if (data) {
                Object.values(data).forEach(message => {
                    this.messageData.set(message.id, message);
                    this.applyMessageToCells(message);
                });
            }
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Pixel留言板();
});