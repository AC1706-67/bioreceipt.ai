export const createResizedImage = jest.fn((uri, width, height, format, quality) => 
  Promise.resolve({
    uri: 'mock://resized-image.jpg',
    width,
    height,
    size: 1024,
  })
);

export default {
  createResizedImage,
};