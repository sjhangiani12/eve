import SwiftUI

struct WorkspaceDetailView: View {
    let workspace: Workspace
    @StateObject private var webSocket = WebSocketService()
    @State private var selectedTab = 0
    @State private var inputText = ""

    var body: some View {
        VStack(spacing: 0) {
            // Tab picker
            Picker("View", selection: $selectedTab) {
                Text("Chat").tag(0)
                Text("Terminal").tag(1)
                Text("Files").tag(2)
            }
            .pickerStyle(.segmented)
            .padding()

            // Content
            TabView(selection: $selectedTab) {
                ChatView(webSocket: webSocket, inputText: $inputText)
                    .tag(0)

                TerminalView(output: webSocket.outputBuffer)
                    .tag(1)

                FilesView(workspace: workspace)
                    .tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            // Input bar (visible on chat tab)
            if selectedTab == 0 {
                InputBar(text: $inputText) {
                    Task {
                        try? await webSocket.send(inputText)
                        inputText = ""
                    }
                }
            }
        }
        .navigationTitle(workspace.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                StatusBadge(status: webSocket.currentStatus ?? workspace.status)
            }
        }
        .task {
            await webSocket.connect(to: workspace.id)
        }
        .onDisappear {
            webSocket.disconnect()
        }
    }
}

struct ChatView: View {
    @ObservedObject var webSocket: WebSocketService
    @Binding var inputText: String

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    ForEach(Array(webSocket.messages.enumerated()), id: \.offset) { index, message in
                        if message.type == .output, let data = message.data {
                            MessageBubble(text: data, isUser: false)
                                .id(index)
                        }
                    }
                }
                .padding()
            }
            .onChange(of: webSocket.messages.count) { _, _ in
                withAnimation {
                    proxy.scrollTo(webSocket.messages.count - 1, anchor: .bottom)
                }
            }
        }
    }
}

struct MessageBubble: View {
    let text: String
    let isUser: Bool

    var body: some View {
        HStack {
            if isUser { Spacer() }

            Text(text)
                .font(.system(.body, design: .monospaced))
                .padding(12)
                .background(isUser ? Color.blue : Color(.systemGray5))
                .foregroundStyle(isUser ? .white : .primary)
                .clipShape(RoundedRectangle(cornerRadius: 16))

            if !isUser { Spacer() }
        }
    }
}

struct TerminalView: View {
    let output: String

    var body: some View {
        ScrollView {
            Text(output.isEmpty ? "Waiting for output..." : output)
                .font(.system(.caption, design: .monospaced))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
        }
        .background(Color.black)
        .foregroundStyle(.green)
    }
}

struct FilesView: View {
    let workspace: Workspace

    var body: some View {
        VStack {
            Text("Files browser coming soon")
                .foregroundStyle(.secondary)

            Text(workspace.worktreePath)
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct InputBar: View {
    @Binding var text: String
    let onSend: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            TextField("Message Claude...", text: $text, axis: .vertical)
                .textFieldStyle(.plain)
                .padding(12)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .lineLimit(1...5)

            Button(action: onSend) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title)
                    .foregroundStyle(text.isEmpty ? .gray : .blue)
            }
            .disabled(text.isEmpty)
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

#Preview {
    NavigationStack {
        WorkspaceDetailView(workspace: Workspace(
            id: "test",
            repositoryId: "repo",
            name: "feature-auth",
            branchName: "eve/feature-auth",
            worktreePath: "/path/to/worktree",
            tmuxSession: "eve-test",
            status: .idle,
            allocatedPort: 3000,
            createdAt: Date().timeIntervalSince1970 * 1000,
            updatedAt: Date().timeIntervalSince1970 * 1000,
            lastActivityAt: Date().timeIntervalSince1970 * 1000
        ))
    }
}
