import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { SpringPressable } from '@/components/spring-pressable';
import { palette, radii, shadow } from '@/theme';

type Tool = 'paper' | 'beans' | 'abacus';
type Stroke = { path: string; erase: boolean };

export function WorkingOut({ onDone }: { onDone?: () => void }) {
  const [tool, setTool] = useState<Tool>('paper');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [eraser, setEraser] = useState(false);
  const [note, setNote] = useState('');
  const [beans, setBeans] = useState<(0 | 1 | 2)[]>(Array(20).fill(0));
  const [beads, setBeads] = useState([0, 0, 0, 0]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => tool === 'paper',
    onMoveShouldSetPanResponder: () => tool === 'paper',
    onPanResponderGrant: ({ nativeEvent }) => {
      setStrokes((current) => [...current, { path: `M ${nativeEvent.locationX} ${nativeEvent.locationY}`, erase: eraser }]);
    },
    onPanResponderMove: ({ nativeEvent }) => {
      setStrokes((current) => {
        const last = current.at(-1);
        if (!last) return current;
        return [...current.slice(0, -1), { ...last, path: `${last.path} L ${nativeEvent.locationX} ${nativeEvent.locationY}` }];
      });
    },
  }), [eraser, tool]);

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.kicker}>YOUR DESK</Text>
          <Text style={styles.title}>Working out</Text>
        </View>
        {onDone && <SpringPressable accessibilityRole="button" accessibilityLabel="Close working out" style={styles.done} onPress={onDone}>
          <Text style={styles.doneText}>Done</Text>
        </SpringPressable>}
      </View>

      <View style={styles.segment} accessibilityRole="tablist">
        <ToolButton label="Paper" symbol="pencil.line" selected={tool === 'paper'} onPress={() => setTool('paper')} />
        <ToolButton label="Beans" symbol="circle.grid.3x3.fill" selected={tool === 'beans'} onPress={() => setTool('beans')} />
        <ToolButton label="Abacus" symbol="slider.horizontal.3" selected={tool === 'abacus'} onPress={() => setTool('abacus')} />
      </View>

      {tool === 'paper' && <View style={styles.toolBody}>
        <View style={styles.paperToolbar}>
          <SpringPressable style={[styles.smallButton, !eraser && styles.smallSelected]} onPress={() => setEraser(false)}>
            <SymbolView name="pencil.tip" size={16} tintColor={palette.ink} /><Text style={styles.smallText}>Pencil</Text>
          </SpringPressable>
          <SpringPressable style={[styles.smallButton, eraser && styles.smallSelected]} onPress={() => setEraser(true)}>
            <SymbolView name="eraser" size={16} tintColor={palette.ink} /><Text style={styles.smallText}>Eraser</Text>
          </SpringPressable>
          <SpringPressable style={styles.smallButton} disabled={!strokes.length} onPress={() => setStrokes((current) => current.slice(0, -1))}>
            <SymbolView name="arrow.uturn.backward" size={16} tintColor={strokes.length ? palette.ink : palette.muted} /><Text style={styles.smallText}>Undo</Text>
          </SpringPressable>
        </View>
        <View style={styles.paper} {...pan.panHandlers}>
          <View pointerEvents="none" style={styles.gridLines} />
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {strokes.map((stroke, index) => (
              <Path key={index} d={stroke.path} fill="none" stroke={stroke.erase ? palette.paper : palette.indigo} strokeWidth={stroke.erase ? 24 : 4} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </Svg>
        </View>
        <TextInput style={styles.note} value={note} onChangeText={setNote} multiline placeholder="Type a step or reminder…" placeholderTextColor={palette.muted} />
      </View>}

      {tool === 'beans' && <View style={styles.toolBody}>
        <Text style={styles.help}>Tap a square to add a pink bean, then a green bean, then clear it.</Text>
        <View style={styles.beanBoard}>
          {beans.map((bean, index) => (
            <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Counter square ${index + 1}`} style={styles.beanCell}
              onPress={() => setBeans((current) => current.map((value, cell) => cell === index ? ((value + 1) % 3) as 0 | 1 | 2 : value))}>
              {!!bean && <View style={[styles.bean, bean === 1 ? styles.beanRose : styles.beanMint]} />}
            </Pressable>
          ))}
        </View>
        <SpringPressable style={styles.clearButton} onPress={() => setBeans(Array(20).fill(0))}><Text style={styles.clearText}>Clear beans</Text></SpringPressable>
      </View>}

      {tool === 'abacus' && <View style={styles.toolBody}>
        <Text style={styles.help}>Build a number using thousands, hundreds, tens and ones.</Text>
        <View style={styles.abacus}>
          {['Th', 'H', 'T', 'O'].map((place, column) => (
            <View style={styles.rodWrap} key={place}>
              <Text style={styles.place}>{place}</Text>
              <Pressable style={styles.rod} onPress={() => setBeads((current) => current.map((value, index) => index === column ? (value + 1) % 10 : value))}>
                {Array.from({ length: beads[column] }, (_, index) => <View key={index} style={[styles.bead, index % 2 ? styles.beanMint : styles.beanRose]} />)}
              </Pressable>
              <Text style={styles.count}>{beads[column]}</Text>
              <View style={styles.stepper}>
                <Pressable hitSlop={8} onPress={() => setBeads((current) => current.map((value, index) => index === column ? Math.max(0, value - 1) : value))}><Text style={styles.step}>−</Text></Pressable>
                <Pressable hitSlop={8} onPress={() => setBeads((current) => current.map((value, index) => index === column ? Math.min(9, value + 1) : value))}><Text style={styles.step}>+</Text></Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>}
    </View>
  );
}

function ToolButton({ label, symbol, selected, onPress }: { label: string; symbol: SFSymbol; selected: boolean; onPress: () => void }) {
  return (
    <SpringPressable accessibilityRole="tab" accessibilityState={{ selected }} haptic style={[styles.toolButton, selected && styles.toolSelected]} onPress={onPress}>
      <SymbolView name={symbol} size={18} tintColor={palette.ink} /><Text style={styles.toolLabel}>{label}</Text>
    </SpringPressable>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, minHeight: 480, backgroundColor: palette.paper, borderRadius: radii.card, borderWidth: 1, borderColor: palette.hairline, padding: 18, ...shadow.soft },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  kicker: { color: palette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: palette.ink, fontFamily: 'ui-serif', fontSize: 28, fontWeight: '800', marginTop: 2 },
  done: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, backgroundColor: palette.lilac },
  doneText: { color: palette.ink, fontWeight: '800' },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: palette.canvas, gap: 4 },
  toolButton: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  toolSelected: { backgroundColor: palette.paper, ...shadow.soft },
  toolLabel: { color: palette.ink, fontSize: 13, fontWeight: '800' },
  toolBody: { flex: 1, marginTop: 14, gap: 12 },
  paperToolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallButton: { minHeight: 40, paddingHorizontal: 11, borderRadius: 13, borderWidth: 1, borderColor: palette.hairline, flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallSelected: { backgroundColor: palette.lilac, borderColor: palette.indigo },
  smallText: { color: palette.ink, fontSize: 12, fontWeight: '700' },
  paper: { flex: 1, minHeight: 230, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.hairline, borderRadius: 16, overflow: 'hidden' },
  gridLines: { ...StyleSheet.absoluteFill, opacity: 0.32, backgroundColor: '#F7EDDB' },
  note: { minHeight: 74, borderRadius: 15, borderWidth: 1, borderColor: palette.hairline, padding: 12, color: palette.ink, fontSize: 16, textAlignVertical: 'top', backgroundColor: '#FFF6B9' },
  help: { color: palette.muted, fontSize: 14, lineHeight: 20 },
  beanBoard: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: palette.hairline, borderRadius: 18, overflow: 'hidden' },
  beanCell: { width: '20%', aspectRatio: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.hairline, alignItems: 'center', justifyContent: 'center' },
  bean: { width: '62%', aspectRatio: 1.2, borderRadius: 99, transform: [{ rotate: '-14deg' }], ...shadow.soft },
  beanRose: { backgroundColor: '#DA7897' },
  beanMint: { backgroundColor: '#65B99F' },
  clearButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearText: { color: palette.indigo, fontWeight: '800' },
  abacus: { flex: 1, minHeight: 310, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#E8B96D', borderRadius: 20, padding: 12, borderWidth: 5, borderColor: '#9E6D3A' },
  rodWrap: { flex: 1, alignItems: 'center', gap: 6 },
  place: { color: palette.ink, fontWeight: '900' },
  rod: { flex: 1, width: 10, borderRadius: 5, backgroundColor: '#75492E', justifyContent: 'flex-end', alignItems: 'center', paddingVertical: 5, gap: 2 },
  bead: { width: 46, height: 17, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(25,29,56,.25)' },
  count: { color: palette.ink, fontFamily: 'ui-serif', fontSize: 22, fontWeight: '800' },
  stepper: { flexDirection: 'row', gap: 20 },
  step: { color: palette.indigo, fontSize: 25, fontWeight: '800' },
});
