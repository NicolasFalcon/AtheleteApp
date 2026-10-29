import ActivityKit
import Foundation

// The workout Live Activity (Dynamic Island + Lock Screen).
//
// KEEP IN SYNC: this file exists twice, byte for byte, in
// modules/live-activity/ios/ (the app's bridge) and in
// ios/AtheleteLiveActivity/ (the widget extension). ActivityKit matches the
// two by type name and Codable shape.
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
    // "1 × 10" · "Serie 2 de 3"
    public var scheme: String
    // "2 de 6 ejercicios"
    public var progress: String

    public init(
      phase: String,
      restEndsAt: Date?,
      paused: Bool,
      pausedRemainingSec: Int?,
      exerciseName: String,
      scheme: String,
      progress: String
    ) {
      self.phase = phase
      self.restEndsAt = restEndsAt
      self.paused = paused
      self.pausedRemainingSec = pausedRemainingSec
      self.exerciseName = exerciseName
      self.scheme = scheme
      self.progress = progress
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
