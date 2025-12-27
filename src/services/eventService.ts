import { DeviceEventEmitter, EmitterSubscription } from 'react-native';

/**
 * Sistema centralizado de eventos para comunicação entre componentes
 * Permite atualizações em tempo real sem acoplamento direto entre partes do aplicativo
 */

// Tipos para garantir segurança nos eventos
type EventMap = {
  'medicamento-excluido': number; // ID do medicamento excluído
  'medicamento-adicionado': undefined; // Sem payload
  'medicamento-editado': number; // ID do medicamento editado
};

/**
 * Emite um evento para notificar o sistema sobre uma ação ocorrida
 * @param eventName - Nome do evento (chave do EventMap)
 * @param payload - Dados associados ao evento (tipo definido no EventMap)
 */
const emitEvent = <T extends keyof EventMap>(
  eventName: T,
  payload?: EventMap[T]
) => {
  DeviceEventEmitter.emit(eventName, payload);
};

/**
 * Registra um listener para receber notificações quando um evento ocorrer
 * @param eventName - Nome do evento a ser ouvido
 * @param callback - Função a ser executada quando o evento for disparado
 * @returns Subscription para gerenciamento do ciclo de vida
 */
const listenToEvent = <T extends keyof EventMap>(
  eventName: T,
  callback: (payload: EventMap[T]) => void
): EmitterSubscription => {
  return DeviceEventEmitter.addListener(eventName, callback);
};

// API Pública ================================================================

/** Notifica sobre exclusão de medicamento com ID específico */
export const emitMedicamentoExcluido = (id: number) => {
  emitEvent('medicamento-excluido', id);
};

/** Registra listener para exclusão de medicamentos */
export const listenMedicamentoExcluido = (
  callback: (id: number) => void
) => {
  return listenToEvent('medicamento-excluido', callback);
};

/** Notifica sobre adição de novo medicamento */
export const emitMedicamentoAdicionado = () => {
  emitEvent('medicamento-adicionado');
};

/** Registra listener para adição de medicamentos */
export const listenMedicamentoAdicionado = (
  callback: () => void
) => {
  return listenToEvent('medicamento-adicionado', callback);
};

/** Notifica sobre edição de medicamento com ID específico */
export const emitMedicamentoEditado = (id: number) => {
  emitEvent('medicamento-editado', id);
};

/** Registra listener para edição de medicamentos */
export const listenMedicamentoEditado = (
  callback: (id: number) => void
) => {
  return listenToEvent('medicamento-editado', callback);
};