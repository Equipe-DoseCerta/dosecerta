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
  Alert,
  ActivityIndicator,
  DeviceEventEmitter,
  StatusBar,
} from 'react-native';

// Dependências RN Puras (Certifique-se de que estão instaladas)
import LinearGradient from 'react-native-linear-gradient';
// ICONES REMOVIDOS: Ionicons e MaterialIcons
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

// Imports Específicos do Projeto
import {
  Medicamento,
  fetchMedicamentos,
  updateMedicamento,
} from '../database/database';

// CORREÇÃO: Importando as funções reais do EventService
import {
  listenMedicamentoExcluido,
  listenMedicamentoAdicionado,
} from '../services/eventService'; // <--- Agora usando seu arquivo

// --- FUNÇÕES DE LÓGICA E CÁLCULO (MANTIDAS) ---

const formatarUnidadeLiquido = (dosagem: string) => {
  const valorNumerico = parseFloat(dosagem.replace(',', '.'));
  if (isNaN(valorNumerico)) return 'gotas';
  // Lógica ajustada para ser mais robusta
  return valorNumerico <= 1 ? 'gota' : 'gotas';
};

type StatusEstoque = 'todos' | 'critico' | 'baixo' | 'normal' | 'concluido';

const ControleEstoqueScreen = () => {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMedicamento, setCurrentMedicamento] =
    useState<Medicamento | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusEstoque>('todos');
  const [dosagemEdit, setDosagemEdit] = useState('');
  const [intervaloEdit, setIntervaloEdit] = useState('');
  const [horarioEdit, setHorarioEdit] = useState('');
  const [duracaoEdit, setDuracaoEdit] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({
    dosagem: false,
    intervalo: false,
    horario: false,
    duracao: false,
  });

  // Cálculo: Doses Totais
  const calcularDosesTotais = useCallback((med: Medicamento) => {
    if (
      !med.intervalo_horas ||
      !med.duracaoTratamento ||
      med.intervalo_horas <= 0 ||
      med.duracaoTratamento <= 0
    ) {
      return 0;
    }
    return Math.ceil((med.duracaoTratamento * 24) / med.intervalo_horas);
  }, []);

  // Cálculo: Doses Consumidas
  const calcularDosesConsumidas = useCallback(
    (med: Medicamento) => {
      if (
        !med.horario_inicial ||
        !med.intervalo_horas ||
        !med.dataInicio ||
        !med.horario_inicial.match(/^\d{2}:\d{2}$/) ||
        !med.dataInicio.match(/^\d{2}\/\d{2}\/\d{4}$/) ||
        med.intervalo_horas <= 0
      ) {
        return 0;
      }

      try {
        const agora = new Date();
        const [dia, mes, ano] = med.dataInicio.split('/').map(Number);
        const [horaStr, minutoStr] = med.horario_inicial.split(':').map(Number);
        const horarioInicial = new Date(ano, mes - 1, dia, horaStr, minutoStr);

        if (isNaN(horarioInicial.getTime())) return 0;
        if (agora < horarioInicial) return 0;

        const diferencaHoras =
          (agora.getTime() - horarioInicial.getTime()) / (1000 * 60 * 60);
        return Math.floor(diferencaHoras / med.intervalo_horas) + 1;
      } catch {
        return 0;
      }
    },
    [],
  );

  // Cálculo: Próxima Dose
  const calcularProximaDose = useCallback(
    (med: Medicamento) => {
      if (
        !med.horario_inicial ||
        !med.intervalo_horas ||
        !med.dataInicio ||
        med.intervalo_horas <= 0
      ) {
        return 'Não disponível';
      }

      try {
        const agora = new Date();
        const [diaInicio, mes, ano] = med.dataInicio.split('/').map(Number);
        const [horaStr, minutoStr] = med.horario_inicial.split(':').map(Number);
        const horarioInicial = new Date(
          ano,
          mes - 1,
          diaInicio,
          horaStr,
          minutoStr,
        );

        if (isNaN(horarioInicial.getTime())) return 'Não disponível';

        const dosesTotais = calcularDosesTotais(med);
        const dosesConsumidas = calcularDosesConsumidas(med);

        if (dosesConsumidas >= dosesTotais) return 'Concluído';

        let ultimaDoseTime: Date;

        if (dosesConsumidas === 0) {
          ultimaDoseTime = new Date(
            horarioInicial.getTime() - med.intervalo_horas * 3600 * 1000,
          );
        } else {
          ultimaDoseTime = new Date(
            horarioInicial.getTime() +
              (dosesConsumidas - 1) * med.intervalo_horas * 3600 * 1000,
          );
        }

        const proximaDoseTime = new Date(
          ultimaDoseTime.getTime() + med.intervalo_horas * 3600 * 1000,
        );

        const diffMinutos =
          (proximaDoseTime.getTime() - agora.getTime()) / (1000 * 60);

        if (diffMinutos <= 5 && diffMinutos >= 0) return 'Agora';
        if (diffMinutos < 0) return 'Atrasada';

        const horas = proximaDoseTime.getHours().toString().padStart(2, '0');
        const minutos = proximaDoseTime.getMinutes().toString().padStart(2, '0');

        const proximoDia = proximaDoseTime.getDate();
        const diaAtual = agora.getDate();

        if (proximoDia !== diaAtual) {
          return `${horas}:${minutos} (Amanhã)`;
        }

        return `${horas}:${minutos}`;
      } catch {
        return 'Não disponível';
      }
    },
    [calcularDosesTotais, calcularDosesConsumidas],
  );

  // Cálculo: Estoque Atual
  const calcularEstoqueAtual = useCallback(
    (med: Medicamento) => {
      const dosesTotais = calcularDosesTotais(med);
      const dosesConsumidas = calcularDosesConsumidas(med);
      return Math.max(0, dosesTotais - dosesConsumidas);
    },
    [calcularDosesTotais, calcularDosesConsumidas],
  );

  // Cálculo: Dias Restantes
  const calcularDiasRestantes = useCallback(
    (med: Medicamento) => {
      const estoqueAtual = calcularEstoqueAtual(med);
      const intervalHoras = med.intervalo_horas || 24;
      return Math.ceil((estoqueAtual * intervalHoras) / 24);
    },
    [calcularEstoqueAtual],
  );

  // Status do Medicamento (Lógica central)
  const getStatusMedicamento = useCallback(
    (med: Medicamento): StatusEstoque => {
      const dosesTotais = calcularDosesTotais(med);
      const estoqueAtual = calcularEstoqueAtual(med);

      if (estoqueAtual === 0 && dosesTotais > 0) return 'concluido';
      if (dosesTotais === 0) return 'normal';

      const porcentagemRestante = (estoqueAtual / dosesTotais) * 100;

      if (porcentagemRestante <= 10) return 'critico';
      if (porcentagemRestante <= 30) return 'baixo';
      return 'normal';
    },
    [calcularDosesTotais, calcularEstoqueAtual],
  );

  // Cores baseadas no Status
  const getStatusColor = useCallback(
    (med: Medicamento) => {
      const status = getStatusMedicamento(med);
      switch (status) {
        case 'critico':
          return '#E53935';
        case 'baixo':
          return '#FFA000';
        case 'concluido':
          return '#757575';
        default:
          return '#4CAF50';
      }
    },
    [getStatusMedicamento],
  );

  const getStatusText = (status: StatusEstoque) => {
    switch (status) {
      case 'critico':
        return 'Crítico';
      case 'baixo':
        return 'Baixo';
      case 'concluido':
        return 'Concluído';
      default:
        return 'Normal';
    }
  };

  // --- FUNÇÕES DE INTERAÇÃO COM O BANCO DE DADOS ---

  const carregarMedicamentos = useCallback(async () => {
    try {
      setLoading(true);
      const medicamentosFromDB = await fetchMedicamentos();
      setMedicamentos(medicamentosFromDB);
    } catch (error) {
      console.error('Erro ao carregar medicamentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os medicamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarMedicamentos();

    // O EventService usa DeviceEventEmitter internamente para comunicar
    const adicionadoSubscription = listenMedicamentoAdicionado(
      carregarMedicamentos,
    );
    const excluidoSubscription = listenMedicamentoExcluido(
      carregarMedicamentos,
    );
    const atualizadoSubscription = DeviceEventEmitter.addListener(
      'medicamento-atualizado-local',
      carregarMedicamentos,
    );

    return () => {
      adicionadoSubscription.remove();
      excluidoSubscription.remove();
      atualizadoSubscription.remove();
    };
  }, [carregarMedicamentos]);

  // Abrir modal de edição (mantida)
  const openEditModal = (medicamento: Medicamento) => {
    setCurrentMedicamento(medicamento);
    setDosagemEdit(medicamento.dosagem || '');
    setIntervaloEdit(medicamento.intervalo_horas?.toString() || '');
    setHorarioEdit(medicamento.horario_inicial || '');
    setDuracaoEdit(medicamento.duracaoTratamento?.toString() || '');
    setErrors({
      dosagem: false,
      intervalo: false,
      horario: false,
      duracao: false,
    });
    setModalVisible(true);
  };

  // Validar campos do modal (mantida)
  const validarCampos = () => {
    const newErrors = {
      dosagem: !dosagemEdit.trim(),
      intervalo:
        !intervaloEdit.trim() ||
        isNaN(parseInt(intervaloEdit, 10)) ||
        parseInt(intervaloEdit, 10) <= 0,
      horario: !horarioEdit.match(/^\d{2}:\d{2}$/),
      duracao:
        !duracaoEdit.trim() ||
        isNaN(parseInt(duracaoEdit, 10)) ||
        parseInt(duracaoEdit, 10) <= 0,
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error);
  };

  // Salvar alterações (mantida)
  const handleSave = async () => {
    if (!currentMedicamento || !currentMedicamento.id) {
      Alert.alert('Erro', 'Medicamento inválido ou sem ID');
      return;
    }

    if (!validarCampos()) {
      Alert.alert('Erro', 'Verifique os campos destacados');
      return;
    }

    try {
      setProcessing(true);

      const updatedMedicamento: Medicamento & { id: number } = {
        ...currentMedicamento,
        id: currentMedicamento.id,
        dosagem: dosagemEdit,
        intervalo_horas: parseInt(intervaloEdit, 10),
        horario_inicial: horarioEdit,
        duracaoTratamento: parseInt(duracaoEdit, 10),
      };

      await updateMedicamento(updatedMedicamento);

      setMedicamentos((prevMedicamentos) =>
        prevMedicamentos.map((med) =>
          med.id === currentMedicamento.id ? updatedMedicamento : med,
        ),
      );

      DeviceEventEmitter.emit('medicamento-atualizado-local');
      setModalVisible(false);
    } catch (error) {
      console.error('Erro ao atualizar medicamento:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o medicamento');
    } finally {
      setProcessing(false);
    }
  };

  // Confirmação de exclusão (mantida)
  const confirmarExclusao = (medicamento: Medicamento) => {
    if (typeof medicamento.id !== 'number') {
      Alert.alert('Erro', 'Medicamento sem ID válido');
      return;
    }

    Alert.alert(
      'Confirmar Arquivamento',
      `Deseja realmente arquivar/excluir o plano de "${medicamento.nome}"? Ele será removido do controle de estoque e considerado 'inativo'.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Arquivar',
          style: 'destructive',
          onPress: () => handleDelete(medicamento.id as number, medicamento),
        },
      ],
    );
  };

  // Deletar / Arquivar medicamento (mantida)
  const handleDelete = async (
    medicamentoId: number,
    medicamento: Medicamento,
  ) => {
    try {
      setProcessing(true);

      await updateMedicamento({
        ...medicamento,
        id: medicamentoId,
        ativo: false, // Marca como inativo ao invés de deletar, ideal para histórico
      });

      setMedicamentos((prev) => prev.filter((med) => med.id !== medicamentoId));

      DeviceEventEmitter.emit('medicamento-excluido');
    } catch (error) {
      console.error('Erro ao arquivar medicamento:', error);
      Alert.alert('Erro', 'Não foi possível arquivar o medicamento');
    } finally {
      setProcessing(false);
    }
  };

  // --- FILTROS E ESTATÍSTICAS ---

  // Filtra medicamentos ativos
  const medicamentosAtivos = medicamentos.filter((med) => med.ativo !== false);

  // Calcula estatísticas
  const calcularEstatisticas = useCallback(() => {
    const comEstoque = medicamentosAtivos.filter(
      (med) => calcularEstoqueAtual(med) > 0,
    );
    const total = comEstoque.length;

    const criticos = comEstoque.filter(
      (med) => getStatusMedicamento(med) === 'critico',
    ).length;
    const baixos = comEstoque.filter(
      (med) => getStatusMedicamento(med) === 'baixo',
    ).length;
    const normais = comEstoque.filter(
      (med) => getStatusMedicamento(med) === 'normal',
    ).length;

    const concluidos = medicamentosAtivos.filter(
      (med) => getStatusMedicamento(med) === 'concluido',
    ).length;

    return { total, criticos, baixos, normais, concluidos };
  }, [medicamentosAtivos, getStatusMedicamento, calcularEstoqueAtual]);

  const stats = calcularEstatisticas();

  // Filtra medicamentos por status
  const medicamentosFiltrados = medicamentosAtivos.filter((med) => {
    const status = getStatusMedicamento(med);

    // NOVA REGRA: Se o filtro for 'todos', exclui os 'concluido'
    if (filtroStatus === 'todos') {
      return status !== 'concluido';
    }

    // Para todos os outros filtros, usa a regra normal
    return status === filtroStatus;
  });

  // --- FUNÇÕES DE HORÁRIO ---

  const onChangeTime = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const horas = selectedDate.getHours().toString().padStart(2, '0');
      const minutos = selectedDate.getMinutes().toString().padStart(2, '0');
      setHorarioEdit(`${horas}:${minutos}`);
      setErrors((prev) => ({ ...prev, horario: false }));
    }
  };

  const getDateFromTimeString = (): Date => {
    if (horarioEdit) {
      const [hours, minutes] = horarioEdit.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
    const now = new Date();
    now.setHours(8, 0, 0, 0);
    return now;
  };

  // --- RENDERIZAÇÃO ---

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#054F77" barStyle="light-content" />
        <LinearGradient colors={['#054F77', '#0A7AB8']} style={styles.gradientContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>
              Carregando planos de medicação...
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Bar com cor do gradiente para uma transição suave */}
      <StatusBar backgroundColor="#054F77" barStyle="light-content" />
      
      {/* LinearGradient preenche todo o espaço (background) */}
      <LinearGradient colors={['#054F77', '#0A7AB8']} style={styles.gradientContainer}>
        
        {/* SafeAreaView: Envolve o conteúdo rolável, permitindo que o gradiente 
          suba até o topo. Usamos 'bottom', 'left', 'right' para proteger 
          apenas as outras bordas.
        */}
        <SafeAreaView style={styles.safeAreaContent} edges={['left', 'right', 'bottom']}>
          
          {/* ScrollView contém o conteúdo e usa padding para dar espaço no topo */}
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>
              Acompanhe seus planos de medicação para evitar a falta de doses.
            </Text>

            {/* Card de estatísticas */}
            <View style={styles.statsContainer}>
              <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>Resumo do Controle</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {stats.total + stats.concluidos}
                    </Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#FFA000' }]}>
                      {stats.baixos}
                    </Text>
                    <Text style={styles.statLabel}>Baixo</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#E53935' }]}>
                      {stats.criticos}
                    </Text>
                    <Text style={styles.statLabel}>Crítico</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                      {stats.normais}
                    </Text>
                    <Text style={styles.statLabel}>Normal</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Filtros */}
            <View style={styles.filterContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
              >
                {[
                  { key: 'todos', label: 'Todos em Uso', count: stats.normais + stats.baixos + stats.criticos },
                  { key: 'critico', label: 'Críticos', count: stats.criticos },
                  { key: 'baixo', label: 'Baixo', count: stats.baixos },
                  { key: 'normal', label: 'Normal', count: stats.normais },
                  { key: 'concluido', label: 'Concluídos', count: stats.concluidos },
                ].map((filter) => (
                    <TouchableOpacity
                      key={filter.key}
                      style={[
                        styles.filterButton,
                        filtroStatus === filter.key && styles.filterButtonActive,
                      ]}
                      onPress={() => setFiltroStatus(filter.key as StatusEstoque)}
                      accessibilityLabel={`Filtrar por ${filter.label}`}
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          filtroStatus === filter.key &&
                            styles.filterButtonTextActive,
                          filter.key === 'concluido' &&
                            filtroStatus !== filter.key && {
                              color: 'rgba(255,255,255, 0.7)',
                            },
                        ]}
                      >
                        {filter.label} ({filter.count})
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>

            {/* Lista de medicamentos */}
            {medicamentosFiltrados.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyMessage}>
                  {filtroStatus === 'todos'
                    ? 'Nenhum medicamento ativo encontrado. Cadastre um novo.'
                    : `Nenhum medicamento com status "${getStatusText(
                        filtroStatus,
                      )}" no momento.`}
                </Text>
              </View>
            ) : (
              medicamentosFiltrados.map((med) => {
                const dosesTotais = calcularDosesTotais(med);
                const estoqueAtual = calcularEstoqueAtual(med);
                const status = getStatusMedicamento(med);
                const porcentagemRestante =
                  dosesTotais > 0 ? (estoqueAtual / dosesTotais) * 100 : 0;

                let textoUnidade = med.tipo;
                if (
                  med.tipo.toLowerCase() === 'líquido' ||
                  med.tipo.toLowerCase() === 'liquido'
                ) {
                  textoUnidade = formatarUnidadeLiquido(med.dosagem);
                }
                const textoDosagem = `${med.dosagem} ${textoUnidade}`;
                const diasRestantes = calcularDiasRestantes(med);

                const isConcluido = status === 'concluido';
                const cardColor = isConcluido ? '#F5F5F5' : 'white';
                const textColor = isConcluido ? '#757575' : '#333';
                const cardBorderColor = isConcluido ? '#CCC' : '#E0E0E0';

                return (
                  <View
                    key={med.id?.toString()}
                    style={[
                      styles.medicamentoCard,
                      { 
                        backgroundColor: cardColor, 
                        borderColor: cardBorderColor,
                        borderLeftColor: getStatusColor(med),
                      },
                    ]}
                    accessibilityLabel={`Medicamento ${med.nome} para ${med.nomePaciente}`}
                  >
                    {/* HEADER */}
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <Text style={[styles.pillIcon, { color: getStatusColor(med) }]}>
                          💊
                        </Text>
                        <View style={styles.headerInfo}>
                          <Text
                            style={[
                              styles.medicamentoNome,
                              { color: isConcluido ? '#757575' : '#054F77' },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {med.nome}
                          </Text>
                          <View style={styles.pacienteContainer}>
                            <Text
                              style={[styles.pacienteNome, { color: textColor }]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              Paciente: {med.nomePaciente}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(med) },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {getStatusText(status)}
                        </Text>
                      </View>
                    </View>

                    {/* BODY - DETALHES E ESTOQUE */}
                    <View style={styles.cardBody}>
                      <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                          <Text style={[styles.dosagemIcon, { color: textColor }]}>
                            🧪
                          </Text>
                          <Text style={[styles.infoText, { color: textColor }]} numberOfLines={1}>
                            Dosagem:{' '}
                            <Text style={styles.infoTextBold}>
                              {textoDosagem}
                            </Text>
                          </Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={[styles.timeIcon, { color: textColor }]}>
                            ⏰
                          </Text>
                          <Text style={[styles.infoText, { color: textColor }]} numberOfLines={1}>
                            Frequência:{' '}
                            <Text style={styles.infoTextBold}>
                              {med.intervalo_horas}h
                            </Text>
                          </Text>
                        </View>
                      </View>

                      {/* SEÇÃO DE ESTOQUE */}
                      <View style={styles.estoqueSection}>
                        <View style={styles.estoqueHeader}>
                          <Text style={[styles.estoqueTitle, { color: textColor }]}>
                            Estoque (doses)
                          </Text>
                          <Text style={[styles.estoqueQuantidade, { color: textColor }]}>
                            {estoqueAtual} restantes
                          </Text>
                        </View>

                        <View style={styles.progressContainer}>
                          <View style={styles.progressBackground}>
                            <View
                              style={[
                                styles.progressBar,
                                {
                                  width: `${Math.max(
                                    porcentagemRestante,
                                    isConcluido ? 0 : 5,
                                  )}%`,
                                  backgroundColor: getStatusColor(med),
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.progressText, { color: textColor }]}>
                            {Math.round(porcentagemRestante)}%
                          </Text>
                        </View>

                        <Text style={[styles.dosesTotaisText, { color: textColor }]}>
                          de {dosesTotais} doses totais
                        </Text>
                      </View>

                      {/* PRÓXIMA DOSE E DIAS RESTANTES */}
                      <View style={styles.timeSection}>
                        <View style={styles.timeItem}>
                          <Text style={[styles.timeIcon, { color: textColor }]}>
                            ⏰
                          </Text>
                          <Text style={[styles.timeText, { color: textColor }]} numberOfLines={1}>
                            Próxima:{' '}
                            <Text style={styles.proximaDoseHighlighted}>
                              {calcularProximaDose(med)}
                            </Text>
                          </Text>
                        </View>
                        <View style={styles.timeItem}>
                          <Text style={[styles.calendarIcon, { color: textColor }]}>
                            🗓️
                          </Text>
                          <Text style={[styles.timeText, { color: textColor }]} numberOfLines={1}>
                            Restam:{' '}
                            <Text style={styles.timeTextBold}>
                              {diasRestantes} dias
                            </Text>
                          </Text>
                        </View>
                      </View>

                      {/* ALERTAS */}
                      {status === 'critico' && (
                        <View style={styles.alertaCritico}>
                          <Text style={styles.alertCriticoIcon}>🚨</Text>
                          <Text style={styles.alertaTexto} numberOfLines={2}>
                            Alerta: Apenas {estoqueAtual} doses restantes. Reponha urgente!
                          </Text>
                        </View>
                      )}
                      {status === 'baixo' && (
                        <View style={styles.alertaBaixo}>
                          <Text style={styles.alertBaixoIcon}>⚠️</Text>
                          <Text style={styles.alertaTexto} numberOfLines={2}>
                            Estoque baixo. Considere repor em breve.
                          </Text>
                        </View>
                      )}
                      {isConcluido && (
                        <View style={styles.alertaConcluido}>
                          <Text style={styles.alertConcluidoIcon}>✅</Text>
                          <Text style={styles.alertaTexto} numberOfLines={2}>
                            Plano concluído: 0 doses restantes.
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* FOOTER - BOTÕES */}
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.deleteButton,
                          (processing || isConcluido) && styles.actionButtonDisabled,
                        ]}
                        onPress={() => confirmarExclusao(med)}
                        disabled={processing || isConcluido}
                        accessibilityLabel={`Arquivar medicamento ${med.nome}`}
                      >
                        <Text style={[styles.archiveIcon, isConcluido && styles.actionButtonTextDisabled]}>
                          🗑️
                        </Text>
                        <Text
                          style={[
                            styles.actionButtonText,
                            isConcluido && styles.actionButtonTextDisabled,
                          ]}
                        >
                          Arquivar
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.editButton,
                          (processing || isConcluido) && styles.actionButtonDisabled,
                        ]}
                        onPress={() => openEditModal(med)}
                        disabled={processing || isConcluido}
                        accessibilityLabel={`Editar medicamento ${med.nome}`}
                      >
                        <Text style={styles.editIcon}>✏️</Text>
                        <Text style={styles.actionButtonText}>
                          Atualizar
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {med.notas && (
                      <View style={styles.notasSection}>
                        <Text style={styles.notesIcon}>📝</Text>
                        <Text style={styles.notasText} numberOfLines={3}>
                          {med.notas}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>

        {/* Modal de edição (Mantido com melhorias) */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => !processing && setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={['#054F77', '#0A7AB8']}
                style={styles.modalHeader}
              >
                <Text style={styles.modalTitle}>Atualizar Plano de Medicação</Text>
              </LinearGradient>

              <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                {currentMedicamento && (
                  <View style={styles.modalContent}>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Medicamento</Text>
                      <Text style={styles.modalValue}>
                        {currentMedicamento.nome}
                      </Text>
                    </View>

                    <Text style={styles.modalSectionTitle}>Ajuste do Plano</Text>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Dosagem *</Text>
                      <View
                        style={[
                          styles.inputContainerModal,
                          errors.dosagem && styles.errorField,
                        ]}
                      >
                        <Text style={styles.inputIconModal}>🧪</Text>
                        <TextInput
                          style={styles.inputModal}
                          value={dosagemEdit}
                          onChangeText={(text) => {
                            setDosagemEdit(text);
                            setErrors((prev) => ({ ...prev, dosagem: false }));
                          }}
                          placeholder="Ex: 500mg, 10ml"
                          placeholderTextColor="#aaa"
                        />
                      </View>
                      {errors.dosagem && (
                        <Text style={styles.errorText}>Campo obrigatório</Text>
                      )}
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Intervalo (horas) *</Text>
                      <View
                        style={[
                          styles.inputContainerModal,
                          errors.intervalo && styles.errorField,
                        ]}
                      >
                        <Text style={styles.inputIconModal}>⏰</Text>
                        <TextInput
                          style={styles.inputModal}
                          value={intervaloEdit}
                          onChangeText={(text) => {
                            setIntervaloEdit(text);
                            setErrors((prev) => ({ ...prev, intervalo: false }));
                          }}
                          placeholder="Ex: 8, 12, 24"
                          keyboardType="numeric"
                          placeholderTextColor="#aaa"
                        />
                      </View>
                      {errors.intervalo && (
                        <Text style={styles.errorText}>
                          Informe um número válido maior que 0
                        </Text>
                      )}
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Horário Inicial *</Text>
                      <TouchableOpacity
                        style={[
                          styles.timePickerButtonModal,
                          errors.horario && styles.errorField,
                        ]}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={styles.timeIconModal}>🕐</Text>
                        <Text
                          style={[
                            styles.timePickerText,
                            !horarioEdit && styles.placeholderTextModal,
                          ]}
                        >
                          {horarioEdit || 'Selecionar horário'}
                        </Text>
                      </TouchableOpacity>
                      {errors.horario && (
                        <Text style={styles.errorText}>
                          Selecione um horário válido
                        </Text>
                      )}
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Duração (dias) *</Text>
                      <View
                        style={[
                          styles.inputContainerModal,
                          errors.duracao && styles.errorField,
                        ]}
                      >
                        <Text style={styles.inputIconModal}>📅</Text>
                        <TextInput
                          style={styles.inputModal}
                          value={duracaoEdit}
                          onChangeText={(text) => {
                            setDuracaoEdit(text);
                            setErrors((prev) => ({ ...prev, duracao: false }));
                          }}
                          placeholder="Ex: 7, 14, 30"
                          keyboardType="numeric"
                          placeholderTextColor="#aaa"
                        />
                      </View>
                      {errors.duracao && (
                        <Text style={styles.errorText}>
                          Informe um número válido maior que 0
                        </Text>
                      )}
                    </View>

                    {showTimePicker && (
                      <DateTimePicker
                        value={getDateFromTimeString()}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={onChangeTime}
                      />
                    )}
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => !processing && setModalVisible(false)}
                  disabled={processing}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSave}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonTextSave}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  // --- CONTAINER PRINCIPAL ---
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  safeAreaContent: {
    flex: 1,
    // Removido paddingHorizontal: 16 para aplicar apenas no ScrollView.
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContainer: {
    // AJUSTE CRUCIAL: Adiciona padding superior para o conteúdo
    // começar abaixo da Status Bar (que agora tem o gradiente no fundo).
    paddingTop: 30, 
    paddingBottom: 40,
    paddingHorizontal: 16, // Adicionado padding horizontal aqui para o conteúdo.
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  
  // --- ESTATÍSTICAS ---
  statsContainer: {
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#054F77',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A7AB8',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // --- FILTROS ---
  filterContainer: {
    marginBottom: 24,
  },
  filterScrollContent: {
    paddingHorizontal: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: 'white',
    borderColor: '#054F77',
  },
  filterButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: '#054F77',
  },
  
  // --- CARD MEDICAMENTO ---
  medicamentoCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  pillIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  headerInfo: {
    flex: 1,
  },
  medicamentoNome: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pacienteContainer: {
    marginTop: 2,
  },
  pacienteNome: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // --- CORPO DO CARD ---
  cardBody: {
    paddingVertical: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dosagemIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  timeIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  infoTextBold: {
    fontWeight: '600',
  },
  
  // --- SEÇÃO DE ESTOQUE ---
  estoqueSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  estoqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  estoqueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  estoqueQuantidade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 35,
    textAlign: 'right',
  },
  dosesTotaisText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
  },
  
  // --- SEÇÃO DE TEMPO ---
  timeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  calendarIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  timeTextBold: {
    fontWeight: 'bold',
  },
  proximaDoseHighlighted: {
    fontWeight: 'bold',
    color: '#0A7AB8',
  },
  
  // --- ALERTAS ---
  alertaCritico: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    marginTop: 12,
  },
  alertaBaixo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 160, 0, 0.1)',
    marginTop: 12,
  },
  alertaConcluido: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(117, 117, 117, 0.1)',
    marginTop: 12,
  },
  alertCriticoIcon: {
    fontSize: 18,
    color: '#E53935',
    marginRight: 8,
    marginTop: 1,
  },
  alertBaixoIcon: {
    fontSize: 18,
    color: '#FFA000',
    marginRight: 8,
    marginTop: 1,
  },
  alertConcluidoIcon: {
    fontSize: 18,
    color: '#757575',
    marginRight: 8,
    marginTop: 1,
  },
  alertaTexto: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  
  // --- FOOTER E BOTÕES ---
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 12,
    borderWidth: 1,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    borderColor: '#757575',
    backgroundColor: 'rgba(117, 117, 117, 0.1)',
  },
  editButton: {
    borderColor: '#054F77',
    backgroundColor: '#E6F0F7',
  },
  archiveIcon: {
    fontSize: 16,
    color: '#757575',
    marginRight: 6,
  },
  editIcon: {
    fontSize: 16,
    color: '#054F77',
    marginRight: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#054F77',
  },
  actionButtonTextDisabled: {
    color: '#AAA',
  },
  
  // --- NOTAS ---
  notasSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0A7AB8',
  },
  notesIcon: {
    fontSize: 16,
    color: '#0A7AB8',
    marginRight: 8,
    marginTop: 2,
  },
  notasText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  
  // --- ESTADO VAZIO ---
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 64,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  emptyMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // --- MODAL ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  modalScrollContent: {
    maxHeight: 400,
  },
  modalContent: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#054F77',
    marginTop: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 8,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 16,
    color: '#0A7AB8',
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#F5F9FC',
    borderRadius: 12,
  },
  inputContainerModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FC',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E6ED',
    minHeight: 50,
  },
  inputIconModal: {
    fontSize: 20,
    color: '#054F77',
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  inputModal: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  timePickerButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  timeIconModal: {
    fontSize: 20,
    color: '#054F77',
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  timePickerText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderTextModal: {
    color: '#aaa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 12,
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#757575',
  },
  modalButtonSave: {
    backgroundColor: '#054F77',
  },
  modalButtonTextCancel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonTextSave: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // --- ERROS ---
  errorField: {
    borderColor: '#E53935',
    borderWidth: 2,
  },
  errorText: {
    color: '#E53935',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default ControleEstoqueScreen;