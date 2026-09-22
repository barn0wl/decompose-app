import { useFonts, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import RouteDetailScreen from './src/screens/RouteDetailScreen';
import RouteErrorScreen from './src/screens/RouteErrorScreen';
import SuggestConnectionScreen from './src/screens/SuggestConnectionScreen';
import PendingConfirmationsScreen from './src/screens/PendingConfirmationsScreen';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) return <ActivityIndicator />;

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="RouteDetail" component={RouteDetailScreen} />
            <Stack.Screen name="RouteError" component={RouteErrorScreen} />
            <Stack.Screen name="SuggestConnection" component={SuggestConnectionScreen} />
            <Stack.Screen name="PendingConfirmations" component={PendingConfirmationsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
