/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useRef } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSkyLightMachine } from '@knoware/sky-machines';
import { Event, EventTarget } from 'event-target-shim';
import { useEffect, useState } from 'react';
import { useEnsureEventShimsAreLoaded } from '@knoware/use-ensure-event-target-shims';
// export const useEnsureEventShimsAreLoaded = () => {
//   const [shimIsSet, setShimIsSet] = useState(
//     [globalThis.Event, globalThis.EventTarget].every(
//       (requiredGlobal) => requiredGlobal !== undefined
//     )
//   );
//
//   useEffect(() => {
//     if (shimIsSet) {
//       return;
//     }
//
//     if (!globalThis.Event) {
//       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//       // @ts-ignore
//       globalThis.Event = Event;
//     }
//
//     if (!globalThis.EventTarget) {
//       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//       // @ts-ignore
//       globalThis.EventTarget = EventTarget;
//     }
//
//     if (!globalThis.EventTarget || !globalThis.Event) {
//       throw new Error(
//         'Event Target or Event not set properly and everything is gonna suck'
//       );
//     }
//     console.log(globalThis.EventTarget);
//     console.log(globalThis.Event);
//     setShimIsSet(true);
//   }, [shimIsSet]);
//
//   return shimIsSet;
// };

const Loading = () => {
  return (
    <View style={styles.section}>
      <Text>loading</Text>
    </View>
  );
};

const GoodStuff = () => {
  const [snapshot, send, actor] = useSkyLightMachine();
  const currentLightcolor = snapshot.value;
  return (
    <View style={{ height: 800, width: '100%' }}>
      <View
        style={{
          width: '100%',
          height: '50%',
          backgroundColor: currentLightcolor,
        }}
      />
      <View
        style={{
          flex: 0.7,
          backgroundColor: 'black',
          justifyContent: 'flex-start',
          flexDirection: 'column-reverse',
        }}
      >
        {snapshot.nextEvents.map((event) => {
          return (
            <Button
              color={'white'}
              onPress={() => send({ type: event })}
              title={event}
              key={event}
            />
          );
        })}
      </View>
    </View>
  );
};

export const App = () => {
  const areShimsLoaded = useEnsureEventShimsAreLoaded();

  const Content = areShimsLoaded ? GoodStuff : Loading;

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <Content />
      </SafeAreaView>
    </View>
  );
};
const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: '#ffffff',
  },
  codeBlock: {
    backgroundColor: 'rgba(55, 65, 81, 1)',
    marginVertical: 12,
    padding: 12,
    borderRadius: 4,
  },
  monospace: {
    color: '#ffffff',
    fontFamily: 'Courier New',
    marginVertical: 4,
  },
  comment: {
    color: '#cccccc',
  },
  marginBottomSm: {
    marginBottom: 6,
  },
  marginBottomMd: {
    marginBottom: 18,
  },
  marginBottomLg: {
    marginBottom: 24,
  },
  textLight: {
    fontWeight: '300',
  },
  textBold: {
    fontWeight: '500',
  },
  textCenter: {
    textAlign: 'center',
  },
  text2XS: {
    fontSize: 12,
  },
  textXS: {
    fontSize: 14,
  },
  textSm: {
    fontSize: 16,
  },
  textMd: {
    fontSize: 18,
  },
  textLg: {
    fontSize: 24,
  },
  textXL: {
    fontSize: 48,
  },
  textContainer: {
    marginVertical: 12,
  },
  textSubtle: {
    color: '#6b7280',
  },
  section: {
    marginVertical: 24,
    marginHorizontal: 12,
    flex: 1,
    flexDirection: 'column',
  },
  shadowBox: {
    backgroundColor: 'white',
    borderRadius: 24,
    shadowColor: 'black',
    shadowOpacity: 0.15,
    shadowOffset: {
      width: 1,
      height: 4,
    },
    shadowRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  listItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  appTitleText: {
    paddingTop: 12,
    fontWeight: '500',
  },
  hero: {
    borderRadius: 12,
    backgroundColor: '#143055',
    padding: 36,
    marginBottom: 24,
  },
  heroTitle: {
    flex: 1,
    flexDirection: 'row',
  },
  heroTitleText: {
    color: '#ffffff',
    marginLeft: 12,
  },
  heroText: {
    color: '#ffffff',
    marginVertical: 12,
  },
  whatsNextButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 8,
    width: '50%',
    marginTop: 24,
  },
  learning: {
    marginVertical: 12,
  },
  love: {
    marginTop: 12,
    justifyContent: 'center',
  },
});

export default App;
