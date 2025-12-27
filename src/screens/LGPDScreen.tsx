import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Linking, 
  TouchableOpacity,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';

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

const LGPDScreen = () => {
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
        {/* Header */}
        <AnimatedCard delay={0}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <EmojiIcon emoji="🔐" size={48} />
            </View>
            <Text style={styles.title}>Lei Geral de Proteção de Dados</Text>
            <Text style={styles.subtitle}>LGPD - Lei nº 13.709/2018</Text>
          </View>
        </AnimatedCard>

        {/* Card: O que é a LGPD? */}
        <AnimatedCard delay={100}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="📖" size={28} />
              <Text style={styles.cardTitle}>O que é a LGPD?</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>
              A Lei Geral de Proteção de Dados (LGPD) é a legislação brasileira 
              que regula as atividades de tratamento de dados pessoais. Ela tem 
              como objetivo proteger os direitos fundamentais de liberdade e 
              privacidade e o livre desenvolvimento da personalidade.
            </Text>
          </View>
        </AnimatedCard>

        {/* Card: Como Aplicamos */}
        <AnimatedCard delay={200}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="✅" size={28} />
              <Text style={styles.cardTitle}>Como aplicamos no DoseCerta</Text>
            </View>
            <View style={styles.divider} />
            
            <View style={styles.list}>
              {[
                { emoji: '🛡️', text: 'Coletamos apenas dados necessários para as funcionalidades do aplicativo' },
                { emoji: '🚫', text: 'Não compartilhamos seus dados pessoais com terceiros sem autorização explícita' },
                { emoji: '🔒', text: 'Mantemos medidas de segurança técnicas e organizacionais para proteger seus dados' },
                { emoji: '👤', text: 'Você pode acessar, corrigir ou excluir seus dados a qualquer momento' },
                { emoji: '👨‍💼', text: 'Temos um encarregado de proteção de dados (DPO) para garantir o cumprimento da LGPD' },
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

        {/* Card: Seus Direitos */}
        <AnimatedCard delay={300}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="⚖️" size={28} />
              <Text style={styles.cardTitle}>Seus Direitos</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Conforme a LGPD, você tem direito a:
            </Text>

            <View style={styles.list}>
              {[
                { emoji: '👁️', text: 'Acessar seus dados pessoais' },
                { emoji: '✏️', text: 'Corrigir dados incompletos, inexatos ou desatualizados' },
                { emoji: '🗑️', text: 'Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários' },
                { emoji: '🚫', text: 'Revogar o consentimento a qualquer momento' },
                { emoji: '📋', text: 'Solicitar portabilidade dos dados' },
              ].map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.rightBullet}>
                    <EmojiIcon emoji={item.emoji} size={18} />
                  </View>
                  <Text style={styles.listText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Contato DPO */}
        <AnimatedCard delay={400}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="👨‍💼" size={28} />
              <Text style={styles.cardTitle}>Encarregado de Proteção de Dados</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento 
              de dados, entre em contato com nosso DPO:
            </Text>

            <View style={styles.contactBox}>
              <View style={styles.contactItem}>
                <EmojiIcon emoji="📧" size={22} />
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

              <View style={styles.contactItem}>
                <EmojiIcon emoji="📞" size={22} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Telefone</Text>
                  <Text style={styles.contactValue}>Em breve!</Text>
                </View>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Card: Mais Informações */}
        <AnimatedCard delay={500}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="🌐" size={28} />
              <Text style={styles.cardTitle}>Mais Informações</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Para mais detalhes sobre a lei, visite o site oficial da Autoridade 
              Nacional de Proteção de Dados (ANPD):
            </Text>

            <TouchableOpacity 
              onPress={() => openExternalLink('https://www.gov.br/anpd/pt-br')}
              style={styles.linkButton}
              activeOpacity={0.7}
            >
              <EmojiIcon emoji="🔗" size={20} />
              <Text style={styles.linkButtonText}>www.gov.br/anpd</Text>
              <EmojiIcon emoji="↗" size={18} />
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* NOVO: Card Página Web Oficial */}
        <AnimatedCard delay={550}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EmojiIcon emoji="📄" size={28} />
              <Text style={styles.cardTitle}>Versão Web Oficial</Text>
            </View>
            <View style={styles.divider} />
            
            <Text style={styles.cardText}>
              Acesse a versão completa desta política de privacidade em nosso 
              site oficial:
            </Text>

            <TouchableOpacity 
              onPress={() => openExternalLink('https://equipe-dosecerta.github.io/dosecerta-legal/politica-privacidade.html')}
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
        <AnimatedCard delay={600}>
          <View style={styles.infoBox}>
            <EmojiIcon emoji="ℹ️" size={24} />
            <Text style={styles.infoText}>
              Este aplicativo está em conformidade com a Lei Geral de Proteção 
              de Dados Pessoais (LGPD) e demais normas aplicáveis.
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
    paddingBottom: 60,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 24,
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
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
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
  rightBullet: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
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
    gap: 16,
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
  contactValue: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },

  // Link Button
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
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

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#DBEAFE',
    borderLeftWidth: 4,
    borderLeftColor: '#0A7AB8',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#1E40AF',
    fontWeight: '500',
  },
});

export default LGPDScreen;