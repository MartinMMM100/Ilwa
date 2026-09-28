import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Route } from '../../App';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { type FeedCategory, feedCategories, stories } from '../data/feed';
import { colors } from '../theme';
import { useMemo, useState } from 'react';

type FeedScreenProps = { navigate: (route: Route) => void };

const heroImage = {
  uri: 'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?auto=format&fit=crop&w=900&q=85',
};

export function FeedScreen({ navigate }: FeedScreenProps) {
  const [category, setCategory] = useState<FeedCategory>('Top Stories');
  const filteredStories = useMemo(
    () => (category === 'Top Stories' ? stories : stories.filter((story) => story.category === category)),
    [category],
  );

  return (
    <View style={styles.screen}>
      <AppHeader title="Live Feed" showBack onBack={() => navigate('home')} />

      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
          {feedCategories.map((item) => {
            const selected = item === category;
            return (
              <Pressable key={item} onPress={() => setCategory(item)} style={styles.categoryButton}>
                <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{item}</Text>
                {selected ? <View style={styles.categoryUnderline} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.feed} contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false}>
        {category === 'Top Stories' ? (
          <ImageBackground source={heroImage} style={styles.hero} imageStyle={styles.heroImage}>
            <View style={styles.heroShade} />
            <View style={styles.breakingPill}>
              <Text style={styles.breakingText}>BREAKING NEWS</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Hijacking suspected criminals arrested in Braamfontein following high-speed police chase</Text>
              <Text style={styles.heroMeta}>ENCA • 10 Minutes ago</Text>
            </View>
          </ImageBackground>
        ) : null}

        {filteredStories.map((story) => (
          <Pressable key={story.id} style={({ pressed }) => [styles.story, pressed && styles.storyPressed]}>
            <Image source={{ uri: story.image }} style={styles.storyImage} />
            <View style={styles.storyCopy}>
              <Text style={[styles.storyCategory, { color: story.color }]}>{story.category}</Text>
              <Text style={styles.storyTitle}>{story.title}</Text>
              <Text style={styles.storyMeta}>{story.source} • {story.age}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <BottomNav navigate={navigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  categoryBar: { height: 46, backgroundColor: colors.white },
  categoryContent: { paddingHorizontal: 13, alignItems: 'center', gap: 19 },
  categoryButton: { height: 46, justifyContent: 'center' },
  categoryText: { color: '#273039', fontSize: 11, fontWeight: '500' },
  categoryTextSelected: { color: colors.ink, fontWeight: '800' },
  categoryUnderline: { position: 'absolute', left: 0, right: 0, bottom: 7, height: 2, backgroundColor: colors.ink },
  feed: { flex: 1 },
  feedContent: { paddingHorizontal: 14, paddingBottom: 15 },
  hero: { height: 188, justifyContent: 'space-between', overflow: 'hidden', borderRadius: 12 },
  heroImage: { borderRadius: 12, backgroundColor: '#26394A' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(1,9,16,0.28)' },
  breakingPill: {
    alignSelf: 'flex-start',
    margin: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  breakingText: { color: colors.white, fontSize: 7, fontWeight: '900' },
  heroCopy: { padding: 12 },
  heroTitle: { color: colors.white, fontSize: 14, lineHeight: 17, fontWeight: '900' },
  heroMeta: { marginTop: 3, color: '#E4E8EB', fontSize: 9 },
  story: {
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#E3E6E8',
    paddingVertical: 12,
  },
  storyPressed: { opacity: 0.68 },
  storyImage: { width: 76, height: 76, borderRadius: 12, backgroundColor: '#DCE2E6' },
  storyCopy: { flex: 1, paddingLeft: 17 },
  storyCategory: { fontSize: 11, fontWeight: '900' },
  storyTitle: { marginTop: 3, color: colors.ink, fontSize: 12, lineHeight: 15, fontWeight: '800' },
  storyMeta: { marginTop: 8, color: '#68737B', fontSize: 9 },
});
