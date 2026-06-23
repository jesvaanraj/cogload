import * as vscode from 'vscode';
import { TelemetryCollector } from './telemetry';
import { TelemetrySender } from './sender';

let collector: TelemetryCollector | undefined;
let sender: TelemetrySender | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('[CogLoad] Extension activated');
  collector = new TelemetryCollector();
  sender = new TelemetrySender(collector);

  context.subscriptions.push(
    vscode.commands.registerCommand('cogload.showDashboard', () => {
      vscode.env.openExternal(vscode.Uri.parse('http://localhost:8000/dashboard'));
    }),
    vscode.commands.registerCommand('cogload.resetSession', () => {
      collector?.resetSession();
      vscode.window.showInformationMessage('🧠 CogLoad: Session reset.');
    }),
    new vscode.Disposable(() => { collector?.dispose(); sender?.dispose(); })
  );
}

export function deactivate() {
  collector?.dispose();
  sender?.dispose();
}
