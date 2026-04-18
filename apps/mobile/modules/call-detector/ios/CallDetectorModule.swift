import ExpoModulesCore
import CallKit
import AVFoundation

public class CallDetectorModule: Module {
  private var callObserver: CXCallObserver?
  private var callObserverDelegate: CallObserverDelegate?
  private var monitoring = false

  // Track call states between events to infer ringing vs connected vs ended
  private var lastCallStates: [UUID: (hasConnected: Bool, isOutgoing: Bool)] = [:]

  public func definition() -> ModuleDefinition {
    Name("CallDetectorModule")

    Events("onCallEvent")

    AsyncFunction("startMonitoring") { [weak self] (promise: Promise) in
      guard let self = self else { promise.reject("ERR", "Module deallocated"); return }

      DispatchQueue.main.async {
        if self.monitoring {
          promise.resolve(nil)
          return
        }

        let observer = CXCallObserver()
        let delegate = CallObserverDelegate { [weak self] call in
          self?.handleCallChange(call)
        }
        observer.setDelegate(delegate, queue: nil)

        self.callObserver = observer
        self.callObserverDelegate = delegate
        self.monitoring = true
        promise.resolve(nil)
      }
    }

    AsyncFunction("stopMonitoring") { [weak self] (promise: Promise) in
      DispatchQueue.main.async {
        self?.callObserver = nil
        self?.callObserverDelegate = nil
        self?.monitoring = false
        self?.lastCallStates.removeAll()
        promise.resolve(nil)
      }
    }

    Function("isMonitoring") { [weak self] () -> Bool in
      return self?.monitoring ?? false
    }

    AsyncFunction("requestPermissions") { (promise: Promise) in
      AVAudioSession.sharedInstance().requestRecordPermission { granted in
        DispatchQueue.main.async {
          promise.resolve([
            "granted": granted,
            "canRecordAudio": granted,
            "canReadCallLog": false,
            "platform": "ios"
          ])
        }
      }
    }

    AsyncFunction("getPermissions") { (promise: Promise) in
      let status = AVAudioSession.sharedInstance().recordPermission
      let granted = status == .granted
      promise.resolve([
        "granted": granted,
        "canRecordAudio": granted,
        "canReadCallLog": false,
        "platform": "ios"
      ])
    }

    AsyncFunction("startCallRecording") { (filename: String, promise: Promise) in
      // iOS does not allow recording GSM call audio.
      // This is a no-op on iOS — the user is prompted post-call to dictate a memo.
      promise.reject("UNSUPPORTED",
        "iOS does not allow recording phone call audio. Use post-call voice memos instead.")
    }

    AsyncFunction("stopCallRecording") { (promise: Promise) in
      promise.resolve(nil)
    }

    Function("isRecording") { () -> Bool in
      return false
    }
  }

  private func handleCallChange(_ call: CXCall) {
    var state: String
    var direction: String

    let previous = lastCallStates[call.uuid]

    if call.hasEnded {
      // Distinguish missed vs ended
      let wasConnected = previous?.hasConnected ?? call.hasConnected
      state = wasConnected ? "ended" : "missed"
      direction = (previous?.isOutgoing ?? call.isOutgoing) ? "outgoing" : "incoming"
      lastCallStates.removeValue(forKey: call.uuid)
    } else if call.hasConnected {
      state = "connected"
      direction = call.isOutgoing ? "outgoing" : "incoming"
      lastCallStates[call.uuid] = (hasConnected: true, isOutgoing: call.isOutgoing)
    } else {
      state = "ringing"
      direction = call.isOutgoing ? "outgoing" : "incoming"
      lastCallStates[call.uuid] = (hasConnected: false, isOutgoing: call.isOutgoing)
    }

    // CallKit does not expose remote phone number for GSM calls (privacy)
    sendEvent("onCallEvent", [
      "state": state,
      "direction": direction,
      "remoteNumber": NSNull(),
      "contactName": NSNull(),
      "timestamp": Int(Date().timeIntervalSince1970 * 1000)
    ])
  }
}

private class CallObserverDelegate: NSObject, CXCallObserverDelegate {
  let onChange: (CXCall) -> Void

  init(onChange: @escaping (CXCall) -> Void) {
    self.onChange = onChange
  }

  func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
    onChange(call)
  }
}
