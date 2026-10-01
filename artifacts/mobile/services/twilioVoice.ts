import {
  Call,
  Voice,
  type TwilioErrors,
} from "@twilio/voice-react-native-sdk";
import { Platform } from "react-native";

export type PrivateCallState =
  | "connecting"
  | "ringing"
  | "connected"
  | "reconnecting"
  | "ended"
  | "failed";

type StateListener = (state: PrivateCallState, message?: string) => void;

const voice = Platform.OS === "web" ? null : new Voice();
let activeCall: Call | null = null;

function errorMessage(error?: TwilioErrors.TwilioError): string | undefined {
  return error?.message || undefined;
}

export async function startPrivateVoiceCall(args: {
  accessToken: string;
  parameters: Record<string, string>;
  displayName?: string;
  onState: StateListener;
}): Promise<void> {
  if (!voice) {
    throw new Error("Private calls require the LoopIn Android or iPhone app.");
  }
  if (activeCall) {
    await activeCall.disconnect().catch(() => undefined);
    activeCall = null;
  }

  args.onState("connecting");
  const call = await voice.connect(args.accessToken, {
    params: args.parameters,
    contactHandle: args.displayName || args.parameters.To || "Private call",
    notificationDisplayName: args.displayName || "LoopIn private call",
  });
  activeCall = call;

  call.on(Call.Event.Ringing, () => args.onState("ringing"));
  call.on(Call.Event.Connected, () => args.onState("connected"));
  call.on(Call.Event.Reconnecting, (error) =>
    args.onState("reconnecting", errorMessage(error)),
  );
  call.on(Call.Event.Reconnected, () => args.onState("connected"));
  call.on(Call.Event.ConnectFailure, (error) => {
    if (activeCall === call) activeCall = null;
    args.onState("failed", errorMessage(error));
  });
  call.on(Call.Event.Disconnected, (error) => {
    if (activeCall === call) activeCall = null;
    args.onState(error ? "failed" : "ended", errorMessage(error));
  });
}

export async function hangUpPrivateVoiceCall(): Promise<void> {
  const call = activeCall;
  activeCall = null;
  if (call) await call.disconnect();
}

export async function setPrivateVoiceCallMuted(muted: boolean): Promise<boolean> {
  if (!activeCall) return false;
  return activeCall.mute(muted);
}
