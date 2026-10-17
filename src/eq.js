// Égaliseur 10 bandes : définitions des bandes et des préréglages (les gains sont en dB).
export const BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const BAND_LABELS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

export const EQ_PRESETS = [
  ['flat', 'Neutre', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  ['bass', 'Bass boost', [7, 6, 5, 3, 1, 0, 0, 0, 0, 0]],
  ['treble', 'Aigus', [0, 0, 0, 0, 0, 1, 2, 4, 5, 6]],
  ['vocal', 'Voix', [-2, -2, -1, 1, 3, 4, 3, 1, 0, -1]],
  ['rock', 'Rock', [4, 3, 2, 0, -1, -1, 1, 3, 4, 5]],
  ['pop', 'Pop', [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2]],
  ['hiphop', 'Hip-hop', [6, 5, 3, 3, 0, -1, 1, 0, 2, 3]],
  ['electro', 'Électro', [5, 4, 1, 0, -2, 2, 1, 1, 4, 5]],
  ['jazz', 'Jazz', [3, 2, 1, 2, -2, -2, 0, 1, 2, 3]],
  ['acoustic', 'Acoustique', [4, 3, 2, 1, 2, 1, 2, 3, 3, 2]],
  ['loud', 'Loudness', [6, 4, 0, 0, -1, 0, -1, 0, 3, 1]],
];

export const presetGains = (id) => (EQ_PRESETS.find((p) => p[0] === id) || EQ_PRESETS[0])[2].slice();
export const matchPreset = (gains) => (EQ_PRESETS.find((p) => p[2].every((g, i) => g === gains[i])) || [null])[0];
