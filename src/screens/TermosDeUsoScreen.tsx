import React, { useState, useRef, useEffect } from 'react';
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

type TermosDeUsoScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TermosDeUso'>;

// Componente de Card Animado
const AnimatedCard: React.FC<{ 
  children: React.ReactNode; 
  delay?: number;
}> = ({ children, delay = 0 }) => {
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
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
};

// Componente de Ícone Emoji
const EmojiIcon: React.FC<{ emoji: string; size?: number }> = ({ emoji, size = 20 }) => (
  <Text style={{ fontSize: size, lineHeight: size + 4 }}>{emoji}</Text>
);

const TermosDeUsoScreen = () => {
  const navigation = useNavigation<TermosDeUsoScreenNavigationProp>();
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
      } else {
        console.error('URL não suportada:', url);
      }
    } catch (error) {
      console.error('Erro ao abrir link:', error);
    }
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
            <Text style={styles.appName}>Termos de Uso</Text>
            <View style={styles.sloganContainer}>
              <EmojiIcon emoji="📋" size={18} />
              <Text style={styles.slogan}>Leia com atenção</Text>
              <EmojiIcon emoji="✓" size={18} />
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Aceitação dos Termos */}
        <AnimatedCard delay={100}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="📜" size={28} />
              <Text style={styles.cardTitle}>Aceitação dos Termos</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>
              Ao utilizar o aplicativo DoseCerta, você concorda com estes Termos 
              de Uso. Caso não concorde com qualquer disposição aqui apresentada, 
              recomendamos que não utilize o aplicativo.
            </Text>
          </View>
        </AnimatedCard>

        {/* Card: Objetivo do Aplicativo */}
        <AnimatedCard delay={200}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="🎯" size={28} />
              <Text style={styles.cardTitle}>Objetivo do Aplicativo</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>
              O DoseCerta foi desenvolvido para ajudar você a gerenciar seus 
              medicamentos de forma eficiente, oferecendo:
            </Text>
            
            <View style={styles.list}>
              {[
                { emoji: '⏰', text: 'Alertas de horário para medicamentos' },
                { emoji: '📊', text: 'Controle de estoque' },
                { emoji: '📝', text: 'Histórico completo de tratamentos' },
                { emoji: '🔍', text: 'Busca avançada de medicamentos' },
              ].map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.listBullet}>
                    <EmojiIcon emoji={item.emoji} size={20} />
                  </View>
                  <Text style={styles.listText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Responsabilidades do Usuário */}
        <AnimatedCard delay={300}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="👤" size={28} />
              <Text style={styles.cardTitle}>Responsabilidades do Usuário</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Ao utilizar o DoseCerta, você se compromete a:
            </Text>

            <View style={styles.list}>
              {[
                { emoji: '✓', text: 'Fornecer informações verdadeiras e atualizadas' },
                { emoji: '✓', text: 'Manter a segurança de sua conta e senha' },
                { emoji: '✓', text: 'Utilizar o aplicativo apenas para fins lícitos' },
                { emoji: '✓', text: 'Não violar direitos de propriedade intelectual' },
                { emoji: '✓', text: 'Consultar profissionais de saúde qualificados' },
              ].map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.responsibilityBullet}>
                    <EmojiIcon emoji={item.emoji} size={18} />
                  </View>
                  <Text style={styles.listText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Limitação de Responsabilidade */}
        <AnimatedCard delay={400}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="⚠️" size={28} />
              <Text style={styles.cardTitle}>Limitação de Responsabilidade</Text>
            </View>
            <View style={styles.divider} />
            
            <View style={styles.warningBox}>
              <EmojiIcon emoji="🏥" size={24} />
              <Text style={styles.warningText}>
                <Text style={styles.warningBold}>Importante: </Text>
                O DoseCerta é uma ferramenta de auxílio e organização. 
                NÃO substitui consultas, diagnósticos ou tratamentos médicos. 
                Sempre consulte um profissional de saúde qualificado.
              </Text>
            </View>

            <Text style={styles.cardText}>
              O aplicativo não se responsabiliza por:
            </Text>

            <View style={styles.list}>
              {[
                { emoji: '✗', text: 'Decisões médicas tomadas com base nas informações do app' },
                { emoji: '✗', text: 'Erros no cadastro de medicamentos pelo usuário' },
                { emoji: '✗', text: 'Falhas de notificação por problemas do dispositivo' },
                { emoji: '✗', text: 'Perda de dados por falhas técnicas ou do dispositivo' },
              ].map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.limitationBullet}>
                    <EmojiIcon emoji={item.emoji} size={18} />
                  </View>
                  <Text style={styles.listText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Privacidade e Segurança */}
        <AnimatedCard delay={500}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="🔐" size={28} />
              <Text style={styles.cardTitle}>Privacidade e Segurança</Text>
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
              <EmojiIcon emoji="↗" size={18} />
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Card: Propriedade Intelectual */}
        <AnimatedCard delay={600}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="©️" size={28} />
              <Text style={styles.cardTitle}>Propriedade Intelectual</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Todo o conteúdo do DoseCerta, incluindo textos, gráficos, logos, 
              ícones e código-fonte, é propriedade exclusiva da equipe DoseCerta 
              e está protegido pelas leis de direitos autorais.
            </Text>

            <Text style={styles.cardText}>
              É proibida a reprodução, distribuição ou modificação não autorizada 
              de qualquer parte do aplicativo.
            </Text>
          </View>
        </AnimatedCard>

        {/* Card: Modificações */}
        <AnimatedCard delay={700}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="🔄" size={28} />
              <Text style={styles.cardTitle}>Modificações nos Termos</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Reservamo-nos o direito de modificar estes Termos de Uso a qualquer 
              momento. As alterações entrarão em vigor imediatamente após sua 
              publicação no aplicativo.
            </Text>

            <Text style={styles.cardText}>
              Recomendamos que você revise periodicamente estes termos para se 
              manter informado sobre atualizações.
            </Text>
          </View>
        </AnimatedCard>

        {/* Card: Contato */}
        <AnimatedCard delay={800}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="📧" size={28} />
              <Text style={styles.cardTitle}>Dúvidas sobre os Termos</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Caso tenha dúvidas sobre estes Termos de Uso, entre em contato:
            </Text>

            <TouchableOpacity 
              onPress={() => openExternalLink('mailto:equipe.dosecerta.app@gmail.com')} 
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

        {/* NOVO: Card Versão Web Oficial */}
        <AnimatedCard delay={850}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="📄" size={28} />
              <Text style={styles.cardTitle}>Versão Web Oficial</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Acesse a versão completa dos Termos de Uso em nosso 
              site oficial:
            </Text>

            <TouchableOpacity 
              onPress={() => openExternalLink('https://equipe-dosecerta.github.io/dosecerta-legal/termos-de-uso.html')}
              style={styles.webButton}
              activeOpacity={0.7}
            >
              <EmojiIcon emoji="🌐" size={20} />
              <Text style={styles.webButtonText}>Abrir página web</Text>
              <EmojiIcon emoji="↗" size={18} />
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Card: Avaliação */}
        <AnimatedCard delay={900}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="⭐" size={28} />
              <Text style={styles.cardTitle}>Avalie o Aplicativo</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Se você concorda com nossos termos e gosta do DoseCerta, 
              avalie-nos na Play Store!
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

        {/* Footer */}
        <AnimatedCard delay={1000}>
          <View style={styles.footer}>
            <Text style={styles.versionText}>Versão {version}</Text>
            <Text style={styles.updateText}>Última atualização: Janeiro de 2025</Text>
            <View style={styles.copyrightContainer}>
              <EmojiIcon emoji="©️" size={14} />
              <Text style={styles.copyrightText}>
                2025 DoseCerta - Todos os direitos reservados
              </Text>
            </View>
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
    paddingBottom: 50,
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
    marginBottom: 16,
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
    marginBottom: 12,
  },

  // Lists
  list: {
    gap: 12,
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  listBullet: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  responsibilityBullet: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitationBullet: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    paddingTop: 7,
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
    marginBottom: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#92400E',
  },
  warningBold: {
    fontWeight: '700',
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
    marginTop: 8,
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
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  emailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A7AB8',
  },
  
  // NOVO: Web Button
  webButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  webButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
  },
  
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A7AB8',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
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
  updateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  copyrightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default TermosDeUsoScreen;