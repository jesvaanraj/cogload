"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetrySender = void 0;
const vscode = __importStar(require("vscode"));
const WebSocket = __importStar(require("ws"));
class TelemetrySender {
    constructor(collector) {
        this.ws = null;
        this.interval = null;
        this.backendUrl = 'ws://localhost:8000/ws/telemetry';
        this.reconnectDelay = 5000;
        this.collector = collector;
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBar.show();
        this.connect();
    }
    connect() {
        try {
            this.ws = new WebSocket(this.backendUrl);
            this.ws.on('open', () => {
                console.log('[CogLoad] Connected to backend');
                this.setStatus('🟢 CogLoad: Connected');
                this.startSending();
            });
            // Receive cognitive load score back from backend
            this.ws.on('message', (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    this.handleLoadScore(response);
                }
                catch (e) {
                    console.error('[CogLoad] Failed to parse response:', e);
                }
            });
            this.ws.on('close', () => {
                console.log('[CogLoad] Disconnected. Reconnecting...');
                this.setStatus('🔴 CogLoad: Disconnected');
                this.stopSending();
                setTimeout(() => this.connect(), this.reconnectDelay);
            });
            this.ws.on('error', (err) => {
                console.error('[CogLoad] WebSocket error:', err.message);
                this.setStatus('🔴 CogLoad: Error');
            });
        }
        catch (e) {
            console.error('[CogLoad] Connection failed:', e);
            setTimeout(() => this.connect(), this.reconnectDelay);
        }
    }
    startSending() {
        // Send telemetry every 30 seconds
        this.interval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const snapshot = this.collector.getSnapshot();
                this.ws.send(JSON.stringify(snapshot));
                console.log('[CogLoad] Sent snapshot:', snapshot);
                this.collector.resetWindow();
            }
        }, 30000);
    }
    stopSending() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    handleLoadScore(response) {
        const { score, state, message } = response;
        // Update status bar with current load
        const emoji = score <= 3 ? '🟢' : score <= 6 ? '🟡' : '🔴';
        this.setStatus(`${emoji} CogLoad: ${score}/10 (${state})`);
        // Show message only if NOT in flow state
        if (state !== 'flow' && message) {
            vscode.window.showInformationMessage(`🧠 CogLoad: ${message}`);
        }
    }
    setStatus(text) {
        this.statusBar.text = text;
    }
    dispose() {
        this.stopSending();
        if (this.ws)
            this.ws.close();
        this.statusBar.dispose();
    }
}
exports.TelemetrySender = TelemetrySender;
//# sourceMappingURL=sender.js.map