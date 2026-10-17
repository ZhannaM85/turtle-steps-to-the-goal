import UIKit
import Capacitor

/**
 * #1099 — `AppleHealthPeriodPlugin` lives in the App target (not CapApp-SPM),
 * so it is omitted from `packageClassList` after `cap sync`. Register it here
 * so Sync can request Cycle / menstrual-flow access.
 */
class TurtleStepsBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleHealthPeriodPlugin())
    }
}
