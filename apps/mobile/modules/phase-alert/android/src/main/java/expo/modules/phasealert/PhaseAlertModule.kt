package expo.modules.phasealert

import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// SRS 3.3 phase-change alert in the foreground (and S-ME-05 "Nghe thử"): the phone's default
// notification sound + one vibration, like the "Nhắc học tập" notification when the app is closed.
class PhaseAlertModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var ringtone: Ringtone? = null

  override fun definition() = ModuleDefinition {
    Name("PhaseAlert")

    // Ringer on silent / vibrate, or Không làm phiền filtering notifications.
    Function("isSilenced") {
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val notifications =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      audio.ringerMode != AudioManager.RINGER_MODE_NORMAL ||
        notifications.currentInterruptionFilter > NotificationManager.INTERRUPTION_FILTER_ALL
    }

    // force: "Luôn phát âm báo chuyển pha" while silenced — played as an alarm, which silent mode
    // lets through; otherwise as a notification, at the notification volume.
    Function("play") { force: Boolean ->
      val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      ringtone?.stop()
      ringtone = RingtoneManager.getRingtone(context, uri)?.apply {
        audioAttributes = AudioAttributes.Builder()
          .setUsage(
            if (force) AudioAttributes.USAGE_ALARM else AudioAttributes.USAGE_NOTIFICATION,
          )
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
        play()
      }
      vibrate()
    }
  }

  // The phone's vibration setting: none on silent, otherwise one short double pulse.
  private fun vibrate() {
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    if (audio.ringerMode == AudioManager.RINGER_MODE_SILENT) return
    val vibrator = vibrator() ?: return
    if (!vibrator.hasVibrator()) return
    val pattern = longArrayOf(0, 250, 150, 250)
    when {
      Build.VERSION.SDK_INT >= 33 -> vibrator.vibrate(
        VibrationEffect.createWaveform(pattern, -1),
        VibrationAttributes.createForUsage(VibrationAttributes.USAGE_NOTIFICATION),
      )
      Build.VERSION.SDK_INT >= 26 ->
        vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
      else -> @Suppress("DEPRECATION") vibrator.vibrate(pattern, -1)
    }
  }

  private fun vibrator(): Vibrator? =
    if (Build.VERSION.SDK_INT >= 31) {
      (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager)
        .defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
}
