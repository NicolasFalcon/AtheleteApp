import ActivityKit
import Foundation

// The workout Live Activity (Dynamic Island + Lock Screen).
//
// KEEP IN SYNC: this file exists, byte for byte, in
// modules/live-activity/ios/ (the app's bridge), in
// ios/AtheleteLiveActivity/ (the widget extension) and in
// ios/_LiveActivitySrc/ (mirror of the extension). ActivityKit matches the
// bridge and the extension by type name and Codable shape.

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
