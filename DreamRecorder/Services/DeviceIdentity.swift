// DreamRecorder/Services/DeviceIdentity.swift
import Foundation
import Security

final class DeviceIdentity {
    static let shared = DeviceIdentity()
    private let service = "com.paulichon.dreamrecorder"
    private let account = "device-id"

    var deviceID: String {
        if let existing = read() { return existing }
        let new = UUID().uuidString.lowercased()
        write(new)
        return new
    }

    func resetForTesting() { delete() }

    private func read() -> String? {
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var out: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &out)
        guard status == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    private func write(_ value: String) {
        delete()
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: value.data(using: .utf8)!,
        ]
        SecItemAdd(q as CFDictionary, nil)
    }
    private func delete() {
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(q as CFDictionary)
    }
}
