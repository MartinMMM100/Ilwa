import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { suburbs } from '../../shared/safetyMap';
import { useAreaMap } from '../map/AreaProvider';
import { colors } from '../theme';

export function SuburbPicker() {
  const { area, selectArea } = useAreaMap();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const close = () => { setOpen(false); setQuery(''); };
  const matches = suburbs.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  return <View style={styles.wrap}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Choose suburb. Current area: ${area.name}`}
      onPress={() => setOpen(true)} style={styles.button}>
      <Text style={styles.buttonText}>⌖  {area.name}</Text><Text style={styles.change}>Change suburb ▾</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.heading}><Text style={styles.title}>Choose your suburb</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close suburb search" onPress={close} hitSlop={10}>
              <Text style={styles.change}>Close</Text>
            </Pressable></View>
          <TextInput accessibilityLabel="Search nearby suburbs" placeholder="Search nearby suburbs" value={query}
            onChangeText={setQuery} style={styles.input} autoFocus autoCorrect={false} />
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
            {matches.map((item) => <Pressable key={item.id} accessibilityRole="button"
              accessibilityState={{ selected: item.id === area.id }}
              onPress={() => { selectArea(item.id); close(); }} style={styles.option}>
              <Text style={styles.optionText}>{item.name}{item.id === area.id ? ' ✓' : ''}</Text>
            </Pressable>)}
            {!matches.length && <Text style={styles.note}>No match in this Johannesburg pilot.</Text>}
          </ScrollView>
          <Text style={styles.note}>Only Braamfontein currently has demo report coverage.</Text>
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  wrap: { marginHorizontal: 14, marginTop: 12, marginBottom: 10 },
  button: { backgroundColor: colors.white, padding: 13, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  buttonText: { color: colors.ink, fontWeight: '800', flex: 1 },
  change: { color: colors.green, fontWeight: '700', fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(6,20,35,0.55)', justifyContent: 'center', padding: 24 },
  panel: { backgroundColor: colors.white, borderRadius: 18, padding: 18 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 15 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12 },
  list: { maxHeight: 280 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  optionText: { color: colors.ink },
  note: { paddingTop: 12, color: colors.muted, fontSize: 12, lineHeight: 17 },
});
