// src/screens/HomeScreen.tsx
import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  BackHandler,
  NativeModules,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import { theme } from '../constants/theme';
import { useModal } from '../components/ModalContext';




const { PermissionDialogModule, AppCloserModule } = NativeModules;

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Home'
>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { showModal } = useModal();

  const menuButtons = [
    { id: 1, title: 'Cadastrar Medicamento', icon: '➕', colors: ['#FF9E44', '#FF7A00'], screen: 'CadastroMedicamento' as const },
    { id: 2, title: 'Medicamentos Ativos',   icon: '🔔', colors: ['#FF4081', '#FF0000'], screen: 'Alertas' as const },
    { id: 3, title: 'Controle de Estoque',   icon: '📦', colors: ['#2196F3', '#0D47A1'], screen: 'ControleEstoque' as const },
    { id: 4, title: 'Histórico',             icon: '📋', colors: ['#9C27B0', '#6A1B9A'], screen: 'Historico' as const },
    { id: 5, title: 'Buscar Medicamento',    icon: '🔍', colors: ['#00C9A7', '#00796B'], screen: 'BuscarMedicamento' as const },
    { id: 6, title: 'Sobre o App',           icon: 'ℹ️', colors: ['#607D8B', '#455A64'], screen: 'Sobre' as const },
  ];

  const handleButtonPress = (screenName: keyof RootStackParamList) => {
    try {
      navigation.navigate(screenName);
    } catch (error) {
      console.log('Erro ao navegar:', error);
      showModal({
        type: 'error',
        message: 'Erro ao navegar para a tela',
      });
    }
  };


  // ======================================================
  // 🔐 PERMISSÕES
  // ======================================================
  useEffect(() => {
    if (Platform.OS === 'android' && PermissionDialogModule) {
      let isMounted = true;

      const timer = setTimeout(() => {
        if (!isMounted) return;

        PermissionDialogModule.showPermissionDialogsIfNeeded()
          .then((shown: boolean) => {
            if (!isMounted) return;
            console.log(shown
              ? '✅ Diálogos exibidos'
              : 'ℹ️ Já exibidos anteriormente');
          })
          .catch((error: any) => {
            if (!isMounted) return;
            console.error('❌ Erro permissões:', error);
          });
      }, 800);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, []);

  // ======================================================
  // 🔙 BOTÃO VOLTAR
  // ======================================================
  const handleBackPress = useCallback(() => {
    showModal({
      type: 'confirmation',
      title: 'Sair do DoseCerta',
      message: 'Deseja realmente fechar o aplicativo?',
      confirmText: 'Sim, Sair',
      cancelText: 'Cancelar',
      onConfirm: () => {
        if (
          Platform.OS === 'android' &&
          AppCloserModule?.closeAppAggressively
        ) {
          AppCloserModule.closeAppAggressively();
        } else {
          BackHandler.exitApp();
        }
      },
    });
    return true;
  }, [showModal]);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackPress
      );
      return () => backHandler.remove();
    }, [handleBackPress])
  );

  // ======================================================
  // 🎨 UI
  // ======================================================
  return (
    <ScreenContainer showGradient={true}>
      <View style={styles.contentContainer}>

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
              onPress={() => handleButtonPress(button.screen)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={button.title}
            >
              {/* ✅ iconContainer: 50 → 60px */}
              <View style={[styles.iconContainer, { backgroundColor: button.colors[0] }]}>
                <Text style={styles.icon}>{button.icon}</Text>
              </View>
              {/* ✅ numberOfLines evita overflow silencioso */}
              <Text style={styles.buttonText} numberOfLines={2}>
                {button.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sua saúde em primeiro lugar!
          </Text>
        </View>

      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: '5%',
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },

  // ✅ height: 150 fixo → flex proporcional, estável em qualquer device
  logoWrapper: {
    flex: 0.22,
    minHeight: 120,
    maxHeight: 160,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    ...theme.shadows.large,
    overflow: 'hidden',
  },
  logo: { width: '50%', height: '45%' },
  nomeApp: { width: '80%', height: '40%' },

  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'flex-start',
  },

  button: {
    width: '48%',
    height: 120,                      // Valor fixo seguro — não depende de flex pai
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },

  // ✅ 50 → 60px
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ✅ 28 → 32px
  icon: { fontSize: 32 },

  // ✅ 13 → 15px + lineHeight
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    color: theme.colors.primary,
    lineHeight: 20,
  },

  // ✅ Footer simples — sem margem artificial
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  footerText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgb(255, 255, 255)',
  },
});

export default HomeScreen;