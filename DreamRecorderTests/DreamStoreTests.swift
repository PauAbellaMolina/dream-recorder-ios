// DreamRecorderTests/DreamStoreTests.swift
import XCTest
import SwiftData
@testable import DreamRecorder

@MainActor
final class DreamStoreTests: XCTestCase {
    func test_saves_dream_row_and_file() async throws {
        let container = try ModelContainer(for: Dream.self, configurations: .init(isStoredInMemoryOnly: true))
        let store = DreamStore(context: container.mainContext, videoDir: URL.temporaryDirectory.appending(path: "d-\(UUID())"))
        let resp = DreamResponse(dreamId: UUID().uuidString,
                                 videoSignedUrl: URL(string: "https://example.com/v.mp4")!,
                                 transcript: "test")
        let bytes = Data(repeating: 0, count: 1024)
        let dream = try store.save(response: resp, videoBytes: bytes)
        XCTAssertEqual(dream.transcript, "test")
        XCTAssertTrue(FileManager.default.fileExists(atPath: store.videoURL(dream).path))
    }
}
