// index.js

import { AppRegistry, StyleSheet } from 'react-native';
import { name as appName } from './app.json';
import App from './App';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';

// 🆕 Importa a função que será executada em background
import { checkForNewPosts } from './src/services/novidadesChecker'; 

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

// -------------------------------------------------------------------------
// 🆕 REGISTRO DA TAREFA HEADLESS JS
// O nome 'NovidadesCheckerTask' DEVE ser EXATAMENTE o mesmo usado em NovidadesCheckService.kt
// -------------------------------------------------------------------------
AppRegistry.registerHeadlessTask('NovidadesCheckerTask', () => checkForNewPosts); 

console.log('✅ Headless Task "NovidadesCheckerTask" registrada com sucesso!');

// -------------------------------------------------------------------------
// COMPONENTE RAIZ DA APLICAÇÃO
// -------------------------------------------------------------------------
const Root = () => React.createElement(
  GestureHandlerRootView,
  { style: styles.root },
  React.createElement(App)
);

// Registra o componente principal do app
AppRegistry.registerComponent(appName, () => Root);

console.log(`✅ App "${appName}" registrado com sucesso!`);