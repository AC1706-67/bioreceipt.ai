const store = new Map();

export default {
  setItem: jest.fn((k, v) => { store.set(k, v); return Promise.resolve(); }),
  getItem: jest.fn((k) => Promise.resolve(store.get(k) ?? null)),
  removeItem: jest.fn((k) => { store.delete(k); return Promise.resolve(); }),
  clear: jest.fn(() => { store.clear(); return Promise.resolve(); }),
  getAllKeys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
};