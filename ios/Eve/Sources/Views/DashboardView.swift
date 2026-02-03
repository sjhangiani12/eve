import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var showingNewWorkspace = false
    @State private var selectedRepository: Repository?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    // Repositories section
                    ForEach(viewModel.repositories) { repo in
                        RepositorySection(
                            repository: repo,
                            workspaces: viewModel.workspaces.filter { $0.repositoryId == repo.id },
                            onCreateWorkspace: {
                                selectedRepository = repo
                                showingNewWorkspace = true
                            }
                        )
                    }

                    if viewModel.repositories.isEmpty && !viewModel.isLoading {
                        EmptyStateView()
                    }
                }
                .padding()
            }
            .navigationTitle("Eve")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Refresh", systemImage: "arrow.clockwise") {
                            Task { await viewModel.refresh() }
                        }
                        Button("Settings", systemImage: "gear") {
                            // TODO: Settings
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.load()
            }
            .sheet(isPresented: $showingNewWorkspace) {
                if let repo = selectedRepository {
                    NewWorkspaceView(repository: repo) { workspace in
                        viewModel.workspaces.insert(workspace, at: 0)
                    }
                }
            }
        }
    }
}

struct RepositorySection: View {
    let repository: Repository
    let workspaces: [Workspace]
    let onCreateWorkspace: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Repository header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(repository.name)
                        .font(.headline)
                    Text(repository.rootPath)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                Button(action: onCreateWorkspace) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.blue)
                }
            }
            .padding(.horizontal, 4)

            // Workspaces
            if workspaces.isEmpty {
                Text("No workspaces")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 20)
                    .frame(maxWidth: .infinity)
            } else {
                ForEach(workspaces) { workspace in
                    NavigationLink(destination: WorkspaceDetailView(workspace: workspace)) {
                        WorkspaceCard(workspace: workspace)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct WorkspaceCard: View {
    let workspace: Workspace

    var body: some View {
        HStack(spacing: 12) {
            // Status indicator
            Circle()
                .fill(statusColor)
                .frame(width: 10, height: 10)

            VStack(alignment: .leading, spacing: 2) {
                Text(workspace.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(workspace.branchName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            StatusBadge(status: workspace.status)

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    var statusColor: Color {
        switch workspace.status {
        case .active: return .green
        case .waiting: return .orange
        case .idle: return .gray
        case .creating: return .blue
        case .error: return .red
        case .archived: return .gray.opacity(0.5)
        }
    }
}

struct StatusBadge: View {
    let status: WorkspaceStatus

    var body: some View {
        Text(status.displayName)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(backgroundColor)
            .foregroundStyle(foregroundColor)
            .clipShape(Capsule())
    }

    var backgroundColor: Color {
        switch status {
        case .active: return .green.opacity(0.2)
        case .waiting: return .orange.opacity(0.2)
        case .idle: return .gray.opacity(0.2)
        case .creating: return .blue.opacity(0.2)
        case .error: return .red.opacity(0.2)
        case .archived: return .gray.opacity(0.1)
        }
    }

    var foregroundColor: Color {
        switch status {
        case .active: return .green
        case .waiting: return .orange
        case .idle: return .gray
        case .creating: return .blue
        case .error: return .red
        case .archived: return .gray
        }
    }
}

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "folder.badge.plus")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No repositories")
                .font(.headline)

            Text("Register a repository via the Eve daemon to get started.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }
}

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var repositories: [Repository] = []
    @Published var workspaces: [Workspace] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let reposTask = EveAPI.shared.listRepositories()
            async let workspacesTask = EveAPI.shared.listWorkspaces()

            repositories = try await reposTask
            workspaces = try await workspacesTask
        } catch {
            self.error = error.localizedDescription
        }
    }

    func refresh() async {
        await load()
    }
}

#Preview {
    DashboardView()
        .environmentObject(AppState())
}
