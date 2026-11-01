import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type View,
} from "react-native";

type ViewInstance = ComponentRef<typeof View>;
type ScrollViewInstance = ComponentRef<typeof ScrollView>;

type FieldHandlers = {
  focusField: (field: ViewInstance) => void;
  blurField: (field: ViewInstance) => void;
};

const FieldContext = createContext<FieldHandlers | null>(null);

/** Used by text inputs to report focus, so their scroll view can reveal them. */
export const useKeyboardAwareField = () => useContext(FieldContext);

/**
 * ScrollView that keeps the focused input above the keyboard.
 *
 * iOS is measured against the frame the keyboard reports. Android builds are
 * edge-to-edge, so `adjustResize` no longer shrinks the window on Android 15+;
 * the keyboard height is added as bottom content padding to guarantee there is
 * enough scroll range. The extra padding is harmless on older Android versions,
 * where the window still resizes.
 */
export const KeyboardAwareScrollView = ({
  children,
  onScroll,
  onContentSizeChange,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { children: ReactNode }) => {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const focused = useRef<ViewInstance | null>(null);
  const [androidInset, setAndroidInset] = useState(0);

  const reveal = useCallback((field: ViewInstance | null) => {
    const scroller = scrollRef.current;
    if (!field || !scroller) return;

    scroller.measureInWindow((_, top, __, height) => {
      field.measureInWindow((__, fieldTop, ___, fieldHeight) => {
        if (!Number.isFinite(fieldTop) || fieldHeight <= 0) return;

        const viewportBottom =
          keyboardTop.current != null
            ? Math.min(top + height, keyboardTop.current)
            : top + height;
        const overflow = fieldTop + fieldHeight + 24 - viewportBottom;

        if (overflow > 0) {
          scroller.scrollTo({
            y: Math.max(0, offset.current + overflow),
            animated: true,
          });
        }
      });
    });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        const { height, screenY } = event.endCoordinates;
        keyboardTop.current =
          Number.isFinite(screenY) && screenY > 0
            ? screenY
            : Dimensions.get("screen").height - height;
        if (Platform.OS === "android") setAndroidInset(height);
        // The window, KAV padding, or content padding may still be settling.
        [60, 220, 420].forEach((delay) => {
          setTimeout(() => reveal(focused.current), delay);
        });
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        keyboardTop.current = null;
        if (Platform.OS === "android") setAndroidInset(0);
      }
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [reveal]);

  const focusField = useCallback(
    (field: ViewInstance) => {
      focused.current = field;
      // Covers switching between fields while the keyboard is already open.
      setTimeout(() => reveal(field), 60);
      setTimeout(() => reveal(field), 360);
    },
    [reveal]
  );

  const blurField = useCallback((field: ViewInstance) => {
    if (focused.current === field) focused.current = null;
  }, []);

  return (
    <FieldContext.Provider value={{ focusField, blurField }}>
      <ScrollView
        {...props}
        ref={scrollRef}
        contentContainerStyle={[
          contentContainerStyle,
          androidInset > 0 ? { paddingBottom: androidInset + 24 } : null,
        ]}
        keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? "handled"}
        scrollEventThrottle={props.scrollEventThrottle ?? 16}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        onContentSizeChange={(width, height) => {
          onContentSizeChange?.(width, height);
          if (focused.current && keyboardTop.current != null) {
            setTimeout(() => reveal(focused.current), 0);
          }
        }}
      >
        {children}
      </ScrollView>
    </FieldContext.Provider>
  );
};
