package expo.modules.voiceservice

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// REQ-VC-01 AC4: the foreground service of a voice room (notification "Đang trong phòng thoại").
class VoiceServiceModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("VoiceService")

    Function("start") { title: String, text: String, channelName: String, camera: Boolean ->
      val intent = Intent(context, VoiceForegroundService::class.java)
        .putExtra(VoiceForegroundService.TITLE, title)
        .putExtra(VoiceForegroundService.TEXT, text)
        .putExtra(VoiceForegroundService.CHANNEL_NAME, channelName)
        .putExtra(VoiceForegroundService.CAMERA, camera)
      ContextCompat.startForegroundService(context, intent)
    }

    Function("stop") {
      context.stopService(Intent(context, VoiceForegroundService::class.java))
    }
  }
}
