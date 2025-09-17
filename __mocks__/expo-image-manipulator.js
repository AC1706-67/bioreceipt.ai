export const SaveFormat = {
  JPEG: 'jpeg',
  PNG: 'png',
};

export const manipulateAsync = jest.fn((uri, actions, options) => 
  Promise.resolve({
    uri: 'mock://manipulated-image.jpg',
    width: 100,
    height: 100,
  })
);

export default {
  SaveFormat,
  manipulateAsync,
};