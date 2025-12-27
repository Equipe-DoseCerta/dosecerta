import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { fetchSaudeDiaria, SaudeDiaria } from '../services/saudeDiariaService';
import CacheService from '../services/cacheService';

const CACHE_KEY = 'saude_diaria_cache';

const iconBoxStyle = (colors: { start: string; end: string }) =>
  StyleSheet.create({
    box: {
      backgroundColor: colors.start,
      borderWidth: 1,
      borderColor: colors.end,
    },
  }).box;

const CardItem = React.memo(
  ({
    item,
    index,
    isExpanded,
    onToggle,
  }: {
    item: SaudeDiaria;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
  }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 50,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      Animated.timing(fadeAnim, {
        toValue: 1,
        delay: index * 50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim, fadeAnim, index]);

    const gradientColors = [
      { start: '#4CAF50', end: '#66BB6A' },
      { start: '#2196F3', end: '#42A5F5' },
      { start: '#FF9800', end: '#FFB74D' },
      { start: '#9C27B0', end: '#BA68C8' },
      { start: '#E91E63', end: '#EC407A' },
    ];

    const emojis = ['🍎', '💪', '🧘', '🏃', '😴', '🥗', '💧', '🧠'];
    const colors = gradientColors[index % gradientColors.length];
    const emoji = emojis[index % emojis.length];

    const formatarData = (dataString: string) => {
      try {
        const data = new Date(dataString);
        if (isNaN(data.getTime())) return dataString;

        return data.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
      } catch {
        return dataString;
      }
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
      >
        <View style={[styles.iconBox, iconBoxStyle(colors)]}>
          <Text style={styles.iconEmoji}>{emoji}</Text>
        </View>

        <View style={styles.textBox}>
          <Text style={styles.titulo} numberOfLines={2}>
            {item.titulo}
          </Text>

          <Text
            style={styles.mensagem}
            numberOfLines={isExpanded ? undefined : 3}
            ellipsizeMode="tail"
          >
            {item.mensagem}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.data}>📅 {formatarData(item.data)}</Text>
          </View>

          <TouchableOpacity
            onPress={onToggle}
            style={styles.expandButton}
            activeOpacity={0.7}
          >
            <Text style={styles.expandText}>
              {isExpanded ? '▲ Recolher' : '▼ Ler mais'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }
);

CardItem.displayName = 'CardItem';

const SaudeDiariaScreen: React.FC = () => {
  const [dicas, setDicas] = useState<SaudeDiaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const carregarDicas = useCallback(async () => {
    try {
      setError(false);
      const dados = await fetchSaudeDiaria();
      setDicas(dados);
      setFromCache(false);

      // Salva no cache
      await CacheService.setCache(CACHE_KEY, dados);

      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error('Erro ao carregar dicas:', err);

      // Tenta carregar do cache
      const dicasCached = await CacheService.getCache(CACHE_KEY);
      if (dicasCached && dicasCached.length > 0) {
        setDicas(dicasCached);
        setFromCache(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim]);

  useEffect(() => {
    carregarDicas();
  }, [carregarDicas]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarDicas();
  }, [carregarDicas]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const renderItem = ({ item, index }: { item: SaudeDiaria; index: number }) => (
    <CardItem
      item={item}
      index={index}
      isExpanded={expandedIds.includes(item.id)}
      onToggle={() => toggleExpand(item.id)}
    />
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.containerFullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#4CAF50" translucent={false} />
        <Text style={styles.loadingEmoji}>🌿</Text>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Carregando dicas de saúde...</Text>
      </View>
    );
  }

  if (error && dicas.length === 0) {
    return (
      <View style={styles.containerFullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#4CAF50" translucent={false} />
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>Erro ao carregar as dicas</Text>
        <TouchableOpacity
          onPress={carregarDicas}
          style={styles.retryButton}
          activeOpacity={0.8}
        >
          <Text style={styles.retryText}>🔄 Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (dicas.length === 0) {
    return (
      <View style={styles.containerFullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#4CAF50" translucent={false} />
        <Text style={styles.emptyEmoji}>📚</Text>
        <Text style={styles.emptyText}>Nenhuma dica disponível</Text>
        <Text style={styles.emptySubtext}>
          Volte mais tarde para novas dicas de saúde
        </Text>
      </View>
    );
  }

  const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<SaudeDiaria>);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" translucent={false} />

      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: headerOpacity,
            transform: [{ scale: headerScale }],
          },
        ]}
      >
        <Text style={styles.headerTitle}>🌿 Dicas de Saúde</Text>
        <Text style={styles.headerSubtitle}>Cuide do seu bem-estar diariamente</Text>
        {fromCache && <Text style={styles.cacheIndicator}>⏱️ Dados em cache</Text>}
      </Animated.View>

      <AnimatedFlatList
        data={dicas}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
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
    backgroundColor: '#F8FAFB',
  },
  containerFullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 20,
  },
  headerContainer: {
    backgroundColor: '#4CAF50',
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  cacheIndicator: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconEmoji: {
    fontSize: 26,
  },
  textBox: {
    flex: 1,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 22,
  },
  mensagem: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
  },
  footer: {
    marginTop: 10,
  },
  data: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  expandButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
  },
  expandText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    marginVertical: 12,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default SaudeDiariaScreen;