import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Route } from '../../App';
import {
  fetchPublicFeed,
  type PublicFeedCategory,
  type PublicFeedItem,
  type PublicFeedThreatLevel,
} from '../api/feed';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { FeedStoryModal } from '../components/FeedStoryModal';
import { type FeedCategory, feedCategories } from '../data/feed';
import { colors } from '../theme';

type FeedScreenProps = { navigate: (route: Route) => void };
type LoadMode = 'initial' | 'refresh' | 'background';

const heroImage = {
  uri: 'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?auto=format&fit=crop&w=900&q=85',
};

const categoryPresentation: Record<
  PublicFeedCategory,
  { color: string; icon: 'shield-alert-outline' | 'shield-check-outline' | 'account-group-outline' }
> = {
  Crime: { color: colors.red, icon: 'shield-alert-outline' },
  Safety: { color: colors.blue, icon: 'shield-check-outline' },
  Community: { color: '#009B2B', icon: 'account-group-outline' },
};

export function FeedScreen({ navigate }: FeedScreenProps) {
  const [category, setCategory] = useState<FeedCategory>('Top Stories');
  const [stories, setStories] = useState<PublicFeedItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<PublicFeedItem | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const loadFeed = useCallback(async (mode: LoadMode) => {
    if (mode === 'background' && activeRequestRef.current) {
      return;
    }

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    if (mode === 'initial') {
      setIsInitialLoading(true);
    } else if (mode === 'refresh') {
      setIsRefreshing(true);
    }

    try {
      const items = await fetchPublicFeed(controller.signal);
      if (!isMountedRef.current || controller.signal.aborted) {
        return;
      }
      setStories(items);
      setErrorMessage(null);
    } catch (error) {
      if (!isMountedRef.current || controller.signal.aborted) {
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : 'The live feed could not be loaded.');
    } finally {
      if (isMountedRef.current && activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadFeed('initial');
    const refreshTimer = setInterval(() => void loadFeed('background'), 30_000);

    return () => {
      isMountedRef.current = false;
      clearInterval(refreshTimer);
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
    };
  }, [loadFeed]);

  const heroStory = category === 'Top Stories' ? stories[0] ?? null : null;
  const filteredStories = useMemo(() => {
    if (category === 'Top Stories') {
      return stories.slice(heroStory ? 1 : 0);
    }
    return stories.filter((story) => story.category === category);
  }, [category, heroStory, stories]);

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

      <FlatList
        data={filteredStories}
        keyExtractor={(story) => story.id}
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={() => void loadFeed('refresh')}
        ListHeaderComponent={
          <>
            {errorMessage ? (
              <View style={styles.errorCard}>
                <MaterialCommunityIcons name="cloud-alert-outline" size={20} color={colors.red} />
                <View style={styles.errorCopy}>
                  <Text style={styles.errorTitle}>Feed update unavailable</Text>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry live feed"
                  onPress={() => void loadFeed('refresh')}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="refresh" size={21} color={colors.navy} />
                </Pressable>
              </View>
            ) : null}

            {heroStory ? <HeroStory story={heroStory} onPress={() => setSelectedStory(heroStory)} /> : null}
          </>
        }
        ListEmptyComponent={
          isInitialLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color={colors.navy} />
              <Text style={styles.stateTitle}>Loading community reports...</Text>
            </View>
          ) : heroStory ? null : (
            <View style={styles.stateCard}>
              <MaterialCommunityIcons name="newspaper-variant-outline" size={34} color={colors.muted} />
              <Text style={styles.stateTitle}>No reports in this category</Text>
              <Text style={styles.stateText}>Pull down to check for newly submitted reports.</Text>
            </View>
          )
        }
        renderItem={({ item }) => <StoryCard story={item} onPress={() => setSelectedStory(item)} />}
      />

      <BottomNav navigate={navigate} />
      <FeedStoryModal story={selectedStory} onClose={() => setSelectedStory(null)} />
    </View>
  );
}

function HeroStory({ story, onPress }: { story: PublicFeedItem; onPress: () => void }) {
  const threatColor = getThreatColor(story.threatLevel);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${story.title}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.storyPressed}
    >
      <ImageBackground
        source={story.photoUrl ? { uri: story.photoUrl } : heroImage}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroShade} />
        <View style={[styles.latestPill, { backgroundColor: threatColor }]}>
          <Text style={styles.latestText}>LATEST COMMUNITY REPORT</Text>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroCategory}>{story.category.toUpperCase()}</Text>
          <Text style={styles.heroTitle}>{story.title}</Text>
          <Text style={styles.heroMeta}>
            ILWA COMMUNITY • {formatRelativeAge(story.reportedAt)} • UNVERIFIED
            {story.isDemoData ? ' • DEMO' : ''}
          </Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function StoryCard({ story, onPress }: { story: PublicFeedItem; onPress: () => void }) {
  const presentation = categoryPresentation[story.category];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${story.incidentType}: ${story.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.story, pressed && styles.storyPressed]}
    >
      {story.photoUrl ? (
        <Image source={{ uri: story.photoUrl }} resizeMode="cover" style={styles.storyPhoto} />
      ) : (
        <View style={[styles.storyIcon, { backgroundColor: `${presentation.color}16` }]}>
          <MaterialCommunityIcons name={presentation.icon} size={30} color={presentation.color} />
        </View>
      )}
      <View style={styles.storyCopy}>
        <View style={styles.storyLabelRow}>
          <Text style={[styles.storyCategory, { color: presentation.color }]}>{story.category}</Text>
          <View style={styles.unverifiedPill}>
            <Text style={styles.unverifiedText}>UNVERIFIED</Text>
          </View>
          {story.isDemoData ? (
            <View style={styles.demoPill}>
              <Text style={styles.demoText}>DEMO</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.storyTitle}>{story.title}</Text>
        <Text style={styles.storyMeta}>ILWA Community • {formatRelativeAge(story.reportedAt)}</Text>
      </View>
    </Pressable>
  );
}

function formatRelativeAge(reportedAt: string) {
  const reportedTime = Date.parse(reportedAt);
  if (Number.isNaN(reportedTime)) {
    return 'Recently';
  }

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - reportedTime) / 60_000));
  if (elapsedMinutes < 1) {
    return 'Just now';
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} hr${elapsedHours === 1 ? '' : 's'} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) {
    return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`;
  }

  return new Date(reportedTime).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getThreatColor(threatLevel: PublicFeedThreatLevel) {
  switch (threatLevel) {
    case 'critical':
    case 'high':
      return colors.red;
    case 'medium':
      return colors.gold;
    case 'low':
      return colors.green;
    default:
      return colors.navy;
  }
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
  feedContent: { flexGrow: 1, paddingHorizontal: 14, paddingBottom: 15 },
  hero: { height: 188, justifyContent: 'space-between', overflow: 'hidden', borderRadius: 12, marginBottom: 2 },
  heroImage: { borderRadius: 12, backgroundColor: '#26394A' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(1,9,16,0.48)' },
  latestPill: {
    alignSelf: 'flex-start',
    margin: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
  },
  latestText: { color: colors.white, fontSize: 7, fontWeight: '900' },
  heroCopy: { padding: 12 },
  heroCategory: { color: '#D8E9F3', fontSize: 9, fontWeight: '900', marginBottom: 3 },
  heroTitle: { color: colors.white, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  heroMeta: { marginTop: 5, color: '#E4E8EB', fontSize: 8, fontWeight: '600' },
  story: {
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E6E8',
    paddingVertical: 12,
  },
  storyPressed: { opacity: 0.68 },
  storyIcon: { width: 76, height: 76, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  storyPhoto: { width: 76, height: 76, borderRadius: 12, backgroundColor: '#DCE2E6' },
  storyCopy: { flex: 1, paddingLeft: 15 },
  storyLabelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  storyCategory: { fontSize: 11, fontWeight: '900' },
  storyTitle: { marginTop: 4, color: colors.ink, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  storyMeta: { marginTop: 7, color: '#68737B', fontSize: 9 },
  unverifiedPill: { backgroundColor: '#EAECF0', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  unverifiedText: { color: '#475467', fontSize: 7, fontWeight: '900' },
  demoPill: { backgroundColor: colors.goldSoft, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  demoText: { color: '#855F00', fontSize: 7, fontWeight: '900' },
  errorCard: {
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FECDCA',
    borderRadius: 10,
    backgroundColor: '#FEF3F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  errorCopy: { flex: 1 },
  errorTitle: { color: '#B42318', fontSize: 11, fontWeight: '900' },
  errorText: { color: '#6B4B48', fontSize: 9, marginTop: 1 },
  stateCard: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  stateText: { color: colors.muted, fontSize: 10, marginTop: 4, textAlign: 'center' },
});
