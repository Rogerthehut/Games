import ExpoModulesCore
import UIKit

public final class QuarterTabBarView: ExpoView, UITabBarDelegate {
  private let bar = UITabBar()
  private var ids: [String] = []
  let onSelect = EventDispatcher()

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    bar.delegate = self
    addSubview(bar)
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    bar.frame = bounds
  }

  func setItems(_ items: [[String: String]]) {
    ids = items.compactMap { $0["id"] }
    bar.items = items.enumerated().map { index, item in
      let symbol = UIImage(systemName: item["symbol"] ?? "circle")
      return UITabBarItem(title: item["title"], image: symbol, tag: index)
    }
  }

  func select(_ id: String?) {
    guard let id = id, let index = ids.firstIndex(of: id), let items = bar.items, index < items.count else {
      bar.selectedItem = nil
      return
    }
    if bar.selectedItem !== items[index] {
      bar.selectedItem = items[index]
    }
  }

  func setTint(_ hex: String?) {
    guard let hex = hex else { return }
    var value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    if value.count == 6 { value += "ff" }
    guard value.count == 8, let number = UInt64(value, radix: 16) else { return }
    let red = CGFloat((number >> 24) & 0xff) / 255
    let green = CGFloat((number >> 16) & 0xff) / 255
    let blue = CGFloat((number >> 8) & 0xff) / 255
    let alpha = CGFloat(number & 0xff) / 255
    bar.tintColor = UIColor(red: red, green: green, blue: blue, alpha: alpha)
  }

  public func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
    let index = item.tag
    if index >= 0 && index < ids.count {
      onSelect(["id": ids[index]])
    }
  }
}
