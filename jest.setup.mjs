// Mock chalk module before it's imported
jest.unmock('chalk');

jest.mock('chalk', () => ({
  default: {
    red: (text) => text,
    green: (text) => text,
    yellow: (text) => text,
    blue: (text) => text,
    magenta: (text) => text,
    cyan: (text) => text,
    white: (text) => text,
    gray: (text) => text,
    bold: (text) => text,
    dim: (text) => text,
    italic: (text) => text,
    underline: (text) => text,
    inverse: (text) => text,
    hidden: (text) => text,
    strikethrough: (text) => text,
  },
}));
