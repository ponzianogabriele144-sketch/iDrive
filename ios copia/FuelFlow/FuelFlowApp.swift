import SwiftUI

@main
struct FuelFlowApp: App {
    init() {
        // Impedisce lo standby automatico dello schermo durante la marcia
        UIApplication.shared.isIdleTimerDisabled = true
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
