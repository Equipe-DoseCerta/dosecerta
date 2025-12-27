import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  BackHandler, 
  Alert,
  NativeModules,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const { PermissionDialogModule } = NativeModules;

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const colors = {
    primary: '#00030dff',
    secondary: '#0A7AB8',
    cardBackground: '#fff',
    textPrimary: '#054f77',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    white: '#ffffff',
  };

  const menuButtons = [
    { id: 1, title: 'Cadastrar Medicamento', icon: '➕', colors: ['#FF9E44', '#FF7A00'], screen: 'CadastroMedicamento' },
    { id: 2, title: 'Ver Alertas', icon: '🔔', colors: ['#FF4081', '#FF0000'], screen: 'Alertas' },
    { id: 3, title: 'Controle de Estoque', icon: '📦', colors: ['#2196F3', '#0D47A1'], screen:'ControleEstoque' },
    { id: 4, title: 'Histórico', icon: '📋', colors: ['#9C27B0', '#6A1B9A'], screen: 'Historico' },
    { id: 5, title: 'Buscar Medicamento', icon: '🔍', colors: ['#00C9A7', '#00796B'], screen: 'BuscarMedicamento' },
    { id: 6, title: 'Sobre o App', icon: 'ℹ️', colors: ['#607D8B', '#455A64'] ,screen: 'Sobre' },
  ];

  const handleButtonPress = (screenName?: string) => { 
    if (screenName) {
      try {
        navigation.navigate(screenName as any);
      } catch (error) {
        console.log('Erro ao navegar:', error);
      }
    } else {
      console.log('Botão pressionado. Navegação não definida.');
    }
  };

  // 🎯 Exibe os diálogos nativos de permissões quando a tela é carregada
  useEffect(() => {
    if (Platform.OS === 'android' && PermissionDialogModule) {
      let isMounted = true;
      
      // Delay de 800ms para garantir que a tela foi totalmente montada
      const timer = setTimeout(() => {
        if (!isMounted) return;
        
        PermissionDialogModule.showPermissionDialogsIfNeeded()
          .then((shown: boolean) => {
            if (!isMounted) return;
            
            if (shown) {
              console.log('✅ Diálogos de permissões exibidos');
            } else {
              console.log('ℹ️ Diálogos já foram exibidos anteriormente');
            }
          })
          .catch((error: any) => {
            if (!isMounted) return;
            console.error('❌ Erro ao exibir diálogos:', error);
          });
      }, 800);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        Alert.alert(
          'Sair do DoseCerta',
          'Deseja realmente fechar o aplicativo?',
          [
            {
              text: 'Não',
              onPress: () => null,
              style: 'cancel',
            },
            {
              text: 'Sim, sair',
              onPress: () => BackHandler.exitApp(),
            },
          ],
        );
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={[styles.background, { backgroundColor: colors.primary }]} />
      <View style={[styles.backgroundGradient, {
        backgroundColor: colors.secondary
      }]} />

      <View style={[styles.contentContainer, { paddingTop: insets.top + 5 }]}>
        <Animated.View style={[styles.logoWrapper, { opacity: fadeAnim }]}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Image
            source={require('../../assets/images/nomeApp.png')}
            style={styles.nomeApp}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.buttonGrid}>
          {menuButtons.map((button) => (
            <TouchableOpacity
              key={button.id}
              style={styles.button}
              onPress={() => handleButtonPress(button.screen as keyof RootStackParamList)}
            >
              <View style={[styles.iconContainer, {
                backgroundColor: button.colors[0],
              }]}>
                <Text style={styles.icon}>{button.icon}</Text>
              </View>
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>{button.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Sua saúde em primeiro lugar!</Text>
        </View>
      </View>

      {/* ❌ REMOVIDO: <PermissionsCards /> */}
      {/* Agora os diálogos são nativos e aparecem automaticamente */}
    </View>
  );
};

const { height } = Dimensions.get('window');
const isSmallDevice = height < 700;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: isSmallDevice ? 10 : 15, 
    paddingHorizontal: '5%',
  },
  logoWrapper: {
    height: isSmallDevice ? 130 : 150,
    borderRadius: 20,
    marginBottom: isSmallDevice ? 15 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    overflow: 'hidden',
    padding: 0,
  },
  logo: {
    width: '50%',
    height: '40%',
    margin: 0,
  },
  nomeApp: {
    width: '80%',
    height: '40%',
    margin: 0,
  },
  buttonGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: isSmallDevice ? 5 : 10,
  },
  button: {
    width: '48%',
    height: isSmallDevice ? 110 : 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: isSmallDevice ? 10 : 12,
    paddingHorizontal: 8,
    marginBottom: isSmallDevice ? 10 : 12,
    flexDirection: 'column',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconContainer: {
    width: isSmallDevice ? 45 : 50,
    height: isSmallDevice ? 45 : 50,
    borderRadius: isSmallDevice ? 22.5 : 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: isSmallDevice ? 24 : 28,
  },
  buttonText: {
    fontSize: isSmallDevice ? 12 : 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: isSmallDevice ? 6 : 8,
    lineHeight: isSmallDevice ? 16 : 18,
  },
  footer: {
    paddingVertical: isSmallDevice ? 15 : 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '700',
  },
});

export default HomeScreen;