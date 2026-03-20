import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
  Share,
  Dimensions,
  Image,
} from 'react-native';
import { fetchMedicamentos, Medicamento } from '../database/database';
import { useModal } from '../components/ModalContext';
import ScreenContainer from '../components/ScreenContainer';

const COLORS = {
  primary:       '#0A7AB8',
  primaryDark:   '#054F77',
  background:    '#F8FAFB',
  card:          '#FFFFFF',
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  placeholder:   '#94A3B8',
  border:        '#E2E8F0',
  accent:        '#06B6D4',
};

const { height } = Dimensions.get('window');

const BuscarMedicamento = () => {
  const { showModal } = useModal();
  const [searchText, setSearchText]     = useState('');
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [filtered, setFiltered]         = useState<Medicamento[]>([]);
  const [selectedItem, setSelectedItem] = useState<Medicamento | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading]           = useState(true);

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(30)).current;
  const modalSlide  = useRef(new Animated.Value(height)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const blurAnim    = useRef(new Animated.Value(0)).current;

  const unidadePorTipo: Record<string, string> = {
    cápsula:    'cápsula(s)',
    comprimido: 'comprimido(s)',
    ampola:     'ampola(s)',
    ml:         'ml',
    unidade:    'unidade(s)',
  };

  const formatarDosagemComUnidade = (dosagem: string | number, tipo: string) => {
    const tipoLower = tipo?.toLowerCase() || '';
    const unidade   = unidadePorTipo[tipoLower] || tipo;
    return `${dosagem} ${unidade}`.trim();
  };

  const formatarHorario = (hora: string) => {
    try {
      if (!hora || !hora.includes(':')) return 'Horário inválido';
      return hora;
    } catch {
      return 'Horário inválido';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchMedicamentos();
        setMedicamentos(data || []);
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
      } catch {
        showModal({ type: 'error', message: 'Não foi possível carregar os medicamentos.' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fadeAnim, slideAnim, showModal]);

  useEffect(() => {
    if (!searchText.trim()) { setFiltered([]); return; }
    const lower   = searchText.toLowerCase();
    const results = medicamentos.filter(item =>
      item.nome.toLowerCase().includes(lower) ||
      item.nomePaciente.toLowerCase().includes(lower) ||
      (item.notas && item.notas.toLowerCase().includes(lower))
    );
    setFiltered(results);
  }, [searchText, medicamentos]);

  const handleShareMedicamento = async () => {
    if (!selectedItem) return;
    try {
      const message =
        `📋 Detalhes do Medicamento\n`
        + `👤 Paciente: ${selectedItem.nomePaciente}\n`
        + `💊 Medicamento: ${selectedItem.nome}\n`
        + `💉 Dosagem: ${formatarDosagemComUnidade(selectedItem.dosagem, selectedItem.tipo)}\n`
        + `⏰ Frequência: A cada ${selectedItem.intervalo_horas}h\n`
        + `📅 Início: ${selectedItem.dataInicio} às ${formatarHorario(selectedItem.horario_inicial)}\n`
        + `📊 Duração: ${selectedItem.duracaoTratamento} dias\n`
        + `📝 Observações: ${selectedItem.notas || 'Nenhuma observação registrada'}\n\n`
        + `Compartilhado via DoseCerta`;
      await Share.share({ message, title: 'Detalhes do Medicamento' });
    } catch {
      showModal({ type: 'error', message: 'Não foi possível compartilhar os dados.' });
    }
  };

  const openModal = (item: Medicamento) => {
    setSelectedItem(item);
    setModalVisible(true);
    modalSlide.setValue(height);
    modalOpacity.setValue(0);
    blurAnim.setValue(0);
    Animated.parallel([
      Animated.timing(modalSlide,   { toValue: 0,  duration: 400, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 1,  duration: 400, useNativeDriver: true }),
      Animated.timing(blurAnim,     { toValue: 10, duration: 400, useNativeDriver: false }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalSlide,   { toValue: height, duration: 300, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 0,      duration: 200, useNativeDriver: true }),
      Animated.timing(blurAnim,     { toValue: 0,      duration: 300, useNativeDriver: false }),
    ]).start(() => { setModalVisible(false); setSelectedItem(null); });
  };

  const renderItem = ({ item }: { item: Medicamento }) => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => openModal(item)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalhes de ${item.nome}, paciente ${item.nomePaciente}`}
      >
        {/* Foto miniatura no card da lista */}
        {item.foto_path ? (
          <Image
            source={{ uri: `file://${item.foto_path}` }}
            style={styles.itemFoto}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.itemIcon}>
            <Text style={styles.itemEmoji}>💊</Text>
          </View>
        )}
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{item.nome}</Text>
          <Text style={styles.itemSubtitle}>👤 {item.nomePaciente}</Text>
          {item.notas ? <Text style={styles.itemNotes}>📝 {item.notas}</Text> : null}
        </View>
        <Text style={styles.itemChevron}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderContent = () => {
    if (loading)
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando medicamentos...</Text>
        </View>
      );

    if (!searchText.trim())
      return (
        <ScrollView contentContainerStyle={styles.flexGrow1} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.centerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.emptyIcon}>🔎</Text>
            <Text style={styles.emptyTitle}>Busca Rápida</Text>
            <Text style={styles.emptyText}>
              Digite o nome do medicamento ou paciente para iniciar a busca.
            </Text>
            <View style={styles.instructionsCard}>
              {[
                'Busca por nome do remédio',
                'Busca por nome do paciente',
                'Busca por observações',
              ].map((text, i) => (
                <View key={i} style={styles.instructionRow}>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text style={styles.instructionText}>{text}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      );

    if (filtered.length === 0)
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Nenhum resultado</Text>
          <Text style={styles.emptyText}>
            Não encontramos medicamentos correspondentes à sua busca.
          </Text>
        </View>
      );

    return (
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScreenContainer showGradient={true}>

        <View style={styles.header}>
          <View style={styles.searchBox}>
            <Text style={styles.searchEmoji}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Nome do medicamento ou paciente..."
              placeholderTextColor={COLORS.placeholder}
              value={searchText}
              onChangeText={setSearchText}
              accessibilityLabel="Campo de busca de medicamentos"
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                accessibilityRole="button"
                accessibilityLabel="Limpar busca"
                style={styles.clearButton}
              >
                <Text style={styles.clearEmoji}>✖</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.flex1}>{renderContent()}</View>

        {/* Modal de detalhes */}
        {modalVisible && selectedItem && (
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[styles.blurBackground, { backgroundColor: `rgba(0,0,0,${modalOpacity})` }]}
            >
              <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />
            </Animated.View>

            <Animated.View style={[styles.newModal, { transform: [{ translateY: modalSlide }] }]}>
              <Text style={styles.newModalTitle}>Detalhes do Medicamento</Text>

              <ScrollView
                style={styles.newModalBody}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* ── FOTO DA EMBALAGEM ── */}
                {selectedItem.foto_path && (
                  <View style={styles.fotoModalContainer}>
                    <Image
                      source={{ uri: `file://${selectedItem.foto_path}` }}
                      style={styles.fotoModal}
                      resizeMode="contain"
                    />
                  </View>
                )}

                <View style={styles.newModalSection}>
                  <Text style={styles.newLabel}>👤 Paciente</Text>
                  <Text style={styles.newValue}>{selectedItem.nomePaciente}</Text>
                </View>

                <View style={styles.newModalSection}>
                  <Text style={styles.newLabel}>💊 Medicamento</Text>
                  <Text style={styles.newValue}>{selectedItem.nome}</Text>
                </View>

                <View style={styles.newModalRow}>
                  <View style={styles.newModalHalf}>
                    <Text style={styles.newLabel}>💉 Dosagem</Text>
                    <Text style={styles.newValue}>
                      {formatarDosagemComUnidade(selectedItem.dosagem, selectedItem.tipo)}
                    </Text>
                  </View>
                  <View style={styles.newModalHalf}>
                    <Text style={styles.newLabel}>⏰ Frequência</Text>
                    <Text style={styles.newValue}>A cada {selectedItem.intervalo_horas}h</Text>
                  </View>
                </View>

                <View style={styles.newModalSection}>
                  <Text style={styles.newLabel}>📅 Início</Text>
                  <Text style={styles.newValue}>
                    {selectedItem.dataInicio} às {formatarHorario(selectedItem.horario_inicial)}
                  </Text>
                </View>

                <View style={styles.newModalSection}>
                  <Text style={styles.newLabel}>📊 Duração</Text>
                  <Text style={styles.newValue}>{selectedItem.duracaoTratamento} dias</Text>
                </View>

                <View style={styles.newModalSection}>
                  <Text style={styles.newLabel}>📝 Observações</Text>
                  <Text style={styles.newNotes}>
                    {selectedItem.notas || 'Nenhuma observação registrada'}
                  </Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.newShareButton}
                    onPress={handleShareMedicamento}
                    accessibilityRole="button"
                    accessibilityLabel="Compartilhar detalhes do medicamento"
                  >
                    <Text style={styles.newShareEmoji}>📤</Text>
                    <Text style={styles.newShareText}>Compartilhar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.newCloseButton}
                    onPress={closeModal}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar detalhes"
                  >
                    <Text style={styles.newCloseEmoji}>✖</Text>
                    <Text style={styles.newCloseText}>Fechar</Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </Animated.View>
          </View>
        )}

      </ScreenContainer>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchEmoji: { fontSize: 20, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  clearButton: {
    padding: 6,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearEmoji: { fontSize: 16, color: COLORS.textSecondary },
  flex1:    { flex: 1 },
  flexGrow1: { flexGrow: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: { fontSize: 60, marginBottom: 12 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 28,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkmark: {
    fontSize: 24,
    color: COLORS.primary,
    marginRight: 12,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  listContainer: { padding: 16 },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 72,
  },
  // Foto miniatura no card da lista
  itemFoto: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemEmoji:   { fontSize: 24 },
  itemContent: { flex: 1 },
  itemTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 24,
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  itemNotes: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 2,
  },
  itemChevron: {
    fontSize: 24,
    color: COLORS.placeholder,
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  // Foto no modal de detalhes
  fotoModalContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fotoModal: {
    width: '100%',
    height: 200,
    backgroundColor: '#F0F0F0',
  },
  newModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    maxHeight: '85%',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 1,
  },
  newModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: COLORS.primaryDark,
    marginBottom: 16,
    lineHeight: 28,
  },
  newModalBody:        { paddingBottom: 10 },
  modalScrollContent:  { paddingBottom: 50 },
  newModalSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  newModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  newModalHalf: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  newLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 22,
  },
  newValue: {
    fontSize: 17,
    color: COLORS.textPrimary,
    fontWeight: '600',
    lineHeight: 24,
  },
  newNotes: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
  },
  newShareButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  newShareEmoji: { fontSize: 20, marginRight: 8 },
  newShareText:  { color: '#FFF', fontWeight: '700', fontSize: 16 },
  newCloseButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  newCloseEmoji: { fontSize: 18, marginRight: 8 },
  newCloseText: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '700' },
});

export default BuscarMedicamento;