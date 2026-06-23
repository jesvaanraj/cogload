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
exports.TelemetryCollector = void 0;
const vscode = __importStar(require("vscode"));
class TelemetryCollector {
    constructor() {
        this.keystrokeTimestamps = [];
        this.backspaceCount = 0;
        this.totalKeystrokes = 0;
        this.pasteCount = 0;
        this.typedCount = 0;
        this.pauseStartTime = null;
        this.pauseDurations = [];
        this.sessionStartTime = Date.now();
        this.pauseThresholdMs = 2000;
        this.windowMs = 30000;
        this.disposables = [];
        this.registerListeners();
    }
    registerListeners() {
        // Track every keystroke
        this.disposables.push(vscode.workspace.onDidChangeTextDocument((event) => {
            const now = Date.now();
            for (const change of event.contentChanges) {
                const text = change.text;
                const rangeLength = change.rangeLength;
                // Detect backspace (empty text + deleted range)
                if (text === '' && rangeLength > 0) {
                    this.backspaceCount++;
                    this.totalKeystrokes++;
                }
                // Detect paste (multi-char insert at once)
                else if (text.length > 2 && !text.includes('\n')) {
                    this.pasteCount++;
                    this.totalKeystrokes++;
                }
                // Normal typing
                else if (text.length > 0) {
                    this.typedCount++;
                    this.totalKeystrokes++;
                    this.keystrokeTimestamps.push(now);
                }
                // Pause detection: if we had a pause, record it
                if (this.pauseStartTime !== null) {
                    const pauseDuration = now - this.pauseStartTime;
                    if (pauseDuration >= this.pauseThresholdMs) {
                        this.pauseDurations.push(pauseDuration);
                    }
                    this.pauseStartTime = null;
                }
            }
            // Start measuring next pause
            this.pauseStartTime = now;
        }));
    }
    // Clean data older than 30 seconds
    pruneOldData() {
        const cutoff = Date.now() - this.windowMs;
        this.keystrokeTimestamps = this.keystrokeTimestamps.filter(t => t > cutoff);
    }
    // Calculate WPM from keystrokes in last 30s
    calculateWPM() {
        this.pruneOldData();
        const keystrokes = this.keystrokeTimestamps.length;
        const minutes = this.windowMs / 1000 / 60;
        const words = keystrokes / 5; // average word = 5 chars
        return Math.round(words / minutes);
    }
    // Backspace rate per 100 keystrokes
    calculateErrorRate() {
        if (this.totalKeystrokes === 0)
            return 0;
        return Math.round((this.backspaceCount / this.totalKeystrokes) * 100);
    }
    // Backspaces per minute
    calculateBackspaceRate() {
        const sessionMinutes = (Date.now() - this.sessionStartTime) / 1000 / 60;
        if (sessionMinutes === 0)
            return 0;
        return Math.round(this.backspaceCount / sessionMinutes);
    }
    // Average pause duration in ms
    calculateAvgPause() {
        if (this.pauseDurations.length === 0)
            return 0;
        const sum = this.pauseDurations.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.pauseDurations.length);
    }
    // Ratio of pasted vs typed (0–1)
    calculatePasteRatio() {
        const total = this.pasteCount + this.typedCount;
        if (total === 0)
            return 0;
        return parseFloat((this.pasteCount / total).toFixed(2));
    }
    // Full snapshot for this window
    getSnapshot() {
        return {
            timestamp: Date.now(),
            wpm: this.calculateWPM(),
            errorRate: this.calculateErrorRate(),
            backspaceRate: this.calculateBackspaceRate(),
            pauseAvgMs: this.calculateAvgPause(),
            pasteRatio: this.calculatePasteRatio(),
            sessionMinutes: Math.round((Date.now() - this.sessionStartTime) / 1000 / 60),
        };
    }
    // Reset counters after each snapshot is sent
    resetWindow() {
        this.backspaceCount = 0;
        this.totalKeystrokes = 0;
        this.pasteCount = 0;
        this.typedCount = 0;
        this.pauseDurations = [];
        this.keystrokeTimestamps = [];
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
exports.TelemetryCollector = TelemetryCollector;
//# sourceMappingURL=telemetry.js.map