import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet, Platform, View } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { theme } from '../constants/theme';

// Telas Principais
import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import CadastroMedicamento from '../screens/CadastroMedicamento';
import AlertasScreen from '../screens/MedicamentosAtivosScreen';
import ControleEstoque from '../screens/ControleEstoqueScreen';
import Historico from '../screens/HistoricoScreen';
import BuscarMedicamento from '../screens/BuscarMedicamento';
import SobreScreen from '../screens/SobreScreen';
import TermosDeUsoScreen from '../screens/TermosDeUsoScreen';
import LGPDScreen from '../screens/LGPDScreen';

// Menu e Conteúdo
import EmConstrucao from '../screens/EmConstrucao';
import MuralScreen from '../screens/MuralScreen';

// Preferências e Suporte
import PreferenciasAlarmes from '../screens/PreferenciasAlarmes';
import PreferenciasBackup from '../screens/PreferenciasBackup';
import AjudaScreen from '../screens/AjudaScreen';

// REMOVIDO: VideosScreen, AudiosScreen e GuiaRemediosScreen
// foram removidos para conformidade com as políticas do Google Play.
// Estas telas serão reintroduzidas futuramente quando a conta
// for migrada para organização.

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
  Mural: undefined;
  PreferenciasAlarmes: undefined;
  PreferenciasBackup: undefined;
  EmConstrucao: undefined;
  Ajuda: undefined;
  // REMOVIDO: Videos, Audios, GuiaRemedios
};

const Stack = createStackNavigator();
const HAMBURGER_WIDTH = 44;

const HamburgerIcon = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      style={styles.hamburgerButton}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      activeOpacity={0.6}
      accessibilityLabel="Abrir menu"
    >
      <View style={styles.hamburgerIconContainer}>
        <View style={styles.hamburgerLineLong} />
        <View style={styles.hamburgerLineShort} />
        <View style={styles.hamburgerLineLong} />
      </View>
    </TouchableOpacity>
  );
};

const CustomHeaderTitle = ({ children }: { children: string }) => {
  const title = children;
  const getFontSize = (text: string) => {
    if (text.length > 25) return 14;
    if (text.length > 20) return 16;
    return 18;
  };

  return (
    <View style={styles.titleContainer}>
      <Text
        style={[styles.headerTitle, { fontSize: getFontSize(title) }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
    </View>
  );
};

const HeaderRightSpacer = () => <View style={styles.headerRightSpacer} />;

const screenTitles: Record<string, string> = {
  Home: 'Menu Inicial',
  CadastroMedicamento: 'Cadastro de Medicamentos',
  Alertas: 'Medicamentos Ativos',
  ControleEstoque: 'Controle de Estoque',
  Historico: 'Histórico de Medicamentos',
  BuscarMedicamento: 'Buscar Medicamentos',
  Sobre: 'Sobre o Aplicativo',
  TermosDeUso: 'Termos',
  LGPD: 'Privacidade',
  EmConstrucao: 'Em Breve',
  Mural: 'Mural de Notícias',
  PreferenciasAlarmes: 'Configurações de Alarmes',
  PreferenciasBackup: 'Backup/Restauração',
  Ajuda: 'Ajuda',
  // REMOVIDO: Videos, Audios, GuiaRemedios
};

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: true,
        headerStyle: styles.headerStyle,
        headerTintColor: theme.colors.textWhite,
        headerTitleAlign: 'center',
        headerLeft: HamburgerIcon,
        headerTitle: CustomHeaderTitle,
        headerLeftContainerStyle: styles.headerLeftContainer,
        headerRight: HeaderRightSpacer,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Welcome" component={WelcomeScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: screenTitles.Home }} />

      <Stack.Screen name="CadastroMedicamento" component={CadastroMedicamento} options={{ title: screenTitles.CadastroMedicamento }} />
      <Stack.Screen name="Alertas" component={AlertasScreen} options={{ title: screenTitles.Alertas }} />
      <Stack.Screen name="ControleEstoque" component={ControleEstoque} options={{ title: screenTitles.ControleEstoque }} />
      <Stack.Screen name="Historico" component={Historico} options={{ title: screenTitles.Historico }} />
      <Stack.Screen name="BuscarMedicamento" component={BuscarMedicamento} options={{ title: screenTitles.BuscarMedicamento }} />

      <Stack.Screen name='Sobre' component={SobreScreen} options={{ title: screenTitles.Sobre }} />
      <Stack.Screen name='TermosDeUso' component={TermosDeUsoScreen} options={{ title: screenTitles.TermosDeUso }} />
      <Stack.Screen name='LGPD' component={LGPDScreen} options={{ title: screenTitles.LGPD }} />

      <Stack.Screen name='EmConstrucao' component={EmConstrucao as any} options={{ title: screenTitles.EmConstrucao }} />
      <Stack.Screen name='Mural' component={MuralScreen} options={{ title: screenTitles.Mural }} />

      {/* REMOVIDO: Videos, Audios e GuiaRemedios */}

      <Stack.Screen name='PreferenciasAlarmes' component={PreferenciasAlarmes} options={{ title: screenTitles.PreferenciasAlarmes }} />
      <Stack.Screen name='PreferenciasBackup' component={PreferenciasBackup} options={{ title: screenTitles.PreferenciasBackup }} />
      <Stack.Screen name='Ajuda' component={AjudaScreen} options={{ title: screenTitles.Ajuda }} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  headerStyle: {
    backgroundColor: theme.colors.primary,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
    height: Platform.OS === 'android' ? 64 : 100,
  },
  headerLeftContainer: {
    paddingLeft: theme.spacing.md,
  },
  headerRightSpacer: {
    width: HAMBURGER_WIDTH + theme.spacing.md,
  },
  hamburgerButton: {
    width: HAMBURGER_WIDTH,
    height: HAMBURGER_WIDTH,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 5,
  },
  hamburgerIconContainer: {
    width: 24,
    height: 16,
    justifyContent: 'space-between',
  },
  hamburgerLineLong: {
    width: 22,
    height: 2.5,
    backgroundColor: theme.colors.textWhite,
    borderRadius: 4,
  },
  hamburgerLineShort: {
    width: 16,
    height: 2.5,
    backgroundColor: theme.colors.textWhite,
    borderRadius: 4,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: theme.colors.textWhite,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
});

export default AppNavigator;
