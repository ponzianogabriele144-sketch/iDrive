import SwiftUI
import WebKit

struct LocalWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        // Se iOS sospende il processo WebContent per risparmiare memoria, ricarica automaticamente
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        
        let webView = WKWebView(frame: .zero, configuration: config)
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
    }
}
