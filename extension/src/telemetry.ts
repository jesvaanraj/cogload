import * as vscode from 'vscode';

export interface TelemetrySnapshot {
  session_id: string;
  timestamp: number;
  wpm: number;
  error_rate: number;
  backspace_rate: number;
  pause_avg_ms: number;
  paste_ratio: number;
  session_minutes: number;
  active_language: string;
}

export class TelemetryCollector {
  private keystrokeTimestamps: number[] = [];
  private backspaceCount = 0;
  private totalKeystrokes = 0;
  private pasteCount = 0;
  private typedCount = 0;
  private pauseStartTime: number | null = null;
  private pauseDurations: number[] = [];
  private sessionStartTime = Date.now();
  private readonly pauseThresholdMs = 2000;
  private readonly windowMs = 30000;
  private disposables: vscode.Disposable[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = `session_${Date.now()}`;
    this.registerListeners();
  }

  private registerListeners(): void {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const now = Date.now();
        for (const change of event.contentChanges) {
          const text = change.text;
          const rangeLength = change.rangeLength;

          if (text === '' && rangeLength > 0) {
            this.backspaceCount++;
            this.totalKeystrokes++;
          } else if (text.length > 2 && !text.includes('\n')) {
            this.pasteCount++;
            this.totalKeystrokes++;
          } else if (text.length > 0) {
            this.typedCount++;
            this.totalKeystrokes++;
            this.keystrokeTimestamps.push(now);
          }

          if (this.pauseStartTime !== null) {
            const pauseDuration = now - this.pauseStartTime;
            if (pauseDuration >= this.pauseThresholdMs) {
              this.pauseDurations.push(pauseDuration);
            }
            this.pauseStartTime = null;
          }
        }
        this.pauseStartTime = Date.now();
      })
    );
  }

  private pruneOldData(): void {
    const cutoff = Date.now() - this.windowMs;
    this.keystrokeTimestamps = this.keystrokeTimestamps.filter(t => t > cutoff);
  }

  private getWPM(): number {
    this.pruneOldData();
    return Math.round(this.keystrokeTimestamps.length / 5 / (this.windowMs / 60000));
  }

  private getErrorRate(): number {
    if (this.totalKeystrokes === 0) return 0;
    return parseFloat(((this.backspaceCount / this.totalKeystrokes) * 100).toFixed(2));
  }

  private getBackspaceRate(): number {
    const sessionMinutes = (Date.now() - this.sessionStartTime) / 60000;
    if (sessionMinutes === 0) return 0;
    return parseFloat((this.backspaceCount / sessionMinutes).toFixed(2));
  }

  private getAvgPauseMs(): number {
    if (this.pauseDurations.length === 0) return 0;
    return Math.round(this.pauseDurations.reduce((a, b) => a + b, 0) / this.pauseDurations.length);
  }

  private getPasteRatio(): number {
    const total = this.pasteCount + this.typedCount;
    if (total === 0) return 0;
    return parseFloat((this.pasteCount / total).toFixed(2));
  }

  private getActiveLanguage(): string {
    return vscode.window.activeTextEditor?.document.languageId ?? 'unknown';
  }

  public getSnapshot(): TelemetrySnapshot {
    return {
      session_id: this.sessionId,
      timestamp: Date.now(),
      wpm: this.getWPM(),
      error_rate: this.getErrorRate(),
      backspace_rate: this.getBackspaceRate(),
      pause_avg_ms: this.getAvgPauseMs(),
      paste_ratio: this.getPasteRatio(),
      session_minutes: parseFloat(((Date.now() - this.sessionStartTime) / 60000).toFixed(2)),
      active_language: this.getActiveLanguage(),
    };
  }

  public resetWindow(): void {
    this.backspaceCount = 0;
    this.totalKeystrokes = 0;
    this.pasteCount = 0;
    this.typedCount = 0;
    this.pauseDurations = [];
    this.keystrokeTimestamps = [];
  }

  public resetSession(): void {
    this.resetWindow();
    this.sessionStartTime = Date.now();
    this.sessionId = `session_${Date.now()}`;
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
