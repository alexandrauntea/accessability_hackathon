# Minimal Diff for Bottom Tab Bar (`app/(tabs)/_layout.tsx`)

As per the VibeCheck team contract, `app/(tabs)/_layout.tsx` is a frozen shared file.
This document contains the exact minimal diff proposed for Andreea and the team to review and merge in a dedicated PR.

## Proposed Diff

```diff
--- a/app/(tabs)/_layout.tsx
+++ b/app/(tabs)/_layout.tsx
@@ -20,9 +20,17 @@ export default function TabsLayout() {
     <Tabs screenOptions={{
       headerShown: false,
       animation: motion ? 'shift' : 'none',
-      tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.textMuted,
-      tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 64 },
-      tabBarLabelStyle: { fontSize: Math.max(14, font.small - 2) },
+      tabBarActiveTintColor: c.accent,
+      tabBarInactiveTintColor: c.textMuted,
+      tabBarStyle: {
+        backgroundColor: c.surface,
+        borderTopColor: c.border,
+        borderTopWidth: 1,
+        minHeight: 68,
+        paddingTop: 6,
+        paddingBottom: 8,
+      },
+      tabBarLabelStyle: { fontSize: Math.max(13, font.small - 3), fontWeight: '600' },
     }}>
       <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('sunny-outline'), tabBarAccessibilityLabel: 'Today: check-in and summary' }} />
       <Tabs.Screen name="day" options={{ title: 'My day', tabBarIcon: icon('calendar-outline'), tabBarAccessibilityLabel: 'My day: adapted schedule and tasks' }} />
       <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: icon('stats-chart-outline'), tabBarAccessibilityLabel: 'Insights: patterns over time' }} />
       <Tabs.Screen name="support" options={{ title: 'Support', tabBarIcon: icon('chatbubbles-outline'), tabBarAccessibilityLabel: 'Support: ask for an adjustment' }} />
-      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: icon('person-circle-outline'), tabBarAccessibilityLabel: 'Me: profile, privacy and accessibility settings' }} />
+      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: icon('person-outline'), tabBarAccessibilityLabel: 'Me: profile, privacy and accessibility settings' }} />
     </Tabs>
   );
 }
```

## Changes Summary
1. `tabBarActiveTintColor`: Uses `c.accent` (`#5B3FC4`).
2. `tabBarInactiveTintColor`: Uses `c.textMuted` (`#4A4560`).
3. `tabBarStyle`: Flat surface `#FFFFFF`, 1px top border `c.border`, height 68px with balanced vertical padding.
4. `tabBarLabelStyle`: Font weight 600, scaled from theme `font.small`.
5. Tab icons: Standardized outline icons across all 5 tabs.