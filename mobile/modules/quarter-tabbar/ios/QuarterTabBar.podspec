Pod::Spec.new do |s|
  s.name           = 'QuarterTabBar'
  s.version        = '1.0.0'
  s.summary        = "quarter's own tab bar, drawn by UIKit so iOS 26 gives it the system Liquid Glass look"
  s.description    = 'A small view around UITabBar for the Today, Skills, Plan and Search tabs.'
  s.license        = 'UNLICENSED'
  s.author         = 'Wristed Ltd'
  s.homepage       = 'https://yourquarter.co.uk'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: 'https://github.com/expo/expo.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
end
