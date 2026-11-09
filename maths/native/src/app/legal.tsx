import { router, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/theme';
import { copyright, icoComplaints, legalTitles, legalUpdated, privacySections, termsSections } from '../../../src/legal/content';

export default function LegalScreen() {
  const { page } = useLocalSearchParams<{ page?: string }>();
  const privacy = page !== 'terms';
  const sections = privacy ? privacySections(true) : termsSections;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.frame}>
          <Text style={styles.link} accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>Back to Quarter</Text>
          <Text accessibilityRole="header" style={styles.title}>{privacy ? legalTitles.privacy : legalTitles.terms}</Text>
          <Text style={styles.muted}>Updated {legalUpdated[privacy ? "privacy" : "terms"]}</Text>
          <Text style={styles.muted}>Preview information. Quarter’s legal operator and privacy contact will be added before release.</Text>
          {sections.map(({ title, paragraphs }) => (
            <View key={title} style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
              {paragraphs.map((paragraph) => <Text key={paragraph} style={styles.body}>{paragraph}</Text>)}
            </View>
          ))}
          {privacy && <Text accessibilityRole="link" style={styles.link} onPress={() => void Linking.openURL(icoComplaints)}>Make a privacy complaint to the ICO</Text>}
          <Text style={styles.muted}>{copyright}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  scroll: { padding: 24 },
  frame: { width: '100%', maxWidth: 660, alignSelf: 'center', gap: 12 },
  title: { color: palette.ink, fontSize: 32, fontWeight: '800' },
  heading: { color: palette.ink, fontSize: 20, fontWeight: '700' },
  body: { color: palette.ink, fontSize: 16, lineHeight: 24 },
  muted: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  link: { color: palette.indigo, textDecorationLine: 'underline', fontSize: 16, paddingVertical: 12 },
  section: { gap: 8, marginTop: 8 },
});
