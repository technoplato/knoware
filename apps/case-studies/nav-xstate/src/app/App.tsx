/* eslint-disable jsx-a11y/accessible-emoji */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Text, View } from 'react-native';

type RootStackParamList = {
  Home: undefined;
  Details: { userId: number };
};

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export const App = () => {
  return (
    <NavigationContainer>
      <HomeScreen />
      {/* // <Stack.Navigator>
    //   <Stack.Screen name="Home" component={HomeScreen} />
    //   <Stack.Screen name="Details" component={DetailsScreen} />
    // </Stack.Navigator> */}
    </NavigationContainer>
  );
};

export default App;
