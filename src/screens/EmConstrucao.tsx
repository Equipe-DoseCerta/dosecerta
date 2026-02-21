import React, { useEffect, useRef } from 'react';
import {
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

// 🎨 Paleta de cores moderna e suave
const COLORS = {
  BACKGROUND: '#F8FAFC', // fundo claro e arejado
  PRIMARY: '#3B82F6',    // azul moderno (tailwind-like)
  PRIMARY_DARK: '#1D4ED8',
  ACCENT: '#F59E0B',     // amarelo suave
  TEXT_PRIMARY: '#1E293B',
  TEXT_SECONDARY: '#64748B',
  CARD_BACKGROUND: '#FFFFFF',
  SHADOW: 'rgba(0, 0, 0, 0.08)',
};

type EmConstrucaoProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmConstrucao'>;
  route: RouteProp<RootStackParamList, 'EmConstrucao'>;
};

const EmConstrucao: React.FC<EmConstrucaoProps> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade-in suave
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Pulsação contínua do emoji
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, pulseAnim]);

  const { width } = Dimensions.get('window');
  const isSmallScreen = width < 375;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.BACKGROUND} />

      {/* Emoji animado */}
      <Animated.View style={[styles.emojiWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={[styles.emoji, isSmallScreen && styles.emojiSmall]}>🛠️</Text>
      </Animated.View>

      <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>
        Em breve novidades! 🚀
      </Text>

      <Text style={[styles.subtitle, isSmallScreen && styles.subtitleSmall]}>
        Essa funcionalidade ainda está sendo construída.{'\n'}
        Agradecemos a sua paciência! ❤️
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonEmoji}>⬅️</Text>
        <Text style={styles.buttonText}>Voltar</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emojiWrapper: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 100,
    padding: 24,
    marginBottom: 24,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  emoji: {
    fontSize: 72,
    textAlign: 'center',
  },
  emojiSmall: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 34,
  },
  titleSmall: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
    marginHorizontal: 20,
  },
  subtitleSmall: {
    fontSize: 14,
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 32,
    marginTop: 32,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    includeFontPadding: false,
  },
});

export default EmConstrucao;