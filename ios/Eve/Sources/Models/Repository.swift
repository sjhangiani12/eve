import Foundation

struct Repository: Codable, Identifiable {
    let id: String
    let name: String
    let rootPath: String
    let config: RepositoryConfig
    let createdAt: TimeInterval
    let updatedAt: TimeInterval

    var createdDate: Date {
        Date(timeIntervalSince1970: createdAt / 1000)
    }
}

struct RepositoryConfig: Codable {
    var setupScript: String?
    var archiveScript: String?
    var portBase: Int?
    var portIncrement: Int?
    var env: [String: String]?
}

struct RepositoryWithWorkspaces: Codable {
    let repository: Repository
    let workspaces: [Workspace]
}
