import { AppRegistry, StyleSheet } from 'react-native';
import { name as appName } from './app.json';
import App from './App';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

// Usando React.createElement para evitar a sintaxe JSX que causava o erro de parsing
const Root = () => React.createElement(
  GestureHandlerRootView,
  { style: styles.root },
  React.createElement(App)
);

AppRegistry.registerComponent(appName, () => Root);
