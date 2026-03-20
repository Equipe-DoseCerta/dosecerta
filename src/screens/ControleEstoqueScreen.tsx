/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Medicamento,
  fetchMedicamentos,
  updateMedicamento,
} from '../database/database';
import NativeAlarmService from '../services/NativeAlarmService';
import { cancelarAlarmesMedicamento } from '../services/alarmeService';
import { emitMedicamentoDesativado } from '../services/eventService';
import {
  listenMedicamentoExcluido,
  listenMedicamentoAdicionado,
} from '../services/eventService';
import { useModal } from '../components/ModalContext';
import ScreenContainer from '../components/ScreenContainer';

// LayoutAnimation no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- RESPONSIVIDADE ---
const { height: screenHeight } = Dimensions.get('window');
const isSmallDevice = screenHeight < 700;
const isTinyDevice  = screenHeight < 650;

const scale = (size: number) => {
  if (isTinyDevice)  return size * 0.85;
  if (isSmallDevice) return size * 0.92;
  return size;
};

const fontSize = {
  xs:   scale(13),  // ✅ era 12/10 — mínimo absoluto
  sm:   scale(15),  // ✅ era 13
  md:   scale(16),  // ✅ era 14
  lg:   scale(17),  // ✅ era 16
  xl:   scale(19),  // ✅ era 18
  xxl:  scale(21),  // ✅ era 20
  xxxl: scale(25),  // ✅ era 24
};

const formatarUnidadeLiquido = (dosagem: string) => {
  const v = parseFloat(dosagem.replace(',', '.'));
  if (isNaN(v)) return 'gotas';
  return v <= 1 ? 'gota' : 'gotas';
};

type StatusEstoque = 'todos' | 'critico' | 'baixo' | 'normal' | 'concluido';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ControleEstoqueScreen = () => {
  const { showModal } = useModal();
  const [medicamentos, setMedicamentos]       = useState<Medicamento[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [modalVisible, setModalVisible]       = useState(false);
  const [currentMedicamento, setCurrentMedicamento] = useState<Medicamento | null>(null);
  const [filtroStatus, setFiltroStatus]       = useState<StatusEstoque>('todos');
  const [expandedIds, setExpandedIds]         = useState<Set<number>>(new Set());

  // campos do modal de edição
  const [dosagemEdit, setDosagemEdit]   = useState('');
  const [intervaloEdit, setIntervaloEdit] = useState('');
  const [horarioEdit, setHorarioEdit]   = useState('');
  const [duracaoEdit, setDuracaoEdit]   = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [processing, setProcessing]     = useState(false);
  const [errors, setErrors] = useState({
    dosagem: false, intervalo: false, horario: false, duracao: false,
  });

  // --- LÓGICA DE CÁLCULO (preservada integralmente) ---

  const calcularDosesTotais = useCallback((med: Medicamento) => {
    if (!med.intervalo_horas || !med.duracaoTratamento || med.intervalo_horas <= 0 || med.duracaoTratamento <= 0) return 0;
    return Math.ceil((med.duracaoTratamento * 24) / med.intervalo_horas);
  }, []);

  const calcularDosesConsumidas = useCallback((med: Medicamento) => {
    if (!med.horario_inicial || !med.intervalo_horas || !med.dataInicio ||
        !med.horario_inicial.match(/^\d{2}:\d{2}$/) ||
        !med.dataInicio.match(/^\d{2}\/\d{2}\/\d{4}$/) ||
        med.intervalo_horas <= 0) return 0;
    try {
      const agora = new Date();
      const [dia, mes, ano] = med.dataInicio.split('/').map(Number);
      const [horaStr, minutoStr] = med.horario_inicial.split(':').map(Number);
      const horarioInicial = new Date(ano, mes - 1, dia, horaStr, minutoStr);
      if (isNaN(horarioInicial.getTime()) || agora < horarioInicial) return 0;
      const diferencaHoras = (agora.getTime() - horarioInicial.getTime()) / (1000 * 60 * 60);
      return Math.floor(diferencaHoras / med.intervalo_horas) + 1;
    } catch { return 0; }
  }, []);

  const calcularProximaDose = useCallback((med: Medicamento) => {
    if (!med.horario_inicial || !med.intervalo_horas || !med.dataInicio || med.intervalo_horas <= 0) return 'N/A';
    try {
      const agora = new Date();
      const [diaInicio, mes, ano] = med.dataInicio.split('/').map(Number);
      const [horaStr, minutoStr] = med.horario_inicial.split(':').map(Number);
      const horarioInicial = new Date(ano, mes - 1, diaInicio, horaStr, minutoStr);
      if (isNaN(horarioInicial.getTime())) return 'N/A';
      const dosesTotais    = calcularDosesTotais(med);
      const dosesConsumidas = calcularDosesConsumidas(med);
      if (dosesConsumidas >= dosesTotais) return 'Concluído';
      const ultimaDoseTime = dosesConsumidas === 0
        ? new Date(horarioInicial.getTime() - med.intervalo_horas * 3600 * 1000)
        : new Date(horarioInicial.getTime() + (dosesConsumidas - 1) * med.intervalo_horas * 3600 * 1000);
      const proximaDoseTime = new Date(ultimaDoseTime.getTime() + med.intervalo_horas * 3600 * 1000);
      const diffMinutos = (proximaDoseTime.getTime() - agora.getTime()) / (1000 * 60);
      if (diffMinutos <= 5 && diffMinutos >= 0) return 'Agora';
      if (diffMinutos < 0) return 'Atrasada';
      const h = proximaDoseTime.getHours().toString().padStart(2, '0');
      const m = proximaDoseTime.getMinutes().toString().padStart(2, '0');
      return proximaDoseTime.getDate() !== agora.getDate() ? `${h}:${m} (Amanhã)` : `${h}:${m}`;
    } catch { return 'N/A'; }
  }, [calcularDosesTotais, calcularDosesConsumidas]);

  const calcularEstoqueAtual = useCallback((med: Medicamento) =>
    Math.max(0, calcularDosesTotais(med) - calcularDosesConsumidas(med)),
    [calcularDosesTotais, calcularDosesConsumidas]);

  const calcularDiasRestantes = useCallback((med: Medicamento) => {
    const intervalHoras   = med.intervalo_horas || 24;
    const dosesRestantes  = Math.max(0, calcularDosesTotais(med) - calcularDosesConsumidas(med));
    const horasRestantes  = dosesRestantes * intervalHoras;
    return Math.floor(horasRestantes / 24);
  }, [calcularDosesTotais, calcularDosesConsumidas]);

  const getStatusEstoque = useCallback((med: Medicamento) => {
    const dosesConsumidas = calcularDosesConsumidas(med);
    const dosesTotais     = calcularDosesTotais(med);
    if (dosesConsumidas >= dosesTotais) return 'concluido';
    const pct = ((dosesTotais - dosesConsumidas) / dosesTotais) * 100;
    if (pct <= 10) return 'critico';
    if (pct <= 30) return 'baixo';
    return 'normal';
  }, [calcularDosesConsumidas, calcularDosesTotais]);

  // --- CARREGAMENTO ---

  const loadMedicamentos = useCallback(async () => {
    try {
      setLoading(true);
      const todos = await fetchMedicamentos();
      setMedicamentos(todos.filter(m => m.ativo));
    } catch {
      showModal({ type: 'error', message: 'Erro ao carregar medicamentos' });
    } finally {
      setLoading(false);
    }
  }, [showModal]);

  useEffect(() => {
    loadMedicamentos();
    const unsubscribeExcluido  = listenMedicamentoExcluido((id) => {
      setMedicamentos(prev => prev.filter(m => m.id !== id));
    });
    const unsubscribeAdicionado = listenMedicamentoAdicionado(() => loadMedicamentos());
    return () => {
      if (typeof unsubscribeExcluido.remove  === 'function') unsubscribeExcluido.remove();
      if (typeof unsubscribeAdicionado.remove === 'function') unsubscribeAdicionado.remove();
    };
  }, [loadMedicamentos]);

  // --- EXPAND / COLLAPSE ---

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // --- EDITAR (preservado) ---

  const handleEdit = (med: Medicamento) => {
    setCurrentMedicamento(med);
    setDosagemEdit(med.dosagem || '');
    setIntervaloEdit(med.intervalo_horas?.toString() || '');
    setHorarioEdit(med.horario_inicial || '');
    setDuracaoEdit(med.duracaoTratamento?.toString() || '');
    setModalVisible(true);
  };

  const handleCloseEdit = () => {
    setModalVisible(false);
    setCurrentMedicamento(null);
    setErrors({ dosagem: false, intervalo: false, horario: false, duracao: false });
  };

  const handleSave = async () => {
    const newErrors = {
      dosagem:   !dosagemEdit  || parseFloat(dosagemEdit) <= 0,
      intervalo: !intervaloEdit || parseFloat(intervaloEdit) <= 0,
      horario:   !horarioEdit,
      duracao:   !duracaoEdit  || parseInt(duracaoEdit, 10) <= 0,
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(e => e)) {
      showModal({ type: 'error', message: 'Preencha todos os campos corretamente' });
      return;
    }
    if (!currentMedicamento?.id) return;
    setProcessing(true);
    try {
      const updated: Medicamento & { id: number } = {
        ...currentMedicamento,
        id:               currentMedicamento.id,
        dosagem:          dosagemEdit,
        intervalo_horas:  parseFloat(intervaloEdit),
        horario_inicial:  horarioEdit,
        duracaoTratamento: parseInt(duracaoEdit, 10),
        dosesTotais:      Math.ceil((parseInt(duracaoEdit, 10) * 24) / parseFloat(intervaloEdit)),
      };
      await updateMedicamento(currentMedicamento.id, updated);
      setMedicamentos(prev => prev.map(m => m.id === currentMedicamento.id ? updated : m));
      try {
        await NativeAlarmService.agendarTodosAlarmes(updated);
      } catch (alarmError) {
        console.error('[ESTOQUE] ⚠️ Dados salvos, erro ao reagendar alarmes:', alarmError);
      }
      showModal({ type: 'success', message: 'Medicamento atualizado com sucesso' });
      handleCloseEdit();
    } catch {
      showModal({ type: 'error', message: 'Erro ao atualizar medicamento' });
    } finally {
      setProcessing(false);
    }
  };

  // --- DELETAR (preservado) ---

  const handleDelete = (med: Medicamento) => {
    showModal({
      type: 'confirmation',
      title: 'Encerrar Tratamento',
      message: `Deseja encerrar o tratamento com "${med.nome}"?`,
      confirmText: 'Sim, Encerrar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        if (!med.id) return;
        try {
          setMedicamentos(prev => prev.filter(m => m.id !== med.id));
          await NativeAlarmService.cancelAllAlarms(med.id);
          await cancelarAlarmesMedicamento(med.id);
          await updateMedicamento(med.id, { ativo: false });
          emitMedicamentoDesativado(med.id);
          showModal({ type: 'success', message: 'Tratamento encerrado.' });
        } catch (error) {
          console.error('[ESTOQUE] ❌ Erro ao encerrar:', error);
          showModal({ type: 'error', message: 'Erro ao encerrar tratamento.' });
        }
      },
    });
  };

  const onTimeChange = (_: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const h = selectedDate.getHours().toString().padStart(2, '0');
      const m = selectedDate.getMinutes().toString().padStart(2, '0');
      setHorarioEdit(`${h}:${m}`);
    }
  };

  // --- HELPERS DE LABEL E COR ---

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critico':   return '#C0392B';
      case 'baixo':     return '#B45309';
      case 'normal':    return '#1E7E34';
      case 'concluido': return '#64748B';
      default:          return '#64748B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'critico':   return 'CRÍTICO';
      case 'baixo':     return 'BAIXO';
      case 'normal':    return 'NORMAL';
      case 'concluido': return 'CONCLUÍDO';
      default:          return '';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'critico':   return '🔴';
      case 'baixo':     return '🟡';
      case 'normal':    return '🟢';
      case 'concluido': return '✅';
      default:          return '⚪';
    }
  };

  // --- FILTRO ---

  const medicamentosFiltrados = medicamentos.filter(m =>
    filtroStatus === 'todos' ? true : getStatusEstoque(m) === filtroStatus
  );

  const stats = {
    total:     medicamentos.length,
    critico:   medicamentos.filter(m => getStatusEstoque(m) === 'critico').length,
    baixo:     medicamentos.filter(m => getStatusEstoque(m) === 'baixo').length,
    concluido: medicamentos.filter(m => getStatusEstoque(m) === 'concluido').length,
  };

  // --- LOADING ---

  if (loading) {
    return (
      <ScreenContainer showGradient={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ScreenContainer showGradient={true}>

      {/* Subtítulo */}
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>Gerencie o estoque dos seus medicamentos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* ── RESUMO ── */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Resumo</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#054F77' }]}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#C0392B' }]}>{stats.critico}</Text>
              <Text style={styles.statLabel}>Críticos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#B45309' }]}>{stats.baixo}</Text>
              <Text style={styles.statLabel}>Baixos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#64748B' }]}>{stats.concluido}</Text>
              <Text style={styles.statLabel}>Concluídos</Text>
            </View>
          </View>
        </View>

        {/* ── FILTROS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['todos', 'critico', 'baixo', 'normal', 'concluido'] as StatusEstoque[]).map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, filtroStatus === status && styles.filterTabActive]}
              onPress={() => setFiltroStatus(status)}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por ${status}`}
            >
              <Text style={[styles.filterTabText, filtroStatus === status && styles.filterTabTextActive]}>
                {status === 'todos' ? 'Todos' : getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── LISTA DE CARDS ── */}
        {medicamentosFiltrados.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>
              {filtroStatus === 'todos'
                ? 'Nenhum medicamento cadastrado'
                : `Nenhum medicamento ${getStatusLabel(filtroStatus).toLowerCase()}`}
            </Text>
          </View>
        ) : (
          medicamentosFiltrados.map(med => {
            const status          = getStatusEstoque(med);
            const statusColor     = getStatusColor(status);
            const dosesTotais     = calcularDosesTotais(med);
            const dosesConsumidas = calcularDosesConsumidas(med);
            const estoque         = calcularEstoqueAtual(med);
            const diasRestantes   = calcularDiasRestantes(med);
            const proximaDose     = calcularProximaDose(med);
            const percentual      = dosesTotais > 0
              ? ((dosesTotais - dosesConsumidas) / dosesTotais) * 100 : 0;
            const isExpanded = expandedIds.has(med.id!);

            return (
              <View key={med.id} style={[styles.medCard, { borderLeftColor: statusColor }]}>

                {/* ══ ÁREA PRINCIPAL — sempre visível ══ */}
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => toggleExpand(med.id!)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${med.nome}, ${getStatusLabel(status)}. Toque para ${isExpanded ? 'recolher' : 'ver detalhes'}`}
                >
                  {/* Linha 1: nome + badge */}
                  <View style={styles.cardTopRow}>
                    <Text style={styles.medName} numberOfLines={1}>{med.nome}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.statusBadgeText}>
                        {getStatusEmoji(status)}  {getStatusLabel(status)}
                      </Text>
                    </View>
                  </View>

                  {/* Linha 2: paciente */}
                  <Text style={styles.patientName}>👤 {med.nomePaciente}</Text>

                  {/* Linha 3: as 3 infos ESSENCIAIS */}
                  <View style={styles.essentialRow}>
                    <View style={styles.essentialItem}>
                      <Text style={styles.essentialLabel}>⏰ Próxima dose</Text>
                      <Text style={[styles.essentialValue, { color: statusColor }]}>{proximaDose}</Text>
                    </View>
                    <View style={styles.essentialDivider} />
                    <View style={styles.essentialItem}>
                      <Text style={styles.essentialLabel}>📦 Estoque</Text>
                      <Text style={[styles.essentialValue, { color: statusColor }]}>{estoque} doses</Text>
                    </View>
                    <View style={styles.essentialDivider} />
                    <View style={styles.essentialItem}>
                      <Text style={styles.essentialLabel}>📅 Dias</Text>
                      <Text style={[styles.essentialValue, { color: statusColor }]}>{diasRestantes}d</Text>
                    </View>
                  </View>

                  {/* Chevron expand */}
                  <Text style={styles.chevron}>{isExpanded ? '▲ Ocultar detalhes' : '▼ Ver detalhes'}</Text>
                </TouchableOpacity>

                {/* ══ ÁREA DE DETALHES — só ao expandir ══ */}
                {isExpanded && (
                  <View style={styles.cardDetails}>

                    {/* Barra de progresso */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Progresso do tratamento</Text>
                        <Text style={styles.progressNumbers}>{dosesConsumidas}/{dosesTotais} doses</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${percentual}%`, backgroundColor: statusColor }]} />
                      </View>
                    </View>

                    {/* Infos técnicas */}
                    <View style={styles.detailGrid}>
                      <View style={styles.detailBox}>
                        <Text style={styles.detailLabel}>Dosagem</Text>
                        <Text style={styles.detailValue}>
                          {med.dosagem} {med.tipo === 'líquido' ? formatarUnidadeLiquido(med.dosagem) : med.unidade}
                        </Text>
                      </View>
                      <View style={styles.detailBox}>
                        <Text style={styles.detailLabel}>Intervalo</Text>
                        <Text style={styles.detailValue}>A cada {med.intervalo_horas}h</Text>
                      </View>
                      <View style={styles.detailBox}>
                        <Text style={styles.detailLabel}>Início</Text>
                        <Text style={styles.detailValue}>{med.horario_inicial}</Text>
                      </View>
                      <View style={styles.detailBox}>
                        <Text style={styles.detailLabel}>Duração</Text>
                        <Text style={styles.detailValue}>{med.duracaoTratamento}d</Text>
                      </View>
                    </View>

                    {/* Notas */}
                    {med.notas ? (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesText}>💡 {med.notas}</Text>
                      </View>
                    ) : null}

                    {/* Ações */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.btnEdit}
                        onPress={() => handleEdit(med)}
                        accessibilityRole="button"
                        accessibilityLabel={`Editar ${med.nome}`}
                      >
                        <Text style={styles.btnEditText}>✏️ Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnDelete}
                        onPress={() => handleDelete(med)}
                        accessibilityRole="button"
                        accessibilityLabel={`Encerrar tratamento de ${med.nome}`}
                      >
                        <Text style={styles.btnDeleteText}>🗑️ Encerrar</Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ══ MODAL DE EDIÇÃO (preservado) ══ */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Medicamento</Text>
              <Text style={styles.modalSubtitle}>{currentMedicamento?.nome}</Text>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dosagem *</Text>
                <TextInput
                  style={[styles.input, errors.dosagem && styles.inputError]}
                  value={dosagemEdit}
                  onChangeText={setDosagemEdit}
                  placeholder="Ex: 5"
                  keyboardType="numeric"
                  accessibilityLabel="Dosagem"
                />
                {errors.dosagem && <Text style={styles.errorText}>⚠ Campo obrigatório</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Intervalo (horas) *</Text>
                <TextInput
                  style={[styles.input, errors.intervalo && styles.inputError]}
                  value={intervaloEdit}
                  onChangeText={setIntervaloEdit}
                  placeholder="Ex: 8"
                  keyboardType="numeric"
                  accessibilityLabel="Intervalo em horas"
                />
                {errors.intervalo && <Text style={styles.errorText}>⚠ Campo obrigatório</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Horário Inicial *</Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar horário inicial"
                >
                  <View style={[styles.input, styles.inputTouchable, errors.horario && styles.inputError]}>
                    <Text style={horarioEdit ? styles.inputTouchableText : styles.inputPlaceholder}>
                      {horarioEdit || 'Selecionar horário'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {errors.horario && <Text style={styles.errorText}>⚠ Campo obrigatório</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duração (dias) *</Text>
                <TextInput
                  style={[styles.input, errors.duracao && styles.inputError]}
                  value={duracaoEdit}
                  onChangeText={setDuracaoEdit}
                  placeholder="Ex: 7"
                  keyboardType="numeric"
                  accessibilityLabel="Duração em dias"
                />
                {errors.duracao && <Text style={styles.errorText}>⚠ Campo obrigatório</Text>}
              </View>

            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={handleCloseEdit}
                disabled={processing}
                accessibilityRole="button"
                accessibilityLabel="Cancelar edição"
              >
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSave}
                onPress={handleSave}
                disabled={processing}
                accessibilityRole="button"
                accessibilityLabel="Salvar alterações"
              >
                {processing
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.btnSaveText}>Salvar Alterações</Text>
                }
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour
                onChange={onTimeChange}
              />
            )}

          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
};

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { color: 'white', marginTop: scale(12), fontSize: fontSize.md, fontWeight: 'bold' },

  header:           { padding: scale(10), paddingHorizontal: scale(20), alignItems: 'center' },
  headerSubtitle:   { fontSize: fontSize.md, marginTop: 10, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: scale(24) },

  scrollContainer:  { paddingHorizontal: scale(10), paddingBottom: scale(30) },

  // Resumo
  statsCard:   { backgroundColor: 'white', borderRadius: scale(16), padding: scale(16), marginBottom: scale(16), elevation: 4 },
  statsTitle:  { fontSize: fontSize.lg, fontWeight: 'bold', color: '#054F77', marginBottom: scale(14), textAlign: 'center' },
  statsRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  statItem:    { alignItems: 'center', flex: 1 },
  // ✅ era xxl (20) — mantido mas com fonte maior
  statValue:   { fontSize: fontSize.xxl, fontWeight: 'bold', lineHeight: scale(28) },
  // ✅ era xs (12) → agora 13
  statLabel:   { fontSize: fontSize.xs, color: '#555', marginTop: scale(2) },

  // Filtros
  filterScroll:          { marginBottom: scale(16) },
  filterTab:             { paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(20), backgroundColor: 'rgba(255,255,255,0.25)', marginRight: scale(10), minHeight: 40, justifyContent: 'center' },
  filterTabActive:       { backgroundColor: 'white' },
  // ✅ era sm (13) → 15
  filterTabText:         { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
  filterTabTextActive:   { color: '#054F77' },

  // Card principal
  medCard: {
    backgroundColor: 'white',
    borderRadius: scale(16),
    marginBottom: scale(14),
    overflow: 'hidden',
    elevation: 3,
    borderLeftWidth: 5,       // ✅ faixa colorida no lugar do statusIndicator fino
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Área sempre visível
  cardMain: {
    padding: scale(16),
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  // ✅ era xl (18) → agora xl (19)
  medName:     { flex: 1, fontSize: fontSize.xl, fontWeight: 'bold', color: '#0F172A', marginRight: scale(8) },
  patientName: { fontSize: fontSize.sm, color: '#475569', marginBottom: scale(12), lineHeight: scale(22) },

  // Badge de status — maior e mais legível
  statusBadge:     { paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(8), minHeight: 32, justifyContent: 'center' },
  // ✅ era 10px — agora 13px
  statusBadgeText: { fontSize: fontSize.xs, fontWeight: 'bold', color: 'white' },

  // Linha das 3 infos essenciais
  essentialRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: scale(12), padding: scale(12), marginBottom: scale(10) },
  essentialItem:   { flex: 1, alignItems: 'center' },
  essentialDivider: { width: 1, height: scale(36), backgroundColor: '#E2E8F0' },
  // ✅ era 10/11px — agora 13
  essentialLabel:  { fontSize: fontSize.xs, color: '#64748B', marginBottom: scale(4), textAlign: 'center' },
  // ✅ era 13/14px — agora 15 + bold
  essentialValue:  { fontSize: fontSize.sm, fontWeight: 'bold', textAlign: 'center', lineHeight: scale(22) },

  chevron: { fontSize: scale(13), color: '#94A3B8', textAlign: 'center', marginTop: scale(4) },

  // Área de detalhes (expandida)
  cardDetails: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  progressSection: { marginBottom: scale(14), marginTop: scale(12) },
  progressHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(6) },
  // ✅ era 12px — agora 13
  progressLabel:   { fontSize: fontSize.xs, fontWeight: '600', color: '#475569' },
  progressNumbers: { fontSize: fontSize.xs, color: '#64748B' },
  progressBarBg:   { height: scale(10), backgroundColor: '#E2E8F0', borderRadius: scale(5), overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: scale(5) },

  // Grid de infos técnicas 2x2
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: scale(12) },
  detailBox:  { width: '47%', backgroundColor: '#F8FAFC', padding: scale(10), borderRadius: scale(10) },
  // ✅ era 10px — agora 13
  detailLabel: { fontSize: fontSize.xs, color: '#64748B', marginBottom: scale(3) },
  // ✅ era 13px — agora 15
  detailValue: { fontSize: fontSize.sm, fontWeight: '700', color: '#1E293B' },

  notesBox:  { backgroundColor: '#FFFBEB', padding: scale(10), borderRadius: scale(10), marginBottom: scale(12) },
  // ✅ era 12px itálico — agora 14px sem itálico
  notesText: { fontSize: scale(14), color: '#92400E', lineHeight: scale(20) },

  // Botões de ação dentro do detalhe
  actionRow:     { flexDirection: 'row', gap: scale(10) },
  btnEdit: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#054F77',
    minHeight: 52,
  },
  // ✅ era sm (13) → agora md (16)
  btnEditText:   { color: '#054F77', fontWeight: 'bold', fontSize: fontSize.md },
  btnDelete: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C0392B',
    minHeight: 52,
  },
  btnDeleteText: { color: '#C0392B', fontWeight: 'bold', fontSize: fontSize.md },

  // Empty state
  emptyState: { alignItems: 'center', marginTop: scale(50), paddingHorizontal: scale(40) },
  emptyIcon:  { fontSize: scale(50), opacity: 0.6 },
  // ✅ era 14px → agora 16
  emptyText:  { color: 'white', marginTop: scale(12), fontSize: fontSize.md, textAlign: 'center', lineHeight: scale(24), opacity: 0.9 },

  // Modal de edição
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: 'white', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), padding: scale(24), maxHeight: '90%' },
  modalHeader:    { marginBottom: scale(20), alignItems: 'center' },
  // ✅ era xxl (20) → mantido em xxl (21) + lineHeight
  modalTitle:     { fontSize: fontSize.xxl, fontWeight: 'bold', color: '#054F77', lineHeight: scale(30) },
  // ✅ era md (14) → agora md (16)
  modalSubtitle:  { fontSize: fontSize.md, color: '#475569', marginTop: scale(4), lineHeight: scale(24) },
  modalForm:      { marginBottom: scale(16) },

  inputGroup:  { marginBottom: scale(16) },
  // ✅ era md (14) → agora md (16)
  inputLabel:  { fontSize: fontSize.md, fontWeight: '700', color: '#054F77', marginBottom: scale(8), lineHeight: scale(22) },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    padding: scale(16),
    // ✅ era lg (16) → agora lg (17)
    fontSize: fontSize.lg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    color: '#1E293B',
    minHeight: 56,           // ✅ área de toque confortável
  },
  inputTouchable:     { justifyContent: 'center' },
  inputTouchableText: { fontSize: fontSize.lg, color: '#1E293B' },
  inputPlaceholder:   { fontSize: fontSize.lg, color: '#94A3B8' },
  inputError:         { borderColor: '#C0392B', backgroundColor: '#FFF5F5' },
  // ✅ NOVO: erro inline com ícone
  errorText:          { fontSize: fontSize.xs, color: '#C0392B', marginTop: scale(4), lineHeight: scale(18) },

  modalActions: { flexDirection: 'row', gap: scale(12), paddingBottom: scale(10) },
  btnCancel: {
    flex: 1,
    paddingVertical: scale(16),
    borderRadius: scale(12),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    minHeight: 52,
  },
  // ✅ era hardcoded → agora usa fontSize.md (16)
  btnCancelText: { color: '#475569', fontWeight: 'bold', fontSize: fontSize.md },
  btnSave: {
    flex: 2,
    paddingVertical: scale(16),
    borderRadius: scale(12),
    backgroundColor: '#054F77',
    alignItems: 'center',
    minHeight: 52,
  },
  // ✅ era hardcoded → agora usa fontSize.md (16)
  btnSaveText: { color: 'white', fontWeight: 'bold', fontSize: fontSize.md },
});

export default ControleEstoqueScreen;