import Foundation

enum WebSocketMessageType: String, Codable {
    case output
    case status
    case error
    case connected
}

struct WebSocketMessage: Codable {
    let type: WebSocketMessageType
    let data: String?
    let status: WorkspaceStatus?
    let error: String?
    let workspaceId: String?
    let timestamp: TimeInterval
}

struct WebSocketInputMessage: Codable {
    let type: String = "input"
    let input: String
}
