// 🔧 CORREÇÃO FINAL: 
// - Medicamento desativado no ControleEstoqueScreen some do MedicamentosAtivosScreen
// - Mantido no HistoricoScreen (ativo=false)
// - ✅ CORREÇÃO CRÍTICA: Filter usa !med.ativo (funciona com 0 ou false do SQLite)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useIsFocused } from '@react-navigation/native';
import {
  fetchMedicamentos,
  Medicamento,
  insertDoseTomada,
  deleteDoseTomada,
  fetchDosesTomadas,
  DoseTomada,
} from '../database/database';

import {
  listenMedicamentoExcluido,
  listenMedicamentoAdicionado,
  listenMedicamentoDesativado,
} from '../services/eventService';

import { getUnidadePorTipo } from '../services/notificationUtils';

import {
  desativarSomMedicamento,
  ativarSomMedicamento,
} from '../services/alarmeService';

import { useModal } from '../components/ModalContext';
import ScreenContainer from '../components/ScreenContainer';

const DOSES_SILENCIADAS_KEY = 'doses_silenciadas';
const MEDICAMENTOS_SOM_DESATIVADO_KEY = 'medicamentos_som_desativado';

interface DoseAtiva {
  id: string;
  medicamentoId: number;
  medicamento: string;
  paciente: string;
  horario: string;
  data: Date;
  dosagem: string;
  tipo: string;
  ativo: boolean;
  tomada: boolean;
  foto_path?: string | null;
}

// ============================================================================
// FUNÇÕES AUXILIARES PARA SILENCIAMENTO DE DOSES INDIVIDUAIS
// ============================================================================

const silenciarDose = async (doseId: string): Promise<void> => {
  try {
    const data = await AsyncStorage.getItem(DOSES_SILENCIADAS_KEY);
    let dosesSilenciadas: string[] = data ? JSON.parse(data) : [];
    if (!dosesSilenciadas.includes(doseId)) {
      dosesSilenciadas.push(doseId);
      await AsyncStorage.setItem(DOSES_SILENCIADAS_KEY, JSON.stringify(dosesSilenciadas));
    }
  } catch (error) {
    console.error('[DOSE_SILENCE] ❌ Erro ao silenciar dose:', error);
    throw error;
  }
};

const reativarDose = async (doseId: string): Promise<void> => {
  try {
    const data = await AsyncStorage.getItem(DOSES_SILENCIADAS_KEY);
    let dosesSilenciadas: string[] = data ? JSON.parse(data) : [];
    dosesSilenciadas = dosesSilenciadas.filter(id => id !== doseId);
    await AsyncStorage.setItem(DOSES_SILENCIADAS_KEY, JSON.stringify(dosesSilenciadas));
  } catch (error) {
    console.error('[DOSE_SILENCE] ❌ Erro ao reativar dose:', error);
    throw error;
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const MedicamentosAtivosScreen = () => {
  const [doses, setDoses] = useState<DoseAtiva[]>([]);
  const [pacienteModalVisible, setPacienteModalVisible] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<string | null>(null);
  const [silenciadosIds, setSilenciadosIds] = useState<number[]>([]);
  const [dosesSilenciadasIds, setDosesSilenciadasIds] = useState<string[]>([]);
  const [somDesativadoIds, setSomDesativadoIds] = useState<number[]>([]);

  const { showModal } = useModal();
  const isFocused = useIsFocused();

  const desativadosRef = useRef<Set<number>>(new Set());
  const dosesSilenciadasRef = useRef<string[]>([]);

  const loadSilencedDoses = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(DOSES_SILENCIADAS_KEY);
      const ids: string[] = data ? JSON.parse(data) : [];
      dosesSilenciadasRef.current = ids;
      setDosesSilenciadasIds(ids);
    } catch (error) {
      console.error('[DOSE_SILENCE] ❌ Erro ao carregar doses silenciadas:', error);
    }
  }, []);

  const loadSomDesativadoState = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(MEDICAMENTOS_SOM_DESATIVADO_KEY);
      const ids: number[] = data ? JSON.parse(data) : [];
      setSomDesativadoIds(ids);
    } catch (error) {
      console.error('[SOM] ❌ Erro ao carregar medicamentos com som desativado:', error);
    }
  }, []);

  useEffect(() => {
    loadSilencedDoses();
    loadSomDesativadoState();
  }, [loadSilencedDoses, loadSomDesativadoState]);

  const carregarDoses = useCallback(async () => {
    try {
      const medicamentos = await fetchMedicamentos();
      const agora = new Date();

      const silencedData = await AsyncStorage.getItem('medicamentos_silenciados');
      const silencedIds: number[] = silencedData ? JSON.parse(silencedData) : [];
      setSilenciadosIds(silencedIds);

      const novasDoses = medicamentos.flatMap((med: Medicamento) => {
        if (!med.id || !med.horario_inicial || !med.intervalo_horas || !med.dataInicio || !med.ativo) {
          return [];
        }

        const [dia, mes, ano] = med.dataInicio.split('/').map(Number);
        const [hora, minuto] = med.horario_inicial.split(':').map(Number);

        if (isNaN(dia) || isNaN(mes) || isNaN(ano) || isNaN(hora) || isNaN(minuto)) return [];

        const inicioTratamento = new Date(ano, mes - 1, dia, hora, minuto);
        const totalHorasTratamento = med.duracaoTratamento * 24;
        const fimTratamento = new Date(inicioTratamento.getTime() + totalHorasTratamento * 60 * 60 * 1000);

        if (fimTratamento < agora) return [];
        if (med.intervalo_horas <= 0) return [];

        const totalDoses = Math.ceil(totalHorasTratamento / med.intervalo_horas);
        const todasDoses: DoseAtiva[] = [];
        const isSilenced = silencedIds.includes(med.id);

        for (let i = 0; i < totalDoses; i++) {
          const doseTime = new Date(inicioTratamento.getTime() + i * med.intervalo_horas * 60 * 60 * 1000);
          const horario = `${doseTime.getHours().toString().padStart(2, '0')}:${doseTime.getMinutes().toString().padStart(2, '0')}`;
          const doseId = `${med.id}-${doseTime.getTime()}`;

          todasDoses.push({
            id: doseId,
            medicamentoId: med.id!,
            medicamento: med.nome,
            paciente: med.nomePaciente,
            horario,
            data: doseTime,
            dosagem: med.dosagem,
            tipo: med.tipo,
            ativo: !isSilenced,
            tomada: false,
            foto_path: med.foto_path || null,
          });
        }

        return todasDoses;
      });

      const medicamentoIds = [...new Set(novasDoses.map(d => d.medicamentoId))];
      const todasDosesTomadas = await Promise.all(
        medicamentoIds.map(id => fetchDosesTomadas(id))
      );

      const dosesTomadasMap = new Map<string, boolean>();
      todasDosesTomadas.flat().forEach((dt: DoseTomada) => {
        dosesTomadasMap.set(dt.dose_id, true);
      });

      const dosesComStatus = novasDoses.map(dose => ({
        ...dose,
        tomada: dosesTomadasMap.has(dose.id)
      }));

      const dosesComSilenciamento = dosesComStatus.map(dose => {
        const medicamentoSilenciado = silencedIds.includes(dose.medicamentoId);
        return {
          ...dose,
          ativo: !medicamentoSilenciado && !dosesSilenciadasRef.current.includes(dose.id)
        };
      });

      const dosesRelevantes = dosesComSilenciamento.filter(d =>
        d.data.getTime() >= agora.getTime()
      );

      const dosesFinais = dosesRelevantes.filter(
        d => !desativadosRef.current.has(d.medicamentoId)
      );

      setDoses(dosesFinais.sort((a, b) => a.data.getTime() - b.data.getTime()));
    } catch (error) {
      console.error('[DOSES] ❌ Erro ao carregar doses:', error);
      showModal({ type: 'error', title: 'Erro', message: 'Não foi possível carregar as doses' });
    }
  }, [showModal]);

  useEffect(() => {
    if (isFocused) {
      desativadosRef.current.clear();
      carregarDoses();
    }
  }, [isFocused, carregarDoses]);

  useEffect(() => {
    const excluidoSubscription = listenMedicamentoExcluido((idExcluido: number) => {
      setDoses(prev => prev.filter(d => {
        const medId = parseInt(d.id.split('-')[0], 10);
        return medId !== idExcluido;
      }));
    });
    return () => {
      if (typeof excluidoSubscription.remove === 'function') excluidoSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const desativadoSubscription = listenMedicamentoDesativado((idDesativado: number) => {
      desativadosRef.current.add(idDesativado);
      setDoses(prev => prev.filter(d => d.medicamentoId !== idDesativado));
      carregarDoses();
    });
    return () => {
      if (typeof desativadoSubscription.remove === 'function') desativadoSubscription.remove();
    };
  }, [carregarDoses]);

  useEffect(() => {
    const adicionadoSubscription = listenMedicamentoAdicionado(() => {
      carregarDoses();
    });
    return () => {
      if (typeof adicionadoSubscription.remove === 'function') adicionadoSubscription.remove();
    };
  }, [carregarDoses]);

  const toggleDoseTomada = useCallback(async (doseId: string, isCurrentlyTaken: boolean) => {
    let dose: DoseAtiva | undefined;
    setDoses(prevDoses => {
      dose = prevDoses.find(d => d.id === doseId);
      return prevDoses;
    });

    if (!dose) {
      showModal({ type: 'error', title: 'Erro', message: 'Dose não encontrada' });
      return;
    }

    const horario = dose.horario;
    const dataStr = dose.data.toISOString().split('T')[0];

    try {
      if (isCurrentlyTaken) {
        await deleteDoseTomada(dose.medicamentoId, doseId);
        showModal({ type: 'info', message: 'Dose desmarcada com sucesso' });
      } else {
        await insertDoseTomada({
          medicamento_id: dose.medicamentoId,
          dose_id: doseId,
          horario,
          data: dataStr,
          timestamp: new Date().toISOString(),
        });
        showModal({ type: 'success', message: 'Dose marcada como tomada!' });
      }

      setDoses(prevDoses =>
        prevDoses.map(d => d.id === doseId ? { ...d, tomada: !isCurrentlyTaken } : d)
      );
    } catch (error) {
      console.error('[DOSE_TOGGLE] ❌ Erro ao alternar dose:', error);
      showModal({ type: 'error', title: 'Erro', message: 'Não foi possível alterar o status da dose' });
    }
  }, [showModal]);

  const toggleDoseSilence = useCallback(async (doseId: string, isCurrentlySilenced: boolean) => {
    try {
      if (isCurrentlySilenced) {
        await reativarDose(doseId);
        showModal({ type: 'success', message: 'Dose reativada com sucesso' });
      } else {
        await silenciarDose(doseId);
        showModal({ type: 'info', message: 'Dose silenciada com sucesso' });
      }
      await loadSilencedDoses();
      await carregarDoses();
    } catch (error) {
      console.error('[DOSE_SILENCE] ❌ Erro ao alternar silenciamento:', error);
      showModal({ type: 'error', title: 'Erro', message: 'Não foi possível alterar o silenciamento' });
    }
  }, [showModal, loadSilencedDoses, carregarDoses]);

  const toggleMedicamento = useCallback(async (medicamentoId: number) => {
    try {
      // ✅ CORREÇÃO: lê AsyncStorage diretamente em vez de usar closure
      // somDesativadoIds capturado no closure pode estar stale entre renders
      const data = await AsyncStorage.getItem(MEDICAMENTOS_SOM_DESATIVADO_KEY);
      const listaAtual: number[] = data ? JSON.parse(data) : [];
      const somAtualmenteDesativado = listaAtual.includes(medicamentoId);

      // ✅ Atualização otimista: feedback visual instantâneo sem esperar async
      if (somAtualmenteDesativado) {
        // estava desativado → vai ativar → remove da lista local
        setSomDesativadoIds(prev => prev.filter(id => id !== medicamentoId));
        await ativarSomMedicamento(medicamentoId);
        showModal({ type: 'success', message: 'Som ativado para este medicamento' });
      } else {
        // estava ativo → vai desativar → adiciona na lista local
        setSomDesativadoIds(prev => [...prev, medicamentoId]);
        await desativarSomMedicamento(medicamentoId);
        showModal({ type: 'info', message: 'Som desativado para este medicamento' });
      }

      // ✅ Recarrega do AsyncStorage para confirmar consistência com o nativo
      await loadSomDesativadoState();
    } catch (error) {
      console.error('[SOM] ❌ Erro ao alternar som:', error);
      // ✅ Em caso de erro, desfaz o estado otimista recarregando o valor real
      await loadSomDesativadoState();
      showModal({ type: 'error', title: 'Erro', message: 'Não foi possível alterar o som do medicamento' });
    }
  }, [showModal, loadSomDesativadoState]);

  const dosesPorPaciente = doses.reduce((acc, dose) => {
    const pacienteNome = dose.paciente || 'Sem Paciente';
    if (!acc[pacienteNome]) acc[pacienteNome] = [];
    acc[pacienteNome].push(dose);
    return acc;
  }, {} as Record<string, DoseAtiva[]>);

  const encontrarProximaDose = (dosesMed: DoseAtiva[]): DoseAtiva | undefined => {
    const agora = new Date();
    return dosesMed
      .filter(d => d.data.getTime() >= agora.getTime())
      .sort((a, b) => a.data.getTime() - b.data.getTime())[0];
  };

  const formatarDataRelativa = (data: Date): string => {
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    hoje.setHours(0, 0, 0, 0);
    amanha.setHours(0, 0, 0, 0);
    const dataComparacao = new Date(data);
    dataComparacao.setHours(0, 0, 0, 0);
    if (dataComparacao.getTime() === hoje.getTime()) return 'Hoje';
    if (dataComparacao.getTime() === amanha.getTime()) return 'Amanhã';
    return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const abrirModalPaciente = (paciente: string) => {
    setSelectedPaciente(paciente);
    setPacienteModalVisible(true);
  };

  const getDosesParaModal = (): DoseAtiva[] => {
    if (!selectedPaciente) return [];
    const dosesPac = doses.filter(d => (d.paciente || 'Sem Paciente') === selectedPaciente);
    return dosesPac.sort((a, b) => a.data.getTime() - b.data.getTime());
  };

  const agora = new Date();
  const totalDoses = doses.length;

  return (
    <ScreenContainer showGradient={true}>
      <View style={styles.container}>

        <View style={styles.header}>
          <Text style={styles.subtitle}>Suas próximas doses programadas</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {totalDoses === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔭</Text>
              {/* ✅ 18 → 20px */}
              <Text style={styles.emptyMessage}>Nenhum plano de medicação ativo.</Text>
            </View>
          ) : (
            Object.entries(dosesPorPaciente).map(([paciente, dosesPac]) => {
              const medicamentosUnicos = [...new Set(
                dosesPac.filter(d => !d.tomada || d.data.getTime() >= agora.getTime()).map(d => d.medicamento)
              )];
              const dosesRestantes = dosesPac.filter(d => !d.tomada);

              return (
                <TouchableOpacity
                  key={paciente}
                  onPress={() => abrirModalPaciente(paciente)}
                  style={styles.pacienteCard}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver doses de ${paciente}`}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.pacienteIcon}>👤</Text>
                    <Text style={styles.pacienteNome}>{paciente}</Text>
                    <View style={styles.indicatorContainer}>
                      {/* ✅ 13 → 15px */}
                      <Text style={styles.indicatorText}>Ver Detalhes</Text>
                      <Text style={styles.indicatorArrow}>▶</Text>
                    </View>
                  </View>

                  {/* ✅ 13 → 15px, removido itálico */}
                  <Text style={styles.medicamentoCount}>
                    {medicamentosUnicos.length} medicamento{medicamentosUnicos.length !== 1 ? 's' : ''} • {dosesRestantes.length} dose{dosesRestantes.length !== 1 ? 's' : ''} restante{dosesRestantes.length !== 1 ? 's' : ''}
                  </Text>

                  <View>
                    {[...new Set(dosesPac.map(d => d.medicamento))].map(medicamento => {
                      const dosesMed = dosesPac.filter(d => d.medicamento === medicamento);
                      const proximaDose = encontrarProximaDose(dosesMed);
                      const somDesativado = somDesativadoIds.includes(dosesMed[0].medicamentoId);
                      const isAtivo = !somDesativado;

                      return (
                        <View key={medicamento} style={[styles.medicamentoItem, !isAtivo && styles.medicamentoItemInativo]}>

                          {/* Foto da embalagem */}
                          {dosesMed[0].foto_path && (
                            <Image
                              source={{ uri: `file://${dosesMed[0].foto_path}` }}
                              style={styles.fotoEmbalagem}
                              resizeMode="cover"
                            />
                          )}

                          <View style={styles.medicamentoConteudo}>
                          <View style={styles.medicamentoHeader}>
                            <View style={styles.medicamentoInfo}>
                              <Text style={styles.medicamentoIcon}>💊</Text>
                              {/* ✅ 16 → 17px */}
                              <Text style={[styles.medicamentoNomeItem, !isAtivo && styles.medicamentoNomeInativo]}>
                                {medicamento}
                              </Text>
                            </View>

                            {/* ✅ Área de toque mínima de 44px via minHeight */}
                            <TouchableOpacity
                              onPress={() => dosesMed.length > 0 && toggleMedicamento(dosesMed[0].medicamentoId)}
                              style={styles.silenceIndicator}
                              accessibilityRole="button"
                              accessibilityLabel={isAtivo ? `Desativar som de ${medicamento}` : `Ativar som de ${medicamento}`}
                            >
                              <Text style={styles.notificationIcon}>{isAtivo ? '🔔' : '🔕'}</Text>
                              {/* ✅ 12 → 14px */}
                              <Text style={[styles.silenceText, !isAtivo && styles.silenceTextInativo]}>
                                {isAtivo ? 'Desativar' : 'Ativar'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.infoContainer}>
                            <View style={styles.infoItem}>
                              <Text style={styles.infoIcon}>💧</Text>
                              {/* ✅ 13 → 15px */}
                              <Text style={[styles.infoText, !isAtivo && styles.infoTextInativo]}>
                                <Text style={styles.boldText}>{dosesMed[0].dosagem}</Text> {getUnidadePorTipo(dosesMed[0].tipo)}
                              </Text>
                            </View>

                            {proximaDose && (
                              <View style={styles.proximaDoseContainer}>
                                <View style={styles.infoItem}>
                                  <Text style={styles.infoIcon}>⏰</Text>
                                  {/* ✅ 14 → 16px */}
                                  <Text style={styles.proximaDoseTexto}>
                                    {formatarDataRelativa(proximaDose.data)} às {proximaDose.horario}
                                  </Text>
                                </View>

                                {/* ✅ paddingVertical: 8 → 12 — área de toque maior */}
                                <TouchableOpacity
                                  style={proximaDose.tomada ? styles.desmarcarButton : styles.tomarButton}
                                  onPress={() => toggleDoseTomada(proximaDose.id, proximaDose.tomada)}
                                  accessibilityRole="button"
                                  accessibilityLabel={proximaDose.tomada ? 'Desmarcar dose como tomada' : 'Marcar dose como tomada'}
                                >
                                  <Text style={proximaDose.tomada ? styles.desmarcarButtonText : styles.tomarButtonText}>
                                    {proximaDose.tomada ? '✔️ Desmarcar' : '✔️ Tomei'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>{/* fim infoContainer */}
                          </View>{/* fim medicamentoConteudo */}
                        </View>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* MODAL DE DETALHES DO PACIENTE */}
        <Modal
          animationType="none"
          transparent={true}
          visible={pacienteModalVisible}
          onRequestClose={() => setPacienteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {selectedPaciente && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>👤 {selectedPaciente}</Text>
                    <Text style={styles.modalSubtitle}>Todas as doses programadas</Text>
                  </View>

                  <Text style={styles.sectionTitle}>Próximas Doses:</Text>

                  <ScrollView style={styles.dosesContainer}>
                    {getDosesParaModal().length > 0 ? (
                      getDosesParaModal().map((dose, index) => {
                        const medicamentoSilenciado = silenciadosIds.includes(dose.medicamentoId);
                        const isAtivo = dose.ativo && !medicamentoSilenciado;

                        return (
                          <View
                            key={dose.id}
                            style={[
                              styles.doseItem,
                              index % 2 !== 0 && styles.doseItemOdd,
                              dose.tomada && styles.doseItemTomada,
                            ]}
                          >
                            <View style={styles.doseInfo}>
                              <View style={styles.doseInfoItem}>
                                <Text style={styles.medicamentoIcon}>💊</Text>
                                {/* ✅ 15 → 16px */}
                                <Text style={[styles.medName, !isAtivo && styles.doseInativa]}>{dose.medicamento}</Text>
                              </View>
                              <View style={styles.doseInfoItem}>
                                <Text style={styles.infoIcon}>⏰</Text>
                                {/* ✅ 14 → 16px */}
                                <Text style={styles.doseText}>
                                  <Text style={[styles.doseTimeColor, !isAtivo && styles.doseInativa]}>{dose.horario}</Text> - {formatarDataRelativa(dose.data)}
                                </Text>
                              </View>
                              <View style={styles.doseInfoItem}>
                                <Text style={styles.infoIcon}>💧</Text>
                                <Text style={styles.doseText}>
                                  <Text style={styles.boldText}>{dose.dosagem}</Text> {getUnidadePorTipo(dose.tipo)}
                                </Text>
                              </View>
                            </View>

                            {/* ✅ paddingVertical: 10 → 14 — botões mais fáceis de tocar */}
                            <View style={styles.modalButtonsContainer}>
                              {dose.tomada ? (
                                <TouchableOpacity
                                  style={[styles.modalButton, styles.desmarcarButtonModal]}
                                  onPress={() => toggleDoseTomada(dose.id, true)}
                                  accessibilityRole="button"
                                  accessibilityLabel="Desmarcar como tomada"
                                >
                                  <Text style={styles.modalButtonText}>✔️ Desmarcar como Tomada</Text>
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  style={[styles.modalButton, styles.tomarButtonModal]}
                                  onPress={() => toggleDoseTomada(dose.id, false)}
                                  accessibilityRole="button"
                                  accessibilityLabel="Marcar como tomada"
                                >
                                  <Text style={styles.modalButtonText}>✔️ Marcar como Tomada</Text>
                                </TouchableOpacity>
                              )}
                            </View>

                            <View style={styles.switchContainer}>
                              {/* ✅ 14 → 15px */}
                              <Text style={styles.switchLabel}>
                                {dosesSilenciadasIds.includes(dose.id) ? '🔕 Dose Silenciada' : '🔔 Notificar Dose'}
                              </Text>
                              <Switch
                                value={!dosesSilenciadasIds.includes(dose.id)}
                                onValueChange={() => toggleDoseSilence(dose.id, dosesSilenciadasIds.includes(dose.id))}
                                trackColor={{ false: '#CCCCCC', true: '#1E7E34' }}
                                thumbColor={dosesSilenciadasIds.includes(dose.id) ? '#C0392B' : '#FFFFFF'}
                              />
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.emptyModalMessage}>Nenhuma dose programada para este paciente.</Text>
                    )}
                  </ScrollView>

                  {/* ✅ paddingVertical: 12 → 16 — botão fechar maior */}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setPacienteModalVisible(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar"
                  >
                    <Text style={styles.closeButtonText}>Fechar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingHorizontal: 20, paddingVertical: 12, paddingTop: 12 },
  // ✅ mantido 18px — já está ok para header
  subtitle: { fontSize: 18, marginTop: 10, color: '#FFFFFF', textAlign: 'center', fontWeight: '600', lineHeight: 26 },

  scrollContainer: { paddingHorizontal: 8, paddingVertical: 10, paddingBottom: 24 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  // ✅ 18 → 20px
  emptyMessage: { fontSize: 20, color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 40, lineHeight: 30 },

  pacienteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pacienteIcon: { fontSize: 28, marginRight: 10 },
  // ✅ mantido 20px — já estava bom
  pacienteNome: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#054F77', lineHeight: 28 },

  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FC',
    paddingVertical: 6,    // ✅ 4 → 6
    paddingHorizontal: 12,
    borderRadius: 20,
    minHeight: 36,         // ✅ área de toque mínima
  },
  // ✅ 13 → 15px
  indicatorText: { fontSize: 15, color: '#2A5298', fontWeight: '600', marginRight: 4 },
  indicatorArrow: { fontSize: 14 },

  // ✅ 13 → 15px, removido fontStyle: 'italic'
  medicamentoCount: { fontSize: 15, color: '#555', marginBottom: 12, lineHeight: 22 },

  medicamentoItem: {
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fotoEmbalagem: {
    width: '100%',
    height: 120,
    backgroundColor: '#F0F0F0',
  },
  medicamentoConteudo: { padding: 14 },
  medicamentoItemInativo: { backgroundColor: '#F5F5F5', borderColor: '#D0D0D0', opacity: 0.7 },

  medicamentoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  medicamentoInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  medicamentoIcon: { fontSize: 22, marginRight: 8 },
  // ✅ 16 → 17px
  medicamentoNomeItem: { fontSize: 17, fontWeight: 'bold', color: '#1E293B', lineHeight: 24 },
  medicamentoNomeInativo: { color: '#999', textDecorationLine: 'line-through' },

  silenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FC',
    paddingVertical: 6,    // ✅ 4 → 6
    paddingHorizontal: 10,
    borderRadius: 20,
    minHeight: 36,         // ✅ área de toque mínima
  },
  notificationIcon: { fontSize: 16, marginRight: 4 },
  // ✅ 12 → 14px
  silenceText: { fontSize: 14, fontWeight: 'bold', color: '#2A5298' },
  silenceTextInativo: { color: '#999' },

  infoContainer: { marginTop: 4 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoIcon: { fontSize: 16, marginRight: 6 },
  // ✅ 13 → 15px
  infoText: { fontSize: 15, color: '#475569', lineHeight: 22 },
  infoTextInativo: { color: '#999' },

  proximaDoseContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // ✅ 14 → 16px
  proximaDoseTexto: { fontSize: 16, fontWeight: 'bold', color: '#2A5298', marginLeft: 5, lineHeight: 22 },

  // ✅ paddingVertical: 8 → 12
  tomarButton: {
    backgroundColor: '#1E7E34',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  // ✅ 13 → 15px
  tomarButtonText: { fontSize: 15, fontWeight: 'bold', color: 'white' },
  desmarcarButton: {
    backgroundColor: '#C0392B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  // ✅ 13 → 15px
  desmarcarButtonText: { color: 'white', fontSize: 15, fontWeight: 'bold' },

  // MODAL
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.65)' },
  modalContainer: {
    width: '92%',
    maxHeight: '82%',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    backgroundColor: '#F8FBFF',
  },
  modalHeader: { alignItems: 'center', marginBottom: 16 },
  // ✅ mantido 24px — título do modal já estava bom
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#054F77', marginTop: 10, lineHeight: 32 },
  // ✅ mantido 16px — subtítulo ok
  modalSubtitle: { fontSize: 16, color: '#475569', marginTop: 6, textAlign: 'center', lineHeight: 24 },

  // ✅ mantido 18px — já estava ok
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#054F77', marginBottom: 10, marginTop: 12, lineHeight: 26 },

  dosesContainer: { maxHeight: '60%' },
  doseItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  doseItemOdd: { backgroundColor: '#F0F8FF' },
  doseItemTomada: { backgroundColor: 'rgba(30, 126, 52, 0.08)', borderColor: '#1E7E34' },

  doseInfo: { marginBottom: 6 },
  doseInfoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  // ✅ 15 → 16px
  medName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginLeft: 8, lineHeight: 22 },
  doseInativa: { color: '#999', textDecorationLine: 'line-through' },
  // ✅ 14 → 16px
  doseText: { fontSize: 16, color: '#475569', marginLeft: 8, lineHeight: 22 },
  doseTimeColor: { color: '#2A5298', fontWeight: 'bold' },

  modalButtonsContainer: { marginTop: 10, marginBottom: 10 },
  // ✅ paddingVertical: 10 → 14
  modalButton: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center', minHeight: 48 },
  tomarButtonModal: { backgroundColor: '#1E7E34' },
  desmarcarButtonModal: { backgroundColor: '#C0392B' },
  // ✅ 14 → 16px
  modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    minHeight: 48,         // ✅ área de toque do switch
  },
  // ✅ 14 → 15px
  switchLabel: { fontSize: 15, color: '#475569', fontWeight: 'bold', lineHeight: 22 },

  // ✅ paddingVertical: 12 → 16
  closeButton: {
    backgroundColor: '#054F77',
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 16,
    alignItems: 'center',
    elevation: 3,
    minHeight: 52,
  },
  // ✅ mantido 16px — já estava ok, linha height adicionada
  closeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', lineHeight: 22 },

  // ✅ mantido 16px — já estava ok
  emptyModalMessage: { textAlign: 'center', color: '#666', fontSize: 16, marginTop: 20, lineHeight: 24 },

  boldText: { fontWeight: 'bold' },
});

export default MedicamentosAtivosScreen;