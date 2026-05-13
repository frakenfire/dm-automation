const socket = io();

const targetHandleInput = document.getElementById('target-handle');
const dmMessageInput = document.getElementById('dm-message');
const headlessModeCheckbox = document.getElementById('headless-mode');
const sendBtn = document.getElementById('send-btn');
const btnLoader = document.getElementById('btn-loader');
const logContainer = document.getElementById('log-container');
const clearLogBtn = document.getElementById('clear-log');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const progressPercent = document.getElementById('progress-percent');

// 로그 추가 함수
function addLog(type, text) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    entry.innerHTML = `<span class="log-time">[${timeStr}]</span> ${text}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // 단계 감지 및 진행률 업데이트
    updateProgressBar(text);
}

// 진행률 업데이트
function updateProgressBar(text) {
    if (text.includes('로그인 확인')) setProgress(20, '인스타그램 로그인 상태 확인 중...');
    if (text.includes('계정을 검색')) setProgress(40, '대상 계정 검색 중...');
    if (text.includes('선택 버튼을 클릭')) setProgress(60, '타겟 인플루언서 선택 중...');
    if (text.includes('메시지를 작성')) setProgress(80, 'DM 메시지 작성 및 대기 중...');
    if (text.includes('성공') || text.includes('전송을 완료')) setProgress(100, '발송 완료! 결과를 브라우저에서 확인하세요.');
}

function setProgress(percent, text) {
    progressFill.style.width = `${percent}%`;
    progressPercent.innerText = `${percent}%`;
    progressText.innerText = text;
}

// 자동화 실행 함수
sendBtn.addEventListener('click', () => {
    const handle = targetHandleInput.value.replace('@', '').trim();
    const message = dmMessageInput.value.trim();
    const headless = headlessModeCheckbox.checked;

    if (!handle || !message) {
        alert('핸들과 메시지를 모두 입력해주세요.');
        return;
    }

    sendBtn.disabled = true;
    btnLoader.style.display = 'block';
    
    setProgress(10, '프로세스 초기화 중...');
    addLog('system', `발송 프로세스 시작: @${handle}`);

    socket.emit('start-dm', { handle, message, headless });
});

// 실시간 로그 수신
socket.on('log', (data) => {
    addLog(data.type, data.text);
});

socket.on('status', (data) => {
    if (data.success) {
        setProgress(100, '발송 성공!');
        sendBtn.innerText = '발송 완료';
        sendBtn.className = 'cta-btn success';
    }
    if (data.loading === false) {
        sendBtn.disabled = false;
        btnLoader.style.display = 'none';
    }
});

clearLogBtn.addEventListener('click', () => {
    logContainer.innerHTML = '<div class="log-entry system">로그가 초기화되었습니다.</div>';
    setProgress(0, '시딩 대기 중...');
    sendBtn.innerText = 'DM 발송 시작';
    sendBtn.className = 'cta-btn';
});
