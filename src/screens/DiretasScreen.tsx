import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Animated,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
  Easing,
} from 'react-native';
import { fetchDiretas, Direta } from '../services/diretasService';
import { marcarComoLida } from '../services/notificationUtils';

const CARD_SPACING = 12;
const CARD_PADDING = 16;

type DiretaComLida = Direta & {
  lida: boolean;
};

type CardProps = {
  item: DiretaComLida;
  index: number;
  formatarData: (data: string) => string;
  onMarkAsRead: (id: number) => void;
};

// Componente de Gradiente Manual (substituindo react-native-linear-gradient)
const GradientBox: React.FC<{
  colors: string[];
  style?: any;
  children?: React.ReactNode;
}> = ({ colors, style, children }) => {
  const dynamicStyle = { backgroundColor: colors[0] };
  return (
    <View style={[styles.gradientBox, dynamicStyle, style]}>
      {children}
    </View>
  );
};

const gradientColors = [
  ['#0066CC', '#0088FF'],
  ['#0088FF', '#00AAFF'],
  ['#00AAFF', '#33BBFF'],
  ['#33BBFF', '#66CCFF'],
];

const CardDireta = React.memo(({ item, index, formatarData, onMarkAsRead }: CardProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [isExpanded, setIsExpanded] = useState(false);

  const colors = gradientColors[index % gradientColors.length];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 80,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, index]);

  const toggleExpand = useCallback(async () => {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);

    if (willExpand && !item.lida) {
      try {
        await marcarComoLida('diretas', [item.id]);
        onMarkAsRead(item.id);
      } catch (error) {
        console.error('Erro ao marcar mensagem como lida:', error);
      }
    }
  }, [isExpanded, item.lida, item.id, onMarkAsRead]);

  const getIconEmoji = () => {
    if (item.importante) {
      return item.lida ? '📩' : '🔔';
    }
    return item.lida ? '📧' : '✉️';
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      accessibilityLabel={`Mensagem ${item.importante ? 'importante' : ''} de ${
        item.lida ? 'lida' : 'não lida'
      }`}
      accessibilityHint={isExpanded ? 'Mensagem expandida' : 'Toque para expandir'}
      accessibilityRole="button"
    >
      <GradientBox colors={colors} style={styles.iconBox}>
        <Text style={styles.iconEmoji}>{getIconEmoji()}</Text>
      </GradientBox>

      <View style={styles.textBox}>
        <View style={styles.header}>
          <Text style={styles.titulo} numberOfLines={2}>
            {item.titulo}
          </Text>
          {item.importante && (
            <View style={styles.badgeImportante}>
              <Text style={styles.badgeText}>🚨</Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.mensagem, !item.lida && styles.mensagemNaoLida]}
          numberOfLines={isExpanded ? undefined : 3}
          ellipsizeMode="tail"
        >
          {item.mensagem}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.data}>
            📅 {formatarData(item.data)}
          </Text>
          {!item.lida && <View style={styles.unreadDot} />}
        </View>

        <TouchableOpacity
          onPress={toggleExpand}
          style={styles.expandButton}
          activeOpacity={0.7}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? '▲ Recolher' : '▼ Expandir'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const DiretasScreen = () => {
  const [diretas, setDiretas] = useState<DiretaComLida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const carregarDiretas = useCallback(async () => {
    try {
      setError(null);
      const dados = await fetchDiretas();
      const dadosComLida: DiretaComLida[] = dados.map((d) => ({ ...d, lida: false }));
      setDiretas(dadosComLida);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setError('Não foi possível carregar as mensagens. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    carregarDiretas();
  }, [carregarDiretas]);

  useEffect(() => {
    carregarDiretas();
  }, [carregarDiretas]);

  const formatarData = useCallback((dataString: string) => {
    try {
      const data = new Date(dataString);
      if (isNaN(data.getTime())) return dataString;
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dataString;
    }
  }, []);

  const handleMarkAsRead = useCallback((id: number) => {
    setDiretas((prevDiretas) =>
      prevDiretas.map((direta) => (direta.id === id ? { ...direta, lida: true } : direta))
    );
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: DiretaComLida; index: number }) => (
      <CardDireta
        item={item}
        index={index}
        formatarData={formatarData}
        onMarkAsRead={handleMarkAsRead}
      />
    ),
    [formatarData, handleMarkAsRead]
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.containerFullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0066CC" translucent={false} />
        <Text style={styles.loadingEmoji}>📬</Text>
        <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        <Text style={styles.loadingText}>Carregando mensagens...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.containerFullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0066CC" translucent={false} />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={carregarDiretas} style={styles.retryButton} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>🔄 Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (diretas.length === 0) {
    return (
      <View style={styles.containerFullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0066CC" translucent={false} />
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>Nenhuma mensagem disponível no momento</Text>
        <TouchableOpacity onPress={carregarDiretas} style={styles.retryButton} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>🔄 Atualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const naoLidas = diretas.filter((d) => !d.lida).length;

  const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<DiretaComLida>);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066CC" translucent={false} />
      
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: headerOpacity,
            transform: [{ scale: headerScale }],
          },
        ]}
      >
        <Text style={styles.headerTitle}>✉️ Mensagens Diretas</Text>
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{diretas.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          {naoLidas > 0 && (
            <View style={[styles.statItem, styles.statItemUnread]}>
              <Text style={styles.statNumber}>{naoLidas}</Text>
              <Text style={styles.statLabel}>Não lidas</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <AnimatedFlatList
        data={diretas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#0066CC']}
            tintColor="#0066CC"
            progressBackgroundColor="#fff"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  containerFullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    padding: 20,
  },
  headerContainer: {
    backgroundColor: '#0066CC',
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statItemUnread: {
    backgroundColor: '#FF6B6B',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.95,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: CARD_PADDING,
    marginBottom: CARD_SPACING,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  gradientBox: {
    overflow: 'hidden',
  },
  iconEmoji: {
    fontSize: 22,
  },
  textBox: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
    lineHeight: 22,
  },
  badgeImportante: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 14,
  },
  mensagem: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 22,
  },
  mensagemNaoLida: {
    fontWeight: '500',
    color: '#2A2A2A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  data: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  expandButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
  },
  expandButtonText: {
    color: '#0066CC',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loader: {
    marginVertical: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
    fontWeight: '500',
    lineHeight: 24,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default DiretasScreen;