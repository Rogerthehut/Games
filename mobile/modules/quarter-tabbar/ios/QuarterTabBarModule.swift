import ExpoModulesCore

/// quarter's tab bar. It is a real UITabBar, so on iOS 26 (when the app is built with the iOS 26 SDK) the system draws it with Liquid Glass,
/// and on older iPhones it is the ordinary iOS tab bar. The page itself is drawn by the web view; this only says which tab was tapped.
public class QuarterTabBarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("QuarterTabBar")

    View(QuarterTabBarView.self) {
      Events("onSelect")

      Prop("items") { (view: QuarterTabBarView, items: [[String: String]]) in
        view.setItems(items)
      }
      Prop("selected") { (view: QuarterTabBarView, id: String?) in
        view.select(id)
      }
      Prop("tint") { (view: QuarterTabBarView, hex: String?) in
        view.setTint(hex)
      }
    }
  }
}
