export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorDark?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;

  // agent dispatch configuration
  agentName?: string;

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'Anne',
  pageTitle: 'Anne — Your AI Girlfriend',
  pageDescription: 'Talk to Anne — your playful, multilingual AI girlfriend powered by Gemini',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: false,
  isPreConnectBufferEnabled: true,

  logo: '/anne.png',
  accent: '#6B8F71',
  logoDark: '/anne.png',
  accentDark: '#8FB996',
  startButtonText: 'Talk to Anne',

  audioVisualizerType: 'bar',
  audioVisualizerColor: '#6B8F71',
  audioVisualizerColorDark: '#8FB996',
  audioVisualizerBarCount: 5,

  // Must match @server.rtc_session(agent_name="gemini-agent") in gemini-agent
  agentName: process.env.AGENT_NAME ?? 'gemini-agent',

  sandboxId: undefined,
};
