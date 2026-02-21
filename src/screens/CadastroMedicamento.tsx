import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { insertMedicamento as insertMedicamentoDB, Medicamento, insertDoseTomada } from '../database/database';
import NativeAlarmService from '../services/NativeAlarmService';
import { useModal } from '../components/ModalContext';
import ScreenContainer from '../components/ScreenContainer';

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

// --- Funções de Capitalização ---

const formatarNome = (texto: string): string => {
  if (!texto) return '';

  const preposicoes = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'com', 'a', 'o', 'as', 'os']);

  return texto
    .toLowerCase()
    .split(' ')
    .map((palavra, index) => {
      if (!palavra) return '';

      if (index === 0) {
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      }

      if (preposicoes.has(palavra)) {
        return palavra;
      }

      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
};

const capitalizarPrimeiraLetra = (texto: string): string => {
  if (!texto || texto.length === 0) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

// 🆕 NOVA FUNÇÃO: Registra automaticamente doses passadas como "Tomadas"
const registrarDosesPassadasComoTomadas = async (
  medicamentoId: number,
  dataInicio: string,
  horarioInicial: string,
  intervaloHoras: number,
  duracaoDias: number
): Promise<void> => {
  try {
    console.log('🔄 [AUTO-REGISTRO] Iniciando registro automático de doses passadas...');

    const [dia, mes, ano] = dataInicio.split('/').map(Number);
    const [hora, minuto] = horarioInicial.split(':').map(Number);
    const inicioTratamento = new Date(ano, mes - 1, dia, hora, minuto);
    const agora = new Date();

    const totalHorasTratamento = duracaoDias * 24;
    const totalDoses = Math.ceil(totalHorasTratamento / intervaloHoras);

    let dosesRegistradas = 0;

    for (let i = 0; i < totalDoses; i++) {
      const doseTime = new Date(inicioTratamento.getTime() + i * intervaloHoras * 60 * 60 * 1000);

      // ✅ Se a dose é no passado, registra como "Tomada"
      if (doseTime.getTime() < agora.getTime()) {
        const doseId = `${medicamentoId}-${doseTime.getTime()}`;
        const horario = `${doseTime.getHours().toString().padStart(2, '0')}:${doseTime.getMinutes().toString().padStart(2, '0')}`;
        const dataStr = doseTime.toISOString().split('T')[0];

        await insertDoseTomada({
          medicamento_id: medicamentoId,
          dose_id: doseId,
          horario: horario,
          data: dataStr,
          timestamp: doseTime.toISOString()
        });
        dosesRegistradas++;

        console.log(`✅ [AUTO-REGISTRO] Dose ${doseId} registrada como TOMADA (${horario} - ${dataStr})`);
      }
    }

    console.log(`🎉 [AUTO-REGISTRO] Total de ${dosesRegistradas} doses passadas registradas automaticamente!`);
  } catch (error) {
    console.error('❌ [AUTO-REGISTRO] Erro ao registrar doses passadas:', error);
    // Não bloqueia o cadastro se houver erro no auto-registro
  }
};

// --------------------------------------------------------------------------------

const CadastroMedicamento = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const { showModal } = useModal();

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
  const [intervalo_horas, setIntervaloHoras] = useState<number | undefined>(undefined);
  const [duracaoTratamento, setDuracaoTratamento] = useState('');
  const [horario_inicial, setHorarioInicial] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notas, setNotas] = useState('');

  const [errors, setErrors] = useState<ErrorState>({
    nomePaciente: false, nome: false, dosagem: false, tipo: false, intervalo_horas: false,
    duracaoTratamento: false, horario_inicial: false, dataInicio: false,
  });

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
    setNomePaciente(''); setNome(''); setDosagem(''); setTipo(''); setUnidade(''); setIntervaloHoras(undefined);
    setDuracaoTratamento(''); setHorarioInicial(''); setDataInicio(''); setNotas('');
    setErrors({
      nomePaciente: false, nome: false, dosagem: false, tipo: false, intervalo_horas: false,
      duracaoTratamento: false, horario_inicial: false, dataInicio: false,
    });
  };

  const validarESalvar = async () => {
    let hasError = false;
    const newErrors = { ...errors };

    const nomePacienteFormatado = formatarNome(nomePaciente);
    const nomeFormatado = formatarNome(nome);
    const notasFormatada = capitalizarPrimeiraLetra(notas);

    setNomePaciente(nomePacienteFormatado);
    setNome(nomeFormatado);
    setNotas(notasFormatada);

    const camposObrigatorios = [
      { campo: 'nomePaciente', valor: nomePacienteFormatado.trim() },
      { campo: 'nome', valor: nomeFormatado.trim() },
      { campo: 'dosagem', valor: dosagem },
      { campo: 'tipo', valor: tipo },
      { campo: 'intervalo_horas', valor: intervalo_horas },
      { campo: 'duracaoTratamento', valor: duracaoTratamento },
      { campo: 'horario_inicial', valor: horario_inicial },
      { campo: 'dataInicio', valor: dataInicio },
    ];

    camposObrigatorios.forEach(({ campo, valor }) => {
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
      showModal({
        type: 'error',
        message: 'Preencha todos os campos obrigatórios corretamente antes de continuar.'
      });
      return false;
    }

    try {
      const duracao_dias = duracaoNum;
      const dosesTotais = Math.ceil((duracao_dias * 24) / intervalo_horas!);

      const medicamento: Omit<Medicamento, 'id'> = {
        nomePaciente: nomePacienteFormatado.trim(),
        nome: nomeFormatado.trim(),
        dosagem: dosagemNum.toString(),
        tipo,
        unidade: unidadesPorTipo[tipo] || 'un',
        duracaoTratamento: duracao_dias,
        horario_inicial,
        dataInicio,
        intervalo_horas: intervalo_horas!,
        notas: notasFormatada.trim() || '',
        dosesTotais,
        ativo: true
      };

      const medicamentoId = await insertMedicamentoDB(medicamento) as number;
      console.log('✅ Medicamento salvo no banco, ID:', medicamentoId);

      // 🆕 AUTO-REGISTRO: Registra doses passadas como "Tomadas"
      await registrarDosesPassadasComoTomadas(
        medicamentoId,
        dataInicio,
        horario_inicial,
        intervalo_horas!,
        duracao_dias
      );

      // 🔔 Agenda TODOS os alarmes do medicamento
      try {
        await NativeAlarmService.agendarTodosAlarmes({
          id: medicamentoId,
          nomePaciente: nomePacienteFormatado.trim(),
          nome: nomeFormatado.trim(),
          dosagem: dosagemNum.toString(),
          tipo,
          unidade: unidadesPorTipo[tipo] || 'un',
          duracaoTratamento: duracao_dias,
          horario_inicial,
          dataInicio,
          intervalo_horas: intervalo_horas!,
          notas: notasFormatada.trim() || '',
          dosesTotais,
          ativo: true
        });
        console.log('✅ TODOS os alarmes agendados com sucesso para o medicamento ID:', medicamentoId);
      } catch (alarmError) {
        console.error('❌ Erro ao agendar alarmes:', alarmError);
      }

      showModal({
        type: 'success',
        message: 'Medicamento cadastrado com sucesso!'
      });

      limparFormulario();
      navigation.goBack();
      return true;
    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
      showModal({
        type: 'error',
        message: 'Erro ao salvar medicamento. Tente novamente.'
      });
      return false;
    }
  };

  const onTimeChange = (_: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setHorarioInicial(`${hours}:${minutes}`);
      setErrors(prev => ({ ...prev, horario_inicial: false }));
    }
  };

  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      setDataInicio(`${day}/${month}/${year}`);
      setErrors(prev => ({ ...prev, dataInicio: false }));
    }
  };

  const handleTipoChange = (itemValue: string) => {
    setTipo(itemValue);
    setUnidade(unidadesPorTipo[itemValue.toLowerCase()] || 'un');
    setErrors(prev => ({ ...prev, tipo: false }));
  };

  const handleIntervaloChange = (itemValue: number) => {
    setIntervaloHoras(itemValue);
    setErrors(prev => ({ ...prev, intervalo_horas: false }));
  };

  return (
    <ScreenContainer showGradient={true}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContainer}
          contentContainerStyle={{ paddingBottom: scale(40) }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Preencha os dados abaixo para cadastrar um novo medicamento
          </Text>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Nome do Paciente *</Text>
            <View style={[styles.inputContainer, errors.nomePaciente && styles.errorField]}>
              <TextInput
                ref={nomePacienteRef}
                style={styles.input}
                placeholder="Digite o nome do paciente"
                placeholderTextColor="#999"
                value={nomePaciente}
                onChangeText={(text) => {
                  setNomePaciente(text);
                  setErrors(prev => ({ ...prev, nomePaciente: false }));
                }}
                returnKeyType="next"
                onSubmitEditing={() => nomeRef.current?.focus()}
              />
            </View>

            <Text style={styles.label}>Nome do Medicamento *</Text>
            <View style={[styles.inputContainer, errors.nome && styles.errorField]}>
              <TextInput
                ref={nomeRef}
                style={styles.input}
                placeholder="Ex: Paracetamol"
                placeholderTextColor="#999"
                value={nome}
                onChangeText={(text) => {
                  setNome(text);
                  setErrors(prev => ({ ...prev, nome: false }));
                }}
                returnKeyType="next"
                onSubmitEditing={() => dosagemRef.current?.focus()}
              />
            </View>

            <View style={styles.rowContainer}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Dosagem *</Text>
                <View style={[styles.inputContainer, errors.dosagem && styles.errorField]}>
                  <TextInput
                    ref={dosagemRef}
                    style={styles.input}
                    placeholder="Ex: 1"
                    placeholderTextColor="#999"
                    value={dosagem}
                    onChangeText={(text) => {
                      setDosagem(text);
                      setErrors(prev => ({ ...prev, dosagem: false }));
                    }}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>Unidade *</Text>
                <View style={[styles.inputContainer, styles.disabledInput]}>
                  <Text style={styles.disabledText}>
                    {unidade || 'un'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.label}>Tipo de Medicamento *</Text>
            <View style={[styles.pickerContainer, errors.tipo && styles.errorField]}>
              <Picker
                selectedValue={tipo}
                onValueChange={handleTipoChange}
                style={styles.picker}
                dropdownIconColor="#054F77"
              >
                <Picker.Item label="Selecione o tipo" value="" />
                {tiposMedicamento.map((tipoMed) => (
                  <Picker.Item key={tipoMed} label={tipoMed} value={tipoMed.toLowerCase()} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Frequência *</Text>
            <View style={[styles.pickerContainer, errors.intervalo_horas && styles.errorField]}>
              <Picker
                selectedValue={intervalo_horas}
                onValueChange={handleIntervaloChange}
                style={styles.picker}
                dropdownIconColor="#054F77"
              >
                <Picker.Item label="Selecione a frequência" value={undefined} />
                {frequencias.map((freq) => (
                  <Picker.Item key={freq.value} label={freq.label} value={freq.value} />
                ))}
              </Picker>
            </View>

            <View style={styles.rowContainer}>


              <View style={styles.halfInput}>
                <Text style={styles.label}>Data de Início *</Text>
                <TouchableOpacity
                  style={[styles.dateTimeButton, errors.dataInicio && styles.errorField]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={dataInicio ? styles.dateTimeText : styles.dateTimePlaceholderText}>
                    {dataInicio || 'Selecionar'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Horário Inicial *</Text>
                <TouchableOpacity
                  style={[styles.dateTimeButton, errors.horario_inicial && styles.errorField]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={horario_inicial ? styles.dateTimeText : styles.dateTimePlaceholderText}>
                    {horario_inicial || 'Selecionar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onTimeChange}
              />
            )}

            {showDatePicker && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            <Text style={styles.label}>Duração do Tratamento (dias) *</Text>
            <View style={[styles.inputContainer, errors.duracaoTratamento && styles.errorField]}>
              <TextInput
                ref={duracaoRef}
                style={styles.input}
                placeholder="Ex: 7"
                placeholderTextColor="#999"
                value={duracaoTratamento}
                onChangeText={(text) => {
                  setDuracaoTratamento(text);
                  setErrors(prev => ({ ...prev, duracaoTratamento: false }));
                }}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>

            <Text style={styles.label}>Notas Adicionais (Opcional)</Text>
            <View style={[styles.inputContainer, styles.multilineContainer]}>
              <TextInput
                ref={notasRef}
                style={[styles.input, styles.multilineInput]}
                placeholder="Ex: Tomar após as refeições"
                placeholderTextColor="#999"
                value={notas}
                onChangeText={setNotas}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={validarESalvar}>
                <LinearGradient
                  colors={['#29B6F6', '#0288D1']} // Azul céu → Azul oceano
                  //colors={['#FF8C42', '#FF6B35']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.actionButtonText}>💾 Salvar e Voltar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

// --------------------------------------------------------------------------------
// 🔥 RESPONSIVE DESIGN
// --------------------------------------------------------------------------------

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const isSmallDevice = screenHeight < 700;
const isTinyDevice = screenHeight < 650;
const isNarrowDevice = screenWidth < 360;

const scale = (size: number) => {
  if (isTinyDevice) return size * 0.85;
  if (isSmallDevice) return size * 0.92;
  return size;
};

const spacing = {
  xs: scale(4),
  sm: scale(6),
  md: scale(10),
  lg: scale(16),
  xl: scale(20),
};

const fontSize = {
  xs: scale(12),
  sm: scale(13),
  md: scale(14),
  lg: scale(16),
  xl: scale(18),
  xxl: scale(20),
};

const rStyles = {
  input: {
    height: scale(48),
  }
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1
  },
  scrollContainer: {
    flex: 1,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    fontStyle: 'italic',
    lineHeight: scale(22)
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: scale(15),
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  label: {
    fontSize: fontSize.sm,
    color: '#054F77',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontWeight: '700'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: scale(12),
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: rStyles.input.height,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderColor: '#CCC'
  },
  disabledText: {
    fontSize: fontSize.md,
    color: '#666',
    fontWeight: 'bold'
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: fontSize.md,
    color: '#333',
    height: rStyles.input.height
  },
  multilineContainer: {
    alignItems: 'flex-start',
    minHeight: scale(90),
    height: 'auto',
    paddingVertical: spacing.md
  },
  multilineInput: {
    minHeight: scale(70),
    textAlignVertical: 'top',
    height: 'auto'
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: scale(12),
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: rStyles.input.height,
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
    height: scale(75),
    paddingVertical: 0,
    fontSize: fontSize.md
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: spacing.md,
    borderRadius: scale(12),
    marginBottom: spacing.sm,
    height: rStyles.input.height,
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
    fontSize: fontSize.md,
    color: '#333',
    fontWeight: '600'
  },
  dateTimePlaceholderText: {
    fontSize: fontSize.md,
    color: '#999',
    fontWeight: '500'
  },
  rowContainer: {
    flexDirection: isNarrowDevice ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: 0
  },
  halfInput: {
    width: isNarrowDevice ? '100%' : '48%',
    marginBottom: isNarrowDevice ? spacing.sm : 0
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingBottom: 0
  },
  actionButton: {
    width: '100%',
    borderRadius: scale(12),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  buttonGradient: {
    borderRadius: scale(12),
    padding: spacing.lg,
    alignItems: 'center'
  },
  actionButtonText: {
    color: 'white',
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  errorField: {
    borderWidth: 2,
    borderColor: '#FF5252',
    backgroundColor: '#FFF5F5'
  },
});

export default CadastroMedicamento;