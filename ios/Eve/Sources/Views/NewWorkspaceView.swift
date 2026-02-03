import SwiftUI

struct NewWorkspaceView: View {
    let repository: Repository
    let onCreated: (Workspace) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var baseBranch = ""
    @State private var isCreating = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Workspace name", text: $name)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()

                    TextField("Base branch (optional)", text: $baseBranch)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()
                } header: {
                    Text("New Workspace")
                } footer: {
                    Text("A git worktree will be created with branch eve/\(name.isEmpty ? "workspace-name" : name)")
                }

                if let error {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("New Workspace")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        create()
                    }
                    .disabled(name.isEmpty || isCreating)
                }
            }
            .interactiveDismissDisabled(isCreating)
        }
    }

    private func create() {
        isCreating = true
        error = nil

        Task {
            do {
                let workspace = try await EveAPI.shared.createWorkspace(
                    repositoryId: repository.id,
                    name: name,
                    baseBranch: baseBranch.isEmpty ? nil : baseBranch
                )
                onCreated(workspace)
                dismiss()
            } catch {
                self.error = error.localizedDescription
                isCreating = false
            }
        }
    }
}

#Preview {
    NewWorkspaceView(
        repository: Repository(
            id: "test",
            name: "Test Repo",
            rootPath: "/path/to/repo",
            config: RepositoryConfig(),
            createdAt: Date().timeIntervalSince1970 * 1000,
            updatedAt: Date().timeIntervalSince1970 * 1000
        ),
        onCreated: { _ in }
    )
}
