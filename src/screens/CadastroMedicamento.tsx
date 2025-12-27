import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Modal, 
  Keyboard, 
  Alert,
  Dimensions
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native'; 
import { insertMedicamento as insertMedicamentoDB, Medicamento } from '../database/database';

// 🚨 ADICIONAR: Importar serviço de alarmes nativos
import NativeAlarmService from '../services/NativeAlarmService';

type ErrorState = {
  nomePaciente: boolean;
  nome: boolean;
  dosagem: boolean;
  tipo: boolean;
  intervalo_horas: boolean;
  duracaoTratamento: boolean;
  horario_inicial: boolean;
  dataInicio: boolean;
};

const CadastroMedicamento = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const nomePacienteRef = useRef<TextInput>(null);
  const nomeRef = useRef<TextInput>(null);
  const dosagemRef = useRef<TextInput>(null);
  const duracaoRef = useRef<TextInput>(null);
  const notasRef = useRef<TextInput>(null);
  
  const [nomePaciente, setNomePaciente] = useState('');
  const [nome, setNome] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [tipo, setTipo] = useState('');
  const [unidade, setUnidade] = useState('');
  const [intervalo_horas, setIntervaloHoras] = useState<number | null>(null);
  const [duracaoTratamento, setDuracaoTratamento] = useState('');
  const [horario_inicial, setHorarioInicial] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notas, setNotas] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [afterModalAction, setAfterModalAction] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [errors, setErrors] = useState<ErrorState>({
    nomePaciente: false, nome: false, dosagem: false, tipo: false, intervalo_horas: false,
    duracaoTratamento: false, horario_inicial: false, dataInicio: false,
  });

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const capitalizarNomes = (texto: string) => {
    const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e'];
    
    return texto
      .split(' ')
      .map((palavra, index) => {
        const palavraLower = palavra.toLowerCase();
        
        // Primeira palavra sempre maiúscula
        if (index === 0) {
          return palavraLower.charAt(0).toUpperCase() + palavraLower.slice(1);
        }
        // Preposições em minúsculo
        if (preposicoes.includes(palavraLower)) {
          return palavraLower;
        }
        // Demais palavras capitalizadas
        return palavraLower.charAt(0).toUpperCase() + palavraLower.slice(1);
      })
      .join(' ');
  };

  const capitalizarPrimeiraLetra = (texto: string) => {
    if (!texto || texto.length === 0) return texto;
    const trimmed = texto.trim();
    if (trimmed.length === 0) return texto;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const tiposMedicamento = [
    'Comprimido', 'Cápsula', 'Líquido', 'Pomada', 'Injeção', 'Spray', 'Gotas', 'Supositório'
  ];

  const frequencias = [
    { label: 'A cada 2 horas', value: 2 }, 
    { label: 'A cada 4 horas', value: 4 }, 
    { label: 'A cada 6 horas (4x/dia)', value: 6 }, 
    { label: 'A cada 8 horas (3x/dia)', value: 8 }, 
    { label: 'A cada 12 horas (2x/dia)', value: 12 }, 
    { label: 'A cada 24 horas (Diária)', value: 24 },     
    { label: 'A cada 48 horas (A cada 2 dias)', value: 48 }, 
    { label: 'A cada 72 horas (A cada 3 dias)', value: 72 },
  ];

  const unidadesPorTipo: Record<string, string> = {
    comprimido: 'un', cápsula: 'un', líquido: 'ml', pomada: 'g', injeção: 'ml', 
    spray: 'jato', gotas: 'gotas', supositório: 'un',
  };

  const limparFormulario = () => {
    setNomePaciente(''); setNome(''); setDosagem(''); setTipo(''); setUnidade(''); setIntervaloHoras(null); 
    setDuracaoTratamento(''); setHorarioInicial(''); setDataInicio(''); setNotas('');
    setErrors({
      nomePaciente: false, nome: false, dosagem: false, tipo: false, intervalo_horas: false,
      duracaoTratamento: false, horario_inicial: false, dataInicio: false,
    });
  };

  const validarESalvar = async () => {
    let hasError = false;
    const newErrors = {...errors};

    const camposObrigatorios = [
      {campo: 'nomePaciente', valor: nomePaciente.trim()}, {campo: 'nome', valor: nome.trim()},
      {campo: 'dosagem', valor: dosagem}, {campo: 'tipo', valor: tipo},
      {campo: 'intervalo_horas', valor: intervalo_horas}, {campo: 'duracaoTratamento', valor: duracaoTratamento},
      {campo: 'horario_inicial', valor: horario_inicial}, {campo: 'dataInicio', valor: dataInicio},
    ];

    camposObrigatorios.forEach(({campo, valor}) => {
      const isEmpty = valor === '' || valor === null || (typeof valor === 'string' && valor.length === 0);
      newErrors[campo as keyof ErrorState] = isEmpty;
      if (isEmpty) hasError = true;
    });

    const dosagemNum = parseFloat(dosagem.replace(',', '.'));
    if (isNaN(dosagemNum) || dosagemNum <= 0) { 
      newErrors.dosagem = true; 
      hasError = true; 
    }
    const duracaoNum = parseInt(duracaoTratamento, 10);
    if (isNaN(duracaoNum) || duracaoNum <= 0) { 
      newErrors.duracaoTratamento = true; 
      hasError = true; 
    }

    setErrors(newErrors);

    if (hasError) {
      Alert.alert('Atenção!', 'Verifique todos os campos obrigatórios destacados em vermelho.');
      return false;
    }

    try {
      const duracao_dias = duracaoNum;
      const dosesTotais = Math.ceil((duracao_dias * 24) / intervalo_horas!);

      const medicamento: Omit<Medicamento, 'id'> = {
        nomePaciente: nomePaciente.trim(), 
        nome: nome.trim(), 
        dosagem: dosagemNum.toString(), 
        tipo, 
        unidade: unidadesPorTipo[tipo] || 'un',
        duracaoTratamento: duracao_dias,
        horario_inicial, 
        dataInicio, 
        intervalo_horas: intervalo_horas!, 
        notas: notas.trim() || '',
        dosesTotais, 
        ativo: true
      };

      // 🔥 SALVAR NO BANCO
      const medicamentoId = await insertMedicamentoDB(medicamento);
      console.log('✅ Medicamento salvo no banco, ID:', medicamentoId);

      // 🔥 AGENDAR ALARMES NATIVOS
      const medicamentoCompleto: Medicamento = {
        ...medicamento,
        id: medicamentoId as number
      };

      console.log('📅 Agendando alarmes nativos...');
      await NativeAlarmService.agendarTodosAlarmes(medicamentoCompleto);
      console.log('✅ Alarmes nativos agendados com sucesso!');

      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar medicamento ou agendar alarmes:', error);
      Alert.alert('Erro', 'Erro ao salvar medicamento ou agendar alarmes. Tente novamente.');
      return false; 
    }
  };

  const handleSalvar = async () => {
    if (await validarESalvar()) {
      showSuccessModal('Medicamento cadastrado com sucesso!', 'goBack');
    }
  };

  const handleAdicionarOutro = async () => {
    if (await validarESalvar()) {
      showSuccessModal('Medicamento cadastrado! Adicione o próximo.', 'addAnother');
    }
  };

  const showTimepicker = () => setShowTimePicker(true);
  const showDatepicker = () => setShowDatePicker(true);

  const onChangeTime = (_event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const horas = selectedDate.getHours().toString().padStart(2, '0');
      const minutos = selectedDate.getMinutes().toString().padStart(2, '0');
      setHorarioInicial(`${horas}:${minutos}`);
      setErrors({...errors, horario_inicial: false});
    }
  };

  const onChangeDate = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dia = selectedDate.getDate().toString().padStart(2, '0');
      const mes = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const ano = selectedDate.getFullYear();
      setDataInicio(`${dia}/${mes}/${ano}`);
      setErrors({...errors, dataInicio: false});
    }
  };

  const handleModalOK = () => {
    setModalVisible(false);
    if (afterModalAction === 'goBack') {
      limparFormulario();
      navigation.goBack();
    } else if (afterModalAction === 'addAnother') {
      limparFormulario();
      scrollViewRef.current?.scrollTo({ y: 0, animated: true }); 
    }
    setAfterModalAction(null);
  };
  
  const showSuccessModal = (message: string, action: string) => {
    setModalMessage(message);
    setAfterModalAction(action);
    setModalVisible(true);
  };
  
  const getDateFromTimeString = (): Date => {
    const now = new Date();
    if (horario_inicial) {
      const [hours, minutes] = horario_inicial.split(':').map(Number);
      now.setHours(hours, minutes, 0, 0);
    }
    return now;
  };

  const getDateFromDateString = (): Date => {
    if (dataInicio) {
      const [day, month, year] = dataInicio.split('/').map(Number);
      return new Date(year, month - 1, day);
    } else {
      return new Date();
    }
  };

  const floatingButtonStyle = {
    bottom: keyboardHeight > 0 ? keyboardHeight + 10 : 80
  };

  return (
    <LinearGradient
        colors={['#054F77', '#0A7AB8']}
        style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Preencha os dados com atenção para criar o plano de medicação.
          </Text>
          
          <View style={styles.formContainer}>
            <Text style={styles.label}>Nome do Paciente *</Text>
            <View style={[
              styles.inputContainer, 
              errors.nomePaciente && styles.errorField
            ]}>
              <TextInput
                ref={nomePacienteRef}
                style={styles.input}
                value={nomePaciente}
                onChangeText={(text) => {
                    setNomePaciente(capitalizarNomes(text));
                    setErrors({...errors, nomePaciente: false});
                }}
                placeholder="Ex: Maria Pereira da Silva"
                placeholderTextColor="#999"
                returnKeyType="next"
                onSubmitEditing={() => nomeRef.current?.focus()}
              />
            </View>

            <Text style={styles.label}>Nome do Medicamento *</Text>
            <View style={[
              styles.inputContainer, 
              errors.nome && styles.errorField
            ]}>
              <TextInput
                ref={nomeRef}
                style={styles.input}
                value={nome}
                onChangeText={(text) => {
                    setNome(capitalizarNomes(text));
                    setErrors({...errors, nome: false});
                }}
                placeholder="Ex: Amoxicilina de Potássio"
                placeholderTextColor="#999"
                returnKeyType="next"
                onSubmitEditing={() => dosagemRef.current?.focus()}
              />
            </View>
            
            <View style={styles.rowContainer}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Dosagem *</Text>
                <View style={[
                  styles.inputContainer, 
                  errors.dosagem && styles.errorField,
                  styles.smallInputContainer
                ]}>
                  <TextInput
                    ref={dosagemRef}
                    style={styles.input}
                    value={dosagem}
                    onChangeText={(text) => {
                        setDosagem(text.replace(',', '.')); 
                        setErrors({...errors, dosagem: false});
                    }}
                    placeholder="Ex: 500"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Unidade</Text>
                <View style={[styles.inputContainer, styles.smallInputContainer, styles.disabledInput]}>
                  <Text style={styles.disabledText}>{unidade.toUpperCase() || 'UN'}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.label}>Tipo de Medicamento *</Text>
            <View style={[ styles.pickerContainer, errors.tipo && styles.errorField ]}>
              <Picker
                selectedValue={tipo}
                style={styles.picker}
                onValueChange={(itemValue) => {
                  setTipo(itemValue);
                  setUnidade(unidadesPorTipo[itemValue] || '');
                  setErrors({...errors, tipo: false});
                }}
                dropdownIconColor="#054F77" 
              >
                <Picker.Item label="Selecione o tipo..." value="" color="#999" />
                {tiposMedicamento.map((tipoItem, index) => (
                  <Picker.Item 
                    key={index} 
                    label={tipoItem} 
                    value={tipoItem.toLowerCase()} 
                  />
                ))}
              </Picker>
            </View>
            
            <Text style={styles.label}>Frequência de Doses *</Text>
            <View style={[ styles.pickerContainer, errors.intervalo_horas && styles.errorField ]}>
              <Picker
                selectedValue={intervalo_horas}
                style={styles.picker}
                onValueChange={(itemValue) => {
                  setIntervaloHoras(itemValue as number);
                  setErrors({...errors, intervalo_horas: false});
                }}
                dropdownIconColor="#054F77"
              >
                <Picker.Item label="Selecione a frequência..." value={null} color="#999" />
                {frequencias.map((freq, index) => (
                  <Picker.Item 
                    key={index} 
                    label={freq.label} 
                    value={freq.value} 
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.rowContainer}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Data de Início *</Text>
                <TouchableOpacity 
                  style={[ styles.dateTimeButton, errors.dataInicio && styles.errorField ]} 
                  onPress={showDatepicker}
                >
                  <Text style={dataInicio ? styles.dateTimeText : styles.dateTimePlaceholderText}>
                    {dataInicio || 'DD/MM/AAAA'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={getDateFromDateString()}
                    mode="date"
                    display="default"
                    onChange={onChangeDate}
                  />
                )}
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>1ª Dose (H) *</Text>
                <TouchableOpacity 
                  style={[ styles.dateTimeButton, errors.horario_inicial && styles.errorField ]} 
                  onPress={showTimepicker}
                >
                    <Text style={horario_inicial ? styles.dateTimeText : styles.dateTimePlaceholderText}>
                      {horario_inicial || 'HH:MM'}
                    </Text>
                </TouchableOpacity>
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
            </View>

            <Text style={styles.label}>Duração do Tratamento (dias) *</Text>
            <View style={[ styles.inputContainer, errors.duracaoTratamento && styles.errorField ]}>
              <TextInput
                ref={duracaoRef}
                style={styles.input}
                value={duracaoTratamento}
                onChangeText={(text) => {
                    setDuracaoTratamento(text);
                    setErrors({...errors, duracaoTratamento: false});
                }} 
                placeholder="Ex: 10"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                returnKeyType="next"
                onSubmitEditing={() => notasRef.current?.focus()}
              />
            </View>

            <Text style={styles.label}>Notas Adicionais (Opcional)</Text>
            <View style={[styles.inputContainer, styles.multilineContainer]}>
              <TextInput
                ref={notasRef}
                style={[styles.input, styles.multilineInput]}
                value={notas}
                onChangeText={(text) => {
                    setNotas(capitalizarPrimeiraLetra(text));
                }}
                placeholder="Observações importantes: tomar com alimento, evitar sol, etc."                  
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                returnKeyType="done"
                blurOnSubmit={true}
              />
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              onPress={handleSalvar}
              style={styles.actionButton} 
            >
              <LinearGradient
                colors={['#FFB74D', '#FF9E44']} 
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.actionButtonText}>Salvar e Voltar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
        
      <TouchableOpacity 
        style={[styles.floatingButton, floatingButtonStyle]}
        onPress={handleAdicionarOutro}
      >
        <LinearGradient
          colors={['#4CAF50', '#2E7D32']} 
          style={styles.floatingButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.floatingButtonText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#0A7AB8', '#054F77']}
              style={styles.modalContent}
            >
              <Text style={styles.modalText}>{modalMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleModalOK}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const { height } = Dimensions.get('window');
const isSmallDevice = height < 700;

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  keyboardAvoidingView: { 
    flex: 1 
  },
  scrollContainer: { 
    padding: isSmallDevice ? 12 : 15,
    paddingTop: isSmallDevice ? 8 : 10,
    paddingBottom: isSmallDevice ? 100 : 120
  },
  subtitle: { 
    fontSize: isSmallDevice ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: isSmallDevice ? 15 : 20,
    paddingHorizontal: 20,
    fontStyle: 'italic',
    lineHeight: isSmallDevice ? 20 : 24
  },
  formContainer: { 
    backgroundColor: 'white',
    borderRadius: 15,
    padding: isSmallDevice ? 15 : 20,
    marginBottom: isSmallDevice ? 15 : 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  label: { 
    fontSize: isSmallDevice ? 13 : 14,
    color: '#054F77',
    marginTop: isSmallDevice ? 8 : 12,
    marginBottom: isSmallDevice ? 4 : 6,
    fontWeight: '700'
  },
  inputContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: isSmallDevice ? 8 : 12,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  smallInputContainer: { 
    height: isSmallDevice ? 45 : 50
  },
  disabledInput: { 
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderColor: '#CCC'
  },
  disabledText: { 
    fontSize: isSmallDevice ? 14 : 16,
    color: '#666',
    fontWeight: 'bold'
  },
  input: { 
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: isSmallDevice ? 14 : 16,
    color: '#333',
    height: isSmallDevice ? 45 : 50
  },
  multilineContainer: { 
    alignItems: 'flex-start',
    minHeight: isSmallDevice ? 80 : 100,
    paddingVertical: 10
  },
  multilineInput: { 
    minHeight: isSmallDevice ? 60 : 80,
    textAlignVertical: 'top',
    height: 'auto'
  },
  pickerContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: isSmallDevice ? 8 : 12,
    paddingHorizontal: 15,
    height: isSmallDevice ? 45 : 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  picker: { 
    flex: 1,
    color: '#333',
    height: isSmallDevice ? 45 : 55,
    paddingVertical: 0,
    fontSize: isSmallDevice ? 14 : 16
  },
  dateTimeButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: isSmallDevice ? 8 : 12,
    height: isSmallDevice ? 45 : 50,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  dateTimeText: { 
    fontSize: isSmallDevice ? 14 : 16,
    color: '#333',
    fontWeight: '600'
  },
  dateTimePlaceholderText: { 
    fontSize: isSmallDevice ? 14 : 16,
    color: '#999',
    fontWeight: '500'
  },
  rowContainer: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0
  },
  halfInput: { 
    width: '48%'
  },
  buttonRow: { 
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: isSmallDevice ? 15 : 25,
    paddingBottom: isSmallDevice ? 15 : 20
  },
  actionButton: { 
    width: '100%',
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  buttonGradient: { 
    borderRadius: 12,
    padding: isSmallDevice ? 14 : 16,
    alignItems: 'center'
  },
  actionButtonText: { 
    color: 'white',
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  floatingButton: { 
    position: 'absolute',
    right: 20,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6
  },
  floatingButtonGradient: { 
    width: isSmallDevice ? 50 : 55,
    height: isSmallDevice ? 50 : 55,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  floatingButtonText: { 
    color: 'white',
    fontSize: isSmallDevice ? 28 : 30,
    fontWeight: 'bold',
    lineHeight: Platform.OS === 'ios' ? (isSmallDevice ? 35 : 38) : (isSmallDevice ? 32 : 34)
  },
  modalOverlay: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)'
  },
  modalContainer: { 
    width: isSmallDevice ? '85%' : '80%',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 15
  },
  modalContent: { 
    padding: isSmallDevice ? 20 : 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)'
  },
  modalText: { 
    fontSize: isSmallDevice ? 14 : 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: isSmallDevice ? 15 : 20,
    fontWeight: '600',
    lineHeight: isSmallDevice ? 20 : 24
  },
  modalButton: { 
    backgroundColor: '#FF9E44',
    borderRadius: 30,
    paddingVertical: isSmallDevice ? 10 : 12,
    paddingHorizontal: isSmallDevice ? 30 : 35,
    elevation: 3
  },
  modalButtonText: { 
    color: 'white',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '700'
  },
  errorField: { 
    borderWidth: 2,
    borderColor: '#FF5252',
    backgroundColor: '#FFF5F5'
  },
});

export default CadastroMedicamento;