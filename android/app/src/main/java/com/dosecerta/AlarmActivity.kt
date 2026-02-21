package com.dosecerta

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.view.animation.AnimationUtils
import android.widget.Button
import android.widget.TextView
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView

class AlarmActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "AlarmActivity"
    }

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var audioManager: AudioManager? = null
    private var wakeLock: PowerManager.WakeLock? = null
    
    private lateinit var cardContainer: CardView
    private lateinit var txtMedicamento: TextView
    private lateinit var txtPaciente: TextView
    private lateinit var txtDosagem: TextView
    private lateinit var txtHorario: TextView
    private lateinit var txtFrequencia: TextView
    private lateinit var txtDataInicio: TextView
    private lateinit var txtDuracao: TextView
    private lateinit var txtNotas: TextView
    private lateinit var detailsContainer: LinearLayout
    private lateinit var btnDesligar: Button
    private lateinit var btnLembrar: Button

    private var temSom: Boolean = true
    private var tipoSom: String = "1"
    private var temVibracao: Boolean = true
    private var temNotificacaoVisual: Boolean = true
    
    private var medicamentoId: Int = -1
    private var medicamento: String = ""
    private var paciente: String = ""
    private var dosagem: String = ""
    private var horario: String = ""
    private var frequencia: String = ""
    private var dataInicio: String = ""
    private var duracao: String = ""
    private var notas: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 🚨 LOG CRÍTICO PRIMEIRO
        Log.d(TAG, "🚀 ========== ALARM ACTIVITY INICIADA ==========")
        Log.d(TAG, "📱 Build.VERSION.SDK_INT: ${Build.VERSION.SDK_INT}")
        Log.d(TAG, "📱 App State: ${if (isAppInForeground()) "FOREGROUND" else "BACKGROUND/CLOSED"}")
        
        try {
            Log.d(TAG, "1️⃣ Chamando setupCriticalWindowFlags()...")
            setupCriticalWindowFlags()
            
            Log.d(TAG, "2️⃣ Chamando acquireAllWakeLocks()...")
            acquireAllWakeLocks()
            
            Log.d(TAG, "3️⃣ Chamando setContentView()...")
            setContentView(R.layout.activity_alarm)
            
            Log.d(TAG, "4️⃣ Chamando initializeViews()...")
            initializeViews()
            
            Log.d(TAG, "5️⃣ Chamando retrieveIntentData()...")
            retrieveIntentData()
            
            Log.d(TAG, "6️⃣ Chamando populateUI()...")
            populateUI()
            
            Log.d(TAG, "7️⃣ Chamando startAlarmEffects()...")
            startAlarmEffects()
            
            Log.d(TAG, "8️⃣ Chamando setupButtons()...")
            setupButtons()
            
            Log.d(TAG, "✅ ========== ACTIVITY TOTALMENTE CONFIGURADA ==========")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO CRÍTICO no onCreate(): ${e.message}", e)
            e.printStackTrace()
        }
    }

    private fun setupCriticalWindowFlags() {
        Log.d(TAG, "🔐 Configurando window flags...")
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true)
                setTurnScreenOn(true)
                
                val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
                keyguardManager.requestDismissKeyguard(this, null)
                
                Log.d(TAG, "✅ Flags modernas aplicadas (API 27+)")
            } else {
                @Suppress("DEPRECATION")
                window.addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                )
                Log.d(TAG, "✅ Flags legadas aplicadas (API < 27)")
            }
            
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            window.addFlags(WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON)
            
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
            
            Log.d(TAG, "✅ Window flags configuradas com sucesso")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao configurar window flags: ${e.message}", e)
        }
    }

    private fun acquireAllWakeLocks() {
        Log.d(TAG, "🔋 Adquirindo Wake Locks...")
        
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            
            wakeLock = powerManager.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "DoseCerta::AlarmFullWakeLock"
            )
            
            wakeLock?.acquire(15 * 60 * 1000L)
            Log.d(TAG, "✅ Wake Lock SCREEN_BRIGHT adquirido (15 min)")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO CRÍTICO ao adquirir Wake Lock: ${e.message}", e)
            e.printStackTrace()
        }
    }

    private fun initializeViews() {
        Log.d(TAG, "📦 Inicializando views...")
        
        try {
            cardContainer = findViewById(R.id.cardContainer)
            txtMedicamento = findViewById(R.id.txtMedicamento)
            txtPaciente = findViewById(R.id.txtPaciente)
            txtDosagem = findViewById(R.id.txtDosagem)
            txtHorario = findViewById(R.id.txtHorario)
            txtFrequencia = findViewById(R.id.txtFrequencia)
            txtDataInicio = findViewById(R.id.txtDataInicio)
            txtDuracao = findViewById(R.id.txtDuracao)
            txtNotas = findViewById(R.id.txtNotas)
            detailsContainer = findViewById(R.id.detailsContainer)
            btnDesligar = findViewById(R.id.btnDesligar)
            btnLembrar = findViewById(R.id.btnLembrar)
            
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            Log.d(TAG, "✅ Views inicializadas")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao inicializar views: ${e.message}", e)
            throw e
        }
    }

    private fun retrieveIntentData() {
        Log.d(TAG, "📥 Recuperando dados da Intent...")
        
        try {
            medicamentoId = intent.getIntExtra("medicamentoId", -1)
            medicamento = intent.getStringExtra("medicamento") ?: "Medicamento"
            paciente = intent.getStringExtra("paciente") ?: ""
            dosagem = intent.getStringExtra("dosagem") ?: "Dose"
            horario = intent.getStringExtra("horario") ?: "Horário"
            frequencia = intent.getStringExtra("frequencia") ?: ""
            dataInicio = intent.getStringExtra("dataInicio") ?: ""
            duracao = intent.getStringExtra("duracao") ?: ""
            notas = intent.getStringExtra("notas") ?: ""
            
            temSom = intent.getBooleanExtra("som", true)
            tipoSom = intent.getStringExtra("tipoSom") ?: "1"
            temVibracao = intent.getBooleanExtra("vibracao", true)
            temNotificacaoVisual = intent.getBooleanExtra("notificacaoVisual", true)
            
            Log.d(TAG, "📋 ID=$medicamentoId | Med=$medicamento | Som=$temSom | Tipo=$tipoSom")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao recuperar dados: ${e.message}", e)
        }
    }

    private fun populateUI() {
        Log.d(TAG, "🎨 Preenchendo UI...")
        
        try {
            if (!temNotificacaoVisual) {
                cardContainer.alpha = 0.3f
                cardContainer.isEnabled = false
            }
            
            txtMedicamento.text = "💊 $medicamento"
            
            txtPaciente.apply {
                if (paciente.isNotEmpty()) {
                    text = "👤 Paciente: $paciente"
                    visibility = View.VISIBLE
                } else {
                    visibility = View.GONE
                }
            }
            
            txtDosagem.text = "💧 Dosagem: $dosagem"
            txtHorario.text = "⏰ Horário: $horario"
            
            txtFrequencia.apply {
                if (frequencia.isNotEmpty()) {
                    text = "🔄 Frequência: a cada $frequencia"
                    visibility = View.VISIBLE
                } else {
                    visibility = View.GONE
                }
            }
            
            txtDataInicio.apply {
                if (dataInicio.isNotEmpty()) {
                    text = "📅 Início: $dataInicio"
                    visibility = View.VISIBLE
                } else {
                    visibility = View.GONE
                }
            }
            
            txtDuracao.apply {
                if (duracao.isNotEmpty()) {
                    text = "📊 Duração: $duracao"
                    visibility = View.VISIBLE
                } else {
                    visibility = View.GONE
                }
            }
            
            txtNotas.apply {
                if (notas.isNotEmpty()) {
                    text = "📝 Observações: $notas"
                    visibility = View.VISIBLE
                } else {
                    visibility = View.GONE
                }
            }
            
            if (temNotificacaoVisual) {
                startAnimations()
            }
            
            Log.d(TAG, "✅ UI preenchida")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao preencher UI: ${e.message}", e)
        }
    }

    private fun startAlarmEffects() {
        Log.d(TAG, "🔊 Iniciando efeitos de alarme...")
        
        try {
            if (temSom) {
                maximizeVolumeSilently()
                startAlarmSound()
            } else {
                Log.d(TAG, "🔇 Som desabilitado")
            }
            
            if (temVibracao) {
                startVibration()
            } else {
                Log.d(TAG, "📳 Vibração desabilitada")
            }
            
            Log.d(TAG, "✅ Efeitos iniciados")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao iniciar efeitos: ${e.message}", e)
        }
    }

    private fun maximizeVolumeSilently() {
        try {
            val maxVolume = audioManager?.getStreamMaxVolume(AudioManager.STREAM_ALARM) ?: 15
            audioManager?.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)
            Log.d(TAG, "🔊 Volume: $maxVolume (máximo)")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao ajustar volume: ${e.message}", e)
        }
    }

    private fun startAlarmSound() {
        try {
            Log.d(TAG, "🎵 Iniciando som (tipo: $tipoSom)...")
            
            val soundResourceName = when (tipoSom) {
                "1" -> "toque1"
                "2" -> "toque2"
                "3" -> "toque3"
                "4" -> "toque4"
                else -> "toque1"
            }
            
            val resId = resources.getIdentifier(soundResourceName, "raw", packageName)
            
            mediaPlayer = if (resId != 0) {
                Log.d(TAG, "✅ Toque encontrado: $soundResourceName.mp3 (ID: $resId)")
                MediaPlayer.create(this, resId)
            } else {
                Log.w(TAG, "⚠️ Toque personalizado não encontrado, usando alarme padrão")
                val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                MediaPlayer().apply {
                    setDataSource(applicationContext, alarmUri)
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    prepare()
                }
            }
            
            mediaPlayer?.apply {
                isLooping = true
                setVolume(1.0f, 1.0f)
                start()
                Log.d(TAG, "✅ Som tocando em LOOP INFINITO")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao iniciar som: ${e.message}", e)
            e.printStackTrace()
        }
    }

    private fun startVibration() {
        try {
            Log.d(TAG, "📳 Iniciando vibração...")
            
            vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            val pattern = longArrayOf(0, 500, 200, 500, 200)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(
                    VibrationEffect.createWaveform(pattern, 0),
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build()
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
            
            Log.d(TAG, "✅ Vibração em LOOP INFINITO")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao iniciar vibração: ${e.message}", e)
        }
    }

    private fun startAnimations() {
        try {
            val pulseAnim = AnimationUtils.loadAnimation(this, android.R.anim.fade_in).apply {
                duration = 800
                repeatCount = -1
                repeatMode = android.view.animation.Animation.REVERSE
            }
            
            val slideIn = AnimationUtils.loadAnimation(this, android.R.anim.slide_in_left).apply {
                duration = 500
            }
            
            cardContainer.startAnimation(slideIn)
            txtMedicamento.startAnimation(pulseAnim)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro nas animações: ${e.message}", e)
        }
    }

    private fun setupButtons() {
        Log.d(TAG, "🎮 Configurando botões...")
        
        try {
            btnDesligar.setOnClickListener {
                Log.d(TAG, "🔴 Botão DESLIGAR clicado")
                desligarAlarme()
            }
            
            btnLembrar.setOnClickListener {
                Log.d(TAG, "⏰ Botão LEMBRAR clicado")
                lembrarEmCincoMinutos()
            }
            
            Log.d(TAG, "✅ Botões configurados")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao configurar botões: ${e.message}", e)
        }
    }

    private fun desligarAlarme() {
        Log.d(TAG, "🔴 Desligando alarme...")
        stopAllAlarmEffects()
        AlarmService.stopAlarmService(this)
        finish()
        Log.d(TAG, "✅ Alarme desligado, Activity finalizando")
    }

    private fun lembrarEmCincoMinutos() {
        Log.d(TAG, "⏰ Reagendando para 5 minutos...")
        stopAllAlarmEffects()
        
        AlarmModule.scheduleSnooze(
            applicationContext,
            medicamentoId, medicamento, paciente, dosagem, horario,
            frequencia, dataInicio, duracao, notas,
            temSom, tipoSom, temVibracao, temNotificacaoVisual
        )
        
        Toast.makeText(this, "⏰ Alarme reagendado para daqui a 5 minutos", Toast.LENGTH_SHORT).show()
        
        AlarmService.stopAlarmService(this)
        finish()
        Log.d(TAG, "✅ Snooze agendado, Activity finalizando")
    }

    private fun stopAllAlarmEffects() {
        Log.d(TAG, "🛑 Parando todos os efeitos...")
        
        try {
            mediaPlayer?.apply {
                if (isPlaying) stop()
                release()
            }
            mediaPlayer = null
            Log.d(TAG, "🔇 Som parado")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao parar som: ${e.message}", e)
        }
        
        try {
            vibrator?.cancel()
            vibrator = null
            Log.d(TAG, "📳 Vibração parada")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao parar vibração: ${e.message}", e)
        }
        
        Log.d(TAG, "✅ Todos os efeitos parados")
    }

    private fun releaseAllWakeLocks() {
        Log.d(TAG, "🔓 Liberando Wake Locks...")
        
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.d(TAG, "✅ Wake Lock liberado")
                }
            }
            wakeLock = null
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao liberar Wake Lock: ${e.message}", e)
        }
    }

    private fun isAppInForeground(): Boolean {
        val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val appProcesses = activityManager.runningAppProcesses ?: return false
        
        return appProcesses.any { 
            it.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
            it.processName == packageName
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "💀 onDestroy() - Liberando recursos...")
        
        stopAllAlarmEffects()
        releaseAllWakeLocks()
        
        Log.d(TAG, "✅ Activity destruída completamente")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        Log.d(TAG, "🔄 onNewIntent() - Nova intent recebida")
        setIntent(intent)
    }

    override fun onStart() {
        super.onStart()
        Log.d(TAG, "▶️ onStart() chamado")
    }

    override fun onResume() {
        super.onResume()
        Log.d(TAG, "▶️ onResume() chamado")
    }

    override fun onPause() {
        super.onPause()
        Log.d(TAG, "⏸️ onPause() chamado")
    }

    override fun onStop() {
        super.onStop()
        Log.d(TAG, "⏹️ onStop() chamado")
    }
}