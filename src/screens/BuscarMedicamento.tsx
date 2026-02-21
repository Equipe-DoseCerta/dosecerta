import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { fetchMedicamentos, Medicamento } from '../database/database';

const COLORS = {
  primary: '#0A7AB8',
  primaryDark: '#054F77',
  background: '#F8FAFB',
  card: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  placeholder: '#9CA3AF',
  border: '#E5E7EB',
  accent: '#06B6D4',
};

const { height } = Dimensions.get('window');

const BuscarMedicamento = () => {
  const [searchText, setSearchText] = useState('');
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [filtered, setFiltered] = useState<Medicamento[]>([]);
  const [selectedItem, setSelectedItem] = useState<Medicamento | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const modalSlide = useRef(new Animated.Value(height)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;

  const unidadePorTipo: Record<string, string> = {
    cápsula: 'cápsula(s)',
    comprimido: 'comprimido(s)',
    ampola: 'ampola(s)',
    ml: 'ml',
    unidade: 'unidade(s)',
  };

  const formatarDosagemComUnidade = (dosagem: string | number, tipo: string) => {
    const tipoLower = tipo?.toLowerCase() || '';
    const unidade = unidadePorTipo[tipoLower] || tipo;
    return `${dosagem} ${unidade}`.trim();
  };

  const formatarHorario = (hora: string) => {
    try {
      if (!hora || !hora.includes(':')) {
        return 'Horário inválido';
      }
      return hora;
    } catch (error) {
      console.error('Erro ao formatar horário:', error);
      return 'Horário inválido';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchMedicamentos();
        setMedicamentos(data || []);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      } catch {
        Alert.alert('Erro', 'Não foi possível carregar os medicamentos.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (!searchText.trim()) {
      setFiltered([]);
      return;
    }
    const lower = searchText.toLowerCase();
    const results = medicamentos.filter(
      (item) =>
        item.nome.toLowerCase().includes(lower) ||
        item.nomePaciente.toLowerCase().includes(lower) ||
        (item.notas && item.notas.toLowerCase().includes(lower))
    );
    setFiltered(results);
  }, [searchText, medicamentos]);

  const handleShareMedicamento = async () => {
    if (!selectedItem) return;
    try {
      const message = `
📋 *Detalhes do Medicamento*

👤 *Paciente:* ${selectedItem.nomePaciente}
💊 *Medicamento:* ${selectedItem.nome}
💉 *Dosagem:* ${formatarDosagemComUnidade(
        selectedItem.dosagem,
        selectedItem.tipo
      )}
⏰ *Frequência:* A cada ${selectedItem.intervalo_horas}h
📅 *Início:* ${selectedItem.dataInicio} às ${formatarHorario(selectedItem.horario_inicial)}
📊 *Duração:* ${selectedItem.duracaoTratamento} dias
📝 *Observações:* ${
        selectedItem.notas || 'Nenhuma observação registrada'
      }

---
Compartilhado via DoseCerta`;

      await Share.share({ message, title: 'Detalhes do Medicamento' });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar os dados.');
    }
  };

  const openModal = (item: Medicamento) => {
    setSelectedItem(item);
    setModalVisible(true);
    modalSlide.setValue(height);
    modalOpacity.setValue(0);
    blurAnim.setValue(0);
    Animated.parallel([
      Animated.timing(modalSlide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(blurAnim, {
        toValue: 10,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalSlide, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedItem(null);
    });
  };

  const renderItem = ({ item }: { item: Medicamento }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => openModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemIcon}>
          <Text style={styles.itemEmoji}>💊</Text>
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{item.nome}</Text>
          <Text style={styles.itemSubtitle}>👤 {item.nomePaciente}</Text>
          {item.notas ? (
            <Text style={styles.itemNotes}>📝 {item.notas}</Text>
          ) : null}
        </View>
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
        <ScrollView 
          contentContainerStyle={styles.flexGrow1}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.centerContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.emptyIcon}>🔎</Text>
            <Text style={styles.emptyTitle}>Busca Rápida</Text>
            <Text style={styles.emptyText}>
              Digite o nome do medicamento ou paciente para iniciar a busca.
            </Text>

            {/* Card de instruções */}
            <View style={styles.instructionsCard}>
              <View style={styles.instructionRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.instructionText}>
                  Busca por nome do remédio
                </Text>
              </View>
              <View style={styles.instructionRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.instructionText}>
                  Busca por nome do paciente
                </Text>
              </View>
              <View style={styles.instructionRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.instructionText}>
                  Busca por observações
                </Text>
              </View>
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
            Verifique a ortografia ou tente termos diferentes.
          </Text>
        </View>
      );
    return (
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(i) => i.id?.toString() || Math.random().toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Text style={styles.searchEmoji}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou paciente..."
            placeholderTextColor={COLORS.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearEmoji}>✖️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderContent()}
      </KeyboardAvoidingView>

      {/* Modal moderno */}
      {modalVisible && (
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: modalOpacity,
              transform: [{ translateY: modalSlide }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.blurBackground,
              {
                backgroundColor: blurAnim.interpolate({
                  inputRange: [0, 10],
                  outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)'],
                }),
              },
            ]}
          />
          <View style={styles.newModal}>
            <Text style={styles.newModalTitle}>💊 Detalhes do Medicamento</Text>
            {selectedItem && (
              <ScrollView
                style={styles.newModalBody}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.newModalSection}>
                  <Text style={styles.newLabel}>👤 Paciente</Text>
                  <Text style={styles.newValue}>
                    {selectedItem.nomePaciente}
                  </Text>
                </View>
                <View style={styles.newModalSection}>
                  <Text style={styles.newLabel}>💊 Medicamento</Text>
                  <Text style={styles.newValue}>{selectedItem.nome}</Text>
                </View>
                <View style={styles.newModalRow}>
                  <View style={styles.newModalHalf}>
                    <Text style={styles.newLabel}>💉 Dosagem</Text>
                    <Text style={styles.newValue}>
                      {formatarDosagemComUnidade(
                        selectedItem.dosagem,
                        selectedItem.tipo
                      )}
                    </Text>
                  </View>
                  <View style={styles.newModalHalf}>
                    <Text style={styles.newLabel}>⏰ Frequência</Text>
                    <Text style={styles.newValue}>
                      A cada {selectedItem.intervalo_horas}h
                    </Text>
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
                  <Text style={styles.newValue}>
                    {selectedItem.duracaoTratamento} dias
                  </Text>
                </View>
                <View style={styles.newModalSection}>
                  <Text style={styles.newLabel}>📝 Observações</Text>
                  <Text style={styles.newNotes}>
                    {selectedItem.notas || 'Nenhuma observação registrada'}
                  </Text>
                </View>

                {/* Botões lado a lado */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.newShareButton}
                    onPress={handleShareMedicamento}
                  >
                    <Text style={styles.newShareEmoji}>📤</Text>
                    <Text style={styles.newShareText}>Compartilhar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.newCloseButton}
                    onPress={closeModal}
                  >
                    <Text style={styles.newCloseEmoji}>✖</Text>
                    <Text style={styles.newCloseText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchEmoji: { fontSize: 18, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  clearEmoji: { fontSize: 18, color: COLORS.textSecondary },

  flex1: { flex: 1 },
  flexGrow1: { flexGrow: 1 },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: { fontSize: 60, marginBottom: 10 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyText: { 
    color: COLORS.textSecondary, 
    fontSize: 14, 
    textAlign: 'center',
    marginBottom: 24,
  },

  // Card de instruções
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
  },

  listContainer: { padding: 16 },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    elevation: 2,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemEmoji: { fontSize: 22 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  itemSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  itemNotes: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  loadingText: { marginTop: 10, color: COLORS.textSecondary },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  newModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '85%',
    elevation: 12,
    zIndex: 1,
  },
  newModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: COLORS.primaryDark,
    marginBottom: 10,
  },
  newModalBody: { 
    paddingBottom: 10,
  },
  modalScrollContent: {
    paddingBottom: 50,
  },
  newModalSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  newLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  newValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  newNotes: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Botões lado a lado
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  newShareButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    elevation: 3,
  },
  newShareEmoji: { fontSize: 18, marginRight: 6 },
  newShareText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  newCloseButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  newCloseEmoji: { fontSize: 17, marginRight: 6 },
  newCloseText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
});

export default BuscarMedicamento;