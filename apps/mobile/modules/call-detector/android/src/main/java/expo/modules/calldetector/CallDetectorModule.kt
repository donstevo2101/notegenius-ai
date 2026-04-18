package expo.modules.calldetector

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class CallDetectorModule : Module() {

  private var telephonyManager: TelephonyManager? = null
  private var legacyListener: PhoneStateListener? = null
  private var modernCallback: Any? = null // TelephonyCallback (API 31+)
  private var mediaRecorder: MediaRecorder? = null
  private var monitoring = false
  private var recordingPath: String? = null
  private var lastState: Int = TelephonyManager.CALL_STATE_IDLE
  private var lastIncomingNumber: String? = null
  private var lastDirection: String = "unknown"

  private val context: Context
    get() = appContext.reactContext
      ?: throw IllegalStateException("React context not available")

  override fun definition() = ModuleDefinition {
    Name("CallDetectorModule")

    Events("onCallEvent")

    AsyncFunction("startMonitoring") { promise: Promise ->
      if (monitoring) {
        promise.resolve(null)
        return@AsyncFunction
      }

      val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
      if (tm == null) {
        promise.reject("ERR", "TelephonyManager unavailable", null)
        return@AsyncFunction
      }
      telephonyManager = tm

      if (!hasPermission(Manifest.permission.READ_PHONE_STATE)) {
        promise.reject("PERM", "READ_PHONE_STATE not granted", null)
        return@AsyncFunction
      }

      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          val callback = object : TelephonyCallback(),
            TelephonyCallback.CallStateListener {
            override fun onCallStateChanged(state: Int) {
              handleCallStateChange(state, null)
            }
          }
          tm.registerTelephonyCallback(context.mainExecutor, callback)
          modernCallback = callback
        } else {
          @Suppress("DEPRECATION")
          val listener = object : PhoneStateListener() {
            @Deprecated("Deprecated in API 31")
            override fun onCallStateChanged(state: Int, phoneNumber: String?) {
              handleCallStateChange(state, phoneNumber)
            }
          }
          @Suppress("DEPRECATION")
          tm.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
          legacyListener = listener
        }
        monitoring = true
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR", e.message ?: "Failed to start monitoring", e)
      }
    }

    AsyncFunction("stopMonitoring") { promise: Promise ->
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          (modernCallback as? TelephonyCallback)?.let {
            telephonyManager?.unregisterTelephonyCallback(it)
          }
          modernCallback = null
        } else {
          legacyListener?.let {
            @Suppress("DEPRECATION")
            telephonyManager?.listen(it, PhoneStateListener.LISTEN_NONE)
          }
          legacyListener = null
        }
        telephonyManager = null
        monitoring = false
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR", e.message ?: "Failed to stop", e)
      }
    }

    Function("isMonitoring") { monitoring }

    AsyncFunction("requestPermissions") { promise: Promise ->
      promise.resolve(currentPermissionStatus())
    }

    AsyncFunction("getPermissions") { promise: Promise ->
      promise.resolve(currentPermissionStatus())
    }

    AsyncFunction("startCallRecording") { filename: String, promise: Promise ->
      if (!hasPermission(Manifest.permission.RECORD_AUDIO)) {
        promise.reject("PERM", "RECORD_AUDIO not granted", null)
        return@AsyncFunction
      }

      try {
        val outFile = File(context.filesDir, filename)
        recordingPath = outFile.absolutePath

        val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          MediaRecorder(context)
        } else {
          @Suppress("DEPRECATION")
          MediaRecorder()
        }

        try {
          recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_CALL)
        } catch (e: Exception) {
          recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
        }

        recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        recorder.setAudioEncodingBitRate(64000)
        recorder.setAudioSamplingRate(16000)
        recorder.setOutputFile(outFile.absolutePath)
        recorder.prepare()
        recorder.start()
        mediaRecorder = recorder

        promise.resolve(outFile.absolutePath)
      } catch (e: Exception) {
        recordingPath = null
        promise.reject("ERR", "Failed to start recording: ${e.message}", e)
      }
    }

    AsyncFunction("stopCallRecording") { promise: Promise ->
      try {
        mediaRecorder?.let {
          it.stop()
          it.release()
        }
        mediaRecorder = null
        val path = recordingPath
        recordingPath = null
        promise.resolve(path)
      } catch (e: Exception) {
        mediaRecorder = null
        recordingPath = null
        promise.reject("ERR", "Failed to stop recording: ${e.message}", e)
      }
    }

    Function("isRecording") { mediaRecorder != null }
  }

  private fun handleCallStateChange(state: Int, phoneNumber: String?) {
    val previous = lastState
    lastState = state

    val outState: String
    val direction: String

    when (state) {
      TelephonyManager.CALL_STATE_RINGING -> {
        outState = "ringing"
        direction = "incoming"
        lastDirection = direction
        if (!phoneNumber.isNullOrBlank()) lastIncomingNumber = phoneNumber
      }
      TelephonyManager.CALL_STATE_OFFHOOK -> {
        outState = "connected"
        direction = if (previous == TelephonyManager.CALL_STATE_RINGING) {
          "incoming"
        } else {
          "outgoing"
        }
        lastDirection = direction
      }
      TelephonyManager.CALL_STATE_IDLE -> {
        outState = if (previous == TelephonyManager.CALL_STATE_RINGING) {
          "missed"
        } else {
          "ended"
        }
        direction = lastDirection
      }
      else -> {
        outState = "ended"
        direction = lastDirection
      }
    }

    sendEvent(
      "onCallEvent",
      mapOf(
        "state" to outState,
        "direction" to direction,
        "remoteNumber" to lastIncomingNumber,
        "contactName" to null,
        "timestamp" to System.currentTimeMillis()
      )
    )

    if (outState == "ended" || outState == "missed") {
      lastIncomingNumber = null
      lastDirection = "unknown"
    }
  }

  private fun currentPermissionStatus(): Map<String, Any> {
    val phone = hasPermission(Manifest.permission.READ_PHONE_STATE)
    val audio = hasPermission(Manifest.permission.RECORD_AUDIO)
    val callLog = hasPermission(Manifest.permission.READ_CALL_LOG)
    return mapOf(
      "granted" to (phone && audio),
      "canRecordAudio" to audio,
      "canReadCallLog" to callLog,
      "platform" to "android"
    )
  }

  private fun hasPermission(name: String): Boolean =
    ContextCompat.checkSelfPermission(context, name) == PackageManager.PERMISSION_GRANTED
}
