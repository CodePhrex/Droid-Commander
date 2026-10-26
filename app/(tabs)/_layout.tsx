import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "../../components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { design } from "@/constants/design-system";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  // Reserve enough vertical room for both the icon and its label on compact Android screens.
  const tabBarHeight = 70 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 12,
          fontWeight: "800",
          letterSpacing: 0,
          includeFontPadding: false,
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          borderRadius: design.radius.md,
          marginHorizontal: 1,
          marginVertical: 3,
          paddingHorizontal: 0,
        },
        tabBarActiveBackgroundColor: design.color.orangeSoft,
        tabBarStyle: {
          paddingTop: 4,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: design.color.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Command",
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="shield.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: "Assess",
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="checkmark.seal.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: "Tools",
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="square.grid.2x2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: "Sessions",
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="clock.arrow.circlepath" color={color} />,
        }}
      />
      <Tabs.Screen
        name="usb"
        options={{
          title: "USB Link",
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="cable.connector" color={color} />,
        }}
      />
      <Tabs.Screen name="catalog" options={{ href: null }} />
      <Tabs.Screen name="wireless-diagnostics-screen" options={{ href: null }} />
    </Tabs>
  );
}
