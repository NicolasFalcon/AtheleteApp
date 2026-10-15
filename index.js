/**
 * @format
 */

import 'react-native-gesture-handler';
// Registers the background location task while the bundle loads.
import './src/features/route/locationTask';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
