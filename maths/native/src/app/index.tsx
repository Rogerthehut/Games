import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/brand';
import { SpringPressable } from '@/components/spring-pressable';
import { palette, radii, shadow } from '@/theme';
import { copyright, legalTitles } from '../../../src/legal/content';

const cards = [
  { eyebrow: '01 / PRACTICE', title: 'A little maths today.', copy: 'A short warm-up to get started.', action: 'Try 3 questions', colour: palette.rose, symbol: 'pencil.and.outline', route: true },
  { eyebrow: '02 / SKILLS', title: 'Pick a skill.', copy: 'Explore topics and practise something you choose.', action: 'Explore skills', colour: palette.lilac, symbol: 'map', route: false },
  { eyebrow: '03 / CHECK-UP', title: 'Find your level.', copy: '24 questions · about 20 min', action: 'Start check-up', colour: palette.gold, symbol: 'scope', route: false },
  { eyebrow: '04 / PLAN', title: 'See your next steps.', copy: 'See what to work on and make a plan.', action: 'View plan', colour: palette.mint, symbol: 'book.pages', route: false },
] as const;

export default function TodayScreen() {
  const { width } = useWindowDimensions();
  const columns = width >= 1100 ? 4 : width >= 700 ? 2 : 1;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
          <View style={styles.frame}>
            <Brand />
            <View style={styles.greeting}>
              <Image source={require('../../assets/images/explorer-clay.webp')} style={styles.avatar} contentFit="cover" contentPosition={{ top: 0 }} />
              <Text style={styles.greetingText}>Hi Roger!</Text>
            </View>

            <View style={[styles.hero, width >= 850 && styles.heroWide]}>
              <View style={styles.heroCopy}>
                <Text style={styles.kicker}>YOUR MATHS WORKBOOK</Text>
                <Text style={[styles.heading, width < 480 && styles.headingPhone]}>What shall we <Text style={styles.headingItalic}>practise?</Text></Text>
              </View>
              {width >= 850 && <Text style={styles.intro}>A quick warm-up, a favourite topic, or a plan for what comes next.</Text>}
            </View>

            <View style={styles.cardGrid}>
              {cards.map((card) => (
                <SpringPressable
                  key={card.eyebrow}
                  accessibilityRole="button"
                  accessibilityLabel={`${card.title} ${card.action}`}
                  onPress={() => card.route && router.push('/practice')}
                  disabled={!card.route}
                  style={[styles.card, { backgroundColor: card.colour }, { width: columns === 1 ? '100%' : columns === 2 ? '48.8%' : '23.8%' }]}>
                  <Text style={styles.eyebrow}>{card.eyebrow}</Text>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardCopy}>{card.copy}</Text>
                  <View style={styles.cardArt}>
                    <View style={styles.artHalo} />
                    <SymbolView name={card.symbol} size={58} tintColor={palette.ink} weight="medium" />
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardAction}>{card.action}</Text>
                    <SymbolView name="arrow.up.right" size={18} tintColor={palette.ink} weight="bold" />
                  </View>
                </SpringPressable>
              ))}
            </View>

            <View style={styles.practiceRun}>
              <View style={styles.runIcon}><SymbolView name="book.closed.fill" size={17} tintColor={palette.indigo} /></View>
              <View>
                <Text style={styles.runLabel}>PRACTICE RUN</Text>
                <Text style={styles.runValue}>1 day in a row</Text>
              </View>
              {width >= 520 && <View style={styles.week}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                  <View key={`${day}-${index}`} style={styles.day}>
                    <View style={[styles.dayDot, index === 4 && styles.dayDotToday]} />
                    <Text style={styles.dayText}>{day}</Text>
                  </View>
                ))}
              </View>}
            </View>
            <View style={styles.legal}>
              {(['privacy', 'terms'] as const).map((page) => (
                <Text key={page} accessibilityRole="link" style={styles.legalLink}
                  onPress={() => router.push({ pathname: '/legal', params: { page } })}>
                  {legalTitles[page]}
                </Text>
              ))}
              <Text style={styles.legalCopy}>{copyright}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  legal: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 18 },
  legalLink: { color: palette.indigo, fontSize: 14, textDecorationLine: 'underline', paddingVertical: 12 },
  legalCopy: { color: palette.muted, fontSize: 14 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  frame: { width: '100%', maxWidth: 1440, alignSelf: 'center', gap: 24 },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  avatar: { width: 54, height: 54, borderRadius: 16, backgroundColor: palette.lilac },
  greetingText: { color: palette.ink, fontFamily: 'ui-serif', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  hero: { gap: 14, marginTop: 16 },
  heroWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  heroCopy: { flexShrink: 1 },
  kicker: { color: palette.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 12 },
  heading: { color: palette.ink, fontFamily: 'ui-serif', fontSize: 60, lineHeight: 66, fontWeight: '800', letterSpacing: -2.3 },
  headingPhone: { fontSize: 44, lineHeight: 49, letterSpacing: -1.7 },
  headingItalic: { fontStyle: 'italic', textDecorationLine: 'underline', textDecorationColor: palette.dustyRose },
  intro: { width: 290, color: palette.muted, fontSize: 18, lineHeight: 26, marginBottom: 8 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 },
  card: { minHeight: 348, borderRadius: radii.card, borderWidth: 1, borderColor: palette.hairline, padding: 22, overflow: 'hidden', ...shadow.card },
  eyebrow: { alignSelf: 'flex-start', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.68)', borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7, color: palette.ink, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  cardTitle: { marginTop: 20, color: palette.ink, fontFamily: 'ui-serif', fontSize: 32, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8 },
  cardCopy: { color: palette.inkSoft, fontSize: 15, lineHeight: 21, marginTop: 8 },
  cardArt: { flex: 1, minHeight: 118, alignItems: 'center', justifyContent: 'center' },
  artHalo: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,.28)', right: -25, bottom: -48 },
  cardFooter: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(21,26,52,.22)', paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAction: { color: palette.ink, fontSize: 15, fontWeight: '800' },
  practiceRun: { minHeight: 94, borderRadius: radii.panel, backgroundColor: 'rgba(255,255,255,.62)', borderWidth: 1, borderColor: palette.hairline, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow.soft },
  runIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.lilac },
  runLabel: { color: palette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  runValue: { color: palette.ink, fontSize: 17, fontWeight: '800', marginTop: 2 },
  week: { marginLeft: 'auto', flexDirection: 'row', gap: 10 },
  day: { alignItems: 'center', gap: 4 },
  dayDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: palette.sand },
  dayDotToday: { backgroundColor: palette.paper, borderWidth: 2, borderColor: palette.indigo },
  dayText: { color: palette.muted, fontSize: 10, fontWeight: '700' },
});
