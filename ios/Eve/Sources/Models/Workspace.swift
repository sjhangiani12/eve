import Foundation

enum WorkspaceStatus: String, Codable {
    case creating
    case active
    case waiting
    case idle
    case error
    case archived

    var displayName: String {
        switch self {
        case .creating: return "Creating"
        case .active: return "Active"
        case .waiting: return "Waiting"
        case .idle: return "Idle"
        case .error: return "Error"
        case .archived: return "Archived"
        }
    }

    var color: String {
        switch self {
        case .creating: return "blue"
        case .active: return "green"
        case .waiting: return "orange"
        case .idle: return "gray"
        case .error: return "red"
        case .archived: return "gray"
        }
    }
}

struct Workspace: Codable, Identifiable {
    let id: String
    let repositoryId: String
    let name: String
    let branchName: String
    let worktreePath: String
    let tmuxSession: String
    let status: WorkspaceStatus
    let allocatedPort: Int?
    let createdAt: TimeInterval
    let updatedAt: TimeInterval
    let lastActivityAt: TimeInterval

    var createdDate: Date {
        Date(timeIntervalSince1970: createdAt / 1000)
    }

    var lastActivityDate: Date {
        Date(timeIntervalSince1970: lastActivityAt / 1000)
    }
}

struct CreateWorkspaceRequest: Codable {
    let name: String
    let baseBranch: String?

    init(name: String, baseBranch: String? = nil) {
        self.name = name
        self.baseBranch = baseBranch
    }
}
