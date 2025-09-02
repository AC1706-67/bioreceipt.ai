import 'react-native-gesture-handler'; // safe even if you don't use it
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

console.log('[INDEX] loading…', {appName});
AppRegistry.registerComponent(appName, () => App);
