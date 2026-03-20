import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Medicamento, fetchMedicamentos, deleteMedicamento } from '../database/database';
import NativeAlarmService from '../services/NativeAlarmService';
import { cancelarAlarmesMedicamento } from '../services/alarmeService';
import { useModal } from '../components/ModalContext';
import ScreenContainer from '../components/ScreenContainer';
import { theme } from '../constants/theme';

// --- Funções de formatação (preservadas) ---

const formatarDosagem = (tipo: string, dosagem: string, unidade?: string) => {
  const tipoLower = tipo?.toLowerCase() || '';
  if (tipoLower === 'líquido') return `${dosagem} ml`;
  if (tipoLower === 'gotas') return dosagem === '1' ? '1 gota' : `${dosagem} gotas`;
  return `${dosagem} ${unidade || ''}`;
};

const formatarHorario = (hora: string) => {
  try {
    if (!hora || !hora.includes(':')) return 'Horário inválido';
    return hora;
  } catch {
    return 'Horário inválido';
  }
};

// ============================================================================

const HistoricoScreen = () => {
  const navigation = useNavigation();
  const isFocused  = useIsFocused();
  const { showModal } = useModal();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Carregamento (preservado) ---
  const carregarMedicamentos = useCallback(async () => {
    setLoading(true);
    try {
      const todos = await fetchMedicamentos();
      const hoje = new Date();
      const limite30dias = new Date();
      limite30dias.setDate(hoje.getDate() - 30);

      setMedicamentos(todos.filter(m => {
        // Apenas medicamentos com alarme (não os de apenas registro)
        if (m.tipo_cadastro === 'registro') return false;
        // Apenas inativos (tratamentos finalizados)
        if (m.ativo) return false;
        // Apenas dos últimos 30 dias
        if (m.dataInicio) {
          const partes = m.dataInicio.split('/');
          if (partes.length === 3) {
            const dataInicio = new Date(
              parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10)
            );
            return dataInicio >= limite30dias;
          }
        }
        return true;
      }));
    } catch {
      showModal({
        type: 'error',
        message: 'Não foi possível carregar o histórico de medicamentos.',
      });
      setMedicamentos([]);
    } finally {
      setLoading(false);
    }
  }, [showModal]);

  // --- Excluir (preservado) ---
  const handleExcluir = (id: number) => {
    showModal({
      type: 'confirmation',
      title: 'Confirmar Exclusão',
      message: 'Tem certeza de que deseja excluir este medicamento? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await NativeAlarmService.cancelAllAlarms(id);
          await cancelarAlarmesMedicamento(id);
          await deleteMedicamento(id);
          setMedicamentos(prev => prev.filter(med => med.id !== id));
          showModal({ type: 'success', message: 'Medicamento excluído com sucesso.' });
        } catch {
          showModal({ type: 'error', message: 'Não foi possível excluir o medicamento.' });
        }
      },
    });
  };

  // --- Listeners (preservados) ---
  useEffect(() => {
    if (isFocused) carregarMedicamentos();
    const listenerAdd       = DeviceEventEmitter.addListener('medicamento-adicionado', carregarMedicamentos);
    const listenerDelete    = DeviceEventEmitter.addListener('medicamento-excluido', carregarMedicamentos);
    const listenerDoseTomada = DeviceEventEmitter.addListener('dose-tomada', carregarMedicamentos);
    return () => {
      listenerAdd.remove();
      listenerDelete.remove();
      listenerDoseTomada.remove();
    };
  }, [isFocused, carregarMedicamentos]);

  // --- Compartilhar (preservado) ---
  const handleCompartilhar = async (medicamento: Medicamento) => {
    try {
      const mensagem =
        `Relatório de Medicamento:\n\n`
        + `Paciente: ${medicamento.nomePaciente}\n`
        + `Medicamento: ${medicamento.nome}\n`
        + `Dosagem: ${formatarDosagem(medicamento.tipo, medicamento.dosagem, medicamento.unidade)}\n`
        + `Horário de Início: ${formatarHorario(medicamento.horario_inicial)}\n`
        + `Intervalo: ${medicamento.intervalo_horas} horas\n`
        + `Duração: ${medicamento.duracaoTratamento} dias\n`
        + `Notas: ${medicamento.notas || 'Nenhuma'}`;
      await Share.share({ message: mensagem, title: 'Relatório de Medicamento' });
    } catch {
      showModal({ type: 'error', message: 'Não foi possível compartilhar o relatório.' });
    }
  };

  // --- Render de cada card ---
  const renderItem = ({ item }: { item: Medicamento }) => (
    <View style={styles.card}>

      {/* Cabeçalho: nome + badge */}
      <View style={styles.cardHeader}>
        <View style={styles.headerContent}>
          {/* ✅ 18 → 19px */}
          <Text style={styles.medName}>{item.nome}</Text>
          {/* ✅ 14 → 16px */}
          <Text style={styles.patientName}>👤 {item.nomePaciente}</Text>
        </View>
        <View style={[styles.statusBadge, item.ativo ? styles.statusActive : styles.statusInactive]}>
          {/* ✅ 12 → 14px */}
          <Text style={styles.statusText}>{item.ativo ? 'Ativo' : 'Finalizado'}</Text>
        </View>
      </View>

      {/* Foto da embalagem */}
      {item.foto_path && (
        <View style={styles.fotoContainer}>
          <Image
            source={{ uri: `file://${item.foto_path}` }}
            style={styles.fotoEmbalagem}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Corpo: detalhes */}
      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          {/* ✅ 14 → 16px em todos os label/value */}
          <Text style={styles.detailLabel}>Dosagem</Text>
          <Text style={styles.detailValue}>{formatarDosagem(item.tipo, item.dosagem, item.unidade)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Início</Text>
          <Text style={styles.detailValue}>{item.dataInicio} às {item.horario_inicial}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Intervalo</Text>
          <Text style={styles.detailValue}>A cada {item.intervalo_horas}h</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duração</Text>
          <Text style={styles.detailValue}>{item.duracaoTratamento} dia(s)</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total de doses</Text>
          <Text style={styles.detailValue}>{item.dosesTotais}</Text>
        </View>

        {item.notas ? (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Observações</Text>
            {/* ✅ 14px itálico → 15px sem itálico */}
            <Text style={styles.notesText}>{item.notas}</Text>
          </View>
        ) : null}
      </View>

      {/* Rodapé: ações — ✅ botões maiores e com label */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={() => handleCompartilhar(item)}
          style={styles.shareButton}
          accessibilityRole="button"
          accessibilityLabel={`Compartilhar relatório de ${item.nome}`}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>Compartilhar</Text>
        </TouchableOpacity>

        {item.id && (
          <TouchableOpacity
            onPress={() => handleExcluir(item.id!)}
            style={styles.deleteButton}
            accessibilityRole="button"
            accessibilityLabel={`Excluir ${item.nome}`}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={styles.actionTextDelete}>Excluir</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );

  // --- Render principal ---
  return (
    <ScreenContainer showGradient={true}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="white" />
          {/* ✅ 16 → 17px */}
          <Text style={styles.loadingText}>Carregando histórico...</Text>
        </View>

      ) : medicamentos.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📋</Text>
          {/* ✅ mantido 20px — já estava ok */}
          <Text style={styles.emptyText}>Nenhum tratamento nos últimos 30 dias</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CadastroMedicamento' as never)}
            accessibilityRole="button"
            accessibilityLabel="Adicionar medicamento"
          >
            {/* ✅ 16 → 17px */}
            <Text style={styles.addButtonText}>+ Adicionar Medicamento</Text>
          </TouchableOpacity>
        </View>

      ) : (
        <FlatList
          data={medicamentos}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              {/* ✅ mantido 18px — ok para subtítulo de tela */}
              <Text style={styles.screenSubtitle}>Acompanhe seus tratamentos</Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
};

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  // ✅ 16 → 17px
  loadingText: {
    marginTop: 15,
    fontSize: 17,
    color: 'white',
    fontWeight: '500',
  },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  // ✅ mantido 20px
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 30,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,      // ✅ era 15 — minHeight ~52px
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
  // ✅ 16 → 17px
  addButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },

  headerContainer: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  // ✅ mantido 18px
  screenSubtitle: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 26,
  },

  listContainer: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 50,
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'rgba(5, 79, 119, 0.05)',
  },
  headerContent: { flex: 1, marginRight: 8 },
  // ✅ 18 → 19px
  medName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#054F77',
    marginBottom: 4,
    lineHeight: 26,
  },
  // ✅ 14 → 16px
  patientName: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 22,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
  },
  statusActive:   { backgroundColor: '#1E7E34' },   // ✅ verde mais escuro — melhor contraste
  statusInactive: { backgroundColor: '#B45309' },   // ✅ âmbar escuro — melhor contraste
  // ✅ 12 → 14px
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  cardBody: { padding: 16 },

  fotoContainer: {
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E8E8E8',
  },
  fotoEmbalagem: {
    width: '100%',
    height: 220,
    backgroundColor: '#F0F0F0',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,       // ✅ era 2 — mais respiro entre linhas
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  // ✅ 14 → 16px
  detailLabel: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  // ✅ 14 → 16px
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
    lineHeight: 22,
  },

  notesContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  // ✅ 14 → 16px
  notesLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 6,
  },
  // ✅ 14px itálico → 15px sem itálico
  notesText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },

  // ✅ Botões de ação: ícone + texto, área de toque generosa
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,      // ✅ era 8 — minHeight ~44px
    paddingHorizontal: 14,
    backgroundColor: 'rgba(30, 126, 52, 0.1)',
    borderRadius: 20,
    minHeight: 44,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,      // ✅ era 8
    paddingHorizontal: 14,
    backgroundColor: 'rgba(192, 57, 43, 0.1)',
    borderRadius: 20,
    minHeight: 44,
  },
  // ✅ era 18px — agora 20px
  actionIcon: { fontSize: 20 },
  // ✅ NOVO: texto visível nos botões de ação
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E7E34',
  },
  actionTextDelete: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C0392B',
  },
});

export default HistoricoScreen;