import ActivityKit
import ExpoModulesCore
import Foundation

struct LiveActivityStart: Record {
  @Field var routineName: String = ""
  @Field var sessionId: String = ""
  @Field var workoutId: String = ""
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

  var content: SessionActivityAttributes.ContentState {
    SessionActivityAttributes.ContentState(
      phase: phase,
      restEndsAt: restEndsAt.map { Date(timeIntervalSince1970: $0 / 1000) },
      paused: paused,
      pausedRemainingSec: pausedRemainingSec,
      exerciseName: exerciseName,
      scheme: scheme,
      progress: progress
    )
  }

  // Stale 10 s before the end of a running rest: the widget renders the
  // countdown in the warning red (context.isStale) without waking the app.
  var staleDate: Date? {
    guard phase == "rest", !paused, let ends = restEndsAt else { return nil }
    return Date(timeIntervalSince1970: ends / 1000 - 10)
  }
}

// Bridge to ActivityKit for the workout Live Activity. Every call is a no-op
// when Live Activities are off (Ajustes) or unsupported: it never throws.
public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    Function("areEnabled") { () -> Bool in
      ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // Returns the activity id, or nil when it could not start.
    AsyncFunction("start") { (start: LiveActivityStart, state: LiveActivityState) -> String? in
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }
      let attributes = SessionActivityAttributes(
        routineName: start.routineName,
        sessionId: start.sessionId,
        workoutId: start.workoutId
      )
      do {
        let activity = try Activity.request(
          attributes: attributes,
          content: ActivityContent(state: state.content, staleDate: state.staleDate),
          pushType: nil
        )
        return activity.id
      } catch {
        return nil
      }
    }

    AsyncFunction("update") { (id: String, state: LiveActivityState) in
      guard let activity = Activity<SessionActivityAttributes>.activities.first(where: { $0.id == id }) else {
        return
      }
      await activity.update(ActivityContent(state: state.content, staleDate: state.staleDate))
    }

    // Ends one activity and removes it at once.
    AsyncFunction("end") { (id: String) in
      for activity in Activity<SessionActivityAttributes>.activities where activity.id == id {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }

    // Ends every activity of the app (orphans of a killed app).
    AsyncFunction("endAll") {
      for activity in Activity<SessionActivityAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}
