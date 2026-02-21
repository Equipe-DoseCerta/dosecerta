// App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import DrawerNavigator from './src/navigation/DrawerNavigator';
import NativeAlarmService from './src/services/NativeAlarmService';
import { fetchMedicamentos } from './src/database/database';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'InteractionManager has been deprecated and will be removed in a future release.'
]);


const App = () => {
  useEffect(() => {
    // 🔥 Executado UMA VEZ quando o App monta
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

      console.log('📝 Callback de reagendamento registrado');
    };

    inicializarAlarmes();
  }, []); // ⚠️ Array vazio = executa APENAS na montagem

  return (
    <NavigationContainer>
      <DrawerNavigator />
    </NavigationContainer>
  );
};

export default App;