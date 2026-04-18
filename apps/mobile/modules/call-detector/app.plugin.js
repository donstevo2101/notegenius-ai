const {
  withInfoPlist,
  withAndroidManifest,
  AndroidConfig,
} = require("@expo/config-plugins");

const withCallDetector = (config) => {
  // iOS — add background mode for VoIP & required Info.plist usage strings
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSMicrophoneUsageDescription =
      cfg.modResults.NSMicrophoneUsageDescription ||
      "Used to record voice memos and meeting audio.";

    const bgModes = new Set(cfg.modResults.UIBackgroundModes || []);
    bgModes.add("audio");
    cfg.modResults.UIBackgroundModes = Array.from(bgModes);

    return cfg;
  });

  // Android — add permissions
  config = AndroidConfig.Permissions.withPermissions(config, [
    "android.permission.READ_PHONE_STATE",
    "android.permission.READ_CALL_LOG",
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
  ]);

  return config;
};

module.exports = withCallDetector;
