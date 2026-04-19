// DreamRecorder/App/DreamRecorderApp.swift
import SwiftUI
import SwiftData

@main
struct DreamRecorderApp: App {
    var body: some Scene {
        WindowGroup { RootView() }
            .modelContainer(for: Dream.self)
    }
}
