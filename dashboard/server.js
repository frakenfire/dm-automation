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

        const scriptName = 'src/scripts/runAssistInstagram.ts';

        const env = {
            ...process.env,
            TARGET_MESSAGE: message,
            HEADLESS: headless ? 'true' : 'false',
            TEST_MODE: isTest ? 'true' : 'false'
        };

        if (isTest) {
            env.TARGET_HANDLES = 'pcalm.kr,pcalm_official';
        } else {
            env.TARGET_HANDLE = handle;
        }

        const child = spawn('npm.cmd', [
            '--prefix', 'browser-agent',
            'run', 'ts-node', '--', scriptName
        ], {
            env,
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
    
    socket.on('fetch-sheets', (data) => {
        const { sheetId } = data;
        const env = { 
            ...process.env, 
            GOOGLE_SHEET_ID: sheetId 
        };
        
        console.log(`[시트 데이터 요청] Sheet ID: ${sheetId}`);
        const child = spawn('npm.cmd', [
            '--prefix', 'browser-agent',
            'run', 'ts-node', '--', 'src/scripts/fetchSheet.ts'
        ], {
            env,
            shell: true
        });

        let outputData = '';
        child.stdout.on('data', (chunk) => {
            outputData += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
            console.error(`[fetch-sheets error] ${chunk.toString()}`);
        });

        child.on('close', (code) => {
            try {
                // Filter out any local security modules and env banner output noise
                const cleanLines = outputData.split('\n')
                    .filter(line => !line.includes('vestauth') && 
                                    !line.includes('vestcert') && 
                                    !line.includes('injected env') && 
                                    !line.includes('// tip'));
                const cleanOutput = cleanLines.join('\n').trim();

                const jsonStart = cleanOutput.indexOf('[');
                const jsonStartObj = cleanOutput.indexOf('{');
                let jsonIndex = -1;
                if (jsonStart !== -1 && jsonStartObj !== -1) {
                    jsonIndex = Math.min(jsonStart, jsonStartObj);
                } else if (jsonStart !== -1) {
                    jsonIndex = jsonStart;
                } else if (jsonStartObj !== -1) {
                    jsonIndex = jsonStartObj;
                }

                if (jsonIndex !== -1) {
                    const parsed = JSON.parse(cleanOutput.slice(jsonIndex).trim());
                    socket.emit('sheet-data', { success: true, rows: parsed });
                } else {
                    const parsed = JSON.parse(cleanOutput);
                    socket.emit('sheet-data', parsed);
                }
            } catch (error) {
                console.error('Failed to parse fetchSheet output:', outputData);
                socket.emit('sheet-data', { success: false, error: `시트 로딩 실패: ${error.message || '데이터 형식 오류'}` });
            }
        });
    });

    socket.on('start-bulk', (data) => {
        const { sheetId, headless, isTest } = data;
        const scriptName = 'src/scripts/runBulkInstagram.ts';
        
        console.log(`[대량 발송 시작] Sheet ID: ${sheetId}, Headless: ${headless}, Test Mode: ${isTest}`);
        const env = { 
            ...process.env, 
            GOOGLE_SHEET_ID: sheetId,
            HEADLESS: headless ? 'true' : 'false',
            TEST_MODE: isTest ? 'true' : 'false'
        };

        const child = spawn('npm.cmd', [
            '--prefix', 'browser-agent',
            'run', 'ts-node', '--', scriptName
        ], {
            env,
            shell: true
        });

        child.stdout.on('data', (data) => {
            const line = data.toString().trim();
            if (line) {
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

                if (line.includes('browser-agent@') || line.includes('injected env')) return;
                
                let type = 'info';
                if (line.includes('[단계]') || line.includes('[시작]')) type = 'step';
                if (line.includes('[성공]')) type = 'success';
                if (line.includes('[오류]') || line.includes('[실패]')) type = 'error';
                
                socket.emit('log', { type, text: line });
            }
        });

        child.stderr.on('data', (data) => {
            socket.emit('log', { type: 'error', text: data.toString() });
        });

        child.on('close', (code) => {
            socket.emit('log', { type: 'system', text: `대량 발송 종료 (코드: ${code})` });
            socket.emit('status', { loading: false });
        });
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Dashboard running at http://localhost:${PORT}`);
});
