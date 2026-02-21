package com.dosecerta

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

class AlarmService : Service() {

    companion object {
        private const val TAG = "AlarmService"
        private const val CHANNEL_ID = "ALARM_CRITICAL_CHANNEL"
        private const val NOTIFICATION_ID = 99999

        @Volatile
        private var isServiceRunning = false

        fun startAlarmService(
            context: Context,
            medicamentoId: Int,
            medicamento: String,
            paciente: String,
            dosagem: String,
            horario: String,
            frequencia: String,
            dataInicio: String,
            duracao: String,
            notas: String,
            som: Boolean,
            tipoSom: String,
            vibracao: Boolean,
            notificacaoVisual: Boolean
        ) {
            Log.d(TAG, "🎬 startAlarmService() chamado - ID: $medicamentoId")

            val intent = Intent(context, AlarmService::class.java).apply {
                action = "START_ALARM"
                putExtra("medicamentoId", medicamentoId)
                putExtra("medicamento", medicamento)
                putExtra("paciente", paciente)
                putExtra("dosagem", dosagem)
                putExtra("horario", horario)
                putExtra("frequencia", frequencia)
                putExtra("dataInicio", dataInicio)
                putExtra("duracao", duracao)
                putExtra("notas", notas)
                putExtra("som", som)
                putExtra("tipoSom", tipoSom)
                putExtra("vibracao", vibracao)
                putExtra("notificacaoVisual", notificacaoVisual)
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                    Log.d(TAG, "✅ startForegroundService() executado (Android 8+)")
                } else {
                    context.startService(intent)
                    Log.d(TAG, "✅ startService() executado (Android < 8)")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ ERRO CRÍTICO ao iniciar serviço: ${e.message}", e)
            }
        }

        fun stopAlarmService(context: Context) {
            Log.d(TAG, "🛑 stopAlarmService() chamado")
            try {
                val intent = Intent(context, AlarmService::class.java)
                context.stopService(intent)
                isServiceRunning = false
            } catch (e: Exception) {
                Log.e(TAG, "❌ Erro ao parar serviço: ${e.message}", e)
            }
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var notificationManager: NotificationManager? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "🔧 onCreate() - Serviço sendo criado")

        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
        acquireWakeLock()

        isServiceRunning = true
        Log.d(TAG, "✅ Serviço criado com sucesso")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "🚀 onStartCommand() - flags: $flags, startId: $startId")

        if (intent == null) {
            Log.e(TAG, "❌ Intent é NULL! Mantendo serviço vivo...")
            startForegroundWithDummyNotification()
            return START_STICKY
        }

        val action = intent.action
        Log.d(TAG, "📋 Action recebida: $action")

        if (action == "START_ALARM") {
            handleAlarmStart(intent)
        } else {
            Log.w(TAG, "⚠️ Action desconhecida ou nula")
            startForegroundWithDummyNotification()
        }

        return START_STICKY
    }

    /**
     * 🎯 Processa o início do alarme
     */
    private fun handleAlarmStart(intent: Intent) {
        try {
            val medicamentoId = intent.getIntExtra("medicamentoId", -1)
            val medicamento = intent.getStringExtra("medicamento") ?: "Medicamento"
            val horario = intent.getStringExtra("horario") ?: "Horário"

            Log.d(TAG, "📋 Dados do alarme: ID=$medicamentoId, Med=$medicamento, Horário=$horario")

            // 🚨 CRÍTICO: Verificar permissão de Full-Screen Intent no Android 14+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val canUseFullScreenIntent = notificationManager?.canUseFullScreenIntent() ?: false
                Log.d(TAG, "🔐 Permissão Full-Screen Intent: $canUseFullScreenIntent")
                
                if (!canUseFullScreenIntent) {
                    Log.e(TAG, "❌ SEM PERMISSÃO PARA FULL-SCREEN INTENT!")
                    Log.e(TAG, "🔧 Solução: Abrir AlarmActivity diretamente")
                    
                    // ✅ FALLBACK: Abrir Activity diretamente (funciona mesmo sem permissão)
                    openAlarmActivityDirectly(intent)
                    
                    // Ainda assim criar notificação para manter o serviço
                    val notification = createFullScreenNotification(intent)
                    startForeground(NOTIFICATION_ID, notification)
                    return
                }
            }

            // ✅ Criar notificação com Full-Screen Intent
            val notification = createFullScreenNotification(intent)
            startForeground(NOTIFICATION_ID, notification)
            
            // 🔥 ADICIONAL: Abrir Activity diretamente como backup
            Log.d(TAG, "🔥 Abrindo AlarmActivity diretamente como backup...")
            openAlarmActivityDirectly(intent)
            
            Log.d(TAG, "✅ Foreground Service ATIVO com Full-Screen Notification ID $NOTIFICATION_ID")

        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao processar alarme: ${e.message}", e)
            startForegroundWithDummyNotification()
        }
    }

    /**
     * 🔥 NOVO: Abre AlarmActivity diretamente (funciona mesmo sem permissão)
     */
    private fun openAlarmActivityDirectly(serviceIntent: Intent) {
        try {
            Log.d(TAG, "🚀 Abrindo AlarmActivity diretamente...")
            
            val activityIntent = Intent(this, AlarmActivity::class.java).apply {
                // 🚨 FLAGS CRÍTICOS para abrir do background
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_NO_HISTORY or
                        Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
                
                // Copiar TODOS os dados
                putExtra("medicamentoId", serviceIntent.getIntExtra("medicamentoId", -1))
                putExtra("medicamento", serviceIntent.getStringExtra("medicamento"))
                putExtra("paciente", serviceIntent.getStringExtra("paciente"))
                putExtra("dosagem", serviceIntent.getStringExtra("dosagem"))
                putExtra("horario", serviceIntent.getStringExtra("horario"))
                putExtra("frequencia", serviceIntent.getStringExtra("frequencia"))
                putExtra("dataInicio", serviceIntent.getStringExtra("dataInicio"))
                putExtra("duracao", serviceIntent.getStringExtra("duracao"))
                putExtra("notas", serviceIntent.getStringExtra("notas"))
                putExtra("som", serviceIntent.getBooleanExtra("som", true))
                putExtra("tipoSom", serviceIntent.getStringExtra("tipoSom"))
                putExtra("vibracao", serviceIntent.getBooleanExtra("vibracao", true))
                putExtra("notificacaoVisual", serviceIntent.getBooleanExtra("notificacaoVisual", true))
            }
            
            startActivity(activityIntent)
            Log.d(TAG, "✅ AlarmActivity aberta diretamente com sucesso!")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao abrir AlarmActivity diretamente: ${e.message}", e)
            e.printStackTrace()
        }
    }

    /**
     * 🚨 Cria notificação com Full-Screen Intent
     */
    private fun createFullScreenNotification(serviceIntent: Intent): Notification {
        Log.d(TAG, "🔔 Criando Full-Screen Notification...")

        // Extrair TODOS os dados
        val medicamentoId = serviceIntent.getIntExtra("medicamentoId", -1)
        val medicamento = serviceIntent.getStringExtra("medicamento") ?: "Medicamento"
        val paciente = serviceIntent.getStringExtra("paciente") ?: ""
        val dosagem = serviceIntent.getStringExtra("dosagem") ?: "Dose"
        val horario = serviceIntent.getStringExtra("horario") ?: "Horário"
        val frequencia = serviceIntent.getStringExtra("frequencia") ?: ""
        val dataInicio = serviceIntent.getStringExtra("dataInicio") ?: ""
        val duracao = serviceIntent.getStringExtra("duracao") ?: ""
        val notas = serviceIntent.getStringExtra("notas") ?: ""
        val som = serviceIntent.getBooleanExtra("som", true)
        val tipoSom = serviceIntent.getStringExtra("tipoSom") ?: "1"
        val vibracao = serviceIntent.getBooleanExtra("vibracao", true)
        val notificacaoVisual = serviceIntent.getBooleanExtra("notificacaoVisual", true)

        // ✅ Intent para AlarmActivity
        val fullScreenIntent = Intent(this, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("medicamentoId", medicamentoId)
            putExtra("medicamento", medicamento)
            putExtra("paciente", paciente)
            putExtra("dosagem", dosagem)
            putExtra("horario", horario)
            putExtra("frequencia", frequencia)
            putExtra("dataInicio", dataInicio)
            putExtra("duracao", duracao)
            putExtra("notas", notas)
            putExtra("som", som)
            putExtra("tipoSom", tipoSom)
            putExtra("vibracao", vibracao)
            putExtra("notificacaoVisual", notificacaoVisual)
        }

        // 🚨 CRÍTICO: PendingIntent com FLAG_IMMUTABLE
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            medicamentoId,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // ✅ Criar notificação
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🚨 HORA DO MEDICAMENTO")
            .setContentText("$medicamento - $horario")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setSound(null)
            .setFullScreenIntent(fullScreenPendingIntent, true) // 🚨 CRUCIAL!
            .setContentIntent(fullScreenPendingIntent) // 📱 Permite abrir ao tocar
            .build()
            .also {
                Log.d(TAG, "✅ Full-Screen Notification criada!")
            }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "🚨 Alarmes Críticos de Medicamentos",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alarmes que devem tocar mesmo com app fechado"
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            notificationManager?.createNotificationChannel(channel)
            Log.d(TAG, "📢 Canal de notificação criado: $CHANNEL_ID")
        }
    }

    private fun startForegroundWithDummyNotification() {
        try {
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("⏰ Alarme Ativo")
                .setContentText("Aguardando...")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()
                
            startForeground(NOTIFICATION_ID, notification)
            Log.d(TAG, "🆘 Foreground iniciado com notificação dummy")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao iniciar Foreground dummy: ${e.message}", e)
        }
    }

    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "DoseCerta::AlarmServiceWakeLock"
            )
            wakeLock?.acquire(15 * 60 * 1000L)
            Log.d(TAG, "🔋 Wake Lock PARCIAL adquirido (15 min)")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao adquirir Wake Lock: ${e.message}", e)
        }
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let {
                if (it.isHeld) it.release()
            }
            wakeLock = null
            Log.d(TAG, "🔓 Wake Lock liberado")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao liberar Wake Lock: ${e.message}", e)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "💀 onDestroy() - Serviço sendo destruído")

        releaseWakeLock()
        isServiceRunning = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }

        Log.d(TAG, "🛑 Serviço destruído completamente")
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(TAG, "📱 App removido da lista de recentes - serviço continua ativo")
    }
}