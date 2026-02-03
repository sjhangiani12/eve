import Foundation

actor EveAPI {
    static let shared = EveAPI()

    private var baseURL: URL?

    func configure(host: String, port: Int = 4778) {
        baseURL = URL(string: "http://\(host):\(port)")
    }

    private func request<T: Decodable>(_ endpoint: String, method: String = "GET", body: Data? = nil) async throws -> T {
        guard let baseURL else {
            throw EveError.notConfigured
        }

        var request = URLRequest(url: baseURL.appendingPathComponent(endpoint))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw EveError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw EveError.serverError(errorResponse.error)
            }
            throw EveError.httpError(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    }

    private func requestVoid(_ endpoint: String, method: String = "GET", body: Data? = nil) async throws {
        guard let baseURL else {
            throw EveError.notConfigured
        }

        var request = URLRequest(url: baseURL.appendingPathComponent(endpoint))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw EveError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw EveError.serverError(errorResponse.error)
            }
            throw EveError.httpError(httpResponse.statusCode)
        }
    }

    // MARK: - Repositories

    func listRepositories() async throws -> [Repository] {
        try await request("/repositories")
    }

    func getRepository(_ id: String) async throws -> RepositoryWithWorkspaces {
        try await request("/repositories/\(id)")
    }

    func createRepository(name: String, rootPath: String) async throws -> Repository {
        let body = try JSONEncoder().encode(["name": name, "rootPath": rootPath])
        return try await request("/repositories", method: "POST", body: body)
    }

    func deleteRepository(_ id: String) async throws {
        try await requestVoid("/repositories/\(id)", method: "DELETE")
    }

    // MARK: - Workspaces

    func listWorkspaces() async throws -> [Workspace] {
        try await request("/workspaces")
    }

    func getWorkspace(_ id: String) async throws -> Workspace {
        try await request("/workspaces/\(id)")
    }

    func createWorkspace(repositoryId: String, name: String, baseBranch: String? = nil) async throws -> Workspace {
        var params: [String: String] = ["name": name]
        if let baseBranch { params["baseBranch"] = baseBranch }
        let body = try JSONEncoder().encode(params)
        return try await request("/repositories/\(repositoryId)/workspaces", method: "POST", body: body)
    }

    func sendInput(workspaceId: String, input: String) async throws {
        let body = try JSONEncoder().encode(["input": input])
        try await requestVoid("/workspaces/\(workspaceId)/input", method: "POST", body: body)
    }

    func archiveWorkspace(_ id: String) async throws {
        try await requestVoid("/workspaces/\(id)/archive", method: "POST")
    }

    func deleteWorkspace(_ id: String) async throws {
        try await requestVoid("/workspaces/\(id)", method: "DELETE")
    }

    // MARK: - WebSocket URL

    func webSocketURL(for workspaceId: String) -> URL? {
        guard let baseURL else { return nil }
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        components?.scheme = "ws"
        components?.path = "/ws"
        components?.queryItems = [URLQueryItem(name: "workspaceId", value: workspaceId)]
        return components?.url
    }
}

struct ErrorResponse: Codable {
    let error: String
}

enum EveError: LocalizedError {
    case notConfigured
    case invalidResponse
    case httpError(Int)
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Eve API not configured. Please set the server address."
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .serverError(let message):
            return message
        }
    }
}
