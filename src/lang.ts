export type Lang = 'zh' | 'en';

export const UI = {
  start:           { zh: '开始',            en: 'Begin'               },
  hold:            { zh: '保持',            en: 'Hold'                },
  exploreHead:     { zh: '轻轻转动你的头部',  en: 'Gently move your head' },
  tapToStart:      { zh: '点击圆圈开始引导练习', en: 'Tap circle to start' },
  cameraHint:      { zh: '请确保摄像头权限已开启', en: 'Allow camera access' },
  cameraOn:        { zh: '摄像头已开启',          en: 'Camera active'       },
  sessionComplete: { zh: '练习完成',         en: 'Session Complete'    },
  bgm:             { zh: '背景音乐',         en: 'Music'               },
  sfx:             { zh: '音效',            en: 'SFX'                 },
  uploadMusic:     { zh: '上传音乐',         en: 'Upload Music'        },
  amplitude:       { zh: '幅度预设',         en: 'AMPLITUDE'           },
  custom:          { zh: '定制',            en: 'CUSTOM'              },
  steps:           { zh: '练习步骤',         en: 'STEPS'               },
  musicTip:        { zh: '开启音乐，体验更佳', en: 'Music on for best experience' },
  voiceCues:       { zh: '语音提示',          en: 'Voice'                        },
} as const;

export function t(key: keyof typeof UI, lang: Lang): string {
  return UI[key][lang];
}

const PRESET_LABEL_EN: Record<string, string> = {
  '轻': 'Soft', '中': 'Mid', '深': 'Deep',
};

export function presetLabel(label: string, lang: Lang): string {
  return lang === 'zh' ? label : (PRESET_LABEL_EN[label] ?? label);
}

export function stepLabel(step: { label: string; cue: string }, lang: Lang): string {
  if (lang === 'zh') return step.label;
  return step.cue.replace(/\b\w/g, c => c.toUpperCase());
}
