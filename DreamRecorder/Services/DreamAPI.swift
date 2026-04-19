// DreamRecorder/Services/DreamAPI.swift
import Foundation

final class DreamAPI {
    private let session: URLSession
    init(session: URLSession = .shared) { self.session = session }

    func submitDream(audio: Data) async throws -> DreamResponse {
        var req = URLRequest(url: BackendConfig.baseURL.appending(path: "dreams-submit"))
        req.httpMethod = "POST"
        req.setValue(DeviceIdentity.shared.deviceID, forHTTPHeaderField: "X-Device-ID")
        req.setValue("Bearer \(BackendConfig.anonKey)", forHTTPHeaderField: "Authorization")
        req.httpBody = audio
        return try await perform(req)
    }

    func fetchPendingDream() async throws -> DreamResponse? {
        var req = URLRequest(url: BackendConfig.baseURL.appending(path: "dreams-pending"))
        req.setValue(DeviceIdentity.shared.deviceID, forHTTPHeaderField: "X-Device-ID")
        req.setValue("Bearer \(BackendConfig.anonKey)", forHTTPHeaderField: "Authorization")
        do { return try await perform(req) } catch DreamAPIError.pipelineFailed { return nil }
    }

    func redeemUnlock(code: String) async throws {
        var req = URLRequest(url: BackendConfig.baseURL.appending(path: "unlock-redeem"))
        req.httpMethod = "POST"
        req.setValue(DeviceIdentity.shared.deviceID, forHTTPHeaderField: "X-Device-ID")
        req.setValue("Bearer \(BackendConfig.anonKey)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["code": code])
        struct TierOnly: Decodable { let tier: String }
        let _: TierOnly = try await perform(req)
    }

    private struct ErrBody: Decodable { let error: String }

    private func perform<T: Decodable>(_ req: URLRequest) async throws -> T {
        let (data, resp): (Data, URLResponse)
        do { (data, resp) = try await session.data(for: req) }
        catch { throw DreamAPIError.network(error.localizedDescription) }
        let http = resp as! HTTPURLResponse
        if (200..<300).contains(http.statusCode) {
            return try JSONDecoder().decode(T.self, from: data)
        }
        let body = try? JSONDecoder().decode(ErrBody.self, from: data)
        switch (http.statusCode, body?.error) {
        case (429, _): throw DreamAPIError.quotaExhausted
        case (504, _), (_, "luma_timeout"): throw DreamAPIError.lumaTimeout
        case (400, "invalid_code"): throw DreamAPIError.invalidCode
        case (404, _): throw DreamAPIError.pipelineFailed
        default: throw DreamAPIError.pipelineFailed
        }
    }
}

#if DEBUG
extension URLSession {
    static func mockOK(json: String) -> URLSession { makeMock(status: 200, body: json) }
    static func mockFail(status: Int, json: String) -> URLSession { makeMock(status: status, body: json) }
    private static func makeMock(status: Int, body: String) -> URLSession {
        let c = URLSessionConfiguration.ephemeral
        c.protocolClasses = [MockURLProtocol.self]
        MockURLProtocol.stub = (status, body.data(using: .utf8)!)
        return URLSession(configuration: c)
    }
}
final class MockURLProtocol: URLProtocol {
    static var stub: (Int, Data)?
    override class func canInit(with: URLRequest) -> Bool { true }
    override class func canonicalRequest(for r: URLRequest) -> URLRequest { r }
    override func startLoading() {
        let (s, d) = MockURLProtocol.stub!
        let r = HTTPURLResponse(url: request.url!, statusCode: s, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: r, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: d)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}
#endif
