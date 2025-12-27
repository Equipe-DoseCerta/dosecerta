import React, { useState, useEffect } from 'react'; 
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Share, 
  Alert, 
  ActivityIndicator,
  DeviceEventEmitter, // Importar para escutar eventos do DB
  StatusBar, // ADICIONAR: Importação da Status Bar
} from 'react-native';
// useIsFocused é importante para recarregar a lista quando o usuário volta para a tela
import { useNavigation, useIsFocused } from '@react-navigation/native';

// ADICIONAR: Importações de Layout
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// **IMPORTAÇÃO DO BANCO DE DADOS REAL**
import { Medicamento, fetchMedicamentos, deleteMedicamento } from '../database/database'; 

// Funções de formatação (permanecem as mesmas, usam Medicamento importado)
const formatarDosagem = (tipo: string, dosagem: string, unidade?: string) => {
  const tipoLower = tipo?.toLowerCase() || '';
  
  if (tipoLower === 'líquido') {
    return `${dosagem} ml`;
  }
  if (tipoLower === 'gotas') {
    return dosagem === '1' ? '1 gota' : `${dosagem} gotas`;
  }
  // Ajustar unidade, se vier sem 'mg' ou 'g' e for um número.
  return `${dosagem} ${unidade || ''}`;
};

const formatarHorario = (hora: string) => {
  try {
    if (!hora || !hora.includes(':')) {
      return 'Horário inválido';
    }
    return hora;
  } catch {
    console.error('Erro ao formatar horário:');
    return 'Horário inválido';
  }
};

const HistoricoScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); // Hook para saber se a tela está em foco
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar dados no banco
  const carregarMedicamentos = async () => {
    setLoading(true);
    try {
      // **CHAMADA À FUNÇÃO REAL DE BUSCA DO DB**
      const listaMedicamentos = await fetchMedicamentos();
      setMedicamentos(listaMedicamentos);
    } catch {
      console.error('Erro ao carregar medicamentos:');
      Alert.alert('Erro', 'Não foi possível carregar o histórico de medicamentos.');
      setMedicamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = (id: number) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza de que deseja excluir este medicamento do histórico? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          onPress: async () => {
            try {
              // **CHAMADA À FUNÇÃO REAL DE EXCLUSÃO DO DB**
              await deleteMedicamento(id);
              // Como a exclusão emite um evento, o useEffect irá recarregar, mas podemos otimizar:
              setMedicamentos(prev => prev.filter(med => med.id !== id));
              Alert.alert('Sucesso', 'Medicamento excluído com sucesso.');
            } catch {
              console.error('Erro ao excluir medicamento:');
              Alert.alert('Erro', 'Não foi possível excluir o medicamento.');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };
  
  // Efeito para carregar dados e configurar ouvintes de eventos
  useEffect(() => {
    // Recarregar sempre que a tela estiver em foco (útil ao voltar da tela de cadastro/edição)
    if (isFocused) {
      carregarMedicamentos();
    }
    
    // Ouvintes de eventos para recarregar a lista quando o DB for alterado em outro componente
    const listenerAdd = DeviceEventEmitter.addListener('medicamento-adicionado', carregarMedicamentos);
    const listenerDelete = DeviceEventEmitter.addListener('medicamento-excluido', carregarMedicamentos); 
    const listenerDoseTomada = DeviceEventEmitter.addListener('dose-tomada', carregarMedicamentos); 

    return () => {
      // Limpar os ouvintes ao desmontar
      listenerAdd.remove();
      listenerDelete.remove();
      listenerDoseTomada.remove();
    };
  }, [isFocused]);

  const handleCompartilhar = async (medicamento: Medicamento) => {
    try {
      const mensagem = `Relatório de Medicamento:\n\n`
        + `Paciente: ${medicamento.nomePaciente}\n`
        + `Medicamento: ${medicamento.nome}\n`
        + `Dosagem: ${formatarDosagem(medicamento.tipo, medicamento.dosagem, medicamento.unidade)}\n`
        + `Horário de Início: ${formatarHorario(medicamento.horario_inicial)}\n`
        + `Intervalo: ${medicamento.intervalo_horas} horas\n`
        + `Duração: ${medicamento.duracaoTratamento} dias\n`
        + `Notas: ${medicamento.notas || 'Nenhuma'}`;
      
      await Share.share({ message: mensagem, title: 'Relatório de Medicamento' });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o relatório.');
    }
  };

  const renderItem = ({ item }: { item: Medicamento }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.medName}>{item.nome}</Text>
          <Text style={styles.patientName}>{item.nomePaciente}</Text>
          <View style={[styles.statusBadge, item.ativo ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{item.ativo ? 'Ativo' : 'Finalizado'}</Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => handleCompartilhar(item)} style={styles.shareButton}>
            <Text style={styles.shareIcon}>📤</Text>
          </TouchableOpacity>
          {/* O ID é opcional na interface, mas obrigatório para exclusão */}
          {item.id && ( 
            <TouchableOpacity onPress={() => handleExcluir(item.id!)} style={styles.deleteButton}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dosagem:</Text>
          <Text style={styles.detailValue}>{formatarDosagem(item.tipo, item.dosagem, item.unidade)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Início:</Text>
          <Text style={styles.detailValue}>{item.dataInicio} às {item.horario_inicial}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Intervalo:</Text>
          <Text style={styles.detailValue}>A cada {item.intervalo_horas}h</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duração:</Text>
          <Text style={styles.detailValue}>{item.duracaoTratamento} dia(s)</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total de doses:</Text>
          <Text style={styles.detailValue}>{item.dosesTotais}</Text>
        </View>
        {item.notas && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Observações:</Text>
            <Text style={styles.notesText}>{item.notas}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ADICIONAR: Status Bar com cor do topo do gradiente */}
      <StatusBar backgroundColor="#054F77" barStyle="light-content" />
      
      {/* ADICIONAR: LinearGradient para o fundo */}
      <LinearGradient colors={['#054F77', '#0A7AB8']} style={styles.gradientContainer}>
        
        {/* ADICIONAR: SafeAreaView para proteger áreas não seguras, exceto o topo */}
        <SafeAreaView style={styles.safeAreaContent} edges={['left', 'right', 'bottom']}>
          {loading ? (
            <View style={styles.centered}>
              {/* Ajustar cor do ActivityIndicator para branco */}
              <ActivityIndicator size="large" color="white" /> 
              {/* Cor de loadingText ajustada no StyleSheet */}
              <Text style={styles.loadingText}>Carregando histórico...</Text>
            </View>
          ) : medicamentos.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>📋</Text>
              {/* Cores de emptyText e emptySubtitle ajustadas no StyleSheet */}
              <Text style={styles.emptyText}>Nenhum medicamento registrado</Text>
              <Text style={styles.emptySubtitle}>Cadastre um medicamento para começar</Text>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => navigation.navigate('CadastroMedicamento' as never)}
              >
                <Text style={styles.addButtonText}>Adicionar Medicamento</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={medicamentos}
              renderItem={renderItem}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContainer} // contentContainerStyle contém o ajuste de paddingTop
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                // Cor de screenSubtitle ajustada no StyleSheet
                <Text style={styles.screenSubtitle}>Acompanhe seus tratamentos</Text>
              }
            />
          )}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // REMOVIDO: backgroundColor: '#f5f5f5',
    // REMOVIDO: paddingTop: 10,
  },
  // ADICIONADO: Estilos para o Gradiente
  gradientContainer: {
    flex: 1,
  },
  safeAreaContent: {
    flex: 1,
  },
  
  // ALTERADO: Cor para contraste com o fundo escuro
  screenSubtitle: {
    fontSize: 18,
    color: 'white', 
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  centered: {
    flex: 1, // Para preencher a área segura no Loading/Empty
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  // ALTERADO: Cor para contraste com o fundo escuro
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: 'white',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  // ALTERADO: Cor para contraste com o fundo escuro
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white', 
    textAlign: 'center',
    marginBottom: 10,
  },
  // ALTERADO: Cor para contraste com o fundo escuro
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)', 
    textAlign: 'center',
    marginBottom: 30,
  },
  addButton: {
    backgroundColor: '#054f77',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // AJUSTADO: paddingTop para compensar a Status Bar
  listContainer: {
    paddingHorizontal: 15,
    paddingTop: 30, 
    paddingBottom: 50,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 15,
    backgroundColor: 'rgba(5, 79, 119, 0.05)',
  },
  headerContent: {
    flex: 1,
  },
  medName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#054f77',
    marginBottom: 2,
  },
  patientName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  shareButton: {
    padding: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 20,
  },
  shareIcon: {
    fontSize: 18,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 20,
  },
  deleteIcon: {
    fontSize: 18,
  },
  cardBody: {
    padding: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  notesContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default HistoricoScreen;