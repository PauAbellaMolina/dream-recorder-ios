// DreamRecorderTests/DeviceIdentityTests.swift
import XCTest
@testable import DreamRecorder

final class DeviceIdentityTests: XCTestCase {
    override func setUp() {
        DeviceIdentity.shared.resetForTesting()
    }
    func test_deviceID_isStableAcrossCalls() {
        let first = DeviceIdentity.shared.deviceID
        let second = DeviceIdentity.shared.deviceID
        XCTAssertEqual(first, second)
    }
    func test_deviceID_isValidUUID() {
        XCTAssertNotNil(UUID(uuidString: DeviceIdentity.shared.deviceID))
    }
}
