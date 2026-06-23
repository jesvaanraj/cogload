import * as vscode from 'vscode';
import WebSocket from 'ws';
import { TelemetryCollector, TelemetrySnapshot } from './telemetry';

export interface LoadResponse {
  score: number;
  state: 'fresh' | 'normal' | 'tired' | 'critical' | 'flow';
  message: string;
  suggestion: string;
}

export class TelemetrySender {
  private ws: WebSocket | null = null;
  private collector: TelemetryCollector;
  private interval: NodeJS.Timeout | null = null;
  private statusBar: vscode.StatusBarItem;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(collector: TelemetryCollector) {
    this.collector = collector;
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
    this.statusBar.command = 'cogload.showDashboard';
    this.statusBar.show();
    this.setStatus('⚪ CogLoad: Starting...');
    this.connect();
  }

  private getConfig() {
    const config = vscode.workspace.getConfiguration('cogload');
    return {
      backendUrl: config.get<string>('backendUrl', 'ws://localhost:8000/ws/telemetry'),
      intervalSeconds: config.get<number>('snapshotIntervalSeconds', 30),
      showNotifications: config.get<boolean>('showNotifications', true),
    };
  }

  private connect(): void {
    const { backendUrl } = this.getConfig();
    try {
      this.ws = new WebSocket(backendUrl);
      this.ws.on('open', () => {
        this.setStatus('🟢 CogLoad: Connected');
        this.startSending();
      });
      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          this.handleLoadResponse(JSON.parse(data.toString()) as LoadResponse);
        } catch { /* ignore parse errors */ }
      });
      this.ws.on('close', () => {
        this.setStatus('🔴 CogLoad: Reconnecting...');
        this.stopSending();
        this.scheduleReconnect();
      });
      this.ws.on('error', () => {
        this.setStatus('🔴 CogLoad: Backend offline');
      });
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private startSending(): void {
    const { intervalSeconds } = this.getConfig();
    this.interval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const snapshot: TelemetrySnapshot = this.collector.getSnapshot();
        this.ws.send(JSON.stringify(snapshot));
        this.collector.resetWindow();
      }
    }, intervalSeconds * 1000);
  }

  private stopSending(): void {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  private handleLoadResponse(response: LoadResponse): void {
    const { score, state, message, suggestion } = response;
    const emoji = score <= 3 ? '🟢' : score <= 5 ? '🟡' : score <= 7 ? '🟠' : '🔴';
    const label = state === 'flow' ? '⚡ Flow' : state.charAt(0).toUpperCase() + state.slice(1);
    this.setStatus(`${emoji} CogLoad: ${score}/10 · ${label}`);

    const { showNotifications } = this.getConfig();
    if (showNotifications && state !== 'flow' && state !== 'normal' && message) {
      vscode.window.showInformationMessage(`🧠 ${message}`, 'View Suggestion').then(action => {
        if (action === 'View Suggestion') {
          vscode.window.showInformationMessage(`💡 ${suggestion}`);
        }
      });
    }
  }

  private setStatus(text: string): void { this.statusBar.text = text; }

  public dispose(): void {
    this.stopSending();
    this.ws?.close();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.statusBar.dispose();
  }
}
