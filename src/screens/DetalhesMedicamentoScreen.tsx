// DetalhesMedicamentoScreen.tsx - VERSÃO MODERNA RN PURO (TEMA CLARO)
import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  BackHandler,
  Dimensions,
  Platform,
  Share,
  Animated,
  PanResponder,
  StatusBar,
  SafeAreaView,
} from 'react-native';

import { Medicamento } from '../services/medsRepo';

const { width, height } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(width * 0.92, 420);
const SWIPE_THRESHOLD = 100;

interface DetalhesMedicamentoScreenProps {
  visible: boolean;
  medicamento: Medicamento | null;
  onClose: () => void;
}

const DetalhesMedicamentoScreen: React.FC<DetalhesMedicamentoScreenProps> = ({
  visible,
  medicamento,
  onClose,
}) => {
  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: PANEL_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose, translateX, overlayOpacity]);

  // Função de compartilhamento
  const handleShare = useCallback(async () => {
    if (!medicamento) return;

    try {
      const message = `
📋 ${medicamento.nome}

🧪 Princípio Ativo: ${medicamento.principio_ativo || 'Não informado'}
💊 Forma: ${medicamento.apresentacaoExpandida || 'Não informada'}
💉 Dosagem: ${medicamento.concentracao || 'Não informada'}
🩺 Via: ${medicamento.via || 'Não informada'}
🏭 Fabricante: ${medicamento.fabricante || 'Não informado'}

Compartilhado via Dose Certa
      `.trim();

      await Share.share({
        message,
        title: medicamento.nome,
      });
    } catch (error) {
      console.error('[DETALHES] Erro ao compartilhar:', error);
    }
  }, [medicamento]);

  // Abertura/fechamento do painel
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateX, overlayOpacity]);

  // Botão voltar Android
  useEffect(() => {
    const backAction = () => {
      if (visible) {
        handleClose();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => subscription.remove();
  }, [visible, handleClose]);

  // Pan Responder para swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 8,
            tension: 65,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!medicamento) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="rgba(0,0,0,0.6)" barStyle="dark-content" />
        
        {/* Overlay */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Painel lateral */}
        <Animated.View
          style={[
            styles.panel,
            {
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Background claro */}
          <View style={styles.gradientBackground}>
            {/* Cabeçalho */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerEmoji}>💊</Text>
                  <Text style={styles.title}>Detalhes</Text>
                </View>

                <View style={styles.headerRight}>
                  {/* Botão Compartilhar */}
                  <TouchableOpacity
                    onPress={handleShare}
                    style={styles.iconButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.iconEmoji}>📤</Text>
                  </TouchableOpacity>

                  {/* Botão Fechar */}
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.iconButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.iconEmoji}>✖️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Indicador de drag */}
              <View style={styles.dragIndicator}>
                <View style={styles.dragBar} />
              </View>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              bounces={true}
            >
              {/* Nome do Medicamento */}
              <View style={styles.nameContainer}>
                <Text style={styles.nomePrincipal}>{medicamento.nome}</Text>
                {medicamento.fabricante && (
                  <View style={styles.fabricanteBadge}>
                    <Text style={styles.fabricanteEmoji}>🏭</Text>
                    <Text style={styles.fabricanteText}>
                      {medicamento.fabricante}
                    </Text>
                  </View>
                )}
              </View>

              {/* Cards de Informação */}
              <View style={styles.cardsContainer}>
                <DetailItem
                  emoji="📦"
                  label="Forma Farmacêutica"
                  value={medicamento.apresentacaoExpandida || 'Não informado'}
                  color="#4A90E2"
                />

                <DetailItem
                  emoji="🧪"
                  label="Princípio Ativo"
                  value={medicamento.principio_ativo || 'Não informado'}
                  color="#F5A623"
                />

                <DetailItem
                  emoji="💉"
                  label="Dosagem e Concentração"
                  value={medicamento.concentracao || 'Não informado'}
                  color="#7ED321"
                />

                <DetailItem
                  emoji="🩺"
                  label="Via de Administração"
                  value={medicamento.via || 'Não informado'}
                  color="#E94B3C"
                />
              </View>

              {/* Informações Adicionais */}
              {medicamento.updated_at && (
                <View style={styles.footerInfo}>
                  <Text style={styles.footerIcon}>📅</Text>
                  <Text style={styles.footerText}>
                    Atualizado em {formatDate(medicamento.updated_at)}
                  </Text>
                </View>
              )}

              {/* Dica de swipe */}
              <View style={styles.swipeHint}>
                <Text style={styles.swipeEmoji}>👉</Text>
                <Text style={styles.swipeText}>Deslize para fechar</Text>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

// Componente de Item de Detalhe
const DetailItem = ({
  emoji,
  label,
  value,
  color,
}: {
  emoji: string;
  label: string;
  value: string;
  color: string;
}) => (
  <View style={styles.detailCard}>
    <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

// Função auxiliar para formatar data
const formatDate = (isoDate: string): string => {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Data inválida';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: PANEL_WIDTH,
    height: height,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    overflow: 'hidden',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  dragIndicator: {
    alignItems: 'center',
    marginTop: 12,
  },
  dragBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  nameContainer: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  nomePrincipal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563EB',
    lineHeight: 32,
    marginBottom: 12,
  },
  fabricanteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  fabricanteEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  fabricanteText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
  },
  cardsContainer: {
    gap: 14,
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardEmoji: {
    fontSize: 26,
  },
  textContainer: {
    flex: 1,
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  footerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  swipeEmoji: {
    fontSize: 18,
  },
  swipeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

export default DetalhesMedicamentoScreen;