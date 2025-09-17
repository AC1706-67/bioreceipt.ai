export const MediaTypeOptions = {
  All: 'All',
  Videos: 'Videos',
  Images: 'Images',
};

export const ImagePickerResult = {
  cancelled: false,
  assets: [
    {
      uri: 'mock://image.jpg',
      width: 100,
      height: 100,
      type: 'image',
    },
  ],
};

export const launchImageLibraryAsync = jest.fn(() => Promise.resolve(ImagePickerResult));
export const launchCameraAsync = jest.fn(() => Promise.resolve(ImagePickerResult));
export const requestMediaLibraryPermissionsAsync = jest.fn(() => Promise.resolve({ status: 'granted' }));
export const requestCameraPermissionsAsync = jest.fn(() => Promise.resolve({ status: 'granted' }));

export default {
  MediaTypeOptions,
  launchImageLibraryAsync,
  launchCameraAsync,
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
};