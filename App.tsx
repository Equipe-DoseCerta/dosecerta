// App.tsx
console.log('🔥 [App.tsx] Linha 1 - Importando Firebase...');
import './src/services/firebase'; // ✅ PRIMEIRO IMPORT
console.log('🔥 [App.tsx] Firebase importado com sucesso!');
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import DrawerNavigator from './src/navigation/DrawerNavigator';
import NativeAlarmService from './src/services/NativeAlarmService';
import { fetchMedicamentos } from './src/database/database';
import { StatusBar, LogBox } from 'react-native';
import NotificationService from './src/services/NotificationService';
import { ModalProvider } from './src/components/ModalContext';

console.log('🔥 [App.tsx] Todos os imports concluídos!');

// 🔇 Suprimir warnings
LogBox.ignoreAllLogs(true);

LogBox.ignoreLogs([
  'This method is deprecated',
  'React Native Firebase',
  'will be removed in the next major release',
  'Please see migration guide',
  'namespaced API',
  'modular SDK API',
  'getApp()',
  'requestPermission()',
  'subscribeToTopic()',
  'onMessage()',
  'setBackgroundMessageHandler()',
  'onNotificationOpenedApp()',
  'getInitialNotification()',
  'InteractionManager has been deprecated',
  'Parse Error',
  'play store page',
  'latest app version info',
  'Console messages are currently cleared',
]);

const App = () => {
  console.log('🔥 [App.tsx] Componente App renderizado!');
  
  useEffect(() => {
    console.log('🔥 [App.tsx] useEffect executado!');
    
    const inicializarAlarmes = async () => {
      console.log('📱 App inicializado - Configurando callback de reagendamento...');
      
      NativeAlarmService.setReagendarCallback(async () => {
        console.log('🔄 Callback de reagendamento executado!');
        try {
          const medicamentos = await fetchMedicamentos();
          const ativos = medicamentos.filter(m => m.ativo);
          await NativeAlarmService.reagendarTodosMedicamentos(ativos);
          console.log('✅ Alarmes reagendados com sucesso após boot!');
        } catch (error) {
          console.error('❌ Erro ao reagendar alarmes:', error);
        }
      });

      console.log('✔ Callback de reagendamento registrado');
    };

    inicializarAlarmes();
    NotificationService.initialize();
  }, []);

  console.log('🔥 [App.tsx] Retornando JSX...');
  
  return (
    <SafeAreaProvider>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <ModalProvider>
        <NavigationContainer>
          <DrawerNavigator />
        </NavigationContainer>
      </ModalProvider>
    </SafeAreaProvider>
  );
};

console.log('🔥 [App.tsx] App exportado!');
export default App;