import ActivityKit
import ExpoModulesCore
import Foundation

// Logs: laLog(_:_:) in SessionActivityAttributes.swift (os_log, subsystem
// com.athelete.app, category LiveActivity; one interpolated message).

// The size ActivityKit will see: attributes + state as JSON. iOS refuses an
// activity over 4 KB (request throws, update is dropped), so it is logged and
// a state close to the limit is flagged.
private let activityKitLimit = 4096
private func encodedSize(
  _ attributes: SessionActivityAttributes?,
  _ state: SessionActivityAttributes.ContentState
) -> Int {
  let encoder = JSONEncoder()
  let stateBytes = (try? encoder.encode(state).count) ?? -1
  let attributeBytes = attributes.flatMap { try? encoder.encode($0).count } ?? 0
  return stateBytes < 0 ? -1 : stateBytes + attributeBytes
}

struct LiveActivityStart: Record {
  @Field var routineName: String = ""
  @Field var sessionId: String = ""
  @Field var workoutId: String = ""
}

struct LiveActivityLabelsRecord: Record {
  @Field var skip: String = ""
  @Field var setDone: String = ""
  @Field var chooseInApp: String = ""
  @Field var openApp: String = ""
  @Field var doneHint: String = ""
  @Field var pausedHint: String = ""

  var labels: ActivityLabels {
    ActivityLabels(
      skip: skip,
      setDone: setDone,
      chooseInApp: chooseInApp,
      openApp: openApp,
      doneHint: doneHint,
      pausedHint: pausedHint
    )
  }
}

struct LiveActivityState: Record {
  @Field var phase: String = "exercise"
  // Epoch milliseconds (JS Date.getTime()).
  @Field var restEndsAt: Double? = nil
  @Field var paused: Bool = false
  @Field var pausedRemainingSec: Int? = nil
  @Field var exerciseName: String = ""
  @Field var scheme: String = ""
  @Field var progress: String = ""
  @Field var headline: String = ""
  @Field var prefix: String = ""
  @Field var compact: String = ""
  @Field var action: String = "none"
  @Field var hint: String = ""
  @Field var position: Int = 0
  @Field var setIndex: Int = 0
  @Field var labels: LiveActivityLabelsRecord = LiveActivityLabelsRecord()
  @Field var nowHeadline: String = ""
  @Field var setScheme: String = ""
  @Field var setCompact: String = ""
  @Field var setAction: String = "none"

  var content: SessionActivityAttributes.ContentState {
    SessionActivityAttributes.ContentState(
      phase: phase,
      restEndsAt: restEndsAt.map { Date(timeIntervalSince1970: $0 / 1000) },
      paused: paused,
      pausedRemainingSec: pausedRemainingSec,
      exerciseName: exerciseName,
      scheme: scheme,
      progress: progress,
      headline: headline,
      prefix: prefix,
      compact: compact,
      action: action,
      hint: hint,
      position: position,
      setIndex: setIndex,
      labels: labels.labels,
      nowHeadline: nowHeadline,
      setScheme: setScheme,
      setCompact: setCompact,
      setAction: setAction
    )
  }

  // Stale exactly when a running rest ends. iOS then draws the widget again
  // with context.isStale true, without waking the app (and without any audio
  // running in the background): the widget shows the set in course from the
  // `set*` fields of this same state.
  var staleDate: Date? {
    guard phase == "rest", !paused, let ends = restEndsAt else { return nil }
    return Date(timeIntervalSince1970: ends / 1000)
  }
}

// Taps on the buttons of the activity (iOS 17+). The intent runs in the
// process of the app and keeps each tap in this queue (UserDefaults) before
// anything else, so a tap is never lost: JS closes it with `ackAction` once
// it has applied or ignored it, and whatever came while JS was not running
// is handed over by `pendingActions`.
//
// KEEP IN SYNC with ios/Athelete/LiveActivityIntents.swift: same key, same
// shape (id, kind, sessionId, position, setIndex, at in epoch ms).
enum LiveActivityActionQueue {
  static let key = "athelete.liveActivity.actions"
  // A tap older than this is forgotten.
  static let maxAgeMs: Double = 6 * 60 * 60 * 1000

  static func all() -> [[String: Any]] {
    let defaults = UserDefaults.standard
    objc_sync_enter(defaults)
    defer { objc_sync_exit(defaults) }
    let now = Date().timeIntervalSince1970 * 1000
    let queue = ((defaults.array(forKey: key) as? [[String: Any]]) ?? []).filter {
      now - (($0["at"] as? Double) ?? 0) < maxAgeMs
    }
    defaults.set(queue, forKey: key)
    return queue
  }

  static func remove(_ id: String) {
    let defaults = UserDefaults.standard
    objc_sync_enter(defaults)
    defer { objc_sync_exit(defaults) }
    let queue = ((defaults.array(forKey: key) as? [[String: Any]]) ?? []).filter {
      ($0["id"] as? String) != id
    }
    defaults.set(queue, forKey: key)
  }
}

// Bridge to ActivityKit for the workout Live Activity. Every call is a no-op
// when Live Activities are off (Ajustes) or unsupported: it never throws.
public class LiveActivityModule: Module {
  // Posted by the intents (ios/Athelete/LiveActivityIntents.swift) and by the
  // rest cues (modules/rest-cues) — plain names, no code shared with them.
  private static let actionName = Notification.Name("com.athelete.liveActivity.action")
  private static let restEndedName = Notification.Name("com.athelete.restCues.restEnded")

  // What an activity takes when its running rest reaches zero with the rest
  // sounds on: JS arms it with every update; the rest cues announce the end
  // natively (their clock keeps the app running, JS timers are suspended in
  // the background) and the activity gets its real next state. Without sounds
  // nothing runs: the widget gets to the set by itself through the staleDate.
  private struct Armed {
    let restEndsAtMs: Double
    let content: SessionActivityAttributes.ContentState
  }
  private var armed: [String: Armed] = [:]
  private let lock = NSLock()
  private var observers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    // A tap on a button of the activity, while JS runs.
    Events("onAction")

    OnCreate {
      self.startObserving()
    }

    OnDestroy {
      self.stopObserving()
    }

    Function("areEnabled") { () -> Bool in
      ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // Returns the activity id, or nil when it could not start.
    AsyncFunction("start") { (start: LiveActivityStart, state: LiveActivityState) -> String? in
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        laLog(.default, "start: skipped, Live Activities are off (Ajustes)")
        return nil
      }
      let attributes = SessionActivityAttributes(
        routineName: start.routineName,
        sessionId: start.sessionId,
        workoutId: start.workoutId
      )
      let size = encodedSize(attributes, state.content)
      if size < 0 || size > activityKitLimit - 512 {
        laLog(.fault, "start: payload \(size) B of \(activityKitLimit) (could not encode, or too close to the limit)")
      }
      do {
        let activity = try Activity.request(
          attributes: attributes,
          content: ActivityContent(state: state.content, staleDate: state.staleDate),
          pushType: nil
        )
        laLog(.default, "start: ok id=\(activity.id) phase=\(state.phase) payload=\(size) B")
        return activity.id
      } catch {
        // ActivityAuthorizationError / ActivityKit: too many activities, over
        // the size limit, app not in the foreground, not allowed…
        laLog(
          .error,
          "start: Activity.request failed (\(String(describing: type(of: error)))) payload=\(size) B: \(String(describing: error))"
        )
        return nil
      }
    }

    AsyncFunction("update") { (id: String, state: LiveActivityState, endState: LiveActivityState?) in
      guard let activity = Activity<SessionActivityAttributes>.activities.first(where: { $0.id == id }) else {
        laLog(
          .error,
          "update: no activity with id=\(id) (ended or dismissed); \(Activity<SessionActivityAttributes>.activities.count) alive"
        )
        return
      }
      self.arm(id: id, state: state, endState: endState)
      let size = encodedSize(activity.attributes, state.content)
      if size < 0 || size > activityKitLimit - 512 {
        laLog(.fault, "update: payload \(size) B of \(activityKitLimit) (could not encode, or too close to the limit)")
      }
      let before = String(describing: activity.activityState)
      await activity.update(ActivityContent(state: state.content, staleDate: state.staleDate))
      // `update` does not throw: a dropped update shows only as a state that is
      // not .active afterwards, so it is logged here.
      laLog(
        .default,
        "update: id=\(id) phase=\(state.phase) action=\(state.action) payload=\(size) B state \(before) → \(String(describing: activity.activityState))"
      )
    }

    // Ends one activity and removes it at once.
    AsyncFunction("end") { (id: String) in
      self.disarm(id: id)
      for activity in Activity<SessionActivityAttributes>.activities where activity.id == id {
        await activity.end(nil, dismissalPolicy: .immediate)
        laLog(.default, "end: id=\(id)")
      }
    }

    // Ends every activity of the app (orphans of a killed app).
    AsyncFunction("endAll") {
      self.disarmAll()
      for activity in Activity<SessionActivityAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
        laLog(.default, "endAll: ended id=\(activity.id)")
      }
    }

    // The taps kept in the queue and not closed yet, oldest first.
    AsyncFunction("pendingActions") { () -> [[String: Any]] in
      LiveActivityActionQueue.all()
    }

    // JS has applied or ignored this tap: it leaves the queue.
    AsyncFunction("ackAction") { (id: String) in
      LiveActivityActionQueue.remove(id)
    }
  }

  // ── Rest end ───────────────────────────────────────────────────────────────
  private func arm(id: String, state: LiveActivityState, endState: LiveActivityState?) {
    lock.lock()
    defer { lock.unlock() }
    if state.phase == "rest", !state.paused, let ends = state.restEndsAt, let endState {
      armed[id] = Armed(restEndsAtMs: ends, content: endState.content)
    } else {
      armed[id] = nil
    }
  }

  private func disarm(id: String) {
    lock.lock()
    armed[id] = nil
    lock.unlock()
  }

  private func disarmAll() {
    lock.lock()
    armed = [:]
    lock.unlock()
  }

  // The rest cues reached the end of a rest: the armed activities whose rest
  // ends then (the arm keeps whole seconds, the cues the exact time) take
  // their next state, the set in course.
  private func restEnded(atMs: Double) {
    lock.lock()
    let due = armed.filter { abs($0.value.restEndsAtMs - atMs) <= 1500 }
    due.keys.forEach { armed[$0] = nil }
    lock.unlock()
    guard !due.isEmpty else { return }
    Task {
      for activity in Activity<SessionActivityAttributes>.activities {
        guard let next = due[activity.id] else { continue }
        await activity.update(ActivityContent(state: next.content, staleDate: nil))
        laLog(.default, "restEnded: id=\(activity.id) now \(String(describing: activity.activityState))")
      }
    }
  }

  private func startObserving() {
    let center = NotificationCenter.default
    observers = [
      center.addObserver(forName: Self.restEndedName, object: nil, queue: nil) { [weak self] note in
        let ends = (note.userInfo?["restEndsAt"] as? Double) ?? 0
        self?.restEnded(atMs: ends)
      },
      center.addObserver(forName: Self.actionName, object: nil, queue: nil) { [weak self] note in
        guard let info = note.userInfo as? [String: Any] else { return }
        self?.sendEvent("onAction", info)
      },
    ]
  }

  private func stopObserving() {
    observers.forEach(NotificationCenter.default.removeObserver)
    observers = []
  }
}
