import SwiftUI

@main
struct EveApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

@MainActor
class AppState: ObservableObject {
    @Published var serverHost: String {
        didSet {
            UserDefaults.standard.set(serverHost, forKey: "serverHost")
            configureAPI()
        }
    }
    @Published var serverPort: Int {
        didSet {
            UserDefaults.standard.set(serverPort, forKey: "serverPort")
            configureAPI()
        }
    }
    @Published var isConfigured: Bool = false

    init() {
        self.serverHost = UserDefaults.standard.string(forKey: "serverHost") ?? ""
        self.serverPort = UserDefaults.standard.integer(forKey: "serverPort")
        if serverPort == 0 { serverPort = 4778 }

        if !serverHost.isEmpty {
            configureAPI()
        }
    }

    func configureAPI() {
        guard !serverHost.isEmpty else {
            isConfigured = false
            return
        }
        Task {
            await EveAPI.shared.configure(host: serverHost, port: serverPort)
            isConfigured = true
        }
    }
}
