import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WorkingOut } from '@/components/working-out';
import { SpringPressable } from '@/components/spring-pressable';
import { palette, radii, shadow } from '@/theme';
import { SKILL_BY_ID } from '../../../src/curriculum';
import { check, type Result } from '../../../src/engine/check';
import { mulberry32 } from '../../../src/engine/rng';

const TOTAL = 3;

function plainMath(value: string) {
  return value
    .replace(/\$/g, '')
    .replace(/\\,/g, ',')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\square/g, '□')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1⁄$2')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function PracticeScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [finished, setFinished] = useState(false);

  const question = useMemo(() => SKILL_BY_ID['add-sub'].generate(mulberry32(8713 + index * 7919), 1), [index]);
  const checked = result?.outcome === 'correct';
  const stale = !!result && result.outcome !== 'correct';

  const submit = () => {
    const next = check(question, [answer]);
    setResult(next);
    if (next.outcome === 'correct') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const next = () => {
    if (index + 1 === TOTAL) {
      setFinished(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    setIndex((current) => current + 1);
    setAnswer('');
    setResult(null);
  };

  if (finished) return <Finished onDone={() => router.replace('/')} />;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topbar}>
          <SpringPressable accessibilityRole="button" accessibilityLabel="Stop practice" style={styles.iconButton} onPress={() => router.back()}>
            <SymbolView name="xmark" size={20} tintColor={palette.ink} weight="semibold" />
          </SpringPressable>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((index + 1) / TOTAL) * 100}%` }]} /></View>
          <Text style={styles.count}>{index + 1}/{TOTAL}</Text>
        </View>

        <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            <View style={[styles.desk, wide && styles.deskWide]}>
              <View style={styles.questionColumn}>
                <View style={styles.topicRow}>
                  <View>
                    <Text style={styles.kicker}>YEAR 3 · NUMBER</Text>
                    <Text style={styles.topic}>Adding and subtracting</Text>
                  </View>
                  <SpringPressable accessibilityRole="button" accessibilityLabel="Read question aloud" style={styles.readButton} onPress={() => Speech.speak(plainMath(question.prompt), { language: 'en-GB', rate: 0.88, pitch: 1.02 })}>
                    <SymbolView name="speaker.wave.2.fill" size={20} tintColor={palette.indigo} />
                    <Text style={styles.readText}>Read aloud</Text>
                  </SpringPressable>
                </View>

                <View style={styles.questionCard}>
                  <Text style={styles.question}>{plainMath(question.prompt)}</Text>
                </View>

                <TextInput
                  accessibilityLabel="Your answer"
                  autoFocus={!wide}
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="done"
                  style={[styles.answer, checked && styles.answerRight, result && result.outcome !== 'correct' && styles.answerWrong]}
                  placeholder="Your answer"
                  placeholderTextColor={palette.muted}
                  value={answer}
                  onChangeText={(value) => { setAnswer(value); if (stale) setResult(null); }}
                  onSubmitEditing={() => answer.trim() && (checked ? next() : submit())}
                  editable={!checked}
                />

                <View style={styles.feedback} accessibilityLiveRegion="polite">
                  {result?.outcome === 'correct' && <View style={[styles.feedbackCard, styles.good]}>
                    <SymbolView name="checkmark.circle.fill" size={26} tintColor={palette.green} />
                    <View style={styles.feedbackCopy}><Text style={styles.feedbackTitle}>That’s it.</Text><Text style={styles.feedbackText}>Beautifully worked out.</Text></View>
                  </View>}
                  {result && result.outcome !== 'correct' && <View style={[styles.feedbackCard, styles.tryAgain]}>
                    <SymbolView name="lightbulb.fill" size={24} tintColor={palette.dustyRose} />
                    <View style={styles.feedbackCopy}><Text style={styles.feedbackTitle}>{result.outcome === 'invalid' ? 'Check the answer box.' : 'Nearly—have another look.'}</Text><Text style={styles.feedbackText}>{result.feedback ? plainMath(result.feedback) : plainMath(question.hint)}</Text></View>
                  </View>}
                </View>

                {!wide && <SpringPressable style={styles.workingButton} onPress={() => setToolsOpen(true)}>
                  <SymbolView name="pencil.and.ruler.fill" size={20} tintColor={palette.indigo} />
                  <View style={styles.workingCopy}><Text style={styles.workingTitle}>Working out</Text><Text style={styles.workingText}>Paper, beans and abacus</Text></View>
                  <SymbolView name="chevron.up" size={16} tintColor={palette.muted} />
                </SpringPressable>}
              </View>

              {wide && <View style={styles.workspaceColumn}><WorkingOut /></View>}
            </View>
          </ScrollView>

          <View style={styles.actionBar}>
            <View style={styles.actionInner}>
              {!checked && <SpringPressable style={styles.secondaryButton} onPress={() => setResult({ outcome: 'wrong', feedback: question.hint })}><Text style={styles.secondaryText}>Hint</Text></SpringPressable>}
              <SpringPressable style={[styles.primaryButton, !answer.trim() && !checked && styles.disabled]} disabled={!answer.trim() && !checked} onPress={checked ? next : submit}>
                <Text style={styles.primaryText}>{checked ? (index + 1 === TOTAL ? 'Finish' : 'Next') : 'Check'}</Text>
                <SymbolView name="arrow.right" size={19} tintColor={palette.ink} weight="bold" />
              </SpringPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {!wide && <Modal visible={toolsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setToolsOpen(false)}>
        <SafeAreaView style={styles.sheet} edges={['top', 'left', 'right', 'bottom']}>
          <WorkingOut onDone={() => setToolsOpen(false)} />
        </SafeAreaView>
      </Modal>}
    </View>
  );
}

function Finished({ onDone }: { onDone: () => void }) {
  return (
    <SafeAreaView style={styles.finished}>
      <View style={styles.finishBadge}><SymbolView name="sparkles" size={40} tintColor={palette.indigo} /></View>
      <Text style={styles.finishTitle}>Three questions done.</Text>
      <Text style={styles.finishCopy}>A small practice run, properly finished.</Text>
      <SpringPressable style={styles.primaryButton} onPress={onDone}><Text style={styles.primaryText}>Back to Today</Text></SpringPressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  safe: { flex: 1 },
  topbar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.hairline },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  progressTrack: { flex: 1, height: 9, backgroundColor: palette.sand, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: palette.indigo },
  count: { color: palette.ink, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 124 },
  desk: { width: '100%', maxWidth: 1180, alignSelf: 'center', gap: 20 },
  deskWide: { flexDirection: 'row', alignItems: 'stretch' },
  questionColumn: { flex: 1, gap: 18 },
  workspaceColumn: { width: '43%', minWidth: 360 },
  topicRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  kicker: { color: palette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  topic: { color: palette.indigo, fontFamily: 'ui-serif', fontSize: 26, fontWeight: '800', marginTop: 2 },
  readButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(205,208,236,.55)' },
  readText: { color: palette.indigo, fontSize: 12, fontWeight: '800' },
  questionCard: { minHeight: 176, borderRadius: radii.card, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.hairline, padding: 28, justifyContent: 'center', ...shadow.soft },
  question: { color: palette.ink, fontFamily: 'ui-rounded', fontSize: 40, lineHeight: 50, fontWeight: '700', letterSpacing: -0.8 },
  answer: { minHeight: 74, borderRadius: radii.button, borderWidth: 1.5, borderColor: palette.hairline, backgroundColor: palette.paper, paddingHorizontal: 20, color: palette.ink, fontSize: 28, fontWeight: '700', ...shadow.soft },
  answerRight: { borderColor: palette.green, backgroundColor: '#F1FAF6' },
  answerWrong: { borderColor: '#B98A96', backgroundColor: '#FFF7F8' },
  feedback: { minHeight: 72 },
  feedbackCard: { borderRadius: radii.button, padding: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  good: { backgroundColor: '#E5F4ED' },
  tryAgain: { backgroundColor: '#F8E7EC' },
  feedbackCopy: { flex: 1 },
  feedbackTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  feedbackText: { color: palette.inkSoft, fontSize: 14, lineHeight: 20, marginTop: 2 },
  workingButton: { minHeight: 70, borderRadius: radii.button, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.hairline, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow.soft },
  workingCopy: { flex: 1 },
  workingTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  workingText: { color: palette.muted, fontSize: 13, marginTop: 2 },
  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,252,247,.96)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.hairline, paddingHorizontal: 20, paddingVertical: 12 },
  actionInner: { width: '100%', maxWidth: 1180, alignSelf: 'center', flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  primaryButton: { minWidth: 150, minHeight: 54, borderRadius: radii.button, paddingHorizontal: 24, backgroundColor: palette.lilac, borderWidth: 1, borderColor: palette.indigo, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, ...shadow.soft },
  primaryText: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.42 },
  secondaryButton: { minHeight: 54, paddingHorizontal: 22, borderRadius: radii.button, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: palette.indigo, fontSize: 16, fontWeight: '800' },
  sheet: { flex: 1, padding: 12, backgroundColor: palette.canvas },
  finished: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: palette.canvas, gap: 16 },
  finishBadge: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold, ...shadow.card },
  finishTitle: { color: palette.ink, fontFamily: 'ui-serif', fontSize: 38, lineHeight: 43, textAlign: 'center', fontWeight: '800', letterSpacing: -1 },
  finishCopy: { color: palette.muted, fontSize: 17, textAlign: 'center', marginBottom: 12 },
});
