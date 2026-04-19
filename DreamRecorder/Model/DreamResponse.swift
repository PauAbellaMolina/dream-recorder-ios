// DreamRecorder/Model/DreamResponse.swift
import Foundation

struct DreamResponse: Decodable {
    let dreamId: String
    let videoSignedUrl: URL
    let transcript: String
    enum CodingKeys: String, CodingKey {
        case dreamId = "dream_id"
        case videoSignedUrl = "video_signed_url"
        case transcript
    }
}

enum DreamAPIError: Error, Equatable {
    case quotaExhausted, lumaTimeout, pipelineFailed, invalidCode, network(String)
}
