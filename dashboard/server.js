const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Client connected to dashboard');
    
    socket.on('start-dm', (data) => {
        const { handle, message, headless, isTest } = data;
        
        const scriptName = isTest ? 'src/scripts/debugLiveView.ts' : 'src/scripts/runAssistInstagram.ts';
        socket.emit('log', { type: 'system', text: isTest ? '라이브 뷰 테스트 모드 가동...' : `발송 프로세스 시작: @${handle}` });

        const child = spawn('npm.cmd', [
            '--prefix', 'browser-agent', 
            'run', 'ts-node', scriptName
        ], {
            env: { 
                ...process.env, 
                TARGET_HANDLE: handle, 
                TARGET_MESSAGE: message,
                HEADLESS: headless ? 'true' : 'false'
            },
            shell: true
        });

        child.stdout.on('data', (data) => {
            const line = data.toString().trim();
            if (line) {
                // 실시간 스크린샷 감지 (더 견고한 매칭)
                if (line.includes('[SCREENSHOT]')) {
                    const parts = line.split('[SCREENSHOT] ');
                    if (parts.length > 1) {
                        const content = parts[1];
                        const [step, base64] = content.split('|');
                        if (base64) {
                            socket.emit('screenshot', { step, base64 });
                            return;
                        }
                    }
                }

                // 불필요한 기술적 노이즈 필터링
                if (line.includes('>') || line.includes('injected env') || line.includes('browser-agent@')) return;

                // 로그 패턴 분석하여 타입 지정
                let type = 'info';
                if (line.includes('[단계]') || line.includes('[시작]')) type = 'step';
                if (line.includes('[성공]')) {
                    type = 'success';
                    socket.emit('status', { success: true }); // 즉시 성공 상태 알림
                }
                if (line.includes('[오류]')) type = 'error';
                
                socket.emit('log', { type, text: line });
            }
        });

        child.stderr.on('data', (data) => {
            socket.emit('log', { type: 'error', text: data.toString() });
        });

        child.on('close', (code) => {
            socket.emit('log', { type: 'system', text: `프로세스 종료 (코드: ${code})` });
            socket.emit('status', { loading: false });
        });
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Dashboard running at http://localhost:${PORT}`);
});
