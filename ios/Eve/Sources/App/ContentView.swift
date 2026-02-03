import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        if appState.isConfigured {
            DashboardView()
        } else {
            SetupView()
        }
    }
}

struct SetupView: View {
    @EnvironmentObject var appState: AppState
    @State private var host: String = ""
    @State private var port: String = "4778"

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Server IP or hostname", text: $host)
                        .textContentType(.URL)
                        .autocapitalization(.none)
                        .keyboardType(.URL)

                    TextField("Port", text: $port)
                        .keyboardType(.numberPad)
                } header: {
                    Text("Eve Server")
                } footer: {
                    Text("Enter the IP address of your Mac running the Eve daemon. If using Tailscale, enter the Tailscale IP.")
                }

                Section {
                    Button("Connect") {
                        if let portInt = Int(port) {
                            appState.serverHost = host
                            appState.serverPort = portInt
                        }
                    }
                    .disabled(host.isEmpty)
                }
            }
            .navigationTitle("Eve Setup")
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
