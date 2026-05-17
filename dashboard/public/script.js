// Socket Connection Initialization
const socket = io();

// UI Elements
const inputSource = document.getElementById('input-source');
const manualArea = document.getElementById('manual-area');
const sheetsArea = document.getElementById('sheets-area');
const targetHandlesInput = document.getElementById('target-handles');
const sheetIdInput = document.getElementById('sheet-id');
const loadSheetBtn = document.getElementById('load-sheet-btn');
const dmMessageInput = document.getElementById('dm-message');
const testModeCheckbox = document.getElementById('test-mode');
const headlessCheckbox = document.getElementById('headless-mode');
const sendBtn = document.getElementById('send-btn');
const btnLoader = document.getElementById('btn-loader');
const logContainer = document.getElementById('log-container');
const clearLogBtn = document.getElementById('clear-log');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const progressPercent = document.getElementById('progress-percent');

// Queue Table UI Elements
const queueBody = document.getElementById('queue-body');
const queueCountBadge = document.getElementById('queue-count');

// Monitor UI Elements
const screenPlaceholder = document.getElementById('screen-placeholder');
const screenImg = document.getElementById('screen-img');
const monitorOverlay = document.getElementById('monitor-overlay');
const monitorStepText = document.getElementById('monitor-step-text');

// State Cache
let activeQueue = [];

// 1. Source Option Switcher
inputSource.addEventListener('change', () => {
    if (inputSource.value === 'manual') {
        manualArea.style.display = 'block';
        sheetsArea.style.display = 'none';
        renderManualQueue();
    } else {
        manualArea.style.display = 'none';
        sheetsArea.style.display = 'block';
        clearQueueTable();
    }
});

// Watch Manual Target Input to Dynamically Render Table rows
targetHandlesInput.addEventListener('input', () => {
    if (inputSource.value === 'manual') {
        renderManualQueue();
    }
});

// Render Queue table for Manual Handles
function renderManualQueue() {
    const handles = targetHandlesInput.value.split('\n')
        .map(h => h.trim().replace(/^@/, ''))
        .filter(h => h !== '');

    if (handles.length === 0) {
        clearQueueTable();
        return;
    }

    const messageSummary = dmMessageInput.value.trim().substring(0, 30) + '...';
    const isTest = testModeCheckbox.checked;

    activeQueue = handles.map((handle, idx) => ({
        queue_id: `IG-MANUAL-${100 + idx}`,
        handle: handle,
        message_text: dmMessageInput.value,
        send_mode: isTest ? 'assist' : 'auto',
        status: 'READY'
    }));

    populateQueueTable(activeQueue);
}

// Clear table rows
function clearQueueTable() {
    activeQueue = [];
    queueCountBadge.innerText = '0 READY';
    queueBody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-row">
                <div class="empty-state">
                    <span>📥</span>
                    <p>불러오거나 입력한 대기열이 없습니다.</p>
                </div>
            </td>
        </tr>
    `;
}

// Populate table rows dynamically with beautiful indicators
function populateQueueTable(tasks) {
    if (!tasks || tasks.length === 0) {
        clearQueueTable();
        return;
    }

    queueCountBadge.innerText = `${tasks.length} READY`;
    
    queueBody.innerHTML = tasks.map(task => {
        const statusClass = (task.status || 'READY').toLowerCase();
        const shortMsg = (task.message_text || '').substring(0, 32) + '...';
        return `
            <tr id="row-${task.queue_id}">
                <td style="font-family: var(--font-mono); color: var(--text-gray);">${task.queue_id}</td>
                <td style="font-weight: 700;">@${task.handle}</td>
                <td style="color: var(--text-gray);">${shortMsg}</td>
                <td><span class="badge" style="background: rgba(255,255,255,0.04);">${task.send_mode || 'auto'}</span></td>
                <td>
                    <span class="status-pill ${statusClass}" id="pill-${task.queue_id}">${task.status || 'READY'}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// 2. Fetch Sheet Event Trigger
loadSheetBtn.addEventListener('click', () => {
    const sheetId = sheetIdInput.value.trim();
    if (!sheetId) {
        alert('구글 스프레드시트 ID를 입력해주세요.');
        return;
    }

    loadSheetBtn.disabled = true;
    loadSheetBtn.innerText = '불러오는 중...';
    addLog('system', `[구글 시트] 스프레드시트 구조 조회 요청 중 (ID: ${sheetId})`);

    socket.emit('fetch-sheets', { sheetId });
});

// Socket Event: Sheet Data Returned
socket.on('sheet-data', (data) => {
    loadSheetBtn.disabled = false;
    loadSheetBtn.innerText = '불러오기';

    if (data.success && data.rows && data.rows.length > 0) {
        activeQueue = data.rows;
        populateQueueTable(activeQueue);
        addLog('success', `[구글 시트] 연동 성공! 총 ${activeQueue.length}건의 시딩 대기열 로드 완료`);
    } else {
        const errorMsg = data.error || '대기열 데이터가 없거나 형식이 올바르지 않습니다.';
        addLog('error', `[구글 시트] 연동 실패: ${errorMsg}`);
        alert(`시트 로딩 실패: ${errorMsg}`);
    }
});

// 3. Log Addition & Auto Scroll
function addLog(type, text) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    entry.innerHTML = `<span class="log-time">[${timeStr}]</span> ${text}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    updateProgressBar(text);
    updateQueueStatusFromLog(text);
}

// Smooth Progress Tracking based on logs
function updateProgressBar(text) {
    if (text.includes('로그인 상태를 확인')) setProgress(15, '로그인 세션 무결성 검증 중...');
    if (text.includes('초기 팝업 여부를 확인')) setProgress(25, '알림 팝업 정리 중...');
    if (text.includes('DM 발송 시작')) {
        const match = text.match(/@([a-zA-Z0-9_\.]+)/);
        const handle = match ? match[1] : '';
        setProgress(40, `@${handle} 타겟 검색 및 프로필 진입 중...`);
    }
    if (text.includes('Search Filled')) setProgress(55, '타겟 계정 식별 및 매칭 중...');
    if (text.includes('Profile Opened')) setProgress(70, 'DM 팝업 개방 및 입력창 상호작용 중...');
    if (text.includes('메시지 전송을 완료') || text.includes('발송 완료')) {
        setProgress(90, '메시지 전송 및 트래킹 업데이트 중...');
    }
    if (text.includes('모든 대기열 작업이 종료') || text.includes('발송 종료')) {
        setProgress(100, '전체 RPA 시딩 미션 완료!');
    }
}

function setProgress(percent, text) {
    progressFill.style.width = `${percent}%`;
    progressPercent.innerText = `${percent}%`;
    progressText.innerText = text;
}

// Dynamically highlight corresponding table rows based on runtime logs
function updateQueueStatusFromLog(text) {
    // Check for processing handles
    if (text.includes('발송 시도 중') || text.includes('DM 발송 시작')) {
        const match = text.match(/@([a-zA-Z0-9_\.]+)/);
        if (match) {
            const handle = match[1];
            const matchedTask = activeQueue.find(t => t.handle === handle);
            if (matchedTask) {
                updateRowStatus(matchedTask.queue_id, 'PROCESSING');
            }
        }
    }

    // Check for successes
    if (text.includes('발송 완료') || text.includes('메시지 전송을 완료')) {
        const match = text.match(/@([a-zA-Z0-9_\.]+)/);
        if (match) {
            const handle = match[1];
            const matchedTask = activeQueue.find(t => t.handle === handle);
            if (matchedTask) {
                updateRowStatus(matchedTask.queue_id, 'SUCCESS');
            }
        }
    }

    // Check for failures
    if (text.includes('발송 실패') || text.includes('[실패]')) {
        const match = text.match(/@([a-zA-Z0-9_\.]+)/);
        if (match) {
            const handle = match[1];
            const matchedTask = activeQueue.find(t => t.handle === handle);
            if (matchedTask) {
                updateRowStatus(matchedTask.queue_id, 'FAILED');
            }
        }
    }
}

function updateRowStatus(queueId, status) {
    const pill = document.getElementById(`pill-${queueId}`);
    const row = document.getElementById(`row-${queueId}`);
    if (pill) {
        pill.innerText = status;
        pill.className = `status-pill ${status.toLowerCase()}`;
    }
    if (row) {
        if (status === 'PROCESSING') {
            row.style.backgroundColor = 'rgba(191, 90, 242, 0.05)';
        } else if (status === 'SUCCESS') {
            row.style.backgroundColor = 'rgba(48, 209, 88, 0.04)';
        } else if (status === 'FAILED') {
            row.style.backgroundColor = 'rgba(255, 69, 58, 0.04)';
        }
    }
}

// Socket Event: Live Log Streaming
socket.on('log', (data) => {
    addLog(data.type, data.text);
});

// 4. Socket Event: Live Screenshot Stream Display
socket.on('screenshot', (data) => {
    const { step, base64 } = data;
    
    // Hide placeholder
    if (screenPlaceholder) screenPlaceholder.style.display = 'none';
    
    // Show image element and update base64 source
    if (screenImg) {
        screenImg.style.display = 'block';
        screenImg.src = `data:image/jpeg;base64,${base64}`;
    }
    
    // Update monitor overlay metadata
    if (monitorOverlay) monitorOverlay.style.display = 'flex';
    if (monitorStepText) monitorStepText.innerText = step;
});

// 5. RPA Execution Start Trigger
sendBtn.addEventListener('click', () => {
    const message = dmMessageInput.value.trim();
    const isTest = testModeCheckbox.checked;
    const headless = headlessCheckbox.checked;

    // Reset screenshot view safely
    if (screenPlaceholder) screenPlaceholder.style.display = 'flex';
    if (screenImg) screenImg.style.display = 'none';
    if (monitorOverlay) monitorOverlay.style.display = 'none';

    if (inputSource.value === 'manual') {
        const handles = targetHandlesInput.value.split('\n')
            .map(h => h.trim().replace(/^@/, ''))
            .filter(h => h !== '');

        if (handles.length === 0 || !message) {
            alert('타겟 핸들과 메시지 텍스트를 입력해주세요.');
            return;
        }

        // Set Loading state
        sendBtn.disabled = true;
        btnLoader.style.display = 'block';
        addLog('system', `[RPA 작업 실행] 직접 입력 시딩 가동 (타겟: ${handles.length}건, 테스트: ${isTest})`);
        
        socket.emit('start-dm', { 
            handle: handles.join(','), 
            message, 
            headless,
            isTest 
        });
    } else {
        const sheetId = sheetIdInput.value.trim();
        if (!sheetId) {
            alert('구글 스프레드시트 ID를 입력해주세요.');
            return;
        }

        if (activeQueue.length === 0) {
            alert('먼저 불러오기 버튼을 클릭하여 시트 대기열 데이터를 불러와주세요.');
            return;
        }

        // Set Loading state
        sendBtn.disabled = true;
        btnLoader.style.display = 'block';
        addLog('system', `[RPA 작업 실행] 구글 시트 기반 벌크 시딩 가동 (시트 ID: ${sheetId}, 테스트: ${isTest})`);
        
        socket.emit('start-bulk', { 
            sheetId, 
            headless,
            isTest 
        });
    }
});

// Socket Event: Final State Update
socket.on('status', (data) => {
    if (data.loading === false) {
        sendBtn.disabled = false;
        btnLoader.style.display = 'none';
    }
});

// Logs Clear Event
clearLogBtn.addEventListener('click', () => {
    logContainer.innerHTML = '<div class="log-entry system">관제 센터 로그가 초기화되었습니다.</div>';
    setProgress(0, 'RPA 관제 센터 대기 중...');
});

// Populate initial manual table rows on load
if (inputSource.value === 'manual') {
    renderManualQueue();
}
