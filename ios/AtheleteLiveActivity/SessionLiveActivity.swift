import ActivityKit
import SwiftUI
import WidgetKit

// Alive Minimalism on the system surfaces: dark plate, SF with tabular
// figures, Ember as the accent. The countdown runs on the system clock
// (Text(timerInterval:)), so iOS updates it without waking the app. 10 s
// before the end the activity becomes stale (staleDate set by the app) and
// the figure turns to the warning red.
private enum Palette {
  static let plate = Color(red: 0x14 / 255, green: 0x13 / 255, blue: 0x12 / 255)
  static let ember = Color(red: 0xFF / 255, green: 0x5B / 255, blue: 0x1F / 255)
  static let warning = Color(red: 0xD8 / 255, green: 0x6B / 255, blue: 0x6B / 255)
  static let meta = Color(red: 0xA8 / 255, green: 0xA6 / 255, blue: 0xA1 / 255)
  static let track = Color.white.opacity(0.18)
}

private typealias Context = ActivityViewContext<SessionActivityAttributes>

// athelete://session/<sessionId>?workoutId=<id> opens the running session.
private func sessionURL(_ attributes: SessionActivityAttributes) -> URL? {
  var components = URLComponents()
  components.scheme = "athelete"
  components.host = "session"
  components.path = "/\(attributes.sessionId)"
  components.queryItems = [URLQueryItem(name: "workoutId", value: attributes.workoutId)]
  return components.url
}

private func clock(_ seconds: Int) -> String {
  let safe = max(0, seconds)
  return String(format: "%d:%02d", safe / 60, safe % 60)
}

// The rest countdown, or the frozen time when paused.
private struct Countdown: View {
  let state: SessionActivityAttributes.ContentState
  let isStale: Bool
  var size: CGFloat = 15
  var weight: Font.Weight = .semibold

  var body: some View {
    Group {
      if state.paused {
        Text(clock(state.pausedRemainingSec ?? 0))
          .foregroundColor(Palette.meta)
      } else if let ends = state.restEndsAt, ends > Date() {
        Text(timerInterval: Date()...ends, countsDown: true, showsHours: false)
          .foregroundColor(isStale ? Palette.warning : Palette.ember)
      } else {
        // Ended while the app was suspended: 0:00 in red until it updates.
        Text("0:00").foregroundColor(Palette.warning)
      }
    }
    .font(.system(size: size, weight: weight))
    .monospacedDigit()
    .multilineTextAlignment(.trailing)
  }
}

// AURA, small: a ring with the Ember arc (drawn, no image asset).
private struct AuraSmall: View {
  var size: CGFloat = 18

  var body: some View {
    ZStack {
      Circle().stroke(Palette.track, lineWidth: size * 0.14)
      Circle()
        .trim(from: 0, to: 0.32)
        .stroke(Palette.ember, style: StrokeStyle(lineWidth: size * 0.14, lineCap: .round))
        .rotationEffect(.degrees(-90))
    }
    .frame(width: size, height: size)
  }
}

private func headline(_ state: SessionActivityAttributes.ContentState) -> String {
  switch state.phase {
  case "rest": return state.paused ? "En pausa" : "Descanso"
  case "done": return "Entreno terminado"
  default: return state.paused ? "En pausa" : "Ahora"
  }
}

// "Siguiente: Círculos de brazos · 1 × 10"
private func exerciseLine(_ state: SessionActivityAttributes.ContentState) -> String {
  let prefix = state.phase == "rest" ? "Siguiente: " : ""
  let tail = state.scheme.isEmpty ? "" : " · \(state.scheme)"
  return "\(prefix)\(state.exerciseName)\(tail)"
}

private struct LockScreenView: View {
  let context: Context

  var body: some View {
    let state = context.state
    HStack(alignment: .center, spacing: 14) {
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 6) {
          AuraSmall(size: 14)
          Text(context.attributes.routineName)
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(Palette.meta)
            .lineLimit(1)
        }
        Text(headline(state))
          .font(.system(size: 13, weight: .medium))
          .foregroundColor(.white.opacity(0.7))
        if state.phase != "done" {
          Text(exerciseLine(state))
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .lineLimit(2)
        }
        Text(state.progress)
          .font(.system(size: 12))
          .foregroundColor(Palette.meta)
          .monospacedDigit()
      }
      Spacer(minLength: 8)
      if state.phase == "rest" {
        Countdown(state: state, isStale: context.isStale, size: 40, weight: .semibold)
          .frame(minWidth: 96, alignment: .trailing)
      }
    }
    .padding(16)
  }
}

struct SessionLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: SessionActivityAttributes.self) { context in
      LockScreenView(context: context)
        .activityBackgroundTint(Palette.plate)
        .activitySystemActionForegroundColor(.white)
        .widgetURL(sessionURL(context.attributes))
    } dynamicIsland: { context in
      let state = context.state
      let resting = state.phase == "rest"
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            AuraSmall(size: 22)
            Text(headline(state))
              .font(.system(size: 14, weight: .semibold))
              .foregroundColor(.white)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if resting {
            Countdown(state: state, isStale: context.isStale, size: 34, weight: .semibold)
              .frame(minWidth: 84, alignment: .trailing)
              .padding(.trailing, 4)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 4) {
            if state.phase != "done" {
              Text(exerciseLine(state))
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.white)
                .lineLimit(1)
            }
            Text(state.progress)
              .font(.system(size: 12))
              .foregroundColor(Palette.meta)
              .monospacedDigit()
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        AuraSmall(size: 16)
      } compactTrailing: {
        if resting {
          Countdown(state: state, isStale: context.isStale, size: 14)
            .frame(width: 42, alignment: .trailing)
        } else {
          Text(state.paused ? "Pausa" : state.progress.components(separatedBy: " ").prefix(3).joined(separator: " "))
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(Palette.meta)
            .monospacedDigit()
            .lineLimit(1)
        }
      } minimal: {
        if resting {
          Countdown(state: state, isStale: context.isStale, size: 12)
            .frame(width: 34)
        } else {
          AuraSmall(size: 16)
        }
      }
      .widgetURL(sessionURL(context.attributes))
      .keylineTint(Palette.ember)
    }
  }
}
