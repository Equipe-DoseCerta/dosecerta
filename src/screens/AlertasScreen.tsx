import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Importações do Projeto
import {
  fetchMedicamentos,
  Medicamento
} from '../database/database';
import {
  listenMedicamentoExcluido,
  listenMedicamentoAdicionado
} from '../services/eventService';
import { getUnidadePorTipo } from '../services/notificationUtils';
import { Alerta } from '../services/alarmeService'; // Tipo Alerta

const AlertasScreen = () => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [pacienteModalVisible, setPacienteModalVisible] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<string | null>(null);

  /**
   * Função para carregar medicamentos do banco de dados, calcular todas as doses futuras 
   * e gerar a lista de alertas.
   */
  const carregarMedicamentos = useCallback(async () => {
    try {
      const medicamentos = await fetchMedicamentos();
      const agora = new Date();

      const novosAlertas = medicamentos.flatMap((med: Medicamento) => {
        // Validação de dados essenciais
        if (!med.id || !med.horario_inicial || !med.intervalo_horas || !med.dataInicio || med.ativo === false) {
          return [];
        }

        // Parsing de Datas
        const [dia, mes, ano] = med.dataInicio.split('/').map(Number);
        const [hora, minuto] = med.horario_inicial.split(':').map(Number);
        const inicioTratamento = new Date(ano, mes - 1, dia, hora, minuto);

        const totalHorasTratamento = med.duracaoTratamento * 24;
        const fimTratamento = new Date(inicioTratamento.getTime() + totalHorasTratamento * 60 * 60 * 1000);

        // Filtra tratamentos já concluídos
        if (fimTratamento < agora) return [];

        const totalDoses = Math.ceil(totalHorasTratamento / med.intervalo_horas);
        const todasDoses: { data: Date; horario: string }[] = [];

        // Gera o cronograma de doses
        for (let i = 0; i < totalDoses; i++) {
          const doseTime = new Date(inicioTratamento.getTime() + i * med.intervalo_horas * 60 * 60 * 1000);
          const horario = `${doseTime.getHours().toString().padStart(2, '0')}:${doseTime.getMinutes().toString().padStart(2, '0')}`;
          todasDoses.push({ data: doseTime, horario });
        }

        // Filtra apenas doses futuras
        const dosesAtivas = todasDoses.filter(dose => dose.data.getTime() >= agora.getTime());

        return dosesAtivas.map((dose, index) => ({
          id: `${med.id}-${index}`,
          medicamentoId: med.id!,
          medicamento: med.nome,
          paciente: med.nomePaciente,
          horario: dose.horario,
          data: dose.data,
          dosagem: med.dosagem,
          tipo: med.tipo,
          intervalo_horas: med.intervalo_horas,
          duracaoTratamento: med.duracaoTratamento,
          dataInicio: inicioTratamento,
          ativo: true, // Assume ativo por padrão
          estoqueBaixo: false,
          snoozeCount: 0 
        } as Alerta));
      });
      
      setAlertas(novosAlertas.sort((a, b) => a.data.getTime() - b.data.getTime()));

    } catch (error) {
       console.error("Erro ao carregar medicamentos para alertas:", error);
       Alert.alert("Erro", "Não foi possível carregar a lista de alertas.");
    }
  }, []);

  // --- EFEITOS (Event Listeners) ---

  // Carrega medicamentos na montagem
  useEffect(() => {
    carregarMedicamentos();
  }, [carregarMedicamentos]);

  // Listener para Medicamento Excluido/Arquivado
  useEffect(() => {
    const excluidoSubscription = listenMedicamentoExcluido((idExcluido: number) => {
      // Remove todos os alertas relacionados ao medicamento excluído
      setAlertas(prev => prev.filter(a => {
        const medId = parseInt(a.id.split("-")[0], 10);
        return medId !== idExcluido;
      }));
    });

    return () => {
      // Garantir a remoção do listener
      if (typeof excluidoSubscription.remove === 'function') {
        excluidoSubscription.remove();
      }
    };
  }, []);

  // Listener para Medicamento Adicionado/Atualizado
  useEffect(() => {
    const adicionadoSubscription = listenMedicamentoAdicionado(() => {
      carregarMedicamentos();
    });

    return () => {
      // Garantir a remoção do listener
       if (typeof adicionadoSubscription.remove === 'function') {
        adicionadoSubscription.remove();
      }
    };
  }, [carregarMedicamentos]);

  // --- FUNÇÕES DE LÓGICA ---

  /**
   * Alterna o estado 'ativo' de uma dose específica.
   */
  const toggleAlerta = useCallback((alertaId: string) => {
    setAlertas(prevAlertas =>
      prevAlertas.map(alerta =>
        alerta.id === alertaId 
        ? { ...alerta, ativo: !alerta.ativo } 
        : alerta
      )
    );
  }, []);

  /**
   * Alterna o estado 'ativo' de todas as doses de um medicamento.
   */
  const toggleMedicamento = useCallback((medicamentoId: number) => {
    setAlertas(prevAlertas => {
      // Verifica o estado atual de pelo menos uma dose para decidir se deve ativar ou desativar
      const isAnyActive = prevAlertas.some(a => a.medicamentoId === medicamentoId && a.ativo);
      const newState = !isAnyActive;

      return prevAlertas.map(alerta =>
        alerta.medicamentoId === medicamentoId 
        ? { ...alerta, ativo: newState } 
        : alerta
      );
    });
  }, []);

  /**
   * Encontra a próxima dose ativa no futuro.
   */
  const encontrarProximaDose = (alertasList: Alerta[]): Alerta | null => {
    const agora = new Date();
    const dosesFuturas = alertasList
      .filter(a => a.data.getTime() >= agora.getTime() && a.ativo) // Agora filtra estritamente o futuro e ativo
      .sort((a, b) => a.data.getTime() - b.data.getTime());

    return dosesFuturas.length > 0 ? dosesFuturas[0] : null;
  };

  /**
   * Abre o modal com o cronograma detalhado do paciente.
   */
  const abrirModalPaciente = (paciente: string) => {
    setSelectedPaciente(paciente);
    setPacienteModalVisible(true);
  };

  /**
   * Formata a data para exibição.
   */
  const formatarData = (data: Date, somenteHora = false): string => {
    const options: Intl.DateTimeFormatOptions = somenteHora
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" };
    
    // Uso de try/catch para evitar falhas se a data for inválida
    try {
       return data.toLocaleTimeString("pt-BR", options);
    } catch {
       return "Inválido";
    }
  };

  // --- CÁLCULOS DERIVADOS ---

  // 1. Filtra alertas para o futuro
  const alertasAtivos = alertas.filter(alerta => alerta.data.getTime() >= new Date().getTime());

  // 2. Agrupa alertas por paciente (para a tela principal)
  const alertasPorPaciente = alertasAtivos.reduce((acc: Record<string, Alerta[]>, alerta) => {
    if (!acc[alerta.paciente]) {
      acc[alerta.paciente] = [];
    }
    acc[alerta.paciente].push(alerta);
    return acc;
  }, {});

  // 3. Obtém doses futuras para o modal
  const getDosesFuturas = (): Alerta[] => {
    if (!selectedPaciente) return [];

    const agora = new Date();
    return alertas
      .filter(a => a.paciente === selectedPaciente && a.data.getTime() >= agora.getTime())
      .sort((a, b) => a.data.getTime() - b.data.getTime());
  };

  // --- RENDERIZAÇÃO ---

  return (
    <SafeAreaView style={styles.containerMain} edges={["right", "bottom", "left"]}>
      {/* Substituindo LinearGradient por View simples para consistência com HistoricoScreen */}
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.subtitle}>
            Acompanhe o cronograma de todas as doses futuras de seus pacientes.
          </Text>

          {Object.entries(alertasPorPaciente).length === 0 ? (
            <View style={styles.emptyContainer}>
              {/* Substituindo Ionicons por emoji */}
              <Text style={styles.emptyIcon}>🔕</Text>
              <Text style={styles.emptyMessage}>
                Nenhum plano de medicação ativo ou dose futura para monitorar.
              </Text>
            </View>
          ) : (
            Object.entries(alertasPorPaciente).map(([paciente, alertasPac]) => {
              const medicamentosUnicos = [...new Set(alertasPac.map(a => a.medicamento))];
  
              return (
                <TouchableOpacity 
                  key={paciente} 
                  onPress={() => abrirModalPaciente(paciente)}
                  style={styles.pacienteCard}
                  accessibilityLabel={`Ver cronograma de ${paciente}`}
                >
                  <View style={styles.cardHeader}>
                    {/* Ícone de paciente: Substituindo Ionicons por emoji */}
                    <Text style={styles.pacienteIcon}>👤</Text>
                    <Text style={styles.pacienteNome}>{paciente}</Text>
                    
                    <View style={styles.indicatorContainer}>
                      <Text style={styles.indicatorText}>Ver cronograma</Text>
                      {/* Seta para frente: Substituindo Ionicons por emoji */}
                      <Text style={styles.indicatorArrow}>➡️</Text>
                    </View>
                  </View>
  
                  <Text style={styles.medicamentoCount}>
                    {medicamentosUnicos.length} medicamento{medicamentosUnicos.length > 1 ? "s" : ""} sendo monitorado{medicamentosUnicos.length > 1 ? "s" : ""}
                  </Text>
  
                  <View>
                    {medicamentosUnicos.map(medicamento => {
                      const alertasMed = alertasPac.filter(a => a.medicamento === medicamento);
                      const proximaDose = encontrarProximaDose(alertasMed);
                      const isAtivo = alertasMed.some(a => a.ativo);
  
                      return (
                        <View key={medicamento} style={[styles.medicamentoItem, !isAtivo && styles.medicamentoItemInativo]}>
                          <View style={styles.medicamentoHeader}>
                            <View style={styles.medicamentoInfo}>
                              {/* Ícone de medicamento: Substituindo Ionicons por emoji */}
                              <Text style={styles.medicamentoIcon}>💊</Text>
                              <Text style={[styles.medicamentoNomeItem, !isAtivo && styles.medicamentoNomeInativo]}>{medicamento}</Text>
                            </View>
                            
                            <TouchableOpacity 
                              onPress={() => {
                                if (alertasMed.length > 0) {
                                  toggleMedicamento(alertasMed[0].medicamentoId);
                                }
                              }}
                              style={styles.silenceIndicator}
                              accessibilityLabel={isAtivo ? `Silenciar todas as doses de ${medicamento}` : `Reativar todas as doses de ${medicamento}`}
                            >
                              {/* Ícone de notificação: Substituindo Ionicons por emoji */}
                              <Text style={styles.notificationIcon}>{isAtivo ? "🔔" : "🔕"}</Text>
                              <Text style={[styles.silenceText, !isAtivo && styles.silenceTextInativo]}>
                                {isAtivo ? "Ativo" : "Silenciado"}
                              </Text>
                            </TouchableOpacity>
                          </View>
  
                          <View style={styles.infoContainer}>
                            <View style={styles.infoItem}>
                              {/* Ícone de dosagem (água): Substituindo Ionicons por emoji */}
                              <Text style={styles.infoIcon}>💧</Text>
                              {/* Corrigindo a formatação de negrito */}
                              <Text style={[styles.infoText, !isAtivo && styles.infoTextInativo]}>
                                <Text style={styles.boldText}>{alertasMed[0].dosagem}</Text> {getUnidadePorTipo(alertasMed[0].tipo)}
                              </Text>
                            </View>
  
                            {proximaDose && (
                              <View style={styles.infoItem}>
                                {/* Ícone de tempo: Substituindo Ionicons por emoji */}
                                <Text style={styles.infoIcon}>⏰</Text>
                                <Text style={styles.proximaDose}>
                                  Próxima dose: {formatarData(proximaDose.data, true)}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <Modal
          animationType="slide"
          transparent={true}
          visible={pacienteModalVisible}
          onRequestClose={() => setPacienteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            {/* Substituindo LinearGradient por View simples para consistência com HistoricoScreen */}
            <View style={styles.modalContainer}>
              {selectedPaciente && (
                <>
                  <View style={styles.modalHeader}>
                    {/* Ícone de paciente no modal: Reutilizando o estilo pacienteIcon */}
                    <Text style={styles.pacienteIcon}>👤</Text>
                    <Text style={styles.modalTitle}>{selectedPaciente}</Text>
                    <Text style={styles.modalSubtitle}>Cronograma Completo de Doses Futuras</Text>
                  </View>

                  <Text style={styles.sectionTitle}>Ações por Dose:</Text>

                  <ScrollView style={styles.dosesContainer}>
                    {getDosesFuturas().length > 0 ? (
                      getDosesFuturas().map((dose, index) => (
                        <View
                          key={index}
                          style={[
                            styles.doseItem,
                            index % 2 !== 0 && styles.doseItemOdd, 
                          ]}
                        >
                          <View style={styles.doseInfo}>
                            <View style={styles.doseInfoItem}>
                              {/* Ícone de medicamento no modal: Reutilizando o estilo medicamentoIcon */}
                              <Text style={styles.medicamentoIcon}>💊</Text>
                              <Text style={[styles.medName, !dose.ativo && styles.doseInativa]}>
                                {dose.medicamento} (<Text style={styles.boldText}>{dose.dosagem}</Text> {getUnidadePorTipo(dose.tipo)})
                              </Text>
                            </View>

                            <View style={styles.doseInfoItem}>
                              {/* Ícone de tempo no modal: Reutilizando o estilo infoIcon */}
                              <Text style={styles.infoIcon}>⏰</Text>
                              <Text 
                                style={[styles.doseText, !dose.ativo && styles.doseInativa, styles.doseTimeColor]} 
                              >
                                {formatarData(dose.data, true)} - {formatarData(dose.data).split(' ')[0]}
                              </Text>
                            </View>

                            <View style={styles.switchContainer}>
                              <Text style={styles.switchLabel}>
                                Status: {dose.ativo ? "Ativo" : "Silenciado"}
                              </Text>
                              <Switch
                                value={dose.ativo}
                                onValueChange={() => toggleAlerta(dose.id)}
                                trackColor={{ false: "#767577", true: "#2A5298" }}
                                thumbColor={"#f4f3f4"}
                                accessibilityLabel={`Ativar ou silenciar dose de ${dose.medicamento}`}
                              />
                            </View>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyModalMessage}>Nenhuma dose futura para este paciente.</Text>
                    )}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setPacienteModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>Fechar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  containerMain: {
    flex: 1,
    backgroundColor: '#054F77',
  },
  container: {
    flex: 1,
    paddingTop: 15,
    backgroundColor: '#0A7AB8', // Adicionado background color para substituir LinearGradient
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    marginTop: 50,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
    color: 'rgba(255,255,255,0.4)', // Cor para o emoji
  },
  emptyMessage: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  pacienteCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pacienteIcon: {
    fontSize: 32,
    color: '#2A5298',
  },
  pacienteNome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#054F77',
    marginLeft: 10,
    flex: 1,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 82, 152, 0.1)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  indicatorText: {
    fontSize: 12,
    color: '#2A5298',
    fontWeight: 'bold',
  },
  indicatorArrow: {
    fontSize: 16, // Tamanho ajustado para emoji
    marginLeft: 5,
    color: '#2A5298', // Cor para o emoji
  },
  medicamentoCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    paddingLeft: 42, // Alinhar com o nome do paciente
  },
  medicamentoItem: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  medicamentoItemInativo: {
    backgroundColor: '#E0E0E0',
    borderColor: '#C0C0C0',
  },
  medicamentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  medicamentoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  medicamentoIcon: {
    fontSize: 20,
    color: '#FF6B6B', // Cor para o emoji
  },
  medicamentoNomeItem: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  medicamentoNomeInativo: {
    color: '#777',
  },
  silenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: 'rgba(42, 82, 152, 0.05)',
  },
  notificationIcon: {
    fontSize: 20, // Tamanho ajustado para emoji
    color: '#2A5298', // Cor para o emoji
  },
  silenceText: {
    fontSize: 12,
    color: '#2A5298',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  silenceTextInativo: {
    color: '#AAAAAA',
  },
  infoContainer: {
    marginTop: 5,
    paddingLeft: 28, // Alinhar com o ícone do medicamento
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  infoIcon: {
    fontSize: 16,
    color: '#7D8EA3', // Cor para o emoji
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 5,
  },
  infoTextInativo: {
    color: '#999',
  },
  proximaDose: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B0000',
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    backgroundColor: '#F8FBFF', // Adicionado background color para substituir LinearGradient
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#054F77',
    marginTop: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#054F77',
    marginBottom: 10,
    marginTop: 15,
  },
  dosesContainer: {
    maxHeight: '60%', // Limita a altura para que o botão fechar fique visível
  },
  doseItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  doseItemOdd: {
    backgroundColor: '#F0F8FF', // Cor de fundo diferente para linhas ímpares
  },
  doseInfo: {
    marginBottom: 5,
  },
  doseInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  medName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  doseInativa: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  doseText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
  doseTimeColor: {
    color: '#8B0000',
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  switchLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#054F77',
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    alignItems: 'center',
    elevation: 3,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyModalMessage: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
  boldText: { // Novo estilo para texto em negrito
    fontWeight: 'bold',
  },
});

export default AlertasScreen;
