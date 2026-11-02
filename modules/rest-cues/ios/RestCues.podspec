Pod::Spec.new do |s|
  s.name           = 'RestCues'
  s.version        = '1.0.0'
  s.summary        = 'Rest countdown sounds scheduled with AVAudioEngine'
  s.description    = 'Plays the rest cues (rest-warn, rest-tick, rest-tick-strong, rest-go) at absolute times, also in the background.'
  s.author         = 'Athelete'
  s.homepage       = 'https://athelete.app'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '16.4' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'
  s.resource_bundles = { 'RestCues' => ['sounds/*.caf'] }
end
