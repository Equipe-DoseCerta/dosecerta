import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Linking, 
  Image,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import DeviceInfo from 'react-native-device-info';

type RootStackParamList = {
  Sobre: undefined;
  LGPD: undefined;
  TermosDeUso: undefined;
};

type SobreScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Sobre'>;

// Componente de Card Animado
const AnimatedCard: React.FC<{ 
  children: React.ReactNode; 
  delay?: number;
  style?: any;
}> = ({ children, delay = 0, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Componente de Ícone Emoji
const EmojiIcon: React.FC<{ emoji: string; size?: number }> = ({ emoji, size = 24 }) => (
  <Text style={{ fontSize: size, lineHeight: size + 4 }}>{emoji}</Text>
);

const SobreScreen = () => {
  const navigation = useNavigation<SobreScreenNavigationProp>();
  const [version, setVersion] = useState<string>('');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const getVersion = async () => {
      const appVersion = DeviceInfo.getVersion();
      const buildNumber = DeviceInfo.getBuildNumber();
      setVersion(`${appVersion} (${buildNumber})`);
    };

    getVersion();

    // Animação pulsante do logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  const openExternalLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Erro ao abrir link:', error);
    }
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:equipe.dosecerta.app@gmail.com');
  };

  const appIcon = require('../../assets/images/icon.png');

  return (
    <View style={styles.container}>
      <StatusBar 
        backgroundColor="#0A7AB8" 
        barStyle="light-content" 
        translucent={false}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header com Logo Animado */}
        <AnimatedCard delay={0}>
          <View style={styles.header}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <View style={styles.logoContainer}>
                <Image 
                  source={appIcon}
                  style={styles.logo} 
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
            <Text style={styles.appName}>DoseCerta</Text>
            <View style={styles.sloganContainer}>
              <EmojiIcon emoji="💊" size={18} />
              <Text style={styles.slogan}>Sua saúde em boas mãos</Text>
              <EmojiIcon emoji="❤️" size={18} />
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Objetivo */}
        <AnimatedCard delay={100} style={styles.cardSpacing}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="🎯" size={28} />
              <Text style={styles.cardTitle}>Objetivo do Aplicativo</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>
              O DoseCerta foi desenvolvido para ajudar você a gerenciar 
              seus medicamentos de forma eficiente, com alertas de horário, 
              controle de estoque e histórico completo de tratamentos.
            </Text>
          </View>
        </AnimatedCard>

        {/* Card: Funcionalidades */}
        <AnimatedCard delay={200} style={styles.cardSpacing}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="✨" size={28} />
              <Text style={styles.cardTitle}>Funcionalidades Principais</Text>
            </View>
            <View style={styles.divider} />
            
            <View style={styles.featuresList}>
              {[
                { emoji: '📝', text: 'Cadastro de medicamentos com lembretes inteligentes' },
                { emoji: '⏰', text: 'Alertas de horário e estoque baixo' },
                { emoji: '📊', text: 'Histórico completo de medicamentos' },
                { emoji: '🔍', text: 'Busca avançada por nome ou finalidade' },
              ].map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={styles.featureBullet}>
                    <EmojiIcon emoji={feature.emoji} size={20} />
                  </View>
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Segurança */}
        <AnimatedCard delay={300} style={styles.cardSpacing}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="🔒" size={28} />
              <Text style={styles.cardTitle}>Compromisso com a Segurança</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>
              Seguimos rigorosamente a LGPD (Lei Geral de Proteção de Dados) 
              para garantir a segurança das suas informações pessoais e de saúde.
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('LGPD')} 
              style={styles.linkButton}
              activeOpacity={0.7}
            >
              <EmojiIcon emoji="📄" size={20} />
              <Text style={styles.linkButtonText}>Saiba mais sobre a LGPD</Text>
              <EmojiIcon emoji="→" size={18} />
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Card: Termos de Uso */}
        <AnimatedCard delay={400} style={styles.cardSpacing}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="📋" size={28} />
              <Text style={styles.cardTitle}>Termos de Uso</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>
              O uso do aplicativo implica na aceitação dos nossos termos e 
              condições de uso. Leia com atenção.
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('TermosDeUso')} 
              style={styles.linkButton}
              activeOpacity={0.7}
            >
              <EmojiIcon emoji="📜" size={20} />
              <Text style={styles.linkButtonText}>Ler termos completos</Text>
              <EmojiIcon emoji="→" size={18} />
            </TouchableOpacity>
            
            <View style={styles.warningBox}>
              <EmojiIcon emoji="⚠️" size={24} />
              <Text style={styles.warningText}>
                Atenção: O aplicativo não substitui orientação médica. 
                Consulte sempre um profissional de saúde qualificado.
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Contato */}
        <AnimatedCard delay={500} style={styles.cardSpacing}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="📧" size={28} />
              <Text style={styles.cardTitle}>Contato & Suporte</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>
              Precisa de ajuda ou tem alguma sugestão? 
              Nossa equipe está pronta para atendê-lo!
            </Text>
            <TouchableOpacity 
              onPress={handleEmailPress} 
              style={styles.emailButton}
              activeOpacity={0.7}
            >
              <EmojiIcon emoji="✉️" size={20} />
              <Text style={styles.emailButtonText}>
                equipe.dosecerta.app@gmail.com
              </Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Card: Avaliar App */}
        <AnimatedCard delay={600} style={styles.cardSpacing}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="⭐" size={28} />
              <Text style={styles.cardTitle}>Avalie o Aplicativo</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>
              Gostou do DoseCerta? Sua avaliação nos ajuda a melhorar 
              e alcançar mais pessoas!
            </Text>
            <TouchableOpacity 
              onPress={() => openExternalLink('https://play.google.com/store/apps/details?id=com.dosecerta')} 
              style={styles.rateButton}
              activeOpacity={0.8}
            >
              <EmojiIcon emoji="🌟" size={22} />
              <Text style={styles.rateButtonText}>Avaliar na Play Store</Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Footer: Informações Técnicas */}
        <AnimatedCard delay={700} style={styles.cardSpacing}>
          <View style={styles.footer}>
            <Text style={styles.versionText}>Versão {version}</Text>
            <View style={styles.copyrightContainer}>
              <EmojiIcon emoji="©️" size={14} />
              <Text style={styles.copyrightText}>
                2025 DoseCerta - Todos os direitos reservados
              </Text>
            </View>
            <Text style={styles.madeWithLove}>
              Feito com <EmojiIcon emoji="💙" size={14} /> no Brasil
            </Text>
          </View>
        </AnimatedCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  cardSpacing: {
    marginBottom: 16,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0A7AB8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0A7AB8',
    letterSpacing: 0.5,
  },
  sloganContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  slogan: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },

  // Cards
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  divider: {
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
    borderRadius: 1,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 4,
  },

  // Features List
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureBullet: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    paddingTop: 7,
  },

  // Buttons
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  linkButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0A7AB8',
    marginLeft: 8,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  emailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A7AB8',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A7AB8',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 16,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0A7AB8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },

  // Warning Box
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#92400E',
    fontWeight: '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    gap: 8,
  },
  versionText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  copyrightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyrightText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  madeWithLove: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
});

export default SobreScreen;