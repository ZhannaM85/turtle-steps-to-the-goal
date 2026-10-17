import Foundation
import Capacitor
import HealthKit

/**
 * #1099 — Capgo `@capgo/capacitor-health` has no menstrual-flow type.
 * Thin HealthKit bridge: authorize + recent period days → `onPeriod`.
 */
@objc(AppleHealthPeriodPlugin)
public class AppleHealthPeriodPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleHealthPeriodPlugin"
    public let jsName = "AppleHealthPeriod"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncRecentPeriodDays", returnType: CAPPluginReturnPromise),
    ]

    private let healthStore = HKHealthStore()

    private var menstrualFlowType: HKObjectType? {
        HKObjectType.categoryType(forIdentifier: .menstrualFlow)
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device.")
            return
        }
        guard let type = menstrualFlowType else {
            call.reject("Menstrual flow type is unavailable.")
            return
        }

        healthStore.requestAuthorization(toShare: [], read: [type]) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject(error.localizedDescription, nil, error)
                    return
                }
                // HealthKit privacy: success means the sheet was processed, not that
                // read access was granted. Always allow the JS layer to attempt a read.
                call.resolve(["granted": success])
            }
        }
    }

    @objc func syncRecentPeriodDays(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device.")
            return
        }
        guard let sampleType = HKObjectType.categoryType(forIdentifier: .menstrualFlow) else {
            call.reject("Menstrual flow type is unavailable.")
            return
        }

        let days = max(1, call.getInt("days") ?? 7)
        let end = Date()
        let calendar = Calendar.current
        guard let start = calendar.date(
            byAdding: .day,
            value: -(days - 1),
            to: calendar.startOfDay(for: end)
        ) else {
            call.reject("Could not compute date range.")
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(
            sampleType: sampleType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { _, samples, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject(error.localizedDescription, nil, error)
                    return
                }

                let formatter = DateFormatter()
                formatter.calendar = Calendar.current
                formatter.locale = Locale(identifier: "en_US_POSIX")
                formatter.timeZone = TimeZone.current
                formatter.dateFormat = "yyyy-MM-dd"

                var dates = Set<String>()
                for sample in samples as? [HKCategorySample] ?? [] {
                    // Skip "None" — same as Apple Health XML import (#411).
                    if sample.value == HKCategoryValueMenstrualFlow.none.rawValue {
                        continue
                    }
                    dates.insert(formatter.string(from: sample.startDate))
                }

                call.resolve(["dates": Array(dates).sorted()])
            }
        }

        healthStore.execute(query)
    }
}
