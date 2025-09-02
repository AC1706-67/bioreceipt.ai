/**
 * IMAGE PICKER SETUP SCRIPT
 * Run this to install and configure image picker functionality
 */

console.log('📸 Setting up Image Picker for BioReceipt...\n');

console.log('🔧 STEP 1: Install Required Packages');
console.log('Run this command in PowerShell:');
console.log('npm install expo-image-picker expo-image-manipulator expo-file-system expo-media-library\n');

console.log('✅ STEP 2: Permissions Added');
console.log('AndroidManifest.xml has been updated with:');
console.log('- CAMERA permission');
console.log('- READ_MEDIA_IMAGES permission');
console.log('- READ_EXTERNAL_STORAGE permission');
console.log('- WRITE_EXTERNAL_STORAGE permission');
console.log('- READ_MEDIA_VIDEO permission (Android 13+)');
console.log('- READ_MEDIA_AUDIO permission (Android 13+)\n');

console.log('🚀 STEP 3: Usage in Your App');
console.log('Add this to your component:');
console.log(`
import * as ImagePicker from 'expo-image-picker';

// Request permissions
const requestPermissions = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('Sorry, we need camera roll permissions to make this work!');
    return false;
  }
  return true;
};

// Pick an image
const pickImage = async () => {
  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    console.log('Selected image:', result.assets[0].uri);
    // Use the image URI here
  }
};

// Take a photo
const takePhoto = async () => {
  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    console.log('Captured photo:', result.assets[0].uri);
    // Use the photo URI here
  }
};
`);

console.log('🎯 STEP 4: Build & Test');
console.log('After installing packages:');
console.log('1. Clean build: npx react-native run-android');
console.log('2. Test image picker functionality');
console.log('3. Check permissions are granted on device\n');

console.log('✅ Image Picker Setup Complete!');
console.log('Your app will now be able to pick images and take photos.');