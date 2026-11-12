import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// Alive Minimalism on the system surfaces: dark plate, SF with tabular
// figures, Ember as the accent. The countdown runs on the system clock
// (Text(timerInterval:)), so iOS updates it without waking the app.
//
// Rest → set: iOS does not redraw a stale activity on time (it can take a
// minute or more), so the flow never depends on it. The rest state already
// shows the set that follows ("Siguiente: …", "Serie 1 de 3 · 10 × 110 kg") and
// its "Serie hecha ✓" button, which logs that set during the rest or after it.
// The staleDate is still the end of the rest: when iOS does redraw, the rest is
// drawn as the set in course ("Ahora", resolved(isStale:) below).
//
// Every string comes in the state, already in the athlete's language. With
// iOS 17+ the activity has a button (LiveActivityIntent, ios/…/
// LiveActivityIntents.swift): "Serie hecha ✓", or a link that opens the app
// where there is nothing to log from here. On iOS 16 the same view, without it.
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
    if !nowHeadline.isEmpty { next.headline = nowHeadline }
    next.prefix = ""
    next.scheme = setScheme
    next.compact = setCompact
    next.action = setAction
    return next
  }

  // "Descanso · 2 de 6": whatever part is empty is left out. Never an empty
  // string (the routine's name stands in), so the card always has a first line.
  fileprivate func headerLine(fallback: String) -> String {
    let line = [headline, progress].filter { !$0.isEmpty }.joined(separator: " · ")
    return line.isEmpty ? fallback : line
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

// now...end, read once. `ends > Date()` and then `Date()...ends` read the clock
// twice: if the rest ended in between, the range has its bounds reversed and
// the widget traps (an empty plate). nil: it has already run out.
private func countdownRange(to ends: Date) -> ClosedRange<Date>? {
  let now = Date()
  return ends > now ? now...ends : nil
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
      } else if let ends = state.restEndsAt, let range = countdownRange(to: ends) {
        Text(timerInterval: range, countsDown: true, showsHours: false)
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

// "Siguiente: Círculos de brazos" during a rest; the name alone otherwise (the
// set's own line goes under it).
private func exerciseLine(
  _ state: SessionActivityAttributes.ContentState,
  fallback: String
) -> String {
  let line = "\(state.prefix)\(state.exerciseName)"
  return state.exerciseName.isEmpty ? fallback : line
}

// A pill (40 pt, full radius): Ember for the main action, gray for the link
// that opens the app.
private func pill(_ title: String, primary: Bool) -> some View {
  Text(title)
    .font(.system(size: 15, weight: .semibold))
    .foregroundColor(primary ? Palette.onEmber : .white)
    .lineLimit(1)
    .minimumScaleFactor(0.8)
    .frame(maxWidth: .infinity)
    .frame(height: 40)
    .background(Capsule().fill(primary ? Palette.ember : Color.white.opacity(0.14)))
}

// "Serie 1 de 3 · 10 × 110 kg" (or the hint when there is no weight to log
// from here, or the line of a finished session).
private struct SetLine: View {
  let state: State

  private var text: String {
    switch state.action {
    case "chooseInApp": return state.hint.isEmpty ? state.scheme : state.hint
    case "openApp": return state.labels.doneHint
    default: return state.scheme
    }
  }

  private var warns: Bool { state.action == "chooseInApp" || state.action == "openApp" }

  var body: some View {
    if !text.isEmpty {
      Text(text)
        .font(.system(size: 15, weight: warns ? .semibold : .medium))
        .foregroundColor(warns ? Palette.ember : .white.opacity(0.85))
        .monospacedDigit()
        .lineLimit(1)
        .truncationMode(.tail)
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
      // No weight to log from here: the app opens on the set.
      if let url = sessionURL(attributes) {
        Link(destination: url) { pill(state.labels.chooseInApp, primary: false) }
      }
    case "openApp":
      if let url = sessionURL(attributes) {
        Link(destination: url) { pill(state.labels.openApp, primary: true) }
      }
    default:
      EmptyView()
    }
  }
}

// Lock Screen: 16 pt around, 8 pt between blocks, inside the ~160 pt a Live
// Activity gets. The three text rows plus the 40 pt button already fill it
// (16 + 16 pt margins, 3 × 8 pt gaps): the routine row ("{rutina} · n de total")
// is the one dropped, and its "n de total" goes after the "Descanso" / "Ahora"
// label instead of shrinking any text.
private struct LockScreenView: View {
  let context: Context

  var body: some View {
    let state = context.state.resolved(isStale: context.isStale)
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .center, spacing: 8) {
        VStack(alignment: .leading, spacing: 0) {
          Text(state.headerLine(fallback: context.attributes.routineName))
            .font(.system(size: 13))
            .foregroundColor(Palette.meta)
            .lineLimit(1)
            .truncationMode(.tail)
          if state.phase != "done" {
            Text(exerciseLine(state, fallback: context.attributes.routineName))
              .font(.system(size: 17, weight: .semibold))
              .foregroundColor(.white)
              .lineLimit(1)
              .truncationMode(.tail)
          }
        }
        Spacer(minLength: 8)
        if state.phase == "rest" {
          // Fixed width, not .fixedSize(): Text(timerInterval:) is greedy in
          // width, and its ideal width pushed the whole card wider than the
          // Lock Screen (an empty plate in the rest card, build 11). 96 pt fits
          // "10:00" at 40 pt; the text on the left is the one that yields.
          Countdown(state: state, size: 40, weight: .semibold)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .frame(width: 96, alignment: .trailing)
            .layoutPriority(1)
        }
      }
      SetLine(state: state)
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
            Text(state.headerLine(fallback: context.attributes.routineName))
              .font(.system(size: 13))
              .foregroundColor(Palette.meta)
              .lineLimit(1)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if resting {
            Countdown(state: state, size: 32, weight: .semibold)
              .frame(minWidth: 84, alignment: .trailing)
              .padding(.trailing, 4)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 8) {
            if state.phase != "done" {
              Text(exerciseLine(state, fallback: context.attributes.routineName))
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(.white)
                .lineLimit(1)
                .truncationMode(.tail)
            }
            SetLine(state: state)
            ActionRow(state: state, attributes: context.attributes)
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
          // Never an empty compact slot: the progress ("2 de 6") stands in.
          Text(state.compact.isEmpty ? state.progress : state.compact)
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
