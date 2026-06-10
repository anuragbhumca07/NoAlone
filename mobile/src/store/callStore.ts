import { create } from 'zustand';

export type CallType = 'VOICE' | 'VIDEO';
export type CallDirection = 'outgoing' | 'incoming';

export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  callType: CallType;
  meetLink: string;
}

export interface OutgoingCallData {
  callId: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string | null;
  callType: CallType;
  meetLink: string | null;
}

interface CallState {
  incomingCall: IncomingCallData | null;
  outgoingCall: OutgoingCallData | null;
  isGoogleAuthorized: boolean;
  activeCallId: string | null;
  setIncomingCall: (data: IncomingCallData | null) => void;
  setOutgoingCall: (data: OutgoingCallData | null) => void;
  setGoogleAuthorized: (authorized: boolean) => void;
  setActiveCallId: (id: string | null) => void;
  clearCalls: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  incomingCall: null,
  outgoingCall: null,
  isGoogleAuthorized: false,
  activeCallId: null,

  setIncomingCall: (incomingCall) => set({ incomingCall }),
  setOutgoingCall: (outgoingCall) => set({ outgoingCall }),
  setGoogleAuthorized: (isGoogleAuthorized) => set({ isGoogleAuthorized }),
  setActiveCallId: (activeCallId) => set({ activeCallId }),
  clearCalls: () => set({ incomingCall: null, outgoingCall: null, activeCallId: null }),
}));
