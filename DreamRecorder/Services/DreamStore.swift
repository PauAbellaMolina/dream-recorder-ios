// DreamRecorder/Services/DreamStore.swift
import Foundation
import SwiftData

@MainActor
final class DreamStore {
    private let context: ModelContext
    private let videoDir: URL

    init(context: ModelContext, videoDir: URL = URL.documentsDirectory.appending(path: "dreams")) {
        self.context = context
        self.videoDir = videoDir
        try? FileManager.default.createDirectory(at: videoDir, withIntermediateDirectories: true)
    }

    func save(response: DreamResponse, videoBytes: Data) throws -> Dream {
        let id = UUID(uuidString: response.dreamId) ?? UUID()
        let filename = "\(id.uuidString).mp4"
        let url = videoDir.appending(path: filename)
        try videoBytes.write(to: url)
        let dream = Dream(id: id, createdAt: .now, transcript: response.transcript, videoFilename: filename)
        context.insert(dream)
        try context.save()
        return dream
    }

    func videoURL(_ dream: Dream) -> URL { videoDir.appending(path: dream.videoFilename) }

    func delete(_ dream: Dream) throws {
        try? FileManager.default.removeItem(at: videoURL(dream))
        context.delete(dream)
        try context.save()
    }
}
