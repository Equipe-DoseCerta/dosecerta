import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator'; // ajuste o caminho para seu arquivo de tipos
import DeviceInfo from 'react-native-device-info';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [appVersion, setAppVersion] = useState(''); // Estado para a versão

  // Referências de animação
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const iconPulseAnim = useRef(new Animated.Value(1)).current;
  const iconRotateAnim = useRef(new Animated.Value(0)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(0.8)).current;
  
  // Efeito para carregar a versão e iniciar as animações
  useEffect(() => {
    // 1. Carregar a versão do aplicativo
    const loadVersion = () => {
        const version = DeviceInfo.getVersion();
        setAppVersion(version);
    };
    loadVersion();

    // 2. Definir as funções de animação
    const startAnimations = () => {
      // Animações iniciais (fade e scale)
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Animação de pulso do ícone (loop)
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(iconPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Animação de rotação do ícone (loop)
      Animated.loop(
        Animated.timing(iconRotateAnim, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        })
      ).start();
    };

    // 3. Temporizador para finalizar o loading e iniciar as animações do botão
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
      startAnimations();
      
      // Animações do botão (após o loading)
      Animated.parallel([
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    return () => clearTimeout(loadingTimer);
  }, [fadeAnim, scaleAnim, iconPulseAnim, iconRotateAnim, buttonFadeAnim, buttonScaleAnim]); // Dependências de animação

  const rotate = iconRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const colors = {
    primary: '#054f77',
    secondary: '#0a7ab8',
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    white: '#ffffff',
    card: '#ffffff',
  };

  /**
   * FUNÇÃO CORRIGIDA: Usa CommonActions.reset para navegar para 'Home'.
   * Isso remove 'Welcome' (e 'Splash') do histórico, impedindo o retorno.
   */
  const handleStart = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }], // Define 'Home' como a única tela na pilha
      })
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <Animated.View style={[styles.mainContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.content}>
          <Animated.View style={[styles.iconWrapper, { transform: [{ scale: iconPulseAnim }, { rotate }] }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
              <Text style={styles.icon}>👋</Text>
            </View>
          </Animated.View>

          <View style={styles.textSection}>
            <Text style={[styles.title, { color: colors.white }]}>Bem-vindo ao DoseCerta</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Sua jornada para uma vida mais saudável começa aqui.
            </Text>
          </View>

          {isLoading && (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Preparando tudo para você...
              </Text>
            </View>
          )}

          {!isLoading && (
            <Animated.View style={[styles.buttonContainer, { opacity: buttonFadeAnim, transform: [{ scale: buttonScaleAnim }] }]}>
              <TouchableOpacity style={[styles.beginButton, { backgroundColor: colors.white }]} onPress={handleStart}>
                <Text style={[styles.beginButtonText, { color: colors.primary }]}>Começar</Text>
                <Text style={styles.beginButtonIcon}>➡️</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
        {/* RODAPÉ FUNCIONAL: appVersion está no estado e é carregado no useEffect */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Versão {appVersion}</Text>
          <Text style={styles.footerSmallText}>© DoseCerta {new Date().getFullYear()}</Text>
        </View>        
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainContainer: { paddingHorizontal: 20, paddingVertical: 40, alignItems: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  iconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 50 },
  textSection: { alignItems: 'center', marginBottom: 60 },
  title: { fontSize: 48, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 18, textAlign: 'center', lineHeight: 26, fontWeight: '300' },
  loadingSection: { alignItems: 'center', marginTop: 40 },
  loadingText: { fontSize: 18, marginTop: 16, fontWeight: '300' },
  buttonContainer: { marginTop: 10, width: '100%', alignItems: 'center' },
  beginButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  beginButtonText: { fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  beginButtonIcon: { fontSize: 18 },
  footer: {
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    backgroundColor: 'rgba(122, 15, 15, 0.1)',
  },
  versionText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    fontWeight: '500',
  },
  footerSmallText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.6,
    marginTop: 2,
  },
});

export default WelcomeScreen;