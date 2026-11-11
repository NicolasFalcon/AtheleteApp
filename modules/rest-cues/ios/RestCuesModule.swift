import AVFoundation
import ExpoModulesCore
import Foundation

struct RestCueEvent: Record {
  // rest-warn · rest-tick · rest-tick-strong · rest-go (a .caf of the bundle).
  @Field var id: String = ""
  // Seconds before the end of the rest (0: at the end).
  @Field var offsetFromEnd: Double = 0
}

struct RestCuesPlan: Record {
  // Epoch milliseconds (JS Date.getTime()).
  @Field var restEndsAt: Double = 0
  @Field var events: [RestCueEvent] = []
}

// The rest cues at absolute times, so they sound with the app in the
// background or the screen locked (the JS timer is suspended there). JS
// decides whether they sound at all (Ajustes · Sonido, the session switch).
// At the end of the rest it also posts `RestCuePlayer.restEnded` (the Live
// Activity takes its next state there, with the app in the background). Never
// throws: on any error the cue is simply silent.
public class RestCuesModule: Module {
  private let player = RestCuePlayer()

  public func definition() -> ModuleDefinition {
    Name("RestCues")

    // true when at least one cue is still ahead and got scheduled. The end of
    // the rest is also announced (RestCuePlayer.restEnded) while cues run.
    // With no cue to play nothing starts: the audio background mode is for
    // sound that is heard.
    AsyncFunction("schedule") { (plan: RestCuesPlan) -> Bool in
      let cues = plan.events.map { event in
        (id: event.id, at: Date(timeIntervalSince1970: plan.restEndsAt / 1000 - event.offsetFromEnd))
      }
      return self.player.schedule(cues, endAt: Date(timeIntervalSince1970: plan.restEndsAt / 1000))
    }.runOnQueue(.main)

    // Stops every cue and gives the audio session back. Idempotent.
    AsyncFunction("cancel") {
      self.player.release()
    }.runOnQueue(.main)

    OnDestroy {
      let player = self.player
      DispatchQueue.main.async {
        player.release()
      }
    }
  }
}

// Owns the audio session only while a rest has cues ahead:
// - from the schedule to 1 s before the first cue: .playback + .mixWithOthers
//   (the engine renders silence, which keeps the app running in the
//   background without touching the user's music);
// - from there to the end of the last cue: + .duckOthers (the music dips);
// - then the engine stops, the previous category (expo-audio's ambient) is
//   restored and the session deactivated, so the music comes back and the
//   app is no longer "playing".
// Main thread only.
final class RestCuePlayer {
  // Posted once, when the rest reaches its end, from the same clock that
  // sounds rest-go: userInfo ["restEndsAt": epoch ms]. A plain name, so the
  // Live Activity module listens without depending on this pod.
  static let restEnded = Notification.Name("com.athelete.restCues.restEnded")

  private struct Cue {
    let buffer: AVAudioPCMBuffer
    let at: Date
    var end: Date { at.addingTimeInterval(Double(buffer.frameLength) / buffer.format.sampleRate) }
  }

  private static let duckLead: TimeInterval = 1
  private static let releaseTail: TimeInterval = 0.2

  private let engine = AVAudioEngine()
  private let silence = AVAudioPlayerNode()
  private var nodes: [AVAudioPlayerNode] = []
  private var buffers: [String: AVAudioPCMBuffer] = [:]
  private var format: AVAudioFormat?
  private var graphReady = false

  private var cues: [Cue] = []
  private var endAt: Date?
  private var endAnnounced = false
  private var timer: DispatchSourceTimer?
  private var observers: [NSObjectProtocol] = []
  private var ownsSession = false
  private var ducking = false
  private var saved: (category: AVAudioSession.Category, mode: AVAudioSession.Mode, options: AVAudioSession.CategoryOptions)?

  func schedule(_ plan: [(id: String, at: Date)], endAt end: Date) -> Bool {
    stopPlayback()
    let now = Date()
    cues = plan
      .filter { $0.at.timeIntervalSince(now) > 0.05 }
      .compactMap { item in buffer(for: item.id).map { Cue(buffer: $0, at: item.at) } }
      .sorted { $0.at < $1.at }
    endAt = end
    endAnnounced = false
    guard !cues.isEmpty, takeSession() else {
      release()
      return false
    }
    guard startEngine() else {
      release()
      return false
    }
    startTimer()
    return true
  }

  func release() {
    stopPlayback()
    cues = []
    endAt = nil
    observers.forEach(NotificationCenter.default.removeObserver)
    observers = []
    guard ownsSession else { return }
    ownsSession = false
    ducking = false
    let session = AVAudioSession.sharedInstance()
    if let saved {
      try? session.setCategory(saved.category, mode: saved.mode, options: saved.options)
    }
    saved = nil
    try? session.setActive(false, options: [.notifyOthersOnDeactivation])
  }

  // ── Session ────────────────────────────────────────────────────────────────
  private func takeSession() -> Bool {
    let session = AVAudioSession.sharedInstance()
    if ducking {
      // A reschedule inside the duck window (+30 s): the music comes back
      // until the new window. Undocking needs the session off for a moment.
      try? session.setActive(false, options: [.notifyOthersOnDeactivation])
      ducking = false
    }
    if !ownsSession {
      saved = (session.category, session.mode, session.categoryOptions)
    }
    do {
      try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
      try session.setActive(true)
    } catch {
      return false
    }
    if !ownsSession {
      ownsSession = true
      observe()
    }
    return true
  }

  private func duck() {
    ducking = true
    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers, .duckOthers])
    try? session.setActive(true)
    // A category change can stop the engine; the next tick restarts it.
  }

  // The engine stops on an interruption (a call, Siri) or a route or
  // configuration change: it restarts with the cues still ahead.
  private func observe() {
    let center = NotificationCenter.default
    let recover: (Notification) -> Void = { [weak self] _ in
      DispatchQueue.main.async { self?.tick() }
    }
    observers = [
      center.addObserver(forName: .AVAudioEngineConfigurationChange, object: engine, queue: .main, using: recover),
      center.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main, using: recover),
      center.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: .main, using: recover),
    ]
  }

  // ── Engine ─────────────────────────────────────────────────────────────────
  private func startEngine() -> Bool {
    guard let format else { return false }
    buildGraph(format: format)
    if !engine.isRunning {
      engine.prepare()
      do {
        try engine.start()
      } catch {
        return false
      }
    }
    // Silence on a loop: the audio keeps running between the cues.
    silence.stop()
    silence.scheduleBuffer(silenceBuffer(format: format), at: nil, options: .loops, completionHandler: nil)
    silence.play()
    scheduleCues()
    return true
  }

  // One node per cue: the files last longer than the 1 s between ticks, and
  // one node would queue them instead of overlapping.
  private func buildGraph(format: AVAudioFormat) {
    if !graphReady {
      engine.attach(silence)
      engine.connect(silence, to: engine.mainMixerNode, format: format)
      graphReady = true
    }
    while nodes.count < cues.count {
      let node = AVAudioPlayerNode()
      engine.attach(node)
      engine.connect(node, to: engine.mainMixerNode, format: format)
      nodes.append(node)
    }
  }

  private func scheduleCues() {
    let now = Date()
    for (index, cue) in cues.enumerated() {
      let node = nodes[index]
      node.stop()
      // Already sounded (or due right now): not again after a restart.
      guard cue.at.timeIntervalSince(now) > -0.02 else { continue }
      let delta = max(0, cue.at.timeIntervalSince(now))
      let when = AVAudioTime(hostTime: mach_absolute_time() + AVAudioTime.hostTime(forSeconds: delta))
      node.scheduleBuffer(cue.buffer, at: when, options: [], completionHandler: nil)
      node.play()
    }
  }

  private func stopPlayback() {
    timer?.cancel()
    timer = nil
    nodes.forEach { $0.stop() }
    silence.stop()
    if engine.isRunning {
      engine.stop()
    }
  }

  // ── Clock ──────────────────────────────────────────────────────────────────
  // Runs while the engine keeps the app alive: opens the duck window, ends
  // the rest and restarts a stopped engine.
  private func startTimer() {
    let source = DispatchSource.makeTimerSource(queue: .main)
    source.schedule(deadline: .now(), repeating: .milliseconds(250))
    source.setEventHandler { [weak self] in self?.tick() }
    timer = source
    source.resume()
  }

  private func tick() {
    guard ownsSession else { return }
    let now = Date()
    // The rest reached zero: announced once, before the session is let go.
    if !endAnnounced, let endAt, now >= endAt {
      endAnnounced = true
      NotificationCenter.default.post(
        name: Self.restEnded,
        object: nil,
        userInfo: ["restEndsAt": endAt.timeIntervalSince1970 * 1000]
      )
    }
    // The session is let go after the last cue and after the end of the rest.
    let last = max(cues.map(\.end).max() ?? now, endAt ?? now)
    if now >= last.addingTimeInterval(Self.releaseTail) {
      release()
      return
    }
    if !ducking, let first = cues.first, now >= first.at.addingTimeInterval(-Self.duckLead) {
      duck()
    }
    if !engine.isRunning {
      try? AVAudioSession.sharedInstance().setActive(true)
      _ = startEngine()
    }
  }

  // ── Files ──────────────────────────────────────────────────────────────────
  private static let bundle: Bundle = {
    for base in [Bundle(for: RestCuePlayer.self), Bundle.main] {
      if let url = base.url(forResource: "RestCues", withExtension: "bundle"), let bundle = Bundle(url: url) {
        return bundle
      }
    }
    return Bundle(for: RestCuePlayer.self)
  }()

  private func buffer(for id: String) -> AVAudioPCMBuffer? {
    if let cached = buffers[id] {
      return cached
    }
    guard
      let url = Self.bundle.url(forResource: id, withExtension: "caf"),
      let file = try? AVAudioFile(forReading: url),
      let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length)),
      (try? file.read(into: buffer)) != nil
    else {
      return nil
    }
    // Every cue shares the format of the first one loaded (48 kHz mono).
    if format == nil {
      format = file.processingFormat
    }
    guard file.processingFormat == format else { return nil }
    buffers[id] = buffer
    return buffer
  }

  private var silent: AVAudioPCMBuffer?
  private func silenceBuffer(format: AVAudioFormat) -> AVAudioPCMBuffer {
    if let silent {
      return silent
    }
    let frames = AVAudioFrameCount(format.sampleRate)
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames)!
    buffer.frameLength = frames
    if let channels = buffer.floatChannelData {
      for channel in 0..<Int(format.channelCount) {
        channels[channel].update(repeating: 0, count: Int(frames))
      }
    }
    silent = buffer
    return buffer
  }
}
