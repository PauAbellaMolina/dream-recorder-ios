// DreamRecorder/Model/Dream.swift
import Foundation
import SwiftData

@Model
final class Dream {
    @Attribute(.unique) var id: UUID
    var createdAt: Date
    var transcript: String
    var videoFilename: String
    var thumbnailFilename: String?

    init(id: UUID, createdAt: Date, transcript: String, videoFilename: String, thumbnailFilename: String? = nil) {
        self.id = id
        self.createdAt = createdAt
        self.transcript = transcript
        self.videoFilename = videoFilename
        self.thumbnailFilename = thumbnailFilename
    }
}
