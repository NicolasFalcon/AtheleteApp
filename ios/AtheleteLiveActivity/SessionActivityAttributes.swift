import ActivityKit
import Foundation
import os

// The workout Live Activity (Dynamic Island + Lock Screen).
//
// KEEP IN SYNC: this file exists, byte for byte, in
// modules/live-activity/ios/ (the app's bridge) and in
// ios/AtheleteLiveActivity/ (the widget extension). ActivityKit matches the
// bridge and the extension by type name and Codable shape.
//
// DECODING IS LENIENT ON PURPOSE. An activity outlives the app that started
// it (an update from TestFlight, a kill): the widget of the NEW build then has
// to draw the state the OLD build left, which lacks every field added since.
// A strict decoder fails there and iOS draws an empty plate. So every field
// takes a default when it is missing or has another type, and the gap is
// logged (Consola: subsystem com.athelete.app, category LiveActivity). Any
// new field goes into CodingKeys + init(from:) with a default, never strict.

// Logs of the Live Activity (the app's bridge and the widget extension).
enum ActivityLog {
  static let log = OSLog(subsystem: "com.athelete.app", category: "LiveActivity")
}

// The one way to log. The whole message is built with Swift interpolation and
// reaches os_log as a SINGLE argument ("%{public}@"), so the number of
// arguments always matches the format, whatever is logged. Never pass os_log a
// format with several specifiers: a count that does not match (build 12: six
// specifiers, four arguments forwarded) reads garbage and kills the process.
func laLog(_ type: OSLogType, _ message: String) {
  os_log("%{public}@", log: ActivityLog.log, type: type, message)
}

// Texts of the buttons and hints, already in the athlete's language.
public struct ActivityLabels: Codable, Hashable {
  public var skip: String
  public var setDone: String
  public var chooseInApp: String
  public var openApp: String
  public var doneHint: String
  public var pausedHint: String

  public init(
    skip: String,
    setDone: String,
    chooseInApp: String,
    openApp: String,
    doneHint: String,
    pausedHint: String
  ) {
    self.skip = skip
    self.setDone = setDone
    self.chooseInApp = chooseInApp
    self.openApp = openApp
    self.doneHint = doneHint
    self.pausedHint = pausedHint
  }

  // Nothing to say (a state from a build that had no labels).
  public static let empty = ActivityLabels(
    skip: "", setDone: "", chooseInApp: "", openApp: "", doneHint: "", pausedHint: ""
  )

  private enum CodingKeys: String, CodingKey {
    case skip, setDone, chooseInApp, openApp, doneHint, pausedHint
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    func text(_ key: CodingKeys) -> String {
      ((try? container.decodeIfPresent(String.self, forKey: key)) ?? nil) ?? ""
    }
    skip = text(.skip)
    setDone = text(.setDone)
    chooseInApp = text(.chooseInApp)
    openApp = text(.openApp)
    doneHint = text(.doneHint)
    pausedHint = text(.pausedHint)
  }
}

public struct SessionActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    // "rest" · "exercise" · "done"
    public var phase: String
    // End of the rest (counts down by itself on the system clock).
    public var restEndsAt: Date?
    public var paused: Bool
    // Rest left when paused (the countdown is frozen).
    public var pausedRemainingSec: Int?
    // Next exercise during a rest, the current one otherwise.
    public var exerciseName: String
    // Rest: "3 × 10 · 40 kg" · set in course: "Serie 2 de 3 · 10 reps × 40 kg"
    public var scheme: String
    // "2 de 6 ejercicios"
    public var progress: String
    // "Descanso" · "Ahora" · "En pausa" · "Sesión completa"
    public var headline: String
    // "Siguiente: " before the exercise during a rest.
    public var prefix: String
    // Compact Dynamic Island text outside a rest: "Serie 2".
    public var compact: String
    // What the button does: "none" · "skipRest" · "completeSet" ·
    // "chooseInApp" · "openApp".
    public var action: String
    // Why there is no "Serie hecha": "Elige tu peso en la app".
    public var hint: String
    // The set the buttons act on.
    public var position: Int
    public var setIndex: Int
    public var labels: ActivityLabels
    // The set that follows, for when the rest ends: the activity's staleDate
    // is the end of the rest, and from then on the widget draws the set in
    // course from these fields (no update from the app is needed).
    // "Ahora" · "Serie 2 de 3 · 10 reps × 40 kg" · "Serie 2" · the button
    // that set gets ("completeSet" · "chooseInApp" · "none").
    public var nowHeadline: String
    public var setScheme: String
    public var setCompact: String
    public var setAction: String

    private enum CodingKeys: String, CodingKey {
      case phase, restEndsAt, paused, pausedRemainingSec, exerciseName, scheme
      case progress, headline, prefix, compact, action, hint, position, setIndex
      case labels, nowHeadline, setScheme, setCompact, setAction
    }

    // Lenient (see the top of the file): a missing or mistyped field takes a
    // default that still draws something sensible, and is logged.
    public init(from decoder: Decoder) throws {
      let container = try decoder.container(keyedBy: CodingKeys.self)
      var missing: [String] = []
      func read<T: Decodable>(_ key: CodingKeys, _ fallback: T) -> T {
        if let value = (try? container.decodeIfPresent(T.self, forKey: key)) ?? nil {
          return value
        }
        missing.append(key.stringValue)
        return fallback
      }
      let phase: String = read(.phase, "exercise")
      self.phase = phase
      // nil is a real value here (no rest running), not a gap.
      self.restEndsAt = (try? container.decodeIfPresent(Date.self, forKey: .restEndsAt)) ?? nil
      self.paused = read(.paused, false)
      self.pausedRemainingSec = (try? container.decodeIfPresent(Int.self, forKey: .pausedRemainingSec)) ?? nil
      self.exerciseName = read(.exerciseName, "")
      self.scheme = read(.scheme, "")
      self.progress = read(.progress, "")
      self.headline = read(
        .headline,
        phase == "rest" ? "Descanso" : phase == "done" ? "Sesión completa" : "Ahora"
      )
      self.prefix = read(.prefix, "")
      self.compact = read(.compact, "")
      self.action = read(.action, "none")
      self.hint = read(.hint, "")
      self.position = read(.position, 0)
      self.setIndex = read(.setIndex, 0)
      self.labels = read(.labels, ActivityLabels.empty)
      self.nowHeadline = read(.nowHeadline, "Ahora")
      self.setScheme = read(.setScheme, "")
      self.setCompact = read(.setCompact, "")
      self.setAction = read(.setAction, "none")
      if !missing.isEmpty {
        laLog(
          .error,
          "ContentState with missing fields (state from an older build?): \(missing.joined(separator: ","))"
        )
      }
    }

    public init(
      phase: String,
      restEndsAt: Date?,
      paused: Bool,
      pausedRemainingSec: Int?,
      exerciseName: String,
      scheme: String,
      progress: String,
      headline: String,
      prefix: String,
      compact: String,
      action: String,
      hint: String,
      position: Int,
      setIndex: Int,
      labels: ActivityLabels,
      nowHeadline: String,
      setScheme: String,
      setCompact: String,
      setAction: String
    ) {
      self.phase = phase
      self.restEndsAt = restEndsAt
      self.paused = paused
      self.pausedRemainingSec = pausedRemainingSec
      self.exerciseName = exerciseName
      self.scheme = scheme
      self.progress = progress
      self.headline = headline
      self.prefix = prefix
      self.compact = compact
      self.action = action
      self.hint = hint
      self.position = position
      self.setIndex = setIndex
      self.labels = labels
      self.nowHeadline = nowHeadline
      self.setScheme = setScheme
      self.setCompact = setCompact
      self.setAction = setAction
    }
  }

  public var routineName: String
  public var sessionId: String
  public var workoutId: String

  public init(routineName: String, sessionId: String, workoutId: String) {
    self.routineName = routineName
    self.sessionId = sessionId
    self.workoutId = workoutId
  }
}
