import SwiftUI
import WidgetKit

// Entry point of the AtheleteLiveActivity extension: only the workout Live
// Activity (no home-screen widgets).
@main
struct AtheleteLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    SessionLiveActivity()
  }
}
