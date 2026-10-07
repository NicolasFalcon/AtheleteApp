import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // The window is created by SceneDelegate: the iOS 27 SDK requires the
    // UIScene life cycle (apps without it fail to launch).
    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role
    )
  }

  // Universal links. Inactive until an Associated Domains entitlement exists.
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let factory = (UIApplication.shared.delegate as? AppDelegate)?
        .reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window

    // Cold start from a link (athelete://…): hand the URL to React Native as
    // a launch option so Linking.getInitialURL() still returns it.
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    // Same colour as LaunchScreen.storyboard, so no white frame shows while
    // the JS bundle loads.
    let background = UIColor(named: "LaunchBackground")
    window.backgroundColor = background

    factory.startReactNative(
      withModuleName: "Athelete",
      in: window,
      launchOptions: launchOptions
    )

    // Until React paints its first frame (the LaunchOverlay), repeat the
    // launch screen: same background and isologo in the same place.
    if let rootView = window.rootViewController?.view
      as? RCTSurfaceHostingProxyRootView
    {
      let loading = UIView()
      loading.backgroundColor = background
      let logo = UIImageView(image: UIImage(named: "LaunchLogo"))
      let wordmark = UIImageView(image: UIImage(named: "LaunchWordmark"))
      for view in [logo, wordmark] {
        view.contentMode = .scaleAspectFit
        view.translatesAutoresizingMaskIntoConstraints = false
        loading.addSubview(view)
      }
      // Measures of LaunchScreen.storyboard (design/launch-screen/INTEGRACION.md).
      NSLayoutConstraint.activate([
        logo.centerXAnchor.constraint(equalTo: loading.centerXAnchor),
        logo.centerYAnchor.constraint(equalTo: loading.centerYAnchor),
        logo.widthAnchor.constraint(equalToConstant: 96),
        logo.heightAnchor.constraint(equalToConstant: 96),
        wordmark.centerXAnchor.constraint(equalTo: loading.centerXAnchor),
        wordmark.bottomAnchor.constraint(
          equalTo: loading.safeAreaLayoutGuide.bottomAnchor, constant: -44),
        wordmark.widthAnchor.constraint(equalToConstant: 112),
        wordmark.heightAnchor.constraint(equalToConstant: 9.15),
      ])
      rootView.backgroundColor = background
      rootView.loadingView = loading
      rootView.loadingViewFadeDelay = 0.15
      rootView.loadingViewFadeDuration = 0.1
    }
  }

  // Forwards custom-scheme URLs (athelete://…) to React Native's Linking
  // while the app is running (e.g. password recovery, dev tools).
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      RCTLinkingManager.application(
        UIApplication.shared,
        open: context.url,
        options: [:]
      )
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
