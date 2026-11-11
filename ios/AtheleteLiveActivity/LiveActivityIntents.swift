import AppIntents
import Foundation

// Buttons of the workout Live Activity (iOS 17+): "Serie hecha ✓" and
// "Saltar". A LiveActivityIntent runs in the process of the APP (never in the
// widget extension), so it hands the tap to the app's own JavaScript runner:
// no session logic lives here.
//
// 1. The tap is kept in a queue (UserDefaults.standard, key below) first, so
//    it is never lost: if JS is not running it waits there, and the runner
//    applies it, in order, when the session screen is back.
// 2. A notification wakes the LiveActivity module, which emits `onAction` to
//    JS while it runs. JS closes the tap (removes it from the queue) once it
//    has applied or ignored it.
// 3. perform() waits for that (at most 4 s) and a moment more, so the app is
//    not suspended before the activity shows its next state.
//
// A second tap on the same button while the first one is still open is not
// queued again, and the runner only logs a set that is still the current one:
// a set is never saved twice.
//
// KEEP IN SYNC: this file exists, byte for byte, in ios/Athelete/ (compiled
// into the app target, where perform() runs) and in ios/AtheleteLiveActivity/
// (the widget extension, which only needs the types for Button(intent:)).
// The queue's shape is read by modules/live-activity (LiveActivityActionQueue).
enum LiveActivityActions {
  static let queueKey = "athelete.liveActivity.actions"
  static let notification = Notification.Name("com.athelete.liveActivity.action")
  private static let maxAgeMs: Double = 6 * 60 * 60 * 1000

  // Queues the tap unless the same one is already waiting. Returns its id.
  private static func enqueue(
    kind: String,
    sessionId: String,
    position: Int,
    setIndex: Int
  ) -> (id: String, info: [String: Any])? {
    let defaults = UserDefaults.standard
    objc_sync_enter(defaults)
    defer { objc_sync_exit(defaults) }
    let now = Date().timeIntervalSince1970 * 1000
    var queue = ((defaults.array(forKey: queueKey) as? [[String: Any]]) ?? []).filter {
      now - (($0["at"] as? Double) ?? 0) < maxAgeMs
    }
    let duplicate = queue.contains {
      ($0["kind"] as? String) == kind
        && ($0["sessionId"] as? String) == sessionId
        && ($0["position"] as? Int) == position
        && ($0["setIndex"] as? Int) == setIndex
    }
    guard !duplicate else { return nil }
    let id = UUID().uuidString
    let info: [String: Any] = [
      "id": id,
      "kind": kind,
      "sessionId": sessionId,
      "position": position,
      "setIndex": setIndex,
      "at": now,
    ]
    queue.append(info)
    defaults.set(queue, forKey: queueKey)
    return (id, info)
  }

  private static func isWaiting(_ id: String) -> Bool {
    let defaults = UserDefaults.standard
    objc_sync_enter(defaults)
    defer { objc_sync_exit(defaults) }
    let queue = (defaults.array(forKey: queueKey) as? [[String: Any]]) ?? []
    return queue.contains { ($0["id"] as? String) == id }
  }

  static func deliver(kind: String, sessionId: String, position: Int, setIndex: Int) async {
    guard let queued = enqueue(kind: kind, sessionId: sessionId, position: position, setIndex: setIndex) else {
      return
    }
    NotificationCenter.default.post(name: notification, object: nil, userInfo: queued.info)
    // Until JS closes it (or 4 s: the tap stays queued for later).
    var waited = 0
    while waited < 80, isWaiting(queued.id) {
      try? await Task.sleep(nanoseconds: 50_000_000)
      waited += 1
    }
    // The activity takes its next state from what JS just did.
    try? await Task.sleep(nanoseconds: 600_000_000)
  }
}

@available(iOS 17.0, *)
struct CompleteSetIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Complete set"

  @Parameter(title: "Session")
  var sessionId: String

  @Parameter(title: "Exercise")
  var position: Int

  @Parameter(title: "Set")
  var setIndex: Int

  init() {}

  init(sessionId: String, position: Int, setIndex: Int) {
    self.sessionId = sessionId
    self.position = position
    self.setIndex = setIndex
  }

  func perform() async throws -> some IntentResult {
    await LiveActivityActions.deliver(
      kind: "completeSet",
      sessionId: sessionId,
      position: position,
      setIndex: setIndex
    )
    return .result()
  }
}

@available(iOS 17.0, *)
struct SkipRestIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Skip rest"

  @Parameter(title: "Session")
  var sessionId: String

  init() {}

  init(sessionId: String) {
    self.sessionId = sessionId
  }

  func perform() async throws -> some IntentResult {
    await LiveActivityActions.deliver(kind: "skipRest", sessionId: sessionId, position: 0, setIndex: 0)
    return .result()
  }
}
