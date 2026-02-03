# Eve iOS App

SwiftUI app for managing Eve workspaces from your iPhone/iPad.

## Setup

### Option 1: XcodeGen (Recommended)

1. Install XcodeGen if you haven't:
   ```bash
   brew install xcodegen
   ```

2. Generate the Xcode project:
   ```bash
   cd ios
   xcodegen generate
   ```

3. Open `Eve.xcodeproj` in Xcode

### Option 2: Manual Xcode Project

1. Create a new iOS App project in Xcode
2. Name it "Eve"
3. Select SwiftUI for the interface
4. Delete the default ContentView.swift
5. Drag the `Eve/Sources` folder into your project
6. Set deployment target to iOS 17.0+

## Building

1. Open the project in Xcode
2. Select your development team in Signing & Capabilities
3. Build and run on your device or simulator

## Configuration

On first launch, you'll be asked to enter the address of your Eve daemon:

- If using Tailscale: Enter your Mac's Tailscale IP (e.g., `100.x.x.x`)
- If on local network: Enter your Mac's local IP (e.g., `192.168.x.x`)

The default port is `4778`.

## Features

- **Dashboard**: View all repositories and workspaces
- **Chat**: Send messages to Claude Code
- **Terminal**: View raw terminal output
- **Files**: Browse workspace files (coming soon)

## Requirements

- iOS 17.0+
- Xcode 15.0+
- Eve daemon running on your Mac
