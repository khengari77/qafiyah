import { PROD_DOMAIN } from '@qafiyah/constants';
import { StyleSheet, Text, View } from 'react-native';
import { buildGreeting } from './greeting';

export function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{buildGreeting('World')}</Text>
      <Text style={styles.subtitle}>{PROD_DOMAIN}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.6,
  },
});
