const fs = require("fs");
const path = require("path");
const plist = require("@expo/plist").default;
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
  withGradleProperties,
  withInfoPlist,
  withMainApplication,
  withProjectBuildGradle,
  withXcodeProject,
} = require("@expo/config-plugins");

// Must match the extension bundle id in Info.plist and the app group registered
// in the Apple Developer portal.
const EXTENSION_NAME = "BroadcastExtension";
const EXTENSION_BUNDLE_ID = "com.anaquran.academy.broadcast";
const APP_GROUP = "group.com.anaquran.academy";

// Jitsi's ReplayKit sample handler, vendored from
// jitsi-meet-sdk-samples/react-native/ios/BroadcastExtension (Apache-2.0).
const SWIFT_FILES = [
  "SampleHandler.swift",
  "SampleUploader.swift",
  "SocketConnection.swift",
  "DarwinNotificationCenter.swift",
  "Atomic.swift",
];

const JITSI_SAMPLE_APP_GROUP = "group.org.jitsi.meet.rnsdktester.appgroup";

const withScreenShareInfoPlist = (config) =>
  withInfoPlist(config, (mod) => {
    mod.modResults.RTCAppGroupIdentifier = APP_GROUP;
    mod.modResults.RTCScreenSharingExtension = EXTENSION_BUNDLE_ID;
    const modes = new Set(mod.modResults.UIBackgroundModes ?? []);
    modes.add("audio");
    modes.add("voip");
    modes.add("fetch");
    mod.modResults.UIBackgroundModes = [...modes];
    return mod;
  });

const withScreenShareEntitlements = (config) =>
  withEntitlementsPlist(config, (mod) => {
    const groups = mod.modResults["com.apple.security.application-groups"] ?? [];
    if (!groups.includes(APP_GROUP)) {
      mod.modResults["com.apple.security.application-groups"] = [
        ...groups,
        APP_GROUP,
      ];
    }
    return mod;
  });

const withScreenShareXcodeProject = (config) =>
  withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    if (project.pbxTargetByName(EXTENSION_NAME)) return mod;

    const target = project.addTarget(
      EXTENSION_NAME,
      "app_extension",
      EXTENSION_NAME,
      EXTENSION_BUNDLE_ID
    );

    const group = project.addPbxGroup(
      SWIFT_FILES,
      EXTENSION_NAME,
      EXTENSION_NAME,
      '"<group>"'
    );
    const mainGroupId = project.getFirstProject().firstProject.mainGroup;
    project.getPBXGroupByKey(mainGroupId).children.push({
      value: group.uuid,
      comment: EXTENSION_NAME,
    });
    project.addBuildPhase(
      SWIFT_FILES,
      "PBXSourcesBuildPhase",
      "Sources",
      target.uuid
    );

    const buildConfigurations = project.pbxXCBuildConfigurationSection();
    const configList =
      project.pbxXCConfigurationList()[
        target.pbxNativeTarget.buildConfigurationList
      ];
    const appTarget = project.getFirstTarget().firstTarget;
    const appConfigList =
      project.pbxXCConfigurationList()[appTarget.buildConfigurationList];
    const developmentTeam = appConfigList.buildConfigurations
      .map(
        (item) => buildConfigurations[item.value]?.buildSettings?.DEVELOPMENT_TEAM
      )
      .find(Boolean);

    for (const item of configList?.buildConfigurations ?? []) {
      const settings = buildConfigurations[item.value]?.buildSettings;
      if (!settings) continue;
      settings.SWIFT_VERSION = "5.0";
      settings.IPHONEOS_DEPLOYMENT_TARGET = "15.1";
      settings.TARGETED_DEVICE_FAMILY = '"1,2"';
      settings.CODE_SIGN_ENTITLEMENTS = `${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements`;
      settings.CODE_SIGN_STYLE = "Automatic";
      settings.PRODUCT_BUNDLE_IDENTIFIER = `"${EXTENSION_BUNDLE_ID}"`;
      settings.GENERATE_INFOPLIST_FILE = "NO";
      settings.INFOPLIST_FILE = `${EXTENSION_NAME}/Info.plist`;
      settings.CURRENT_PROJECT_VERSION = "1";
      settings.MARKETING_VERSION = "1.0";
      if (developmentTeam) settings.DEVELOPMENT_TEAM = developmentTeam;
    }

    return mod;
  });

const withScreenShareExtensionFiles = (config) =>
  withDangerousMod(config, [
    "ios",
    async (mod) => {
      const extensionPath = path.join(
        path.resolve(mod.modRequest.platformProjectRoot),
        EXTENSION_NAME
      );
      fs.mkdirSync(extensionPath, { recursive: true });

      for (const file of SWIFT_FILES) {
        const source = fs.readFileSync(
          path.join(__dirname, "broadcast-extension", file),
          "utf8"
        );
        const contents =
          file === "SampleHandler.swift"
            ? source.replace(JITSI_SAMPLE_APP_GROUP, APP_GROUP)
            : source;
        fs.writeFileSync(path.join(extensionPath, file), contents);
      }

      fs.writeFileSync(
        path.join(extensionPath, "Info.plist"),
        plist.build({
          CFBundleDevelopmentRegion: "$(DEVELOPMENT_LANGUAGE)",
          CFBundleDisplayName: "Ana Quran Screen Share",
          CFBundleExecutable: "$(EXECUTABLE_NAME)",
          CFBundleIdentifier: "$(PRODUCT_BUNDLE_IDENTIFIER)",
          CFBundleInfoDictionaryVersion: "6.0",
          CFBundleName: "$(PRODUCT_NAME)",
          CFBundlePackageType: "XPC!",
          CFBundleShortVersionString: "$(MARKETING_VERSION)",
          CFBundleVersion: "$(CURRENT_PROJECT_VERSION)",
          NSExtension: {
            NSExtensionPointIdentifier: "com.apple.broadcast-services-upload",
            NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).SampleHandler",
            RPBroadcastProcessMode: "RPBroadcastProcessModeSampleBuffer",
          },
        })
      );

      fs.writeFileSync(
        path.join(extensionPath, `${EXTENSION_NAME}.entitlements`),
        plist.build({
          "com.apple.security.application-groups": [APP_GROUP],
        })
      );

      return mod;
    },
  ]);

const withScreenShareGradleProperties = (config) =>
  withGradleProperties(config, (mod) => {
    const entries = mod.modResults;
    const existing = entries.find(
      (entry) =>
        entry.type === "property" && entry.key === "android.minSdkVersion"
    );
    if (existing) existing.value = "26";
    else
      entries.push({
        type: "property",
        key: "android.minSdkVersion",
        value: "26",
      });
    return mod;
  });

// The Jitsi SDK's library build script resolves AGP through this ext value.
// It must match the AGP version Expo 58 resolves (android.newDsl/9.x line).
const withScreenShareProjectGradle = (config) =>
  withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes("gradlePluginVersion")) return mod;
    mod.modResults.contents = mod.modResults.contents.replace(
      /buildscript\s*\{/,
      'buildscript {\n  ext {\n    gradlePluginVersion = "9.2.1"\n  }\n'
    );
    return mod;
  });

const withScreenShareAndroidManifest = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest["uses-permission"] = manifest["uses-permission"] ?? [];
    for (const name of [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
    ]) {
      if (
        !manifest["uses-permission"].some(
          (permission) => permission.$?.["android:name"] === name
        )
      ) {
        manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    }

    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(
      mod.modResults
    );
    activity.$["android:supportsPictureInPicture"] = "true";

    return mod;
  });

const withScreenShareMainApplication = (config) =>
  withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes("com.oney.WebRTCModule.WebRTCModuleOptions")) {
      contents = contents.replace(
        "import expo.modules.ApplicationLifecycleDispatcher",
        "import com.oney.WebRTCModule.WebRTCModuleOptions\nimport expo.modules.ApplicationLifecycleDispatcher"
      );
    }
    if (!contents.includes("enableMediaProjectionService")) {
      contents = contents.replace(
        "super.onCreate()",
        "super.onCreate()\n    WebRTCModuleOptions.getInstance().enableMediaProjectionService = true"
      );
    }
    mod.modResults.contents = contents;
    return mod;
  });

const withLessonScreenShare = (config) => {
  config = withScreenShareInfoPlist(config);
  config = withScreenShareEntitlements(config);
  config = withScreenShareXcodeProject(config);
  config = withScreenShareExtensionFiles(config);
  config = withScreenShareGradleProperties(config);
  config = withScreenShareProjectGradle(config);
  config = withScreenShareAndroidManifest(config);
  config = withScreenShareMainApplication(config);
  return config;
};

module.exports = withLessonScreenShare;
