import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { assetUrl } from "@/api/client";
import { initialsOf } from "@/lib/format";
import { useTheme } from "@/providers/theme-provider";
import { AppText } from "./app-text";

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: number;
};

export const Avatar = ({ name, avatarUrl, size = 44 }: Props) => {
  const { colors } = useTheme();
  const uri = assetUrl(avatarUrl);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = Boolean(uri) && failedUri !== uri;

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.brandSoft,
        },
      ]}
    >
      {uri && showImage ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={120}
          onError={() => setFailedUri(uri)}
          accessibilityLabel={`${name} profile photo`}
        />
      ) : (
        <AppText
          weight="700"
          color="link"
          style={{ fontSize: Math.max(12, size * 0.34) }}
        >
          {initialsOf(name)}
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
