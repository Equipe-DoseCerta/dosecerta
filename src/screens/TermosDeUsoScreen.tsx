import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Linking, 
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';

import ScreenContainer from '../components/ScreenContainer';

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

  const handleEmailPress = () => {
    Linking.openURL('mailto:equipe.dosecerta.app@gmail.com');
  };

  return (
    <ScreenContainer showGradient={true}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header */}
        <AnimatedCard delay={0}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <EmojiIcon emoji="📜" size={48} />
            </View>
            <Text style={styles.title}>Termos de Uso</Text>
            <Text style={styles.subtitle}>DoseCerta - Gestão de Medicamentos</Text>
          </View>
        </AnimatedCard>

        {/* Card: Introdução */}
        <AnimatedCard delay={100}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="👋" size={28} />
              <Text style={styles.cardTitle}>Bem-vindo ao DoseCerta</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>
              Ao utilizar o DoseCerta, você concorda com estes Termos de Uso. 
              Por favor, leia atentamente antes de prosseguir. Se você não 
              concordar com qualquer parte destes termos, não utilize o aplicativo.
            </Text>
          </View>
        </AnimatedCard>

        {/* Card: Aceitação dos Termos */}
        <AnimatedCard delay={200}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="✅" size={28} />
              <Text style={styles.cardTitle}>Aceitação dos Termos</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>
              Ao acessar e usar o DoseCerta, você aceita e concorda em cumprir 
              estes Termos de Uso e todas as leis e regulamentos aplicáveis. 
              Reservamo-nos o direito de modificar estes termos a qualquer momento.
            </Text>
          </View>
        </AnimatedCard>

        {/* Card: Uso do Aplicativo */}
        <AnimatedCard delay={300}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="📱" size={28} />
              <Text style={styles.cardTitle}>Uso do Aplicativo</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              O DoseCerta é fornecido para:
            </Text>

            <View style={styles.list}>
              {[
                { emoji: '💊', text: 'Auxiliar no gerenciamento de medicamentos pessoais' },
                { emoji: '⏰', text: 'Configurar lembretes para administração de medicamentos' },
                { emoji: '📊', text: 'Acompanhar o histórico de uso de medicamentos' },
                { emoji: '📦', text: 'Controlar o estoque de medicamentos' },
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
        <AnimatedCard delay={400}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="⚠️" size={28} />
              <Text style={styles.cardTitle}>Responsabilidades do Usuário</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Como usuário, você concorda em:
            </Text>

            <View style={styles.list}>
              {[
                { emoji: '✔️', text: 'Fornecer informações precisas e atualizadas' },
                { emoji: '🔒', text: 'Manter a confidencialidade de suas informações de acesso' },
                { emoji: '🚫', text: 'Não usar o aplicativo para fins ilegais ou não autorizados' },
                { emoji: '👨‍⚕️', text: 'Consultar um profissional de saúde para orientações médicas' },
                { emoji: '📝', text: 'Seguir as prescrições médicas fornecidas por profissionais qualificados' },
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

        {/* Card: Limitações de Responsabilidade */}
        <AnimatedCard delay={500}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="⚖️" size={28} />
              <Text style={styles.cardTitle}>Limitações de Responsabilidade</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.importantText}>
              ⚠️ IMPORTANTE: O DoseCerta NÃO substitui o acompanhamento médico profissional.
            </Text>

            <View style={styles.list}>
              {[
                { emoji: '🩺', text: 'Não fornecemos diagnósticos ou tratamentos médicos' },
                { emoji: '💼', text: 'Não nos responsabilizamos por decisões médicas tomadas com base nas informações do app' },
                { emoji: '🔧', text: 'O aplicativo é fornecido "como está", sem garantias de qualquer tipo' },
                { emoji: '📱', text: 'Não garantimos operação ininterrupta ou livre de erros' },
              ].map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.warningBullet}>
                    <EmojiIcon emoji={item.emoji} size={18} />
                  </View>
                  <Text style={styles.listText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Privacidade */}
        <AnimatedCard delay={600}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="🔐" size={28} />
              <Text style={styles.cardTitle}>Privacidade e Proteção de Dados</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Levamos sua privacidade a sério. Todos os dados são armazenados 
              localmente no seu dispositivo e não são compartilhados com terceiros 
              sem sua autorização explícita.
            </Text>

            <Text style={styles.cardText}>
              Para mais informações, consulte nossa Política de Privacidade e 
              informações sobre LGPD.
            </Text>
          </View>
        </AnimatedCard>

        {/* Card: Propriedade Intelectual */}
        <AnimatedCard delay={700}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="©️" size={28} />
              <Text style={styles.cardTitle}>Propriedade Intelectual</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Todo o conteúdo do DoseCerta, incluindo design, logotipos, textos 
              e código, é protegido por direitos autorais e outras leis de 
              propriedade intelectual.
            </Text>

            <Text style={styles.cardText}>
              Você não pode reproduzir, distribuir ou criar trabalhos derivados 
              sem autorização prévia por escrito.
            </Text>
          </View>
        </AnimatedCard>

        {/* Card: Modificações */}
        <AnimatedCard delay={800}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="🔄" size={28} />
              <Text style={styles.cardTitle}>Modificações nos Termos</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Podemos atualizar estes Termos de Uso periodicamente. Notificaremos 
              você sobre mudanças significativas através do aplicativo. O uso 
              continuado após as modificações constitui aceitação dos novos termos.
            </Text>
          </View>
        </AnimatedCard>

        {/* Card: Contato */}
        <AnimatedCard delay={900}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="📧" size={28} />
              <Text style={styles.cardTitle}>Entre em Contato</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Se você tiver dúvidas sobre estes Termos de Uso, entre em contato:
            </Text>

            <View style={styles.contactBox}>
              <View style={styles.contactItem}>
                <EmojiIcon emoji="✉️" size={22} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>E-mail</Text>
                  <TouchableOpacity 
                    onPress={handleEmailPress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.contactLink}>
                      equipe.dosecerta.app@gmail.com
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Versão Web */}
        <AnimatedCard delay={950}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="🌐" size={28} />
              <Text style={styles.cardTitle}>Versão Web Completa</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Acesse a versão completa dos Termos de Uso em nosso site oficial:
            </Text>

            <TouchableOpacity 
              onPress={() => openExternalLink('https://dosecerta-9141e.web.app/termos-de-uso.html')}
              style={styles.webButton}
              activeOpacity={0.7}
            >
              <EmojiIcon emoji="🌐" size={20} />
              <Text style={styles.webButtonText}>Abrir página web</Text>
              <EmojiIcon emoji="↗" size={18} />
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Info Box */}
        <AnimatedCard delay={1000}>
          <View style={styles.infoBox}>
            <EmojiIcon emoji="📅" size={24} />
            <Text style={styles.infoText}>
              Última atualização: Janeiro de 2025
            </Text>
          </View>
        </AnimatedCard>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 5,
    paddingTop: 5,
    paddingBottom: 60,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 8,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0A7AB8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
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
  importantText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#DC2626',
    fontWeight: '700',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },

  // Lists
  list: {
    gap: 12,
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
  warningBullet: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
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

  // Contact Box
  contactBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  contactLink: {
    fontSize: 15,
    color: '#0A7AB8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Web Button
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

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
});

export default TermosDeUsoScreen;