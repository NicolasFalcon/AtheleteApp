import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// Alive Minimalism on the system surfaces: dark plate, SF with tabular
// figures, Ember as the accent. The countdown runs on the system clock
// (Text(timerInterval:)), so iOS updates it without waking the app.
//
// Rest → set with no help from the app: the activity's staleDate is the end of
// the rest, so iOS draws the widget again with context.isStale true when it
// runs out. A stale rest is drawn as the set in course ("Ahora", the set's
// line and "Serie hecha ✓") from the `set*` fields the same state carries
// (resolved(isStale:) below). No audio or background work is involved.
//
// Every string comes in the state, already in the athlete's language. With
// iOS 17+ the activity has buttons (LiveActivityIntent, ios/…/
// LiveActivityIntents.swift): "Saltar" during a rest and "Serie hecha ✓" on
// the set in course; links that open the app where there is nothing to log
// from here. On iOS 16 the same view, without buttons.
private enum Palette {
  static let plate = Color(red: 0x14 / 255, green: 0x13 / 255, blue: 0x12 / 255)
  static let ember = Color(red: 0xFF / 255, green: 0x5B / 255, blue: 0x1F / 255)
  static let warning = Color(red: 0xD8 / 255, green: 0x6B / 255, blue: 0x6B / 255)
  static let meta = Color(red: 0xA8 / 255, green: 0xA6 / 255, blue: 0xA1 / 255)
  static let track = Color.white.opacity(0.18)
  static let onEmber = Color(red: 0x12 / 255, green: 0x12 / 255, blue: 0x12 / 255)
}

private typealias Context = ActivityViewContext<SessionActivityAttributes>
private typealias State = SessionActivityAttributes.ContentState

extension SessionActivityAttributes.ContentState {
  // A running rest that has run out (the activity is stale from its end): the
  // set that follows, in course. Anything else is drawn as it comes.
  fileprivate func resolved(isStale: Bool) -> State {
    guard isStale, phase == "rest", !paused else { return self }
    var next = self
    next.phase = "exercise"
    next.restEndsAt = nil
    next.headline = nowHeadline
    next.prefix = ""
    next.scheme = setScheme
    next.compact = setCompact
    next.action = setAction
    return next
  }
}

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
  var size: CGFloat = 15
  var weight: Font.Weight = .semibold

  var body: some View {
    Group {
      if state.paused {
        Text(clock(state.pausedRemainingSec ?? 0))
          .foregroundColor(Palette.meta)
      } else if let ends = state.restEndsAt, ends > Date() {
        Text(timerInterval: Date()...ends, countsDown: true, showsHours: false)
          .foregroundColor(Palette.ember)
      } else {
        // Ran out and the system has not drawn it stale yet: 0:00.
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

// "Siguiente: Círculos de brazos · 3 × 10" during a rest; the name alone
// otherwise (the set's own line goes under it).
private func exerciseLine(_ state: SessionActivityAttributes.ContentState) -> String {
  if state.phase == "rest" {
    let tail = state.scheme.isEmpty ? "" : " · \(state.scheme)"
    return "\(state.prefix)\(state.exerciseName)\(tail)"
  }
  return state.exerciseName
}

// A pill: Ember for the main action, a light plate for the secondary one.
private func pill(_ title: String, primary: Bool) -> some View {
  Text(title)
    .font(.system(size: 15, weight: .semibold))
    .foregroundColor(primary ? Palette.onEmber : .white)
    .lineLimit(1)
    .minimumScaleFactor(0.8)
    .frame(maxWidth: .infinity, minHeight: 40)
    .background(Capsule().fill(primary ? Palette.ember : Color.white.opacity(0.14)))
}

// The set in course ("Serie 2 de 3 · 10 reps × 40 kg") under the exercise.
private struct SetLine: View {
  let state: SessionActivityAttributes.ContentState

  var body: some View {
    if state.phase == "exercise", !state.scheme.isEmpty {
      Text(state.scheme)
        .font(.system(size: 14, weight: .medium))
        .foregroundColor(.white.opacity(0.85))
        .monospacedDigit()
        .lineLimit(2)
    }
  }
}

// The buttons of the activity (iOS 17+); nothing before.
private struct ActionRow: View {
  let state: State
  let attributes: SessionActivityAttributes

  var body: some View {
    if #available(iOS 17.0, *) {
      ActionButtons(state: state, attributes: attributes)
    }
  }
}

@available(iOS 17.0, *)
private struct ActionButtons: View {
  let state: State
  let attributes: SessionActivityAttributes

  var body: some View {
    switch state.action {
    case "skipRest":
      Button(intent: SkipRestIntent(sessionId: attributes.sessionId)) {
        pill(state.labels.skip, primary: false)
      }
      .buttonStyle(.plain)
    case "completeSet":
      Button(
        intent: CompleteSetIntent(
          sessionId: attributes.sessionId,
          position: state.position,
          setIndex: state.setIndex
        )
      ) {
        pill(state.labels.setDone, primary: true)
      }
      .buttonStyle(.plain)
    case "chooseInApp":
      // No weight (or reps) to log from here: the app opens on the set.
      VStack(alignment: .leading, spacing: 8) {
        Text(state.hint)
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(Palette.ember)
          .lineLimit(2)
        if let url = sessionURL(attributes) {
          Link(destination: url) { pill(state.labels.chooseInApp, primary: false) }
        }
      }
    case "openApp":
      VStack(alignment: .leading, spacing: 8) {
        Text(state.labels.doneHint)
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(Palette.ember)
          .lineLimit(2)
        if let url = sessionURL(attributes) {
          Link(destination: url) { pill(state.labels.openApp, primary: true) }
        }
      }
    default:
      EmptyView()
    }
  }
}

private struct LockScreenView: View {
  let context: Context

  var body: some View {
    let state = context.state.resolved(isStale: context.isStale)
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .center, spacing: 14) {
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 6) {
            AuraSmall(size: 14)
            Text(context.attributes.routineName)
              .font(.system(size: 13, weight: .semibold))
              .foregroundColor(Palette.meta)
              .lineLimit(1)
          }
          Text(state.headline)
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(.white.opacity(0.7))
          if state.phase != "done" {
            Text(exerciseLine(state))
              .font(.system(size: 16, weight: .semibold))
              .foregroundColor(.white)
              .lineLimit(2)
            SetLine(state: state)
          }
          Text(state.progress)
            .font(.system(size: 12))
            .foregroundColor(Palette.meta)
            .monospacedDigit()
        }
        Spacer(minLength: 8)
        if state.phase == "rest" {
          Countdown(state: state, size: 40, weight: .semibold)
            .frame(minWidth: 96, alignment: .trailing)
        }
      }
      ActionRow(state: state, attributes: context.attributes)
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
      let state = context.state.resolved(isStale: context.isStale)
      let resting = state.phase == "rest"
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            AuraSmall(size: 22)
            Text(state.headline)
              .font(.system(size: 14, weight: .semibold))
              .foregroundColor(.white)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if resting {
            Countdown(state: state, size: 34, weight: .semibold)
              .frame(minWidth: 84, alignment: .trailing)
              .padding(.trailing, 4)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 6) {
            if state.phase != "done" {
              Text(exerciseLine(state))
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.white)
                .lineLimit(1)
              SetLine(state: state)
            }
            Text(state.progress)
              .font(.system(size: 12))
              .foregroundColor(Palette.meta)
              .monospacedDigit()
            ActionRow(state: state, attributes: context.attributes)
              .padding(.top, 2)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        AuraSmall(size: 16)
      } compactTrailing: {
        if resting {
          Countdown(state: state, size: 14)
            .frame(width: 42, alignment: .trailing)
        } else {
          Text(state.compact)
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(Palette.meta)
            .monospacedDigit()
            .lineLimit(1)
        }
      } minimal: {
        if resting {
          Countdown(state: state, size: 12)
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
