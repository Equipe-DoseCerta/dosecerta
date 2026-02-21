import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';

// Telas
import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import CadastroMedicamento from '../screens/CadastroMedicamento';
import AlertasScreen from '../screens/AlertasScreen';
import ControleEstoque from '../screens/ControleEstoqueScreen';
import Historico from '../screens/HistoricoScreen';
import BuscarMedicamento from '../screens/BuscarMedicamento';
import SobreScreen from '../screens/SobreScreen';
import TermosDeUsoScreen from '../screens/TermosDeUsoScreen';
import LGPDScreen from '../screens/LGPDScreen';

// Menu
import EmConstrucao from '../screens/EmConstrucao';
import DiretasScreen from '../screens/DiretasScreen';
import AvisosScreen from '../screens/AvisosScreen';
import SaudeDiariaScreen from '../screens/SaudeDiariaScreen';
import VideosScreen from '../screens/VideosScreen';
import AudiosScreen from '../screens/AudiosScreen';
import GuiaRemediosScreen from '../screens/GuiaRemediosScreen';
import PreferenciasAlarmes from '../screens/PreferenciasAlarmes';
import PreferenciasBackup from '../screens/PreferenciasBackup';
import AjudaScreen from '../screens/AjudaScreen';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Home: undefined;
  CadastroMedicamento: undefined;
  Alertas: undefined;
  ControleEstoque: undefined;
  Historico: undefined;
  BuscarMedicamento: undefined;
  Sobre: undefined;
  TermosDeUso: undefined;
  LGPD: undefined;
  Diretas: undefined; 
  Avisos: undefined;
  SaudeDiaria: undefined;
  Videos: undefined;
  Audios: undefined;
  GuiaRemedios: undefined;
  PreferenciasAlarmes: undefined;
  PreferenciasBackup: undefined;
  EmConstrucao: undefined;
  Ajuda: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// 📱 Detectar tamanho da tela
const { width } = Dimensions.get('window');
const isSmallDevice = width < 360;
const isMediumDevice = width >= 360 && width < 400;

// Componente do ícone hambúrguer
const HamburgerIcon = () => {
  const navigation = useNavigation();
  
  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <TouchableOpacity 
      style={styles.hamburgerButton} 
      onPress={openDrawer}
      accessibilityLabel="Abrir menu"
    >
      <Text style={styles.hamburgerIcon}>☰</Text>
    </TouchableOpacity>
  );
};

// Componente para headerLeft personalizado
const HeaderLeftWithHamburger = () => <HamburgerIcon />;

// Componente para headerLeft nulo (para telas sem hambúrguer)
const HeaderLeftNull = () => null;

// 🎯 Função para ajustar títulos responsivos
const getResponsiveTitle = (fullTitle: string, emoji: string) => {
  if (isSmallDevice) {
    // Dispositivos pequenos: só emoji
    return emoji;
  } else if (isMediumDevice) {
    // Dispositivos médios: emoji + versão curta
    const shortTitles: Record<string, string> = {
      'Cadastrar Medicamento': 'Cadastrar',
      'Alertas de Medicamentos': 'Alertas',
      'Controle de Estoque': 'Estoque',
      'Histórico Medicamentos': 'Histórico',
      'Buscar Medicamento': 'Buscar',
      'Sobre o Aplicativo': 'Sobre',
      'Política de Privacidade': 'Privacidade',
      'Mensagens Direta': 'Mensagens',
      'Guia de Rémedios': 'Guia',
      'Tipo de Alarme': 'Alarme',
      'Ajustes de Backup': 'Backup',
    };
    
    const shortTitle = shortTitles[fullTitle] || fullTitle;
    return `${emoji} ${shortTitle}`;
  } else {
    // Dispositivos grandes: título completo
    return `${emoji} ${fullTitle}`;
  }
};

const AppNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Splash"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#054f77',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: isSmallDevice ? 14 : isMediumDevice ? 16 : 18,
          color: 'white',
        },
        headerTitleAlign: 'center',
        headerLeft: HeaderLeftWithHamburger,
        // 🔧 Ajuste de espaçamento para evitar sobreposição
        headerLeftContainerStyle: {
          paddingLeft: isSmallDevice ? 8 : 12,
        },
        headerRightContainerStyle: {
          paddingRight: isSmallDevice ? 8 : 12,
        },
        headerTitleContainerStyle: {
          // Garante espaço para o hambúrguer e possível botão direito
          left: isSmallDevice ? 45 : 50,
          right: isSmallDevice ? 45 : 50,
        },
      }}
    >
      <Stack.Screen 
        name="Splash" 
        component={SplashScreen} 
        options={{ 
          headerShown: false,
          headerLeft: HeaderLeftNull,
        }}
      />
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen} 
        options={{ 
          headerShown: false,
          headerLeft: HeaderLeftNull,
        }}
      />
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: getResponsiveTitle('Menu Inicial', '🗂️'),
          headerLeft: HeaderLeftWithHamburger,
        }}
      />
      <Stack.Screen 
        name="CadastroMedicamento" 
        component={CadastroMedicamento}
        options={{ 
          title: getResponsiveTitle('Cadastrar Medicamento', '💊'),
          headerLeft: HeaderLeftWithHamburger,
        }}
      />
      <Stack.Screen 
        name="Alertas" 
        component={AlertasScreen}
        options={{ 
          title: getResponsiveTitle('Alertas de Medicamentos', '🔔'),
          headerLeft: HeaderLeftWithHamburger,
        }}
      />
      <Stack.Screen 
        name="ControleEstoque" 
        component={ControleEstoque}
        options={{ 
          title: getResponsiveTitle('Controle de Estoque', '📦'),
          headerLeft: HeaderLeftWithHamburger,
        }}
      />
      <Stack.Screen 
        name="Historico" 
        component={Historico}
        options={{ 
          title: getResponsiveTitle('Histórico Medicamentos', '📜'),
          headerLeft: HeaderLeftWithHamburger,
        }}
      />
      <Stack.Screen 
        name="BuscarMedicamento" 
        component={BuscarMedicamento}
        options={{ 
          title: getResponsiveTitle('Buscar Medicamento', '🔍'),
          headerLeft: HeaderLeftWithHamburger,
        }}
      />
      <Stack.Screen
        name='Sobre'
        component={SobreScreen}
        options={{ 
          title: getResponsiveTitle('Sobre o Aplicativo', 'ℹ️'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='TermosDeUso'
        component={TermosDeUsoScreen}
        options={{ 
          title: getResponsiveTitle('Termos de Uso', '📄'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='LGPD'
        component={LGPDScreen}
        options={{ 
          title: getResponsiveTitle('Política de Privacidade', '🔒'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='EmConstrucao'
        component={EmConstrucao}
        options={{ 
          title: getResponsiveTitle('Em Construção', '🚧'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='Diretas'
        component={DiretasScreen}
        options={{ 
          title: getResponsiveTitle('Mensagens Direta', '📮'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='Avisos'
        component={AvisosScreen}
        options={{ 
          title: getResponsiveTitle('Avisos', '📮'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='SaudeDiaria'
        component={SaudeDiariaScreen}
        options={{ 
          title: getResponsiveTitle('Saúde Diária', '🌿'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='Videos'
        component={VideosScreen}
        options={{ 
          title: getResponsiveTitle('Vídeos', '🎥'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='Audios'
        component={AudiosScreen}
        options={{ 
          title: getResponsiveTitle('Áudios', '🔉'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='GuiaRemedios'
        component={GuiaRemediosScreen}
        options={{ 
          title: getResponsiveTitle('Guia de Rémedios', '📘'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='PreferenciasAlarmes'
        component={PreferenciasAlarmes}
        options={{ 
          title: getResponsiveTitle('Tipo de Alarme', '🔔'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='PreferenciasBackup'
        component={PreferenciasBackup}
        options={{ 
          title: getResponsiveTitle('Ajustes de Backup', '💾'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
      <Stack.Screen
        name='Ajuda'
        component={AjudaScreen}
        options={{ 
          title: getResponsiveTitle('Ajuda', '🆘'),
          headerLeft: HeaderLeftWithHamburger,
        }}      
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  hamburgerButton: {
    marginLeft: isSmallDevice ? 4 : 8,
    padding: isSmallDevice ? 6 : 8,
    borderRadius: 4,
  },
  hamburgerIcon: {
    fontSize: isSmallDevice ? 20 : 24,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default AppNavigator;