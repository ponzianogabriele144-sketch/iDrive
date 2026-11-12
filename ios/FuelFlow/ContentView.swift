import SwiftUI
import WebKit
import AVFoundation

struct LocalWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        weak var webView: WKWebView?
        var pendingQueryString: String?
        var isConnectedToCarAudio: Bool = false
        var lastConnectedBtName: String = ""

        override init() {
            super.init()
            setupBluetoothAudioRouteObserver()
            setupDeepLinkObserver()
        }

        // Se iOS sospende il processo WebContent per risparmiare memoria, ricarica automaticamente
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            if let query = pendingQueryString {
                pendingQueryString = nil
                forwardAutomationQueryToJS(query)
            }
            checkCurrentAudioRouteAndNotify(initialCheck: true)
        }

        private func setupDeepLinkObserver() {
            NotificationCenter.default.addObserver(
                forName: Notification.Name("iDriveIncomingDeepLink"),
                object: nil,
                queue: .main
            ) { [weak self] notif in
                guard let self = self, let query = notif.userInfo?["query"] as? String else { return }
                if let wv = self.webView, !wv.isLoading {
                    self.forwardAutomationQueryToJS(query)
                } else {
                    self.pendingQueryString = query
                }
            }
        }

        private func forwardAutomationQueryToJS(_ query: String) {
            let safeQuery = query.replacingOccurrences(of: "'", with: "\\'")
            let js = "if (window.handleIncomingAutomationUrl) { window.handleIncomingAutomationUrl('\(safeQuery)'); }"
            webView?.evaluateJavaScript(js, completionHandler: nil)
        }

        // Rilevamento nativo connessione/disconnessione Bluetooth Auto o CarPlay tramite AVAudioSession
        private func setupBluetoothAudioRouteObserver() {
            do {
                try AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers, .allowBluetooth])
                try AVAudioSession.sharedInstance().setActive(true)
            } catch {
                // Continua in modalità passiva
            }

            NotificationCenter.default.addObserver(
                forName: AVAudioSession.routeChangeNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                self?.checkCurrentAudioRouteAndNotify(initialCheck: false)
            }
        }

        private func checkCurrentAudioRouteAndNotify(initialCheck: Bool) {
            let outputs = AVAudioSession.sharedInstance().currentRoute.outputs
            let carPortTypes: [AVAudioSession.Port] = [.bluetoothA2DP, .bluetoothHFP, .bluetoothLE, .carAudio]
            if let carOutput = outputs.first(where: { carPortTypes.contains($0.portType) }) {
                if !isConnectedToCarAudio {
                    isConnectedToCarAudio = true
                    lastConnectedBtName = carOutput.portName
                    let safeName = carOutput.portName.replacingOccurrences(of: "'", with: "\\'")
                    let js = "if (window.onNativeBtRouteChange) { window.onNativeBtRouteChange('connect', '\(safeName)'); }"
                    webView?.evaluateJavaScript(js, completionHandler: nil)
                }
            } else if isConnectedToCarAudio && !initialCheck {
                isConnectedToCarAudio = false
                let safeName = lastConnectedBtName.replacingOccurrences(of: "'", with: "\\'")
                let js = "if (window.onNativeBtRouteChange) { window.onNativeBtRouteChange('disconnect', '\(safeName)'); }"
                webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        
        let webView = WKWebView(frame: .zero, configuration: config)
        context.coordinator.webView = webView
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.035, green: 0.035, blue: 0.043, alpha: 1.0)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = true
        
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif
        
        // Caricamento del bundle HTML offline locale 100% autonomo
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            let access = Bundle.main.resourceURL ?? url.deletingLastPathComponent()
            webView.loadFileURL(url, allowingReadAccessTo: access)
        } else if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            let access = Bundle.main.resourceURL ?? url.deletingLastPathComponent()
            webView.loadFileURL(url, allowingReadAccessTo: access)
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct ContentView: View {
    var body: some View {
        ZStack {
            Color(red: 0.035, green: 0.035, blue: 0.043)
                .ignoresSafeArea()
            LocalWebView()
                .ignoresSafeArea(.all)
        }
        .onOpenURL { url in
            if let query = url.query {
                NotificationCenter.default.post(
                    name: Notification.Name("iDriveIncomingDeepLink"),
                    object: nil,
                    userInfo: ["query": "?" + query]
                )
            }
        }
    }
}
