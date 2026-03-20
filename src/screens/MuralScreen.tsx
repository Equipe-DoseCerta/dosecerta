import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchNoticiasUnificadas, NoticiaUnificada } from '../services/noticiasUnificadasService';
import BadgeService from '../services/badgeService';
import ScreenContainer from '../components/ScreenContainer';
import { theme } from '../constants/theme';

const STORAGE_KEY_READ = 'mural_read_items_v4';

type NoticiaComLida = NoticiaUnificada & { lida: boolean };

const NewsCard = React.memo(({ item, index, isExpanded, onToggle, formatarData }: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: Math.min(index * 80, 400), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay: Math.min(index * 80, 400), useNativeDriver: true }),
    ]).start();
  }, [index, fadeAnim, translateY]);

  // Configuração visual APENAS para Aviso e Dica
  const getConfig = () => {
    if (item.tipo === 'aviso') {
      return { icon: '📢', label: 'Aviso', color: '#FF3B30', bg: '#FEF2F2' };
    }
    // Padrão para 'dica'
    return { icon: '🌿', label: 'Dica', color: '#10B981', bg: '#ECFDF5' };
  };

  const config = getConfig();
  const statusColor = item.importante ? '#FF3B30' : (item.lida ? '#9CA3AF' : config.color);

  return (
    <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ translateY }] }]}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.9}
        style={[styles.card, !item.lida && styles.cardUnread, item.importante && styles.cardImportant]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.dateText}>{formatarData(item.data)}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: config.bg }]}>
            <Text style={styles.categoryIcon}>{config.icon}</Text>
            <Text style={[styles.categoryLabel, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <Text style={[styles.title, !item.lida && styles.titleUnread]} numberOfLines={2}>
          {item.titulo}
        </Text>
        
        {item.importante && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENTE</Text>
          </View>
        )}

        <Text style={styles.messagePreview} numberOfLines={isExpanded ? undefined : 3}>
          {item.mensagem}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.readMoreText}>{isExpanded ? 'Ver menos' : 'Ler completo'}</Text>
          {!item.lida && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const MuralScreen = () => {
  const [items, setItems] = useState<NoticiaComLida[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  const loadReadItems = useCallback(async (): Promise<Set<number>> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_READ);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  }, []);

  const saveReadItems = useCallback(async (readIds: Set<number>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_READ, JSON.stringify(Array.from(readIds)));
    } catch (err) { console.error(err); }
  }, []);

  const carregarDados = useCallback(async () => {
    try {
      const [dados, readIds] = await Promise.all([fetchNoticiasUnificadas(), loadReadItems()]);
      
      const dadosComLida = dados.map(d => ({ ...d, lida: readIds.has(d.id) }));
      setItems(dadosComLida);
      
      const unreadCount = dadosComLida.filter(i => !i.lida).length;
      BadgeService.setUnread('mural', unreadCount);
    } catch (err) {
      console.error('Erro ao carregar mural:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadReadItems]);

  useEffect(() => {
    BadgeService.updateLastViewTimestamp('mural');
    carregarDados();
  }, [carregarDados]);

  const handleRefresh = () => { setRefreshing(true); carregarDados(); };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    setItems(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, lida: true } : item);
      const readIds = new Set(updated.filter(i => i.lida).map(i => i.id));
      saveReadItems(readIds);
      BadgeService.setUnread('mural', updated.filter(i => !i.lida).length);
      return updated;
    });
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return dataString;
    const hoje = new Date();
    if (data.toDateString() === hoje.toDateString()) return 'Hoje';
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const naoLidas = items.filter(i => !i.lida).length;

  if (loading) {
    return (
      <ScreenContainer showGradient>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Carregando avisos...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer showGradient>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Avisos & Dicas</Text>
        <Text style={styles.headerSubtitle}>
          {naoLidas === 0 ? 'Tudo em dia!' : `${naoLidas} novidades para você`}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.tipo}-${item.id}`}
        renderItem={({ item, index }) => (
          <NewsCard
            item={item}
            index={index}
            isExpanded={expandedIds.includes(item.id)}
            onToggle={() => toggleExpand(item.id)}
            formatarData={formatarData}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" colors={['#fff']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyText}>Nenhuma novidade no momento.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { color: '#fff', marginTop: 15, fontSize: 16, fontWeight: '600' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  listContent: { paddingHorizontal: 5, paddingBottom: 40 },
  cardContainer: { marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardUnread: { borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)', backgroundColor: '#F8FAFC' },
  cardImportant: { borderLeftWidth: 5, borderLeftColor: '#FF3B30' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  dateText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', flex: 1 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryIcon: { fontSize: 12, marginRight: 4 },
  categoryLabel: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 6, lineHeight: 24 },
  titleUnread: { color: '#000' },
  urgentBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255, 59, 48, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 8 },
  urgentText: { color: '#FF3B30', fontSize: 10, fontWeight: '800' },
  messagePreview: { fontSize: 14, color: '#4B5563', lineHeight: 21 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  readMoreText: { fontSize: 13, color: theme.colors.primary, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500' },
});

export default MuralScreen;