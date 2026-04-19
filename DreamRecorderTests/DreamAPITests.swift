// DreamRecorderTests/DreamAPITests.swift
import XCTest
@testable import DreamRecorder

final class DreamAPITests: XCTestCase {
    func test_submit_returns_dreamResponse_on_success() async throws {
        let api = DreamAPI(session: .mockOK(json: """
          {"dream_id":"AAA","video_signed_url":"https://example/v.mp4","transcript":"hi"}
        """))
        let result = try await api.submitDream(audio: Data([1,2,3]))
        XCTAssertEqual(result.dreamId, "AAA")
    }

    func test_submit_throws_quotaExhausted_on_429() async {
        let api = DreamAPI(session: .mockFail(status: 429, json: """
          {"error":"quota_exhausted"}
        """))
        do {
            _ = try await api.submitDream(audio: Data([1,2,3]))
            XCTFail("should throw")
        } catch DreamAPIError.quotaExhausted { /* ok */ }
        catch { XCTFail("wrong error: \(error)") }
    }
}
