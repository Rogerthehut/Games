import * as Haptics from 'expo-haptics';
import type { PropsWithChildren } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PropsWithChildren<Omit<PressableProps, 'style'>> & { style?: StyleProp<ViewStyle>; haptic?: boolean };

export function SpringPressable({ children, style, onPress, disabled, haptic = true, ...props }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.975, { damping: 18, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 260 }); }}
      onPress={(event) => {
        if (haptic) void Haptics.selectionAsync();
        onPress?.(event);
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
