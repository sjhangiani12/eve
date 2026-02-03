import Foundation

@MainActor
class WebSocketService: ObservableObject {
    @Published var isConnected = false
    @Published var messages: [WebSocketMessage] = []
    @Published var currentStatus: WorkspaceStatus?
    @Published var outputBuffer: String = ""

    private var webSocket: URLSessionWebSocketTask?
    private var workspaceId: String?

    func connect(to workspaceId: String) async {
        self.workspaceId = workspaceId
        messages = []
        outputBuffer = ""

        guard let url = await EveAPI.shared.webSocketURL(for: workspaceId) else {
            print("Failed to get WebSocket URL")
            return
        }

        let session = URLSession(configuration: .default)
        webSocket = session.webSocketTask(with: url)
        webSocket?.resume()

        isConnected = true
        await receiveMessages()
    }

    func disconnect() {
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        isConnected = false
    }

    func send(_ input: String) async throws {
        let message = WebSocketInputMessage(input: input)
        let data = try JSONEncoder().encode(message)
        guard let string = String(data: data, encoding: .utf8) else { return }
        try await webSocket?.send(.string(string))
    }

    private func receiveMessages() async {
        guard let webSocket else { return }

        do {
            while isConnected {
                let message = try await webSocket.receive()

                switch message {
                case .string(let text):
                    if let data = text.data(using: .utf8),
                       let wsMessage = try? JSONDecoder().decode(WebSocketMessage.self, from: data) {
                        handleMessage(wsMessage)
                    }
                case .data(let data):
                    if let wsMessage = try? JSONDecoder().decode(WebSocketMessage.self, from: data) {
                        handleMessage(wsMessage)
                    }
                @unknown default:
                    break
                }
            }
        } catch {
            print("WebSocket receive error: \(error)")
            isConnected = false
        }
    }

    private func handleMessage(_ message: WebSocketMessage) {
        messages.append(message)

        switch message.type {
        case .output:
            if let data = message.data {
                outputBuffer += data
            }
        case .status:
            if let status = message.status {
                currentStatus = status
            }
        case .error:
            print("WebSocket error: \(message.error ?? "Unknown")")
        case .connected:
            print("Connected to workspace: \(message.workspaceId ?? "Unknown")")
        }
    }
}
