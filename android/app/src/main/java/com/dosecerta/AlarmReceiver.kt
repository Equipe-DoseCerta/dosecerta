package com.dosecerta

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log

/**
 * 📡 BROADCAST RECEIVER - RECEBE ALARMES DO ALARMMANAGER
 * 
 * Funciona mesmo quando:
 * ✅ App fechado
 * ✅ Tela desligada
 * ✅ Economia de bateria
 */
class AlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "AlarmReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        Thread {
            val wakeLock = acquireWakeLock(context)
            try {
                Log.d(TAG, "🔔 ========== ALARME RECEBIDO ==========")
                Log.d(TAG, "📱 Context: ${context.javaClass.simpleName}")
                Log.d(TAG, "📦 Action: ${intent.action}")

                // ✅ Android 12+ - verificação de permissão
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                    if (!alarmManager.canScheduleExactAlarms()) {
                        Log.w(TAG, "⚠️ Sem permissão para SCHEDULE_EXACT_ALARM — o alarme pode não tocar!")
                    }
                }

                // Validar dados
                val medicamentoId = intent.getIntExtra("medicamentoId", -1)
                if (medicamentoId == -1) {
                    Log.e(TAG, "❌ ID de medicamento inválido! Abortando...")
                    return@Thread
                }

                // Extrair dados
                val medicamento = intent.getStringExtra("medicamento") ?: "Medicamento"
                val paciente = intent.getStringExtra("paciente") ?: ""
                val dosagem = intent.getStringExtra("dosagem") ?: "Dose"
                val horario = intent.getStringExtra("horario") ?: "Horário"
                val frequencia = intent.getStringExtra("frequencia") ?: ""
                val dataInicio = intent.getStringExtra("dataInicio") ?: ""
                val duracao = intent.getStringExtra("duracao") ?: ""
                val notas = intent.getStringExtra("notas") ?: ""
                val som = intent.getBooleanExtra("som", true)
                val tipoSom = intent.getStringExtra("tipoSom") ?: "1"
                val vibracao = intent.getBooleanExtra("vibracao", true)
                val notificacaoVisual = intent.getBooleanExtra("notificacaoVisual", true)

                Log.d(TAG, "📋 Dados do alarme recebidos com sucesso.")

                // ✅ Android 14+ log de diagnóstico
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    Log.d(TAG, "📱 Android 14+ detectado: iniciando serviço com contexto seguro")
                }

                // ✅ Iniciar serviço foreground
                AlarmService.startAlarmService(
                    context = context,
                    medicamentoId = medicamentoId,
                    medicamento = medicamento,
                    paciente = paciente,
                    dosagem = dosagem,
                    horario = horario,
                    frequencia = frequencia,
                    dataInicio = dataInicio,
                    duracao = duracao,
                    notas = notas,
                    som = som,
                    tipoSom = tipoSom,
                    vibracao = vibracao,
                    notificacaoVisual = notificacaoVisual
                )

                Log.d(TAG, "✅ ========== PROCESSAMENTO COMPLETO ==========")

            } catch (e: Exception) {
                Log.e(TAG, "❌ ERRO CRÍTICO no receiver: ${e.message}", e)
            } finally {
                releaseWakeLock(wakeLock)
                pendingResult.finish()
            }
        }.start()
    }

    /**
     * 🔋 Adquire Wake Lock temporário para garantir execução
     */
    private fun acquireWakeLock(context: Context): PowerManager.WakeLock? {
        return try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            val wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "DoseCerta::AlarmReceiverWakeLock"
            )
            wakeLock.acquire(3 * 60 * 1000L) // 3 min
            Log.d(TAG, "🔋 Wake Lock adquirido (3 min)")
            wakeLock
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao adquirir Wake Lock: ${e.message}", e)
            null
        }
    }

    /**
     * 🔓 Libera Wake Lock
     */
    private fun releaseWakeLock(wakeLock: PowerManager.WakeLock?) {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.d(TAG, "🔓 Wake Lock liberado")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao liberar Wake Lock: ${e.message}", e)
        }
    }
}
