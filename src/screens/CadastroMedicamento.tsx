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
  Image,
  ActivityIndicator,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { insertMedicamento as insertMedicamentoDB, Medicamento, insertDoseTomada } from '../database/database';
import NativeAlarmService from '../services/NativeAlarmService';
import { useModal } from '../components/ModalContext';
import ScreenContainer from '../components/ScreenContainer';
import { registrarCadastroEVerificarReview } from '../services/inAppReviewService';
import { tirarFotoMedicamento, escolherFotoDaGaleria, deletarFotoMedicamento } from '../services/fotoMedicamentoService';

type ModoCadastro = 'alarme' | 'registro';

type ErrorState = {
  nome: boolean;
  dosagem: boolean;
  tipo: boolean;
  intervalo_horas: boolean;
  duracaoTratamento: boolean;
  horario_inicial: boolean;
  dataInicio: boolean;
  nomePaciente: boolean;
};

const formatarNome = (texto: string): string => {
  if (!texto) return '';
  const preposicoes = new Set(['de','da','do','das','dos','e','em','para','por','com','a','o','as','os']);
  return texto.toLowerCase().split(/\s+/).filter(p => p.length > 0)
    .map((p, i) => (i === 0 || !preposicoes.has(p)) ? p.charAt(0).toUpperCase() + p.slice(1) : p)
    .join(' ');
};

const capitalizarPrimeiraLetra = (texto: string): string => {
  if (!texto || texto.length === 0) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

const registrarDosesPassadasComoTomadas = async (
  medicamentoId: number, dataInicio: string, horarioInicial: string,
  intervaloHoras: number, duracaoDias: number
): Promise<void> => {
  try {
    const [dia, mes, ano] = dataInicio.split('/').map(Number);
    const [hora, minuto]  = horarioInicial.split(':').map(Number);
    const inicio  = new Date(ano, mes - 1, dia, hora, minuto);
    const agora   = new Date();
    const total   = Math.ceil((duracaoDias * 24) / intervaloHoras);
    for (let i = 0; i < total; i++) {
      const t = new Date(inicio.getTime() + i * intervaloHoras * 3600000);
      if (t.getTime() < agora.getTime()) {
        await insertDoseTomada({
          medicamento_id: medicamentoId,
          dose_id: `${medicamentoId}-${t.getTime()}`,
          horario: `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`,
          data: t.toISOString().split('T')[0],
          timestamp: t.toISOString(),
        });
      }
    }
  } catch (error) { console.error('❌ [AUTO-REGISTRO]', error); }
};

const CadastroMedicamento = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const { showModal } = useModal();

  const nomeRef         = useRef<TextInput>(null);
  const nomePacienteRef = useRef<TextInput>(null);
  const dosagemRef      = useRef<TextInput>(null);
  const duracaoRef      = useRef<TextInput>(null);
  const notasRef        = useRef<TextInput>(null);

  const [modo, setModo] = useState<ModoCadastro>('alarme');

  const [nomePaciente, setNomePaciente]           = useState('');
  const [nome, setNome]                           = useState('');
  const [dosagem, setDosagem]                     = useState('');
  const [tipo, setTipo]                           = useState('');
  const [unidade, setUnidade]                     = useState('');
  const [intervalo_horas, setIntervaloHoras]       = useState<number>(0);
  const [duracaoTratamento, setDuracaoTratamento] = useState('');
  const [horario_inicial, setHorarioInicial]      = useState('');
  const [dataInicio, setDataInicio]               = useState('');
  const [showTimePicker, setShowTimePicker]       = useState(false);
  const [showDatePicker, setShowDatePicker]       = useState(false);
  const [notas, setNotas]                         = useState('');
  const [fotoPath, setFotoPath]                   = useState<string | null>(null);
  const [analisandoFoto, setAnalisandoFoto]       = useState(false);

  const [errors, setErrors] = useState<ErrorState>({
    nomePaciente: false, nome: false, dosagem: false, tipo: false,
    intervalo_horas: false, duracaoTratamento: false, horario_inicial: false, dataInicio: false,
  });

  const tiposMedicamento = ['Comprimido','Cápsula','Líquido','Pomada','Injeção','Spray','Gotas','Supositório'];

  const frequencias = [
    { label: 'A cada 2 horas',           value: 2  },
    { label: 'A cada 4 horas',           value: 4  },
    { label: 'A cada 6 horas (4x/dia)',  value: 6  },
    { label: 'A cada 8 horas (3x/dia)',  value: 8  },
    { label: 'A cada 12 horas (2x/dia)', value: 12 },
    { label: 'A cada 24 horas (Diária)', value: 24 },
    { label: 'A cada 48 horas (2 dias)', value: 48 },
    { label: 'A cada 72 horas (3 dias)', value: 72 },
  ];

  const unidadesPorTipo: Record<string, string> = {
    comprimido: 'un', cápsula: 'un', líquido: 'ml',
    pomada: 'g', injeção: 'ml', spray: 'jato', gotas: 'gotas', supositório: 'un',
  };

  const limparFormulario = () => {
    setNomePaciente(''); setNome(''); setDosagem(''); setTipo('');
    setUnidade(''); setIntervaloHoras(0); setDuracaoTratamento('');
    setHorarioInicial(''); setDataInicio(''); setNotas(''); setFotoPath(null);
    setErrors({ nomePaciente:false, nome:false, dosagem:false, tipo:false,
      intervalo_horas:false, duracaoTratamento:false, horario_inicial:false, dataInicio:false });
  };

  const validarESalvar = async () => {
    const newErrors = { ...errors };
    let hasError = false;

    const nomeFormatado         = formatarNome(nome);
    const nomePacienteFormatado = modo === 'alarme' ? formatarNome(nomePaciente) : 'Eu';
    const notasFormatada        = capitalizarPrimeiraLetra(notas);

    setNome(nomeFormatado);
    setNotas(notasFormatada);

    const camposBase = [
      { campo: 'nome',              valor: nomeFormatado.trim() },
      { campo: 'dosagem',           valor: dosagem },
      { campo: 'tipo',              valor: tipo },
      { campo: 'intervalo_horas',   valor: intervalo_horas },
      { campo: 'duracaoTratamento', valor: duracaoTratamento },
    ];

    const camposAlarme = modo === 'alarme' ? [
      { campo: 'nomePaciente',    valor: nomePacienteFormatado.trim() },
      { campo: 'horario_inicial', valor: horario_inicial },
      { campo: 'dataInicio',      valor: dataInicio },
    ] : [];

    [...camposBase, ...camposAlarme].forEach(({ campo, valor }) => {
      const isEmpty = typeof valor === 'string' ? valor.trim().length === 0
        : typeof valor === 'number' ? isNaN(valor) || valor === 0 : valor == null;
      newErrors[campo as keyof ErrorState] = isEmpty;
      if (isEmpty) hasError = true;
    });

    const dosagemNum = parseFloat(dosagem.replace(',', '.'));
    if (isNaN(dosagemNum) || dosagemNum <= 0) { newErrors.dosagem = true; hasError = true; }

    const duracaoNum = parseInt(duracaoTratamento, 10);
    if (isNaN(duracaoNum) || duracaoNum <= 0) { newErrors.duracaoTratamento = true; hasError = true; }

    setErrors(newErrors);

    if (hasError) {
      showModal({ type: 'error', message: 'Preencha todos os campos obrigatórios corretamente.' });
      return false;
    }

    try {
      const duracao_dias = duracaoNum;
      const dosesTotais  = Math.ceil((duracao_dias * 24) / intervalo_horas);
      const horarioFinal = modo === 'alarme' ? horario_inicial : '00:00';
      const dataFinal    = modo === 'alarme' ? dataInicio      : '01/01/2000';

      const medicamento: Omit<Medicamento, 'id'> = {
        nomePaciente: nomePacienteFormatado.trim(),
        nome: nomeFormatado.trim(),
        dosagem: dosagemNum.toString(),
        tipo,
        unidade: unidadesPorTipo[tipo] || 'un',
        duracaoTratamento: duracao_dias,
        horario_inicial: horarioFinal,
        dataInicio: dataFinal,
        intervalo_horas,
        notas: notasFormatada.trim() || '',
        dosesTotais,
        ativo: modo === 'alarme' ? true : false,
        foto_path: fotoPath || null,
        tipo_cadastro: modo === 'alarme' ? 'alarme' : 'registro',
      };

      const medicamentoId = await insertMedicamentoDB(medicamento) as number;

      if (modo === 'alarme') {
        await registrarDosesPassadasComoTomadas(
          medicamentoId, dataInicio, horario_inicial, intervalo_horas, duracao_dias
        );
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
            intervalo_horas,
            notas: notasFormatada.trim() || '',
            dosesTotais,
            ativo: true,
          });
        } catch (alarmError) {
          console.error('❌ Erro ao agendar alarmes:', alarmError);
        }
        showModal({ type: 'success', message: 'Medicamento cadastrado com alarme!' });
      } else {
        showModal({ type: 'success', message: 'Medicamento salvo no histórico com sucesso!' });
      }

      limparFormulario();
      navigation.goBack();
      await registrarCadastroEVerificarReview();
      return true;

    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
      showModal({ type: 'error', message: 'Erro ao salvar medicamento. Tente novamente.' });
      return false;
    }
  };

  const onTimeChange = (_: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const h = selectedTime.getHours().toString().padStart(2, '0');
      const m = selectedTime.getMinutes().toString().padStart(2, '0');
      setHorarioInicial(`${h}:${m}`);
      setErrors(prev => ({ ...prev, horario_inicial: false }));
    }
  };

  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const d = selectedDate.getDate().toString().padStart(2, '0');
      const m = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const y = selectedDate.getFullYear();
      setDataInicio(`${d}/${m}/${y}`);
      setErrors(prev => ({ ...prev, dataInicio: false }));
    }
  };

  const handleTipoChange = (itemValue: string) => {
    setTipo(itemValue);
    setUnidade(unidadesPorTipo[itemValue.toLowerCase()] || 'un');
    setErrors(prev => ({ ...prev, tipo: false }));
  };

  const processarFoto = async (origem: 'camera' | 'galeria') => {
    setAnalisandoFoto(true);
    try {
      const resultado = origem === 'camera'
        ? await tirarFotoMedicamento()
        : await escolherFotoDaGaleria();

      if (resultado.sucesso && resultado.caminho) {
        setFotoPath(resultado.caminho);
        showModal({ type: 'success', message: '📷 Foto adicionada com sucesso!' });
      } else if (resultado.erro && resultado.erro !== 'cancelado') {
        showModal({ type: 'error', message: resultado.erro });
      }
    } finally {
      setAnalisandoFoto(false);
    }
  };

  const handleSelecionarFoto = () => {
    showModal({
      type: 'confirmation',
      title: '📷 Foto do Medicamento',
      message: 'Como deseja adicionar a foto?',
      confirmText: '🖼️ Galeria',
      cancelText: '📷 Câmera',
      onConfirm: () => processarFoto('galeria'),
      onCancel: () => processarFoto('camera'),
    });
  };

  const handleRemoverFoto = async () => {
    if (fotoPath) {
      await deletarFotoMedicamento(fotoPath);
      setFotoPath(null);
    }
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


          {/* ── SELETOR DE MODO ── */}
          <View style={styles.modoContainer}>
            <TouchableOpacity
              style={[styles.modoBtn, modo === 'alarme' && styles.modoBtnAtivo]}
              onPress={() => setModo('alarme')}
              activeOpacity={0.8}
            >
              <Text style={styles.modoBtnIcon}>🔔</Text>
              <Text style={[styles.modoBtnText, modo === 'alarme' && styles.modoBtnTextAtivo]}>
                Com Alarme
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modoBtn, modo === 'registro' && styles.modoBtnAtivoRegistro]}
              onPress={() => setModo('registro')}
              activeOpacity={0.8}
            >
              <Text style={styles.modoBtnIcon}>📋</Text>
              <Text style={[styles.modoBtnText, modo === 'registro' && styles.modoBtnTextAtivo]}>
                Apenas Registro
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modoDescContainer}>
            <Text style={styles.modoDescText}>
              {modo === 'alarme'
                ? '🔔 Cria alarmes para lembrar você de tomar o medicamento.'
                : '📋 Salva no histórico para consulta futura, sem criar alarmes.'}
            </Text>
          </View>

          <View style={styles.formContainer}>

            {/* Nome do Paciente — apenas modo alarme */}
            {modo === 'alarme' && (
              <>
                <Text style={styles.label}>Nome do Paciente *</Text>
                <View style={[styles.inputContainer, errors.nomePaciente && styles.errorField]}>
                  <TextInput
                    ref={nomePacienteRef}
                    style={styles.input}
                    value={nomePaciente}
                    onChangeText={(text) => { setNomePaciente(text); setErrors({ ...errors, nomePaciente: false }); }}
                    onBlur={() => setNomePaciente(formatarNome(nomePaciente))}
                    placeholder="Digite o nome do paciente"
                    placeholderTextColor="#999"
                    returnKeyType="next"
                    onSubmitEditing={() => nomeRef.current?.focus()}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
                {errors.nomePaciente && <Text style={styles.errorText}>⚠ Campo obrigatório</Text>}
              </>
            )}

            {/* Nome do Medicamento */}
            <Text style={styles.label}>Nome do Medicamento *</Text>
            <View style={[styles.inputContainer, errors.nome && styles.errorField]}>
              <TextInput
                ref={nomeRef}
                style={styles.input}
                value={nome}
                onChangeText={(text) => { setNome(text); setErrors({ ...errors, nome: false }); }}
                onBlur={() => setNome(formatarNome(nome))}
                placeholder="Digite o nome do medicamento"
                placeholderTextColor="#999"
                returnKeyType="next"
                onSubmitEditing={() => dosagemRef.current?.focus()}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            {errors.nome && <Text style={styles.errorText}>⚠ Campo obrigatório</Text>}

            {/* Dosagem + Unidade */}
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
                    onChangeText={(text) => { setDosagem(text); setErrors(prev => ({ ...prev, dosagem: false })); }}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>
                {errors.dosagem && <Text style={styles.errorText}>⚠ Inválido</Text>}
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Unidade</Text>
                <View style={[styles.inputContainer, styles.disabledInput]}>
                  <Text style={styles.disabledText}>{unidade || 'un'}</Text>
                </View>
              </View>
            </View>

            {/* Tipo */}
            <Text style={styles.label}>Tipo de Medicamento *</Text>
            <View style={[styles.pickerContainer, errors.tipo && styles.errorField]}>
              <Picker selectedValue={tipo} onValueChange={handleTipoChange}
                style={styles.picker} dropdownIconColor="#054F77">
                <Picker.Item label="Selecione o tipo" value="" />
                {tiposMedicamento.map((t) => (
                  <Picker.Item key={t} label={t} value={t.toLowerCase()} />
                ))}
              </Picker>
            </View>
            {errors.tipo && <Text style={styles.errorText}>⚠ Selecione o tipo</Text>}

            {/* Frequência */}
            <Text style={styles.label}>Frequência *</Text>
            <View style={[styles.pickerContainer, errors.intervalo_horas && styles.errorField]}>
              <Picker selectedValue={intervalo_horas}
                onValueChange={(val) => { setIntervaloHoras(val); setErrors(prev => ({ ...prev, intervalo_horas: false })); }}
                style={styles.picker} dropdownIconColor="#054F77">
                <Picker.Item label="Selecione a frequência" value={0} color="#999" />
                {frequencias.map((f) => (
                  <Picker.Item key={f.value} label={f.label} value={f.value} />
                ))}
              </Picker>
            </View>
            {errors.intervalo_horas && <Text style={styles.errorText}>⚠ Selecione a frequência</Text>}

            {/* Data + Horário — apenas modo alarme */}
            {modo === 'alarme' && (
              <View style={styles.rowContainer}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Data de Início *</Text>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, errors.dataInicio && styles.errorField]}
                    onPress={() => setShowDatePicker(true)}>
                    <Text style={dataInicio ? styles.dateTimeText : styles.dateTimePlaceholderText}>
                      {dataInicio || 'Selecionar'}
                    </Text>
                  </TouchableOpacity>
                  {errors.dataInicio && <Text style={styles.errorText}>⚠ Obrigatório</Text>}
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Horário Inicial *</Text>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, errors.horario_inicial && styles.errorField]}
                    onPress={() => setShowTimePicker(true)}>
                    <Text style={horario_inicial ? styles.dateTimeText : styles.dateTimePlaceholderText}>
                      {horario_inicial || 'Selecionar'}
                    </Text>
                  </TouchableOpacity>
                  {errors.horario_inicial && <Text style={styles.errorText}>⚠ Obrigatório</Text>}
                </View>
              </View>
            )}

            {showTimePicker && (
              <DateTimePicker value={new Date()} mode="time" is24Hour display="default" onChange={onTimeChange} />
            )}
            {showDatePicker && (
              <DateTimePicker value={new Date()} mode="date" display="default" onChange={onDateChange} />
            )}

            {/* Duração */}
            <Text style={styles.label}>Duração do Tratamento (dias) *</Text>
            <View style={[styles.inputContainer, errors.duracaoTratamento && styles.errorField]}>
              <TextInput
                ref={duracaoRef}
                style={styles.input}
                placeholder="Ex: 7"
                placeholderTextColor="#999"
                value={duracaoTratamento}
                onChangeText={(text) => { setDuracaoTratamento(text); setErrors(prev => ({ ...prev, duracaoTratamento: false })); }}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
            {errors.duracaoTratamento && <Text style={styles.errorText}>⚠ Campo obrigatório</Text>}

            {/* Notas */}
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

            {/* ── FOTO DO MEDICAMENTO ── */}
            <Text style={styles.label}>📷 Foto da Embalagem (Opcional)</Text>

            {analisandoFoto ? (
              <View style={styles.fotoAnalisando}>
                <ActivityIndicator size="small" color="#054F77" />
                <Text style={styles.fotoAnalisandoText}>Analisando imagem...</Text>
              </View>
            ) : fotoPath ? (
              <View style={styles.fotoContainer}>
                <Image
                  source={{ uri: `file://${fotoPath}` }}
                  style={styles.fotoPreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.fotoRemoverBtn}
                  onPress={handleRemoverFoto}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fotoRemoverText}>🗑️ Remover foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.fotoBotao}
                onPress={handleSelecionarFoto}
                activeOpacity={0.8}
              >
                <Text style={styles.fotoBotaoIcon}>📷</Text>
                <Text style={styles.fotoBotaoText}>Tirar foto ou escolher da galeria</Text>
              </TouchableOpacity>
            )}

            {/* Botão */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={validarESalvar} activeOpacity={0.85}>
                <LinearGradient
                  colors={modo === 'alarme' ? ['#29B6F6','#0288D1'] : ['#66BB6A','#388E3C']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.actionButtonText}>
                    {modo === 'alarme' ? '💾  Salvar com Alarme' : '📋  Salvar no Histórico'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

// ─── Responsive ──────────────────────────────────────────────────────────────

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallDevice  = screenHeight < 700;
const isTinyDevice   = screenHeight < 650;
const isNarrowDevice = screenWidth < 360;

const scale = (size: number) => {
  if (isTinyDevice)  return size * 0.85;
  if (isSmallDevice) return size * 0.92;
  return size;
};

const spacing = { xs: scale(4), sm: scale(8), md: scale(12), lg: scale(18), xl: scale(24) };
const fontSize = { xs: scale(13), sm: scale(15), md: scale(16), lg: scale(17), xl: scale(19) };
const rStyles  = { input: { height: scale(56) } };

const styles = StyleSheet.create({
  keyboardAvoidingView: { flex: 1 },
  scrollContainer: { flex: 1 },

  modoContainer: {
    flexDirection: 'row', marginHorizontal: spacing.md,
    marginBottom: spacing.xs, gap: spacing.sm, marginTop: spacing.lg,
  },
  modoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: scale(12), borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: 'transparent',
  },
  modoBtnAtivo: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#0288D1' },
  modoBtnAtivoRegistro: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#388E3C' },
  modoBtnIcon: { fontSize: 18 },
  modoBtnText: { fontSize: fontSize.sm, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  modoBtnTextAtivo: { color: '#1A1A2E' },
  modoDescContainer: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: scale(8),
  },
  modoDescText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.95)', textAlign: 'center', lineHeight: 18 },
  formContainer: {
    backgroundColor: 'white', borderRadius: scale(16), padding: spacing.lg,
    marginBottom: spacing.md, elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
  },
  label: {
    fontSize: fontSize.sm, color: '#054F77', marginTop: spacing.sm,
    marginBottom: spacing.xs, fontWeight: '700', lineHeight: scale(22),
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: scale(12), marginBottom: spacing.sm, paddingHorizontal: spacing.md,
    height: rStyles.input.height, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  disabledInput: { backgroundColor: '#F5F5F5', justifyContent: 'center', borderColor: '#CCC' },
  disabledText: { fontSize: fontSize.md, color: '#666', fontWeight: 'bold' },
  input: {
    flex: 1, paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: fontSize.md, color: '#1E293B', height: rStyles.input.height,
  },
  multilineContainer: { alignItems: 'flex-start', minHeight: scale(96), height: 'auto', paddingVertical: spacing.md },
  multilineInput: { minHeight: scale(70), textAlignVertical: 'top', height: 'auto' },
  pickerContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: scale(12), marginBottom: spacing.sm, paddingHorizontal: spacing.md,
    height: rStyles.input.height, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  picker: { flex: 1, color: '#1E293B', height: scale(75), paddingVertical: 0 },
  dateTimeButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    padding: spacing.md, borderRadius: scale(12), marginBottom: spacing.sm,
    height: rStyles.input.height, justifyContent: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, borderWidth: 1, borderColor: '#E0E0E0',
  },
  dateTimeText: { fontSize: fontSize.md, color: '#1E293B', fontWeight: '600' },
  dateTimePlaceholderText: { fontSize: fontSize.md, color: '#999', fontWeight: '500' },
  rowContainer: {
    flexDirection: isNarrowDevice ? 'column' : 'row',
    justifyContent: 'space-between', marginBottom: 0,
  },
  halfInput: { width: isNarrowDevice ? '100%' : '48%', marginBottom: isNarrowDevice ? spacing.sm : 0 },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  actionButton: {
    width: '100%', borderRadius: scale(12), elevation: 5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  buttonGradient: {
    borderRadius: scale(12), paddingVertical: scale(18),
    paddingHorizontal: spacing.lg, alignItems: 'center',
  },
  actionButtonText: { color: 'white', fontSize: fontSize.xl, fontWeight: '800', letterSpacing: 0.5 },
  errorField: { borderWidth: 2, borderColor: '#C0392B', backgroundColor: '#FFF5F5' },
  errorText: {
    fontSize: fontSize.xs, color: '#C0392B', marginTop: -spacing.xs,
    marginBottom: spacing.xs, marginLeft: spacing.xs, lineHeight: 18,
  },

  // ── Foto ──
  fotoBotao: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: scale(16), borderRadius: scale(12),
    borderWidth: 2, borderColor: '#0288D1', borderStyle: 'dashed',
    backgroundColor: 'rgba(2,136,209,0.05)', marginBottom: spacing.md,
  },
  fotoBotaoIcon: { fontSize: 24 },
  fotoBotaoText: { fontSize: fontSize.sm, color: '#0288D1', fontWeight: '700' },
  fotoContainer: { marginBottom: spacing.md },
  fotoPreview: {
    width: '100%', height: scale(180), borderRadius: scale(12),
    backgroundColor: '#F0F0F0',
  },
  fotoRemoverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.sm, paddingVertical: scale(10), borderRadius: scale(8),
    backgroundColor: 'rgba(192,57,43,0.08)',
  },
  fotoRemoverText: { fontSize: fontSize.sm, color: '#C0392B', fontWeight: '700' },
  fotoAnalisando: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: scale(16), borderRadius: scale(12),
    backgroundColor: 'rgba(2,136,209,0.05)', marginBottom: spacing.md,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  fotoAnalisandoText: { fontSize: fontSize.sm, color: '#054F77', fontWeight: '600' },
});

export default CadastroMedicamento;