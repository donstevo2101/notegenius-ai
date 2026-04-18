import { NativeModule, requireNativeModule, EventEmitter } from "expo";

export type CallState = "ringing" | "connected" | "ended" | "missed";
export type CallDirection = "incoming" | "outgoing" | "unknown";

export interface CallEventPayload {
  state: CallState;
  direction: CallDirection;
  remoteNumber: string | null;
  contactName: string | null;
  timestamp: number;
}

export interface CallDetectorPermissionStatus {
  granted: boolean;
  canRecordAudio: boolean;
  canReadCallLog: boolean;
  platform: "ios" | "android";
}

declare class CallDetectorModuleType extends NativeModule {
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  isMonitoring(): boolean;
  requestPermissions(): Promise<CallDetectorPermissionStatus>;
  getPermissions(): Promise<CallDetectorPermissionStatus>;
  startCallRecording(filename: string): Promise<string>;
  stopCallRecording(): Promise<string | null>;
  isRecording(): boolean;
  addListener(eventName: "onCallEvent"): void;
  removeListeners(count: number): void;
}

const CallDetectorModule =
  requireNativeModule<CallDetectorModuleType>("CallDetectorModule");

export const callEvents = new EventEmitter<{
  onCallEvent: (payload: CallEventPayload) => void;
}>(CallDetectorModule);

export default CallDetectorModule;
